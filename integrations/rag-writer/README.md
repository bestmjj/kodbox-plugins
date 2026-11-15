# aiRagLite v0.8.0 — 有工具调用能力的 KodBox AI Agent

## 与 v0.7.0 的区别

v0.7.0 默认聊天，但主要还是 RAG 问答 + 文档编辑器，没有真正调用 KodBox 文件工具。v0.8.0 增加独立 Agent tool-call 通道：模型发起函数调用，KodBox 当前管理员会话检验权限并执行，结果回传模型，多轮调用上限 4 次。

| Agent 工具 | 可执行操作 | 限制 |
|---|---|---|
| list_folder | 列出个人空间里的文件/子目录，不限于 RAG 文件格式 | 每类最多100项，只读 |
| read_document | 读取个人空间 Markdown/TXT/Word 正文 | 单次给模型前5500字符，标注截断；Word 不保留全部格式 |
| search_knowledge | 检索已有 RAG 知识库片段 | 只是可选搜索工具；打开原文件仍受 KodBox 权限限制 |
| calculate_expenses | 按文件中的明确币种进行确定性费用核算 | CNY/USD 分别统计；模糊记录不算 |
| prepare_edit | 生成已有文档修改建议 | 在同一聊天窗口并排审阅原文和建议稿，需确认才能保存 |
| prepare_new_document | 起草新文档 | 在聊天审阅框中修改正文并确认后才保存 |

**安全原则**：`rag_reader` 仍为只读索引账号。Agent 的文件工具走 KodBox 当前管理员会话，文件夹定位通过目录枚举检查权限。模型不持有 KodBox 密钥，也没有任意命令、删除、移动、覆盖操作权限。

## 界面入口与原有文档

右下角进入主 AI 助手；旧的搜索界面仍可从“高级搜索”打开。旧搜索页面原来标成「✨ AI 助手」但实际打开文档编辑器，这是 v0.7.0 的真实 UI 缺陷。v0.8.0 把它明确改名为「文档编辑」，文档编辑器顶部增加「返回 AI 助手」，可携带已打开的文件和未发送的写作要求回到聊天。

若 KodBox 当前页面 URL 有 #fileView&path=...，会尝试根据当前用户可访问的个人空间枚举定位文件。受目录数量上限影响无法定位时仍可使用“关联文件”，不应声称所有文件都会自动关联。

## 升级

下载 Release 的 `aiRagLite-v0.8.0.zip` 和 `aiRagLite-v0.8.0-rag-writer.zip`。
更新插件目录，配套后端安装脚本会备份已有 rag 文件并增加 `agent_runtime.py`；随后仅重建 rag-api：

~~~sh
sh /tmp/rag-writer/install.sh /opt/backup/data/hostdzire/compose/kodbox-ai-rag
cd /opt/backup/data/hostdzire/compose/kodbox-ai-rag
docker compose up -d --build --no-deps rag-api
docker compose exec -T rag-api python -c 'from rag.api import app; assert "/v1/agent-step" in [r.path for r in app.routes]; print("Agent OK")'
~~~

## 验收

1. 右下角进入 Agent，说“列出个人空间我的文档下面有哪些文件”，应显示正在调用 list_folder，并使用真实目录清单回答。
2. 打开已有 `2026年费用.md` 后点击「返回 AI 助手」，直接问“总结今年费用”；应调用 calculate_expenses，分别给出币种和未计入记录。
3. 说“把这份文档第三部分重新整理”，应先执行 prepare_edit，并在当前对话展示原文和可编辑建议稿，**不会直接保存**。
4. 测试跨文件知识库问答，确认 search_knowledge 工具仍可用。
5. 测试 AssetLedger 资产问题，必须本地直接答复，不能外发台账或将其注入下轮模型上下文。

## 暂未实现

- 完整企业版的自定义 Agent / MCP Server、多模态、模型管理、自动邮件发送等功能。
- 自动移动、批量重命名、删除文件（需要额外的操作计划和人工审批设计）。
- 所有 KodBox 弹窗内的未保存编辑内容自动同步（目前只能关联已保存原文）。
- 当前模型若缺乏 tool_calls 能力，可能只能普通问答，不能完成文件工具操作；本版会明确报告模型不兼容。请使用支持函数调用的模型。
- Word 编辑的复杂格式/图片无法无损更新原件。
