# 数字资产中心（Asset Ledger）v1.0

> 适用于 Kodbox 的独立 PHP 插件。记录 VPS、域名、站点、Docker 服务、平台账号、代码仓库、额度/许可证与关联关系。**不需要 NocoDB、新数据库、Redis 或额外容器**。

## 功能

- 管理员登录后，Kodbox 左侧菜单增加「数字资产中心」。
- 11 种预置资产类型；允许在页面上添加、改名、删除空的自定义类型。
- 可登记名称、状态、平台、地址、代码仓库、Bitwarden/Wallos/Kodbox/NavOne 引用、标签和备注。
- 任意添加键值型自定义字段（CPU、RAM、IP、合同日期、证书等）。
- 通过 ID 关联任意资产；界面自动显示**反向关系**，例如 VPS 能看到部署于其上的站点。
- 按类型、状态、待核实状态过滤；快速全文搜索。
- JSON 导入和导出；导入采取安全合并模式（ID 或同类型同名称已存在就跳过，**不覆盖**已有编辑结果）。
- 所有后端 API 仅系统管理员可访问，且通过 Kodbox Session 和 CSRF Token 校验。
- 原始数据保存在 Kodbox 自己的 `DATA_PATH/system/assetLedger/data.php`，插件目录更新时不覆盖。

## 安装

1. **先备份 Kodbox 配置与数据**，并确保部署的 Kodbox 具有可写的 `data/system` 目录。
2. 解压发布压缩包，将其中的 `assetLedger` **整个文件夹**放到 **Kodbox 程序自身的** `plugins/` 下；最终路径应为 `plugins/assetLedger/app.php` 和 `plugins/assetLedger/package.json`。**不是** Kodbox 网盘中的某个普通文件目录。
3. Kodbox 运行于 Docker 时，建议把插件目录作为宿主机持久化挂载，避免镜像更新时插件消失。容器内 Kodbox 的实际安装路径因镜像不同而不同，必须先确认，不要照抄别人的 `/var/www/html/`。
4. 管理员打开 Kodbox 后台的插件管理，启用「数字资产中心」。如果插件未出现在列表，检查文件权限、插件目录层级，刷新后台，必要时重启应用/PHP 服务。
5. 使用管理员身份刷新 Kodbox 前端，点击左侧「数字资产中心」。
6. 如需要预加载本次整理的历史资产，点击「导入 JSON」，选择**另行提供的** `kodbox-digital-assets-starter.json`。初始历史记录大多标为「待核实」，逐项核对再确认。

> 原版自带的插件管理页面主要是从官方插件源下载。自定义 ZIP 不一定支持从插件商店上传，因此推荐**管理员在服务器侧安装文件**。

## Docker 示例：先确定实际程序目录

```sh
# 将以下 <kodbox-container> 替换为实际容器名
docker exec <kodbox-container> sh -lc 'find /var/www /app -path "*/plugins/adminer/app.php" -print 2>/dev/null'
```

设实际程序路径为 `<KODBOX_ROOT>`，则最终确保：

```text
<KODBOX_ROOT>/plugins/assetLedger/app.php
<KODBOX_ROOT>/plugins/assetLedger/package.json
<KODBOX_ROOT>/plugins/assetLedger/static/page.php
```

注：如果使用 Compose，插件目录应映射到原 Kodbox 程序的 `plugins/assetLedger`，而不是 `/opt/data/scripts`（后者仍作为你自有运维脚本目录）。

## 数据备份与升级

- 数据目录：`DATA_PATH/system/assetLedger/`（以 Kodbox 的 `config/config.php`、可选 `config/define.php` 实际设置为准）。
- 数据文件：`data.php`，首行有 `<?php ... exit; ?>` 防止 PHP 服务器意外对其直接响应。
- 页面提供「导出备份」JSON，建议在重大修改前导出并自行保管。
- 数据**不**存储于插件 `plugins/assetLedger` 代码目录，升级代码时不应碰数据目录。
- 卸载插件会删除插件程序目录，但不会主动删除 `DATA_PATH/system/assetLedger/`，以便重新安装后继续使用。
- 所有用户数据属于单个系统管理员的共享资产库，而不是每个 Kodbox 用户一套；未来可扩展多租户权限。

## 安全限制

1. **绝对不要登记明文密码、SSH 私钥、API Token、恢复码或支付卡号。** 只填写 Bitwarden 条目名称/引用。
2. 管理员权限、Kodbox Session 和 CSRF Token 共同保护插件接口；没有单独开放匿名/Token API。
3. 本插件不会对你的 VPS 执行 SSH、扫描端口、访问 Bitwarden API 或部署服务；它是登记/关联工具。
4. 插件持久化目录需随 Kodbox 的 `data/system` 一起备份。`data.php` 虽有 PHP 文件头，仍应在 Web 服务器配置中阻止直接访问 `data/`。
5. **未在你实际运行的 Kodbox 版本上进行真实登录与 UI 集成验证。** 已执行后端 PHP、前端 JavaScript 语法和存储/导入测试。第一次请先在副本或可回滚的环境验证。

## 扩展接口与结构

- 数据结构：`schemaVersion: 1`，`types[]`，`records[]`。
- 资产关键字段：`id/name/type/state/verification/provider/url/address/repo/tags/attrs/relations/vaultRef/wallosRef/kodboxRef/navoneRef/notes/source`。
- `attrs` 是不限制业务含义的键值字段；新增资产类型不需要修改代码。
- `relations[]` 是资产 ID 数组，便于未来引入资产依赖关系、风险分析与影响面查询。
- PHP 存储服务：`lib/AssetLedgerStore.php`，统一提供 `all/save/remove/addType/renameType/removeType/import`，未来可替换 SQLite/MySQL 后端。
- 接口：`?plugin/assetLedger/api`；当前仅管理员持有效 Kodbox 会话及 CSRF Token 时可 `POST`，`op` 包括 `list`,`save`,`remove`,`addType`,`renameType`,`removeType`,`import`。
- 下一阶段可以增加单独 Agent/MCP Adapter **只读入口**、Docker / GitHub 元信息采集器、历史变更记录、权限角色及任务计划，但 v1.0 **未开放无认证的 Agent 远程入口**。

## 测试

```sh
php -l app.php
php -l lib/AssetLedgerStore.php
php -l static/page.php
node --check static/main.js
node --check static/page.js
php tests/test_store.php /path/to/kodbox-digital-assets-starter.json
```

## 官方参考

- Kodbox 官方开源仓库：https://github.com/kalcaddle/kodbox
- 官方内置 `plugins/adminer` 展示左侧菜单与 `Router.mapIframe` 写法。
- 官方内置 `plugins/simpleClock` 展示 `PluginBase`、`package.json`、`user.commonJs.insert` 与页面路由写法。
- 本插件没有改动任何 Kodbox 核心文件。
