# aiRagLite V0.7.0 — 对话式 KodBox AI 助手

## 实现范围

- 以聊天为默认入口，支持与模型多轮追问，浏览器内临时保存最近对话，不把历史持久化到服务器。
- 在 KodBox 当前管理员会话中**主动关联**个人空间 MD/TXT/DOCX：AI 可对当前文件总结、回答问题。聊天接口不会修改原文件。
- 对费用表使用明确的金额列与币种标签做确定性统计：人民币和美元独立显示；不计入含糊、不带币种或多金额的单元格。模型没有证据时应明确说明。
- 没有关联文件时查询 RAG 知识库，附可点击的引用来源；数字资产问题仍由 KodBox PHP 读取 AssetLedger 并本地回答，不上传资产台账给 AI。
- 明确要求修改已关联文章时，只产生候选修改稿；点“查看差异并确认”会进入现有文档编辑器，检查、应用并手动保存。Word 不能直接覆盖原件。
- 明确要求创建新文章时生成草稿，点“在编辑器中检查并保存”后才创建文件。原始搜索界面和写作工具均从聊天窗口的“高级搜索 / 文档编辑”进入。

## 升级 / 首次部署

1. 从 GitHub Release 下载 **aiRagLite-v0.7.0.zip** 和 **aiRagLite-v0.7.0-rag-writer.zip**。
2. 备份当前 aiRagLite 插件目录，解压插件 ZIP 并覆盖插件文件。
3. 解压 RAG 后端 ZIP，并执行（请根据实际解压目录修改路径）：

~~~sh
sh /tmp/rag-writer/install.sh /opt/backup/data/hostdzire/compose/kodbox-ai-rag
cd /opt/backup/data/hostdzire/compose/kodbox-ai-rag
docker compose up -d --build --no-deps rag-api
docker compose exec -T rag-api python -c 'from rag.api import app; assert "/v1/assistant-chat" in [r.path for r in app.routes]; print("chat endpoint OK")'
~~~

安装脚本会备份 api.py、drafting.py、assistant_chat.py，复制新模块并保持现有 X-RAG-Key、模型配置、索引、WebDAV 权限和持久化卷。**已安装 v0.6.0 的服务器只需更新上述后端文件并重建 rag-api，不重建其他服务。**

## 使用

1. 使用 admin 登录 KodBox，强制刷新后点击右下角“AI 助手”。
2. 点击“关联文件”依次进入个人空间/我的文档/学习/短视频，选择您要分析的 md 文件；随后直接说“总结内容、指出未验证的步骤”。
3. 分析 `2026年费用.md` 时，关联后说“按币种总结费用”，金额统计独立展示，不能把人民币与美元合并。
4. 继续追问，不需要重新选择检索模式。查询 AssetLedger 时先“取消关联”，资产数据保持本地。
5. 说“帮我润色这篇文章”，审阅建议后点“查看差异并确认”进入编辑器；未应用和未确认保存前原件保持不变。

## 本阶段限制

- 当前仍需手动关联文档；**尚未**自动注入到 KodBox 原生 Markdown 编辑器或识别其未保存修改。
- Word 正文导入会丢失图片、批注和复杂排版；只支持另存新版本。
- 需要使用原有已配置的 LLM。若配置了外部模型 API，您主动关联的文件内容会发送给该模型；请注意敏感信息。
- 如果文档超过 12000 字符，本轮模型只看到前段；界面会提示截断。单次全文修改过长时会拒绝，请用已有编辑器分段修改。
- 金额核算只识别明确的 Markdown 表格金额列和币种；不识别的记录会显示未计入。不同币种不做汇率换算。
- 没有实现自由文件管理 Agent、自动移动/删除或任意命令执行；该版本以只读对话、受控写入为主。
