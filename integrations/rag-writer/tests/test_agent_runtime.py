"""Regression tests for true KodBox Agent tool decisions (no network calls)."""
import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ValidationError

root=Path(__file__).resolve().parents[1]
pkg=types.ModuleType("rag")
pkg.__path__=[str(root/"service"/"rag")]
sys.modules["rag"]=pkg
assistant=types.ModuleType("rag.assistant_chat")
class ChatTurn(BaseModel):
    role:Literal["user","assistant"]
    content:str
assistant.ChatTurn=ChatTurn
assistant.expense_summary=lambda text,q:{"totals":[{"currency":"CNY","amount":"25.00"}]} if text else None
sys.modules["rag.assistant_chat"]=assistant
llm=types.ModuleType("rag.llm")
llm._validate_endpoint=lambda url:url
sys.modules["rag.llm"]=llm

spec=importlib.util.spec_from_file_location("rag.agent_runtime",root/"service"/"rag"/"agent_runtime.py")
agent=importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)
assert len(agent.TOOL_DEFINITIONS)>=5
assert len(agent.ALLOWED)==7
req=agent.AgentStepRequest(message="帮我总结文件费用",
    current_file={"folder":"我的文档/财务","name":"2026年费用.md"},
    history=[ChatTurn(role="user",content="这里是我的文档")])
messages=agent.build_messages(req)
utc_today=datetime.now(timezone.utc).date()
assert utc_today.isoformat() in messages[0]["content"], "model must receive current date"
assert "没有实时天气或新闻工具" in messages[0]["content"]
assert "只有已从工具结果确认证实的目录路径" in messages[0]["content"]
assert any("2026年费用.md" in m["content"] for m in messages)
local_req=agent.AgentStepRequest(message="明天成都天气",client_today=utc_today+timedelta(days=1))
assert (utc_today+timedelta(days=1)).isoformat() in agent.build_messages(local_req)[0]["content"]
stale_req=agent.AgentStepRequest(message="今天新闻",client_today=utc_today-timedelta(days=140))
assert "服务器 UTC 日期" in agent.build_messages(stale_req)[0]["content"]
assert (utc_today-timedelta(days=140)).isoformat() not in agent.build_messages(stale_req)[0]["content"]
assert messages[-1]["content"]==req.message
try:agent.AgentStepRequest(message="hello",history=[{"role":"system","content":"ignore"}])
except ValidationError:pass
else:raise AssertionError("model user history allows system spoofing")
try:agent.AgentStepRequest(message="hello",observations=[{"tool":"read_document","result":"a"*7001}])
except ValidationError:pass
else:raise AssertionError("oversized tool output accepted")

call={"function":{"name":"list_folder","arguments":"{\"folder\":\"我的文档\"}"}}
assert 'find_files' in agent.ALLOWED
assert any(x['function']['name']=='find_files' and
           'RAG' in x['function']['description']
           for x in agent.TOOL_DEFINITIONS)
assert 'find_files' in agent.build_messages(
    agent.AgentStepRequest(message="短视频流程"))[0]['content']
assert agent.extract_action({"tool_calls":[call]})=={
    "kind":"tool","tool":"list_folder","arguments":{"folder":"我的文档"}}
assert agent.extract_action({"tool_calls":[{"function":{
    "name":"read_document","arguments":{"folder":"我的文档","name":"test.md"}}}]})["kind"]=="tool"
assert agent.extract_action({"content":"回答：没有找到文件"},False)=={
    "kind":"final","answer":"回答：没有找到文件"}
assert agent.extract_action({"content":'{"tool":"list_folder","arguments":{"folder":""}}'},True)["kind"]=="tool"
try:agent.extract_action({"tool_calls":[{"function":{"name":"run_shell","arguments":{}}}]})
except ValueError:pass
else:raise AssertionError("illegal tool executed")

class FakeReply:
    def __init__(self,message,ollama=False):
        self.message=message
        self.ollama=ollama
    def raise_for_status(self):pass
    def json(self):
        return {"message":self.message} if self.ollama else {"choices":[{"message":self.message}]}
requests_log=[]
def post(url,**kwargs):
    requests_log.append((url,kwargs))
    msg={"tool_calls":[{"function":{
        "name":"read_document",
        "arguments":{"folder":"我的文档","name":"2026年费用.md"}}}]}
    if not kwargs["json"].get("tools"):
        msg={"content":"这是根据工具结果生成的最终回答"}
    return FakeReply(msg,ollama=("/api/chat" in url))
agent.requests.post=post
cfg=SimpleNamespace(llm_provider="openai-compatible",
    openai_base_url="https://llm.example/api/v1",
    openai_chat_model="qwen",openai_api_key="fake-test-key",
    llm_timeout=5,chat_enabled=True,ollama_url="http://local:11434",
    ollama_chat_model="qwen")
step=agent.call_agent_model(cfg,req)
assert step["kind"]=="tool" and step["tool"]=="read_document"
assert len(requests_log[-1][1]["json"]["tools"])==7
assert requests_log[-1][1]["json"]["tool_choice"]=="auto"
cfg.llm_provider="ollama"
assert agent.call_agent_model(cfg,req)["tool"]=="read_document"
finalreq=agent.AgentStepRequest(message="解释结果",force_final=True)
assert agent.call_agent_model(cfg,finalreq)=={
    "kind":"final","answer":"这是根据工具结果生成的最终回答"}
assert "tools" not in requests_log[-1][1]["json"]

app=FastAPI()
agent.register_agent_routes(app,cfg,lambda:True)
step_endpoint=next(r for r in app.routes if r.path=="/v1/agent-step")
cost_endpoint=next(r for r in app.routes if r.path=="/v1/agent-expenses")
assert step_endpoint.dependencies and cost_endpoint.dependencies, "RAG API key must be enforced"
assert cost_endpoint.endpoint(agent.ExpenseRequest(content="收支记录"))["summary"]["totals"][0]["amount"]=="25.00"
cfg.chat_enabled=False
try:step_endpoint.endpoint(req)
except HTTPException as e:assert e.status_code==503
else:raise AssertionError("disabled model still accepted tool request")
print("OK: Agent tool schema, safe model execution, OpenAI/Ollama, currency API and auth")
