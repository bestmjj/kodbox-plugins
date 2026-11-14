# Kodbox Plugins

这个仓库存放 Kodbox 自定义插件。**普通用户请直接下载 GitHub Releases 的 ZIP 安装包，不必逐个下载源码文件。**

## 下载插件

- [数字资产中心 assetLedger v1.1.2](https://github.com/bestmjj/kodbox-plugins/releases/download/assetLedger-v1.1.2/assetLedger-v1.1.2.zip)
- [KodBox AI 助手 aiRagLite v0.7.0](https://github.com/bestmjj/kodbox-plugins/releases/download/aiRagLite-v0.7.0/aiRagLite-v0.7.0.zip)
- [查看所有版本](https://github.com/bestmjj/kodbox-plugins/releases)

> aiRagLite v0.4.0 增加「智能选择 / 数字资产（实时）/ Kodbox 文档（RAG）」三个查询来源。安装好 AssetLedger 插件后，资产问题直接读取 Kodbox 中的台账；**资产数据不上传到文档 RAG、没有向量索引或 AI 二次推理**。文档功能仍然需要原有 RAG 后端服务。

> 想要的效果示例：输入“我的数字资产有哪些”实时返回资产总数与分类；输入“Nuyek 关联了什么”返回已登记关系；输入“下线 Netcup 可能影响什么”给出人工关联的**候选影响清单**，并明确说明不能取代实际部署检查。

> **v0.7.0：聊天优先的 KodBox AI 助手。** 点击右下角直接进入对话；可以关联管理员个人空间里的 MD/TXT/Word 文档后总结、连续追问、费用核算（按币种分别统计），或直接检索现有 RAG 知识库、查询本地 AssetLedger 资产台账。
>
> 如果在聊天里提出明确的“修改文章”要求，只返回 **待审阅修改稿**。用户点击查看差异、应用到编辑区，再确认另存或备份后更新；AI 对话端不直接写文件。新文档同样需要在原有编辑器中确认保存。
>
> **当前限制：** v0.7.0 仍需在聊天窗口中**主动关联文件**，暂不自动读取 KodBox 正在编辑的文件；没有对外开放全盘文件写入、移动或删除工具。AssetLedger 问题只在本地 PHP 中计算，不发送到 RAG/LLM。
>
> **重要：** 从 v0.6.x 升级 v0.7.0 需要同时更新插件 ZIP 与 `-rag-writer.zip`，并重新构建 `rag-api`，否则 `/v1/assistant-chat` 不存在。WebDAV `rag_reader` 仍只读。详见 `integrations/rag-writer/README.md`。

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
