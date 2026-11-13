# aiRagLite V0.5.x — AI 写文档

在现有 KodBox aiRagLite 上增加“生成草稿 → 预览与编辑 → 确认保存到指定文件夹”。

- **rag_reader 继续作为只读 WebDAV 索引账户。** RAG 后端只负责生成 Markdown 和 DOCX，不写入 KodBox。
- 只有用户主动确认保存，插件才在**当前 KodBox 管理员会话**中创建新文件。可以浏览、选择当前用户个人空间内的文件夹，默认 AI草稿。
- 自动生成唯一新文件名，绝不默默覆盖旧文档。
- 可选参考已索引文档。仅勾选“参考文档”时，才会把检索片段送到当前配置的 AI 模型；AssetLedger 数据不参与写作上下文。
- 复用当前 RAG 的模型配置和密钥。新增受 X-RAG-Key 保护的 /v1/draft、/v1/render-docx。
- Word 使用 python-docx 生成真实 .docx；支持标题、加粗、列表和基础 Markdown 表格。
- 目前只供 KodBox 管理员使用；并非企业版全部 AI 智能体功能。

## 版本说明

**V0.5.1 只修改 KodBox 插件界面。** 已成功安装 V0.5.0 写作后端的用户只需要替换插件文件，不必重新构建 `rag-api`。新用户仍须同时安装插件与此后端扩展。

## 部署

1. 更新 KodBox 里的 aiRagLite 插件到 V0.5.1。
2. 同步本仓库并安装新增 RAG 后端功能：

~~~sh
sh integrations/rag-writer/install.sh /opt/backup/data/hostdzire/compose/kodbox-ai-rag
cd /opt/backup/data/hostdzire/compose/kodbox-ai-rag
docker compose up -d --build --no-deps rag-api
~~~

安装脚本备份 api.py，添加路由注册并复制 drafting.py；若缺失 python-docx，则加入依赖。不会覆盖 .env、已有索引、Docker 数据卷，或改变 rag_reader 的权限。

**只升级插件、不升级 RAG 后端时，“生成草稿”会返回 404。** 先用非敏感文档验收 Markdown 和 Word 两种格式。
