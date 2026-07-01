---
title: "Agent 設計模式圖鑑 Part 10｜如何用 Agent Framework 實作這些模式：從概念到程式架構"
description: "比較 Native Code、LangGraph、LlamaIndex Workflows、CrewAI、OpenAI Agents SDK、AutoGen 與 Microsoft Agent Framework，說明 State Machine、RAG Workflow、Multi-Agent、Computer-use 與 Production Control Plane 應如何落地。"
date: 2026-07-01T15:23:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 10
bonus: true
last_reviewed: "2026-06-30"
---

## Implementing Agent Patterns with Modern Frameworks

> **更新基準：2026-06-30**
> 這篇是整個系列唯一刻意依賴具名 Framework 的文章。框架 API、產品名稱、部署服務與維護狀態都可能改變，實作前應再次核對官方文件。

前九篇，我們刻意不依賴特定 Framework。

原因很簡單：

- ReAct 不屬於某一家公司
- State Machine 不屬於某一套 SDK
- Supervisor–Worker 不是某個產品功能
- Working Memory 也不等於某一種資料庫

這些是架構模式。

Framework 則是把模式落地的工具。

需要先回答的問題是：

> **知道自己要實作哪種模式之後，該選哪種 Framework、何時不用 Framework，以及如何避免架構被單一 Framework 綁死？**

---

## 一句話定義

> **Agent Framework 是實作與執行 Agent Pattern 的軟體抽象、Runtime 與工具集合；它不是架構決策本身。**

例如，你已經決定系統需要：

```text
Router
 ↓
State Machine
 ↓
RAG Retrieval
 ↓
Agentic Research Node
 ↓
Verifier
 ↓
Human Approval
```

接下來才是 Framework 問題：

- State 與 Transition 要自己寫，還是交給 LangGraph？
- Retrieval 與 Document Pipeline 是否以 LlamaIndex 為中心？
- Multi-Agent 是否真的需要 CrewAI、AutoGen 或 Microsoft Agent Framework？
- Agent Loop、Handoff、Guardrail 與 Trace 是否適合 OpenAI Agents SDK？
- 整個流程其實是否只需要普通 Python？

![Figure 10-1 — Patterns, Frameworks, and Infrastructure](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-1-patterns-frameworks-infrastructure.png)

> **Figure 10-1｜Patterns, Frameworks, and Infrastructure**
> Pattern 定義系統如何設計；Framework 提供實作抽象與 Runtime；Infrastructure 負責 Queue、Database、Sandbox、Observability、Deployment 與 Security。三者不能混為同一層。

---

## 一、先建立正確的三層模型

### Layer 1：Architecture Patterns

這一層包含：

- Direct
- Pipeline
- Router
- State Machine
- DAG
- ReAct
- Plan-and-Execute
- Generate-and-Test
- Supervisor–Worker
- Verifier
- Working Memory
- Human Approval

它回答：

> 系統應該怎麼運作？

### Layer 2：Framework and Runtime

這一層包括：

- Native Python
- LangGraph
- LlamaIndex Workflows
- CrewAI
- OpenAI Agents SDK
- AutoGen
- Microsoft Agent Framework

它回答：

> 我們用什麼抽象、Runtime 與 API 實作？

### Layer 3：Infrastructure and Operations

這一層包括：

- PostgreSQL
- Redis
- Vector Database
- Queue
- Object Storage
- Sandbox
- Secret Manager
- Trace Backend
- Policy Engine
- Audit Log

它回答：

> 系統如何持久化、部署、隔離、觀察與運營？

### 三個常見錯誤

#### 把 Framework 當成 Pattern

```text
我們的架構是 LangGraph。
```

這句話資訊不足。LangGraph 裡面可以實作 Pipeline、State Machine、ReAct、Plan-and-Execute 與 Human-in-the-loop。

#### 把 Framework 當成 Infrastructure

Framework 提供 Checkpoint API，不代表已完成資料備份、Tenant Isolation、Production Queue 與 Disaster Recovery。

#### 把 Tool Integration 當成 Safety

能呼叫 Tool，不代表有最小權限、Approval、Idempotency 與 Post-condition Verification。

---

## 二、2026 年的實作選項地圖

本文比較七條實作路線：

1. Native Code
2. LangGraph
3. LlamaIndex Workflows
4. CrewAI
5. OpenAI Agents SDK
6. AutoGen
7. Microsoft Agent Framework

它們不是同一類產品。有些偏 Stateful Orchestration，有些偏 Data / RAG，有些偏 Lightweight Agent Loop，有些偏 Multi-Agent，有些偏 Microsoft Enterprise Stack。

因此，不能只用一張「功能有沒有打勾」的表格決定。

---

## 三、Native Code：最被低估的選項

Native Code 指使用普通程式結構實作：

- Function
- Class
- Enum
- Queue
- Database
- State Table
- Retry Library
- Background Worker
- HTTP API

例如：

```python
from enum import Enum
from pydantic import BaseModel


class Status(str, Enum):
    PLAN = "plan"
    RETRIEVE = "retrieve"
    VERIFY = "verify"
    COMPLETE = "complete"
    FAILED = "failed"


class TaskState(BaseModel):
    task_id: str
    status: Status
    retry_count: int = 0
    plan_version: int = 1
    last_error: str | None = None
```

接著用普通控制流程：

```python
def run_task(state: TaskState) -> TaskState:
    if state.status == Status.PLAN:
        return plan(state)
    if state.status == Status.RETRIEVE:
        return retrieve(state)
    if state.status == Status.VERIFY:
        return verify(state)
    return state
```

### 適合什麼？

- 流程很小
- 狀態很少
- 團隊不想引入新的 Runtime
- 業務規則遠多於 Agent 行為
- 需要極高可控性
- 一個 Queue + Database 已足夠

### 優點

- 最低抽象負擔
- 容易 Debug
- 依賴少
- 容易做 Unit Test
- 遷移成本低

### 缺點

需要自己處理：

- Checkpoint
- Resume
- Event Streaming
- Human Interruption
- Trace
- State Migration
- Tool Loop

### 判斷原則

> 如果用二十到五十行清楚的普通程式就能完成，不要先引入一個新的 Agent Runtime。

---

## 四、LangGraph：適合低階、明確、Stateful 的 Orchestration

LangGraph 的核心定位是低階 Agent Orchestration Runtime。

它適合：

- State Machine
- Graph Workflow
- Long-running Agent
- Durable Execution
- Human-in-the-loop
- Checkpoint / Resume
- 明確控制 Node 與 Edge
- Deterministic + Agentic Hybrid

### 心智模型

```text
State
 ↓
Node
 ↓
Edge
 ↓
New State
```

簡化骨架：

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(AppState)
builder.add_node("route", route_request)
builder.add_node("retrieve", retrieve_documents)
builder.add_node("agent", run_agent)
builder.add_node("verify", verify_result)

builder.add_edge(START, "route")
builder.add_conditional_edges("route", choose_path)
builder.add_edge("retrieve", "verify")
builder.add_edge("agent", "verify")
builder.add_edge("verify", END)

graph = builder.compile(checkpointer=checkpointer)
```

### 最適合的模式

- Router
- State Machine
- DAG-like Graph
- Plan-and-Execute
- Adaptive Replanning
- Human Approval
- Retry / Repair / Replan
- Long-running Workflow

### 優點

- State 是一等公民
- Node 與 Edge 邊界清楚
- 固定節點與 Agentic Node 可以共存
- 適合 Pause / Resume

### 缺點

- 抽象較低階
- Graph 不等於正確架構
- 團隊需要理解 Checkpoint 與 Side Effect 的差別
- 大型 Graph 容易變成另一種義大利麵，只是這次麵條會發光

### 適合誰？

- 想明確掌控流程的工程團隊
- 已知道自己的 State Machine 長什麼樣
- 需要長任務、審批與恢復
- 不想被高階 Persona 抽象限制

---

## 五、LlamaIndex Workflows：適合 Data-centric 與 RAG-centric 的 Event Workflow

LlamaIndex 的強項與資料、索引、Retrieval、Query Engine 和 RAG 密切相關。

Workflows 提供 Event 與 Step 的執行模型。

### 心智模型

```text
Event
 ↓
Step
 ↓
New Event
 ↓
Another Step
```

簡化骨架：

```python
from llama_index.core.workflow import (
    Workflow,
    step,
    StartEvent,
    StopEvent,
    Event,
    Context,
)


class RetrievedEvent(Event):
    nodes: list


class RAGWorkflow(Workflow):

    @step
    async def retrieve(
        self,
        ctx: Context,
        ev: StartEvent,
    ) -> RetrievedEvent:
        nodes = await retriever.aretrieve(ev.query)
        return RetrievedEvent(nodes=nodes)

    @step
    async def answer(
        self,
        ctx: Context,
        ev: RetrievedEvent,
    ) -> StopEvent:
        answer = await synthesize(ev.nodes)
        return StopEvent(result=answer)
```

### 最適合的模式

- RAG Pipeline
- Query Routing
- Retrieval Retry
- Document Processing
- Event-driven Research
- Agent Workflow over Data
- Structured Output
- MCP-connected Data Tools

### 優點

- 與 Retriever、Index、Query Engine、Document、Node 等資料抽象距離近
- Event Model 適合資料流程
- 固定 Retrieval Flow 中可以放入 Agent 或 Tool Node

### 缺點

- 不應把所有業務工作都資料化
- Event 太多時可能難以追蹤
- Domain Model 若直接依賴 Framework Event，遷移成本會增加

### 適合誰？

- RAG 開發者
- Knowledge Assistant
- Document Workflow
- 已大量使用 LlamaIndex 資料元件的團隊

---

## 六、CrewAI：用 Crews 表達協作，用 Flows 表達控制

CrewAI 有兩個不同心智模型。

### Crews

適合：

- Role-based Agents
- Researcher / Analyst / Writer
- Sequential or Hierarchical Process
- Specialized Tools
- Collaborative Tasks

### Flows

適合：

- Event-driven Workflow
- State
- Router
- Conditional Branch
- Persistence
- Resume
- 在固定流程中嵌入 Crew

### 正確組合

```text
CrewAI Flow
 ↓
Deterministic Steps
 ↓
One Crew for an Open-ended Subtask
 ↓
Verifier
 ↓
Continue Workflow
```

不是：

```text
Every Step
 ↓
Create Another Agent
```

### 優點

- Agent、Task、Crew、Process 容易理解
- Flow 可以維持控制，再於特定節點加入 Crew
- 適合快速驗證角色分工是否有價值

### 缺點

- Persona 容易掩蓋工程責任
- 容易 Multi-Agent Inflation
- 必須額外審查 Side Effect、Tool Permission 與 Final Owner

### 適合誰？

- 需要快速做角色協作原型
- 內容、研究、分析型任務
- 想用 Flow 管整體、Crew 處理局部自治

---

## 七、OpenAI Agents SDK：少量 Primitive 的 Agent Runtime

OpenAI Agents SDK 採用較少的核心 Primitive：

- Agent
- Runner
- Tool
- Handoff / Agent as Tool
- Guardrail
- Session
- Tracing
- Human-in-the-loop
- Sandbox Agent

### 心智模型

```text
Agent
 ↓
Runner
 ↓
Tool Calls / Handoff
 ↓
Guardrails
 ↓
Final Output
```

簡化骨架：

```python
from agents import Agent, Runner, function_tool


@function_tool
def search_blog(query: str) -> str:
    return retrieve_from_blog(query)


agent = Agent(
    name="Blog Assistant",
    instructions="Answer only from approved blog sources.",
    tools=[search_blog],
)

result = Runner.run_sync(
    agent,
    "What is the difference between RAG and memory?",
)
```

### 最適合的模式

- Tool-using Agent
- Manager + Agents as Tools
- Handoff
- Guardrail
- Session-based Working Context
- Traced Agent Run
- Sandbox Coding / Document Tasks
- Voice / Realtime Agent

### 優點

- Primitive 少
- Agent Loop 已提供
- Handoff 與 Manager Pattern 都可表達
- Built-in Trace

### 缺點

- 不等於完整 Business Workflow Engine
- Guardrail Scope 必須精確理解
- Provider 與 Hosted Tool 選擇需評估 Lock-in

### 適合誰？

- 想快速建立 Tool-using Agent
- 使用 OpenAI Model 與 Hosted Tools
- 需要 Handoff、Trace、Session
- 不需要複雜 Graph，但又不想自己寫 Agent Loop

---

## 八、AutoGen：仍可用，但 2026 年必須理解其位置

AutoGen 目前仍有：

- AgentChat
- Core
- Extensions
- Studio
- Teams
- Swarm
- Code Executor
- Distributed Runtime

AgentChat 適合高階 Single / Multi-Agent；Core 則是較低階 Event-driven Runtime。

### 適合什麼？

- 已有 AutoGen 0.4+ 專案
- Multi-Agent Research
- Agent Team Prototype
- Event-driven Agent Runtime
- Distributed Multi-Agent Experiment
- Docker Code Execution

### 2026 年的重要變化

Microsoft 已將 Microsoft Agent Framework 定位為 AutoGen 與 Semantic Kernel 的直接後繼者。

因此，新專案應先判斷：

- 是否已有 AutoGen Codebase？
- 是否需要相容既有 Component？
- 是否是研究與原型？
- 是否願意評估 Microsoft Agent Framework？
- 是否能承受遷移與 API 變化？

這不代表 AutoGen 立刻不能用。它仍有穩定文件與既有生態，但新 Microsoft-centric Production Project 應把 AutoGen 與 Microsoft Agent Framework 的差異列為正式架構決策。

---

## 九、Microsoft Agent Framework：AutoGen 與 Semantic Kernel 的後繼路線

Microsoft Agent Framework 提供兩大類能力：

- Agents
- Graph-based Workflows

並整合：

- Session-based State
- Type-safe Routing
- Checkpointing
- Middleware
- Telemetry
- Human-in-the-loop
- MCP
- 多 Provider
- Python 與 .NET

### 最適合的模式

- Microsoft / Azure 生態
- Graph Workflow
- Multi-Agent Orchestration
- Session State
- Human Approval
- Middleware Policy
- Enterprise Telemetry
- Python + .NET 團隊

### 優點

- Workflow 與 Agent 同時存在
- 企業整合方向清楚
- 適合 AutoGen / Semantic Kernel 的未來評估

### 主要風險

- 目前仍是 Public Preview
- API、功能與部署方式可能變動
- Microsoft 生態不等於自動安全
- 已有穩定系統不應因為新框架出現就立刻整套搬家

![Figure 10-2 — Framework Fit by Architecture Pattern](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-2-framework-fit-by-pattern.png)

> **Figure 10-2｜Framework Fit by Architecture Pattern**
> 不同 Framework 的重心不同：LangGraph 偏 Stateful Orchestration，LlamaIndex Workflows 偏 Data/RAG，CrewAI 偏 Crew + Flow，OpenAI Agents SDK 偏 Lightweight Agent Runtime，而 Microsoft Agent Framework 偏 Microsoft 生態中的 Agent + Graph Workflow。

---

## 十、哪些框架適合 State Machine？

### 第一優先：Native Code

如果 State 很少、流程很固定，普通 Enum、Database 與 Function 最乾淨。

### 強控制型：LangGraph

適合：

- 明確 Node / Edge
- Conditional Routing
- Pause / Resume
- Checkpoint
- Long-running Task

### Data-centric：LlamaIndex Workflows

適合：

- Event-driven Retrieval
- Document Processing
- RAG State
- Data Agent

### High-level Hybrid：CrewAI Flows

適合：

- Start / Listen / Router
- State Persistence
- 在 Flow 中嵌入 Crew

### Microsoft Stack：Microsoft Agent Framework Workflows

適合：

- Graph Workflow
- Type-safe Routing
- Checkpointing
- Human-in-the-loop
- Python / .NET

### 不要只看「支援 State」

真正要問：

- State Schema 是否由你掌控？
- State 能否版本化？
- Resume 是否重播 Side Effect？
- Human Approval 後是否重新驗證？
- Checkpoint 是否可遷移？

---

## 十一、哪些框架適合 RAG Workflow？

### LlamaIndex Workflows

最自然的選擇之一，因為資料、Retriever、Index 與 Workflow 在同一生態。

### LangGraph

適合複雜 Agentic RAG：

- Query Router
- Rewrite
- Multi-source Retrieval
- Retry
- Verifier
- Human Review

### Native Code

如果流程只是：

```text
Retrieve → Rerank → Generate → Verify
```

普通 Pipeline 常常已足夠。

### CrewAI

適合讓 Flow 管理 RAG Pipeline，再讓 Crew 處理 Research / Synthesis。

### OpenAI Agents SDK

適合使用 File Search、MCP 或 Function Tool，讓 Agent 判斷何時檢索。若需要嚴格 Citation Mapping，仍需外層資料層與 Verifier。

---

## 十二、哪些框架適合 Multi-Agent？

### CrewAI

高階角色協作最直觀。

### AutoGen

適合 AgentChat Teams、Selector Group、Swarm 與 Multi-Agent Research。

### Microsoft Agent Framework

適合新 Microsoft-centric Multi-Agent Workflow，但要考慮 Public Preview。

### OpenAI Agents SDK

適合 Manager + Agents as Tools、Handoff 與少量 Agent 的明確協作。

### LangGraph

適合自己定義 Supervisor–Worker，讓 Multi-Agent 只是 Graph 中的 Node。

### 判斷關鍵

不是「能不能建立多 Agent」，而是：

- 誰負責 Task Assignment？
- Context 如何傳遞？
- Worker Output Contract 是什麼？
- 誰處理 Conflict？
- 誰是 Final Owner？
- 如何停止？

![Figure 10-3 — Workflow-Centric Frameworks](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-3-workflow-centric-frameworks.png)

> **Figure 10-3｜Workflow-Centric Frameworks**
> LangGraph 以 State、Node、Edge 為核心；LlamaIndex Workflows 以 Event、Step、Context 為核心；CrewAI Flows 以 Start、Listen、Router 與 State 為核心。三者都能做 Workflow，但心智模型不同。

![Figure 10-4 — Multi-Agent Runtime Choices](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-4-multi-agent-runtime-choices.png)

> **Figure 10-4｜Multi-Agent Runtime Choices**
> CrewAI 強調 Crew、Role 與 Task；AutoGen 強調 AgentChat、Teams 與 Event-driven Core；Microsoft Agent Framework 結合 Agent 與 Graph Workflow；OpenAI Agents SDK 以 Handoff、Agents as Tools 與少量 Primitive 表達協作。

---

## 十三、哪些框架適合 Computer-use？

Computer-use 不是完整架構，而是一種高風險、Observation-driven 的 Tool Runtime。

完整系統仍需要：

```text
State Machine
 ↓
Observe
 ↓
Policy Check
 ↓
Action
 ↓
Post-condition Verification
 ↓
Recover / Human Takeover
```

### LangGraph

適合把 Browser State、Action History、Retry 與 Human Takeover 放進 Graph。

### OpenAI Agents SDK

適合使用 Agent Loop、Built-in Tool、Sandbox、Trace 與 Human-in-the-loop。

### AutoGen

適合搭配 Code Executor、Agent Team 與工具 Runtime 做研究或原型。

### Microsoft Agent Framework

適合 Microsoft Stack 的 Agent + Workflow 整合，但仍需自行處理 Computer-use Policy 與 UI State。

### CrewAI

可以把 Browser Tool 放入 Agent，但應由 Flow 控制高風險 Transition。

### 原則

> 不要因為 Framework 提供 Browser Tool，就跳過 State、Approval、Duplicate Detection 與 Post-condition。

---

## 十四、同一個任務如何映射到不同 Framework？

任務：

> 建立可恢復的站內研究 Agent：先判斷問題是否能 Direct 回答，否則檢索文章；若證據不足，最多改寫一次 Query；通過 Citation Verifier 後輸出，否則 Abstain。

### 架構模式

```text
Router
 ↓
RAG Pipeline
 ↓
Bounded Rewrite
 ↓
Citation Verifier
 ↓
Complete / Abstain
```

### Native Code

使用 Enum State、Python Function、Database Row 與 Explicit Retry Counter。

### LangGraph

使用 StateGraph、Conditional Edge、Checkpointer 與 Verifier Node。

### LlamaIndex Workflows

使用 Query Event、Retrieved Event、Verification Event、Context 與 Retriever / Reranker。

### CrewAI

使用 Flow 管整體，Optional Research Crew 處理深度研究，Verifier Step 收尾。

### OpenAI Agents SDK

使用 Router Agent 或 Python Route、Retrieval Function Tool / MCP、Guardrail、Session 與 Trace。若嚴格控制 Rewrite Count，應在外層 Python State 保存。

### Microsoft Agent Framework

使用 Explicit Workflow、Agent Node、Session State、Checkpoint、Middleware 與 Telemetry。

---

## 十五、完整框架比較表

| 選項 | 核心心智模型 | 最適合 | Stateful Workflow | RAG | Multi-Agent | Human-in-the-loop | 抽象層級 | 主要風險 |
|---|---|---|---:|---:|---:|---:|---:|---|
| Native Code | Function + State + DB | 小型固定流程 | 自行實作 | 自行組裝 | 自行實作 | 自行實作 | 最低 | 重造 Runtime |
| LangGraph | State + Node + Edge | Stateful Hybrid Workflow | 強 | 強 | 可自訂 | 強 | 低～中 | Graph 複雜度 |
| LlamaIndex Workflows | Event + Step + Context | RAG / Data Workflow | 中～強 | 很強 | AgentWorkflow | 可實作 | 中 | Data 抽象滲透 |
| CrewAI | Crew + Task + Flow | Role Collaboration | Flow 支援 | 中 | 很強 | 支援 | 高 | Multi-Agent Inflation |
| OpenAI Agents SDK | Agent + Runner + Tool | Lightweight Agent Runtime | Session / Outer State | Tool-based | Handoff / Manager | 支援 | 中 | Provider / Guardrail Scope |
| AutoGen | AgentChat + Core | Existing Multi-Agent / Research | Core 支援 | 工具組裝 | 很強 | 支援 | 中～高 | 生態轉型與遷移 |
| Microsoft Agent Framework | Agent + Graph Workflow | Microsoft Enterprise Stack | 很強 | 可整合 | 強 | 強 | 中 | Public Preview 變動 |

---

## 十六、原生程式碼何時比 Framework 更好？

使用 Native Code，如果：

- 只有三到五個步驟
- 沒有真正 Agent Loop
- 不需要 Resume
- 不需要 Human Interruption
- 不需要 Dynamic Graph
- 不需要 Multi-Agent
- 團隊已有成熟 Queue / Workflow System
- Framework State Model 與 Domain Model 衝突

使用 Framework，如果：

- 需要 Checkpoint / Resume
- 需要複雜 Conditional Routing
- 需要 Agent Loop
- 需要 Trace Integration
- 需要 Human-in-the-loop
- 需要快速測試 Multi-Agent Pattern
- Framework 明顯減少重複工程

![Figure 10-5 — Native Code or Framework?](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-5-native-code-or-framework.png)

> **Figure 10-5｜Native Code or Framework?**
> 小型固定流程優先使用普通程式；當 Checkpoint、Resume、Dynamic Routing、Agent Loop、Human Interruption 或 Multi-Agent Runtime 的收益大於抽象成本時，再引入 Framework。

---

## 十七、降低 Framework Lock-in 的程式架構

比起選對一個永遠不變的 Framework，更重要的是：

> 讓 Domain Logic 不依賴 Framework 的每一個型別。

### 建議分層

```text
Application API
 ↓
Domain Workflow
 ↓
Ports / Interfaces
 ↓
Framework Adapter
 ↓
Model / Tool / Storage Provider
```

### Domain State 應由你定義

```python
class ResearchState(BaseModel):
    task_id: str
    query: str
    rewritten_query: str | None = None
    retrieved_source_ids: list[str] = []
    retry_count: int = 0
    status: str
```

### Tool Contract 應獨立

```python
from typing import Protocol


class RetrieverPort(Protocol):
    async def retrieve(
        self,
        query: str,
        tenant_id: str,
    ) -> list["SourceRecord"]:
        ...
```

接著才建立：

- LlamaIndexRetrieverAdapter
- LangGraphNodeAdapter
- OpenAIFunctionToolAdapter
- CrewAIToolAdapter

### Verifier 應獨立

```python
class VerificationResult(BaseModel):
    passed: bool
    reasons: list[str]
    required_action: str
```

不要讓每個 Framework 自己發明不同的 Pass / Fail 格式。

### Trace Context 應可跨 Framework

至少保留：

- trace_id
- task_id
- user_id / tenant_id
- parent_span_id
- model_version
- prompt_version
- framework_version

### Side Effect 應放在明確邊界

例如：

- Send Email
- Write Database
- Deploy
- Purchase
- Delete

不要埋在不透明 Agent Persona 中。

![Figure 10-6 — Framework-Resilient Production Architecture](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-6-framework-resilient-production-architecture.png)

> **Figure 10-6｜Framework-Resilient Production Architecture**
> Domain State、Tool Contract、Verifier 與 Policy 位於 Framework 之外；LangGraph、LlamaIndex、CrewAI、OpenAI Agents SDK、AutoGen 或 Microsoft Agent Framework 僅作為 Adapter 與 Runtime，降低遷移成本。

---

## 十八、Framework 選型決策樹

```text
Can ordinary code express the workflow clearly?
├─ Yes → Native Code
└─ No
 ↓
Is the core problem stateful orchestration?
├─ Yes → LangGraph or Microsoft Agent Framework
└─ No
 ↓
Is the core problem RAG or data workflow?
├─ Yes → LlamaIndex Workflows
└─ No
 ↓
Is role-based collaboration the main value?
├─ Yes → CrewAI
└─ No
 ↓
Do you need a lightweight tool-using agent runtime?
├─ Yes → OpenAI Agents SDK
└─ No
 ↓
Do you have an existing AutoGen system or research need?
├─ Yes → AutoGen, with migration review
└─ No → Revisit architecture requirements
```

---

## 十九、常見實作反模式

| 反模式 | 問題 | 修正 |
|---|---|---|
| Framework-first Architecture | 先選工具再改需求 | 先完成 Architecture Canvas |
| Framework Type Leakage | Domain 依賴 Event / Message 類型 | 建立 Adapter |
| Agent for Every Step | 每個 Function 都包成 Agent | 固定步驟保留為 Function |
| Hidden Side Effects | 寫入藏在 Persona Tool 裡 | 專用 Node + Approval Gate |
| Checkpoint Equals Transaction | 重播造成重複操作 | Idempotency + Compensation |
| Framework Trace Equals Audit | Trace 無法滿足業務審計 | 獨立 Audit Log |
| Multi-Agent by Persona | 角色名稱冒充獨立責任 | 檢查 Context、State、Permission |
| Preview Framework in Critical Path | 變動直接衝擊核心流程 | Pin Version + Adapter + Pilot |
| No Exit Strategy | 無法遷移 | 外置 Domain State 與 Contract |
| Copying Tutorial Architecture | 教學範例被當 Production | 補 Security、Reliability、Cost、Scale |

---

## 二十、Production Notes

### Version Pinning

保存：

- Framework Version
- Model Version
- Prompt Version
- Tool Version
- State Schema Version

### State Migration

每次改 State Schema 前回答：

- 舊 Checkpoint 能否讀取？
- 正在執行的 Task 怎麼辦？
- 是否需要 Migration Job？
- 是否可 Rollback？

### Timeout

分開設定：

- Model Timeout
- Tool Timeout
- Node Timeout
- Workflow Timeout
- Approval Timeout

### Budget

限制：

- Model Calls
- Tool Calls
- Search Calls
- Agent Turns
- Workers
- Replans
- Wall Time

### Evaluation

至少分成：

- Unit Test
- Workflow Test
- Golden Set
- Failure-path Test
- Security Test
- Cost Regression
- Latency Regression

### Observability

追蹤：

- Route
- State Transition
- Tool Call
- Token
- Cost
- Retry
- Handoff
- Verifier Result
- Terminal State

### Human Approval

Approval Payload 至少包含：

- Proposed Action
- Evidence
- Risk
- Before / After
- Reversibility
- Expiry

---

## 二十一、一頁式 Cheat Sheet

| 需求 | 優先考慮 | 不要先做 |
|---|---|---|
| 小型固定流程 | Native Code | 引入完整 Agent Runtime |
| Stateful Agent | LangGraph | 把 State 藏在 Conversation |
| Data / RAG Workflow | LlamaIndex Workflows | 每個 Retrieval 都變 Agent |
| Role Collaboration | CrewAI | 沒有 Final Owner 的 Crew |
| Lightweight Tool Agent | OpenAI Agents SDK | 把它當完整 Business Workflow Engine |
| Existing AutoGen | AutoGen + Migration Review | 直接照 0.2 舊範例 |
| Microsoft New Build | Microsoft Agent Framework Evaluation | 忽略 Public Preview 風險 |
| Computer-use | State Machine + Tool Runtime | 只靠 Browser Tool |
| High-risk Action | Native Policy + Approval + Audit | 把權限寫在 Prompt |
| Framework Uncertainty | Ports and Adapters | 讓 Domain 依賴 Framework Type |

---

## 本篇結論

Framework 的價值是：

- 減少重複工程
- 提供 Runtime
- 提供 Agent Loop
- 提供 State、Trace 或 Handoff
- 加快特定模式落地

Framework 的風險是：

- 抽象掩蓋真實流程
- Domain 被型別綁定
- API 快速變化
- Tutorial 被誤當 Production Architecture
- Multi-Agent 角色膨脹
- Checkpoint 被誤認為 Transaction

因此，正確順序應該是：

```text
Requirement
 ↓
Architecture Pattern
 ↓
State and Tool Contract
 ↓
Verifier and Policy
 ↓
Framework Selection
 ↓
Infrastructure and Operations
```

而不是：

```text
Framework
 ↓
Whatever the Framework Makes Easy
```

整個十篇系列可以用最後一句話收束：

> **Pattern 告訴你系統應該怎麼運作；Framework 只是幫你把那個決定寫成程式。**

---

## 《Agent 設計模式圖鑑》系列目錄

| Part | 主題 |
|---:|---|
| 1 | 六維 Agent 架構地圖 |
| 2 | Execution Path |
| 3 | Decision and Planning |
| 4 | Reasoning and Search |
| 5 | Verification and Recovery |
| 6 | Multi-Agent Organisation |
| 7 | State and Memory |
| 8 | Production Agent Recipes |
| 9 | Architecture Selection |
| 10 | Framework Implementation Bonus |

---

## 圖表對位表

| 圖號 | 正式圖名 | 建議檔名 |
|---|---|---|
| Figure 10-1 | Patterns, Frameworks, and Infrastructure | `figure-10-1-patterns-frameworks-infrastructure.png` |
| Figure 10-2 | Framework Fit by Architecture Pattern | `figure-10-2-framework-fit-by-pattern.png` |
| Figure 10-3 | Workflow-Centric Frameworks | `figure-10-3-workflow-centric-frameworks.png` |
| Figure 10-4 | Multi-Agent Runtime Choices | `figure-10-4-multi-agent-runtime-choices.png` |
| Figure 10-5 | Native Code or Framework? | `figure-10-5-native-code-or-framework.png` |
| Figure 10-6 | Framework-Resilient Production Architecture | `figure-10-6-framework-resilient-production-architecture.png` |

---

## 官方文件與更新基準

本文在 2026-06-30 依據以下官方文件校對框架定位：

- [LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [LlamaIndex Workflows Documentation](https://docs.llamaindex.ai/en/stable/understanding/workflows/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [AutoGen Stable Documentation](https://microsoft.github.io/autogen/stable/)
- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)

框架狀態與 API 可能在發布後變動。實作前應再次查閱官方文件與 Migration Guide。
