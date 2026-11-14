// Chat-first KodBox AI assistant. Does not modify files on its own.
// Existing search and writer stay available as advanced tools.
kodReady.push(function () {
    'use strict';
    var jq = window.jQuery || window.$;
    if (!jq || !jq('#airaglite-open').length || jq('#airaglite-assistant-layer').length) return;
    var $ = jq;
    var css = [
      '#airaglite-assistant-layer{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9950;display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}',
      '#airaglite-assistant-layer *{box-sizing:border-box}',
      '#airaglite-assistant-panel{width:min(1000px,97vw);height:min(800px,94vh);min-height:0;display:flex;flex-direction:column;background:#fff;color:#243145;border-radius:12px;overflow:hidden;box-shadow:0 18px 48px #0003;font-size:14px}',
      '.aic-header{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #e2e8f0;flex:0 0 auto}',
      '.aic-heading{flex:1;min-width:0}.aic-heading strong{display:block;font-size:18px}.aic-muted{font-size:12px;color:#64748b;line-height:1.5}',
      '.aic-header button,.aic-toolbar button{background:white;border:1px solid #d2dceb;border-radius:7px;padding:8px 11px;color:#28538e;cursor:pointer;white-space:nowrap}',
      '.aic-header button:hover,.aic-toolbar button:hover{background:#eff6ff}',
      '.aic-toolbar{display:flex;align-items:center;gap:8px;padding:11px 20px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;flex:0 0 auto}',
      '#airaglite-chat-file{display:inline-flex;gap:8px;align-items:center;min-width:0;max-width:100%;font-size:13px;font-weight:600;overflow-wrap:anywhere}',
      '.aic-tools{display:flex;gap:7px;flex-wrap:wrap;margin-left:auto}',
      '.aic-tools button{font-size:12px;padding:6px 9px}',
      '#airaglite-chat-messages{flex:1;min-height:0;overflow-y:auto;padding:22px 26px;background:#fbfcfe;display:flex;flex-direction:column;gap:18px}',
      '.aic-welcome{max-width:660px;margin:auto;text-align:center;padding:30px 10px;color:#475569;line-height:1.75}',
      '.aic-welcome strong{font-size:22px;display:block;margin-bottom:7px;color:#263247}',
      '.aic-examples{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px}',
      '.aic-examples button{border:1px solid #cbd5e1;background:white;border-radius:7px;padding:8px 10px;color:#275da9;cursor:pointer}',
      '.aic-turn{display:flex;flex-direction:column;gap:5px;min-width:0;width:100%}',
      '.aic-turn.user{align-items:flex-end}.aic-turn.assistant{align-items:flex-start}',
      '.aic-bubble{max-width:min(830px,93%);padding:12px 16px;border-radius:12px;line-height:1.75;white-space:normal;overflow-wrap:anywhere}',
      '.aic-turn.user .aic-bubble{background:#e8f0ff;color:#153866;white-space:pre-wrap}',
      '.aic-turn.assistant .aic-bubble{background:#fff;border:1px solid #e0e7ef;color:#243145}',
      '.aic-bubble p{margin:0 0 10px}.aic-bubble>:last-child{margin-bottom:0}',
      '.aic-bubble h1,.aic-bubble h2,.aic-bubble h3{font-size:15px;font-weight:700;margin:13px 0 7px}',
      '.aic-bubble pre{background:#f1f5f9;overflow:auto;padding:10px;border-radius:6px;font-size:12px}',
      '.aic-bubble code{background:#f1f5f9;padding:1px 3px;border-radius:3px}',
      '.aic-bubble .airaglite-table-wrap{overflow:auto;max-width:100%}',
      '.aic-bubble table{border-collapse:collapse;min-width:350px}',
      '.aic-bubble th,.aic-bubble td{padding:7px;border:1px solid #cbd5e1;vertical-align:top}',
      '.aic-bubble ul,.aic-bubble ol{margin:7px 0 11px;padding-left:22px}',
      '.aic-source-list{display:flex;flex-wrap:wrap;gap:6px;max-width:93%;margin-top:5px}',
      '.aic-source-list button,.aic-action{font-size:12px;color:#1754ac;background:#fff;border:1px solid #bfd2ec;border-radius:7px;padding:6px 10px;cursor:pointer}',
      '.aic-facts{background:#f5f9ff;border:1px solid #cbdff6;border-radius:8px;padding:9px 13px;font-size:12px;line-height:1.65;max-width:93%;margin-top:6px}',
      '.aic-facts strong{font-size:13px}',
      '.aic-attachment-note{color:#64748b;font-size:12px;margin-top:6px}',
      '.aic-footer{display:flex;flex-direction:column;gap:7px;padding:13px 20px 16px;border-top:1px solid #e2e8f0;background:#fff;flex:0 0 auto}',
      '.aic-compose{display:flex;align-items:flex-end;gap:10px}',
      '#airaglite-chat-input{flex:1;min-height:74px;max-height:155px;resize:vertical;outline-offset:3px;padding:11px 13px;line-height:1.6;border-radius:9px;border:1px solid #cbd5e1;font:inherit;color:#243145}',
      '#airaglite-chat-send{background:#2368d6;color:#fff;border:0;border-radius:9px;padding:11px 18px;min-height:46px;cursor:pointer;font-weight:700}',
      '#airaglite-chat-send:disabled{background:#94a3b8;cursor:wait}',
      '#airaglite-chat-status{font-size:12px;color:#64748b;min-height:18px;overflow-wrap:anywhere}',
      '#airaglite-chat-picker{position:fixed;inset:0;z-index:9970;display:none;align-items:center;justify-content:center;background:#0009;padding:12px;box-sizing:border-box}',
      '.aic-picker{background:white;border-radius:10px;display:flex;flex-direction:column;width:min(650px,95vw);height:min(600px,83vh);max-height:83vh;overflow:hidden}',
      '.aic-picker-head{padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px}',
      '.aic-picker-head strong{flex:1;font-size:16px}',
      '.aic-picker-head button,.aic-picker-foot button{border:1px solid #cbd5e1;border-radius:6px;background:white;padding:7px 10px;cursor:pointer}',
      '.aic-picker-path{padding:10px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;overflow-wrap:anywhere}',
      '.aic-picker-items{flex:1;min-height:0;overflow:auto;padding:10px 15px}',
      '.aic-picker-items button{display:flex;gap:12px;width:100%;border:0;border-bottom:1px solid #eff2f6;background:white;text-align:left;color:#234d85;padding:12px;cursor:pointer;font-size:13px}',
      '.aic-picker-items button:hover{background:#eff6ff}',
      '.aic-picker-foot{padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;gap:10px;justify-content:space-between}',
      '@media(max-width:650px){#airaglite-assistant-layer{padding:2px}#airaglite-assistant-panel{width:100vw;height:99vh;max-height:99vh;border-radius:7px}.aic-header,.aic-toolbar{padding:10px 12px}#airaglite-chat-messages{padding:12px}.aic-footer{padding:10px}.aic-bubble{max-width:100%}.aic-tools{margin-left:0}}'
    ].join('\n');
    $('<style id="airaglite-chat-css"></style>').text(css).appendTo('head');

    var layer=$('<div id="airaglite-assistant-layer"></div>').appendTo('body');
    var panel=$('<section id="airaglite-assistant-panel" role="dialog" aria-modal="true" aria-label="KodBox AI 助手"></section>').appendTo(layer);
    var header=$('<div class="aic-header"></div>').appendTo(panel);
    var heading=$('<div class="aic-heading"></div>').appendTo(header);
    $('<strong>KodBox AI 助手</strong>').appendTo(heading);
    $('<div class="aic-muted">直接说您想做什么。阅读和分析不会修改原文。</div>').appendTo(heading);
    var newChat=$('<button type="button" id="airaglite-chat-reset">新对话</button>').appendTo(header);
    var close=$('<button type="button" id="airaglite-chat-close">关闭</button>').appendTo(header);
    var toolbar=$('<div class="aic-toolbar"></div>').appendTo(panel);
    var fileLabel=$('<span id="airaglite-chat-file">📄 未关联文件 · 可查询知识库或资产</span>').appendTo(toolbar);
    var tools=$('<div class="aic-tools"></div>').appendTo(toolbar);
    var chooseFile=$('<button type="button" id="airaglite-chat-attach">关联文件</button>').appendTo(tools);
    var detach=$('<button type="button" id="airaglite-chat-detach">取消关联</button>').hide().appendTo(tools);
    var searchTool=$('<button type="button">高级搜索</button>').appendTo(tools);
    var writingTool=$('<button type="button">文档编辑</button>').appendTo(tools);
    var messages=$('<div id="airaglite-chat-messages" aria-live="polite"></div>').appendTo(panel);
    var footer=$('<div class="aic-footer"></div>').appendTo(panel);
    var compose=$('<div class="aic-compose"></div>').appendTo(footer);
    var input=$('<textarea id="airaglite-chat-input" maxlength="1800" placeholder="例如：总结一下今年的费用，按人民币和美元分别统计。按 Enter 发送，Shift+Enter 换行。" aria-label="向 KodBox AI 助手提问"></textarea>').appendTo(compose);
    var send=$('<button type="button" id="airaglite-chat-send">发送</button>').appendTo(compose);
    var status=$('<div id="airaglite-chat-status" role="status"></div>').appendTo(footer);

    // File picker reads only paths enumerated and authorized by KodBox server.
    var picker=$('<div id="airaglite-chat-picker"></div>').appendTo('body');
    var pickPanel=$('<div class="aic-picker" role="dialog" aria-modal="true" aria-label="选择文档"></div>').appendTo(picker);
    var pickHeader=$('<div class="aic-picker-head"></div>').appendTo(pickPanel);
    $('<strong>关联 KodBox 文档</strong>').appendTo(pickHeader);
    var cancel=$('<button type="button">取消</button>').appendTo(pickHeader);
    var pickPath=$('<div class="aic-picker-path"></div>').appendTo(pickPanel);
    var pickList=$('<div class="aic-picker-items"></div>').appendTo(pickPanel);
    var pickFoot=$('<div class="aic-picker-foot"></div>').appendTo(pickPanel);
    var back=$('<button type="button">← 返回上级</button>').appendTo(pickFoot);
    $('<span class="aic-muted">目前支持个人空间里的 MD、TXT、Word。只读分析。</span>').appendTo(pickFoot);

    var attached=null;    // folder, name; no file contents stored persistently
    var turns=[];          // transient in-page history, never persisted
    var pending=false;
    var requestId=0;
    var browseId=0;
    var browsing='';
    var lastTopic='';

    function setStatus(message,error) {
        status.text(String(message||'')).css('color',error?'#b91c1c':'#64748b');
    }
    function apiRequest(route,payload,success,failure) {
        var api=window.kodApi;
        if (!api || typeof api.requestSend!=='function') {
            failure('KodBox API 尚未就绪，请刷新后重试');return;
        }
        try {
            api.requestSend('plugin/aiRagLite/'+route,payload,function(res){
                if (!res || res.code===false || !res.data) {
                    failure(res && typeof res.data==='string'?res.data:'请求失败，请检查后端日志');
                    return;
                }
                success(res.data);
            });
        } catch(error) {failure(error.message||String(error));}
    }
    function welcome() {
        messages.empty();
        var box=$('<div class="aic-welcome"></div>').appendTo(messages);
        $('<strong>您可以直接说想做什么</strong>').appendTo(box);
        $('<div></div>').text('关联已有文章可直接总结、问答和计算；不关联时可查知识库和数字资产。修改建议会先交给您审阅。').appendTo(box);
        var examples=$('<div class="aic-examples"></div>').appendTo(box);
        [
            '总结一下今年的费用',
            '查找 Ceph 部署相关的资料',
            '我的数字资产有哪些',
            '帮我写一份运维交接手册'
        ].forEach(function(sample){
            $('<button type="button"></button>').text(sample).appendTo(examples)
                .on('click',function(){input.val(sample).trigger('focus');});
        });
    }
    function reset(message) {
        if (pending) {setStatus('当前请求还没有完成',true);return false;}
        turns=[];requestId++;lastTopic='';
        welcome();setStatus(message||'新对话已开始。历史消息只保存在当前网页。');
        return true;
    }
    function updateFileLabel() {
        fileLabel.text(attached ? '📄 已关联：'+attached.name+' · '+(attached.folder||'个人空间') :
            '📄 未关联文件 · 可查询知识库或资产');
        detach.toggle(!!attached);
    }
    function scrollBottom() {
        if (messages.length) messages[0].scrollTop=messages[0].scrollHeight;
    }
    function addTurn(role,body) {
        var row=$('<div class="aic-turn"></div>').addClass(role).appendTo(messages);
        var box=$('<div class="aic-bubble"></div>').appendTo(row);
        if (role==='assistant' && typeof window.aiRagLiteRenderMarkdown==='function')
            window.aiRagLiteRenderMarkdown(box[0],String(body||''));
        else box.text(String(body||''));
        scrollBottom();
        return row;
    }
    function safeRoute(raw) {
        return typeof raw==='string' && /^#fileView&path=[^\\s]{1,4900}$/.test(raw);
    }
    function openSource(item) {
        var path=item&&item.path?String(item.path):'';
        if(!path){setStatus('此引用没有文件路径',true);return;}
        var tab=window.open('about:blank','_blank');
        apiRequest('resolve',{path:path},function(data){
            var route=String(data.route||'');
            if(!safeRoute(route)) {
                if(tab&&!tab.closed)tab.close();setStatus('来源文件地址无效',true);return;
            }
            var target=new URL(route,window.location.href);
            if(target.origin!==window.location.origin){if(tab&&!tab.closed)tab.close();setStatus('跨域跳转已阻止',true);return;}
            if(tab&&!tab.closed)tab.location.replace(target.href);
            else window.location.assign(target.href);
        },function(err){if(tab&&!tab.closed)tab.close();setStatus(err,true);});
    }
    function attachResult(row,data) {
        var sources=Array.isArray(data.sources)?data.sources:[];
        if(sources.length) {
            var bar=$('<div class="aic-source-list"></div>').appendTo(row);
            sources.slice(0,10).forEach(function(src){
                if(!src||!src.path)return;
                $('<button type="button"></button>').text('['+src.id+'] '+String(src.path).split('/').pop())
                    .appendTo(bar).on('click',function(){openSource(src);});
            });
        }
        if(data.expense_summary && Array.isArray(data.expense_summary.totals)) {
            var facts=$('<div class="aic-facts"></div>').appendTo(row);
            $('<strong>金额核算（来自当前表格）</strong>').appendTo(facts);
            data.expense_summary.totals.forEach(function(item){
                $('<div></div>').text(item.currency+' '+item.amount+' · '+item.rows+' 条记录').appendTo(facts);
            });
            $('<div></div>').text('未计入 '+String(data.expense_summary.skipped_rows||0)+
                ' 条记录。'+String(data.expense_summary.method||'')).appendTo(facts);
        }
        if(data.truncated) {
            $('<div class="aic-attachment-note"></div>').text('注意：文件较长，本次只分析了前 12000 个字符。').appendTo(row);
        }
        if(data.proposal && typeof data.proposal.content==='string') {
            var proposal=data.proposal;
            var action=$('<button type="button" class="aic-action"></button>')
                .text(proposal.kind==='revision'?'查看差异并确认':'在编辑器中检查并保存')
                .appendTo(row);
            action.on('click',function(){
                if(proposal.kind==='revision') {
                    if(typeof window.aiRagLiteOpenWriterRevision==='function')
                        window.aiRagLiteOpenWriterRevision(proposal.folder,proposal.name,proposal.content);
                    else setStatus('文档编辑器尚未加载，请刷新页面',true);
                } else {
                    if(typeof window.aiRagLiteOpenWriterDraft==='function')
                        window.aiRagLiteOpenWriterDraft(proposal.title,proposal.content);
                    else setStatus('文档编辑器尚未加载，请刷新页面',true);
                }
            });
        }
    }
    function submit() {
        if(pending)return;
        var question=String(input.val()||'').trim();
        if(question.length<2){setStatus('请至少输入两个字符',true);return;}
        if(question.length>1800){setStatus('输入内容过长',true);return;}
        if(messages.find('.aic-welcome').length) messages.empty();
        var history=turns.slice(-8).map(function(x){return {role:x.role,content:x.content.slice(0,2200)};});
        addTurn('user',question);
        input.val('');
        pending=true;send.prop('disabled',true).text('处理中…');
        setStatus('正在读取相关资料并生成回答……');
        var id=++requestId;
        var watchdog=window.setTimeout(function(){
            if(id!==requestId)return;
            ++requestId;pending=false;send.prop('disabled',false).text('发送');
            addTurn('assistant','请求超时。请检查 KodBox 和 RAG API 日志，然后重试。');
            setStatus('没有收到后端响应',true);
        },190000);
        apiRequest('assistantChat',{
            message:question,
            history_json:JSON.stringify(history),
            file_folder:attached?attached.folder:'',
            file_name:attached?attached.name:''
        },function(data){
            if(id!==requestId)return;
            window.clearTimeout(watchdog);
            pending=false;send.prop('disabled',false).text('发送');
            var answer=typeof data.answer==='string'?data.answer:'没有收到有效回答。';
            var row=addTurn('assistant',answer);
            attachResult(row,data);
            turns.push({role:'user',content:question});
            // A generated proposal's potentially huge body is deliberately NOT
            // sent as conversation history. Only bounded assistant responses are.
            turns.push({role:'assistant',content:answer.slice(0,2200)});
            if(turns.length>16)turns=turns.slice(-16);
            setStatus(data.mode==='asset_live'?'AssetLedger 本地实时查询 · 未提交给文档 AI':
                attached?'当前文件只读分析 · 原文件未改变':'RAG 知识库查询 · 原文件未改变');
            scrollBottom();
        },function(err){
            if(id!==requestId)return;
            window.clearTimeout(watchdog);
            pending=false;send.prop('disabled',false).text('发送');
            addTurn('assistant','处理失败：'+err);
            setStatus(err,true);
        });
    }
    function chooseFolder(folder) {
        var id=++browseId;
        browsing=folder;
        pickPath.text('个人空间'+(folder?' / '+folder.split('/').join(' / '):'（根目录）'));
        back.prop('disabled',!folder);
        pickList.empty().append($('<p class="aic-muted"></p>').text('正在读取文件夹……'));
        apiRequest('writerFolders',{folder:folder},function(data){
            if(id!==browseId)return;
            pickList.empty();
            var dirs=Array.isArray(data.folders)?data.folders:[];
            var files=Array.isArray(data.files)?data.files:[];
            dirs.forEach(function(item){
                if(!item||typeof item.folder!=='string')return;
                $('<button type="button"></button>').text('📁 '+String(item.name||''))
                    .appendTo(pickList).on('click',function(){chooseFolder(item.folder);});
            });
            files.forEach(function(item){
                if(!item||typeof item.name!=='string')return;
                $('<button type="button"></button>').text('📄 '+String(item.name||''))
                    .appendTo(pickList).on('click',function(){selectFile(folder,item.name);});
            });
            if(!dirs.length&&!files.length)
                $('<p class="aic-muted"></p>').text('当前文件夹没有可关联的 MD、TXT 或 Word 文档。').appendTo(pickList);
        },function(err){
            if(id!==browseId)return;
            pickList.empty().append($('<p class="aic-muted"></p>').text('无法读取目录：'+err));
        });
    }
    function selectFile(folder,name) {
        if(pending){setStatus('当前提问结束后再切换文件',true);return;}
        pickList.empty().append($('<p class="aic-muted"></p>').text('正在验证文件读取权限……'));
        apiRequest('writerRead',{folder:folder,name:name},function(data){
            if(!data||typeof data.content!=='string') {
                pickList.empty().text('读取文件失败，未关联');return;
            }
            attached={folder:folder,name:name};
            picker.hide();
            updateFileLabel();
            reset('已关联：'+name+'。现在可以直接提问，例如“总结一下今年的费用”。');
        },function(err){pickList.empty().append($('<p class="aic-muted"></p>').text(err));});
    }
    function showPicker() {
        if(pending){setStatus('当前请求尚未完成，不能切换文件',true);return;}
        picker.css('display','flex');
        chooseFolder(attached?attached.folder:'');
    }
    function closePicker() {browseId++;picker.hide();}
    window.aiRagLiteOpenAssistant=function(){
        layer.css('display','flex');input.trigger('focus');
    };
    send.on('click',submit);
    input.on('keydown',function(e){
        if(e.key==='Enter'&&!e.shiftKey){
            e.preventDefault();submit();
        }
    });
    close.on('click',function(){layer.hide();closePicker();});
    layer.on('click',function(e){if(e.target===layer[0]){layer.hide();closePicker();}});
    newChat.on('click',function(){reset();});
    chooseFile.on('click',showPicker);
    detach.on('click',function(){
        if(pending){setStatus('当前请求尚未完成，不能取消关联',true);return;}
        attached=null;updateFileLabel();reset('已取消文件关联。');
    });
    searchTool.on('click',function(){
        layer.hide();
        if(typeof window.aiRagLiteOpenSearch==='function')window.aiRagLiteOpenSearch();
    });
    writingTool.on('click',function(){
        if(!$('#airaglite-writer-open').length){setStatus('文档编辑器尚未就绪',true);return;}
        $('#airaglite-writer-open').trigger('click');
    });
    cancel.on('click',closePicker);
    picker.on('click',function(e){if(e.target===picker[0])closePicker();});
    back.on('click',function(){
        if(!browsing)return;
        var p=browsing.split('/');p.pop();chooseFolder(p.join('/'));
    });
    $(document).on('keydown.airaglite-chat',function(e){
        if(e.key!=='Escape')return;
        if(picker.is(':visible'))closePicker();
        else if(layer.is(':visible'))layer.hide();
    });
    updateFileLabel();welcome();
});
