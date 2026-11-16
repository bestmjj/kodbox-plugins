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
win.confirm = () => true;
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
      callback({code:true,data:{folder:payload.folder,folders:dirs[payload.folder],
        files:payload.folder==='我的文档/学习' ? [{name:'已有文章.md',format:'md'}] : []}});
    } else if (route.endsWith('/draft')) {
      callback(failDraft ? {code:false,data:'测试生成错误'} :
        {code:true,data:{content:'# 测试文档\n\n测试正文',sources:[],source_note:'未启用知识库参考'}});
    } else if (route.endsWith('/writerRead')) {
      callback({code:true,data:{folder:payload.folder,name:payload.name,format:'md',
        title:'已有文章',content:'# 原始文章\n\n第二段',hash:'a'.repeat(64),
        note:'已载入已有文章'}});
    } else if (route.endsWith('/reviseDraft')) {
      callback({code:true,data:{content:payload.scope==='selection' ? '新版段落' :
        '# AI 修改后的全文\n\n第二段',scope:payload.scope}});
    } else if (route.endsWith('/writerOverwrite')) {
      callback({code:true,data:{name:payload.name,backup:'已有文章-AI修改前-备份.md',
        hash:'b'.repeat(64),route:'#fileView&path=%7Bsource%3A1%7D%2Ftest.md'}});
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

// Assistant: open previously saved Markdown, request AI changes, compare, apply and undo.
one('#airaglite-writer-open-existing').trigger('click');
$('.alw-picker-row').filter(function(){return $(this).text().includes('已有文章.md');}).trigger('click');
assert.equal(one('#airaglite-writer-editor').val(),'# 原始文章\n\n第二段','load the actual saved article');
assert.match(one('#airaglite-writer-imported').text(),/已有文章.md/);
assert.equal(one('#airaglite-writer-overwrite').css('display')!=='none',true,'explicit overwrite option for Markdown');
one('#airaglite-writer-instructions').val('请补充说明并润色正文');
one('#airaglite-writer-revise').trigger('click');
assert.match(one('#airaglite-writer-review-after').text(),/AI 修改后的全文/);
assert.match(one('#airaglite-writer-review-before').text(),/原始文章/);
assert.equal(one('#airaglite-writer-editor').val(),'# 原始文章\n\n第二段','AI result must not auto-apply');
one('#airaglite-writer-discard-revision').trigger('click');
assert.equal(one('#airaglite-writer-editor').val(),'# 原始文章\n\n第二段','reject keeps original');
one('#airaglite-writer-revise').trigger('click');
one('#airaglite-writer-apply-revision').trigger('click');
assert.match(one('#airaglite-writer-editor').val(),/AI 修改后的全文/);
one('#airaglite-writer-undo').trigger('click');
assert.equal(one('#airaglite-writer-editor').val(),'# 原始文章\n\n第二段','undo restores original');

one('#airaglite-writer-revise-scope').val('selection');
$('.alw-tab').eq(0).trigger('click');
const edit=one('#airaglite-writer-editor')[0];
edit.selectionStart='# 原始文章\n\n'.length;
edit.selectionEnd=edit.value.length;
one('#airaglite-writer-revise').trigger('click');
const rev=called.filter(c=>c.route.endsWith('/reviseDraft')).at(-1);
assert.equal(rev.payload.content,'第二段','send selection not full document');
one('#airaglite-writer-apply-revision').trigger('click');
assert.equal(one('#airaglite-writer-editor').val(),'# 原始文章\n\n新版段落',
  'selected revision keeps unselected text');
one('#airaglite-writer-overwrite').trigger('click');
const overw=called.filter(c=>c.route.endsWith('/writerOverwrite')).at(-1);
assert.equal(overw.payload.hash,'a'.repeat(64),'optimistic source check');
assert.equal(overw.payload.confirm,'backup-and-overwrite','explicit confirmation');
assert.equal(overw.payload.content,'# 原始文章\n\n新版段落');
assert.match(one('#airaglite-writer-message').text(),/备份/);

let returned=null;
win.aiRagLiteSetActiveDocument=(folder,name,prompt)=>{returned={folder,name,prompt};};
win.aiRagLiteOpenAssistant=()=>{win._agentOpened=true;};
assert.match(one('#airaglite-writer-open').text(),/文档编辑/);
assert.match(one('#airaglite-writer-heading').text(),/文档编辑器/);
one('#airaglite-writer-back-to-assistant').trigger('click');
assert.equal(win._agentOpened,true);
assert.equal(returned.folder,'我的文档/学习');
assert.equal(returned.name,'已有文章.md');
assert.equal(one('#airaglite-writer-overlay').css('display'),'none');

// AI assistant -> writer must open the exact verified file, not an empty editor.
const handoffReadsBefore=called.filter(x=>x.route.endsWith('/writerRead')).length;
assert.equal(win.aiRagLiteOpenWriterFile('我的文档/学习','已有文章.md'),true);
assert.equal(called.filter(x=>x.route.endsWith('/writerRead')).length,
    handoffReadsBefore+1,'verified handoff reloads document through session API');
assert.equal(one('#airaglite-writer-overlay').css('display'),'flex');
assert.equal(one('#airaglite-writer-editor').val(),'# 原始文章\n\n第二段');
assert.equal(one('.alw-tab[aria-selected="true"]').text(),'编辑正文',
    'AI handoff should open the editor, not the blank generation screen');
assert.match(one('#airaglite-writer-imported').text(),/已有文章.md/);
assert.equal(win.aiRagLiteOpenWriterFile('../私有','bad.md'),false,
    'traversal paths must not be accepted from frontend calls');

// Canceling an editor switch preserves unsaved in-browser content.
const confirmBefore=win.confirm;
one('#airaglite-writer-editor').val('# 尚未保存的更改').trigger('input');
win.confirm=()=>false;
const cancelReads=called.filter(x=>x.route.endsWith('/writerRead')).length;
assert.equal(win.aiRagLiteOpenWriterFile('我的文档/学习','已有文章.md'),false);
assert.equal(called.filter(x=>x.route.endsWith('/writerRead')).length,cancelReads);
assert.equal(one('#airaglite-writer-editor').val(),'# 尚未保存的更改');
win.confirm=confirmBefore;

dom.window.close();
console.log('OK: writer layout, verified assistant handoff, file loading, AI revision, diff, undo, safe overwrite and existing flows');
