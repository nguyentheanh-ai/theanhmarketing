import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const slash = value => value.split(path.sep).join('/');

/** Static reachability inventory, NOT proof a runtime path calls Supabase. */
export function inventory(root, ts, app) {
  root = fs.realpathSync(root);
  const sourceRoot = fs.existsSync(path.join(root, 'src/app')) ? 'src' : '';
  const roots = sourceRoot ? ['src'] : ['app', 'lib', 'services', 'components', 'hooks', 'data'];
  const files = [];
  function visit(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      if (e.isSymbolicLink() || e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'reports') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) visit(full);
      else if (extensions.includes(path.extname(e.name)) && !/\.(?:test|spec)\./.test(e.name)) files.push(full);
    }
  }
  for (const dir of roots) visit(path.join(root, dir));
  for (const dir of ['', sourceRoot].filter((value, index, all) => all.indexOf(value) === index)) {
    for (const name of ['middleware.ts', 'proxy.ts']) {
      const file = path.join(root, dir, name);
      if (fs.existsSync(file)) files.push(file);
    }
  }
  files.sort();
  const known = new Set(files), modules = new Map();
  function resolve(from, spec) {
    const base = spec.startsWith('@/') ? path.join(root, sourceRoot, spec.slice(2))
      : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null;
    if (!base) return null;
    for (const candidate of [base, ...extensions.map(ext => base + ext), ...extensions.map(ext => path.join(base, 'index' + ext))]) {
      if (known.has(candidate)) return candidate;
    }
    return null;
  }
  for (const file of files) {
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const deps = [], operations = [], unresolvedLocalImports = [];
    let direct = false;
    const imports = [];
    // Real services frequently name the SDK `db`, not `supabase`. Track local
    // factory aliases and their results before walking calls (no source values
    // are serialized). This is still a static over-approximation, not type proof.
    const sdkNames = new Set();
    const declarations = [];
    function symbols(n) {
      if (ts.isImportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)
          && /supabase/i.test(n.moduleSpecifier.text) && !n.importClause?.isTypeOnly) {
        const clause = n.importClause;
        if (clause?.name) sdkNames.add(clause.name.text);
        if (clause?.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) sdkNames.add(clause.namedBindings.name.text);
          else for (const element of clause.namedBindings.elements) if (!element.isTypeOnly) sdkNames.add(element.name.text);
        }
      }
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) declarations.push(n);
      if (ts.isParameter(n) && ts.isIdentifier(n.name) && n.type && /supabase/i.test(n.type.getText(ast))) sdkNames.add(n.name.text);
      ts.forEachChild(n, symbols);
    }
    symbols(ast);
    function sdkReceiver(text) {
      if (/supabase|(?:admin|server|browser|source|client)(?:Client)?/i.test(text)) return true;
      return [...sdkNames].some(name => new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text));
    }
    for (let pass = 0; pass <= declarations.length; pass++) {
      let changed = false;
      for (const decl of declarations) {
        if (!sdkNames.has(decl.name.text) && sdkReceiver(decl.initializer.getText(ast))) {
          sdkNames.add(decl.name.text);
          changed = true;
        }
      }
      if (!changed) break;
    }
    function walk(n) {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)
          && !n.isTypeOnly && !n.importClause?.isTypeOnly) imports.push(n.moduleSpecifier.text);
      if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
        if (n.arguments[0] && ts.isStringLiteral(n.arguments[0])) imports.push(n.arguments[0].text);
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const method = n.expression.name.text;
        // Only report SDK-shaped receivers. Buffer.from()/Array.from() and
        // comments/strings are not database operations. Dynamic names remain a
        // visible blocker instead of being silently counted as covered.
        const receiver = n.expression.expression.getText(ast);
        const sdk = sdkReceiver(receiver);
        let kind;
        if (/\.storage(?:\.|$)/.test(receiver) && sdk) kind = 'storage';
        else if (/\.auth(?:\.|$)/.test(receiver) && sdk) kind = 'auth';
        else if (/\.functions(?:\.|$)/.test(receiver) && sdk) kind = 'functions';
        else if (['from', 'rpc', 'schema'].includes(method) && sdk) kind = method;
        else if (['channel', 'removeChannel'].includes(method) && sdk) kind = 'realtime';
        if (kind) {
          const arg = n.arguments[0];
          const literal = arg && ts.isStringLiteralLike(arg) && identifier.test(arg.text) ? arg.text : null;
          operations.push({line: ast.getLineAndCharacterOfPosition(n.getStart(ast)).line + 1,
            kind, method, ...(kind === 'from' || kind === 'rpc' || kind === 'schema' ? {name: literal, dynamic: literal === null} : {})});
        }
      }
      ts.forEachChild(n, walk);
    }
    walk(ast);
    for (const spec of imports) {
      if (/^@supabase\//.test(spec) || /(?:^|\/)supabase(?:\/|$)/.test(spec)) direct = true;
      const dep = resolve(file, spec);
      if (dep) deps.push(dep);
      else if ((spec.startsWith('@/') || spec.startsWith('.')) && !/\.(?:json|css|svg|png|webp|jpg)$/.test(spec)) unresolvedLocalImports.push(spec);
    }
    modules.set(file, {file: slash(path.relative(root, file)), directSdkDependency: direct,
      operations, deps, unresolvedLocalImportCount: unresolvedLocalImports.length});
  }
  function reachable(start) {
    const seen = new Set(), pending = [start];
    while (pending.length) {
      const file = pending.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      for (const dep of modules.get(file)?.deps ?? []) pending.push(dep);
    }
    return [...seen].filter(file => modules.get(file).directSdkDependency || modules.get(file).operations.length)
      .map(file => modules.get(file).file).sort();
  }
  const entries = [];
  for (const [file, mod] of modules) {
    if (/(?:^|\/)app\/.*\/(?:route|page|layout)\.[tj]sx?$/.test(mod.file) ||
        /(?:^|\/)app\/(?:route|page|layout)\.[tj]sx?$/.test(mod.file) || /(?:^|\/)(?:proxy|middleware)\.[tj]s$/.test(mod.file)) {
      const dependencies = reachable(file);
      entries.push({file: mod.file, staticSupabaseDependencies: dependencies,
        runtimeSupabaseIndependence: dependencies.length ? 'NOT_PROVEN' : 'NOT_ESTABLISHED_BY_STATIC_SCAN'});
    }
  }
  const dependencyModules = [...modules.values()].filter(m => m.directSdkDependency || m.operations.length)
    .map(({deps, ...safe}) => safe);
  const operations = dependencyModules.flatMap(m => m.operations);
  return {app, sourceRoot: sourceRoot || '.', evidence: 'STATIC_IMPORT_AND_SDK_CALL_SCAN',
    limitations: ['conditional gates are not evaluated', 'receiver matching is heuristic',
      'computed imports, fetch URLs, generated SQL and external jobs require separate audit',
      'zero static references does not prove runtime independence'],
    sourceFiles: files.length, entries, dependencyModules,
    summary: {entrypoints: entries.length, entrypointsWithDependencies: entries.filter(e => e.staticSupabaseDependencies.length).length,
      directModules: dependencyModules.length, sdkCalls: operations.length,
      dynamicRelationsOrRpcs: operations.filter(o => o.dynamic).length,
      tables: [...new Set(operations.filter(o => o.kind === 'from' && o.name).map(o => o.name))].sort(),
      rpcs: [...new Set(operations.filter(o => o.kind === 'rpc' && o.name).map(o => o.name))].sort(),
      unresolvedLocalImports: [...modules.values()].reduce((sum, m) => sum + m.unresolvedLocalImportCount, 0)}};
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--a-root', '--b-root', '--typescript-root', '--out'].includes(argv[i]) || !argv[i + 1]) throw Error('INVALID_ARGUMENTS');
    out[argv[i]] = argv[i + 1];
  }
  if (!out['--a-root'] || !out['--b-root'] || !out['--out']) throw Error('ROOTS_AND_OUTPUT_REQUIRED');
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = args(process.argv.slice(2));
    const ts = createRequire(path.join(path.resolve(options['--typescript-root'] ?? options['--a-root']), 'package.json'))('typescript');
    const report = {generatedAt: new Date().toISOString(), readyToRemoveSupabase: false,
      apps: [inventory(options['--a-root'], ts, 'A'), inventory(options['--b-root'], ts, 'B')]};
    fs.writeFileSync(options['--out'], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    console.log(JSON.stringify(report.apps.map(({app, summary}) => ({app, ...summary})), null, 2));
  } catch {
    console.error('DEPENDENCY_INVENTORY_FAILED');
    process.exitCode = 1;
  }
}
