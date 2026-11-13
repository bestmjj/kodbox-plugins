<?php if (!defined('BASIC_PATH')) { http_response_code(404); exit; } ?>
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>数字资产中心 · Kodbox</title>
<style><?php readfile(__DIR__ . '/page.css'); ?></style>
</head>
<body>
<div class="app" id="app">
  <header class="topbar">
    <div class="brand"><div class="logo">◇</div><div><h1>数字资产中心 <span class="version">v1.0</span></h1><p>记录、查找、关联你的 VPS、域名、站点、账号与数字权益</p></div></div>
    <div class="top-actions">
      <button id="typesBtn" type="button" class="btn subtle">资产类型</button>
      <button id="importBtn" type="button" class="btn subtle">导入 JSON</button>
      <button id="exportBtn" type="button" class="btn subtle">导出备份</button>
      <button id="addBtn" type="button" class="btn primary">＋ 新增资产</button>
      <input type="file" id="importFile" accept=".json,application/json" hidden>
    </div>
  </header>
  <section id="stats" class="stats" aria-label="资产总览"></section>
  <div class="workbench">
    <aside class="left-rail">
      <div class="rail-title">资产分类</div>
      <nav id="categories"></nav>
      <div class="rail-foot"><span class="small-dot"></span> 数据保存在 Kodbox 本地</div>
    </aside>
    <main class="main-panel">
      <div class="toolbar">
        <div class="search-wrap"><span class="search-symbol">⌕</span><input id="search" type="search" placeholder="搜索名称、域名、IP、平台或备注…" autocomplete="off" aria-label="搜索资产"></div>
        <select id="stateFilter" title="资产状态"><option value="all">全部状态</option><option value="active">使用中</option><option value="draft">待整理</option><option value="paused">暂停</option><option value="retired">已归档</option></select>
        <label class="check-filter"><input type="checkbox" id="reviewOnly"> 仅待核实</label>
      </div>
      <div class="section-line"><div><strong id="sectionTitle">全部资产</strong> <span id="resultCount"></span></div><button class="btn tiny" id="reloadBtn">刷新</button></div>
      <div id="tableArea" class="table-area">
        <div id="loading" class="empty-state">正在加载资产…</div>
        <div id="assetTable" hidden>
          <div class="table-head"><span>资产</span><span>类型 / 来源</span><span>状态</span><span>关联</span></div>
          <div id="assetRows"></div>
        </div>
        <div id="empty" class="empty-state" hidden><div class="empty-icon">◇</div><strong>没有匹配的资产</strong><p>可以新增一项资产，或调整搜索条件。</p></div>
      </div>
      <div class="notice">安全提示：只记录账号名称和 Bitwarden 条目引用；不要在备注、自定义字段中填写密码、私钥或 API Token。</div>
    </main>
    <aside class="detail" id="detail" hidden>
      <div class="detail-header"><div><span class="eyebrow">ASSET DETAIL</span><h2 id="detailName"></h2></div><button class="icon-btn" type="button" id="closeDetail" aria-label="关闭详情">×</button></div>
      <div id="detailContent"></div>
      <div class="detail-actions"><button type="button" class="btn primary" id="editBtn">编辑资产</button><button type="button" class="btn danger" id="deleteBtn">删除</button></div>
    </aside>
  </div>
</div>
<dialog id="editModal" class="modal">
  <form id="editForm" autocomplete="off">
    <div class="modal-top"><div><span class="eyebrow">ASSET EDITOR</span><h2 id="modalTitle">新增资产</h2></div><button type="button" class="icon-btn" data-close-modal aria-label="关闭编辑">×</button></div>
    <div class="modal-body">
      <input type="hidden" id="assetId">
      <div class="fields-row"><label>资产名称 <span class="req">*</span><input id="assetName" required maxlength="160" placeholder="例如：Netcup VPS / plainmile.com"></label><label>资产类别 <span class="req">*</span><select id="assetType" required></select></label></div>
      <div class="fields-row"><label>使用状态<select id="assetState"><option value="active">使用中</option><option value="draft">待整理</option><option value="paused">暂停</option><option value="retired">已归档</option></select></label><label>信息可信度<select id="assetVerification"><option value="needs_review">待核实</option><option value="confirmed">已确认</option></select></label></div>
      <div class="fields-row"><label>服务商 / 所属平台<input id="assetProvider" placeholder="如 Netcup / 腾讯云 / GitHub"></label><label>网址 / 管理入口<input id="assetUrl" placeholder="https://…"></label></div>
      <div class="fields-row"><label>IP / 部署路径 / 地区<input id="assetAddress" placeholder="IP、Docker Compose 路径等"></label><label>代码仓库<input id="assetRepo" placeholder="https://github.com/…"></label></div>
      <div class="fields-row"><label>关联 Bitwarden 条目<input id="assetVaultRef" placeholder="条目名称或私有引用，不要填密码"></label><label>关联 Wallos 项<input id="assetWallosRef" placeholder="续费项目名 / 链接"></label></div>
      <div class="fields-row"><label>关联 Kodbox 文档<input id="assetKodboxRef" placeholder="Kodbox 文件路径 / 链接"></label><label>关联 NavOne 项<input id="assetNavoneRef" placeholder="导航名称 / 链接"></label></div>
      <div class="fields-row"><label>账号标识（非密码）<input id="assetLoginHint" placeholder="登录邮箱别名 / 用户名"></label><label>标签（以逗号分隔）<input id="assetTags" placeholder="生产, Docker, 国外VPS"></label></div>
      <label class="block-label">备注 / 核实事项<textarea id="assetNotes" rows="3" maxlength="6000" placeholder="记录用途、尚需确认的信息…"></textarea></label>
      <div class="subsection"><div class="subsection-heading"><strong>自定义字段</strong><button class="btn tiny" type="button" id="addField">＋ 字段</button></div><div id="extraFields"></div><p class="hint">例如：CPU、内存、到期日、SSL、容器名。字段可随时扩展。</p></div>
      <div class="subsection"><div class="subsection-heading"><strong>关联其他资产</strong><span class="hint">可同时看到反向关联</span></div><div class="relation-picker"><select id="relationSelect"><option value="">选择要关联的资产…</option></select><button type="button" class="btn subtle" id="addRelation">添加</button></div><div id="relationChips" class="chips"></div></div>
    </div>
    <div class="modal-foot"><button type="button" class="btn subtle" data-close-modal>取消</button><button id="saveBtn" class="btn primary" type="submit">保存资产</button></div>
  </form>
</dialog>
<dialog id="typesModal" class="modal small-modal">
 <div class="modal-top"><div><span class="eyebrow">SCHEMA</span><h2>管理资产类型</h2></div><button type="button" class="icon-btn" data-close-types aria-label="关闭">×</button></div>
 <div class="modal-body"><p class="muted">可新增分类、修改显示名称。内置类别不可删除；自定义类别若已有资产，需要先迁移资产才能删除。</p><div id="typeList"></div><div class="type-add"><input type="text" id="typeName" maxlength="50" placeholder="输入新资产类型，如 API 服务"><button type="button" class="btn primary" id="createType">新增分类</button></div></div>
 <div class="modal-foot"><button type="button" class="btn subtle" data-close-types>关闭</button></div>
</dialog>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
<script>window.assetLedgerInit = <?php echo json_encode($appConfig, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;</script>
<script><?php readfile(__DIR__ . '/page.js'); ?></script>
</body>
</html>
