---
title: "Agent 設計模式圖鑑 Part 8｜Production Agent 架構實戰"
description: "以 Production 視角把 Routing、Durable Orchestration、Tools、Verification、State、Memory、Policy、Evaluation、Observability、Budget 與 Human Control 組合成 RAG、Deep Research、Coding、Browser、企業自動化與長期監控系統。"
date: 2026-07-01T13:44:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 8
---


前七篇把 Agent 設計拆成六個實務維度：

1. 執行路徑
2. 決策與規劃
3. 推理與搜尋
4. 驗證與恢復
5. Agent 組織
6. 狀態與記憶

真正的 Production 設計，是把這些維度組合到一項真實任務周圍，同時面對真實權限、真實失敗模式與必須有人負責的終止結果。

Production Agent 並不只是：

```text
Prompt
  -> Model
  -> Tools
  -> Answer
```

更誠實的描述是：

```text
Admission
  -> Orchestration
  -> Execution
  -> Acceptance

Cross-cutting:
Identity · Policy · State · Memory · Budget · Observability · Human Control
```

目標不是最大自主性，而是把自主性限制在一個能回答以下問題的系統裡：

- 誰提出這個 Action？
- Request 是否被允許？
- Task 走過哪條 Path？
- 哪些 State 已經改變？
- Result 有什麼 Evidence？
- 哪些 Check 通過或失敗？
- 再次嘗試是否安全？
- 誰負責 Final Decision？
- 哪個 Terminal State 會結束 Run？

本文提供六種 Production Recipe：

1. Production RAG
2. Deep Research Agent
3. Coding Agent
4. Browser／Computer-use Agent
5. High-risk Enterprise Automation
6. Long-running Monitor

它們不是通用藍圖，而是可調整的 Reference Composition。實際系統仍必須依 Task、Data、Risk、Latency 與 Operating Environment 修改。

## Production-ready 是相對於風險的判斷

「Production-ready」不能只代表架構圖上有很多企業感 Box。

低風險的內部 Summary Tool 與 Payment Automation，不需要相同強度的 Control。需要多少 Evidence，應隨以下因素增加：

- Reversibility
- Financial 或 Legal Impact
- Data Sensitivity
- Permission Scope
- Duration
- Side-effect Count
- Environment Uncertainty
- False Positive Cost
- False Negative Cost

只有 Control 與 Risk 相匹配，才能稱為 Ready。

## 四個 Runtime Stage 與三個 Cross-cutting Plane

舊稿使用七層架構，適合盤點 Component，卻把 Sequential Stage 與包圍整個 Run 的 Concern 混在同一條直線。

更清楚的 Reference Model 是四個 Runtime Stage 加三個 Cross-cutting Plane。

### Runtime Stage 1：Admission 與 Routing

這一層判斷：

- Request 是否被支援
- 是否真的需要 Agent
- 需要哪個 Source of Truth
- 是否需要 Tool
- 使用者是否可讀取資料
- 適用哪個 Risk Class
- 是否需要 Clarification 或 Human Handling

可能 Outcome：

- Direct Response
- Fixed Pipeline
- RAG
- SQL 或 Deterministic Tool
- Bounded Agent Workflow
- Human Review
- Clarification
- Unsupported

Router 必須能 Abstain。強迫選路，只是把不確定性包裝成自信的錯誤分類。

### Runtime Stage 2：Orchestration

Orchestration 負責 Task 如何移動：

- Workflow 或 State Machine
- Plan 與 Plan Version
- Task Dependency
- Queue
- Retry 與 Fallback
- Pause 與 Resume
- Approval State
- Deadline
- Terminal Outcome

Orchestrator 不必決定每個局部 Action。它可以在某個 State 內呼叫 Bounded ReAct Executor、啟動 DAG，或執行 Deterministic Pipeline。

### Runtime Stage 3：Execution

Execution 透過以下能力完成工作：

- Language Model
- Retrieval
- Database
- API
- Code Sandbox
- Browser
- File
- External Service
- Specialised Worker

每個可執行 Capability 都應有 Contract：

- Allowed Input
- Permission
- Timeout
- Cost
- Side-effect Class
- Idempotency Behaviour
- Structured Output
- Error Taxonomy

### Runtime Stage 4：Acceptance 與 Completion

這一層判斷 Result 是否可以被接受。

可以使用：

- Schema Validation
- Executable Test
- Source 與 Citation Check
- Policy Check
- Post-condition Verification
- Model-based Rubric Evaluation
- Authorised Human Approval

Outcome 不應只有 Pass 與 Fail：

- completed
- failed
- partial
- blocked
- cancelled
- pending
- unsupported
- inconclusive
- requires human action

### Cross-cutting Plane 1：Identity、Policy 與 Risk

它會限制每個 Runtime Stage：

- Authentication
- Authorisation
- Data Access
- Tool Allowlist
- Delegation Right
- Secret Isolation
- Sandbox
- Risk Classification
- Approval Requirement
- Irreversible-action Gate

重要 Control 必須由 Application 或 Infrastructure Enforcement，不能只靠自然語言指示。

### Cross-cutting Plane 2：State、Memory 與 Evidence

它保存 Run 所需資訊：

- Workflow State
- Step Status
- Plan Version
- Working Memory
- Evidence Store
- User-scoped Memory
- Procedural Memory
- Shared State
- Tool Result
- Approval Record

即使共用相同 Physical Storage，State、Memory 與 Evidence 仍應保持不同語意。

### Cross-cutting Plane 3：Operations、Evaluation 與 Accountability

它使系統可以被營運：

- Trace
- Metric
- Log
- Audit Record
- Replay
- Alert
- Cost Accounting
- Offline Evaluation
- Regression Suite
- Release Gate
- Incident Response
- Kill Switch

Observability 解釋 Live Run 發生什麼；Evaluation 評量 System Version 是否值得發布或繼續運作；Per-run Verifier 則判斷單一 Candidate 是否滿足 Contract。三者相關，但不能互換。

![Figure 8-1｜Production Agent 四個 Runtime Stage 與三個 Cross-cutting Plane](/images/the-atlas-of-agent-design-patterns-part-8/production-reference-architecture.png)

## 先從 Non-agent Baseline 開始

選擇任何 Recipe 前，先問一次有界操作或 Fixed Pipeline 是否足夠。

```text
Input
  -> Validate
  -> Model or Function
  -> Validate Output
  -> Result
```

適合 Baseline 的任務：

- 翻譯
- 改寫
- 摘要
- 固定欄位抽取
- 分類
- 格式轉換
- 根據已提供內容回答
- 確定的計算
- 沒有 Adaptive Branching 的穩定 Retrieval Pipeline

Direct Path 仍可包含：

- Input Validation
- Output Schema
- Policy Check
- Token Limit
- Fallback Model
- Basic Logging
- Deterministic Post-processing

原則很簡單：

> 使用能可靠滿足 Contract 的最小架構。

用一座 Agent 主題樂園證明一個 Function 就能完成，成本通常頗有教育意義。

## Recipe 1：Production RAG

原始 RAG 架構結合 Parametric Generator 與被檢索的 Non-parametric Knowledge。到了 Production，困難的地方不是加上一個 Vector Index，而是控制 Source Selection、Access、Context Assembly、Evidence 與 Failure。

固定 RAG Pipeline 可以完全不是 Agent：

```text
Query
  -> Retrieve
  -> Rerank
  -> Build Context
  -> Generate
  -> Verify
```

只有在 Path 必須適應時，Agentic Behaviour 才值得加入，例如：

- Source Selection 取決於 Request
- 讀完 Gap 後必須繼續 Retrieval
- 系統必須判斷是否 Clarify
- 需要數個 Tool 或 Corpus
- Evidence Conflict 需要新增 Research Step

### Production Flow

```text
Request
  -> Identity and Query Admission
  -> Source Router
  -> Query Normalisation or Rewrite
  -> Permission-aware Retrieval
  -> Deduplicate and Rerank
  -> Context Builder
  -> Generate with Citation IDs
  -> Claim-to-Evidence Verification
  -> Answer, Clarify, Retry, or Abstain
```

### 在 Model Exposure 前執行 Access Control

如果 Unauthorised Content 已經進入 Log、Cache、Reranker 或 Model Context，最後才做 ACL Filter 就太晚了。

使用 Defence in Depth：

1. 驗證 User 與 Tenant
2. 限制可搜尋 Corpus
3. Retrieval 時套用 Metadata Filter
4. Rerank 前移除 Unauthorised Candidate
5. Generation 前再次檢查 Selected Context
6. Audit 被拒絕的 Access Attempt

### Query Rewrite 是受控制的 Transformation

Rewrite Node 應保留：

- User Intent
- Security Scope
- Entity
- Time Range
- Language
- Source Constraint

不能把 Private Query 默默擴張到更廣的 Corpus。

### Context Builder 責任

Context Builder 應管理：

- Token Budget
- Source Diversity
- Duplicate Passage
- Document Version
- Chunk Adjacency
- Citation Identifier
- Permission
- Recency
- Conflicting Evidence
- Prompt-injection Boundary

Retrieved Content 是 Untrusted Data。文件或網頁裡的指示不能自動推翻 System 或 Tool Policy。

### Verification

有 Citation 的 Answer 仍需檢查：

- 每個 Material Claim 是否有 Evidence？
- Cited Passage 是否真的支持 Claim？
- Source 是否被允許？
- Version 與 Date 是否相容？
- 是否遺漏重要 Limitation？
- Answer 是否滿足完整 Contract？
- 是否應 Abstain？

### Failure Policy

| Failure | Primary Response |
|---|---|
| 找不到被允許的 Source | Clarify、切換 Approved Corpus 或 Abstain |
| Retrieval Coverage 太低 | Rewrite 或啟動 Deep Retrieval Profile |
| Citation Mismatch | Repair 或 Reject Answer |
| Source Conflict | 揭露 Conflict 或要求 Review |
| Source 過時 | 使用有效的新版本或標記 Limitation |
| Unauthorised Content | 移除、記錄並調查 |
| Context Budget 超限 | Compress、Prioritise 或拆分 Task |
| Source 內有 Prompt Injection | 當作 Data、排除指令並記錄 Incident |

### Production State

只保存能重現與診斷 Run 的資訊：

- Original Query
- Rewritten Query
- Corpus 與 Policy Version
- Retrieved Document ID 與 Version
- Reranker Score
- Selected Evidence
- Citation Map
- Verifier Result
- Retry Count
- Terminal Outcome

![Figure 8-2｜Production RAG Pipeline](/images/the-atlas-of-agent-design-patterns-part-8/production-rag-pipeline.png)

## Recipe 2：Deep Research Agent

Deep Research 不是單純「搜尋更多」。它必須把 Open Question 轉成可追蹤 Claim，並產生 Gap 可見的 Synthesis。

典型架構：

```text
Research Goal
  -> Admission and Source Policy
  -> Planner
  -> Versioned Research Plan
  -> Dependency-aware Task Graph
  -> Bounded Research Workers
  -> Evidence Store
  -> Synthesis
  -> Coverage and Conflict Verifier
  -> Complete, Repair, or Replan
```

### Planner 產生 Research Contract

有效 Subtask 包含：

- Question
- Objective
- Dependency
- Allowed Source
- Required Evidence
- Output Schema
- Completion Criteria
- Budget
- Deadline
- Failure Policy

「研究市場」不是 Contract。

### DAG 是選配，不是儀式

只有在 Subtask 真的有 Directional Dependency 與 Independent Branch 時才使用 DAG。

可平行的 Branch 例如：

- Product Capability
- Pricing
- Security
- Deployment
- Customer Evidence
- Regulation

不要只因 Worker Card 很好看就 Parallelise。平行工作可能耗盡 Rate Limit、重複 Search，並製造昂貴的 Join Problem。

### Evidence Store，不是 Paragraph Warehouse

每個 Evidence Unit 應保留：

- Claim 或 Field
- Source
- Source Type
- Publication Date
- Access Date
- Document Version
- Supporting Extract
- Scope
- Worker
- Validation Status
- Source Lineage

Source Lineage 很重要。五篇 Secondary Article 都引用同一份 Report，不代表五個獨立 Source。

### Synthesis 必須保存 Disagreement

Synthesiser 不應把互相衝突的 Evidence 磨成一段平滑文字。

應記錄：

- Agreement
- Conflict
- Unresolved Gap
- Time 或 Version Difference
- Inference
- Confidence
- 對 Recommendation 的影響

### Replanning Boundary

一個 Source 或 Query 失敗，但 Subtask 仍有效時，使用 Local Repair。

以下情況才 Replan：

- Decomposition 不完整
- Premise 為假
- 多個 Dependency 改變
- Deliverable 改變
- Evidence Contract 無法滿足

Verifier Fail 不應自動重啟所有 Research。仍然有效的 Evidence 應被保存。

### Stop Condition

- Required Question 已涵蓋
- Minimum Evidence Quality 達標
- Material Conflict 已揭露
- Citation Coverage 通過
- 不存在 Critical Gap
- Budget 已達上限
- 達到 No-improvement Limit
- Human Deadline 到期

「也許還有另一個 Source」不是 Completion Policy。

![Figure 8-3｜Deep Research Agent 架構](/images/the-atlas-of-agent-design-patterns-part-8/deep-research-agent-architecture.png)

## Recipe 3：Coding Agent

Production Coding Agent 是可執行的 Software-change Workflow，不是 Code-completion Prompt。

它必須能：

- 理解 Repository
- 限制 Change Scope
- 在隔離環境修改
- 執行 Test
- 讀取 Structured Failure
- 在限制內 Repair
- 檢查 Final Diff
- 重現結果
- 安全停止

### Reference Flow

```text
Task
  -> Repository and Environment Snapshot
  -> Scope and Acceptance Contract
  -> Inspect Code, Tests, and History
  -> Plan or Direct Repair
  -> Generate Patch
  -> Static Validation
  -> Sandbox Execution
  -> Target Test
  -> Related and Regression Tests
  -> Lint, Type Check, and Build
  -> Security and Change-scope Review
  -> Evidence Bundle
  -> Approval or Delivery
```

### 先建立 Snapshot

保存：

- Repository URL 或 Identity
- Branch
- Commit SHA
- Dirty State
- Runtime Version
- Dependency Lock
- Environment Variable Reference，不保存 Raw Secret
- Test Environment
- Relevant Service Version

沒有 Reproducible Base 的 Patch，只是一則穿著 Diff 外套的傳聞。

### 修改前先理解

Agent 應檢查：

- Failing Test
- Call Path
- Nearby Implementation
- Configuration
- Similar Code
- Repository Convention
- Relevant Recent Change
- Error Log

Stack Trace 可能只指出 Symptom 出現的位置，不是 Root Cause。

### Layered Validation

實際 Test Suite 依 Repository 而異，但 Acceptance Chain 一般應包含：

1. Target Test
2. Related Test Group
3. Relevant Regression Suite
4. Lint 與 Formatting Check
5. Type Check
6. Build 或 Package Check
7. 適用時的 Security Check
8. Diff 與 Scope Review
9. Reproducibility Check

不需要宣稱每個 Repository 都必須執行巨大 Global Suite。應在 Task Contract 定義 Required Suite，並說明哪些 Check 未執行。

### 保護 Verifier

Agent 不得透過以下方式取得 Pass：

- Delete Test
- Skip Test
- Weaken Assertion
- 未經 Authorisation 修改 Expected Result
- 修改 Protected Fixture
- 隱藏 Error
- 修改 Unrelated File

Test-file Change 應分開追蹤；Acceptance Artefact 被修改時必須 Review。

### Sandbox 與 Permission

Code Execution 應使用：

- Isolated Workspace
- Least-privilege Credential
- Controlled Network Access
- Resource Limit
- Timeout
- Output Limit
- Secret Isolation
- 可行時使用 Disposable Environment

### Delivery Evidence

Deliverable 應包含：

- Base Commit
- Changed Files
- Root Cause 說明
- Commands Run
- Exit Codes
- Tests Passed 與 Not Run
- Lint 與 Build Result
- Remaining Risk
- Reproducible Install 或 Placement Steps

SWE-bench 類 Benchmark 的核心提醒是：Real Repository Repair 需要跨檔案理解與 Executable Evaluation，不只是看起來合理的 Code Generation。

![Figure 8-4｜Coding Agent Reference Flow](/images/the-atlas-of-agent-design-patterns-part-8/coding-agent-reference-flow.png)

## Recipe 4：Browser／Computer-use Agent

Browser Agent 在 Partially Observable 且持續變動的 Environment 中行動。

Button 被 Click 不等於成功，系統必須檢查 Post-condition。

### Reference Loop

```text
Goal and Current State
  -> Observe Interface
  -> Parse Trusted and Untrusted Content
  -> Build Structured Browser State
  -> Check Policy
  -> Select Allowed Action
  -> Duplicate and Risk Check
  -> Execute
  -> Observe New State
  -> Verify Progress or Completion
```

### Structured Browser State

保存：

- Current URL 與 Origin
- Page Title
- Selected Account 或 Tenant
- Visible Controls
- Active Element
- Form Values
- Navigation History
- Last Action
- Last Observation
- Download Status
- Session Status
- Screenshot 或 DOM Reference
- Retry Count
- 適用時的 Transaction Identifier

### Action Class

低風險：

- Navigate
- Scroll
- Inspect
- Search
- Select
- 在 Draft Field 輸入
- 下載被允許的 File

高風險：

- Submit
- Send
- Purchase
- Delete
- Publish
- Change Permission
- Upload Sensitive Data
- Accept Legal Terms

高風險 Action 應先通過 Preview、Policy Check 與 Approval Gate。

### Prompt Injection 與 Untrusted Interface

Web Page、Email、Document 與 Retrieved Instruction 可能試圖操控 Agent。

Page Text 必須被視為 Untrusted Input；Action Policy 應來自 Trusted Application Boundary，而不是頁面內容。

### Post-condition Verification

Action 後檢查真實 Effect：

- Confirmation Message
- Expected URL
- Server Response
- Created Record
- Transaction ID
- Downloaded File 與 Checksum
- Changed Form Status
- Before-and-after State

Write Action 後 Response 遺失會形成 Ambiguous Side Effect。再次操作前，必須先 Reconcile Outcome。

### Recovery

- Wait and Re-observe
- 關閉或處理 Modal
- 回到 Known Safe State
- Reload
- Re-authenticate
- 使用 Alternative Approved Route
- Ask User
- Human Takeover
- Stop

WebArena 等 Realistic Web Benchmark 說明了為何 Long-horizon Browser Task 需要 Functional Post-condition Evaluation，而不能只用 Action Count 安慰自己。

![Figure 8-5｜Browser／Computer-use Agent Reference Loop](/images/the-atlas-of-agent-design-patterns-part-8/browser-agent-reference-loop.png)

## Recipe 5：High-risk Enterprise Automation

High-risk Automation 不應讓 Language Model 直接擁有 Business Transaction Authority。

較安全的 Pattern：

```text
Request or Event
  -> Authenticate
  -> Authorise
  -> Agent Prepares Structured Proposal
  -> Deterministic Validation
  -> Risk Classification
  -> Approval Decision
  -> Transaction Service Executes
  -> Post-condition Verification
  -> Reconciliation and Audit
```

### Agent 產生 Proposal

Payment Proposal 可以包含：

- Payee
- Amount
- Currency
- Invoice
- Account
- Business Reason
- Requested Execution Time
- Risk Flags
- Expected Effect
- Reversibility
- Idempotency Key

Agent 可以整理 Evidence 並解釋 Request，不應默默變成 Transaction Authority。

### Deterministic Validation

檢查：

- Schema
- Amount Range
- Account Ownership
- Vendor Status
- Duplicate Invoice
- Permission
- Policy
- Business Rule
- 適用時的 Sanctions 或 Compliance Check
- Transaction Limit
- Required Approval

### Durable Approval

Approval Request 應顯示：

- Exact Proposed Action
- Evidence
- Before State
- Expected After State
- Risk
- Reversibility
- Alternative
- Expiry
- Who May Approve

Resume 前重新檢查 State。昨天 Account Balance 下的 Approval，不應自動批准今天已改變的 Transaction。

### Transaction Boundary

真正 Side Effect 由 Deterministic Service 執行。

要求：

- Idempotency
- Reconciliation
- Transaction Identifier
- Least Privilege
- 可行時的 Rollback 或 Compensating Action
- Immutable Audit Record
- 高影響操作的 Separation of Duties

### Security 與 Governance

NIST AI Risk Management Framework 與 OWASP 的現行 Guidance 都強調：Risk 必須跨整個 Lifecycle 管理，不能把 Model Behaviour 當成唯一 Control Boundary。

![Figure 8-6｜High-risk Enterprise Automation Pattern](/images/the-atlas-of-agent-design-patterns-part-8/high-risk-enterprise-pattern.png)

## Recipe 6：Long-running Monitor

Long-running Monitor 會重複檢查 Condition，只在 Meaningful Change 發生時通知。

例如：

- Price Threshold
- Weather Risk
- Service Outage
- New Filing
- Policy Change
- Job Posting
- Inventory Return
- Security Event

### Reference Flow

```text
Schedule or Event
  -> Load Cursor and Baseline
  -> Fetch Current Source
  -> Validate Source Health
  -> Normalise Observation
  -> Compare with Baseline
  -> Condition Met?
       no -> Update Health State and Stop Quietly
       yes -> Verify Change
            -> Deduplicate and Apply Cooldown
            -> Notify or Escalate
            -> Update Cursor and Alert History
```

### Persistent State

保存：

- Source
- Cursor
- Baseline
- Last Successful Check
- Last Attempted Check
- Last Change
- Last Notification
- Alert Signature
- Cooldown
- Retry Count
- Health Status
- Policy Version

### Event Contract

CloudEvents 等 Common Event Envelope 可以統一 Event Producer 與 Consumer 之間的 Identity、Type、Source、Time 與 Correlation。

### No-change Behaviour

Condition 未成立時：

```text
Do Not Notify
```

Silence 是 Product Contract 的一部分，不是缺少 Feature。

### Health Monitoring

Monitor 可能持續排程，卻已經 Silent Failure。

追蹤：

- Missed Run
- Stale Last-success Time
- Repeated Empty Response
- Source Schema Change
- Authentication Expiry
- Dead-letter Message
- Clock 或 Scheduler Drift
- Alert-delivery Failure

### Notification Policy

- Severity
- Recipient
- Channel
- Quiet Hours
- Cooldown
- Acknowledgement
- Escalation
- Maximum Reminders
- Deduplication

### Stop 與 Retention

Long-running System 需要：

- Expiry
- Cancellation
- Kill Switch
- Retention Policy
- History Compaction
- Source-removal Handling
- Ownership Transfer
- Human Escalation

## Per-run Verifier、Evaluation Suite 與 Observability

這三個 Mechanism 常被一起稱為 Evaluation，但 Scope 不同。

### Per-run Verifier

問題是：

> 這次 Run 是否滿足 Contract？

例如：

- Citation 支持 Claim
- Target Test 通過
- Transaction Post-condition 成立
- Browser Task 達成 Goal

### Evaluation Suite

問題是：

> 這個 System Version 是否值得發布或繼續運作？

可以包含：

- Curated Task Set
- Regression Case
- Adversarial Input
- Permission Test
- Prompt-injection Test
- Failure 與 Recovery Scenario
- Cost 與 Latency Threshold
- Human-scored Quality
- Canary 或 Shadow Evaluation

### Observability

問題是：

> Live Operation 發生什麼，系統在哪裡退化？

使用 Trace、Metric 與 Log。OpenTelemetry 提供 Vendor-neutral Telemetry 與 Distributed Tracing Convention，但 Application 仍需定義 Domain-specific Attribute。

Agent Span 可以包含：

- Request 與 Trace ID
- Route
- State Transition
- Model 與 Prompt Version
- Tool
- Policy Decision
- Evidence ID
- Retry 或 Replan
- Approval
- Cost
- Terminal Outcome

Trace 解釋一個 Run，但不能證明 Architecture 很好；Evaluation Score 衡量 Performance，但不能解釋單一 Production Incident。

## Shared Control Contract

每種 Recipe 都需要以下 Control，只是數值不同。

### Budget

可以限制：

- Model Call
- Tool Call
- Search Query
- Browser Action
- Test Run
- Worker Count
- Wall Time
- Token
- Monetary Cost
- Retry
- Replan
- Approval Reminder

使用 Global Task Budget，加上 Per-component Allocation。

### Timeout 與 Cancellation

為以下項目定義 Timeout：

- Model Call
- Tool
- Worker
- Approval
- State
- Workflow
- External Source

並定義 Timeout 後的行為：

- Retry
- Reconcile
- Fallback
- Partial Result
- Reassign
- Human Review
- Terminal Failure

### Idempotency 與 Reconciliation

所有 Side-effecting Operation 都應定義：

- Request Identity
- Duplicate Detection
- Outcome Lookup
- Safe Repeat Behaviour
- Ambiguous-result Handling
- Compensating Action

### Terminal Outcome

至少包括：

- completed
- failed
- partial
- pending
- blocked
- cancelled
- expired
- unsupported
- inconclusive
- requires human action

沒有 Formal Safe Stop 的系統，只剩一個昂貴的 Hope Loop。

## Agentic System 的 Security Boundary

Agent Security 不是一段 Prompt。

### 把 External Content 視為 Untrusted

包括：

- Web Page
- Document
- Email
- Tool Output
- Retrieved Memory
- User-uploaded File
- Other Agent Message

將 Data 與 Instruction 分離，保留 Source Boundary。

### Minimise Agency

每個 Executor 只取得：

- 必要 Tool
- 最小 Data Scope
- Short-lived Credential
- Resource Limit
- Explicit Side-effect Class
- Bounded Delegation
- 不得有通往高權限 Tool 的隱藏路徑

### Execution 前驗證 Model Output

會變成 SQL、Code、API Call 或 Transaction 的 Model Proposal，應先通過 Typed Parser、Policy Engine 與 Execution Boundary。

### 保護 Memory 與 State

Untrusted Content 不能未經 Validation 就寫入 Permanent Memory、改變 Policy 或重寫 Goal。

### 準備 Incident Response

保存足夠資訊以便：

- Suspend Workflow
- Revoke Credential
- Identify Affected Tasks
- Safe Replay
- Correct Memory
- Notify Owner
- Preserve Evidence

## 六種 Recipe 比較

| Recipe | Primary Uncertainty | Main Execution Structure | Strongest Verification Signal | Essential Persistent Data |
|---|---|---|---|---|
| Production RAG | 哪些 Evidence 可以回答 Query？ | Pipeline 搭配可選 Adaptive Retrieval | Claim-to-source Support 與 ACL | Query、Source Version、Citation Map |
| Deep Research | 哪些 Subquestion 與 Source 能關閉 Gap？ | Planner + Task Graph + Outer State Machine | Coverage、Provenance、Conflict Check | Plan、Evidence Unit、Source Lineage |
| Coding Agent | 哪個 Repository Change 能滿足 Executable Acceptance？ | Stateful Generate-and-Test Workflow | Test、Build、Diff、Reproducibility | Snapshot、Patch、Command、Result |
| Browser Agent | 哪個 Safe Action 能達成 Interface Goal？ | Bounded Action Loop + State Machine | Functional Post-condition | Browser State 與 Action History |
| High-risk Automation | Proposed Side Effect 是否可執行？ | Proposal Workflow + Deterministic Transaction Service | Policy、Approval、Reconciliation | Proposal、Approval、Transaction ID |
| Long-running Monitor | Meaningful Change 是否發生？ | Event 或 Scheduled Stateful Workflow | Change Verification 與 Deduplication | Baseline、Cursor、Health、Alert History |

這些是 Starting Point，不是通用評分。Cost 與 Latency 取決於 Implementation、Scale、Data 與 Quality Standard。

## Assembly Order

不要先選 Framework。

### 1. 定義 Contract

- Desired Outcome
- Accepted Evidence
- Prohibited Outcome
- Terminal State
- Latency 與 Cost Envelope

### 2. 判斷是否需要 Agent

能用 Direct 或 Fixed Pipeline 時，使用較簡單的選項。

### 3. 盤點 Data 與 Tool

- Source of Truth
- Permission
- Side Effect
- Freshness
- Availability
- Trust Boundary

### 4. 分開 Fixed 與 Adaptive Work

穩定邏輯 Hard-code。只有 Observation 真的會改變下一個有效 Action 時才加入 Autonomy。

### 5. 選擇 Execution Structure

- Pipeline
- Router
- State Machine
- DAG
- Bounded Action Loop
- Event-driven Workflow

### 6. 在 Generation 前定義 Verification

- Schema
- Evidence
- Test
- Post-condition
- Policy
- Human Decision

### 7. 定義 State 與 Memory

- 哪些必須精確
- 哪些可以 Summary
- 哪些 Persist
- 哪些 Expire
- 誰可以 Read 或 Write

### 8. 套用 Identity 與 Policy

- Authorisation
- Tool Access
- Data Scope
- Approval
- Risk
- Sandbox

### 9. 加入 Budget 與 Stop

- Calls
- Time
- Money
- Retry
- Replan
- Concurrency
- Terminal Outcome

### 10. Instrument 與 Evaluate

- Trace
- Metric
- Audit
- Replay
- Offline Evaluation
- Security Test
- Release Gate
- Rollback

完成這些問題後，Framework 才只是 Implementation Choice，而不是 Architecture Substitute。

## 常見 Anti-pattern

### 每個 Request 都走最自主的 Path

簡單工作承擔最大 Latency、Cost 與 Failure Surface。

### Policy 只寫在 Prompt

Runtime 仍然暴露 Forbidden Capability。

### Unauthorised Data 只在 Model Exposure 後才 Filter

Leak 已經發生。

### Orchestrator 用 Conversation Prose 保存 Progress

Precise State 變得 Lossy，且難以 Resume。

### Verifier 只問另一個 Model 答案對不對

沒有 Executable 或 Evidential Signal。

### 把 Runtime Trace 當成 Evaluation

Team 可以非常清楚地看到每個錯誤答案。

### 只在 Launch 前做 Evaluation

Model、Prompt、Tool、Source 與 Environment 都會 Drift。

### Human Approval 看不到 Evidence 與 Exact Action

Approval 退化成儀式性按鈕。

### Side Effect 沒有 Idempotency 或 Reconciliation

Timeout 變成 Duplicate Write。

### Coding Agent 修改 Test 製造 Pass

Acceptance Mechanism 自己變成 Attack Surface。

### Browser Success 只代表 Click 發生

沒有 Post-condition 證明 Task 完成。

### Monitoring 每次 Run 都發 Alert

系統產生 Notification Fog，而不是有用 Signal。

### Memory 保存所有東西

Sensitive、Stale 與 Unverified Information 進入未來 Context。

### 不支援 Terminal Failure

每個 Failure 都被轉成下一次 Attempt。

## 結論

Production Agent Architecture 是把 Autonomy 組裝在 Control 周圍的工程。

成熟系統通常包含：

```text
Identity and Admission
  -> Router
  -> Durable Orchestration
  -> Bounded Execution
  -> Independent Acceptance

Surrounded by:
Policy · State · Memory · Evidence · Budget · Evaluation · Observability · Human Control
```

六種 Recipe 強調不同 Constraint：

- **Production RAG** 控制 Evidence 與 Access。
- **Deep Research** 控制 Decomposition、Provenance 與 Coverage。
- **Coding Agent** 控制 Executable Change 與 Reproducibility。
- **Browser Agent** 控制不確定介面中的 Action。
- **High-risk Automation** 控制 Authority 與 Side Effect。
- **Long-running Monitor** 控制 Time、Change、Silence 與 Health。

真正讓系統取得運作資格的，不是 Agent 或 Tool 的數量，而是它是否能證明自己做了什麼、限制自己可以做什麼、在不重複傷害的前提下恢復，並以有人負責的 Result 停止。

Part 9 會把整個系列變成 Decision Process：

> 面對一個真實 Task，如何選擇能滿足 Evidence、Risk 與 Operational Requirement 的最小架構？

## 參考資料

- [Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
- [Jimenez et al., *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*](https://arxiv.org/abs/2310.06770)
- [Zhou et al., *WebArena: A Realistic Web Environment for Building Autonomous Agents*](https://arxiv.org/abs/2307.13854)
- [LangGraph Documentation, *Persistence*](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [LangGraph Documentation, *Interrupts*](https://langchain-ai.github.io/langgraph/concepts/breakpoints/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [CloudEvents, *A specification for describing event data in a common way*](https://cloudevents.io/)
- [NIST, *Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile*](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- [OWASP, *Top 10 for Large Language Model Applications*](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

## 系列目錄

| Part | 主題 |
|---:|---|
| 1 | LLM Agent 不只有 ReAct：用六個維度看懂 Agent 架構 |
| 2 | Agent 執行路徑全解：Direct、Pipeline、Router、State Machine 與 DAG |
| 3 | ReAct、Plan-and-Execute、Adaptive Planning 與 HTN |
| 4 | 從單一路徑到 Tree、Graph、MCTS 與 LATS |
| 5 | 驗證、恢復與自我修正 |
| 6 | Multi-Agent 架構全解 |
| 7 | Agent Memory 全解 |
| 8 | Production Agent 架構實戰 |
| 9 | 如何選擇 Agent 架構 |
| 10 | 使用現代 Agent Framework 實作設計模式 |
