---
title: "Agent 設計模式圖鑑 Part 10｜不被 Framework 綁架的 Agent 模式實作"
description: "以 Architecture-first 方法比較 Native Code、LangChain 與 LangGraph、LlamaIndex Workflows、CrewAI、OpenAI Agents SDK、AutoGen、Semantic Kernel 與 Microsoft Agent Framework。"
date: 2026-07-02T09:00:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 10
bonus: true
last_reviewed: "2026-07-01"
---


> **檢查基準：2026 年 7 月 1 日**
>
> 本文刻意討論具名 Framework。API、Package Name、Deployment Service、Support Status 與 Migration Guidance 都可能改變。正式實作前必須重新核對官方文件並固定通過測試的版本。

前九篇聚焦 Architecture Pattern，而不是產品。

這個分離很重要：

- ReAct 不屬於某一套 SDK。
- State Machine 不是 Feature Checklist。
- Multi-agent 不是一組 Persona。
- Memory 不是 Vector Database。
- Human Approval 不是 Callback。
- Checkpoint 不是 Business Transaction。
- Trace 不是 Audit Record。

Framework 可以減少重複工程，也可能把 Architecture 藏起來，最後 Team 只能用 Package Class Name 解釋系統。

正確順序是：

```text
Domain Contract
  -> Architecture and Control Pattern
  -> Framework or Runtime
  -> Infrastructure and Operations
```

而不是：

```text
Framework
  -> Whatever the Tutorial Makes Easy
```

本文比較 2026 年的主要實作路線，並說明如何讓 Domain State、Tool Contract、Verification、Policy 與 Side Effect 遠離 Framework-specific Gravity Well。

## Framework 問題應出現在 Architecture Decision 之後

Framework 真正提供系統所需的 Abstraction 或 Runtime 時，才有價值。

例如：

- Durable State 與 Resume
- Agent Loop
- Graph 或 Event Orchestration
- Tool Schema
- Handoff
- Streaming
- Tracing
- Human Interruption
- Multi-agent Messaging
- Provider Integration

Framework 不會替你決定：

- User 可以讀哪些 Data
- Action 是否有法律授權
- 什麼才算完成
- Retry 是否安全
- 哪個 Evidence 支持 Claim
- Side Effect 是否只發生一次
- 誰負責 Final Result

這些是 Application 與 Governance Decision。

## 四層實作模型

舊版使用 Pattern、Framework、Infrastructure 三層。

它缺少一個應位於所有層上方的結構：Domain Contract。

### Layer 1：Domain 與 Acceptance Contract

這一層定義：

- User Goal
- Domain State
- Accepted Evidence
- Prohibited Outcome
- Tool 與 Side-effect Contract
- Permission
- Terminal Outcome
- Final Owner

例如：

```text
Research Answer 只有在每個 Material Claim 都有 Approved Evidence 時才算完成。

Code Repair 只有在 Required Test、Build 與 Diff Check 通過時才算完成。

Payment 只有在 Deterministic Validation 與 Authorised Approval 後才可執行。
```

這些 Contract 不應由 Framework Type 定義。

### Layer 2：Architecture 與 Control Pattern

這一層定義 System 如何運作：

- Direct
- Pipeline
- Router
- State Machine
- DAG
- Bounded ReAct
- Plan-and-Execute
- Adaptive Replanning
- Generate-and-Test
- Supervisor–Worker
- Verifier
- Human Approval
- Working Memory

一套 Framework 可以實作多種 Pattern。單一 Framework Name 無法說明 System 用了哪些模式。

### Layer 3：Framework、SDK 或 Workflow Runtime

這一層提供 Implementation Primitive：

- Native Code 或 Existing Workflow Engine
- LangChain Agents
- LangGraph
- LlamaIndex Workflows 與 AgentWorkflow
- CrewAI
- OpenAI Agents SDK
- AutoGen
- Semantic Kernel
- Microsoft Agent Framework

這些產品不是相同類別。有些提供 High-level Agent Loop，有些提供 Low-level Orchestration，有些以 Data 與 Retrieval 為中心，有些以 Team 為中心，有些是大型 Platform Ecosystem 內的 Migration Path。

### Layer 4：Infrastructure 與 Operations

這一層提供：

- Database
- Queue
- Object Storage
- Sandbox
- Secret Management
- Policy Enforcement
- Deployment
- Telemetry Backend
- Business Audit
- Backup
- Incident Response
- Disaster Recovery

Checkpoint API 不會自動提供 Tenant Isolation、Retention Policy、Backup Recovery 或 Transactional Side-effect Safety。

![Figure 10-1｜Domain Contract、Architecture Pattern、Framework、Infrastructure 四層實作模型](/images/the-atlas-of-agent-design-patterns-part-10/four-layer-implementation-model.png)

## 先定義 Framework-neutral Contract

Framework Portability 不是把所有 Call 包進一個 Generic Interface 就完成。

真正需要由 Application 擁有的是關鍵 Semantics。

### Domain State

用 Application Term 定義 State：

```python
from enum import StrEnum
from pydantic import BaseModel, Field


class RunStatus(StrEnum):
    ADMITTED = "admitted"
    RETRIEVING = "retrieving"
    VERIFYING = "verifying"
    WAITING_FOR_APPROVAL = "waiting_for_approval"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


class ResearchState(BaseModel):
    task_id: str
    tenant_id: str
    original_query: str
    rewritten_query: str | None = None
    source_ids: list[str] = Field(default_factory=list)
    retry_count: int = 0
    plan_version: int = 1
    status: RunStatus = RunStatus.ADMITTED
```

Framework 可以 Serialise 這份 State，但 Business Meaning 屬於 Application。

### Tool Port

```python
from typing import Protocol


class RetrieverPort(Protocol):
    async def retrieve(
        self,
        query: str,
        tenant_id: str,
        limit: int,
    ) -> list["SourceRecord"]:
        ...
```

Framework Adapter 可以把這個 Port 暴露成：

- LangGraph Node Dependency
- LlamaIndex Step Dependency
- OpenAI Agents SDK Function Tool
- CrewAI Tool
- AutoGen Tool
- Microsoft Agent Framework Function

### Verification Result

```python
class VerificationResult(BaseModel):
    status: str
    failed_checks: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    required_action: str | None = None
```

不要讓每個 Runtime 發明不同版本的 `PASS`。

### Side-effect Command

Side Effect 應是顯式 Command：

```python
class SendEmailCommand(BaseModel):
    command_id: str
    recipient: str
    subject: str
    body_ref: str
    approved_by: str | None = None
```

Command Boundary 可以執行：

- Idempotency
- Permission
- Approval
- Validation
- Audit
- Reconciliation

不要把 Write 藏在 Conversational Persona 裡。

### Trace Context

至少保存：

- Trace ID
- Task ID
- User 與 Tenant
- Parent Span
- Model Version
- Prompt Version
- Framework Version
- Policy Version
- State-schema Version

Framework Tracing 可以補充 Context，但不應擁有 Identity Model。

## Native Code 與既有 Workflow Engine

「Native Code」代表普通 Application Code，不代表沒有 Architecture。

它可以使用：

- Function
- Typed State
- Database Row
- Queue
- Background Worker
- Retry Library
- Scheduler
- Existing Workflow Engine
- OpenTelemetry
- Policy Middleware

### 適合此路線的情況

- Flow 小且明確
- Existing Orchestration 已解決 Durability
- Business Rule 比 Model Behaviour 更重要
- 不需要 Open-ended Agent Loop
- Team 需要最大 State 與 Side-effect Control
- 新 Runtime 只會重複既有能力

### 優點

- 低 Abstraction Leakage
- 直接 Test
- State Transition 明確
- Migration 容易
- 較少 Framework-specific Event Type
- Side-effect Boundary 精確

### 仍需自行負責

- Persistence
- Resume
- Concurrency
- Cancellation
- Human Approval
- Streaming
- Tool Loop
- Trace Instrumentation
- State Migration
- Deployment 與 Scaling

Decision 不應依賴任意的 Step 或 Code Line 數量。

應問：

> 新 Runtime 是否能移除有意義的重複工程，同時不降低控制，也不複製現有 Infrastructure？

## LangChain Agents 與 LangGraph

目前 LangChain 官方文件將 LangChain Agents 定位為 High-level Agent Abstraction，LangGraph 則是支援 Advanced Stateful Workflow 的 Low-level Orchestration Framework 與 Runtime。

### LangChain Agents

適合以下需求的起點：

- Standard Tool-using Loop
- Model 與 Tool Integration
- Prebuilt Agent Abstraction
- 不想自行設計每條 Graph Edge

Prebuilt Loop 與 Contract 相符時使用。

需要更明確 Control 時才往下使用 LangGraph。

### LangGraph

LangGraph 針對 Long-running、Stateful Orchestration，提供：

- Explicit Node 與 Edge
- Durable Execution
- Persistence
- Streaming
- Human-in-the-loop Interrupt
- Deterministic 與 Agentic Step 共存

Mental Model：

```text
Application State
  -> Node
  -> State Update
  -> Conditional Transition
  -> Checkpoint
```

### 重要的 Persistence Semantics

LangGraph Checkpoint 保存 Graph State，不會讓任意 Side Effect 自動具有 Transaction Semantics。

官方 Interrupt Guidance 明確提醒，Interrupt 前的 Side Effect 應具 Idempotency，因為 Resume 時 Node 可能 Replay。

因此：

- Write 前後有 Checkpoint 仍不夠
- Side Effect 需要 Command Identity
- Resume 必須 Reconcile External State
- Approval 必須重新驗證
- State Schema 需要 Migration Plan

### 適合 LangGraph

- State Transition 是核心
- 需要 Pause 與 Resume
- 需要 Approval Interrupt
- Deterministic 與 Agentic Node 必須共存
- Repair 與 Replan Loop 明確
- Lower-level Control 的收益高於成本

### 主要風險

- Graph Spaghetti
- Framework State 滲入 Domain State
- 把 Checkpoint Replay 當 Exactly-once Execution
- 把 Trace 當 Audit
- Fixed Pipeline 足夠時仍建立 Graph

## LlamaIndex Workflows 與 AgentWorkflow

LlamaIndex 仍以 Data、Document、Index、Retriever、Query Engine 與 RAG 為重要核心。

Workflows 提供 Event 與 Step Model；AgentWorkflow 則在同一 Ecosystem 中提供 Single-agent 與 Multi-agent Orchestration。

### Mental Model

Workflow：

```text
Event
  -> Step
  -> New Event
  -> Another Step
```

AgentWorkflow：

```text
Agent
  -> Tool or Handoff
  -> Workflow State
  -> Structured Result
```

### 適合此路線

- Retrieval 與 Document Abstraction 是核心
- System 已使用 LlamaIndex
- Data Event 驅動 Workflow
- Agent Step 必須緊密使用 Retriever 與 Query Engine
- Structured Output 與 Evidence Object 是 First-class Concern

### 重要邊界

Data Framework 不是 Source-of-truth Policy。

仍需定義：

- Tenant Filtering
- Document Permission
- Source Lineage
- Citation Mapping
- Version Handling
- Prompt-injection Boundary
- Delete Propagation
- Acceptance Verification

### Migration Lesson

LlamaIndex 舊版 QueryPipeline 文件目前已建議改用 Workflows 做 Orchestration。

這提醒我們：

> 即使在同一個 Ecosystem，Preferred Abstraction 也會改變。Domain Workflow 不應依賴 Framework Event Class。

## CrewAI：Crews 與 Flows 解決不同問題

CrewAI 提供兩個重要 Abstraction。

### Crews

適合：

- Role-based Collaboration
- Bounded Specialised Task
- Sequential 或 Hierarchical Process
- 快速 Multi-agent Experiment

### Flows

適合：

- Start、Listen 與 Route Control
- Explicit State
- Persistence 與 Resume
- Event-driven Execution
- 在 Controlled Workflow 中嵌入 Crew

### 建議組合

```text
Flow Controls Business Process
  -> Deterministic Step
  -> Bounded Crew for an Open-ended Subtask
  -> Verifier
  -> Continue or Stop
```

而不是：

```text
Every Function
  -> Another Persona
  -> Another Conversation
```

### 適合 CrewAI

- Role Collaboration 是主要 Hypothesis
- Team 需要快速 Prototype
- Flow 能維持外層 Control Boundary
- Worker Output Contract 與 Final Owner 明確

### 主要風險

- Persona Inflation
- Side Effect 藏在 Tool
- Final Ownership 不清楚
- 把 Role Label 當成 Independent Responsibility
- 用 Expected-output Prose 取代 Executable Acceptance Contract

## OpenAI Agents SDK

OpenAI Agents SDK 提供 Lightweight Agent Runtime，主要 Primitive 包括：

- Agent 與 Runner
- Function Tool
- Agent as Tool
- Handoff
- Guardrail
- Session
- Human-in-the-loop
- Tracing

SDK 對 OpenAI Model 預設使用 Responses API，同時負責 Turn、Tool、Guardrail、Handoff 與 Session 周圍的 Orchestration Loop。

### 適合此路線

- Compact Tool-using Agent Loop 足夠
- Manager 與 Handoff Pattern 清楚
- Built-in Tracing 有價值
- Stack 已使用 OpenAI Model 或 Hosted Capability
- 不需要大型 Graph Runtime

### Guardrail Scope 很重要

Guardrail 不是 Universal Policy Engine。

目前 SDK 文件指出，Handoff 使用的 Runtime Path 與一般 Function Tool 不同，Tool Guardrail 不會自動套用到 Handoff Call 本身。

因此：

- 必須列出所有 Enforcement Point
- Business Authorisation 放在 Model Instruction 外
- Tool Input 在 Execution Boundary 驗證
- 不假設一組 Guardrail 能覆蓋所有 Runtime Path

### Session 不是 Business Workflow Database

Session 可以支援 Conversation Continuity。可恢復的受監管 Business Process 仍需要：

- Durable Domain State
- State Versioning
- Approval Record
- Transaction Reconciliation
- Audit
- Migration 與 Incident Handling

### Tracing 不是 Audit

Built-in Tracing 可以記錄 Agent Run、Tool Call、Handoff、Guardrail 與 Custom Event。

Audit Record 還需要：

- Business Meaning
- Actor Identity
- Immutable Retention
- Legal 與 Compliance Field
- Approval Evidence
- Side-effect Outcome

Sensitive Trace Content 也需要明確處理。

## AutoGen、Semantic Kernel 與 Microsoft Agent Framework

Microsoft 的 Framework Landscape 已發生重大改變。

Microsoft 官方文件把 Microsoft Agent Framework 定位為 AutoGen 與 Semantic Kernel 的直接後繼者，目前仍標示為 Public Preview。

這不代表 Existing System 明天就失效。

### AutoGen

AutoGen 仍提供：

- AgentChat
- Teams
- Swarm 與其他 Team Preset
- Core
- Event-driven Messaging
- Distributed Runtime Concept
- Code-execution Extension

適合：

- Existing AutoGen System 正常運作
- Research 或 Multi-agent Experiment 是核心
- AgentChat 或 Core 已符合 Architecture
- Migration Cost 高於 Immediate Benefit

新的 Microsoft-centred Production System 應正式比較 Microsoft Agent Framework。

### Semantic Kernel

Semantic Kernel 對 Existing Application 與 Integration 仍有價值。

適合：

- Existing Codebase 已依賴
- 目前能力能滿足 Contract
- Migration 沒有可證明的 Value
- Platform Support 與 Lifecycle 符合 Organisation

不能只因為出現 Successor 就重寫 Stable System。

### Microsoft Agent Framework

Microsoft Agent Framework 結合：

- Agent Abstraction
- Graph-based Workflow
- Session State
- Type-safe Routing
- Checkpointing
- Middleware
- Telemetry
- Human-in-the-loop
- MCP 與 Provider Integration
- Python 與 .NET

適合評估：

- Organisation 以 Microsoft 或 Azure 為中心
- Graph Workflow 與 Agent 希望在同一 Ecosystem
- Python 與 .NET Interoperability 很重要
- Team 能接受 Preview Risk

### Preview Rule

Critical Path 使用 Preview Framework 時需要：

- Pinned Version
- Adapter Boundary
- Migration Test
- Pilot
- Rollback
- Checkpoint Compatibility Test
- Owner 接受 Support 與 Change Risk

![Figure 10-2｜Framework 比較：抽象、適用情境與要驗證的問題](/images/the-atlas-of-agent-design-patterns-part-10/framework-fit-by-pattern.png)

## 同一 Architecture 映射到不同 Runtime

Requirement：

> 建立可恢復的 Blog Research Workflow。可直接回答時走 Direct；否則 Retrieval Approved Article。Evidence 不足時最多 Rewrite 一次。Citation Verification 通過後才輸出，否則 Abstain。

Architecture：

```text
Admission and Router
  -> Retrieval Pipeline
  -> Bounded Rewrite
  -> Citation Verifier
  -> Complete or Abstain
```

### Native Code 或 Existing Workflow Engine

使用：

- Typed State
- Database Persistence
- Explicit Transition Function
- Retry Counter
- Queue 或 Workflow Job
- Independent Verifier

### LangChain Agent

只在 Bounded Adaptive Node 使用 Prebuilt Tool Loop。

Routing、Retry Limit 與 Final Verification 由 Application Code 控制。

### LangGraph

使用：

- Explicit Application State
- Route Node
- Retrieval Node
- Rewrite Node
- Verifier Node
- Conditional Edge
- Checkpointer
- 需要 Approval 時加入 Interrupt

### LlamaIndex Workflows

使用：

- Request Event
- Retrieval Step
- Evidence Event
- Rewrite Event
- Verification Event
- Context 或 Store
- LlamaIndex Retriever 與 Reranker

### CrewAI

Outer Process 使用 Flow。

只有 Bounded Research Subtask 確實受益於 Role Collaboration 時才使用 Crew。

### OpenAI Agents SDK

使用：

- Application 或 Router Agent
- Retrieval Function Tool 或 MCP
- Bounded Run Control
- Output 與 Tool Validation
- 適用時使用 Session
- Built-in Tracing

Rewrite Count 與 Citation Contract 保存在 Application State。

### AutoGen

只有 AgentChat 或 Core 的 Team／Event Model 解決真實 Requirement 時才使用。

Single-agent Retrieval Workflow 不需要 Team。

### Microsoft Agent Framework

使用：

- Explicit Workflow
- 只有需要 Adaptation 的地方使用 Agent Node
- Session State
- Checkpointing
- Middleware
- Telemetry
- Preview-risk Control

Architecture 不變，只是 Implementation Vocabulary 改變。

![Figure 10-3｜同一 Architecture 對應不同 Runtime](/images/the-atlas-of-agent-design-patterns-part-10/architecture-across-runtimes.png)

## Checkpoint、Session、Memory、Transaction 與 Audit 不同

這些名詞常被混在一起。

### Checkpoint

用於 Resume 或 Replay 的 Saved Execution State。

### Session

Conversation 或 Agent-run Context 的 Continuity Boundary。

### Memory

預期影響 Future Reasoning 或 Task 的資訊。

### Transaction

具有 Atomicity、Consistency、Idempotency、Reconciliation 或 Compensation 要求的 Business Operation。

### Audit Record

記錄誰在什麼 Authority 下、使用什麼 Evidence、做了什麼並得到什麼 Result 的 Accountable Record。

Checkpoint 可以表示：

```text
Workflow Reached SEND_PAYMENT
```

它不能證明：

```text
Payment Executed Exactly Once
```

Session 可以保存 Message，不能證明 Policy 改變後 State 仍可安全 Resume。

### Safe Side-effect Pattern

```text
Workflow State
  -> Create Typed Command
  -> Validate Policy and Approval
  -> Execute with Command ID
  -> Persist External Result
  -> Reconcile
  -> Advance Workflow State
```

Resume 時：

```text
Look Up Command ID
  -> Already Completed?
       yes -> Reuse Result
       no  -> Determine Whether Safe to Execute
```

![Figure 10-4｜Checkpoint、Session、Memory、Transaction 與 Audit 的差異與 Safe Side-effect Pattern](/images/the-atlas-of-agent-design-patterns-part-10/side-effect-and-transaction-contracts.png)

## Multi-agent 實作需要 Contract，不是 Avatar

不同 Runtime 都能輕鬆建立數個 Agent。

真正困難的是：

- Task Assignment
- Context Transfer
- Output Schema
- Shared-state Permission
- Conflict Resolution
- Termination
- Aggregation
- Final Ownership
- Budget
- Observability

### Supervisor–Worker Contract

Supervisor Input：

- Goal
- Task Graph
- Worker Capability Registry
- Budget
- Acceptance Criteria

Worker Output：

- Status
- Result
- Evidence
- Unresolved Item
- Cost
- Side Effect
- Provenance

Aggregator Output：

- Merged Result
- Conflict
- Missing Work
- Acceptance Status

### Handoff Contract

Handoff 應指定：

- Reason
- Target Capability
- Context Subset
- Permission
- Expected Result
- Return Path
- Stop Condition

Broadcast 整段 Conversation 不是 Neutral Default。

### Framework Mapping

- CrewAI 以 Role、Task、Crew 與 Flow 表示。
- AutoGen AgentChat 以 Team 與 Speaker／Handoff Pattern 表示。
- AutoGen Core 以 Event-driven Actor 表示。
- OpenAI Agents SDK 以 Manager、Agent-as-tool 與 Handoff 表示。
- LangGraph 可以把 Agent 表示為 Graph Node。
- LlamaIndex AgentWorkflow 支援 Agent Handoff 與 Agent-as-tool Pattern。
- Microsoft Agent Framework 結合 Agent 與 Explicit Workflow。

沒有任何 Runtime 能移除 Final Owner 的必要性。

## Native Orchestration 或 Framework？

不要使用固定的「三到五個 Step」規則。

### 優先 Native Code 或 Existing Workflow Platform

- Current Primitive 能清楚表示 Flow
- Durability 已解決
- Agentic Portion 很小
- Team 可以直接 Test 與 Operate
- 新 Runtime 只會重複 Queue、State 或 Approval Infrastructure
- Framework-specific Type 會主導 Domain Model

### 優先 Framework

- 能移除有意義的重複工程
- State 與 Resume Semantics 符合 Contract
- Agent Loop 是真實 Requirement
- Human Interruption 很難自行正確實作
- Graph、Event 或 Team Primitive 提升清晰度
- Runtime 可觀測且可測試
- Migration 與 Lifecycle Risk 可接受

### 拒絕 Framework

- Abstraction 隱藏 Side Effect
- Persistence 無法滿足 State Requirement
- Policy Enforcement 依賴 Prompt
- Team 無法測試 Replay 與 Resume
- Support Status 不符合 Risk
- Migration 需要重寫 Domain Logic

![Figure 10-5｜Native Orchestration 或 Framework 決策](/images/the-atlas-of-agent-design-patterns-part-10/native-vs-framework-decision.png)

## 以 Fit 選擇 Framework，不用通用 Strength Score

沒有 Shared Benchmark 時，不應在 Comparison Table 將某 Framework 標成某能力的「Very Strong」。

應改用 Qualitative Fit Question。

| Option | Primary Abstraction | Natural Fit | Questions to Verify |
|---|---|---|---|
| Native 或 Existing Workflow Engine | Function、Job、State、Queue | Small 或 Business-dominant Workflow | 哪些 Runtime 能力需自行建置？ |
| LangChain Agents | High-level Agent Loop | Standard Tool-using Agent | Prebuilt Loop 是否符合 Contract？ |
| LangGraph | State、Node、Edge、Checkpoint | Long-running Stateful Orchestration | Replay 與 Side Effect 是否安全？ |
| LlamaIndex Workflows | Event、Step、Context、Data Abstraction | RAG 與 Data-centric Workflow | Domain Contract 能否留在 Event Type 外？ |
| CrewAI | Crew、Task、Process、Flow | Controlled Flow 內的 Role Collaboration | 每個 Role 是否真的是 Responsibility Boundary？ |
| OpenAI Agents SDK | Agent、Runner、Tool、Handoff、Guardrail | Lightweight Tool 與 Handoff Runtime | Guardrail 與 State 覆蓋哪些 Path？ |
| AutoGen | AgentChat Team 與 Event-driven Core | Existing System、Research、Multi-agent Experiment | Migration 與 Lifecycle Plan 是什麼？ |
| Semantic Kernel | Kernel、Plugin、Agent、Enterprise Integration | Existing Microsoft Application | Migration 是否真的有價值？ |
| Microsoft Agent Framework | Agent 與 Graph Workflow | New Microsoft-centred Evaluation | Preview Change Risk 是否可接受？ |

Final Answer 可以是 Mixed Stack：

```text
Existing Workflow Engine
  + LangGraph for One Complex Stateful Subflow
  + LlamaIndex Retriever
  + OpenTelemetry
  + Independent Policy and Audit
```

Framework Purity 不是 Architecture Requirement。

## 建立 Framework-resilient Code

### Domain Model 留在 Adapter 外

不要讓 Framework Event、Message、RunContext 或 Agent Type 穿越 Domain Boundary。

### Tool Port 保持狹窄

Application 應依賴 Capability：

- Retrieve Evidence
- Execute Query
- Run Test
- Send Approved Message
- Write Validated Record

而不是依賴 Framework Tool Decorator。

### Verification 保持獨立

Verifier 應接受 Domain Artefact 與 Evidence，而不是 Framework Transcript。

### Policy 留在 Prompt 外

使用：

- Typed Validation
- Authorisation Service
- Tool Gateway
- Network 與 Credential Boundary
- Approval Service
- Deterministic Transaction Service

### Observability 可攜

盡量使用 Application Trace ID 與 OpenTelemetry-compatible Semantics。

Framework Trace 可以連結成 Child Span 或 Diagnostic Artefact。

### Event Schema 必須 Versioned

Persisted Event 與 Checkpoint 可能比 Framework Version 活得更久。

保存：

- Schema Version
- Framework Version
- Migration Version
- Producer
- Timestamp
- Correlation ID

### 維持 Migration Seam

每個 Framework Dependency 都要記錄：

- 為什麼存在
- 滿足哪個 Contract
- Persist 哪些 Data
- 如何替換
- 如何 Export State
- 如何 Replay Test
- 誰負責 Migration

![Figure 10-6｜Framework-resilient Production Architecture 與 Migration Seam](/images/the-atlas-of-agent-design-patterns-part-10/framework-resilient-architecture.png)

## 測試 Framework Semantics，不只測 Business Output

Workflow 可以產生正確 Final Answer，卻仍不適合運營。

### Unit Test

- Domain State Transition
- Tool Validation
- Verifier Rule
- Policy
- Idempotency Key

### Contract Test

- Framework Adapter Input 與 Output
- Provider Replacement
- Tool Schema
- Event Translation
- Trace Propagation

### Workflow Test

- Normal Path
- Retry
- Fallback
- Repair
- Replan
- Pause 與 Resume
- Cancellation
- Terminal State

### Replay 與 Side-effect Test

- Node Replay
- Duplicate Command
- Lost Response
- Resume after Approval
- State Migration
- Partial Checkpoint
- Worker Crash

### Security Test

- Prompt Injection
- Tool Escalation
- Cross-tenant Access
- Secret Exposure
- Unsafe Handoff
- Memory Poisoning
- Unauthorised Side Effect

### Evaluation

- Task Success
- Evidence Support
- False Pass 與 False Fail
- Latency
- Cost
- Human-review Load
- Recovery Rate

### Upgrade Test

Framework Version 改變前：

- Run Golden Set
- Read Release 與 Migration Note
- Load Old Checkpoint
- Resume Active Workflow
- Compare Trace
- Test Rollback
- Verify Adapter Compatibility

## 常見 Implementation Anti-pattern

### Framework-first Architecture

Contract 尚未定義，Runtime 已被選定。

### Framework Type Leakage

Domain Logic 依賴 Framework Event 與 Message。

### Agent for Every Function

Deterministic Step 被轉成 Conversational Actor。

### Hidden Side Effect

Write 發生在 Opaque Tool 或 Persona 內。

### Checkpoint Equals Transaction

Replay 重複執行 External Operation。

### Session Equals Durable Workflow

Conversation Continuity 被誤認為 Resumable Business State。

### Guardrail Equals Policy Engine

一個 SDK Hook 被假設能覆蓋所有 Execution Path。

### Trace Equals Audit

Diagnostic Telemetry 被誤認為 Accountable Business Evidence。

### Multi-agent by Persona

Role Name 取代真實 Responsibility Boundary。

### Preview Framework in an Unprotected Critical Path

沒有 Adapter、Pilot、Rollback 或 Compatibility Test。

### Tutorial Code Becomes Production Code

Authentication、Tenancy、Budget、Failure Path、Security 與 Operations 全部缺席。

### No Exit Strategy

System 無法 Export State 或 Replace Runtime。

## Production Checklist

### Architecture

- [ ] Framework Selection 前已有 Domain Contract
- [ ] Adaptive Node 被逐一標出
- [ ] State、Memory、Session 與 Transaction 已分離
- [ ] Side Effect 有 Explicit Command Boundary
- [ ] Final Owner 已命名

### Framework Fit

- [ ] Required Semantics 已記錄
- [ ] Official Support Status 已記錄
- [ ] Tested Version 已 Pin
- [ ] Persistence 與 Replay Behaviour 已測試
- [ ] Framework Type 沒有主導 Domain Model
- [ ] Migration Path 存在

### Reliability

- [ ] Retry、Repair、Fallback 與 Replan 分開
- [ ] 每個 Loop 有 Limit
- [ ] Checkpoint Resume 不會 Duplicate Side Effect
- [ ] Approval 會 Expire，State 會 Revalidate
- [ ] Terminal Outcome 包含 Partial 與 Unsupported

### Security

- [ ] Tool Permission 在 Prompt 外 Enforcement
- [ ] Untrusted Content 無法改變 Policy
- [ ] Cross-tenant Access 經測試
- [ ] Secret 從 Trace 排除或 Redact
- [ ] High-impact Action 需要適當 Authority
- [ ] Kill Switch 與 Incident Response 存在

### Testing and Operations

- [ ] Adapter Contract Test 存在
- [ ] Failure 與 Replay Path 經測試
- [ ] Upgrade Test 包含 Old Checkpoint
- [ ] Evaluation 涵蓋 Quality、Cost 與 Latency
- [ ] Trace 與 Business Audit 分離
- [ ] Rollback 已演練

## 最終選型指引

使用以下問題，不使用 Universal Leaderboard。

### 是否需要 Agent Loop？

不需要時使用 Ordinary Code、Pipeline 或 Existing Workflow Engine。

### Durable Stateful Orchestration 是否為核心問題？

評估 LangGraph、Existing Workflow Platform，或在能接受 Preview Status 時評估 Microsoft Agent Framework。

### Data 與 Retrieval 是否為核心？

評估 LlamaIndex Workflows，必要時放在更大的 Orchestrator 內。

### Role Collaboration 是否為主要 Hypothesis？

以相同 Worker Contract 比較 CrewAI、AutoGen、LlamaIndex AgentWorkflow、OpenAI Agents SDK Handoff、LangGraph Node 或 Microsoft Agent Framework。

### Lightweight Tool 與 Handoff Runtime 是否足夠？

評估 OpenAI Agents SDK 或 High-level LangChain Agent。

### 是否為 Existing AutoGen 或 Semantic Kernel Estate？

比較 Stay、Adapt 與 Migrate。「有 Successor」不是充分 Business Case。

### System 是否 High Risk？

優先選擇 Team 能透過 Test、Replay、Policy Enforcement、Incident Response 與 Support Commitment 證明其 Semantics 的 Runtime。

## 結論

Framework 是槓桿，不是 Architecture。

可靠 Implementation 自己擁有：

```text
Domain State
+ Tool and Side-effect Contracts
+ Verification
+ Policy and Authority
+ Terminal Outcomes
+ Evaluation
+ Operational Ownership
```

Framework 可以提供：

```text
Agent Loop
+ Graph or Event Runtime
+ Checkpointing
+ Handoffs
+ Streaming
+ Tracing
+ Integrations
```

Infrastructure 提供：

```text
Persistence
+ Queue
+ Sandbox
+ Secrets
+ Deployment
+ Audit
+ Monitoring
+ Incident Response
```

最好的 Framework 不是 Feature List 最長的那一個。

而是 Semantics 與 Architecture 相符、Lifecycle Risk 符合 Task，且移除它時不需要重寫整個 System Meaning 的那一個。

## 參考資料

- [LangChain Documentation, *LangChain overview*](https://docs.langchain.com/oss/python/langchain/overview)
- [LangGraph Documentation, *LangGraph overview*](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph Documentation, *Persistence*](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph Documentation, *Interrupts*](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [LlamaIndex Documentation, *Workflows*](https://docs.llamaindex.ai/en/stable/understanding/workflows/)
- [LlamaIndex Documentation, *AgentWorkflow and structured output*](https://docs.llamaindex.ai/en/latest/understanding/agent/structured_output/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [OpenAI, *Agents SDK*](https://openai.github.io/openai-agents-python/)
- [OpenAI Agents SDK, *Guardrails*](https://openai.github.io/openai-agents-python/guardrails/)
- [OpenAI Agents SDK, *Tracing*](https://openai.github.io/openai-agents-python/tracing/)
- [AutoGen Documentation](https://microsoft.github.io/autogen/stable/)
- [Microsoft, *Microsoft Agent Framework overview*](https://learn.microsoft.com/en-us/agent-framework/overview/)
- [Microsoft, *Agent Framework migration guides*](https://learn.microsoft.com/en-us/agent-framework/migration-guide/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

