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
      '#airaglite-writer-body{display:grid;grid-template-columns:minmax(0,var(--alw-sidebar-width,330px)) 12px minmax(0,1fr);flex:1;min-height:0;overflow:hidden}',
      '.alw-sidebar{min-width:0;min-height:0;overflow-y:auto;padding:20px;background:#f8fafc}',
      '.alw-width-tools{margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
      '.alw-width-tools button{background:#f8fafc;border:1px solid #cbd5e1;color:#334155;padding:6px 9px;border-radius:6px;font-size:12px;white-space:nowrap}',
      '.alw-width-tools button:hover{background:#eaf3ff;color:#1754ac;border-color:#93b6e4}',
      '#airaglite-writer-splitter{position:relative;cursor:col-resize;touch-action:none;background:#e2e8f0;outline-offset:-3px;z-index:2}',
      '#airaglite-writer-splitter::before{content:"";position:absolute;left:5px;top:calc(50% - 28px);width:2px;height:56px;background:#94a3b8;border-radius:4px}',
      '#airaglite-writer-splitter:hover,#airaglite-writer-splitter:focus-visible{background:#bfd7f3}',
      '#airaglite-writer-splitter:hover::before,#airaglite-writer-splitter:focus-visible::before{background:#2563eb}',
      '#airaglite-writer-dialog.alw-dragging,#airaglite-writer-dialog.alw-dragging *{cursor:col-resize!important;user-select:none!important}',
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
      '.alw-import-card{border:1px solid #d9e6f6;background:#fff;border-radius:9px;padding:11px;margin:0 0 18px}',
      '.alw-import-card .alw-secondary{width:100%;font-weight:650;text-align:left}',
      '#airaglite-writer-imported{font-size:12px;color:#475569;margin-top:8px;line-height:1.6;overflow-wrap:anywhere}',
      '.alw-revise-controls{margin:12px 0 18px;padding:13px;border:1px solid #d9e6f6;background:#fff;border-radius:9px}',
      '.alw-revise-controls textarea{width:100%;min-height:94px;max-height:180px;resize:vertical;padding:9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;line-height:1.5;color:#334155}',
      '.alw-revise-controls select{width:100%;min-height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:6px;margin:8px 0;background:#fff;color:#334155}',
      '.alw-revise-controls .alw-primary{width:100%}',
      '.alw-revise-controls p{color:#64748b;font-size:12px;line-height:1.5;margin:8px 0 0}',
      '.alw-review{width:100%;height:100%;display:none;flex-direction:column;min-height:0;overflow:hidden}',
      '.alw-review-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);flex:1;min-height:0;overflow:hidden}',
      '.alw-review-pane{display:flex;flex-direction:column;min-width:0;min-height:0;border-right:1px solid #e2e8f0;overflow:hidden}',
      '.alw-review-pane strong{padding:10px 12px;display:block;background:#f1f5f9;border-bottom:1px solid #e2e8f0}',
      '.alw-review-pane pre{margin:0;min-height:0;flex:1;padding:14px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,Consolas,monospace}',
      '.alw-review-pane pre span{display:block;min-height:1.65em}',
      '.alw-diff-removed{background:#fee2e2}',
      '.alw-diff-added{background:#dcfce7}',
      '.alw-review-footer{flex:0 0 auto;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap}',
      '.alw-review-help{margin-right:auto;color:#64748b;font-size:12px}',
      '#airaglite-writer-undo{white-space:nowrap}',
      '@media(max-width:700px){.alw-review-columns{display:block;overflow:auto}.alw-review-pane{min-height:220px;height:50%;overflow:hidden}.alw-review-pane pre{min-height:150px}}',
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
      '@media(max-width:850px){#airaglite-writer-dialog{width:96vw;height:94vh;max-height:94vh}#airaglite-writer-body{display:block;overflow-y:auto}.alw-sidebar{overflow:visible;border-right:0;border-bottom:1px solid #e2e8f0}.alw-width-tools,#airaglite-writer-splitter{display:none}.alw-workspace{height:440px;min-height:350px}.alw-document{min-height:0}}',
      '@media(max-width:560px){#airaglite-writer-overlay{padding:4px}#airaglite-writer-dialog{width:100vw;height:98vh;max-height:98vh;border-radius:8px}.alw-header{padding:12px}.alw-workspace-top{padding:9px 12px}#airaglite-writer-preview{padding:15px}.alw-footer{padding:10px 12px;align-items:stretch;flex-direction:column}.alw-footer-actions{justify-content:space-between}.alw-footer-actions .alw-primary{flex:1}.alw-sidebar{padding:15px}}'
    ].join('\n');
    $('<style id="airaglite-writer-styles"></style>').text(css).appendTo('head');

    // Keep the launcher alongside the existing search dialog title.
    var trigger = $('<button type="button" id="airaglite-writer-open">📄 文档编辑</button>')
      .css({marginLeft:'auto',marginRight:'12px',border:'1px solid #cbd5e1',padding:'5px 10px',
            borderRadius:'6px',background:'#fff',color:'#1754ac'})
      .insertBefore('#airaglite-close');

    var overlay = $('<div id="airaglite-writer-overlay"></div>').appendTo('body');
    var dialog = $('<div id="airaglite-writer-dialog" role="dialog" aria-modal="true" aria-labelledby="airaglite-writer-heading"></div>').appendTo(overlay);
    var header = $('<div class="alw-header"></div>').appendTo(dialog);
    var heading = $('<div class="alw-heading"></div>').appendTo(header);
    $('<strong id="airaglite-writer-heading"></strong>').text('文档编辑器（高级工具）').appendTo(heading);
    $('<span class="alw-muted"></span>').text('打开已有文档 · 按要求修改 · 对比确认 · 保存新版本').appendTo(heading);
var widthTools = $('<div class="alw-width-tools" role="group" aria-label="左右栏宽度"></div>').appendTo(header);
    var leftWide = $('<button type="button" id="airaglite-writer-left-wide" title="加宽左侧写作设置">左侧更宽</button>').appendTo(widthTools);
    var rightWide = $('<button type="button" id="airaglite-writer-right-wide" title="加宽右侧编辑或预览区">右侧更宽</button>').appendTo(widthTools);
    var resetWide = $('<button type="button" id="airaglite-writer-reset-wide" title="恢复默认宽度">恢复默认</button>').appendTo(widthTools);
    var toAssistant = $('<button type="button" class="alw-secondary" id="airaglite-writer-back-to-assistant">← 返回 AI 助手</button>').appendTo(header);
    var close = $('<button type="button" class="alw-close">关闭</button>').appendTo(header);

    var body = $('<div id="airaglite-writer-body"></div>').appendTo(dialog);
    var sidebar = $('<section class="alw-sidebar" aria-label="写作设置"></section>').appendTo(body);
    var splitter = $('<div id="airaglite-writer-splitter" role="separator" tabindex="0" aria-orientation="vertical" aria-label="拖动调整左右栏宽度" aria-valuemin="20" aria-valuemax="75" aria-valuenow="30" title="左右拖动调整宽度；方向键微调，双击恢复默认"></div>').appendTo(body);
    var workspace = $('<section class="alw-workspace" aria-label="文档编辑与预览"></section>').appendTo(body);

    var importCard = $('<div class="alw-import-card"></div>').appendTo(sidebar);
    var openExisting = $('<button type="button" id="airaglite-writer-open-existing" class="alw-secondary">📂 打开 KodBox 已有文章</button>').appendTo(importCard);
    var importedInfo = $('<div id="airaglite-writer-imported" aria-live="polite"></div>')
      .text('未加载已有文件，可以直接新建文章。').appendTo(importCard);

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
    var reviseControls = $('<section class="alw-revise-controls" aria-label="按要求修改文章"></section>').appendTo(sidebar);
    $('<div class="alw-label">按要求修改文章</div>').appendTo(reviseControls);
    var instructions = $('<textarea id="airaglite-writer-instructions" maxlength="2000" placeholder="例如：删掉重复内容；补充风险和回滚步骤；保留已有技术参数。"></textarea>').appendTo(reviseControls);
    var scope = $('<select id="airaglite-writer-revise-scope" aria-label="修改范围"><option value="full">修改全文</option><option value="selection">仅修改选中段落</option></select>').appendTo(reviseControls);
    var revise = $('<button type="button" class="alw-primary" id="airaglite-writer-revise">AI 修改并对比</button>').appendTo(reviseControls);
    $('<p>选段落修改时，先进入右侧「编辑正文」并选中文字。AI 的建议不会自动覆盖正文。</p>').appendTo(reviseControls);

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
    var reviewTab = $('<button type="button" class="alw-tab" role="tab" aria-controls="airaglite-writer-review">AI 修改对比</button>').hide().appendTo(tabGroup);
    var undo = $('<button type="button" class="alw-secondary" id="airaglite-writer-undo">撤销上次 AI 修改</button>').hide().appendTo(workspaceTop);
    var counter = $('<span class="alw-muted" id="airaglite-writer-count"></span>').appendTo(workspaceTop);
    var documentArea = $('<div class="alw-document"></div>').appendTo(workspace);
    var editor = $('<textarea id="airaglite-writer-editor" maxlength="50000" aria-label="文档正文 Markdown" placeholder="可以在这里编辑 AI 生成的草稿，也可以自己输入 Markdown。"></textarea>').appendTo(documentArea);
    var preview = $('<div id="airaglite-writer-preview" role="tabpanel" aria-label="文档排版预览"></div>').appendTo(documentArea);

    var review = $('<div id="airaglite-writer-review" class="alw-review" role="tabpanel" aria-label="AI 修改对比"></div>').appendTo(documentArea);
    var reviewColumns = $('<div class="alw-review-columns"></div>').appendTo(review);
    var beforeBox = $('<div class="alw-review-pane"></div>').appendTo(reviewColumns);
    $('<strong>修改前</strong>').appendTo(beforeBox);
    var beforePre = $('<pre id="airaglite-writer-review-before"></pre>').appendTo(beforeBox);
    var afterBox = $('<div class="alw-review-pane"></div>').appendTo(reviewColumns);
    $('<strong>AI 建议稿</strong>').appendTo(afterBox);
    var afterPre = $('<pre id="airaglite-writer-review-after"></pre>').appendTo(afterBox);
    var reviewFooter = $('<div class="alw-review-footer"></div>').appendTo(review);
    $('<span class="alw-review-help">红色表示删除或修改前内容，绿色表示新增或修改后内容。</span>').appendTo(reviewFooter);
    var discard = $('<button type="button" class="alw-secondary" id="airaglite-writer-discard-revision">放弃本次修改</button>').appendTo(reviewFooter);
    var apply = $('<button type="button" class="alw-primary" id="airaglite-writer-apply-revision">应用到编辑区（尚未保存）</button>').appendTo(reviewFooter);


    var footer = $('<div class="alw-footer"></div>').appendTo(dialog);
    var message = $('<span id="airaglite-writer-message" role="status" aria-live="polite"></span>').appendTo(footer);
    var footerActions = $('<div class="alw-footer-actions"></div>').appendTo(footer);
    $('<label for="airaglite-writer-format">保存格式</label>').appendTo(footerActions);
    var format = $('<select id="airaglite-writer-format"><option value="md">Markdown (.md)</option><option value="docx">Word (.docx)</option></select>').appendTo(footerActions);
    var open = $('<button type="button" class="alw-secondary" id="airaglite-writer-open-saved">打开已保存文件</button>').hide().appendTo(footerActions);
    var save = $('<button type="button" class="alw-primary" id="airaglite-writer-save">保存新文档</button>').appendTo(footerActions);
    var overwrite = $('<button type="button" class="alw-secondary" id="airaglite-writer-overwrite">备份并更新原文件</button>').hide().appendTo(footerActions);

    // Dedicated folder chooser: browsing is not the same as choosing a folder.
    var picker = $('<div id="airaglite-writer-picker"></div>').appendTo('body');
    var pickerDialog = $('<div class="alw-picker-dialog" role="dialog" aria-modal="true" aria-label="选择保存文件夹"></div>').appendTo(picker);
    var pickerHead = $('<div class="alw-picker-header"></div>').appendTo(pickerDialog);
    var pickerTitle = $('<strong>选择保存文件夹</strong>').appendTo(pickerHead);
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
    var loadedDoc = null;
    var pendingRevision = null;
    var lastUndo = null;
    var revisionId = 0;
    var pickerMode = 'save';
    var leftWidth = 330;
    var dragging = false;
    var dragStartX = 0;
    var dragStartWidth = 330;
    var dragPointer = null;

    function desktopLayout() {
        return window.innerWidth > 850;
    }
    function paneBounds() {
        var rect = body[0].getBoundingClientRect();
        var width = rect.width;
        return {width:width, min:260, max:Math.max(260, width - 12 - 320)};
    }
    function setPaneWidth(px) {
        if (!desktopLayout()) return;
        var bounds = paneBounds();
        if (!bounds.width) return;
        leftWidth = Math.max(bounds.min, Math.min(bounds.max, Math.round(px)));
        body[0].style.setProperty('--alw-sidebar-width', leftWidth + 'px');
        var available = bounds.width - 12;
        splitter.attr({
            'aria-valuemin':String(Math.round(100 * bounds.min / available)),
            'aria-valuemax':String(Math.round(100 * bounds.max / available)),
            'aria-valuenow':String(Math.round(100 * leftWidth / available)),
            'aria-valuetext':'左侧 ' + Math.round(100 * leftWidth / available) + '%'
        });
    }
    function finishDrag() {
        if (!dragging) return;
        dragging = false;
        dragPointer = null;
        dialog.removeClass('alw-dragging');
    }
    function startDrag(event) {
        if (!desktopLayout() || (typeof event.button === 'number' && event.button !== 0)) return;
        var bounds = paneBounds();
        if (!bounds.width) return;
        setPaneWidth(leftWidth);
        dragging = true;
        dragStartX = event.clientX;
        dragStartWidth = leftWidth;
        dragPointer = event.pointerId;
        dialog.addClass('alw-dragging');
        if (typeof splitter[0].setPointerCapture === 'function' && typeof event.pointerId === 'number') {
            try { splitter[0].setPointerCapture(event.pointerId); } catch (ignored) {}
        }
        event.preventDefault();
    }
    function moveDrag(event) {
        if (!dragging || (dragPointer != null && event.pointerId != null && event.pointerId !== dragPointer)) return;
        setPaneWidth(dragStartWidth + event.clientX - dragStartX);
    }
    splitter[0].addEventListener('pointerdown', startDrag);
    document.addEventListener('pointermove', moveDrag);
    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);
    window.addEventListener('blur', finishDrag);
    splitter.on('dblclick', function () { setPaneWidth(330); });
    splitter.on('keydown', function (event) {
        var bounds = paneBounds();
        var step = event.shiftKey ? 60 : 20;
        var next = leftWidth;
        if (event.key === 'ArrowLeft') next -= step;
        else if (event.key === 'ArrowRight') next += step;
        else if (event.key === 'Home') next = bounds.min;
        else if (event.key === 'End') next = bounds.max;
        else return;
        event.preventDefault();
        setPaneWidth(next);
    });
    leftWide.on('click', function () { setPaneWidth(paneBounds().width * .54); });
    rightWide.on('click', function () { setPaneWidth(paneBounds().width * .27); });
    resetWide.on('click', function () { setPaneWidth(330); });
    $(window).on('resize.airaglite-writer', function () {
        finishDrag();
        if (overlay.is(':visible')) setPaneWidth(leftWidth);
    });

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
        var editing=mode==='edit', reviewing=mode==='review';
        editTab.attr('aria-selected', editing ? 'true' : 'false');
        previewTab.attr('aria-selected', !editing && !reviewing ? 'true' : 'false');
        reviewTab.attr('aria-selected', reviewing ? 'true' : 'false');
        editor.toggle(editing);
        preview.toggle(!editing && !reviewing);
        review.css('display', reviewing ? 'flex' : 'none');
        if (!editing && !reviewing) renderPreview();
    }
    function clearRevision() {
        pendingRevision=null;
        reviewTab.hide();
        if (reviewTab.attr('aria-selected')==='true') showTab('edit');
    }
    function renderLineDiff(oldText,newText) {
        var a=String(oldText).split('\n'),b=String(newText).split('\n');
        var oldEqual=new Array(a.length).fill(false);
        var newEqual=new Array(b.length).fill(false);
        // Restrict quadratic comparison work for lengthy drafts.
        if (a.length*b.length<=65000) {
            var matrix=new Array(a.length+1);
            for (var k=0;k<=a.length;k++) matrix[k]=new Uint16Array(b.length+1);
            for (var i=a.length-1;i>=0;i--) {
                for (var j=b.length-1;j>=0;j--) {
                    matrix[i][j]=(a[i]===b[j])?matrix[i+1][j+1]+1:
                        Math.max(matrix[i+1][j],matrix[i][j+1]);
                }
            }
            var x=0,y=0;
            while (x<a.length && y<b.length) {
                if (a[x]===b[y]) {oldEqual[x]=true;newEqual[y]=true;x++;y++;}
                else if (matrix[x+1][y]>=matrix[x][y+1]) x++;
                else y++;
            }
        }
        function fill($target,lines,same,cls) {
            $target.empty();
            lines.forEach(function (line,i) {
                $('<span></span>').text(line===''?' ':line).toggleClass(cls,!same[i]).appendTo($target);
            });
        }
        fill(beforePre,a,oldEqual,'alw-diff-removed');
        fill(afterPre,b,newEqual,'alw-diff-added');
    }
    function loadedLabel() {
        if (!loadedDoc) {
            importedInfo.text('未加载已有文件，可以直接新建文章。');
            save.text('保存新文档');
            overwrite.hide();
            return;
        }
        importedInfo.text('正在修改：'+loadedDoc.name+'\n位置：'+folderName(loadedDoc.folder)+
            (loadedDoc.format==='docx' ? '\nWord 复杂排版可能丢失，仅支持另存新版本。' : '\n可另存新版本，或先备份再更新原文件。'))
            .css('white-space','pre-wrap');
        save.text('另存为新版本');
        overwrite.toggle(loadedDoc.format!=='docx');
    }
    function setEditorContent(value) {
        editor.val(String(value || ''));
        countChars();
        lastRoute='';
        open.hide();
        clearRevision();
        lastUndo=null;
        undo.hide();
    }
    function loadExistingDocument(relative,name,suggestedText) {
        // Never overwrite unsaved in-browser text without the user's consent.
        if (String(editor.val()||'').trim() &&
            !window.confirm('打开另一篇文章会替换当前编辑区内容（尚未保存的修改会丢失）。确定继续？'))
            return;
        pickerList.empty().append($('<div class="alw-picker-muted"></div>').text('正在读取原文件……'));
        request('writerRead',{folder:relative,name:name},function (data) {
            if (!data || typeof data.content!=='string' || data.content.length>50000 ||
                !/^[a-f0-9]{64}$/.test(String(data.hash||''))) {
                pickerList.empty().text('文件返回内容无效，请检查服务端日志。');
                return;
            }
            loadedDoc={
                folder:String(data.folder||''),name:String(data.name||name),
                format:String(data.format||'md'),hash:String(data.hash)
            };
            title.val(String(data.title||name).slice(0,160));
            setEditorContent(data.content);
            selected=loadedDoc.folder;
            chosenFromPicker=true;
            updateFolder();
            loadedLabel();
            if (loadedDoc.format==='docx') format.val('docx');
            else format.val('md');
            refs.hide();
            closePicker();
            // Suggestions from the chat assistant are REVIEW-ONLY: do not
            // replace the editor content, hash, or KodBox file until confirmed.
            if (typeof suggestedText==='string' && suggestedText.trim() &&
                suggestedText.length<=50000 && suggestedText!==data.content) {
                pendingRevision={originalText:data.content,from:0,to:data.content.length,
                    old:data.content,newText:suggestedText};
                renderLineDiff(data.content,suggestedText);
                reviewTab.show();
                showTab('review');
                info('AI 修改建议已载入，请先对比前后内容。点击“应用到编辑区”才会更改本地草稿。');
            } else {
                showTab('preview');
                info(String(data.note||'已加载原文，请填写“按要求修改文章”。'));
            }
        },function (err) {
            info('打开原文件失败：'+err,true);
            pickerList.empty().append($('<div class="alw-picker-muted"></div>').text('打开失败：'+err));
        });
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
            if (pickerMode==='open') {
                var files=Array.isArray(data.files)?data.files:[];
                if (files.length) {
                    $('<div class="alw-picker-muted"></div>').text('点击已有文章即可打开（Markdown / TXT / Word）：').appendTo(pickerList);
                    files.forEach(function (item) {
                        if (!item || typeof item.name!=='string') return;
                        var name=item.name,relative=browsing;
                        var row=$('<button type="button" class="alw-picker-row"></button>').appendTo(pickerList);
                        $('<span></span>').text('📄 '+name).appendTo(row);
                        $('<span aria-hidden="true">打开</span>').appendTo(row);
                        row.on('click',function(){loadExistingDocument(relative,name);});
                    });
                } else if (!items.length) {
                    $('<div class="alw-picker-muted"></div>').text('这里没有可打开的文章。请返回上一级文件夹。').appendTo(pickerList);
                }
            }
        }, function (error) {
            if (id !== folderRequestId) return;
            pickerList.empty().append($('<div class="alw-picker-muted"></div>').text('无法读取文件夹：' + error));
        });
    }
    function openPicker(mode) {
        pickerMode=mode==='open'?'open':'save';
        pickerTitle.text(pickerMode==='open'?'打开 KodBox 已有文章':'选择保存文件夹');
        choose.toggle(pickerMode==='save');
        picker.css('display','flex');
        if (pickerMode==='open') {
            browse(loadedDoc ? loadedDoc.folder : (chosenFromPicker ? selected : ''));
        } else {
            browse(chosenFromPicker ? selected : '');
        }
    }
    function openSaved() {
        if (!lastRoute || !/^#fileView&path=.{1,4900}$/.test(lastRoute)) return;
        var url = new URL(lastRoute, window.location.href);
        if (url.origin === window.location.origin) window.open(url.href, '_blank', 'noopener');
    }

    trigger.on('click', function () { overlay.css('display','flex'); setPaneWidth(leftWidth); title.trigger('focus'); });
    toAssistant.on('click', function () {
        finishDrag();overlay.hide();closePicker();
        if (loadedDoc && typeof window.aiRagLiteSetActiveDocument==='function')
            window.aiRagLiteSetActiveDocument(loadedDoc.folder,loadedDoc.name);
        if (typeof window.aiRagLiteOpenAssistant==='function')
            window.aiRagLiteOpenAssistant();
    });
    close.on('click', function () { finishDrag(); overlay.hide(); closePicker(); });
    overlay.on('click', function (event) { if (event.target === overlay[0]) { finishDrag(); overlay.hide(); } });
    editTab.on('click', function () { showTab('edit'); editor.trigger('focus'); });
    previewTab.on('click', function () { showTab('preview'); });
    reviewTab.on('click', function () { if (pendingRevision) showTab('review'); });
    editor.on('input', function () {
        countChars();
        if (lastRoute) { lastRoute = ''; open.hide(); }
        clearRevision();
        lastUndo=null;
        undo.hide();
    });
    folderButton.on('click', function () { openPicker('save'); });
    openExisting.on('click', function () { openPicker('open'); });
    pickerClose.on('click', closePicker);
    picker.on('click', function (event) { if (event.target === picker[0]) closePicker(); });
    up.on('click', function () {
        if (!browsing) return;
        var parts = browsing.split('/');
        parts.pop();
        browse(parts.join('/'));
    });
    choose.on('click', function () {
        if (pickerMode!=='save' || choose.prop('disabled')) return;
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

    revise.on('click',function () {
        var current=String(editor.val()||'');
        var ask=String(instructions.val()||'').trim();
        if (!current.trim()) {info('请先打开已有文章，或生成/输入一份草稿。',true);return;}
        if (ask.length<2) {info('请输入具体的 AI 修改要求。',true);instructions.trigger('focus');return;}
        var mode=String(scope.val()||'full');
        var from=0,to=current.length;
        if (mode==='selection') {
            from=editor[0].selectionStart;
            to=editor[0].selectionEnd;
            if (typeof from!=='number' || typeof to!=='number' || to<=from) {
                info('请先在右侧“编辑正文”中选中文字，再选择“仅修改选中段落”。',true);
                showTab('edit');
                return;
            }
        }
        var fragment=current.slice(from,to);
        if (!fragment.trim()) {info('选中的文字为空。',true);return;}
        if (fragment.length>14000) {
            info('本次 AI 修改最多支持 14000 字符，请选中较短的段落分批修改。',true);
            return;
        }
        var id=++revisionId;
        revise.prop('disabled',true).text('AI 正在修改……');
        info(mode==='selection'?'正在按要求修改选中段落……':'正在按要求修改全文……');
        var watchdog=window.setTimeout(function () {
            if(id!==revisionId)return;
            ++revisionId;
            revise.prop('disabled',false).text('AI 修改并对比');
            info('AI 修改请求超时；正文未改变。',true);
        },185000);
        request('reviseDraft',{content:fragment,instructions:ask,scope:mode},function(data){
            if(id!==revisionId)return;
            window.clearTimeout(watchdog);
            revise.prop('disabled',false).text('AI 修改并对比');
            if(String(editor.val()||'')!==current){info('等待 AI 期间正文发生变化，修改建议没有应用，请重新提交。',true);return;}
            var proposed=String(data.content||'');
            if (!proposed.trim() || proposed.length>50000 ||
                current.length-(to-from)+proposed.length>50000) {
                info('AI 返回的修改结果无效或正文超过 50000 字符上限。',true);return;
            }
            pendingRevision={originalText:current,from:from,to:to,old:fragment,newText:proposed};
            renderLineDiff(fragment,proposed);
            reviewTab.show();
            showTab('review');
            info('请对比红/绿标记；点击“应用到编辑区”才修改草稿，随后仍需手动保存。');
        },function(error){
            if(id!==revisionId)return;
            window.clearTimeout(watchdog);
            revise.prop('disabled',false).text('AI 修改并对比');
            info(error,true);
        });
    });

    apply.on('click',function () {
        if(!pendingRevision)return;
        var p=pendingRevision;
        if(String(editor.val()||'')!==p.originalText){
            info('正文已改变，本次 AI 修改建议已过期，请重新修改。',true);
            clearRevision();
            return;
        }
        var next=p.originalText.slice(0,p.from)+p.newText+p.originalText.slice(p.to);
        if(next.length>50000){info('应用后文章长度超过限制。',true);return;}
        lastUndo={before:p.originalText,after:next};
        editor.val(next);
        countChars();
        lastRoute='';
        open.hide();
        clearRevision();
        undo.show();
        showTab('preview');
        info('AI 修改已应用到编辑区，还没有保存到 KodBox。可撤销或继续修改。');
    });
    discard.on('click',function () {
        clearRevision();
        showTab('edit');
        info('已放弃 AI 修改建议，原文保持不变。');
    });
    undo.on('click',function () {
        if(!lastUndo)return;
        if(String(editor.val()||'')!==lastUndo.after){
            info('正文已经再次改变，为避免丢失内容，不能自动撤销。',true);
            return;
        }
        editor.val(lastUndo.before);
        lastUndo=null;
        undo.hide();
        countChars();
        showTab('preview');
        info('已撤销上次 AI 修改（仅浏览器草稿，未改动原文件）。');
    });

    overwrite.on('click',function () {
        if(!loadedDoc || loadedDoc.format==='docx'){
            info('请先打开 Markdown 或 TXT 原文；Word 只支持另存新版本。',true);
            return;
        }
        var content=String(editor.val()||'');
        if(!content.trim()){info('正文为空，不能覆盖原文件。',true);return;}
        var destination=folderName(loadedDoc.folder)+' / '+loadedDoc.name;
        if(!window.confirm('即将更新原文件：\n'+destination+
            '\n\n插件会先在同目录创建带时间戳的原文备份，再修改原文件。确定继续？'))
            return;
        overwrite.prop('disabled',true).text('正在备份并更新……');
        info('正在检查原文是否变化并创建备份……');
        var id=++saveId;
        var watchdog=window.setTimeout(function(){
            if(id!==saveId)return;
            ++saveId;
            overwrite.prop('disabled',false).text('备份并更新原文件');
            info('更新操作超时。请先检查原文件和备份，避免重复执行。',true);
        },65000);
        request('writerOverwrite',{
            folder:loadedDoc.folder,name:loadedDoc.name,hash:loadedDoc.hash,
            content:content,confirm:'backup-and-overwrite'
        },function(data){
            if(id!==saveId)return;
            window.clearTimeout(watchdog);
            overwrite.prop('disabled',false).text('备份并更新原文件');
            if (data && typeof data.hash==='string') loadedDoc.hash=data.hash;
            lastRoute=/^#fileView&path=.{1,4900}$/.test(String(data.route||''))?String(data.route):'';
            open.toggle(!!lastRoute);
            info('原文已更新，修改前备份：'+String(data.backup||'请检查原目录'));
        },function(error){
            if(id!==saveId)return;
            window.clearTimeout(watchdog);
            overwrite.prop('disabled',false).text('备份并更新原文件');
            info(error,true);
        });
    });

    generate.on('click', function () {
        var topic = String(title.val() || '').trim();
        if (topic.length < 2) { info('请输入至少两个字符的文档主题。', true); title.trigger('focus'); return; }
        if(String(editor.val()||'').trim() && !window.confirm('重新生成将清空当前编辑区内容，尚未保存的修改会丢失。确定继续？'))return;
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
            setEditorContent(String(data.content || ''));
            loadedDoc=null;
            loadedLabel();
            countChars();
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
            save.prop('disabled',false).text(loadedDoc ? '另存为新版本' : '保存新文档');
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

    // Explicit hand-off from conversational assistant to the existing editor.
    // No file is written by these entry points.
    window.aiRagLiteOpenWriterRevision=function(relative,name,suggestion){
        if (typeof relative!=='string' || typeof name!=='string' ||
            typeof suggestion!=='string' || suggestion.length>50000) return;
        overlay.css('display','flex');
        loadExistingDocument(relative,name,suggestion);
    };
    window.aiRagLiteOpenWriterDraft=function(draftTitle,draftBody){
        if (typeof draftBody!=='string' || !draftBody.trim() || draftBody.length>50000) return;
        if (String(editor.val()||'').trim() &&
            !window.confirm('打开 AI 新草稿会替换当前浏览器编辑区，未保存内容会丢失。继续？')) return;
        overlay.css('display','flex');
        title.val(String(draftTitle||'AI 新文档').slice(0,160));
        loadedDoc=null;
        setEditorContent(draftBody);
        loadedLabel();
        format.val('md');
        showTab('preview');
        info('草稿来自 AI 对话。请检查内容，确认后才会保存到 KodBox。');
    };

    updateFolder();
    loadedLabel();
    countChars();
    showTab('preview');
});
