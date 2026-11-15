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
win.confirm=()=>true;
win.kodReady=[];
win.aiRagLiteRenderMarkdown=(node,md)=>{node.textContent=md;};
let activeSources=[];
win.aiRagLiteSetCitationSources=(sources)=>{activeSources=sources;};
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
    }else if(route.endsWith('/agentStep')){
        if(failed){callback({code:false,data:'模拟请求失败'});return;}
        const steps=JSON.parse(payload.observations_json);
        if(payload.message.includes('资产')){
            callback({code:true,data:{kind:'final',mode:'asset_live',answer:'资产 3 项'}});
        }else if(steps.length===0&&!payload.force_final.includes('1')){
            let tool,argumentsData;
            if(payload.message.includes('修改')){
                tool='prepare_edit';
                argumentsData={folder:payload.file_folder,name:payload.file_name,
                    instructions:payload.message};
            }else if(payload.message.includes('写一份')){
                tool='prepare_new_document';
                argumentsData={title:'交接手册',instructions:payload.message};
            }else if(payload.file_name){
                tool='calculate_expenses';
                argumentsData={folder:payload.file_folder,name:payload.file_name};
            }else{
                tool='search_knowledge';
                argumentsData={query:payload.message};
            }
            callback({code:true,data:{kind:'tool',tool:tool,arguments:argumentsData}});
        }else{
            callback({code:true,data:{kind:'final',
                answer:payload.file_name?'已核算今年费用':'找到 [1] 所在文件'}});
        }
    }else if(route.endsWith('/agentTool')){
        const args=JSON.parse(payload.arguments_json);
        if(payload.tool==='prepare_edit'){
            callback({code:true,data:{message:'修改稿已完成，原文件未改变。',
                proposal:{kind:'revision',folder:args.folder,
                name:args.name,content:'# 改写后内容',hash:'a'.repeat(64),format:'md'}}});
        }else if(payload.tool==='prepare_new_document'){
            callback({code:true,data:{message:'新草稿已生成',
                proposal:{kind:'new',title:'交接手册',content:'# 交接手册'}}});
        }else if(payload.tool==='calculate_expenses'){
            callback({code:true,data:{folder:args.folder,name:args.name,summary:{
                totals:[{currency:'CNY',amount:'115.00',rows:2},
                    {currency:'USD',amount:'10.46',rows:1}],
                skipped_rows:1,method:'仅明确币种的记录'}}});
        }else if(payload.tool==='search_knowledge'){
            callback({code:true,data:{results:[
                {name:'a.md',path:'与我协作/用户[admin]/我的文档/a.md',
                 location:'第 4 行',snippet:'Ceph文档'}]}});
        }else{
            callback({code:false,data:'未知工具'});
        }
    }else if(route.endsWith('/saveDraft')){
        callback({code:true,data:{name:payload.title+'-saved.md',route:'#fileView&path=sample'}});
    }else if(route.endsWith('/writerOverwrite')){
        callback({code:true,data:{name:payload.name,backup:'2026年费用-before.md'}});
    }else if(route.endsWith('/agentCurrentFile')){
        callback({code:true,data:{folder:'我的文档/账单',name:'2026年费用.md'}});
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
assert.ok(typeof win.aiRagLiteSetActiveDocument==='function','writer-to-agent handoff');
win.aiRagLiteOpenAssistant();
assert.equal(one('#airaglite-assistant-layer').css('display'),'flex');
assert.match(one('#airaglite-chat-file').text(),/未关联/);
const input=one('#airaglite-chat-input');
const send=one('#airaglite-chat-send');

input.val('查找 Ceph 部署资料');send.trigger('click');
let query=calls.filter(x=>x.route.endsWith('/agentStep')).at(-1);
assert.equal(query.payload.file_name,'');
assert.equal(query.payload.history_json,'[]');
assert.match(one('#airaglite-chat-messages').text(),/找到 \[1\]/);
assert.equal(activeSources[0].path,'与我协作/用户[admin]/我的文档/a.md','per-answer refs');
input.val('我还想继续问');send.trigger('click');
query=calls.filter(x=>x.route.endsWith('/agentStep')).at(-1);
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
query=calls.filter(x=>x.route.endsWith('/agentStep')).at(-1);
assert.equal(query.payload.file_folder,'我的文档/账单');
assert.equal(query.payload.file_name,'2026年费用.md');
assert.equal(query.payload.history_json,'[]','switching source must reset prior history');
assert.match(one('#airaglite-chat-messages').text(),/CNY 115.00/);
assert.match(one('#airaglite-chat-messages').text(),/USD 10.46/);
assert.match(one('#airaglite-chat-messages').text(),/未计入 1 条记录/);

input.val('请修改这篇文章');send.trigger('click');
const button=$('.aic-action').last();
assert.match(button.text(),/查看差异/);
const writesBeforeReview=calls.filter(x=>/\/(saveDraft|writerOverwrite)$/.test(x.route)).length;
button.trigger('click');
assert.equal(one('#airaglite-agent-review').css('display'),'flex');
assert.equal(one('#airaglite-review-after').val(),'# 改写后内容');
assert.match(one('#airaglite-review-before').text(),/2026年费用/);
assert.equal(calls.filter(x=>/\/(saveDraft|writerOverwrite)$/.test(x.route)).length,
    writesBeforeReview,'review itself never writes a file');
one('#airaglite-review-close').trigger('click');
assert.equal(one('#airaglite-agent-review').css('display'),'none');
assert.equal(calls.filter(x=>/\/(saveDraft|writerOverwrite)$/.test(x.route)).length,
    writesBeforeReview,'cancel does not mutate files');
button.trigger('click');
one('#airaglite-review-save-new').trigger('click');
const newVersion=calls.filter(x=>x.route.endsWith('/saveDraft')).at(-1);
assert.equal(newVersion.payload.folder,'我的文档/账单');
assert.match(newVersion.payload.title,/AI修改版/);
assert.equal(newVersion.payload.content,'# 改写后内容');
button.trigger('click');
one('#airaglite-review-overwrite').trigger('click');
const update=calls.filter(x=>x.route.endsWith('/writerOverwrite')).at(-1);
assert.equal(update.payload.hash,'a'.repeat(64));
assert.equal(update.payload.confirm,'backup-and-overwrite');
assert.match(one('#airaglite-chat-messages').text(),/备份/);

one('#airaglite-chat-detach').trigger('click');
assert.match(one('#airaglite-chat-file').text(),/未关联/);
input.val('帮我写一份运维交接手册');send.trigger('click');
$('.aic-action').last().trigger('click');
assert.equal(one('#airaglite-review-after').val(),'# 交接手册');
assert.equal(one('#airaglite-review-overwrite').css('display'),'none',
    'new document cannot overwrite an existing one');
one('#airaglite-review-save-new').trigger('click');
const newDoc=calls.filter(x=>x.route.endsWith('/saveDraft')).at(-1);
assert.equal(newDoc.payload.folder,'AI草稿');
assert.equal(newDoc.payload.format,'md');
assert.equal(newDoc.payload.content,'# 交接手册');

one('#airaglite-chat-reset').trigger('click');
input.val('我的资产有哪些');send.trigger('click');
assert.match(one('#airaglite-chat-status').text(),/本地执行/);
input.val('查找另外的知识库资料');send.trigger('click');
const afterAssets=calls.filter(x=>x.route.endsWith('/agentStep')).at(-1);
assert.equal(afterAssets.payload.history_json,'[]',
  'asset result must not be replayed as external model history');

failed=true;
input.val('请再查一次');send.trigger('click');
assert.match(one('#airaglite-chat-messages').text(),/模拟请求失败/);
assert.equal(send.prop('disabled'),false,'failure should re-enable send');

one('#airaglite-chat-reset').trigger('click');
assert.match(one('#airaglite-chat-messages').text(),/您可以直接说想做什么/);
assert.equal(win.aiRagLiteSetActiveDocument('我的文档/账单','2026年费用.md'),true);
assert.match(one('#airaglite-chat-file').text(),/2026年费用.md/);

$('.aic-tools button').filter(function(){return $(this).text()==='高级搜索';}).trigger('click');
assert.equal(win._searchOpened,true,'advanced search remains accessible');

dom.window.close();
console.log('OK: Agent tools, document context, sources, currency math, assets, safe in-chat review and save');
