/* Chat-first UI tests. Run with npm install --no-save jsdom@24 jquery@3 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const dom=new JSDOM('<html><head></head><body><button id="airaglite-open">assistant</button></body></html>',{
    url:'https://kodbox.test/',runScripts:'outside-only',pretendToBeVisual:true
});
const win=dom.window,$=require('jquery')(win);
win.$=win.jQuery=$;
win.kodReady=[];
win.aiRagLiteRenderMarkdown=(node,md)=>{node.textContent=md;};
win.aiRagLiteOpenSearch=()=>{win._searchOpened=true;};
let opened=null;
win.aiRagLiteOpenWriterRevision=(folder,name,content)=>{opened={kind:'revision',folder,name,content};};
win.aiRagLiteOpenWriterDraft=(title,content)=>{opened={kind:'new',title,content};};
const calls=[];
let failed=false;
win.kodApi={requestSend:function(route,payload,callback){
    calls.push({route,payload});
    if(route.endsWith('/writerFolders')){
        const dirs={
            '':{folder:'',folders:[{name:'我的文档',folder:'我的文档'}],files:[]},
            '我的文档':{folder:'我的文档',folders:[{name:'账单',folder:'我的文档/账单'}],files:[]},
            '我的文档/账单':{folder:'我的文档/账单',folders:[],files:[{name:'2026年费用.md'}]}
        };
        if(!Object.hasOwn(dirs,payload.folder))throw Error('unexpected browse '+payload.folder);
        callback({code:true,data:dirs[payload.folder]});
    }else if(route.endsWith('/writerRead')){
        callback({code:true,data:{name:payload.name,folder:payload.folder,
            title:'2026年费用',content:'# 2026年费用',hash:'a'.repeat(64)}});
    }else if(route.endsWith('/assistantChat')){
        if(failed){
            callback({code:false,data:'模拟请求失败'});return;
        }
        if(payload.message.includes('修改')){
            callback({code:true,data:{mode:'proposal',answer:'修改稿已完成，原文件未改变。',
                sources:[],proposal:{kind:'revision',folder:payload.file_folder,
                name:payload.file_name,content:'# 改写后内容'}}});
        }else if(payload.message.includes('写一份')){
            callback({code:true,data:{mode:'proposal',answer:'新草稿已生成',
                sources:[],proposal:{kind:'new',title:'交接手册',content:'# 交接手册'}}});
        }else if(payload.file_name){
            callback({code:true,data:{mode:'document',answer:'今年共计 CNY 115 和 USD 10.46',
                sources:[],expense_summary:{totals:[
                    {currency:'CNY',amount:'115.00',rows:2},
                    {currency:'USD',amount:'10.46',rows:1}
                ],skipped_rows:1,method:'仅明确币种的记录'}}});
        }else if(payload.message.includes('资产')){
            callback({code:true,data:{mode:'asset_live',answer:'资产 3 项',sources:[]}});
        }else{
            callback({code:true,data:{mode:'rag',answer:'找到 [1] 所在文件',
                sources:[{id:1,path:'与我协作/用户[admin]/我的文档/a.md',location:'第 4 行'}]}});
        }
    }else if(route.endsWith('/resolve')){
        callback({code:true,data:{route:'#fileView&path=%7Bsource%3A1001%7D%2Fa.md'}});
    }else throw Error('Unknown API '+route);
}};
const source=fs.readFileSync(path.join(__dirname,'..','static','assistant.js'),'utf8');
win.eval(source);
assert.equal(win.kodReady.length,1);
win.kodReady[0]();

const one=selector=>{
    const $el=$(selector);
    assert.equal($el.length,1,'expected one '+selector);
    return $el;
};
assert.ok(typeof win.aiRagLiteOpenAssistant==='function');
win.aiRagLiteOpenAssistant();
assert.equal(one('#airaglite-assistant-layer').css('display'),'flex');
assert.match(one('#airaglite-chat-file').text(),/未关联/);
const input=one('#airaglite-chat-input');
const send=one('#airaglite-chat-send');

input.val('查找 Ceph 部署资料');send.trigger('click');
let query=calls.filter(x=>x.route.endsWith('/assistantChat')).at(-1);
assert.equal(query.payload.file_name,'');
assert.equal(query.payload.history_json,'[]');
assert.match(one('#airaglite-chat-messages').text(),/找到 \[1\]/);
input.val('我还想继续问');send.trigger('click');
query=calls.filter(x=>x.route.endsWith('/assistantChat')).at(-1);
const history=JSON.parse(query.payload.history_json);
assert.equal(history[0].role,'user');
assert.equal(history[1].role,'assistant');
assert.equal(history[0].content,'查找 Ceph 部署资料');

one('#airaglite-chat-attach').trigger('click');
assert.equal(one('#airaglite-chat-picker').css('display'),'flex');
function clickNamed(name){
    const $b=$('.aic-picker-items button').filter(function(){return $(this).text().includes(name);});
    assert.equal($b.length,1,'cannot find '+name);
    $b.trigger('click');
}
clickNamed('我的文档');
clickNamed('账单');
clickNamed('2026年费用.md');
assert.match(one('#airaglite-chat-file').text(),/2026年费用.md/);
assert.equal(one('#airaglite-chat-picker').css('display'),'none');
assert.match(one('#airaglite-chat-messages').text(),/您可以直接说想做什么/,'attachment starts new context');
input.val('总结一下今年的费用');send.trigger('click');
query=calls.filter(x=>x.route.endsWith('/assistantChat')).at(-1);
assert.equal(query.payload.file_folder,'我的文档/账单');
assert.equal(query.payload.file_name,'2026年费用.md');
assert.equal(query.payload.history_json,'[]','switching source must reset prior history');
assert.match(one('#airaglite-chat-messages').text(),/CNY 115.00/);
assert.match(one('#airaglite-chat-messages').text(),/USD 10.46/);
assert.match(one('#airaglite-chat-messages').text(),/未计入 1 条记录/);

input.val('请修改这篇文章');send.trigger('click');
const button=$('.aic-action').last();
assert.match(button.text(),/查看差异/);
button.trigger('click');
assert.deepEqual(opened,{kind:'revision',folder:'我的文档/账单',
    name:'2026年费用.md',content:'# 改写后内容'});

one('#airaglite-chat-detach').trigger('click');
assert.match(one('#airaglite-chat-file').text(),/未关联/);
input.val('帮我写一份运维交接手册');send.trigger('click');
$('.aic-action').last().trigger('click');
assert.deepEqual(opened,{kind:'new',title:'交接手册',content:'# 交接手册'});

one('#airaglite-chat-reset').trigger('click');
input.val('我的资产有哪些');send.trigger('click');
assert.match(one('#airaglite-chat-status').text(),/未提交给文档 AI/);

failed=true;
input.val('请再查一次');send.trigger('click');
assert.match(one('#airaglite-chat-messages').text(),/模拟请求失败/);
assert.equal(send.prop('disabled'),false,'failure should re-enable send');

one('#airaglite-chat-reset').trigger('click');
assert.match(one('#airaglite-chat-messages').text(),/您可以直接说想做什么/);
$('.aic-tools button').filter(function(){return $(this).text()==='高级搜索';}).trigger('click');
assert.equal(win._searchOpened,true,'advanced search remains accessible');

dom.window.close();
console.log('OK: chat-first UI, file association, source reset, conversation, assets, safe writer hand-off');
