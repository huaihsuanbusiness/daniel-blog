---
title: "Agent 設計模式圖鑑 Part 6｜Multi-Agent 的組織、協作與控制"
description: "從 Single Agent、Role-based Workflow、Supervisor-Worker、Planner-Executor-Critic、Debate、Voting、Blackboard、Peer-to-Peer、Swarm-style Coordination，到 Handoff Contract、Shared State、Final Ownership 與 Control Plane，完整拆解 Production Multi-Agent 架構。"
date: 2026-07-01T00:04:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 6
---

# Agent 設計模式圖鑑 Part 6｜Multi-Agent 的組織、協作與控制

前幾篇文章依序處理：

- 任務如何在 Execution Structure 中移動
- Agent 如何選擇下一個 Action
- 系統如何搜尋多個 Candidate Solution
- Output 如何被 Verification，Failure 如何被 Repair

這一篇進入組織維度：

> 任務應由一個 Execution Entity 負責，還是拆給數個可被獨立定址的 Agent？

Multi-Agent 架構圖很容易令人心動。簡報上可以同時出現 Planner、Researcher、Analyst、Coder、Critic、Reviewer、Memory Agent 與 Supervisor，每個角色都有一張漂亮卡片與發光箭頭。

畫面看起來像一間數位公司；Runtime 卻可能只是被困在 Token 焚化爐裡的委員會會議。

每增加一個 Agent，通常也增加：

- 另一個 Model Call 或 Session
- 另一個 Context Boundary
- 另一個 Handoff
- 另一份 Task State
- 另一個 Permission Surface
- 另一個重複工作的來源
- 另一個 Latency Dependency
- 另一個 Failure Mode
- 另一個「到底誰負責完成」的模糊地帶

因此真正的設計問題不是：

> 可以創造多少 Agent Role？

而是：

> 哪些責任真的需要被拆成獨立 Execution Boundary？工作、State、Authority、Evidence 與 Final Ownership 應如何在這些 Boundary 之間移動？

## Multi-Agent 是組織屬性，不是 Reasoning Method

Multi-Agent 描述多個可被定址的 Execution Entity 如何分工與協作。

它不直接決定系統是否使用：

- ReAct
- Plan-and-Execute
- Tree of Thoughts
- Generate-and-Test
- Retry
- Verifier
- Long-term Memory

Supervisor-Worker 系統可以使用 State Machine 作為外層 Workflow，在 Research Worker 內使用 Bounded ReAct，以 DAG 執行平行 Subtask，再由 Verifier 做 Final Acceptance。

```text
Execution Structure: State Machine
Decision Strategy: Plan-and-Execute
Local Execution: Bounded ReAct
Organisation: Supervisor-Worker
Shared State: Typed Task Ledger
Verification: Evidence Verifier
```

這些是不同設計維度。

## 什麼才算一個 Agent Instance？

以 Model 數量定義 Agent，通常不準確。

數個 Agent 可以共用同一個 Foundation Model；同一個 Workflow 也可能呼叫數個不同 Model，卻仍沒有建立多個 Agent。

本文將 **Agent Instance** 定義為一個可以被定址的 Execution Entity，通常具備以下一部分或大部分特徵：

- 自己的 Role 或 Objective
- 自己的 State 或 Working History
- 自己的 Tool 與 Data Permission
- 自己的 Task Lifecycle 與 Status
- Communication Identity
- 可以接收 Contract 並回傳 Result
- 明確 Owner 或 Authority Boundary

Independence 不是二元值。兩個 Agent 可以共用 Model 與 Memory Store，同時保有不同 Task Ownership 與 Permission；反過來，四個 Role Prompt 若由單一 Controller 按順序執行，也可能仍只是 Role-based Workflow。

### 一個 Model 可以驅動數個 Agent

```text
Agent A: Research Role, Browser Permission, Task A
Agent B: Analysis Role, Database Permission, Task B
Agent C: Reviewer Role, No Write Permission, Task C

Shared Base Model
Different Identities, States, Permissions, and Task Lifecycles
```

### 多個 Prompt 不會自動變成多個 Agent

```text
Planner Prompt
 -> Writer Prompt
 -> Critic Prompt
 -> Finaliser Prompt

One Controller
One Shared State
Predetermined Sequence
```

這可以是很好的責任分離，但 Role Name 本身不足以證明它是 Multi-Agent System。

### 多個 Candidate 不代表多個 Agent

- 同一 Model Sample 五個 Answer
- 一個 Agent 執行 Tree Search
- 一個 Workflow 呼叫數個 LLM Node
- 同一 Model 切換不同 System Prompt

以上都可能產生多份 Output，卻沒有多個可被獨立定址的 Agent。

<!-- Figure 6-1 insertion point -->

![Figure 6-1 — One Model, Multiple Roles, or Multiple Agents](/images/the-atlas-of-agent-design-patterns-part-6/single-vs-multi-agent-instance.png)

> **Figure 6-1｜One Model, Multiple Roles, or Multiple Agents**  
> Model Count、Role Count、Agent Instance Count 是三個不同屬性。一個 Model 可以驅動多個 Agent；多個 Role Prompt 不一定構成多個 Agent。Multi-Agent 描述的是可被定址的 Execution Entity 與它的 Lifecycle，不是 Model 數量。

## 不應被壓成單一 Taxonomy 的五個層級

把 Supervisor、Debate、Blackboard 與 Swarm 放在同一張平面清單，會掩蓋它們其實解決不同問題。

| 層級 | 問題 | 範例 |
|---|---|---|
| Execution Entity | 有多少可定址 Worker？ | Single Agent、Multiple Agents |
| Responsibility Split | 誰負責哪一類工作？ | Supervisor-Worker、Planner-Executor-Critic |
| Communication Topology | Message 如何流動？ | Centralised、Hierarchical、Peer-to-Peer |
| Coordination Medium | Shared Intermediate State 放在哪裡？ | Blackboard、Task Ledger、Message Bus |
| Collective Decision Protocol | 競爭 Result 如何被解決？ | Debate、Voting、Judge、Verifier |

Production System 通常會同時組合數個層級：

```text
Multiple Agent Instances
 + Supervisor-Worker Responsibility Split
 + Centralised Messaging
 + Typed Blackboard
 + Verifier-based Final Acceptance
```

這種描述比把整套設計叫做「Debate Architecture」或「Swarm」更精確。

## 除非拆分真的解決問題，否則先從一個 Agent 開始

Single Agent 仍然可以：

- Planning
- 使用 Tool
- 維護 Structured State
- 呼叫 Verifier
- 在上限內 Retry
- 暫停等待 Human Approval
- 執行長時間 State Machine

```text
User Request
 -> Single Agent
 -> Plan
 -> Use Tools
 -> Update State
 -> Verify
 -> Return Result
```

### 優點

- 一個主要 Context
- Responsibility 清楚
- Handoff 較少
- Coordination Cost 較低
- Trace 簡單
- Stop Condition 容易定義
- State Synchronisation 較少

### 限制

- Context 可能過大
- 一個 Executor 可能需要太多 Tool
- Skill 與 Permission Boundary 難以隔離
- 獨立 Subtask 無法真正 Concurrent
- 一個錯誤 Assumption 可能污染整個 Run
- 長任務容易丟失 Local Detail

### 適合優先使用 Single Agent 的情況

- 自然存在單一 Task Owner
- 工作可放在同一 Context 與 State Model
- Parallel Execution 沒有明顯價值
- Permission 不需要隔離
- Handoff Cost 大於拆分效益
- 一個完整 Evaluator 就能驗收整體 Result

Production 的預設應該是：

> 從能滿足 Task Contract 的最小組織結構開始。

## Role-based Single Workflow：不建立獨立 Agent，也能分離責任

Role-based Workflow 讓不同 Stage 承擔不同責任：

```text
Planner Role
 -> Writer Role
 -> Critic Role
 -> Finaliser Role
```

它可能使用：

- 一個或數個 Model
- 一份 Shared Workflow State
- 一個 Central Controller
- Predetermined Transition
- 沒有可被獨立定址的 Worker Lifecycle

### 優點

- Prompt 更聚焦
- 每個 Stage 的 Responsibility 明確
- Flow 容易控制
- 比 Conversational Agent Network 便宜
- Handoff 可預測

### 風險

- Role 只有名稱不同
- Shared Blind Spot 穿過所有 Stage
- Critic 把 Generator 的 Assumption 當成事實
- 系統謊稱得到「獨立共識」
- 所有 Role 繼承相同過度權限

Role-based Workflow 很有價值，只需要誠實描述它的實作方式。

## 何時真的值得使用多個 Agent？

只有當拆分產生無法以更低成本取得的 Operational Benefit 時，才值得加入 Agent。

### 自然的 Task Decomposition

Subtask 具有不同 Objective，且可以回傳 Structured Result。

### Parallel Work

互不依賴的 Subtask 可以在 Resource Limit 內同時執行。

### Skill Isolation

不同 Worker 需要真正不同的 Prompt、Tool、Model 或 Context。

### Permission Isolation

Reviewer 不應有 Write Permission；Database Worker 可能只需要 Read-only Credential；Deployment Worker 可能需要 Approval。

### Fault Containment

一個 Worker 失敗，不一定讓其他工作全部無效。

### Information Locality

不同 Worker 擁有不同 Data Source 或 Environment。

### 真正的 Viewpoint Diversity

獨立 Evidence、Model、Assumption 或 Role，可能揭露 Blind Spot。

不要只因 Framework 很容易寫出 `agents = []`，就開始繁殖 Agent。

## Supervisor-Worker：以中央協調分派與整合工作

Supervisor-Worker 使用 Central Coordinator 分派並整合工作。

```text
 Supervisor
 / | \
 Researcher Analyst Tester
 \ | /
 Structured Worker Results
 -> Aggregator
 -> Verifier
 -> Final Owner
```

Supervisor 可以是 LLM Agent、Deterministic Service、Workflow Engine 或 Hybrid Controller。

### Supervisor 的責任

- 理解 Global Goal
- 拆解工作
- 判斷哪些 Task Ready
- 依 Capability、Permission、Cost 與 Load 選擇 Worker
- 發出 Task Contract
- 追蹤 Deadline 與 Status
- 偵測 Duplicate 與 Worker Failure
- Aggregate 或 Route Result
- 執行 Budget 與 Stop Condition

### Worker 的責任

- 接受或拒絕 Task Contract
- 執行一個 Bounded Objective
- 只使用 Permitted Tool 與 Data
- 保存 Provenance
- 回傳 Structured Result
- 回報 Blocker 與 Partial Completion
- 不偷偷重新定義 Task

### Worker Contract

Worker 應收到：

```text
Task ID
Objective
Inputs
Dependencies
Allowed Tools
Expected Output Schema
Completion Criteria
Budget
Deadline
Failure Policy
Return Address
```

### Structured Worker Result

```json
{
 "task_id": "pricing-framework-a",
 "status": "partial",
 "facts": [],
 "sources": [],
 "unresolved": ["enterprise price not published"],
 "cost": {"tool_calls": 4},
 "return_to": "supervisor-1"
}
```

### Aggregation 是另一個獨立責任

Worker 可以產生接近 Final-ready 的 Section，但系統仍需要指定 Component：

- Normalise Format
- Deduplicate Finding
- 解決或揭露 Conflict
- 檢查 Version Consistency
- 保存 Source Link
- 判斷 Missing Work 是否可接受

這個 Component 可以是 Supervisor、Dedicated Aggregator 或 Finaliser。

### 主要風險

- Supervisor Bottleneck
- Supervisor Context Overload
- Assignment 重疊
- Worker Output 不相容
- Straggler Worker
- Central Point of Failure
- Worker 等待不必要的 Approval
- Supervisor 產生 Worker Evidence 中不存在的結論

### Production Control

- Worker Capability Registry
- Concurrency Limit
- Deadline 與 Heartbeat
- Reassignment Policy
- Partial-result Policy
- Typed Result Schema
- Final Acceptance Gate
- 必要時提供 Supervisor Failover

<!-- Figure 6-2 insertion point -->

![Figure 6-2 — Supervisor-Worker with Contract and Aggregation](/images/the-atlas-of-agent-design-patterns-part-6/supervisor-worker-contract.png)

> **Figure 6-2｜Supervisor-Worker with Contract and Aggregation**  
> Supervisor 發出 Task Contract，Worker 依 Allowed Tools 與 Permission 執行後回傳 Structured Result。Aggregator、Verifier 與 Final Owner 仍然是獨立責任，不能被 Supervisor 吸收。否則瓶頸、Context Overload 與「自己寫考卷自己改」會在 Supervisor 內部一起爆。

## Planner-Executor-Critic-Verifier 是責任拆分，不一定是 Multi-Agent

這個 Pattern 將 Cognitive 與 Control Responsibility 分開。

### Planner

- 理解 Goal
- 拆解 Step
- 定義 Dependency
- 設定 Completion Criteria
- 分配 Budget

### Executor

- 執行 Current Step
- 使用 Tool
- 保存 Evidence
- 回報 Status 與 Blocker

### Critic

- 診斷 Omission、Risk 或 Weak Reasoning
- 提供 Evidence 與 Repair Direction
- 不負責認證完成

### Verifier

- 驗證 Explicit Acceptance Contract
- 回傳 Pass、Fail、Review 或 Inconclusive
- 決定是否需要 Repair 或 Replanning

### Final Owner

- 發布或回傳 Formal Result
- 擁有 Terminal State
- 不得繞過 Failed Acceptance Check

這套設計可以由以下方式實作：

- 一個 Model 搭配 Role-specific Prompt
- 數個可被定址的 Agent
- Deterministic Planner 加 Model Executor
- Model Critic 加 External Test Verifier

名稱描述的是 Responsibility Separation，不是 Agent Count。

### Production Flow

```text
Goal
 -> Planner
 -> Versioned Plan and Step Contracts
 -> Executor
 -> Critic Findings
 -> Bounded Repair
 -> Verifier
 -> Pass -> Final Owner
 -> Repair -> Executor
 -> Replan -> Planner
 -> Review -> Human Approver
 -> Stop -> Terminal Outcome
```

### 常見失敗

Critic 同時變成 Verifier，永遠能找到下一個 Style Improvement，Repair Loop 因此永遠到不了 Contract-based Terminal Decision。

<!-- Figure 6-3 insertion point -->

![Figure 6-3 — Planner, Executor, Critic, Verifier, and Final Owner](/images/the-atlas-of-agent-design-patterns-part-6/planner-executor-critic-verifier.png)

> **Figure 6-3｜Planner, Executor, Critic, Verifier, and Final Owner**  
> 規劃、執行、診斷、驗收、發布是五種不同責任。把它們壓在同一個 Prompt 裡，會讓 Critic 變成另一個 Generator，Repair Loop 永遠到不了 Terminal Decision。

## Debate 與 Voting 是 Collective Decision Protocol

Debate 與 Voting 回答的是：不同 Candidate 應如何比較。它們本身不會定義 Task Ownership、Messaging Infrastructure、Memory 或 Execution Topology。

## Debate：不同立場之間必須真正互動

真正的 Debate 需要 Interaction。

```text
Agent A Proposes Claim A
 <-> Agent B Challenges Evidence
 <-> Agent A Responds
 <-> Agent B Exposes Remaining Disagreement
 -> Judge or Verifier
```

Independent Proposal 直接送給 Judge，屬於 Ensemble 或 Panel，不一定是 Debate。

### 可能價值

- 揭露未說明的 Assumption
- 迫使 Evidence 被辯護
- 呈現 Counterargument
- 幫助 Judge 看到 Disagreement
- 在部分 Task 與 Protocol 上改善表現

Multi-Agent Debate 研究在部分 Reasoning 與 Oversight Setting 中報告改善；較新的研究也指出，結果高度依賴 Task、Judge、Agent Strength、Diversity 與 Protocol，部分情境中，多數 Gains 其實來自 Voting。

### 風險

- Persuasion 勝過 Truth
- 高信心 Agent 主導
- Social Pressure 讓 Agent 收斂
- 所有 Agent 共用錯誤 Premise
- Judge 偏好 Writing Style 或 Model Identity
- Debate Cost 高於 Disagreement 的價值
- Private Reasoning Narrative 被誤當 Evidence

### Production Control

- 指定真正不同的 Evidence 或 Assumption
- 固定 Acceptance Rubric
- 可行時 Blind Model 或 Role Identity
- 要求 Citation 或 Executable Evidence
- 限制 Round
- 保存未解決 Disagreement
- Calibrate Judge
- 允許 `inconclusive`

## Voting：聚合彼此獨立的 Choice

Voting 聚合 Candidate Selection：

```text
Candidate A: 3 Votes
Candidate B: 2 Votes
Candidate C: 0 Votes
```

可能規則包括：

- Majority
- Plurality
- Ranked Choice
- Weighted Vote
- Threshold Approval
- Safety 或 Policy Veto

### Voting 適合的情況

- Candidate Set 固定
- Vote 可以 Independent 產生
- Voter 有真正 Diversity
- Aggregation Rule 符合 Decision
- 錯誤 Majority 仍會被 Verification 攔下

### Voting 不是 Factual Verification

五個 Agent 仍可能共用相同過時 Source 或 Prompt Bias。

Majority Result 仍應通過：

- Hard Constraint
- Evidence Check
- Policy Check
- 可用時的 External Test

## Blackboard：透過 Shared Structured State 協作

Blackboard Pattern 早於 LLM Agent。Knowledge Source 透過讀寫 Shared Problem-solving Workspace 協作，並受到某種 Control Policy 管理。

在 LLM-based System 中，Blackboard 可以保存：

- Original Goal
- Task Ledger
- Proposed Facts
- Verified Facts
- Open Questions
- Evidence
- Candidate Solutions
- Conflicts
- Decisions
- Worker Status

```text
Research Agent <-> Shared Blackboard <-> Analysis Agent
 ^
 |
 Reviewer Agent
```

### Blackboard 不是 Conversation Dump

不要把每一個 Prompt、Completion 與 Tool Transcript 都當成同等可信的 Shared Memory。

應使用 Typed Entry：

```text
Proposed
Verified
Rejected
Superseded
Expired
```

每個 Item 至少應有：

- Entry ID
- Type
- Author
- Source
- Timestamp
- Version
- Validation State
- 有意義時的 Confidence
- Read / Write Policy
- Expiry
- Dependency Link

### 主要風險

- 一個 Wrong Fact 污染所有 Worker
- Concurrent Write Conflict
- Stale Entry 持續有效
- Permission 過度寬鬆
- Board 無上限成長
- Upstream Correction 後，Downstream Node 沒有失效

### Production Control

- 每種 Entry Type 的 Schema
- Optimistic Locking 或 Transaction
- Provenance
- Conflict-resolution Policy
- Write Permission
- Validation Gate
- Retention Policy
- Immutable Audit Log
- Downstream Invalidation

<!-- Figure 6-4 insertion point -->

![Figure 6-4 — Blackboard Coordination with Typed Entries](/images/the-atlas-of-agent-design-patterns-part-6/blackboard-typed-entries.png)

> **Figure 6-4｜Blackboard Coordination with Typed Entries**  
> Blackboard 不是把對話 dump 進 Shared Memory。Entry 必須有 Type（Proposed / Verified / Rejected / Superseded / Expired）、Source、Author、Version、Validation State 與 Read/Write Policy。沒有這些欄位，Board 會被一個 Unverified Fact 污染整個 Worker Network。

## Peer-to-Peer Coordination：沒有單一中央 Supervisor 的直接 Handoff

Peer-to-Peer Topology 讓 Agent 直接溝通。

```text
Agent A <-> Agent B
 ^ |
 | v
Agent D <-> Agent C
```

適合：

- Resource 分散
- Task Topology 動態改變
- Central Coordinator 可能成為 Bottleneck
- Agent 需要 Local Negotiation 或 Handoff

### 風險

- Circular Delegation
- Message Storm
- Task State 不一致
- Responsibility Drift
- Indirect Permission Escalation
- 沒有 Terminal Owner
- Duplicate Task Claim

### 必要 Control

- Message Schema
- Task 與 Correlation ID
- Sender 與 Recipient Identity
- Hop Count
- Time to Live
- Deduplication Key
- Task Owner
- Capability Registry
- Delegation Permission
- Terminal Owner
- Cycle Detection

## Swarm-style System：使用這個詞前，先定義它

「Swarm」是一個被過度使用的 Label。

本文將 Swarm-style System 定義為：

> 許多相對輕量的 Agent，依靠 Local Information、Task-claiming Rule 與有限 Peer Interaction 協作，沒有一個 Fixed Central Planner 控制每一個 Action。

有些 Software Framework 用 Swarm 表示普通 Agent Handoff；另一些則用它表示 Decentralised Local-rule Coordination。因此，名稱本身不是 Architecture Specification。

真正可用的設計仍必須回答：

- 誰建立 Task
- Work 如何被 Claim
- Duplicate Claim 如何避免
- 哪些 State 是 Global
- 哪些 State 是 Local
- Convergence 如何量測
- 誰或什麼宣告完成
- Cost 如何限制
- 系統如何被停止

### 可能優點

- 沒有單一 Coordination Bottleneck
- Local Fault Tolerance
- Dynamic Allocation
- Redundant Exploration
- 可擴展到大量小 Task

### 風險

- Emergent Behaviour 只是不可預測，不代表有智慧
- Duplicate Work
- Message 與 Model Cost 無上限
- Global Consistency 弱
- Outcome 難以重現
- Accountability 模糊
- 沒有自然 Stop Condition

### Production Control

- Task Lease 或 Lock
- Maximum Active Agents
- Message TTL 與 Hop Limit
- Global Cost Budget
- Local Action Budget
- Convergence Metric
- No-progress Detection
- Kill Switch
- Human Override
- 完整 Message 與 Ownership Trace

一堆小圓圈不等於 Swarm Protocol。在 Coordination Rule 被寫清楚前，它只是一張 Clip Art。

## Communication Topology 會改變 Operational Risk

| Topology | 主要優點 | 主要風險 |
|---|---|---|
| Centralised | Control 與 Final Ownership 清楚 | Bottleneck 與 Single Point of Failure |
| Hierarchical | 將 Central Control 擴展到多個 Team | Layer 間 Information Loss 與 Latency |
| Blackboard | 重用 Shared Intermediate State | Pollution、Conflict、Permission Complexity |
| Peer-to-Peer | 彈性的 Direct Collaboration | Message Cycle 與 Responsibility Drift |
| Swarm-style | Local Autonomy 與 Dynamic Allocation | Convergence、Cost 與 Accountability |

系統可以混合 Topology。Worker 可以向 Supervisor 回報，同時從 Blackboard 讀取 Verified Fact；Team Supervisor 也可以在 Hierarchy 內做 Local Coordination。

<!-- Figure 6-5 insertion point -->

![Figure 6-5 — Communication Topology and Operational Risk](/images/the-atlas-of-agent-design-patterns-part-6/communication-topology-risks.png)

> **Figure 6-5｜Communication Topology and Operational Risk**  
> Topology 不是裝飾，會直接決定 Operational Risk。Centralised 有 Bottleneck、Hierarchical 有 Latency、Blackboard 有 Pollution、Peer-to-Peer 有 Cycle、Swarm-style 有 Convergence 與 Cost。Production 系統常常需要混用，但混用前要先把每個 Layer 的責任講清楚。

## Structured Handoff Contract 是整套架構的結締組織

不要這樣交接：

```text
Please Continue the Task.
```

Handoff Contract 應包含：

```text
Task ID
Parent Task
Objective
Inputs
Known Facts
Open Questions
Allowed Tools
Data and Permission Scope
Expected Output Schema
Completion Criteria
Budget
Deadline
Failure Policy
Return Address
```

Handoff Result 應包含：

```text
Status
Completed Requirements
Evidence
Unresolved Items
Conflicts
Cost Used
Side Effects
Next Recommended Action
```

### Contract 的價值

- 保存 Original Goal
- 降低 Context Transfer
- 標準化 Aggregation
- 明確 Ownership
- 支援 Retry 與 Reassignment
- 顯示 Partial Completion
- 防止 Permission Leakage

### Context 應被 Scope，而不是整包複製

只傳送 Worker Contract 所需的最少資訊：

- Stable Goal Summary
- Relevant Verified Facts
- Permitted Sources
- Constraints
- Expected Output

不要自動把每一段 Internal Conversation 複製給每個 Agent。

## Shared State 需要 Trust、Version 與 Ownership

Shared State 應回答：

- 哪個 Goal Version 正在生效？
- 哪些 Task Ready、Running、Blocked 或 Complete？
- 哪些 Fact 已 Verified？
- 哪些 Entry 只是 Proposal？
- 哪個 Agent 擁有每個 Task？
- 哪個 Source 支援每份 Result？
- 哪份 Result 已被 Superseded？

實用的 Shared-state Model 包括：

```text
Goal Store
Task Ledger
Assignment Registry
Evidence Store
Decision Log
Conflict Register
Final Artefact Registry
```

### 不要把 Shared State 與 Long-term Memory 混在一起

Shared Workflow State 是為了協調 Current Run；Long-term Memory 則跨 Run 保存經過選擇的資訊。

兩者的 Retention、Permission 與 Validation Rule 應不同。

## Final Ownership 與 Acceptance 必須明確

「大家都負責」通常等於沒有人負責。

Production System 應指定：

- **Task Owner**：對 Current Task 負責
- **Aggregator**：整合 Worker Result
- **Verifier**：執行 Acceptance Contract
- **Final Owner**：發布或回傳 Formal Output
- **Human Approver**：必要時授權 High-impact Action

同一個 Component 可以兼任數個 Role，但 Responsibility 必須清楚。

### Verifier 不一定是 Final Owner

Verifier 可以判斷 Result Pass；另一個 Finaliser 負責 Format 與 Publish；Legal 或 Business Authorisation 仍可能由 Human Owner 承擔。

### 只能有一個 Formal Final State

應避免：

- 多個互相競爭的 Final Answer
- Silent Overwrite
- Unverified Draft 被發布
- Worker 繞過 Aggregation
- Disagreement 消失但沒有 Decision Record

## Production Multi-Agent Control Plane

Agent 本身不是完整 Production Architecture；上方還需要 Control Plane。

### Agent Registry

- Agent ID
- Role
- Capabilities
- Allowed Tools
- Data Permissions
- Model 與 Version
- Cost Tier
- Current Load
- Health Status

### Task Ledger

- Task ID
- Parent Task
- Owner
- Dependencies
- Status
- Deadline
- Budget
- Attempts
- Final Outcome

### Message Layer

- Schema
- Sender 與 Recipient
- Correlation ID
- Delivery State
- 必要時的 Ordering
- Deduplication
- Retry Policy
- TTL
- Dead-letter Handling

### Shared-state Layer

- Goal
- Plan
- Verified Facts
- Worker Results
- Conflicts
- Decisions
- Final Artefacts

### Policy Layer

- Tool Access
- Data Access
- Delegation Rights
- Indirect Permission Check
- Cost Limit
- Risk Gate
- Human Approval

### Observability

- Agent 與 Task Trace
- Message Count
- Tool Calls
- Token 與 Monetary Cost
- Worker Latency
- Handoff Failure
- Duplicate Work
- State Conflict
- Final Outcome

### Kill Switch

以下情況應 Stop 或 Pause：

- 超過 Cost Limit
- 發生 Message Storm
- 偵測到 Delegation Cycle
- 沒有 Measurable Progress
- 跨越 Security Boundary
- State 無法 Reconcile
- Human Cancel Run

## Cost 與 Latency 本質上是 Coordination Problem

Multi-Agent Cost 不只來自 Model Inference：

- Prompt Repetition
- Context Packaging
- Worker Startup
- Message Transport
- State Persistence
- Aggregation
- Conflict Resolution
- 等待 Straggler
- Judge 與 Verifier Call
- Retry 與 Reassignment

### 常見 Latency Pattern

#### Straggler

Final Result 等待最慢的 Required Worker。

#### Sequential Handoff

標榜 Parallel 的設計實際上一個 Role 接一個 Role 執行。

#### Review Bottleneck

所有 Output 都等待同一個 Critic 或 Verifier。

#### Context Serialisation

大型 Intermediate Artefact 被不斷複製與重新 Summary。

### Control

- Maximum Agents
- Maximum Worker Calls
- Bounded Concurrency
- Per-worker 與 Global Budget
- Shared Retrieval Cache
- Deduplication
- Deadline
- Early Cancellation
- Partial Aggregation
- 依 Task Difficulty 選 Model
- Cancellation Propagation

## 主要 Failure Mode

### Duplicate Work

兩個 Worker Claim 同一 Task。

Control：Unique Task ID、Lease、Assignment Registry、Deduplication。

### Responsibility Gap

每個 Agent 都認為 Requirement 由別人處理。

Control：Task Owner、Return Address、Completion Contract、Final Owner。

### Handoff Loss

Constraint、Evidence 或 Scope 在 Transfer 中消失。

Control：Structured Contract、Immutable Goal Reference、Required Field。

### Conflicting Result

Worker 使用不同 Version 或得到相反 Conclusion。

Control：Provenance、Conflict Register、Aggregator、Verifier、Human Review。

### Infinite Delegation

A 交給 B、B 交給 C、C 又交回 A。

Control：Delegation Graph、Hop Limit、Cycle Detection、Maximum Depth。

### Shared-state Pollution

Unverified Proposal 被所有 Agent 當成 Fact。

Control：Trust State、Validation Gate、Write Permission、Versioning。

### Worker Silence

Worker Failure，但系統永久等待。

Control：Deadline、Heartbeat、Timeout、Reassignment、Partial Policy。

### Judge Bias

Judge 偏好 Style、Model Identity 或 Majority Confidence。

Control：Rubric、Blind Evaluation、Calibration、External Evidence。

### Permission Laundering

Agent 透過另一個 Agent 間接取得 Restricted Effect。

Control：對真正 Action 做 End-to-end Authorisation，而不是只檢查 Sender Identity。

### No Final Owner

有多份 Output，卻沒有 Component 能正式完成 Task。

Control：Final Owner、Terminal State、Acceptance Record。

## 如何選擇 Organisation Design

從能滿足真實 Separation Need 的最簡單結構開始。

| Need | Starting Design |
|---|---|
| 一個 Context 與 Owner 已足夠 | Single Agent |
| 需要 Role Focus，但不需要 Independent Worker | Role-based Workflow |
| Subtask 清楚且需要 Central Governance | Supervisor-Worker |
| Planning、Execution、Diagnosis、Acceptance 要分離 | Responsibility Split，可單 Agent 或多 Agent |
| 需要對 Competing Claim 做 Interactive Challenge | Debate Protocol |
| 需要聚合 Independent Fixed Choice | Voting Protocol |
| 需要重用 Shared Intermediate Result | Blackboard Coordination |
| 需要直接 Dynamic Handoff | Peer-to-Peer Topology |
| 許多小 Task 依 Local Rule Allocation | 明確定義的 Swarm-style Protocol |

加入 Agent 前，先問：

1. 它將擁有什麼獨立 Responsibility？
2. 是否需要 Separate State、Permission、Tool 或 Lifecycle？
3. 它會收到什麼 Contract？
4. 它會回傳什麼 Structured Result？
5. 誰 Aggregate 與 Verify 它的 Output？
6. 它遲到、錯誤、重複或沉默時怎麼辦？
7. 預期 Quality 或 Latency Gain 是否大於 Coordination Cost？

## 何時不應使用 Multi-Agent？

以下情況應避免：

- Task 沒有自然 Division
- 所有 Subtask 都需要相同的大型 Context
- 一個 Agent 已經滿足 Acceptance Contract
- 沒有 Aggregation 或 Verification Mechanism
- Permission Boundary 無法執行
- Latency Budget 很緊
- Communication Cost 大於工作本身
- Decision 需要 Single-point Accountability
- 系統無法 Observe 或 Stop Interaction Network

## 完整範例：多來源 Framework Research

Task：

> 比較三個 Agent Framework，推薦適合 Production RAG 的選擇。

### Step 1：Task Admission

Controller 檢查：

- Scope
- Allowed Sources
- Time 與 Tool Budget
- Independent Subtask 是否值得 Parallel Worker

### Step 2：Supervisor 建立 Contract

```text
Task A: Official Architecture and Execution Model
Task B: Persistence and State Management
Task C: Observability, Testing, and Evaluation
Task D: Deployment and Operational Complexity
```

每份 Contract 使用相同 Evaluation Rubric，但 Objective 不同。

### Step 3：Worker 執行

Worker 回傳：

- Structured Findings
- Official Sources
- Version Dates
- Unresolved Fields
- Cost 與 Status

### Step 4：Blackboard 保存 Typed Entry

```text
Proposed Facts
Verified Facts
Open Questions
Conflicts
Missing Evidence
```

### Step 5：Critic 診斷缺口

- Missing Dimension
- 應使用 Official Evidence 卻使用 Third-party Evidence
- 混用 Framework Version
- Unsupported Inference

### Step 6：Aggregator 整合 Result

- Normalise Schema
- Deduplicate Fact
- 保存 Disagreement
- 找出 Missing Evidence

### Step 7：Verifier 執行 Contract

- Official-source Coverage
- Required Field
- Explicit Unknown
- Recommendation 是否有 Evidence

### Step 8：Final Owner 發布單一 Result

系統保存 Final Artefact 與 Acceptance Decision。

這套架構可以同時使用 Supervisor-Worker、Blackboard、Critic、Verifier 與 Final Ownership，卻不需要 Debate、Peer-to-Peer 或 Swarm。

價值來自清楚的 Responsibility 與 Evidence Flow，而不是 Agent Count。

## Production Checklist

### Need 與 Identity

- 每個 Agent 是否擁有不同 Responsibility？
- Agent 是否可以被 Operationally Address？
- State、Authority 與 Lifecycle Boundary 是否清楚？
- Role-based Workflow 是否已經足夠？

### Contract 與 Ownership

- 每個 Task 是否有 Owner？
- Handoff Contract 是否 Structured？
- Return Address 是否明確？
- 是否只有一個 Formal Final Owner？

### Communication

- Message 是否 Typed？
- 是否定義 Correlation ID、TTL、Deduplication 與 Hop Limit？
- 是否能偵測 Cycle 與 Message Storm？
- 是否有 Dead-letter Handling？

### Shared State

- Proposed 與 Verified Entry 是否分開？
- 是否保存 Source、Author、Version 與 Validation Status？
- Concurrent Write 是否受控？
- Stale Downstream Result 是否能被 Invalidate？

### Permission 與 Safety

- Tool 與 Data Permission 是否依 Agent 分開？
- Delegated Action 是否做 End-to-end Reauthorisation？
- High-impact Action 是否需要 Approval？
- Worker 是否能修改 Acceptance Criteria？

### Cost 與 Stopping

- 是否有 Global 與 Per-agent Budget？
- Concurrency 是否 Bounded？
- Deadline 與 Cancellation 是否向下傳播？
- 是否能偵測 No Progress？
- 是否有 Kill Switch？

### Verification

- Worker Output 是否在 Publish 前被 Aggregate？
- Disagreement 是否保留到解決為止？
- Verifier 是否使用 Observable Evidence？
- Run 是否可以 Partial、Blocked 或 Inconclusive 結束？

## 結論

Multi-Agent Architecture 不是在 Canvas 上增加 Role Card 的藝術。

它真正要工程化的是：

- Execution Identity
- Responsibility Boundary
- Communication Topology
- Shared State
- Collective Decision Protocol
- Authority
- Final Ownership
- Operational Control

不同 Mechanism 解決不同問題：

- **Single Agent** 把 Ownership 與 State 放在一起。
- **Role-based Workflow** 分離 Responsibility，但不一定建立 Independent Agent。
- **Supervisor-Worker** 集中 Task Assignment 與 Integration。
- **Planner-Executor-Critic-Verifier** 分離 Cognitive 與 Acceptance Responsibility，可由一個或數個 Agent 實作。
- **Debate** 在 Competing Position 間加入 Interactive Challenge。
- **Voting** 聚合 Independent Choice。
- **Blackboard** 透過 Typed Shared State 協作。
- **Peer-to-Peer** 在沒有單一 Central Supervisor 時直接 Handoff。
- **Swarm-style Coordination** 透過明確 Local Rule 分散大量小型 Decision。

Production System 應能回答：

```text
Who Owns Each Task?
What May Each Agent Do?
What State Does Each Agent Trust?
How Are Messages Identified and Bounded?
Who Resolves Conflicts?
Who Verifies the Result?
Who Owns the Final Output?
What Stops the System?
```

如果這些問題沒有答案，Multi-Agent 只是把一個 Black Box 拆成一群更小的 Black Box，再用一窩義大利麵箭頭串起來。

Part 7 將進入整張架構地圖的最後一個維度：

> Context、Workflow State、Working Memory、Long-term Memory 與 RAG 到底有什麼不同？

## 參考資料

- [Wu et al., *AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation*](https://arxiv.org/abs/2308.08155)
- [Li et al., *CAMEL: Communicative Agents for Mind Exploration of Large Scale Language Model Society*](https://arxiv.org/abs/2303.17760)
- [Hong et al., *MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework*](https://arxiv.org/abs/2308.00352)
- [Qian et al., *ChatDev: Communicative Agents for Software Development*](https://arxiv.org/abs/2307.07924)
- [Du et al., *Improving Factuality and Reasoning in Language Models through Multiagent Debate*](https://arxiv.org/abs/2305.14325)
- [Choi et al., *Debate or Vote: Which Yields Better Decisions in Multi-Agent Large Language Models?*](https://arxiv.org/abs/2508.17536)
- [Wu et al., *Can LLM Agents Really Debate? A Controlled Study of Multi-Agent Debate in Logical Reasoning*](https://arxiv.org/abs/2511.07784)
- [Nii, *The Blackboard Model of Problem Solving and the Evolution of Blackboard Architectures*](https://doi.org/10.1609/aimag.v7i2.537)
- [Guo et al., *Large Language Model based Multi-Agents: A Survey of Progress and Challenges*](https://arxiv.org/abs/2402.01680)

## 系列目錄

| Part | 主題 |
|---:|---|
| 1 | LLM Agent 不只有 ReAct：用六個維度看懂 Agent 架構 |
| 2 | Agent 執行路徑全解：Direct、Pipeline、Router、State Machine 與 DAG |
| 3 | ReAct、Plan-and-Execute、Adaptive Planning 與 HTN |
| 4 | 從單一路徑到 Tree、Graph、MCTS 與 LATS |
| 5 | 驗證、恢復與自我修正 |
| 6 | Multi-Agent 的組織、協作與控制 |
| 7 | Agent Memory 全解 |
| 8 | Production Agent 架構實戰 |
| 9 | 如何選擇 Agent 架構 |
| 10 | 使用現代 Agent Framework 實作設計模式 |
