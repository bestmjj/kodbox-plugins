# Kodbox Plugins

这个仓库存放 Kodbox 自定义插件。**普通用户请直接下载 GitHub Releases 的 ZIP 安装包，不必逐个下载源码文件。**

## 下载插件

- [数字资产中心 assetLedger v1.1.1](https://github.com/bestmjj/kodbox-plugins/releases/download/assetLedger-v1.1.1/assetLedger-v1.1.1.zip)
- [AI 智能检索 aiRagLite v0.3.5](https://github.com/bestmjj/kodbox-plugins/releases/download/aiRagLite-v0.3.5/aiRagLite-v0.3.5.zip)
- [查看所有版本](https://github.com/bestmjj/kodbox-plugins/releases)

> aiRagLite 需要单独配置 RAG 后端服务；ZIP 只包含 Kodbox 插件端。

## 安装

1. 下载对应插件的 ZIP。
2. 将 ZIP 解压到 **Kodbox 程序本身的** `plugins/` 目录，确保其内包含唯一一层插件目录。
3. 例如，最终路径应是 `<KODBOX_ROOT>/plugins/assetLedger/app.php` 或 `<KODBOX_ROOT>/plugins/aiRagLite/app.php`。
4. 在 Kodbox 的插件管理中启用插件，然后刷新页面。

注意：不是解压到 Kodbox 网盘中的普通文件目录。Docker 用户请确认容器内的 Kodbox 程序路径及持久化挂载。

## 开发与发布

每个插件有自己的文件夹与 `package.json` 版本号。推送到 `main` 后，
`.github/workflows/publish-plugin-releases.yml` 会检查版本号并为尚未发布的版本创建带 ZIP 附件的 GitHub Release。

新的正式版本请先修改对应插件的 `package.json` 内的 `version`。
已经发布过的同名版本不会被覆盖。构建脚本 `tools/package_plugin.py` 只打包运行所需文件，不包含测试与用户数据。

## 安全

**不要**向仓库提交密码、SSH 私钥、API Token、Bitwarden 导出、私人资产台账或部署密钥。
个人资产数据不会包含在插件安装包里。上线前请在自己的 Kodbox 版本上验证兼容性。
