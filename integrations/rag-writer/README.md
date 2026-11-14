# aiRagLite V0.6.0 — KodBox AI 助手（文档能力）

本版以 KodBox 为入口，保留已有 RAG 检索及 AI 写新文章功能，同时实现：

- 从当前管理员的个人空间浏览并打开 Markdown、TXT、DOCX 文件。
- 对已打开文章修改全文或选中段落，输入修改要求后由模型生成建议稿。
- 显示修改前后差异，选择应用或放弃；应用只修改浏览器草稿，**不会自动保存**，并且可以撤销。
- 点击另存新版本，新建文件，不会覆盖原文。
- 对 Markdown/TXT，明确确认后先校验原文件 SHA-256、创建同目录备份，再更新原文件；Word 只支持提取正文并另存新版本，复杂排版/图片/批注可能丢失。

## 部署

升级 v0.5.x → v0.6.0 **必须安装两个 Release 附件**：

1. aiRagLite-v0.6.0.zip：先备份原 KodBox 插件，然后更新。
2. aiRagLite-v0.6.0-rag-writer.zip：解压到 /tmp/rag-writer，运行：

~~~sh
sh /tmp/rag-writer/install.sh /opt/backup/data/hostdzire/compose/kodbox-ai-rag
cd /opt/backup/data/hostdzire/compose/kodbox-ai-rag
docker compose up -d --build --no-deps rag-api
~~~

安装脚本会备份并替换 drafting.py，之前已注册的路由不会重复添加。新接口 /v1/revise 和 /v1/import-docx 与旧的 /v1/draft、/v1/render-docx 一样，使用已有 RAG_API_KEY 验证；无需新的模型 Key。

rag_reader 继续只读，不参与实际文件写入；文件读写由当前 KodBox 管理员会话和权限规则执行。不会修改索引数据库、飞书机器人或 AssetLedger 台账。

## 验收

1. 打开已有 Markdown，按要求只修改一个选中段落，检查未选内容不变。
2. 查看前后差异，先放弃一次，再应用一次；应用后未点击保存前原文必须不变。
3. 另存新版本；确认原文和新文均存在。
4. 测试明确的备份后更新：原文已被其他窗口修改时应拒绝覆盖，同目录必须有备份。
5. 打开 Word，提取正文后另存，不应出现直接覆盖原 Word 的操作。
6. 回归搜索文档、飞书问答和数字资产查询。

## 限制

- 目前是 KodBox AI 助手的文档能力起点，不是企业版全部智能体/MCP。
- 修改范围暂限个人空间里的文本及 Word；不支持直接编辑 PDF/Excel。
- 单次 AI 修改上限 14000 字符，长文请分段操作。
- 文档正文及用户修改要求会交给配置的 AI 模型处理，敏感数据使用前须评估模型部署位置。
- 备份和覆盖并非数据库级原子操作，多人同时编辑仍需注意并发冲突。
