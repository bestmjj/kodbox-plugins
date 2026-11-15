# Kodbox Plugins

这个仓库存放 Kodbox 自定义插件。**普通用户请直接下载 GitHub Releases 的 ZIP 安装包，不必逐个下载源码文件。**

## 下载插件

- [数字资产中心 assetLedger v1.1.2](https://github.com/bestmjj/kodbox-plugins/releases/download/assetLedger-v1.1.2/assetLedger-v1.1.2.zip)
- [KodBox AI 助手 aiRagLite v0.8.0](https://github.com/bestmjj/kodbox-plugins/releases/download/aiRagLite-v0.8.0/aiRagLite-v0.8.0.zip)
- [查看所有版本](https://github.com/bestmjj/kodbox-plugins/releases)

> aiRagLite v0.4.0 增加「智能选择 / 数字资产（实时）/ Kodbox 文档（RAG）」三个查询来源。安装好 AssetLedger 插件后，资产问题直接读取 Kodbox 中的台账；**资产数据不上传到文档 RAG、没有向量索引或 AI 二次推理**。文档功能仍然需要原有 RAG 后端服务。

> 想要的效果示例：输入“我的数字资产有哪些”实时返回资产总数与分类；输入“Nuyek 关联了什么”返回已登记关系；输入“下线 Netcup 可能影响什么”给出人工关联的**候选影响清单**，并明确说明不能取代实际部署检查。

> **v0.8.0：KodBox AI Agent 起步版**。从仅在聊天里检索 RAG 改成由模型决定调用安全的 KodBox 工具：列目录、读文档、跨文档检索、确定性费用统计、准备文档修改与新建草稿。
>
> 已修复 v0.7.0 中旧搜索弹窗把 **「✨ AI 助手」错误绑定到旧文档编辑器**的问题。现在旧窗口入口明确叫「文档编辑」，可一键回到主助手并沿用已打开的文件；支持从 KodBox 个人空间文件预览路由尝试关联当前文件（须通过服务器侧权限和路径检查）。
>
> 文件修改在 AI 对话内展示原文与建议稿并由用户确认；可另存新版本，或先备份后更新原文。Agent 只支持明确的文件工具，**尚不支持**自主删除、移动文件、发邮件或完整企业版 MCP/自定义智能体。原有 RAG 搜索是可选工具，不是 Agent 唯一能力。
>
> 升级需要同时替换插件 ZIP 和 RAG 后端 ZIP，并只重建 `rag-api`；原来的索引、Embedding、WebDAV `rag_reader` 和飞书机器人不用重建。详见 `integrations/rag-writer/README.md`。

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
