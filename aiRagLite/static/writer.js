// AI document writer. All document writes use the current KodBox session;
// rag_reader remains a read-only WebDAV indexing account.
kodReady.push(function () {
    'use strict';
    var jq = window.jQuery || window.$;
    if (!jq || !jq('#airaglite-header').length || jq('#airaglite-writer-open').length) return;
    var $ = jq;

    var css = [
      '#airaglite-writer-overlay{position:fixed;inset:0;z-index:10020;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.56);padding:12px;box-sizing:border-box}',
      '#airaglite-writer-dialog{display:flex;flex-direction:column;width:min(1120px,96vw);height:min(810px,92vh);max-height:92vh;min-height:0;overflow:hidden;background:#fff;color:#263247;border-radius:12px;box-shadow:0 18px 55px #0003;font-size:14px}',
      '#airaglite-writer-dialog *{box-sizing:border-box}',
      '#airaglite-writer-dialog button{cursor:pointer}',
      '#airaglite-writer-dialog button:disabled{opacity:.55;cursor:wait}',
      '.alw-header{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 22px;border-bottom:1px solid #e2e8f0}',
      '.alw-heading{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.alw-heading strong{font-size:18px;line-height:1.35}',
      '.alw-muted{color:#64748b;font-size:12px;line-height:1.5}',
      '.alw-close{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:7px 12px;color:#334155;white-space:nowrap}',
      '#airaglite-writer-body{display:grid;grid-template-columns:minmax(270px,330px) minmax(0,1fr);flex:1;min-height:0;overflow:hidden}',
      '.alw-sidebar{min-width:0;min-height:0;overflow-y:auto;padding:20px;border-right:1px solid #e2e8f0;background:#f8fafc}',
      '.alw-label{display:block;font-weight:650;font-size:13px;margin-bottom:7px;color:#334155}',
      '.alw-field{margin:0 0 18px}',
      '.alw-field input,.alw-field textarea{display:block;width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:10px 11px;font:inherit;line-height:1.5;background:#fff;color:#1e293b;outline-offset:2px}',
      '#airaglite-writer-topic{min-height:42px}',
      '#airaglite-writer-requirements{height:128px;min-height:90px;max-height:230px;resize:vertical}',
      '.alw-source-choice{display:flex;gap:9px;align-items:flex-start;margin:0 0 18px;line-height:1.5;font-size:13px;color:#334155;cursor:pointer}',
      '.alw-source-choice input{flex:0 0 auto;margin-top:3px;width:16px;height:16px}',
      '.alw-primary{border:1px solid #2368d6;border-radius:7px;background:#2368d6;color:#fff;font-weight:650;padding:10px 15px;min-height:40px}',
      '.alw-secondary{border:1px solid #cbd5e1;background:#fff;color:#2454a4;border-radius:7px;padding:8px 12px;min-height:36px}',
      '.alw-generate{width:100%}',
      '.alw-section-divider{border:0;border-top:1px solid #e2e8f0;margin:20px 0}',
      '.alw-folder-card{border:1px solid #d8e2ef;border-radius:9px;padding:12px;background:#fff}',
      '#airaglite-writer-selected{font-size:13px;font-weight:650;line-height:1.65;overflow-wrap:anywhere;padding:4px 0 12px;white-space:pre-wrap}',
      '.alw-folder-card .alw-secondary{width:100%}',
      '.alw-sources{font-size:12px;margin-top:14px;color:#475569}',
      '.alw-sources summary{cursor:pointer;font-weight:600}',
      '.alw-sources-text{max-height:120px;overflow:auto;margin-top:7px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}',
      '.alw-workspace{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;background:#fff}',
      '.alw-workspace-top{flex:0 0 auto;display:flex;align-items:center;gap:16px;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:12px 18px}',
      '.alw-tabs{display:inline-flex;border:1px solid #d5deeb;background:#f1f5f9;border-radius:8px;padding:3px;gap:2px}',
      '.alw-tab{border:0;background:transparent;color:#64748b;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:650}',
      '.alw-tab[aria-selected=true]{background:#fff;color:#1d4ed8;box-shadow:0 1px 4px #0002}',
      '.alw-document{flex:1;min-width:0;min-height:0;overflow:hidden;position:relative}',
      '#airaglite-writer-editor{width:100%;height:100%;min-height:0;margin:0;display:none;resize:none;border:0;outline:0;border-radius:0;padding:22px;font:14px/1.75 ui-monospace,SFMono-Regular,Consolas,monospace;color:#1e293b;background:#fff;overflow:auto;white-space:pre-wrap}',
      '#airaglite-writer-preview{width:100%;height:100%;display:block;overflow:auto;padding:22px 28px;font-size:14px;line-height:1.75;color:#263247;overflow-wrap:anywhere}',
      '#airaglite-writer-preview h1,#airaglite-writer-preview h2,#airaglite-writer-preview h3,#airaglite-writer-preview h4{font-weight:700;line-height:1.4;margin:20px 0 10px}',
      '#airaglite-writer-preview h1{font-size:23px;margin-top:0}',
      '#airaglite-writer-preview h2{font-size:19px}',
      '#airaglite-writer-preview h3{font-size:16px}',
      '#airaglite-writer-preview p{margin:8px 0 13px}',
      '#airaglite-writer-preview ul,#airaglite-writer-preview ol{padding-left:24px;margin:8px 0 14px}',
      '#airaglite-writer-preview li{margin:5px 0}',
      '#airaglite-writer-preview pre{background:#f1f5f9;padding:12px;border-radius:7px;overflow:auto;font-size:12px}',
      '#airaglite-writer-preview code{background:#f1f5f9;border-radius:3px;padding:1px 4px}',
      '#airaglite-writer-preview pre code{background:transparent;padding:0}',
      '#airaglite-writer-preview blockquote{border-left:3px solid #94a3b8;padding-left:12px;color:#475569;margin:8px 0}',
      '#airaglite-writer-preview .airaglite-table-wrap{overflow-x:auto;max-width:100%;margin:12px 0}',
      '#airaglite-writer-preview table{border-collapse:collapse;width:100%;min-width:380px}',
      '#airaglite-writer-preview th,#airaglite-writer-preview td{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top}',
      '#airaglite-writer-preview th{background:#edf4ff}',
      '.alw-empty{display:flex;align-items:center;justify-content:center;min-height:200px;height:100%;max-height:100%;text-align:center;color:#94a3b8;padding:30px;line-height:1.8}',
      '.alw-footer{flex:0 0 auto;border-top:1px solid #e2e8f0;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:75px;background:#fff}',
      '#airaglite-writer-message{color:#475569;font-size:12px;line-height:1.5;overflow-wrap:anywhere;flex:1;min-width:0}',
      '.alw-footer-actions{display:flex;align-items:center;gap:9px;flex:0 0 auto;flex-wrap:wrap}',
      '.alw-footer-actions label{color:#475569;font-size:12px;white-space:nowrap}',
      '#airaglite-writer-format{border:1px solid #cbd5e1;padding:8px;border-radius:7px;min-height:39px;background:#fff;color:#334155}',
      '#airaglite-writer-picker{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.62);padding:14px;box-sizing:border-box}',
      '.alw-picker-dialog{display:flex;flex-direction:column;width:min(580px,96vw);max-height:min(620px,85vh);min-height:min(460px,75vh);overflow:hidden;background:#fff;border-radius:11px;box-shadow:0 16px 50px #0003;color:#263247}',
      '.alw-picker-header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;padding:15px 18px}',
      '.alw-picker-header strong{font-size:16px}',
      '.alw-picker-location{padding:14px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;line-height:1.5}',
      '#airaglite-writer-picker-path{font-weight:650;font-size:13px;overflow-wrap:anywhere}',
      '#airaglite-writer-picker-list{flex:1;min-height:0;overflow-y:auto;padding:12px 14px}',
      '.alw-picker-row{display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;text-align:left;padding:12px;border:0;border-bottom:1px solid #edf2f7;color:#234d80;background:#fff;font-size:14px;cursor:pointer}',
      '.alw-picker-row:hover{background:#eff6ff}',
      '.alw-picker-muted{padding:18px;color:#64748b;font-size:13px;line-height:1.6}',
      '.alw-picker-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-top:1px solid #e2e8f0;flex-wrap:wrap}',
      '.alw-picker-footer .alw-secondary:disabled{opacity:.5;cursor:default}',
      '@media(max-width:850px){#airaglite-writer-dialog{width:96vw;height:94vh;max-height:94vh}#airaglite-writer-body{display:block;overflow-y:auto}.alw-sidebar{overflow:visible;border-right:0;border-bottom:1px solid #e2e8f0}.alw-workspace{height:440px;min-height:350px}.alw-document{min-height:0}}',
      '@media(max-width:560px){#airaglite-writer-overlay{padding:4px}#airaglite-writer-dialog{width:100vw;height:98vh;max-height:98vh;border-radius:8px}.alw-header{padding:12px}.alw-workspace-top{padding:9px 12px}#airaglite-writer-preview{padding:15px}.alw-footer{padding:10px 12px;align-items:stretch;flex-direction:column}.alw-footer-actions{justify-content:space-between}.alw-footer-actions .alw-primary{flex:1}.alw-sidebar{padding:15px}}'
    ].join('\n');
    $('<style id="airaglite-writer-styles"></style>').text(css).appendTo('head');

    // Keep the launcher alongside the existing search dialog title.
    var trigger = $('<button type="button" id="airaglite-writer-open">✍ AI 写文档</button>')
      .css({marginLeft:'auto',marginRight:'12px',border:'1px solid #cbd5e1',padding:'5px 10px',
            borderRadius:'6px',background:'#fff',color:'#1754ac'})
      .insertBefore('#airaglite-close');

    var overlay = $('<div id="airaglite-writer-overlay"></div>').appendTo('body');
    var dialog = $('<div id="airaglite-writer-dialog" role="dialog" aria-modal="true" aria-labelledby="airaglite-writer-heading"></div>').appendTo(overlay);
    var header = $('<div class="alw-header"></div>').appendTo(dialog);
    var heading = $('<div class="alw-heading"></div>').appendTo(header);
    $('<strong id="airaglite-writer-heading"></strong>').text('AI 写文档').appendTo(heading);
    $('<span class="alw-muted"></span>').text('生成草稿 → 编辑或预览 → 确认保存').appendTo(heading);
    var close = $('<button type="button" class="alw-close">关闭</button>').appendTo(header);

    var body = $('<div id="airaglite-writer-body"></div>').appendTo(dialog);
    var sidebar = $('<section class="alw-sidebar" aria-label="写作设置"></section>').appendTo(body);
    var workspace = $('<section class="alw-workspace" aria-label="文档编辑与预览"></section>').appendTo(body);

    var titleField = $('<div class="alw-field"></div>').appendTo(sidebar);
    $('<label for="airaglite-writer-topic" class="alw-label">文档主题</label>').appendTo(titleField);
    var title = $('<input id="airaglite-writer-topic" type="text" maxlength="160" placeholder="例如：Cephadm 部署操作手册">').appendTo(titleField);
    var reqField = $('<div class="alw-field"></div>').appendTo(sidebar);
    $('<label for="airaglite-writer-requirements" class="alw-label">写作要求（可选）</label>').appendTo(reqField);
    var req = $('<textarea id="airaglite-writer-requirements" maxlength="2000" placeholder="例如：包含准备、实施步骤、风险和回滚方案"></textarea>').appendTo(reqField);
    var sourceLabel = $('<label class="alw-source-choice"></label>').appendTo(sidebar);
    var useSources = $('<input type="checkbox">').appendTo(sourceLabel);
    $('<span></span>').text('参考已有 KodBox 文档（相关片段会发送给已配置的 AI 模型）').appendTo(sourceLabel);
    var generate = $('<button type="button" class="alw-primary alw-generate">生成草稿</button>').appendTo(sidebar);
    var refs = $('<details class="alw-sources"></details>').hide().appendTo(sidebar);
    $('<summary>查看引用资料</summary>').appendTo(refs);
    var refsText = $('<div class="alw-sources-text"></div>').appendTo(refs);
    $('<hr class="alw-section-divider">').appendTo(sidebar);
    $('<div class="alw-label">保存位置</div>').appendTo(sidebar);
    var folderCard = $('<div class="alw-folder-card"></div>').appendTo(sidebar);
    var currentFolder = $('<div id="airaglite-writer-selected" aria-live="polite"></div>').appendTo(folderCard);
    var folderButton = $('<button type="button" id="airaglite-writer-choose-folder" class="alw-secondary">选择其他文件夹</button>').appendTo(folderCard);
    $('<p class="alw-muted"></p>').text('仅在当前登录账号的个人空间创建新文件，不会覆盖已有文档。').appendTo(sidebar);

    var workspaceTop = $('<div class="alw-workspace-top"></div>').appendTo(workspace);
    var tabGroup = $('<div class="alw-tabs" role="tablist" aria-label="正文显示方式"></div>').appendTo(workspaceTop);
    var editTab = $('<button type="button" class="alw-tab" role="tab" aria-controls="airaglite-writer-editor">编辑正文</button>').appendTo(tabGroup);
    var previewTab = $('<button type="button" class="alw-tab" role="tab" aria-controls="airaglite-writer-preview">预览排版</button>').appendTo(tabGroup);
    var counter = $('<span class="alw-muted" id="airaglite-writer-count"></span>').appendTo(workspaceTop);
    var documentArea = $('<div class="alw-document"></div>').appendTo(workspace);
    var editor = $('<textarea id="airaglite-writer-editor" maxlength="50000" aria-label="文档正文 Markdown" placeholder="可以在这里编辑 AI 生成的草稿，也可以自己输入 Markdown。"></textarea>').appendTo(documentArea);
    var preview = $('<div id="airaglite-writer-preview" role="tabpanel" aria-label="文档排版预览"></div>').appendTo(documentArea);

    var footer = $('<div class="alw-footer"></div>').appendTo(dialog);
    var message = $('<span id="airaglite-writer-message" role="status" aria-live="polite"></span>').appendTo(footer);
    var footerActions = $('<div class="alw-footer-actions"></div>').appendTo(footer);
    $('<label for="airaglite-writer-format">保存格式</label>').appendTo(footerActions);
    var format = $('<select id="airaglite-writer-format"><option value="md">Markdown (.md)</option><option value="docx">Word (.docx)</option></select>').appendTo(footerActions);
    var open = $('<button type="button" class="alw-secondary" id="airaglite-writer-open-saved">打开已保存文件</button>').hide().appendTo(footerActions);
    var save = $('<button type="button" class="alw-primary" id="airaglite-writer-save">保存新文档</button>').appendTo(footerActions);

    // Dedicated folder chooser: browsing is not the same as choosing a folder.
    var picker = $('<div id="airaglite-writer-picker"></div>').appendTo('body');
    var pickerDialog = $('<div class="alw-picker-dialog" role="dialog" aria-modal="true" aria-label="选择保存文件夹"></div>').appendTo(picker);
    var pickerHead = $('<div class="alw-picker-header"></div>').appendTo(pickerDialog);
    $('<strong>选择保存文件夹</strong>').appendTo(pickerHead);
    var pickerClose = $('<button type="button" class="alw-secondary">取消</button>').appendTo(pickerHead);
    var pickerLocation = $('<div class="alw-picker-location"></div>').appendTo(pickerDialog);
    $('<div class="alw-muted">当前浏览位置（选择后才能保存到此处）</div>').appendTo(pickerLocation);
    var pickerPathText = $('<div id="airaglite-writer-picker-path"></div>').appendTo(pickerLocation);
    var pickerList = $('<div id="airaglite-writer-picker-list"></div>').appendTo(pickerDialog);
    var pickerFoot = $('<div class="alw-picker-footer"></div>').appendTo(pickerDialog);
    var up = $('<button type="button" class="alw-secondary" id="airaglite-writer-picker-up">← 返回上级</button>').appendTo(pickerFoot);
    var choose = $('<button type="button" class="alw-primary" id="airaglite-writer-picker-use">使用此文件夹</button>').appendTo(pickerFoot);

    var selected = 'AI草稿';
    var chosenFromPicker = false;
    var browsing = '';
    var folderRequestId = 0;
    var generationId = 0;
    var saveId = 0;
    var lastRoute = '';

    function folderName(relative) {
        return '个人空间' + (relative ? ' / ' + relative.split('/').join(' / ') : '（根目录）');
    }
    function updateFolder() {
        currentFolder.text('📁 ' + folderName(selected) + (selected === 'AI草稿' ? '（默认）' : ''));
    }
    function info(text, isError) {
        message.text(String(text || '')).css('color', isError ? '#b91c1c' : '#475569');
    }
    function request(method, payload, success, failure) {
        function reject(text) {
            if (typeof failure === 'function') failure(String(text || '请求失败'));
            else info(String(text || '请求失败'), true);
        }
        var api = window.kodApi;
        if (!api || typeof api.requestSend !== 'function') {
            reject('KodBox API 尚未就绪，请刷新文件管理页面。');
            return;
        }
        try {
            api.requestSend('plugin/aiRagLite/' + method, payload, function (res) {
                if (!res || res.code === false || !res.data) {
                    reject(res && typeof res.data === 'string' ? res.data : '接口返回失败');
                    return;
                }
                success(res.data);
            });
        } catch (error) {
            reject(error.message || String(error));
        }
    }
    function countChars() {
        counter.text(String(editor.val() || '').length + ' / 50000 字符');
    }
    function renderPreview() {
        var content = String(editor.val() || '');
        preview.empty();
        if (!content.trim()) {
            $('<div class="alw-empty"></div>').text('在左侧填写主题并生成草稿。\n生成后可在这里预览排版，也可以切换到“编辑正文”修改。')
              .css('white-space','pre-line').appendTo(preview);
        } else if (typeof window.aiRagLiteRenderMarkdown === 'function') {
            window.aiRagLiteRenderMarkdown(preview[0], content);
        } else {
            $('<pre></pre>').text(content).appendTo(preview);
        }
    }
    function showTab(mode) {
        var editing = mode === 'edit';
        editTab.attr('aria-selected', editing ? 'true' : 'false');
        previewTab.attr('aria-selected', editing ? 'false' : 'true');
        editor.toggle(editing);
        preview.toggle(!editing);
        if (!editing) renderPreview();
    }
    function closePicker() {
        folderRequestId++;
        picker.hide();
    }
    function browse(relative) {
        var id = ++folderRequestId;
        browsing = relative;
        pickerPathText.text(folderName(relative));
        up.prop('disabled', !relative);
        choose.prop('disabled', true);
        pickerList.empty().append($('<div class="alw-picker-muted"></div>').text('正在读取当前账号可访问的文件夹……'));
        request('writerFolders', {folder:relative}, function (data) {
            if (id !== folderRequestId) return;
            browsing = String(data.folder || '');
            pickerPathText.text(folderName(browsing));
            up.prop('disabled', !browsing);
            choose.prop('disabled', false);
            pickerList.empty();
            var items = Array.isArray(data.folders) ? data.folders : [];
            if (!items.length) {
                $('<div class="alw-picker-muted"></div>').text('这个文件夹没有下级目录。您可以直接点击下方“使用此文件夹”。').appendTo(pickerList);
            }
            items.forEach(function (item) {
                if (!item || typeof item.folder !== 'string') return;
                var row = $('<button type="button" class="alw-picker-row"></button>').appendTo(pickerList);
                $('<span></span>').text('📁 ' + String(item.name || '')).appendTo(row);
                $('<span aria-hidden="true">›</span>').appendTo(row);
                row.on('click', function () { browse(item.folder); });
            });
        }, function (error) {
            if (id !== folderRequestId) return;
            pickerList.empty().append($('<div class="alw-picker-muted"></div>').text('无法读取文件夹：' + error));
        });
    }
    function openPicker() {
        picker.css('display', 'flex');
        // The default AI草稿 directory may not exist yet; only create it on save.
        browse(chosenFromPicker ? selected : '');
    }
    function openSaved() {
        if (!lastRoute || !/^#fileView&path=.{1,4900}$/.test(lastRoute)) return;
        var url = new URL(lastRoute, window.location.href);
        if (url.origin === window.location.origin) window.open(url.href, '_blank', 'noopener');
    }

    trigger.on('click', function () { overlay.css('display','flex'); title.trigger('focus'); });
    close.on('click', function () { overlay.hide(); closePicker(); });
    overlay.on('click', function (event) { if (event.target === overlay[0]) overlay.hide(); });
    editTab.on('click', function () { showTab('edit'); editor.trigger('focus'); });
    previewTab.on('click', function () { showTab('preview'); });
    editor.on('input', function () {
        countChars();
        if (lastRoute) { lastRoute = ''; open.hide(); }
    });
    folderButton.on('click', openPicker);
    pickerClose.on('click', closePicker);
    picker.on('click', function (event) { if (event.target === picker[0]) closePicker(); });
    up.on('click', function () {
        if (!browsing) return;
        var parts = browsing.split('/');
        parts.pop();
        browse(parts.join('/'));
    });
    choose.on('click', function () {
        if (choose.prop('disabled')) return;
        selected = browsing;
        chosenFromPicker = true;
        updateFolder();
        closePicker();
        info('保存位置已选择：' + folderName(selected));
    });
    $(document).on('keydown.airaglite-writer', function (event) {
        if (event.key !== 'Escape') return;
        if (picker.is(':visible')) closePicker();
        else if (overlay.is(':visible')) overlay.hide();
    });

    generate.on('click', function () {
        var topic = String(title.val() || '').trim();
        if (topic.length < 2) { info('请输入至少两个字符的文档主题。', true); title.trigger('focus'); return; }
        var id = ++generationId;
        generate.prop('disabled',true).text('正在生成……');
        info('AI 正在生成草稿，完成后会自动展示预览。');
        var watchdog = window.setTimeout(function () {
            if (id !== generationId) return;
            generationId++;
            generate.prop('disabled',false).text('重新生成草稿');
            info('生成超时，请检查 RAG API 或重试。', true);
        }, 185000);
        request('draft', {
            topic:topic, requirements:String(req.val() || ''),
            use_sources:useSources.prop('checked') ? '1' : '0'
        }, function (data) {
            if (id !== generationId) return;
            window.clearTimeout(watchdog);
            generate.prop('disabled',false).text('重新生成草稿');
            editor.val(String(data.content || ''));
            countChars();
            lastRoute = '';
            open.hide();
            var sources = Array.isArray(data.sources) ? data.sources : [];
            var note = String(data.source_note || (useSources.prop('checked') ? '未检索到引用' : '未启用知识库参考'));
            refsText.text('参考范围：' + note +
                (sources.length ? '\n' + sources.map(function (item) {
                    return '[' + String(item.id) + '] ' + String(item.path || '') + ' · ' + String(item.location || '');
                }).join('\n') : ''));
            refs.show().prop('open',false);
            showTab('preview');
            info('草稿已生成。可以切换“编辑正文”修改，检查后再保存。');
        }, function (error) {
            if (id !== generationId) return;
            window.clearTimeout(watchdog);
            generate.prop('disabled',false).text('重新生成草稿');
            info(error,true);
        });
    });

    save.on('click', function () {
        var topic = String(title.val() || '').trim();
        var content = String(editor.val() || '');
        if (topic.length < 2 || !content.trim()) {
            info('请先填写主题，并生成或输入正文。',true);
            return;
        }
        if (content.length > 50000) { info('正文超过 50000 字符限制。',true); return; }
        var id = ++saveId;
        save.prop('disabled',true).text('正在保存……');
        info('正在保存到：' + folderName(selected));
        var watchdog = window.setTimeout(function () {
            if (id !== saveId) return;
            saveId++;
            save.prop('disabled',false).text('保存新文档');
            info('保存请求超时。请先检查目标文件夹，避免重复创建。',true);
        }, 65000);
        request('saveDraft', {title:topic, content:content, format:format.val(), folder:selected}, function (data) {
            if (id !== saveId) return;
            window.clearTimeout(watchdog);
            save.prop('disabled',false).text('保存新文档');
            lastRoute = /^#fileView&path=.{1,4900}$/.test(String(data.route || '')) ? String(data.route) : '';
            open.toggle(!!lastRoute);
            info('保存成功：' + String(data.name || '新文档') + '。未覆盖已有文件。');
        }, function (error) {
            if (id !== saveId) return;
            window.clearTimeout(watchdog);
            save.prop('disabled',false).text('保存新文档');
            info(error,true);
        });
    });
    open.on('click', openSaved);

    updateFolder();
    countChars();
    showTab('preview');
});
