"""Contract tests for the KodBox AI assistant document editing backend."""
from __future__ import annotations
import base64
import importlib.util
import io
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from fastapi import FastAPI, HTTPException
import requests
from docx import Document

root=Path(__file__).resolve().parents[1]
rag_pkg=types.ModuleType("rag")
rag_pkg.__path__=[str(root/"service"/"rag")]
sys.modules["rag"]=rag_pkg
for name in ["context","llm","store"]:
    module=types.ModuleType("rag."+name)
    sys.modules["rag."+name]=module
sys.modules["rag.context"].answer_evidence=lambda *a,**k: ([], "no evidence")
sys.modules["rag.llm"]._validate_endpoint=lambda value:value
sys.modules["rag.store"].open_db=lambda value:None
spec=importlib.util.spec_from_file_location("rag.drafting",root/"service"/"rag"/"drafting.py")
writer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(writer)

doc=Document()
doc.add_heading("已有 Word 文档",level=1)
doc.add_paragraph("第一段文字。")
table=doc.add_table(rows=2,cols=2)
table.cell(0,0).text="项目";table.cell(0,1).text="内容"
table.cell(1,0).text="功能";table.cell(1,1).text="AI 修改"
stream=io.BytesIO();doc.save(stream)
data=stream.getvalue()
output=writer.docx_to_markdown(data)
assert "# 已有 Word 文档" in output
assert "第一段文字" in output
assert "| 项目 | 内容 |" in output
assert "| 功能 | AI 修改 |" in output
try:writer.docx_to_markdown(b"plain text is not a word file")
except ValueError:pass
else:raise AssertionError("Non-Word data accepted")
tick=chr(96)*3
assert writer.tidy_model_markdown(tick+"markdown\n# 修改后\n"+tick)=="# 修改后"

app=FastAPI()
cfg=SimpleNamespace(chat_enabled=True)
writer.register_routes(app,cfg,lambda:True,lambda *a: ([],None))
routes={r.path:r for r in app.routes}
assert {"/v1/draft","/v1/render-docx","/v1/revise","/v1/import-docx"}.issubset(routes)
assert routes["/v1/revise"].dependencies, "revision must require API key"
assert routes["/v1/import-docx"].dependencies, "Word import must require API key"
writer.chat=lambda cfg,messages: "# 修改后的版本\n\n**内容优化**"
rev=routes["/v1/revise"].endpoint(writer.ReviseRequest(
    content="# 原文",instructions="更清晰地表达",scope="full"
))
assert rev["content"]=="# 修改后的版本\n\n**内容优化**"
parsed=routes["/v1/import-docx"].endpoint(writer.ImportDocxRequest(
    data_base64=base64.b64encode(data).decode()
))
assert "# 已有 Word 文档" in parsed["content"]
# The generation endpoint must reveal a safe upstream HTTP status, without
# leaking provider body, URL, or credentials.
response=requests.Response()
response.status_code=429
writer.chat=lambda cfg,messages: (_ for _ in ()).throw(
    requests.HTTPError("secret-upstream-body",response=response))
try:
    routes["/v1/draft"].endpoint(writer.DraftRequest(topic="运维交接手册"))
except HTTPException as e:
    assert e.status_code==502 and "429" in e.detail
    assert "secret" not in e.detail
else:
    raise AssertionError("upstream rate limit should surface as a safe draft failure")
print("OK: DOCX import, revision route, safe draft HTTP diagnostics and auth")
