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
      '.aic-file-results{display:flex;flex-direction:column;gap:8px;max-width:95%;width:850px;padding-top:4px}',
      '.aic-file-item{display:flex;flex-direction:column;gap:5px;text-align:left;background:#fff;border:1px solid #d8e3f4;border-radius:9px;padding:11px 13px;color:#334155;cursor:pointer;overflow-wrap:anywhere}',
      '.aic-file-item:hover{background:#eff6ff;border-color:#8bb7ef}',
      '.aic-file-title{font-weight:700;color:#1556a8;font-size:14px}',
      '.aic-file-path{font-size:12px;color:#64748b}',
      '.aic-file-snippet{font-size:12px;white-space:pre-wrap;line-height:1.5;color:#475569}',
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
      '#airaglite-agent-review{position:fixed;inset:0;z-index:9985;display:none;align-items:center;justify-content:center;background:#0f172a99;padding:12px;box-sizing:border-box}',
      '#airaglite-agent-review *{box-sizing:border-box}',
      '.aic-review-panel{width:min(1070px,98vw);height:min(760px,92vh);min-height:0;display:flex;flex-direction:column;background:white;border-radius:12px;overflow:hidden;color:#243145;box-shadow:0 18px 45px #0004}',
      '.aic-review-head{padding:12px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px}',
      '.aic-review-head strong{font-size:17px;flex:1}',
      '.aic-review-head button,.aic-review-foot button{border:1px solid #cbd5e1;background:white;padding:9px 12px;border-radius:8px;cursor:pointer;color:#234c83}',
      '.aic-review-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);flex:1;min-height:0;overflow:hidden}',
      '.aic-review-pane{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border-right:1px solid #e2e8f0}',
      '.aic-review-pane strong{padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0}',
      '#airaglite-review-before{flex:1;min-height:0;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;margin:0;font:13px/1.75 ui-monospace,Consolas,monospace}',
      '#airaglite-review-after{flex:1;min-height:0;width:100%;border:0;outline:0;resize:none;padding:14px;font:13px/1.75 ui-monospace,Consolas,monospace;color:#1e293b}',
      '#airaglite-review-status{font-size:12px;color:#475569;line-height:1.6;flex:1;min-width:0;overflow-wrap:anywhere}',
      '.aic-review-foot{padding:12px 15px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.aic-review-foot button.aic-primary{background:#2368d6;color:white;border-color:#2368d6;font-weight:650}',
      '@media(max-width:650px){.aic-review-columns{grid-template-columns:1fr;overflow:auto}.aic-review-pane{min-height:220px}.aic-review-foot{align-items:stretch;flex-direction:column}}',
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

    // A proposal stays in this separate, explicit approval dialog.
    // The model never writes files; the user must click a save action.
    var reviewLayer=$('<div id="airaglite-agent-review"></div>').appendTo('body');
    var reviewPanel=$('<div class="aic-review-panel" role="dialog" aria-modal="true" aria-label="审阅 AI 文件修改"></div>').appendTo(reviewLayer);
    var reviewHead=$('<div class="aic-review-head"></div>').appendTo(reviewPanel);
    var reviewHeading=$('<strong>审阅 AI 修改建议</strong>').appendTo(reviewHead);
    var reviewClose=$('<button type="button" id="airaglite-review-close">取消，不保存</button>').appendTo(reviewHead);
    var reviewColumns=$('<div class="aic-review-columns"></div>').appendTo(reviewPanel);
    var reviewBeforePane=$('<section class="aic-review-pane"></section>').appendTo(reviewColumns);
    $('<strong>原文件（只读）</strong>').appendTo(reviewBeforePane);
    var reviewBefore=$('<pre id="airaglite-review-before"></pre>').appendTo(reviewBeforePane);
    var reviewAfterPane=$('<section class="aic-review-pane"></section>').appendTo(reviewColumns);
    $('<strong>AI 建议稿（可编辑）</strong>').appendTo(reviewAfterPane);
    var reviewAfter=$('<textarea id="airaglite-review-after" maxlength="50000" aria-label="修改后的草稿"></textarea>').appendTo(reviewAfterPane);
    var reviewFoot=$('<div class="aic-review-foot"></div>').appendTo(reviewPanel);
    var reviewStatus=$('<div id="airaglite-review-status" role="status"></div>').appendTo(reviewFoot);
    var reviewSaveNew=$('<button type="button" id="airaglite-review-save-new" class="aic-primary">另存为新版本</button>').appendTo(reviewFoot);
    var reviewOverwrite=$('<button type="button" id="airaglite-review-overwrite">先备份，再更新原文</button>').appendTo(reviewFoot);
    var reviewProposal=null,reviewSourceHash='',reviewSaving=false;

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
    function addTurn(role,body,sources) {
        if (role==='assistant' && typeof window.aiRagLiteSetCitationSources==='function')
            window.aiRagLiteSetCitationSources(sources||[]);
        var row=$('<div class="aic-turn"></div>').addClass(role).appendTo(messages);
        var box=$('<div class="aic-bubble"></div>').appendTo(row);
        if (role==='assistant' && typeof window.aiRagLiteRenderMarkdown==='function')
            window.aiRagLiteRenderMarkdown(box[0],String(body||''));
        else box.text(String(body||''));
        scrollBottom();
        return row;
    }
    function safeRoute(raw) {
        return typeof raw==='string' && /^#fileView&path=.{1,4900}$/.test(raw);
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
    function reviewMessage(message,error){
        reviewStatus.text(String(message||'')).css('color',error?'#b91c1c':'#475569');
    }
    function closeReview(){
        if(reviewSaving)return;
        reviewProposal=null;reviewSourceHash='';
        reviewLayer.hide();
    }
    function showProposalReview(p){
        if(pending){setStatus('等当前任务完成后再审阅',true);return;}
        if(!p || typeof p.content!=='string'||!p.content.trim()||p.content.length>50000){
            setStatus('AI 返回的候选稿不可用',true);return;
        }
        reviewProposal=p;
        reviewSourceHash='';
        reviewBefore.text('');
        reviewAfter.val(p.content);
        reviewOverwrite.hide();
        reviewLayer.css('display','flex');
        if(p.kind==='revision') {
            reviewHeading.text('审阅修改：'+String(p.name||'文章'));
            reviewMessage('正在重新读取原文件并校验版本……');
            reviewSaveNew.prop('disabled',true);
            apiRequest('writerRead',{folder:p.folder,name:p.name},function(doc){
                if(reviewProposal!==p)return;
                if(!doc || typeof doc.content!=='string'||!(/^[a-f0-9]{64}$/).test(String(doc.hash||''))){
                    reviewMessage('原文件读取无效，已禁止保存。',true);return;
                }
                if(typeof p.hash==='string' && p.hash && p.hash!==doc.hash){
                    reviewBefore.text(doc.content);
                    reviewMessage('原文件在生成建议后发生变化。请关闭并重新让 AI 修改，避免覆盖新内容。',true);
                    return;
                }
                reviewSourceHash=doc.hash;
                reviewBefore.text(doc.content);
                reviewSaveNew.prop('disabled',false);
                reviewOverwrite.toggle(/\.(md|markdown|txt)$/i.test(p.name));
                reviewMessage('这里只展示建议稿。另存不会覆盖原文；更新原文必须先备份且再次确认。');
            },function(err){
                if(reviewProposal!==p)return;
                reviewMessage('读取原文件失败：'+err,true);
            });
        }else{
            reviewHeading.text('审阅新文档：'+String(p.title||'AI 草稿'));
            reviewBefore.text('新文档尚不存在，无需修改任何原文件。');
            reviewSaveNew.prop('disabled',false);
            reviewMessage('可以先在右侧编辑内容，再保存为新文件。');
        }
    }
    function saveProposal(overwriteOriginal){
        if(!reviewProposal || reviewSaving)return;
        var content=String(reviewAfter.val()||'');
        if(!content.trim()||content.length>50000){
            reviewMessage('文档内容为空或超过长度限制。',true);return;
        }
        var p=reviewProposal;
        if(overwriteOriginal){
            if(p.kind!=='revision'||!reviewSourceHash||!/\.(md|markdown|txt)$/i.test(p.name)){
                reviewMessage('此文件不允许直接覆盖，请另存新版本。',true);return;
            }
            if(!window.confirm('将先备份再更新原文件：'+p.name+'。这一步会真正修改 KodBox 内容，确认继续？'))
                return;
        }
        reviewSaving=true;
        reviewSaveNew.prop('disabled',true);reviewOverwrite.prop('disabled',true);
        reviewMessage(overwriteOriginal?'正在备份并更新原文件……':'正在保存新的文档……');
        var route=overwriteOriginal?'writerOverwrite':'saveDraft';
        var payload;
        if(overwriteOriginal){
            payload={folder:p.folder,name:p.name,hash:reviewSourceHash,
                content:content,confirm:'backup-and-overwrite'};
        }else{
            var isWord=p.kind==='revision'&&String(p.name).toLowerCase().endsWith('.docx');
            var title=p.kind==='revision'?String(p.name).replace(/\.(md|markdown|txt|docx)$/i,'')+'-AI修改版':
                String(p.title||'AI新文档');
            payload={folder:p.kind==='revision'?p.folder:'AI草稿',
                title:title,content:content,format:isWord?'docx':'md'};
        }
        apiRequest(route,payload,function(data){
            reviewSaving=false;
            reviewSaveNew.prop('disabled',false);reviewOverwrite.prop('disabled',false);
            var name=String(data.name||p.name||'新文档');
            var backup=overwriteOriginal&&data.backup?'（备份：'+data.backup+'）':'';
            closeReview();
            addTurn('assistant','✅ 已在 KodBox '+(overwriteOriginal?'更新原文件':'另存为新文档')+
                '：'+name+backup);
            setStatus('用户已确认并完成保存。');
        },function(err){
            reviewSaving=false;reviewSaveNew.prop('disabled',false);reviewOverwrite.prop('disabled',false);
            reviewMessage('保存失败：'+err,true);
        });
    }

    // Short file-title lookups should reuse the existing RAG index directly.
    // This is a deterministic, safe retrieval shortcut; other requests still
    // go through the model-selected KodBox Agent tools.
    function shouldUseIndexedLookup(question) {
        if (attached) return false;
        var q=String(question||'').trim();
        if (q.length<2 || q.length>90) return false;
        if (/资产|台账|订阅费用|账单统计|费用汇总/.test(q)) return false;
        if (/列出.*(?:文件夹|目录)|(?:文件夹|目录).*(?:有哪些|列出|子目录)|新建|创建|生成|帮我写|修改|润色|删除|移动|重命名|覆盖|帮我总结|分析|计算|统计/.test(q))
            return false;
        var fileHint=/文件|文档|文章|资料|笔记|流程|教程|手册|报告|方案|脚本|配置|\.md\b|\.txt\b|\.docx\b/i;
        if (/(?:查找|找一下|帮我找|搜索|定位|在哪里|在哪儿|找找|有没有)/.test(q))
            return fileHint.test(q) || q.length<=45;
        return q.length<=24 && fileHint.test(q) &&
            !/[?？]$/.test(q);
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
        if(Array.isArray(data.lookup_results)) {
            var candidates=$('<div class="aic-file-results"></div>').appendTo(row);
            data.lookup_results.slice(0,8).forEach(function(hit) {
                if(!hit||!hit.path)return;
                var btn=$('<button type="button" class="aic-file-item"></button>').appendTo(candidates);
                $('<span class="aic-file-title"></span>').text('📄 '+String(hit.name||String(hit.path).split('/').pop())).appendTo(btn);
                $('<span class="aic-file-path"></span>').text(String(hit.path)+' · '+String(hit.location||'')).appendTo(btn);
                if(hit.snippet)
                    $('<span class="aic-file-snippet"></span>').text(String(hit.snippet).slice(0,300)).appendTo(btn);
                btn.attr('title','通过当前 KodBox 登录会话验证权限后打开原文件');
                btn.on('click',function(){openSource(hit);});
            });
            $('<div class="aic-attachment-note"></div>').text(
                '以上是 RAG 索引中的候选文件。点击后才会核验权限并打开原件；找不到不等于文件不存在。'
            ).appendTo(row);
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
            $('<div class="aic-attachment-note"></div>').text('注意：文件较长，本次只分析了前 6000 个字符。').appendTo(row);
        }
        if(data.proposal && typeof data.proposal.content==='string') {
            var proposal=data.proposal;
            var action=$('<button type="button" class="aic-action"></button>')
                .text(proposal.kind==='revision'?'查看差异并确认':'在编辑器中检查并保存')
                .appendTo(row);
            action.on('click',function(){showProposalReview(proposal);});
        }
    }
    function submit() {
        if(pending)return;
        var question=String(input.val()||'').trim();
        if(question.length<2){setStatus('请至少输入两个字符',true);return;}
        if(question.length>1800){setStatus('输入内容过长',true);return;}
        if(messages.find('.aic-welcome').length)messages.empty();
        var history=turns.slice(-6).map(function(x){
            return {role:x.role,content:x.content.slice(0,1800)};
        });
        addTurn('user',question);
        input.val('');
        pending=true;send.prop('disabled',true).text('处理中…');
        setStatus('AI 正在选择需要执行的文件工具……');
        var id=++requestId;
        var observations=[],audit=[],facts=null,sources=[],indexedCandidates=[];
        var timer=window.setTimeout(function(){
            if(id!==requestId)return;
            requestId++;pending=false;send.prop('disabled',false).text('发送');
            addTurn('assistant','操作超时。请检查插件和 RAG API 日志；没有进行任何文件写入。');
            setStatus('Agent 运行超时',true);
        },260000);
        var toolLabels={
            list_folder:'列出文件夹',read_document:'读取文件',
            find_files:'按索引定位文件',search_knowledge:'搜索知识库',calculate_expenses:'核算费用',
            prepare_edit:'准备修改稿',prepare_new_document:'起草新文档'
        };
        function finish(answer,extra) {
            if(id!==requestId)return;
            window.clearTimeout(timer);
            pending=false;send.prop('disabled',false).text('发送');
            var row=addTurn('assistant',answer,sources);
            if(extra)attachResult(row,extra);
            if(audit.length){
                var summary=$('<div class="aic-attachment-note"></div>')
                    .text('本轮执行：'+audit.join(' → ')).appendTo(row);
            }
            if(extra && extra.mode==='asset_live')turns=[];
            else {
                turns.push({role:'user',content:question});
                turns.push({role:'assistant',content:String(answer).slice(0,1800)});
                if(turns.length>16)turns=turns.slice(-16);
            }
            setStatus(extra&&extra.mode==='asset_live'?
                '资产查询只在本地执行，没有发送到语言模型':
                '已完成本轮工具调用；原文件没有改变');
            scrollBottom();
        }
        function fail(err) {
            if(id!==requestId)return;
            window.clearTimeout(timer);
            pending=false;send.prop('disabled',false).text('发送');
            addTurn('assistant','操作未完成：'+String(err));
            setStatus('Agent 调用失败：'+String(err),true);
        }
        // Be tolerant of a single older API envelope while keeping tool execution strict.
        // A missing tool call is a valid final answer, not proof of unsupported function calling.
        function normalizeAgentStep(value) {
            var result=value;
            for(var n=0;n<3;n++) {
                if(typeof result==='string') {
                    try {result=JSON.parse(result);} catch(e) {break;}
                    continue;
                }
                if(result && typeof result==='object' && !Array.isArray(result) &&
                    !result.kind && result.data && typeof result.data==='object' &&
                    !Array.isArray(result.data)) {
                    result=result.data;
                    continue;
                }
                break;
            }
            return result;
        }
        function next(forceFinal) {
            if(id!==requestId)return;
            apiRequest('agentStep',{
                message:question,
                history_json:JSON.stringify(history),
                observations_json:JSON.stringify(observations),
                file_folder:attached?attached.folder:'',
                file_name:attached?attached.name:'',
                force_final:forceFinal?'1':'0'
            },function(data){
                if(id!==requestId)return;
                var step=normalizeAgentStep(data);
                if(step && typeof step==='object' &&
                    (step.kind==='final' || (!step.kind && typeof step.answer==='string'))) {
                    finish(String(step.answer||'没有得到有效回答。'),{
                        mode:step.mode||'agent',sources:sources,
                        expense_summary:facts
                    });
                    return;
                }
                if(!step || step.kind!=='tool' || !toolLabels[step.tool] ||
                    !step.arguments || typeof step.arguments!=='object' ||
                    Array.isArray(step.arguments)) {
                    var keys=step && typeof step==='object' && !Array.isArray(step)?
                        Object.keys(step).slice(0,8).join(', '):typeof step;
                    var kind=step && typeof step==='object'?String(step.kind||'缺失'):'缺失';
                    fail('Agent 返回格式不匹配（kind='+kind+'；字段：'+keys+
                        '）。请检查 KodBox 插件与 RAG API 的响应结构。');
                    return;
                }
                var tool=step.tool,args=step.arguments;
                // Accept only the bounded query for read-only RAG tools.
                // Models sometimes include unsupported optional fields.
                if(tool==='find_files' || tool==='search_knowledge') {
                    var q=typeof args.query==='string'?args.query:
                        (typeof args.q==='string'?args.q:question);
                    args={query:q.trim()};
                    if(!args.query) {fail('模型没有提供有效的检索关键词');return;}
                }
                // File discovery returns WebDAV index paths, never home-relative
                // KodBox folders. Pin a subsequent read to the *exact* indexed
                // candidate; PHP still resolves the path and verifies session rights.
                if((tool==='read_document' || tool==='calculate_expenses') &&
                    typeof args.name==='string') {
                    var candidates=indexedCandidates.filter(function(hit) {
                        if(!hit || typeof hit.path!=='string')return false;
                        var hitName=String(hit.name||hit.path.split('/').pop());
                        return hitName===args.name;
                    });
                    var uniquePaths=Array.from(new Set(candidates.map(function(hit){return hit.path;})));
                    var preferredFolder=String(args.folder||'');
                    if(uniquePaths.length>1 && preferredFolder) {
                        var exact=uniquePaths.filter(function(path) {
                            return path===preferredFolder+'/'+args.name;
                        });
                        if(exact.length===1)uniquePaths=exact;
                    }
                    if(uniquePaths.length===1) {
                        args={folder:preferredFolder,name:args.name,indexed_path:uniquePaths[0]};
                    }else if(uniquePaths.length>1) {
                        finish('索引找到多个同名文件，无法确认应读取哪一个。请从下方候选文件中选择并打开。',
                            {mode:'ambiguous_file',sources:sources,lookup_results:candidates});
                        return;
                    }
                }
                var repeated=observations.some(function(obs) {
                    return obs.tool===tool &&
                        JSON.stringify(obs.arguments)===JSON.stringify(args);
                });
                if(repeated) {
                    fail('工具重复请求了相同参数，已停止，避免循环调用。');
                    return;
                }
                var display=toolLabels[tool];
                if(args.name)display+='：'+String(args.name).slice(0,60);
                else if(args.folder)display+='：'+String(args.folder).slice(0,60);
                else if(args.query)display+='：'+String(args.query).slice(0,60);
                audit.push(display);
                setStatus('正在执行：'+display+'（'+audit.length+'/4）');
                var trace=$('<div class="aic-attachment-note"></div>')
                    .text('⚙ '+display+' · 执行中').appendTo(messages);
                scrollBottom();
                apiRequest('agentTool',{
                    tool:tool,
                    arguments_json:JSON.stringify(args)
                },function(result){
                    if(id!==requestId)return;
                    trace.text('✓ '+display);
                    if(result.proposal && typeof result.proposal.content==='string') {
                        finish(String(result.message||'已准备待审阅的修改建议；原文件未改变。'),{
                            proposal:result.proposal,mode:'proposal',sources:sources
                        });
                        return;
                    }
                    if(tool==='calculate_expenses' && result.summary)facts=result.summary;
                    if((tool==='search_knowledge' || tool==='find_files') && Array.isArray(result.results)){
                        if(tool==='find_files')indexedCandidates=result.results.slice(0,8);
                        result.results.slice(0,8).forEach(function(ref,i){
                            if(ref&&ref.path)sources.push({
                                id:i+1,path:ref.path,location:ref.location||''
                            });
                        });
                    }
                    // A short lookup request needs the actual candidate files,
                    // not another expensive model turn that may repeat find_files.
                    if(tool==='find_files' && !attached && question.length<=45 &&
                        !/总结|分析|比较|对比|计算|统计|写|修改|整理/.test(question)) {
                        var hits=Array.isArray(result.results)?result.results:[];
                        finish(hits.length?
                            '在 RAG 索引中找到 '+hits.length+' 个候选文件，点击文件可验证权限后打开。':
                            'RAG 索引没有找到与“'+question+'”匹配的文件。请尝试“高级搜索”；这不代表 KodBox 中没有相关资料。',
                            {mode:'file_lookup',sources:sources,lookup_results:hits});
                        return;
                    }
                    observations.push({
                        tool:tool,arguments:args,
                        result:JSON.stringify(result).slice(0,6200)
                    });
                    next(observations.length>=4);
                },function(err){
                    if(id!==requestId)return;
                    trace.text('× '+display+' · '+err);
                    // A failed tool is not evidence that a file is missing.
                    // Do not send the same invalid call around four times or
                    // let the model fabricate a "not found" answer.
                    fail(display+'失败：'+String(err).slice(0,400));
                });
            },fail);
        }
        if (shouldUseIndexedLookup(question)) {
            // Filename/short-title searches do not need four expensive LLM
            // tool decisions or blind walks through unrelated project folders.
            audit.push('RAG 索引定位文件');
            setStatus('正在使用现有 RAG 索引搜索文件名……');
            apiRequest('agentTool',{tool:'find_files',arguments_json:JSON.stringify({query:question})},function(result){
                if(id!==requestId)return;
                var hits=Array.isArray(result.results)?result.results:[];
                sources=hits.filter(function(x){return x && x.path;})
                    .map(function(x,i){return {id:i+1,path:x.path,location:x.location||''};});
                var answer=hits.length?
                    '在已有 RAG 索引中找到 '+hits.length+' 个候选文件，已按文件名匹配程度排序。点击下面的文件即可打开。':
                    '现有 RAG 索引没有找到匹配文件。您可以尝试缩短关键词，或检查该文件是否已纳入索引；这不代表 KodBox 中没有此文件。';
                finish(answer,{mode:'file_lookup',sources:sources,lookup_results:hits});
            },function(err){
                if(id!==requestId)return;
                fail('索引检索失败：'+err+'。您仍可以使用“高级搜索”进行独立检查。');
            });
            return;
        }
        next(false);
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
    window.aiRagLiteSetActiveDocument=function(folder,name,question){
        if(pending){setStatus('请先等当前工具调用结束',true);return false;}
        if(typeof folder!=='string'||typeof name!=='string'||!name||name.length>255)return false;
        attached={folder:folder,name:name};
        updateFileLabel();
        reset('已关联 KodBox 文件：'+name+'。可以直接提问，无需重新生成草稿。');
        if(typeof question==='string' && question.trim())input.val(question.trim().slice(0,1800));
        return true;
    };
    var lastDetectedHash='';
    function detectOpenedFile(){
        if(attached)return;
        var hash=String(window.location.hash||'');
        if(hash===lastDetectedHash)return;
        var match=hash.match(/^#fileView&path=([^&]+)/);
        if(!match)return;
        lastDetectedHash=hash;
        var current;
        try{current=decodeURIComponent(match[1]);}catch(e){return;}
        apiRequest('agentCurrentFile',{path:current},function(data){
            if(attached||pending)return;
            if(data&&typeof data.name==='string'&&typeof data.folder==='string')
                window.aiRagLiteSetActiveDocument(data.folder,data.name);
        },function(){/* Only current user's personal files may be auto attached. */});
    }
    window.aiRagLiteOpenAssistant=function(){
        layer.css('display','flex');
        detectOpenedFile();
        input.trigger('focus');
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
        layer.hide();
        $('#airaglite-writer-open').trigger('click');
    });
    reviewClose.on('click',closeReview);
    reviewSaveNew.on('click',function(){saveProposal(false);});
    reviewOverwrite.on('click',function(){saveProposal(true);});
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
