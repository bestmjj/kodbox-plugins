kodReady.push(function () {
    // Render the launcher independently of kodApi: KodBox may expose it later.
    // The PHP hook already restricts this script to administrator sessions.
    var jq = window.jQuery || window.$;
    window.aiRagLiteDebug = {version:'0.3.5', stage:'start', jquery:!!jq, kodApi:!!window.kodApi};
    if (!jq) {
        window.aiRagLiteDebug.stage = 'no-jquery';
        return;
    }
    var $ = jq;
    if ($('#airaglite-open').length) return;
    var css = '' +
      '#airaglite-open-message{display:none;margin:0 22px 9px;padding:10px 12px;border-radius:6px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;font-size:13px;line-height:1.5;overflow-wrap:anywhere}' +
      '#airaglite-open{position:fixed;right:23px;bottom:28px;z-index:9801;border:0;padding:10px 16px;border-radius:24px;background:#2368d6;color:white;box-shadow:0 4px 18px #0002;cursor:pointer;font-size:14px}' +
      '#airaglite-overlay{position:fixed;inset:0;background:#0008;z-index:9900;display:none;align-items:center;justify-content:center}' +
      '#airaglite-dialog{background:white;color:#263247;width:min(800px,94vw);max-height:85vh;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 12px 48px #0003}' +
      '#airaglite-header{padding:18px 22px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;font-size:18px;font-weight:600}' +
      '#airaglite-form{display:flex;gap:8px;padding:14px 22px;flex-wrap:wrap}' +
      '#airaglite-query{flex:1;min-width:170px;padding:9px;border:1px solid #ccc;border-radius:6px;color:#222}' +
      '#airaglite-go{padding:8px 18px;background:#2368d6;border:0;color:white;border-radius:6px;cursor:pointer}' +
      '#airaglite-results{overflow-y:auto;padding:8px 22px 20px;min-height:100px}' +
      '.airaglite-item{padding:13px 2px;border-bottom:1px solid #eee}' +
      '.airaglite-path{font-size:12px;color:#64748b;word-break:break-all;margin:5px 0}' +
      '.airaglite-snippet{white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.6}' +
      '.airaglite-copy{margin-left:10px;border:1px solid #ccc;border-radius:4px;background:white;color:#333;cursor:pointer}' +
      '#airaglite-close{border:0;background:none;font-size:22px;cursor:pointer;color:#666}' +
      '#airaglite-answer{white-space:normal;overflow-wrap:anywhere;background:#eff6ff;border-left:3px solid #2368d6;border-radius:4px;padding:14px 16px;margin:12px 0;font-size:14px;line-height:1.75}' +
      '#airaglite-answer p{margin:0 0 12px}#airaglite-answer>:last-child{margin-bottom:0}' +
      '#airaglite-answer h1,#airaglite-answer h2,#airaglite-answer h3,#airaglite-answer h4{font-size:1em;font-weight:700;margin:16px 0 8px;line-height:1.5}' +
      '#airaglite-answer h1{font-size:1.14em}#airaglite-answer h2{font-size:1.07em}' +
      '#airaglite-answer ul,#airaglite-answer ol{margin:6px 0 12px;padding-left:24px}#airaglite-answer li{margin:4px 0}' +
      '#airaglite-answer strong{font-weight:700}#airaglite-answer a{color:#1556af;text-decoration:underline}' +
      '#airaglite-answer code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.92em;background:#e1eaf5;border-radius:3px;padding:1px 4px}' +
      '#airaglite-answer pre{white-space:pre;overflow-x:auto;background:#e2e8f0;padding:10px;border-radius:6px;margin:8px 0 12px}#airaglite-answer pre code{background:transparent;padding:0}' +
      '#airaglite-answer .airaglite-table-wrap{overflow-x:auto;margin:10px 0 14px}' +
      '#airaglite-answer table{border-collapse:collapse;width:100%;min-width:400px;background:#fff;font-size:13px;line-height:1.5}' +
      '#airaglite-answer th,#airaglite-answer td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left;vertical-align:top;white-space:normal;word-break:break-word}' +
      '#airaglite-answer th{background:#eaf1fc;font-weight:700}' +
      '#airaglite-answer blockquote{border-left:3px solid #94a3b8;margin:9px 0;padding:5px 0 5px 12px;color:#475569}' +
      '#airaglite-answer hr{border:0;border-top:1px solid #cbd5e1;margin:14px 0}' +
      '.airaglite-file-link{border:0;padding:0;background:transparent;color:#1457ae;font-weight:700;cursor:pointer;text-align:left;font-size:inherit;text-decoration:underline;text-underline-offset:3px}' +
      '.airaglite-file-link:hover,.airaglite-citation:hover{text-decoration:underline}' +
      '.airaglite-copy{font-size:12px;color:#64748b;border:0;padding:2px 6px;border-radius:4px;background:#f1f5f9}' +
      '.airaglite-citation{color:#1d5fcc;text-decoration:none;cursor:pointer;font-weight:700;white-space:nowrap}' +
      '.airaglite-sources{border-top:1px solid #bfdbfe;padding-top:10px;margin-top:12px;font-size:12px;color:#475569}' +
      '.airaglite-sources button{background:none;border:0;color:#1556af;text-decoration:underline;cursor:pointer;padding:3px 5px}';
    $('head').append($('<style>').text(css));
    var btn = $('<button id="airaglite-open" type="button">🔎 智能检索</button>').appendTo('body');
    window.aiRagLiteDebug.stage = 'mounted';
    window.aiRagLiteOpen = function () { btn.trigger('click'); };
    var layer = $('<div id="airaglite-overlay"></div>').appendTo('body');
    var panel = $('<div id="airaglite-dialog"></div>').appendTo(layer);
    var head = $('<div id="airaglite-header"><span>搜索 KodBox 文档</span></div>').appendTo(panel);
    $('<button type="button" id="airaglite-close" aria-label="关闭">×</button>').appendTo(head);
    var form = $('<form id="airaglite-form"></form>').appendTo(panel);
    var query = $('<input id="airaglite-query" type="text" maxlength="300" placeholder="模糊描述、Excel 关键词、错误码……"/>').appendTo(form);
    var ask = $('<label style="font-size:13px;align-self:center;cursor:pointer"></label>').appendTo(form);
    var askCheck = $('<input type="checkbox"/>').appendTo(ask);
    ask.append(document.createTextNode(' AI 回答'));
    var submit = $('<button id="airaglite-go" type="submit">搜索</button>').appendTo(form);
    var tools = $('<div style="padding:0 22px 10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"></div>').appendTo(panel);
    var statBtn = $('<button type="button" style="border:1px solid #cbd5e1;border-radius:6px;background:white;padding:5px 10px;cursor:pointer">索引状态</button>').appendTo(tools);
    var rescanBtn = $('<button type="button" style="border:1px solid #cbd5e1;border-radius:6px;background:white;padding:5px 10px;cursor:pointer">立即对账</button>').appendTo(tools);
    var statusLine = $('<span style="font-size:12px;color:#64748b"></span>').appendTo(tools);
    var openMessage = $('<div id="airaglite-open-message" role="alert"></div>').appendTo(panel);
    function openNotice(message, isError) {
        openMessage.text(message || '').css({display:'block',color:isError ? '#991b1b' : '#14532d',background:isError ? '#fff1f2' : '#f0fdf4',borderColor:isError ? '#fecaca' : '#bbf7d0'});
        statusLine.text(message || '');
    }
    function requestInfo(route, payload, callback) {
        var api = window.kodApi;
        if (!api || !api.requestSend) { statusLine.text('KodBox API 未就绪'); return; }
        api.requestSend('plugin/aiRagLite/' + route, payload || {}, function (res) {
            if (!res || res.code === false) { statusLine.text('状态查询失败'); return; }
            callback(res.data || {});
        });
    }
    statBtn.on('click', function () {
        statusLine.text('正在查询……');
        requestInfo('status', {}, function (info) {
            var sc = info.scan || {}, f = info.files || {}, n = info.notification || {};
            statusLine.text((sc.running ? '扫描中' : '空闲') + ' · 文件 ' + (f.files || 0) +
                ' · 片段 ' + (f.chunks || 0) + ' · 本轮更新 ' + (sc.indexed || 0) +
                ' · 失败 ' + (sc.errors || 0) + ' · 通知#' + (n.generation || 0));
        });
    });
    rescanBtn.on('click', function () {
        statusLine.text('正在提交……');
        requestInfo('reindex', {}, function () { statusLine.text('已请求提前对账（后台异步执行）'); });
    });
    var results = $('<div id="airaglite-results"></div>').appendTo(panel);
    function close() { layer.hide(); }
    btn.on('click', function () { layer.css('display', 'flex'); query.trigger('focus'); });
    $('#airaglite-close').on('click', close);
    layer.on('click', function (e) { if (e.target === layer[0]) close(); });
    $(document).on('keydown.airaglite', function (e) { if (e.key === 'Escape') close(); });
    function status(text) { results.empty().append($('<p>').text(text)); }
    // Source paths in the RAG database are WebDAV-relative, not KodBox file URLs.
    // Resolve them on KodBox's server under the CURRENT session and permission
    // checks. Never construct a #fileView route from untrusted raw source paths.
    function openSource(source) {
        var path = source && source.path ? String(source.path) : '';
        openMessage.hide().text('');
        if (!path) { openNotice('没有可打开的来源路径', true); return; }
        var api = window.kodApi;
        if (!api || typeof api.requestSend !== 'function') {
            openNotice('KodBox API 尚未就绪，请返回文件管理页面重试', true); return;
        }
        // Keep the new tab associated with the direct user click, avoiding
        // popup blocking while the server verifies the user's access.
        var tab = window.open('about:blank', '_blank');
        if (tab) {
            try { tab.document.title = '正在定位 KodBox 原文件…'; } catch (ignored) {}
        }
        var done = false;
        var timeout = window.setTimeout(function () {
            if (done) return;
            done = true;
            if (tab && !tab.closed) try { tab.close(); } catch (ignored) {}
            openNotice('定位超时：KodBox 插件没有在 20 秒内返回结果。请检查 aiRagLite/app.php 是否已更新，或查看 KodBox PHP 日志。', true);
        }, 20000);
        function complete() {
            if (done) return false;
            done = true;
            window.clearTimeout(timeout);
            return true;
        }
        function fail(message) {
            if (!complete()) return;
            if (tab && !tab.closed) try { tab.close(); } catch (ignored) {}
            openNotice(message || '原文件定位失败，可复制路径手动查找。', true);
        }
        statusLine.text('正在定位原文件……');
        try {
            api.requestSend('plugin/aiRagLite/resolve', {path:path}, function (response) {
                if (done) return;
                if (!response || response.code === false || !response.data ||
                    (!response.data.route && !response.data.url)) {
                    var reason = response && typeof response.data === 'string'
                        ? response.data : '无法打开原文件：KodBox 没有返回预览地址';
                    fail(reason);
                    return;
                }
                // The KodBox PHP server may see an internal host or HTTP
                // behind a reverse proxy. Only use its *hash route* and keep
                // the origin/path of the URL currently used in the browser.
                var raw = String(response.data.route || response.data.url);
                var hash;
                try {
                    if (/^#fileView&path=/.test(raw)) {
                        hash = raw;
                    } else {
                        var parsed = new URL(raw, window.location.href);
                        if (!/^#fileView&path=/.test(parsed.hash)) throw new Error('Invalid KodBox route');
                        hash = parsed.hash; // Drop internal origin from legacy V0.3.3 PHP.
                    }
                    if (!/^#fileView&path=[^\s]*$/.test(hash) || hash.length > 5000) {
                        throw new Error('Invalid hash');
                    }
                } catch (error) { fail('KodBox 返回的预览路由无效，请确认 app.php 已更新。'); return; }
                var url = new URL(hash, window.location.href);
                // Always keep browser origin; never navigate to a backend URL.
                if (url.origin !== window.location.origin) {
                    fail('浏览器安全检查拒绝了跨域跳转。'); return;
                }
                if (!complete()) return;
                if (tab && !tab.closed) {
                    try { tab.location.replace(url.href); }
                    catch (error) {
                        openNotice('浏览器无法导航新标签页：' + (error.message || error), true);
                        return;
                    }
                } else {
                    // Popup blocked: open in current tab, not a silently failed click.
                    window.location.assign(url.href);
                    return;
                }
                var label = source.location ? '；证据位置：' + String(source.location) : '';
                openNotice('正在打开：' + (response.data.name || '原文件') + label + '。如果新标签页仍显示空白，请确认 KodBox 本身能预览该文件。', false);
            });
        } catch (error) {
            fail('KodBox 预览接口调用失败：' + String(error.message || error));
        }
    }
    var citationMap = Object.create(null);
    // Render the common Markdown generated by RAG without interpreting any source HTML.
    // Nodes are constructed with DOM APIs; untrusted documents never reach .html().
    function mdInline(parent, input, depth) {
        var value = String(input == null ? '' : input);
        if (depth > 8) { parent.appendChild(document.createTextNode(value)); return; }
        var token = /`([^`\n]+)`|\*\*([^\n]+?)\*\*|__([^\n]+?)__|~~([^\n]+?)~~|\[([^\]\n]+)\]\(([^)\s]+)\)|\*([^*\n]+)\*|_([^_\n]+)_|\[(\d{1,3})\]/g;
        var pos = 0, found;
        while ((found = token.exec(value)) !== null) {
            if (found.index > pos) parent.appendChild(document.createTextNode(value.slice(pos, found.index)));
            var node = null;
            if (found[1] !== undefined) {
                node = document.createElement('code');
                node.textContent = found[1];
            } else if (found[2] !== undefined || found[3] !== undefined) {
                node = document.createElement('strong');
                mdInline(node, found[2] !== undefined ? found[2] : found[3], depth + 1);
            } else if (found[4] !== undefined) {
                node = document.createElement('del');
                mdInline(node, found[4], depth + 1);
            } else if (found[5] !== undefined) {
                var href = found[6];
                if (/^(https?:\/\/|mailto:|\/[^\/]|#)/i.test(href)) {
                    node = document.createElement('a');
                    node.setAttribute('href', href);
                    node.setAttribute('target', '_blank');
                    node.setAttribute('rel', 'noopener noreferrer');
                    mdInline(node, found[5], depth + 1);
                } else {
                    node = document.createTextNode(found[5]);
                }
            } else if (found[9] !== undefined) {
                var source = citationMap[String(Number(found[9]))];
                if (source) {
                    node = document.createElement('a');
                    node.className = 'airaglite-citation';
                    node.href = '#';
                    node.title = '打开来源：' + source.path + ' · ' + (source.location || '');
                    node.textContent = '[' + found[9] + ']';
                    node.addEventListener('click', (function (ref) {
                        return function (event) { event.preventDefault(); openSource(ref); };
                    })(source));
                } else {
                    node = document.createTextNode('[' + found[9] + ']');
                }
            } else {
                node = document.createElement('em');
                mdInline(node, found[7] !== undefined ? found[7] : found[8], depth + 1);
            }
            parent.appendChild(node);
            pos = token.lastIndex;
        }
        if (pos < value.length) parent.appendChild(document.createTextNode(value.slice(pos)));
    }
    function mdLines(parent, content) {
        content.forEach(function (line, index) {
            if (index) parent.appendChild(document.createElement('br'));
            mdInline(parent, line, 0);
        });
    }
    // Respect escaped pipes and pipes inside inline code when parsing GFM tables.
    function mdCells(line) {
        var value = String(line).trim().replace(/^\|/, '').replace(/\|$/, '');
        var result = [], part = '', inCode = false;
        for (var k = 0; k < value.length; k++) {
            var char = value.charAt(k);
            if (char === '\\' && k + 1 < value.length && value.charAt(k + 1) === '|') {
                part += '|'; k++; continue;
            }
            if (char === '`') inCode = !inCode;
            if (char === '|' && !inCode) { result.push(part.trim()); part = ''; }
            else part += char;
        }
        result.push(part.trim());
        return result;
    }
    function mdTableAt(lines, i) {
        if (i + 1 >= lines.length || lines[i].indexOf('|') < 0 || lines[i + 1].indexOf('|') < 0) return false;
        var headings = mdCells(lines[i]), dividers = mdCells(lines[i + 1]);
        return headings.length >= 2 && headings.length === dividers.length &&
            dividers.every(function (s) { return /^:?-{3,}:?$/.test(s); });
    }
    function mdRender(target, input) {
        target.textContent = '';
        var lines = String(input == null ? '' : input).replace(/\r\n?/g, '\n').split('\n');
        var i = 0;
        function startsBlock(index) {
            var s = lines[index] || '';
            return /^\s*(?:```|~~~)/.test(s) || /^\s{0,3}#{1,6}\s/.test(s) ||
                /^\s{0,3}>/.test(s) || /^\s{0,6}(?:[-+*]|\d+[.)])\s+/.test(s) ||
                /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(s) || mdTableAt(lines, index);
        }
        while (i < lines.length) {
            var line = lines[i];
            if (!line.trim()) { i++; continue; }
            var fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w-]*)\s*$/);
            if (fence) {
                var kind = fence[1].charAt(0), body = [];
                i++;
                while (i < lines.length && !(new RegExp('^\\s*' + kind + '{3,}\\s*$')).test(lines[i])) body.push(lines[i++]);
                if (i < lines.length) i++;
                var pre = document.createElement('pre'), code = document.createElement('code');
                code.textContent = body.join('\n'); pre.appendChild(code); target.appendChild(pre); continue;
            }
            if (mdTableAt(lines, i)) {
                var headings = mdCells(lines[i]), wrap = document.createElement('div');
                wrap.className = 'airaglite-table-wrap';
                var table = document.createElement('table'), thead = document.createElement('thead');
                var tr = document.createElement('tr');
                headings.forEach(function (cell) {
                    var th = document.createElement('th'); mdInline(th, cell, 0); tr.appendChild(th);
                });
                thead.appendChild(tr); table.appendChild(thead);
                var tbody = document.createElement('tbody'); i += 2;
                while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') >= 0) {
                    var tdrow = document.createElement('tr'), cells = mdCells(lines[i++]);
                    for (var k = 0; k < headings.length; k++) {
                        var td = document.createElement('td'); mdInline(td, cells[k] || '', 0); tdrow.appendChild(td);
                    }
                    tbody.appendChild(tdrow);
                }
                table.appendChild(tbody); wrap.appendChild(table); target.appendChild(wrap); continue;
            }
            var heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
            if (heading) {
                var h = document.createElement('h' + Math.min(heading[1].length, 4));
                mdInline(h, heading[2], 0); target.appendChild(h); i++; continue;
            }
            if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
                target.appendChild(document.createElement('hr')); i++; continue;
            }
            var listMatch = line.match(/^\s{0,6}([-+*]|\d+[.)])\s+(.+)$/);
            if (listMatch) {
                var ordered = /^\d/.test(listMatch[1]);
                var list = document.createElement(ordered ? 'ol' : 'ul');
                if (ordered) list.start = parseInt(listMatch[1], 10);
                while (i < lines.length) {
                    var current = lines[i].match(/^\s{0,6}([-+*]|\d+[.)])\s+(.+)$/);
                    if (!current || /^\d/.test(current[1]) !== ordered) break;
                    var li = document.createElement('li'); mdInline(li, current[2], 0);
                    list.appendChild(li); i++;
                }
                target.appendChild(list); continue;
            }
            if (/^\s{0,3}>\s?/.test(line)) {
                var quoteLines = [];
                while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) {
                    quoteLines.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
                }
                var quote = document.createElement('blockquote'); mdLines(quote, quoteLines);
                target.appendChild(quote); continue;
            }
            var paragraph = [];
            while (i < lines.length && lines[i].trim() && (!paragraph.length || !startsBlock(i))) paragraph.push(lines[i++]);
            if (!paragraph.length) { i++; continue; }
            var p = document.createElement('p'); mdLines(p, paragraph); target.appendChild(p);
        }
    }
    function show(data) {
        results.empty();
        citationMap = Object.create(null);
        var refs = Array.isArray(data.sources) ? data.sources : [];
        refs.forEach(function (ref) {
            if (!ref || !Number.isInteger(Number(ref.id)) || Number(ref.id) < 1 ||
                Number(ref.id) > 999 || typeof ref.path !== 'string' || !ref.path) return;
            citationMap[String(Number(ref.id))] = {path:ref.path, location:String(ref.location || '')};
        });
        if (data.answer) {
            var answerBox = $('<div id="airaglite-answer"></div>').appendTo(results);
            mdRender(answerBox[0], data.answer);
            if (refs.length) {
                var evidenceBar = $('<div class="airaglite-sources"></div>').appendTo(answerBox);
                evidenceBar.append($('<span></span>').text('打开引用来源：'));
                refs.slice(0, 30).forEach(function (ref) {
                    var item = citationMap[String(Number(ref.id))];
                    if (!item) return;
                    var name = item.path.split('/').pop();
                    $('<button type="button"></button>').text('[' + ref.id + '] ' + name).attr('title',
                        item.path + ' · ' + item.location).appendTo(evidenceBar).on('click', function () {openSource(item);});
                });
            }
        }
        if (data.mode) $('<p></p>').text('检索模式：' + (data.mode === 'hybrid' ? '关键词 + 语义' : '关键词')).appendTo(results);
        if (data.note) $('<p></p>').text(data.note).appendTo(results);
        var hits = Array.isArray(data.results) ? data.results : [];
        if (!hits.length) { $('<p>没有找到匹配文件。可尝试更短的关键词。</p>').appendTo(results); return; }
        hits.forEach(function (hit, index) {
            var item = $('<div class="airaglite-item"></div>').appendTo(results);
            var title = $('<button class="airaglite-file-link" type="button"></button>')
                .text((index + 1) + '. ' + (hit.name || '未命名文件')).appendTo(item);
            title.attr('title', '点击打开原文件');
            title.on('click', function () {openSource(hit);});
            var copy = $('<button class="airaglite-copy" type="button">复制路径</button>').appendTo(item);
            copy.on('click', function () {
                var path = hit.path || '';
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(path).catch(function () { window.prompt('复制路径：', path); });
                } else { window.prompt('复制路径：', path); }
            });
            $('<div class="airaglite-path"></div>').text((hit.path || '') + ' · ' + (hit.location || '')).appendTo(item);
            $('<div class="airaglite-snippet"></div>').text(hit.snippet || '').appendTo(item);
        });
    }
    form.on('submit', function (e) {
        e.preventDefault();
        var q = query.val().trim();
        if (q.length < 2) { status('至少输入两个字符'); return; }
        status('正在查找资料并整理结果……'); submit.prop('disabled', true);
        var route = 'plugin/aiRagLite/' + (askCheck.prop('checked') ? 'ask' : 'search');
        var api = window.kodApi;
        if (!api || typeof api.requestSend !== 'function') {
            submit.prop('disabled', false);
            status('KodBox API 尚未就绪，请返回文件管理界面后重试。');
            return;
        }
        try {
            api.requestSend(route, {q: q}, function (response) {
                submit.prop('disabled', false);
                if (!response || response.code === false) {
                    status(response && response.data ? String(response.data) : '请求失败'); return;
                }
                show(response.data || {});
            });
        } catch (err) {
            submit.prop('disabled', false);
            status('调用 KodBox API 失败：' + (err.message || err));
        }
    });
});
