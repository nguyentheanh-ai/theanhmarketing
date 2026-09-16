import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read=name=>readFileSync(`docs/landing-source/doi-ngu-nhan-su-ai/${name}`,'utf8');
test('Kit table of contents and purchase CTA share the same horizontal action group',()=>{
 const jsx=(type,props)=>({type,props});
 const modules={react:{useState:()=>[true,()=>{}],useEffect:()=>{}},'react/jsx-runtime':{jsx,jsxs:jsx},'./FloatingToc.jsx':{default:'toc'},'../checkout.js':{trackMarketingEvent:()=>{}}};
 const context={exports:{},require:name=>modules[name]};
 vm.runInNewContext(ts.transpile(read('StickyCta.jsx'),{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}),context);
 const bar=context.exports.default({product:{primaryCta:'Nhận bộ nhân viên AI'}});
 const actions=bar.props.children.find(node=>node.props?.className==='sticky-cta-actions');
 assert.ok(actions);assert.equal(actions.props.children[0].type,'toc');assert.equal(actions.props.children[1].type,'a');assert.equal(actions.props.children[1].props.href,'#purchase-form');
 assert.doesNotMatch(read('App.jsx'),/<FloatingToc/);
 const css=read('styles.css');assert.match(css,/\.sticky-cta-actions \{ display: flex; align-items: center;/);assert.match(css,/\.floating-toc \{ position: static;/);assert.doesNotMatch(css,/\.sticky-cta a/);assert.match(css,/\.floating-toc-panel \{ position: absolute; left: 0; right: 0; bottom: calc\(100% \+ 12px\)/);
});
test('Kit contents menu retains links, open/close and Escape handling after nesting',()=>{
 const source=read('FloatingToc.jsx');assert.match(source,/aria-expanded=\{isOpen\}/);assert.match(source,/hidden=\{!isOpen\}/);assert.match(source,/event.key === "Escape"/);assert.match(source,/scrollToHashAndClean\(item.href\)/);assert.match(source,/triggerRef.current\?\.focus\(\)/);assert.doesNotMatch(source,/formFocused|formVisible/);
});
