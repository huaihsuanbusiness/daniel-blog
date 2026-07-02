---
title: "Agent 設計模式圖鑑 Part 9｜如何選擇 Agent 架構"
description: "以嚴格決策流程選擇能滿足任務動態、證據、風險、權限、恢復、記憶、成本與運營需求的最小 Agent 架構。"
date: 2026-07-01T13:58:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 9
---


前八篇介紹了主要積木：

- Direct、Pipeline、Router、State Machine、DAG 與 Event-driven Workflow
- Fixed Decision、Bounded ReAct、Plan-and-Execute、Adaptive Replanning 與 HTN
- Single-path、Sampling、Ranking、Tree、Graph、MCTS 與 LATS
- Retry、Fallback、Repair、Verification、Generate-and-Test 與 Reflexion
- Single-agent 與 Multi-agent Organisation
- State、Memory、External Knowledge 與 Production Control

知道這些名字，不等於完成架構設計。

Architecture 是一個決策流程，把 Requirement 轉成：

- Execution Path
- Permission Boundary
- Acceptance Contract
- Recovery Policy
- State Model
- Operational Envelope
- Named Owner

目標不是挑出看起來能力最強的 Pattern，而是：

> 選擇能以足夠證據、控制與可恢復性滿足 Contract 的最小系統。

## 架構選型是一個受限制的決策

只有 Pattern 能解決真實 Requirement 時，才應被加入。

錯誤選型流程通常像：

```text
Task 很困難
  -> 加 Planning
  -> 加 Tree Search
  -> 加 Multi-Agent
  -> 加 Long-term Memory
```

Production Decision 應改問：

```text
什麼條件成立才算完成？
Execution 過程中什麼可能改變？
哪些 Action 有 Side Effect？
哪種 Evidence 能證明成功？
哪些 State 必須 Persist？
哪些 Failure 可以 Recovery？
有哪些 Limit 與 Authority？
```

Architecture 是回答這些問題所需的 Mechanism，不是一串時髦名詞。

## Gate 0：選 Pattern 前先定義 Contract

在判斷是否需要 Agent 前，先定義工作。

### Desired Outcome

用可觀測方式描述 Result。

弱定義：

```text
研究市場並提供有用答案
```

較強定義：

```text
比較三個指定產品的八個必要欄位。
使用 Approved Source。
缺少資料時明確標記。
揭露 Conflict。
依 Evaluation Criteria 產生 Recommendation。
```

### Acceptance Evidence

找出可以證明 Result 的訊號。

例如：

- Schema Validation
- Executable Test
- Source 與 Citation Support
- Post-condition
- Rule 或 Solver
- Authorised Human Judgement
- Transaction Record

沒有可信 Acceptance Signal 的 Task，不適合高自主性。

### Prohibited Outcome

例如：

- Unsupported Claim
- Unauthorised Data Access
- 偷偷修改 Test
- Duplicate Payment
- 未批准的 External Publication
- Unverified Content 寫入 Permanent Memory

### Terminal Outcome

不能只有 Success 與 Failure：

- completed
- partial
- blocked
- pending
- unsupported
- inconclusive
- cancelled
- expired
- requires human action

### Operating Envelope

定義：

- Latency
- Monetary Cost
- Model 與 Tool Call
- Retry 與 Replan
- Concurrency
- Data Residency
- Availability
- Retention
- Human-response Time

選型應從 Contract 開始，不是從 Framework 首頁開始。

## Gate 1：Task 是否需要 Agentic Adaptation？

Agent 不是 Default Route。

### 使用 Direct

- 一個 Bounded Operation 足夠
- 所需資訊都在 Input
- 不需要動態 Tool Selection
- Output 可以直接 Check
- Risk 低或由外部控制

Direct 仍可包含 Input Validation、Output Schema、Policy 與 Logging。

### 使用 Pipeline

- Step 已知
- Order 穩定
- 每個 Stage 有 Contract
- Failure 有預定處理
- Observation 不會要求新 Strategy

```text
Upload
  -> Parse
  -> Validate
  -> Transform
  -> Store
```

### 加入 Router

- 不同 Request 需要不同 Path
- Data Source 不同
- Cost 或 Risk Class 不同
- 某些 Task 應交給人
- 某些 Request 不被支援

Router 必須支援：

- unknown
- ambiguous
- clarification required
- unsupported
- denied

### 加入 Bounded Agentic Adaptation

- 下一個有效 Action 依賴 Tool Result
- 無法合理列舉完整 Route
- Environment 是 Partially Observable
- 需要 Local Exploration
- 系統必須在 Approved Tool 中動態選擇

### 加入 Durable State

- Task 可能 Pause 或 Resume
- Approval 是 Async
- Execution 為 Long-running
- Retry 與 Replan 跨越 Process Boundary
- Partial Completion 有意義
- 需要 Interruption Recovery

核心差異不是「簡單或聰明」，而是：

> Current Observation 出現前，是否能安全決定下一個有效 Action？

![Figure 9-1｜是否需要 Agentic Adaptation 決策樹](/images/the-atlas-of-agent-design-patterns-part-9/agent-need-decision-tree.png)

## Gate 2：把 Requirement 轉成可檢查的 Property

不要直接從 User Story 跳到 Architecture Label。

### Task Dynamics

- Single-step 或 Multi-step
- Fixed 或 Observation-dependent
- Branching
- Loop
- Dependency
- Parallelism
- Event 或 Schedule Trigger
- Pause 與 Resume
- Long-running Duration

### Data 與 Trust

- Source of Truth
- Freshness
- Version
- Sensitivity
- Tenant 與 User Scope
- External 或 Internal
- Structured 或 Unstructured
- Untrusted-content Boundary
- Retrieval 或 Live Access

### Tool 與 Side Effect

- Read 或 Write
- Reversible 或 Irreversible
- Idempotent 或 Non-idempotent
- Deterministic 或 Probabilistic
- Permission Level
- Sandbox Availability
- Rate Limit
- Failure Taxonomy
- Reconciliation Support

### Verification

- 是否有 Objective Test
- 是否有 Source Support
- 是否有 Post-condition
- 是否需要 Human Judgement
- False-positive Cost
- False-negative Cost
- 是否允許 Partial
- 是否允許 Abstention

### Operations

- Latency Ceiling
- Cost Ceiling
- Throughput
- Availability Target
- Observability
- Reproducibility
- Audit
- Retention
- Incident Response
- Kill Switch

### Responsibility

- Request Owner
- System Owner
- Final Completer
- Approver
- Data Owner
- Incident Owner
- Separation-of-duties Requirement

這些 Property 才是 Architecture Input。

## 先選 Execution Structure

Execution Structure 回答：

> Work 如何在 System 中移動？

這些選項可以組合，不是互斥 Badge。

### Direct

一個 Bounded Operation。

### Pipeline

Stable Sequence。

### Router

不同 Input 走不同 Path。

### State Machine

Legal Transition、Loop、Waiting、Recovery 或 Terminal State 很重要時使用。

### DAG

Task 有 Dependency Constraint，可以平行再 Join 時使用。

DAG 本身不提供 Recovery Loop。Replanning 後可以由 Outer Workflow 啟動新 DAG。

### Event-driven Workflow

Work 由 Event、Schedule、Queue 或 Async Change 啟動時使用。

Long-running Monitor 可以組合：

```text
Event Trigger
  -> State Machine
  -> Fixed Pipeline
  -> Notification Gate
```

問題不是哪一個名字代表整個 Product，而是哪些 Structure 控制哪些部分。

## 只在需要的位置加入 Decision 與 Planning

Decision Strategy 回答：

> Execution Structure 內部如何選擇下一個 Action？

### Fixed Decision Logic

Route 與 Fallback 已知時使用。

### Bounded ReAct

下一個 Local Action 依賴最新 Observation 時使用。

必要 Control：

- Step Objective
- Allowed Tools
- Maximum Actions
- Duplicate Detection
- Budget
- Completion Criteria
- Escalation
- Structured Observation

### Plan-and-Execute

適合：

- Task 有數個明確 Deliverable
- 遺漏成本高
- Dependency 很重要
- Progress 必須可見
- Delegation 或 Budget 很重要

Plan 必須定義 Executable Step Contract，不是重述 Task。

### Adaptive Replanning

只有 Remaining Plan 可能失效時才加入。

要求：

- Replan Trigger
- Plan Version
- Plan Diff
- Preserved Completed Work
- Invalidated Steps
- Replan Limit
- Verifier Approval

### HTN

Domain 有可重用且受治理的 Decomposition Method 與 Primitive Action 時使用。

HTN 不只是很長的 Checklist，而是依賴 Domain Task、Method、Constraint 與 Operator。

Planning 是 Architecture 內的 Capability，不是它一定能成功的 Evidence。

## Evaluator 能引導時才加入 Multi-path Search

Search 回答：

> 系統是否應保存並比較 Alternative Candidate？

### 保留 Single Path

- 一個 Candidate 通常足夠
- External Verification 強
- Latency 很重要
- First Choice 選錯成本低

### 使用 Self-consistency

- 有一個可正規化 Answer
- Sample Variance 是重要 Error Source
- Agreement 可以計算
- Fact Verification 仍另外執行

### 使用 Generate-and-Rank

- 多個完整 Alternative 有價值
- Reliable Evaluator 可以比較
- Invalid Candidate 先被淘汰

### 使用 Beam Search

- Partial Candidate 逐 Layer 發展
- 只能負擔 Bounded Frontier
- Intermediate State 可以 Score

### 使用 Tree of Thoughts 或其他 Tree Search

- Early Choice 強烈影響後續
- Intermediate State 有意義
- Pruning 與 Backtracking 有用
- Evaluator 可信

### 使用 Graph of Thoughts

- Intermediate Result 必須 Merge
- Result 必須 Reuse
- Dependency、Invalidation 與 Provenance 可治理

### 使用 MCTS-style Search 或 LATS

- Action 會與 Environment 互動
- Repeated Visit 與 Value Update 有價值
- Execution 在 Sandbox 或可 Reversible
- Environment Feedback 真正反映 Goal

不要先買 Search Tree，再去找 Evaluator。否則 System 只會長出 Branch，卻不知道哪裡有果實。

## 增加自主性前先定義 Verification 與 Recovery

Verification 回答：

> 什麼 Evidence 可以接受或拒絕 Result？

Recovery 回答：

> Failure 發生後，最小合理回應是什麼？

### Evidence 必須對應 Claim

| Claim | Preferred Evidence |
|---|---|
| Output Structurally Valid | Schema 或 Parser |
| Code Behaves Correctly | Test、Execution、Build |
| SQL Permitted and Valid | Parser、Read-only Policy、Execution |
| RAG Answer Supported | Claim-to-source Verification |
| Browser Task Succeeded | Functional Post-condition |
| Transaction Completed Once | Transaction Record 與 Reconciliation |
| Open-ended Output Acceptable | Rubric 與 Authorised Judgement |

### Recovery 必須對應 Failure

| Failure | Primary Response |
|---|---|
| Transient 且可安全重做 | Retry |
| Input Parameter 錯誤 | Parameter Repair |
| Current Implementation 不可用 | Fallback |
| Current Artefact 錯誤 | Repair 或 Generate-and-Test |
| Evidence 缺少 | Retrieve、Clarify 或 Abstain |
| Remaining Plan 無效 | Replan |
| Policy Deny Action | Deny 或 Request Approval |
| Capability 或 Data 不存在 | Stop 或 Unsupported |

Verifier 必須可以 Fail、Abstain 與回傳 Inconclusive。Recovery Controller 必須可以 Stop。

## 只有真正的責任邊界才加入 Multiple Agents

Organisation 回答：

> 哪些可獨立定址的 Execution Entity 負責 Work？

### Default：One Agent 或 One Workflow

單一 Orchestration 仍可包含：

- Planner Stage
- Executor Stage
- Critic Stage
- Verifier Stage
- Deterministic Tool

Role Name 不會自動創造 Multiple Agents。

### Supervisor 與 Workers

適合：

- Subtask 自然可分
- Bounded Parallelism 有幫助
- Worker 需要不同 Tool 或 Context
- Supervisor 能分派與驗收
- 一個 Final Owner 整合 Result

### Debate 與 Voting

它們是 Decision Protocol，不是通用 Multi-agent Upgrade。

Agent 必須互相 Challenge 並更新立場時使用 Debate。

Independent Choice 可以 Aggregate 時使用 Voting。

兩者都不能取代 External Evidence。

### Blackboard

多個 Agent 透過 Typed Shared Problem State 協作時使用。

Blackboard 需要：

- Schema
- Read 與 Write Permission
- Versioning
- Conflict Handling
- Provenance
- Scheduling
- Final Owner

### Peer-to-peer 或 Swarm-style Coordination

只有 Central Coordination 確實不適合，且 System 能定義以下項目時才使用：

- Local Rule
- Task Claiming
- Convergence
- Duplicate Suppression
- Global Budget
- Stop Condition
- Kill Switch
- Final Accountability

Multi-agent 應由 Responsibility 與 Communication Need 驗證，不是因為想在圖上放更多 Avatar。

## 分開定義 State、Memory 與 External Knowledge

### Workflow State

Exact Control Information：

- Current Step
- Status
- Attempts
- Approvals
- Plan Version
- Terminal Outcome

### Working Memory

Current Reasoning 所需的 Task-local Intermediate Information。

### Episodic Memory

可能支援 Future Task 的 Past Event 與 Outcome。

### Semantic Memory

Governed Stable Knowledge。

### Procedural Memory

Reusable Method、SOP、Tool Rule 與 Acceptance Procedure。

### User-scoped Memory

由 User Authorise 的 Preference 或 Fact，並支援 Access、Correction、Deletion 與 Expiry。

### Shared Memory

Coordination Scope，不是 Cognitive Type。

### External Knowledge

需要時 Retrieval 的 Source of Truth。

以下情況不要建立 Long-term Memory：

- Task 是 One-off
- Data Sensitive
- Information 很快 Expire
- Source of Truth 可以 Query
- 沒有 Consent
- Delete 無法 Propagate

Memory Selection 必須定義 Source、Scope、Version、Status、Expiry 與 Write Authority。

## Architecture Selection Gate 與 Capability Module

實務選型順序：

```text
1. Define Contract and Risk
2. Select Simplest Execution Structure
3. Add Adaptive Local Decision Only Where Observation Requires It
4. Add Planning Only Where Global Decomposition Provides Value
5. Add Search Only Where Evaluation Can Guide It
6. Add Multiple Agents Only Where Responsibility Boundaries Justify Coordination
7. Add Memory Only Where Future Value Exceeds Governance Cost
8. Apply Identity, Policy, Budget, Evaluation, Observability, and Human Control
```

這不是要求每個 Category 都必須被填滿。

合法 Output 可以是：

```text
Fixed RAG Pipeline
+ One Bounded Query-rewrite Node
+ Citation Verifier
+ No Multi-agent
+ No Long-term Memory
```

![Figure 9-2｜Architecture Selection Gate 與 Capability Module 順序](/images/the-atlas-of-agent-design-patterns-part-9/architecture-selection-sequence.png)

## 用 Autonomy Budget 取代 Autonomy Ladder

Autonomy 不是單一 Scalar Property。

System 可以在 Query Rewrite 上高度自主，卻在 Data Access 與 Side Effect 上完全受限。

沿六個維度定義 Autonomy。

### Action Scope

- One Transformation
- Several Approved Tools
- Arbitrary Tool Sequence
- Cross-system Operation

### Authority

- Propose
- Draft
- Execute Reversible Action
- Execute Irreversible Action
- Delegate Authority

### Duration

- One Call
- One Bounded Session
- Resumable Task
- Continuous Monitor

### Reversibility

- No Side Effect
- Reversible Side Effect
- Compensatable Side Effect
- Irreversible Action

### Environment Uncertainty

- Fixed Input
- Stable API
- Dynamic Document
- Changing Interface
- Open Environment

### External Verifiability

- Deterministic
- Executable
- Evidence-based
- Rubric-based
- Weak or Delayed Feedback

高 Impact 不一定要求更少 Reasoning Autonomy，而是要求對 Authority、Side Effect、Evidence 與 Approval 有更強限制。

Coding Agent 可以在 Disposable Branch 裡自由探索，但完全沒有 Merge Permission。

Research Agent 可以在 Approved Source 內廣泛 Search，但沒有 Publish Permission。

![Figure 9-3｜六維 Autonomy Budget Matrix](/images/the-atlas-of-agent-design-patterns-part-9/autonomy-budget-matrix.png)

## 用實測 Evidence 比較 Architecture，不用通用分數

不存在以下通用真理：

- Direct 的 Quality 永遠較低
- Multi-Agent 永遠以相同倍數增加成本
- Adaptive Planning 永遠降低 Controllability
- RAG 永遠是 Medium Latency

這些 Property 取決於 Implementation 與 Task。

### 先定義 Required Threshold

例如：

- Claim Support 至少 98%
- Task Success 至少 90%
- Critical Policy Violation 等於 0
- p95 Latency 低於 8 秒
- Average Cost 低於指定上限
- Duplicate Side Effect 等於 0
- Human Escalation 低於可接受比例

### 評估 Candidate Architecture

每個 Candidate 實測：

- Task Success
- False Pass 與 False Fail
- Evidence Coverage
- Policy Violation
- Latency Distribution
- Cost Distribution
- Retry 與 Replan Rate
- Human-review Load
- Failure Recovery
- Operator Effort

### 淘汰 Non-viable Option

任何 Hard Safety 或 Quality Threshold 失敗的 Architecture，即使更便宜也必須淘汰。

### 從 Viable Option 選擇

使用 Pareto Reasoning：

> 如果不存在另一個方案在所有必要維度都更便宜且更好，這個方案才可能保留。

Architecture A 可能更快，B 更便宜，C 的 Recovery 更強。Final Choice 取決於 Contract 與 Risk Appetite。

### Change 後重新評估

Model、Prompt、Tool、Data、Policy 與 Environment 都會 Drift。

Release Evaluation 應包含：

- Representative Task
- Regression
- Adversarial Case
- Permission Test
- Failure Path
- Recovery Path
- Cost 與 Latency
- Canary 或 Shadow Deployment

NIST AI RMF 與 GenAI Profile 將 Risk Management 放在 Design、Development、Deployment、Use 與 Evaluation 的完整 Lifecycle，而不是只做 Launch-day Scorecard。

![Figure 9-4｜用 Measured Evidence 比較 Architecture](/images/the-atlas-of-agent-design-patterns-part-9/measured-evidence-comparison.png)

## Agent Architecture Canvas

完整 Design Review 應回答十六個欄位。

### 1. Goal and User Value

真正重要的 Outcome 是什麼？

### 2. Acceptance Evidence

什麼可以證明完成？

### 3. Users, Owners, and Authority

誰 Request、Operate、Approve 並擁有 Result？

### 4. Inputs, Sources, and Trust Boundaries

Data 從哪裡來，哪些 Content 是 Untrusted？

### 5. Tools and Side Effects

什麼能力可以 Read、Write、Send、Publish、Pay、Delete 或 Delegate？

### 6. Execution Structure

Direct、Pipeline、Router、State Machine、DAG、Bounded Loop 或 Event-driven Workflow。

### 7. Decision and Planning

Fixed Logic、Bounded ReAct、Plan-and-Execute、Adaptive Replanning 或 HTN。

### 8. Candidate Search

Single Path、Sampling、Ranking、Tree、Graph 或 Environment Search。

### 9. Verification

Schema、Test、Evidence、Post-condition、Policy、Rubric 或 Human Judgement。

### 10. Recovery

Retry、Parameter Repair、Fallback、Repair、Replan、Escalation 與 Stop。

### 11. Organisation and Final Owner

One Workflow、Multiple Agents、Communication Protocol、Aggregator 與 Completer。

### 12. State and Memory

哪些資訊 Exact、Temporary、Persistent、Shared、Versioned 或 External？

### 13. Identity, Policy, and Risk

Permission、Data Scope、Sandbox、Approval 與 Irreversible-action Rule。

### 14. Budget, Timeout, and Terminal States

Limit、Cancellation、Expiry、Partial Outcome 與 Safe Stop。

### 15. Observability and Evaluation

Trace、Metric、Audit、Replay、Regression Suite 與 Release Gate。

### 16. Incident and Rollback Plan

如何 Suspend System、Revoke Credential、Correct Memory 與 Reconcile Side Effect？

每個 Field 應記錄：

- Decision
- Rationale
- Limit
- Evidence
- Owner
- Unresolved Risk

![Figure 9-5｜Agent Architecture Canvas 16 個欄位](/images/the-atlas-of-agent-design-patterns-part-9/agent-architecture-canvas.png)

## Go、Pilot 或 No-Go

Release State 必須以 Evidence 決定。

### Go

適合：

- Acceptance Criteria 明確
- Representative Evaluation 通過
- Critical Policy Violation 為 0
- Permission 為 Least Privilege
- Failure 與 Recovery Path 已測試
- State 可以安全 Resume
- Observability 與 Incident Response 已準備
- High-impact Action 有 Durable Approval 與 Reconciliation
- Remaining Risk 已由 Owner 接受

### Pilot

適合：

- Core Path 可運作
- Scope、User、Data 與 Tool 受限
- Human Monitoring 持續
- 有快速 Kill Switch
- 部分 Non-critical Failure Mode 仍需 Evidence
- Rollback 簡單
- Pilot 有明確 Exit Decision 與 Date

### No-Go

以下情況必須 No-Go：

- 沒有可信 Verifier
- System 可以在無 Approval 下造成 Irreversible Harm
- Unauthorised Data 可能進入 Model
- Side Effect 沒有 Idempotency 或 Reconciliation
- Task 無法 Persist 或 Recover 必要 State
- 沒有 Budget 或 Stop Condition
- Memory Governance 未定義
- 缺少 Incident Owner 與 Kill Switch
- Evaluation 未通過 Hard Threshold

No-Go 不是 Review 失敗，而是 Safety Mechanism 正常運作。

## 完整範例：Blog Ask AI

Requirement：

> User 可以詢問 Blog Article。System 只根據網站文章回答並附 Citation。Retrieval 弱時可以 Rewrite Query，但不能自由 Browse Open Web，也不能無限 Retry。

### Contract

- 只根據 Authorised Blog Corpus 回答
- 每個 Material Claim 都有 Citation
- Unsupported Question 回傳 Insufficient Evidence
- 不使用 Open-web Search
- 不跨 Tenant 讀取 Data
- Latency 與 Retrieval Cost 有上限

### Execution Structure

```text
Admission and Router
  -> Fixed RAG Pipeline
  -> Claim-to-Evidence Verifier
  -> Answer / Clarify / Abstain
```

### Adaptive Capability

只有一次 Bounded Rewrite Decision：

```text
Low Retrieval Coverage
  -> Rewrite Once
  -> Retrieve Again
  -> Stop
```

不需要 General ReAct Loop。

### Search

- Hybrid Retrieval
- Reranking
- Source Diversity
- No Tree Search
- No Multi-agent Debate

### Verification

- ACL
- Citation Coverage
- Claim Support
- Document Version
- Answerability
- Unsupported-claim Count

### State

- Original Query
- Rewritten Query
- Selected Document ID 與 Version
- Citation Map
- Verifier Result
- Retry Count
- Terminal Outcome

### Memory

不需要 Unrestricted Long-term User 或 Episodic Memory。

### Policy

- Blog Corpus Only
- Retrieved Content 是 Untrusted Data
- No External Web Access
- No Unsupported Claim
- Query 不得直接寫入 Permanent Memory

### Budget and Stop

- Maximum Retrieval Attempts：2
- Maximum Rewrite：1
- Bounded Context 與 Answer Token
- Latency Ceiling
- Terminal Insufficient-evidence State

### Organisation

One Workflow 已足夠。Multiple Agents 只會增加 Hand-off 與 Shared-state Cost，卻沒有解決新的 Requirement。

### Release Evidence

評估：

- Answer Correctness
- Citation Support
- Answerability Classification
- Permission Isolation
- Latency
- Cost
- Adversarial Prompt-injection Content
- Insufficient-evidence Behaviour

Final Architecture 不是「完整自主 Agent」，而是：

```text
Controlled RAG Pipeline
+ One Bounded Adaptive Node
+ Independent Evidence Verification
```

這不是降級，而是 Architecture Restraint 正在發揮作用。

## 常見 Anti-pattern

### Framework-first Selection

Task Contract 還沒出現，Framework Name 已經決定。

### Pattern Shopping

所有 Named Pattern 都因為存在而被加入。

### 把 Agent 當成 Binary Label

Team 爭論整個 Product 是否為 Agent，而不是把 Adaptive Capability 放在特定 Node。

### Universal Autonomy Ranking

Pattern 在無視 Tool、Permission 與 Side Effect 的情況下被賦予固定 Autonomy Score。

### Universal Cost-quality Matrix

沒有 Benchmark Data 的示意估算被當成 Fact。

### Multi-agent Inflation

Role Label 被誤認為 Independent Agent。

### Search Without Evaluator

沒有可信 Selection Signal，卻持續增加 Candidate。

### Memory Without Governance

所有資訊進入同一 Vector Store，沒有 Scope、Status、Expiry 或 Delete。

### Human Approval Theatre

Reviewer 只看到 Approve Button，看不到 Exact Action、Evidence、Impact 與 Expiry。

### Demo Success Becomes Production Readiness

一條 Happy Path 取代 Failure、Permission、Recovery 與 Incident Evaluation。

### Observability Replaces Evaluation

每個錯誤 Decision 都有漂亮 Trace。

### Evaluation Replaces Ownership

高 Benchmark Score 被當成 Operate Authority。

### No Final Owner

多個 Component 產生 Work，卻沒有人負責 Completion。

## Architecture Review Checklist

### Contract

- [ ] Desired Outcome 可觀測
- [ ] Acceptance Evidence 已定義
- [ ] Prohibited Outcome 已定義
- [ ] 支援 Partial 與 Unsupported Outcome
- [ ] Latency 與 Cost Envelope 明確

### Execution

- [ ] 已考慮最簡單可行 Execution Structure
- [ ] 每個 Adaptive Node 個別標出
- [ ] 每個 Loop 有 Limit
- [ ] Pause、Resume 與 Recovery 已定義
- [ ] Terminal State 明確

### Tools and Authority

- [ ] Read 與 Write Capability 分離
- [ ] Least Privilege 在 Prompt 外 Enforcement
- [ ] Side Effect 定義 Idempotency 與 Reconciliation
- [ ] Untrusted Content 無法改變 Policy
- [ ] Irreversible Action 需要適當 Authority

### Verification and Recovery

- [ ] Verifier 可以 Fail 或 Abstain
- [ ] 能使用 Objective Signal 時優先使用
- [ ] Acceptance Artefact 受到保護
- [ ] Retry、Repair、Fallback 與 Replan 分開
- [ ] Duplicate 與 No-progress Condition 會停止 Loop

### State and Memory

- [ ] Workflow State 與 Memory 分離
- [ ] 每個 Persistent Record 有 Source、Scope、Version、Status 與 Expiry
- [ ] User 與 Tenant Isolation 經測試
- [ ] Unverified Content 無法寫入 Durable Memory
- [ ] 支援 Update、Supersede、Delete 與 Audit

### Operations

- [ ] Global 與 Per-component Budget 存在
- [ ] Timeout 與 Cancellation 已定義
- [ ] Trace、Metric 與 Audit 可用
- [ ] 存在 Offline 與 Regression Evaluation
- [ ] Incident Response、Kill Switch 與 Rollback 已準備

### Responsibility

- [ ] Final Owner 已命名
- [ ] Approver Authority 已定義
- [ ] 需要時使用 Separation of Duties
- [ ] Approval 會 Expire，Execution 前重新驗證 State
- [ ] Go、Pilot 或 No-Go Evidence 已記錄

## 最終原則

1. 從 Contract 開始，不從 Framework 開始。
2. 使用能滿足 Task 的最簡單 Execution Structure。
3. 只有 Observation 真的會改變下一個 Action 時才放入 Autonomy。
4. 增加自主性前先定義 Verification。
5. 只有 Reliable Evaluator 存在時才加入 Search。
6. 只有真實 Responsibility 與 Communication Boundary 才加入 Multiple Agents。
7. 只有 Future Value 高於 Governance Cost 時才保存 Memory。
8. 將 Authority、Side Effect 與 Reversibility 和 Reasoning Capability 分開。
9. 以實測 Evidence 與 Hard Threshold 比較 Architecture。
10. 讓 Formal Failure、Abstention 與 No-Go 成為 First-class Outcome。

## 結論

選擇 Agent Architecture 不是一場 Taxonomy Quiz。

它是一連串帶有 Evidence 的 Decision：

```text
Contract
  -> Simplest Execution Structure
  -> Necessary Adaptive Capability
  -> Verification and Recovery
  -> State and Memory
  -> Policy and Authority
  -> Budget and Stops
  -> Evaluation and Ownership
```

最好的 Architecture 不是自主性最高的那一個。

而是能以最少必要複雜度完成 Task、證明 Result、限制 Authority、安全 Recovery，並在有人負責的 Control 下停止的那一個。

Part 10 會從 Architecture Selection 進入 Implementation：

> 如何把這些 Pattern 對應到 Modern Framework，同時避免 Framework Abstraction 取代 System Design？

## 參考資料

- [Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
- [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629)
- [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601)
- [Zhou et al., *Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models*](https://arxiv.org/abs/2310.04406)
- [Wu et al., *AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation*](https://arxiv.org/abs/2308.08155)
- [NIST, *Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile*](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- [OWASP, *Agentic AI Threats and Mitigations*](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/)
- [LangGraph Documentation, *Persistence*](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [LangGraph Documentation, *Interrupts*](https://langchain-ai.github.io/langgraph/concepts/breakpoints/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

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
