/* Interactive regression checks for the AI writer layout.
 * Run: npm install --no-save --no-package-lock jsdom@24 jquery@3
 *      node aiRagLite/tests/test_writer_ui.cjs
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body>' +
  '<div id="airaglite-header"><span>智能检索</span>' +
  '<button id="airaglite-close">×</button></div></body></html>', {
  url:'https://kodbox.test/',runScripts:'outside-only',pretendToBeVisual:true
});
const win = dom.window;
const $ = require('jquery')(win);
win.$ = win.jQuery = $;
win.kodReady = [];
win.aiRagLiteRenderMarkdown = function (target, markdown) {
  target.textContent = '';
  const heading = win.document.createElement('h1');
  heading.textContent = markdown.trim().replace(/^#\s*/, '');
  target.appendChild(heading);
};
const called = [];
let failDraft = false;
win.kodApi = {
  requestSend:function (route,payload,callback) {
    called.push({route,payload});
    if (route.endsWith('/writerFolders')) {
      const dirs = {
        '':[{name:'我的文档',folder:'我的文档'},{name:'其他文件',folder:'其他文件'}],
        '我的文档':[{name:'学习',folder:'我的文档/学习'}],
        '我的文档/学习':[],
        '其他文件':[]
      };
      assert(Object.hasOwn(dirs,payload.folder),'invalid mocked folder');
      callback({code:true,data:{folder:payload.folder,folders:dirs[payload.folder]}});
    } else if (route.endsWith('/draft')) {
      callback(failDraft ? {code:false,data:'测试生成错误'} :
        {code:true,data:{content:'# 测试文档\n\n测试正文',sources:[],source_note:'未启用知识库参考'}});
    } else if (route.endsWith('/saveDraft')) {
      callback({code:true,data:{name:'测试文档.md',route:'#fileView&path=%7Bsource%3A1%7D%2Ftest.md'}});
    } else {
      assert.fail('unexpected route: '+route);
    }
  }
};
const script = fs.readFileSync(path.join(__dirname,'..','static','writer.js'),'utf8');
win.eval(script);
assert.equal(win.kodReady.length,1,'writer should register one startup handler');
win.kodReady[0]();

function one(selector) {
  const result=$(selector);
  assert.equal(result.length,1,'expected exactly one '+selector);
  return result;
}
one('#airaglite-writer-open');
one('#airaglite-writer-dialog');
one('#airaglite-writer-selected');
one('#airaglite-writer-picker');
one('#airaglite-writer-picker-use');
const css=one('#airaglite-writer-styles').text();
assert.match(css,/grid-template-columns:minmax\(0,var\(--alw-sidebar-width,330px\)\) 12px minmax\(0,1fr\)/);
assert.match(css,/@media\(max-width:850px\)/);
assert.match(css,/@media\(max-width:560px\)/);

// jsdom does not run layout. Stub the visible column container geometry.
const columns=one('#airaglite-writer-body')[0];
columns.getBoundingClientRect=()=>({
  left:50,top:0,right:1050,bottom:650,width:1000,height:650
});
const divider=one('#airaglite-writer-splitter')[0];
assert.equal(divider.getAttribute('role'),'separator');
assert.equal(divider.getAttribute('aria-orientation'),'vertical');

one('#airaglite-writer-open').trigger('click');
assert.equal(one('#airaglite-writer-overlay').css('display'),'flex');
assert.equal(one('.alw-tab[aria-selected="true"]').text(),'预览排版');

function paneWidth() {
  return Number.parseInt(columns.style.getPropertyValue('--alw-sidebar-width'),10);
}
assert.equal(paneWidth(),330,'default column size');
one('#airaglite-writer-left-wide').trigger('click');
assert.equal(paneWidth(),540,'left wide preset');
one('#airaglite-writer-right-wide').trigger('click');
assert.equal(paneWidth(),270,'right wide preset');
divider.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
assert.equal(paneWidth(),290,'keyboard increases left width');
divider.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
assert.equal(paneWidth(),260,'keyboard Home clamps to minimum');
divider.dispatchEvent(new win.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
assert.equal(paneWidth(),668,'keyboard End clamps for minimum right pane');
one('#airaglite-writer-reset-wide').trigger('click');
assert.equal(paneWidth(),330,'reset button');
divider.dispatchEvent(new win.MouseEvent('pointerdown',{clientX:400,button:0,bubbles:true,cancelable:true}));
win.document.dispatchEvent(new win.MouseEvent('pointermove',{clientX:490,bubbles:true}));
assert.equal(paneWidth(),420,'drag right should widen sidebar');
win.document.dispatchEvent(new win.MouseEvent('pointermove',{clientX:2500,bubbles:true}));
assert.equal(paneWidth(),668,'drag must not shrink right below minimum');
win.document.dispatchEvent(new win.MouseEvent('pointermove',{clientX:-200,bubbles:true}));
assert.equal(paneWidth(),260,'drag must not shrink left below minimum');
win.document.dispatchEvent(new win.MouseEvent('pointerup',{bubbles:true}));
win.document.dispatchEvent(new win.MouseEvent('pointermove',{clientX:1000,bubbles:true}));
assert.equal(paneWidth(),260,'movement after pointerup ignored');
one('#airaglite-writer-splitter').trigger('dblclick');
assert.equal(paneWidth(),330,'double click resets split');
assert.equal(divider.getAttribute('aria-valuenow'),'33','accessible slider value');

// Narrow screens use single-column layout; drag must not modify widths.
Object.defineProperty(win,'innerWidth',{value:800,writable:true,configurable:true});
divider.dispatchEvent(new win.MouseEvent('pointerdown',{clientX:400,button:0,bubbles:true}));
win.document.dispatchEvent(new win.MouseEvent('pointermove',{clientX:750,bubbles:true}));
win.document.dispatchEvent(new win.MouseEvent('pointerup',{bubbles:true}));
assert.equal(paneWidth(),330,'narrow screen disables drag');
win.innerWidth=1024;

one('#airaglite-writer-topic').val('测试文档');
one('.alw-generate').trigger('click');
assert.match(one('#airaglite-writer-preview').text(),/测试文档/);
assert.equal(one('#airaglite-writer-editor').val(),'# 测试文档\n\n测试正文');
assert.equal(one('.alw-generate').prop('disabled'),false);

$('.alw-tab').eq(0).trigger('click');
assert.notEqual(one('#airaglite-writer-editor').css('display'),'none');
one('#airaglite-writer-editor').val('# 修改后的内容').trigger('input');
$('.alw-tab').eq(1).trigger('click');
assert.match(one('#airaglite-writer-preview').text(),/修改后的内容/);
assert.equal(one('#airaglite-writer-editor').val(),'# 修改后的内容');

one('#airaglite-writer-choose-folder').trigger('click');
assert.equal(one('#airaglite-writer-picker').css('display'),'flex');
assert.match(one('#airaglite-writer-selected').text(),/AI草稿/);
$('.alw-picker-row').filter(function(){return $(this).text().includes('我的文档');}).trigger('click');
assert.match(one('#airaglite-writer-picker-path').text(),/我的文档/);
assert.match(one('#airaglite-writer-selected').text(),/AI草稿/,'browsing must not change selection');
$('.alw-picker-row').filter(function(){return $(this).text().includes('学习');}).trigger('click');
one('#airaglite-writer-picker-use').trigger('click');
assert.match(one('#airaglite-writer-selected').text(),/我的文档 \/ 学习/);

one('#airaglite-writer-choose-folder').trigger('click');
$('.alw-picker-row').filter(function(){return $(this).text().includes('其他文件');}).trigger('click');
one('.alw-picker-header .alw-secondary').trigger('click');
assert.match(one('#airaglite-writer-selected').text(),/我的文档 \/ 学习/,'cancel must keep previous folder');

one('#airaglite-writer-format').val('docx');
one('#airaglite-writer-save').trigger('click');
const save=called.filter(c=>c.route.endsWith('/saveDraft')).at(-1);
assert.equal(save.payload.folder,'我的文档/学习');
assert.equal(save.payload.format,'docx');
assert.equal(save.payload.content,'# 修改后的内容');
assert.match(one('#airaglite-writer-message').text(),/保存成功/);
assert.equal(one('#airaglite-writer-save').prop('disabled'),false);

failDraft=true;
one('.alw-generate').trigger('click');
assert.match(one('#airaglite-writer-message').text(),/测试生成错误/);
assert.equal(one('.alw-generate').prop('disabled'),false,'error must reenable generate');

dom.window.close();
console.log('OK: writer pane resizing, presets, keyboard, narrow screen, tabs, picker and save');
