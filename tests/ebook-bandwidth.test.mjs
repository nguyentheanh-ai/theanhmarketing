import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real component's effects and event handlers with deterministic
// browser image/timer boundaries; no customer session or Storage request.
function readerHarness(accepted = false) {
  const requests = [], timers = [], effects = [], states = [], refs = [];
  let stateIndex = 0, refIndex = 0;
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ||= {current: initial}; },
    useCallback: value => value,
    useMemo: factory => factory(),
    useEffect: effect => effects.push(effect),
  };
  const jsx = (type, props) => ({type, props});
  const browser = {
    setTimeout: callback => timers.push(callback), clearTimeout() {},
    requestIdleCallback: callback => timers.push(callback), cancelIdleCallback() {},
    addEventListener() {}, removeEventListener() {},
  };
  const policy = {FACEBOOK_EBOOK_POLICY_STORAGE_KEY: 'fixture', facebookEbookPolicy: {sections: []}};
  class FakeImage {
    set src(value) { requests.push(value); }
    decode() { return Promise.resolve(); }
  }
  const source = ts.transpileModule(fs.readFileSync('components/ebook/facebook-ebook-reader.tsx', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
  const context = {
    exports: {}, URLSearchParams, Image: FakeImage, window: browser,
    document: browser, localStorage: {getItem: () => accepted ? 'accepted' : null, setItem() {}},
    setTimeout: browser.setTimeout, clearTimeout() {},
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return {jsx, jsxs: jsx};
      if (name === 'lucide-react') return {};
      if (name.endsWith('facebook-ebook-policy')) return policy;
      throw new Error(`Unexpected module ${name}`);
    },
  };
  vm.runInNewContext(source, context);
  const manifest = JSON.parse(fs.readFileSync('data/facebook-ebook-manifest.json', 'utf8'));
  function render() {
    stateIndex = 0; refIndex = 0; effects.length = 0;
    const tree = context.exports.FacebookEbookReader({manifest});
    for (const effect of effects) effect();
    while (timers.length) timers.shift()();
    return tree;
  }
  return {requests, render};
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree?.props) return [];
  return [tree, ...nodes(tree.props.children)];
}

test('policy gate does not download any protected image in the background', () => {
  const reader = readerHarness();
  reader.render();
  assert.equal(reader.requests.length, 0);
});

test('opening the reader does not preload unread pages or table-of-contents chapters', () => {
  const reader = readerHarness(true);
  reader.render();
  const tree = reader.render();
  assert.equal(reader.requests.length, 0);
  assert.equal(nodes(tree).filter(node => node.type === 'img').length, 1);
});

test('hover and focus do not download chapters; selecting a page downloads only that page', async () => {
  const reader = readerHarness(true);
  reader.render();
  let tree = reader.render();
  for (const node of nodes(tree)) {
    node.props.onPointerEnter?.();
    node.props.onFocus?.();
  }
  assert.equal(reader.requests.length, 0);
  const pageInput = nodes(tree).find(node => node.type === 'input' && node.props.type === 'number');
  pageInput.props.onChange({target: {value: '10'}});
  await new Promise(resolve => setImmediate(resolve));
  tree = reader.render();
  assert.equal(reader.requests.length, 1);
  assert.match(reader.requests[0], /page=10&part=1/);
  assert.equal(nodes(tree).find(node => node.type === 'img').props.src, reader.requests[0]);
});
