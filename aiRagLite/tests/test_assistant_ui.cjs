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
let openedSource=null;
win.open=()=>({closed:false,location:{replace:function(url){openedSource=url;}},close:function(){}});
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
let failedTool=false;
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
        if(payload.message==='封装层测试'){
            callback({code:true,data:{data:{kind:'final',answer:'封装响应正常'}}});return;
        }
        if(payload.message==='简化回答测试'){
            callback({code:true,data:{answer:'无 kind 的回答正常'}});return;
        }
        if(payload.message==='说明明天成都的天气'){
            callback({code:true,data:{kind:'final',
                answer:'目前没有接入实时天气数据，因此不能核实明天的预报。'}});return;
        }
        if(payload.message==='进入国内外要闻'){
            callback({code:true,data:{kind:'tool',tool:'list_folder',
                arguments:{folder:'国内外要闻'}}});return;
        }
        if(payload.message==='资阳联系人'){
            callback({code:true,data:{kind:'tool',tool:'find_files',
                arguments:{query:'资阳联系人',limit:12,search_mode:'index',path:''}}});
            return;
        }
        if(payload.message==='我要编辑短视频文章'){
            callback({code:true,data:{kind:'tool',tool:'find_files',
                arguments:{query:'短视频流程'}}});
            return;
        }
        const steps=JSON.parse(payload.observations_json);
        if(payload.message==='总结未关联今年费用') {
            const reply=steps.length===0?
                {kind:'tool',tool:'find_files',arguments:{query:'2026年费用'}}:
                steps.length===1?
                {kind:'tool',tool:'read_document',
                    arguments:{folder:'与我协作',name:'2026年费用.md'}}:
                {kind:'final',answer:'已依据已验证文件内容总结费用'};
            callback({code:true,data:reply});return;
        }
        if(payload.message==='总结同名费用') {
            const reply=steps.length===0?
                {kind:'tool',tool:'find_files',arguments:{query:'费用'}}:
                {kind:'tool',tool:'read_document',
                    arguments:{folder:'与我协作',name:'2026年费用.md'}};
            callback({code:true,data:reply});return;
        }
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
        if(failedTool){callback({code:false,data:'不支持的工具或参数'});return;}
        const args=JSON.parse(payload.arguments_json);
        if(payload.tool==='list_folder'){
            if(args.folder!=='' && args.folder!=='我的文档')
                throw Error('model invented folder '+args.folder);
            callback({code:true,data:{folder:args.folder,
                folders:args.folder===''?[{name:'我的文档',folder:'我的文档'}]:[],
                files:[]}});
        }else if(payload.tool==='prepare_edit'){
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
        }else if(payload.tool==='find_files'){
            const files=args.query==='2026年费用'?[
                {name:'2026年费用.md',
                 path:'与我协作/用户[admin]/我的文档/财务/2026年费用.md',
                 location:'第 1 行',snippet:'# 2026年费用'}
            ]:(args.query==='费用'||args.query==='查找费用文档')?[
                {name:'2026年费用.md',
                 path:'与我协作/用户[admin]/我的文档/财务/2026年费用.md'},
                {name:'2026年费用.md',
                 path:'与我协作/用户[admin]/我的文档/旧版/2026年费用.md'}
            ]:[{
                name:'萌宠短视频流程.md',
                path:'与我协作/用户[admin]/我的文档/学习/短视频/萌宠短视频流程.md',
                location:'第 1 行',snippet:'# 萌宠短视频制作流程'
            }];
            callback({code:true,data:{
                query:args.query,indexed_only:true,results:files,count:files.length
            }});
        }else if(payload.tool==='read_document'){
            if(!args.indexed_path)
                throw Error('Missing indexed_path for resolved RAG file read');
            const content=args.name==='萌宠短视频流程.md'?
                '# 短视频制作流程\n第一步：写剧本\n第二步：准备素材' :
                '# 2026年费用\n服务器费用 30 元';
            callback({code:true,data:{name:args.name,content,
                source_verified:true,truncated:false,total_chars:content.length}});
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
        if(String(payload.path).includes('source:777')){
            callback({code:true,data:{folder:'学习/短视频',name:'萌宠短视频流程.md'}});
        }else{
            callback({code:true,data:{folder:'我的文档/账单',name:'2026年费用.md'}});
        }
    }else if(route.endsWith('/resolve')){
        if(String(payload.path).includes('萌宠短视频流程.md')){
            callback({code:true,data:{route:'#fileView&path='+encodeURIComponent('{source:777}')}});
        }else{
            callback({code:true,data:{route:'#fileView&path=%7Bsource%3A1001%7D%2Fa.md'}});
        }
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

input.val('请解释 Ceph 部署步骤中的关键命令');send.trigger('click');
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
assert.equal(history[0].content,'请解释 Ceph 部署步骤中的关键命令');

// Backend can legitimately return a final answer without calling tools.
// Older installations may also wrap an otherwise valid agent result once more.
input.val('封装层测试');send.trigger('click');
assert.match(one('#airaglite-chat-messages').text(),/封装响应正常/);
assert.doesNotMatch(one('#airaglite-chat-status').text(),/失败/);
input.val('简化回答测试');send.trigger('click');
assert.match(one('#airaglite-chat-messages').text(),/无 kind 的回答正常/);
assert.equal(send.prop('disabled'),false);

// A read-only tool returned by the model may include unsupported extras.
const stepsBeforeContact=calls.filter(x=>x.route.endsWith('/agentStep')).length;
const toolsBeforeContact=calls.filter(x=>x.route.endsWith('/agentTool')).length;
input.val('资阳联系人');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentStep')).length,
    stepsBeforeContact+1,'one model step for contact lookup');
const contactTools=calls.filter(x=>x.route.endsWith('/agentTool'));
assert.equal(contactTools.length,toolsBeforeContact+1,'one search, no repeat');
const contact=contactTools.at(-1);
assert.equal(contact.payload.tool,'find_files');
assert.deepEqual(JSON.parse(contact.payload.arguments_json),{query:'资阳联系人'},
    'strip optional model parameters before PHP');
assert.match(one('#airaglite-chat-messages').text(),/候选文件/);
assert.equal(send.prop('disabled'),false);

// Rejected tool operations must not be retried or misreported as missing files.
failedTool=true;
const beforeBadStep=calls.filter(x=>x.route.endsWith('/agentStep')).length;
const beforeBadTool=calls.filter(x=>x.route.endsWith('/agentTool')).length;
input.val('资阳联系人');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentStep')).length,beforeBadStep+1);
assert.equal(calls.filter(x=>x.route.endsWith('/agentTool')).length,beforeBadTool+1);
assert.match(one('#airaglite-chat-status').text(),/不支持的工具或参数/);
assert.match(one('#airaglite-chat-messages').text(),/操作未完成/);
failedTool=false;

// RAG WebDAV virtual paths must never become relative home folders.
const readBefore=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document').length;
input.val('总结未关联今年费用');send.trigger('click');
const readCalls=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document');
assert.equal(readCalls.length,readBefore+1);
const readArgs=JSON.parse(readCalls.at(-1).payload.arguments_json);
assert.equal(readArgs.folder,'与我协作','model provided an invalid home-relative folder');
assert.equal(readArgs.indexed_path,
    '与我协作/用户[admin]/我的文档/财务/2026年费用.md',
    'frontend pins read to exact RAG candidate path for PHP permission check');
assert.match(one('#airaglite-chat-messages').text(),/已依据已验证文件内容总结费用/);
assert.equal(send.prop('disabled'),false);

const beforeDuplicate=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document').length;
input.val('总结同名费用');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document').length,beforeDuplicate,
    'duplicate indexed filenames must not pick an arbitrary document');
assert.match(one('#airaglite-chat-messages').text(),/多个同名文件/);

// Ordinary questions still reach the model even when there is no KodBox file.
const directBefore=calls.filter(x=>x.route.endsWith('/agentStep')).length;
const directToolBefore=calls.filter(x=>x.route.endsWith('/agentTool')).length;
input.val('说明明天成都的天气');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentStep')).length,directBefore+1,
    'general chat uses the model endpoint');
assert.equal(calls.filter(x=>x.route.endsWith('/agentTool')).length,directToolBefore,
    'general chat does not force a RAG tool call');
assert.match(one('#airaglite-chat-status').text(),/AI 已回答；本轮未执行任何文件操作/);
assert.match(calls.filter(x=>x.route.endsWith('/agentStep')).at(-1).payload.client_today,
    /^\d{4}-\d{2}-\d{2}$/,
    'browser calendar date must be included in model request');

// An agent may guess a folder path, but must not execute unverified folder reads.
const foldersBefore=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='list_folder').length;
input.val('进入国内外要闻');send.trigger('click');
const folderCalls=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='list_folder').slice(foldersBefore);
assert.equal(folderCalls.length,1,'unverified directory must not be entered');
assert.equal(JSON.parse(folderCalls[0].payload.arguments_json).folder,'',
    'directory must first be enumerated under the active KodBox account');
assert.match(one('#airaglite-chat-messages').text(),/未找到“国内外要闻”/);
assert.equal(send.prop('disabled'),false);

// Edit intent must not silently bypass AI as an ordinary file title search.
const editStepsBefore=calls.filter(x=>x.route.endsWith('/agentStep')).length;
input.val('我要编辑短视频文章');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentStep')).length,editStepsBefore+1,
    'edit intent is routed through the language model');
const editCandidate=$('.aic-action').filter(function(){
    return $(this).text()==='关联并用 AI 编辑';
}).last();
assert.ok(editCandidate.length,'agent file discovery provides a verified-edit action');
assert.match(one('#airaglite-chat-messages').text(),/请选择你要编辑的文章/);
editCandidate.trigger('click');
assert.ok(calls.some(x=>x.route.endsWith('/resolve') &&
    x.payload.path.includes('萌宠短视频流程.md')),
    'candidate is resolved under KodBox session before attaching');
assert.ok(calls.some(x=>x.route.endsWith('/agentCurrentFile') &&
    x.payload.path.includes('source:777')),
    'verified source must map to an authorized personal document');
assert.match(one('#airaglite-chat-file').text(),/萌宠短视频流程.md/);
assert.equal(input.val(),'','vague edit request must not trigger an arbitrary rewrite');
assert.match(one('#airaglite-chat-status').text(),/已验证并关联文件/);
one('#airaglite-chat-detach').trigger('click');

// Short file names should bypass blind directory wandering and use RAG
// filename search exactly once, without any model tool-selection latency.
const modelCallsBeforeLookup=calls.filter(x=>x.route.endsWith('/agentStep')).length;
const folderCallsBeforeLookup=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='list_folder').length;
input.val('短视频流程');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentStep')).length,
    modelCallsBeforeLookup,'short file title bypasses LLM planning');
assert.equal(calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='list_folder').length,folderCallsBeforeLookup,
    'short file lookup must not explore unrelated project folders');
const found=calls.filter(x=>x.route.endsWith('/agentTool')).at(-1);
assert.equal(found.payload.tool,'find_files');
assert.equal(JSON.parse(found.payload.arguments_json).query,'短视频流程');
assert.match(one('#airaglite-chat-messages').text(),/萌宠短视频流程.md/);
const sourceButton=$('.aic-file-item').last();
assert.match(sourceButton.text(),/萌宠短视频流程.md/);
sourceButton.trigger('click');
assert.ok(calls.some(x=>x.route.endsWith('/resolve') &&
    x.payload.path.includes('萌宠短视频流程.md')),'open source checks KodBox permissions');

// Multi-turn file follow-ups reuse the exact indexed candidate instead of
// repeatedly searching the RAG index or trusting the short search snippet.
const beforeFileFollowUpSearch=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='find_files').length;
const beforeFileFollowUpRead=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document').length;
const beforeFileFollowUpModel=calls.filter(x=>x.route.endsWith('/agentStep')).length;
input.val('看看里面的内容');send.trigger('click');
const afterFileRead=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document');
assert.equal(afterFileRead.length,beforeFileFollowUpRead+1,
    'follow-up must read real file content');
assert.deepEqual(JSON.parse(afterFileRead.at(-1).payload.arguments_json),{
    folder:'',name:'萌宠短视频流程.md',
    indexed_path:'与我协作/用户[admin]/我的文档/学习/短视频/萌宠短视频流程.md'
});
assert.equal(calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='find_files').length,beforeFileFollowUpSearch,
    'file follow-up must not search the same title again');
assert.equal(calls.filter(x=>x.route.endsWith('/agentStep')).length,
    beforeFileFollowUpModel,'raw read needs no new model call');
assert.match($('.aic-raw-document').last().text(),/第一步：写剧本/);
assert.match($('.aic-raw-document').last().text(),/第二步：准备素材/);
input.val('把里面的内容输出');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='find_files').length,beforeFileFollowUpSearch,
    'second follow-up still refers to same document');
assert.match($('.aic-raw-document').last().text(),/短视频制作流程/);

// Summarization explicitly uses the model with a verified read observation,
// rather than claiming the RAG snippet is the document body.
input.val('请总结里面的内容');send.trigger('click');
const summarizeStep=calls.filter(x=>x.route.endsWith('/agentStep')).at(-1);
assert.equal(summarizeStep.payload.force_final,'1');
const observationsForSummary=JSON.parse(summarizeStep.payload.observations_json);
assert.equal(observationsForSummary[0].tool,'read_document');
assert.match(observationsForSummary[0].result,/第二步：准备素材/);

// If search finds multiple candidates, require an explicit file choice.
input.val('查找费用文档');send.trigger('click');
const beforeAmbiguousRead=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document').length;
input.val('看看里面的内容');send.trigger('click');
assert.equal(calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document').length,beforeAmbiguousRead,
    'never guess which same-name document is intended');
assert.match(one('#airaglite-chat-messages').text(),/找到多个候选文件/);
const chooseSecond=$('.aic-read-indexed').last();
chooseSecond.trigger('click');
const chosen=calls.filter(x=>x.route.endsWith('/agentTool') &&
    x.payload.tool==='read_document').at(-1);
assert.equal(JSON.parse(chosen.payload.arguments_json).indexed_path,
    '与我协作/用户[admin]/我的文档/旧版/2026年费用.md',
    'chosen candidate path must be passed through permission checked read');

// Permission errors must never fall back to unverified snippets.
const beforeDeniedModel=calls.filter(x=>x.route.endsWith('/agentStep')).length;
failedTool=true;
input.val('再看看里面的内容');send.trigger('click');
assert.match(one('#airaglite-chat-status').text(),/文件读取失败/);
assert.equal(calls.filter(x=>x.route.endsWith('/agentStep')).length,beforeDeniedModel);
failedTool=false;

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
input.val('请解释另一种集群配置思路');send.trigger('click');
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
