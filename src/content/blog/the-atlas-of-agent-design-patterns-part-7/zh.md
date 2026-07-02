---
title: "Agent 設計模式圖鑑 Part 7｜Context、State、Memory 與 RAG"
description: "從 Working、Episodic、Semantic、Procedural、User 與 Shared Memory，到 RAG 邊界、Memory Write、Retrieval、Conflict、Version、Forgetting 與 Production Memory Architecture，完整拆解 Agent 記憶系統。"
date: 2026-06-27T09:00:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 7
---


一個 Agent 正執行到長任務的一半。

它已經：

- 搜尋三個官方來源
- 排除兩個誤導頁面
- 完成七個步驟中的四個
- 得知使用者不接受第三方定價資料
- 發現某個 API 需要額外權限
- 記錄了一項不應重複的失敗

接著 Context Window 被壓縮、Process 重啟，或任務改由另一個 Worker 接手。

系統再次搜尋相同頁面、重做已被否決的 Action、忘記使用者限制，甚至推翻自己先前的結論。

這不只是 Model Capability 問題，通常更是資訊架構問題。

系統沒有正確區分：

- **Context**：模型現在能看見什麼
- **Workflow State**：執行現在在哪裡
- **Working Memory**：Active Task 正在使用什麼
- **Long-term Memory**：哪些資訊可跨 Step 或跨 Run 重用
- **External Knowledge**：哪些資訊由其他 Source 管理
- **RAG**：如何把 External 或 Stored Information 取回 Current Context

接上 Vector Database 不會自動產生 Memory；保存每一段對話也不會自動產生有用 Memory。兩者都可能只造出一間塞滿無標籤紙箱的閣樓。

Production Memory Design 必須回答：

```text
什麼值得保存？
它屬於哪一種資訊？
誰擁有它？
誰可以讀取或修改？
什麼證據支持它？
有效期限多長？
與新資訊衝突時怎麼辦？
何時應刪除、過期或 Supersede？
```

本文會以三個彼此分離的軸建立實務模型：

1. **Function**：保留的是哪一類資訊
2. **Scope and Ownership**：資訊適用於誰
3. **Lifecycle**：資訊如何寫入、檢索、更新與遺忘

把這三個軸拆開，可以修正 Agent Memory 最常見的分類錯誤。

## Memory Taxonomy 需要不只一個軸

常見清單包括：

- Working Memory
- Episodic Memory
- Semantic Memory
- Procedural Memory
- User Memory
- Shared Memory
- External Memory

問題是，這些名稱並不是在描述同一種屬性。

### Axis 1：Information Function

這個軸描述資訊代表什麼。

- **Working Memory**：暫時性的 Task Material
- **Episodic Memory**：過去 Event、Action 與 Outcome
- **Semantic Memory**：可重用 Fact 與 Concept
- **Procedural Memory**：可重用的行動知識

### Axis 2：Scope and Ownership

這個軸描述資訊屬於誰，或誰可以使用。

- **Agent-local**
- **Task-local**
- **User-scoped**
- **Team-shared**
- **Tenant 或 Organisation-scoped**
- **Public 或 External**

User-scoped Item 可以是 Semantic：

```text
使用者偏好繁體中文。
```

也可以是 Episodic：

```text
使用者在上一次 Task 拒絕第三方定價。
```

Shared Memory 可以保存 Working Notes、Verified Facts 或 Procedures。「Shared」並不能說明 Content Type。

### Axis 3：Lifecycle and Source of Truth

這個軸描述資訊來自哪裡，以及應存在多久。

- Immediate Model Context
- Active-task Storage
- Cross-session Memory
- Externally Managed Source
- Immutable Event Log
- Versioned Knowledge Store
- Expiring Cache

同一個 Fact 可能經過數個 Lifecycle Stage：

```text
Tool Result
  -> Current Context
  -> Working-memory Candidate
  -> Verified Semantic-memory Entry
  -> Source 更新後被 Supersede
```

這些標籤可以組合，不應被硬塞成一條垂直階梯。

![Figure 7-1｜記憶分類的三個獨立軸](/images/the-atlas-of-agent-design-patterns-part-7/three-axis-memory-map.png)

## Context、State、Memory、External Knowledge 與 RAG

這些概念彼此相關，但回答不同問題。

### Context

Context 是模型在當前 Inference 或 Reasoning Step 中可以使用的輸入。

它可能包含：

- System Instruction
- Current User Request
- 被選中的 Conversation History
- Workflow State Summary
- Retrieved Document
- Tool Result
- Selected Memory Entry
- Applicable Procedure

Context 是被組裝出來的，不等於系統的完整歷史。

資訊如果沒有進入 Current Model Input，也無法透過 Action 取得，模型在這一步就不能直接使用。

### Workflow State

Workflow State 保存執行控制資訊。

常見欄位：

```text
workflow_id
current_node
step_status
retry_count
plan_version
pending_approval
worker_assignment
remaining_budget
last_error
terminal_status
```

State 回答：

> 目前 Run 在哪裡、已經發生什麼，以及下一個合法 Transition 是什麼？

這些欄位通常需要精確與 Atomic Update。把 `retry_count: 2` 摘要成自然語言，之後再從 Conversation 反推數字，是一齣袖珍但高機率上映的行政災難。

### Working Memory

Working Memory 是 Active Task 的暫時資訊工作區。

可能包含：

- Intermediate Finding
- Current Hypothesis
- Resolved 與 Unresolved Requirement
- Source Summary
- Rejected Candidate
- Temporary Calculation
- Draft Artefact
- Local Decision

Working Memory 回答：

> Active Task 目前知道什麼，又還在處理什麼？

每個 Step 只需把其中相關部分放入 Model Context。

### Long-term Memory

Long-term Memory 保留超過單一步驟，有時也跨越不同 Run 的可重用資訊。

可能包含：

- Past Episode
- Verified Fact
- Validated Procedure
- User-approved Preference
- Durable Organisation Convention

「Long-term」不代表「永遠」。所有 Durable Memory 都需要 Retention 與 Invalidation Policy。

### External Knowledge

External Knowledge 由 Agent Memory Lifecycle 之外的 Source 管理。

例如：

- Official Documentation
- Product Catalogue
- Policy Repository
- Code Repository
- Database
- Wiki
- Document Archive
- Knowledge Graph
- Web Source

External System 仍然是 Source of Truth。

### RAG

Retrieval-augmented Generation 將 Non-parametric Source 的 Retrieval 與 Generation 結合。在 Application Architecture 中，實務流程是：

```text
Query
  -> Retrieve Candidates
  -> Filter and Rerank
  -> Put Selected Evidence into Context
  -> Generate or Decide
```

RAG 是 Retrieval 與 Context Construction Mechanism，不等於 Memory。

Memory Store 可以使用 Retrieval；External Document Collection 也可以使用 Retrieval。兩者甚至可共用 Retriever，但 Governance 與 Source-of-truth Rule 仍然不同。

### 一行版區別

```text
Context：
模型現在能使用什麼

State：
執行現在在哪裡

Working Memory：
Active Task 正在維護與使用什麼

Long-term Memory：
系統保留什麼供之後重用

External Knowledge：
其他 Source 管理什麼

RAG：
如何把選定資訊取回 Context
```

![Figure 7-2｜Context、State、Memory、External Knowledge 與 RAG](/images/the-atlas-of-agent-design-patterns-part-7/context-state-memory-rag.png)

## Stateless 是合理設計

Stateless System 不跨 Request 保留 Application Memory。

```text
Request
  -> Bounded Processing
  -> Response
  -> Discard Task Data
```

適合：

- 翻譯
- 單次改寫
- Classification
- Fixed Extraction
- Format Conversion
- 沒有 Persistence 需求的 Sensitive Task
- Caller 會提供所有必要 State 的操作

優點：

- Behaviour 更簡單
- Privacy 與 Retention Risk 較低
- 更容易 Reproduce
- 不受 Stale Memory 污染
- Deletion Obligation 較少
- Storage 與 Retrieval Cost 較低

Stateless 不代表 Runtime 沒有 Log 或 Operational Record，而是這些紀錄不會在沒有獨立目的與 Policy 的情況下被重用成 Agent Memory。

預設值不應該是「全部記住」，而應該是：

> Future Value 不足以抵銷 Governance Cost 時，就不要持久化。

## Working Memory：Active Task Workspace

Working Memory 支援目前執行中的 Task。

例如：

```text
Goal:
比較三個 Orchestration Framework

Verified:
- Framework A 支援 Durable Checkpoint
- Framework B 需要 External Persistence

Unresolved:
- Framework C 的 Observability Model

Rejected:
- Third-party Pricing Claim

Next:
閱讀 Framework C 官方 Tracing Documentation
```

### Working Memory 不等於 Context Window

Context Window 是某一步的 Model Input。

Working Memory 可以：

- 大於單次 Model Context
- 使用 Structured Format
- 儲存在 Model 外部
- 被選擇性注入
- 與 Workflow Runtime 共用
- 在同一 Task 的 Process Restart 後保留

Context Builder 選擇下一次 Call 要帶入什麼：

```text
Current Request
+ Exact Workflow Fields
+ Relevant Working-memory Items
+ Selected Long-term Memory
+ Retrieved External Evidence
+ Applicable Procedure
```

### Working Memory 需要 Trust State

不要把所有 Entry 混成一袋。

可使用：

- proposed
- observed
- verified
- rejected
- superseded
- unresolved

Draft Hypothesis 不應被取回後當成 Accepted Fact。

### 典型 Retention

Working Memory 通常保留到：

- Task 完成
- Task 取消
- Task 過期
- Task Archived
- 達到 Retention Limit

其中部分 Artefact 可以之後被 Promotion 成其他 Memory Type，但 Promotion 必須是明確動作。

## State 不是另一種自然語言 Memory

State 可以與 Task Memory 存在同一個 Database，但語意不同。

比較：

```text
Working Memory:
兩個 Official Source 支持這項 Claim。

Workflow State:
current_node = VERIFY
retry_count = 1
approval_status = PENDING
```

Working Memory 常可摘要或壓縮。

Control State 則可能需要：

- Exact Value
- Transactional Update
- Concurrency Control
- Checkpoint
- Idempotency
- Legal-transition Validation

把 State 當成 Unstructured Conversation Summary，可能造成：

- Retry Counter 重設
- 已完成 Step 再次執行
- Approval Status 遺失
- 兩個 Worker 同時 Claim Task
- 舊 Plan Version 重新成為 Active

Storage Technology 可以共用，Contract 不應混用。

## Episodic Memory：過去 Event 與 Outcome

Episodic Memory 表示某個具體情境中發生了什麼。

有效 Episode 可以包含：

```text
Goal:
取得完整 Job Description

Situation:
Stored Description 為空

Action:
Fetch Source URL

Observation:
Page 只暴露 Partial Content

Fallback:
使用 Public Job-posting Endpoint

Outcome:
取得完整 Description

Environment:
Source Version 與 Access Date

Evidence:
Request Trace 與 Retrieved Document

Reflection Candidate:
偵測到 Partial Page 後使用 Public Endpoint
```

### Episode 的用途

- 診斷重複 Failure
- 取得 Similar Case
- Replay Action History
- 支援 Long-running Work
- Personalise Future Interaction
- 評估哪些 Strategy 有效
- 產生有 Evidence 的 Reflection Candidate

Generative Agents 使用 Experience Memory Stream、Reflection 與 Retrieval 支援 Planning；Reflexion 把過去 Trial 的 Verbal Feedback 存進 Episodic Buffer。這些是 Experience Reuse 的例子，不代表每個 Event 都值得永久保存。

### 主要風險

#### Surface Similarity

兩個 Episode 表面相似，Critical Constraint 可能不同。

#### Misattribution

系統可能只記住 Success 前一個 Action，卻沒找出真正 Cause。

#### Staleness

API、Product、Permission 與 Environment 會改變。

#### Privacy

Episode 可能包含 User Data、Tool Output 或敏感 Operation Detail。

#### Volume

Raw Event History 會淹沒 Retrieval。

Episode 應保留 Evidence 與 Context，同時足夠精簡，能被 Retrieval 與 Inspection。

## Semantic Memory：可重用 Fact 與 Concept

Semantic Memory 保存可重用 Declarative Knowledge。

例如：

- Product Capability
- Organisation Definition
- Tenant Configuration
- Approved Domain Term
- Stable User Setting
- Verified Entity Relationship

Production Semantic-memory Record 應像 Versioned Claim，而不是漂浮句子。

```text
Claim:
Enterprise Plan 支援 SSO

Source:
Official Product Documentation

Source Version:
2026-06

Effective Scope:
Enterprise Plan, Global Region

Validation:
Verified

Valid From:
2026-06-01

Last Checked:
2026-07-01
```

### Fact 需要 Provenance 與 Time

沒有 Source 或 Effective Period 的 Fact 很難：

- Verify
- Update
- Supersede
- Audit
- 依 Scope 限制

Model-generated Inference 不應被寫成有來源的 Fact。

可使用狀態：

- proposed
- verified
- disputed
- superseded
- expired
- revoked

### Semantic Memory 與 RAG

Semantic Memory 描述 Information 的 Role 與 Lifecycle。

RAG 描述如何把 Information 取回 Model。

Semantic-memory Store 可以透過：

- Metadata Filter
- SQL
- Vector Search
- Graph Traversal
- Keyword Search

Official Document Store 使用同樣 Retrieval Technique，也不會因此變成 Agent Memory。

## Procedural Memory：如何行動的可重用知識

Procedural Memory 保存 Reusable Behaviour 或 Task Procedure。

例如：

- Validated SOP
- Tool-selection Rule
- Escalation Sequence
- Fallback Policy
- Verification Checklist
- Handoff Contract
- Safe Retry Procedure
- Approved Output Schema

範例：

```text
Procedure:
取得完整 Job Description

Trigger:
Stored JD 為空或 Partial

Preconditions:
Source URL 存在
使用者可存取 Listing

Steps:
1. 開啟 Source URL
2. 檢查是否包含完整 Responsibilities 與 Requirements
3. Page 只有 Partial Content 時使用 Approved Public Endpoint
4. 仍無法取得完整 JD 時標記 Pending
5. 絕不只根據 Title 評分

Scope:
Job-scoring Workflow

Owner:
Recruiting-automation Team

Version:
3.2

Validation:
Approved
```

### Procedure 與 Prompt

Prompt 是 Instruction 的一種 Delivery Mechanism。

Procedural Memory 是可被 Selection、Version、Test 與 Governance 的 Knowledge，之後可以被插入 Prompt 或 Tool Policy。

Application 不應盲目取得每個語義相似 Procedure，必須檢查：

- Trigger
- Preconditions
- Scope
- Version
- Permissions
- Conflicts
- Expiry
- Approval Status

### Voyager 與 Reusable Skill

Voyager 在 Embodied Environment 中展示保存與取得 Executable Code Behaviour 的 Skill Library，是 Reusable Procedural Capability 的一個例子。但 Production Procedure 也可以是 Natural-language SOP、Workflow Definition、Code、Policy 或 Tool Schema。

### 主要風險

- Outdated Procedure
- Conflicting Rule
- Accidental Lesson 被升級成 Global Rule
- Scope 遺失
- Unsafe Procedure 被錯誤 User 或 Environment 取用
- Procedure 未經 Review 就被修改

High-impact Procedure 需要 Owner、Test、Version 與 Rollback。

## User Memory 是 Scope，不是第五種 Cognitive Content Type

User Memory 保存 User-scoped Information。

它可以是：

- Semantic：Stable Preference
- Episodic：過去被接受的 Decision
- Procedural：User-specific Workflow Rule
- Task-working：只與 Active Request 相關的 Preference

可能值得明確保存的項目：

- Preferred Language
- Preferred Output Format
- Accessibility Requirement
- Stable Notification Setting
- User-approved Workflow Rule
- 會改變 Future Execution 的 Persistent Restriction

不應隨意保存：

- Personality Guess
- One-off Emotion
- 從無關內容推測的 Sensitive Attribute
- Transient Conversation Detail
- Third-party Personal Data
- 使用者不合理預期會持久化的資訊

User-memory Design 應支援：

- Clear Purpose
- Understandable Consent 或 User Action
- View
- Correction
- Deletion
- Scope
- Retention
- Access Control
- Auditability

設計目標不是最大化情感熟悉感，而是在 User Control 下保留能可預測改善 Future Work 的資訊。

## Shared Memory 是 Coordination Scope

Shared Memory 讓多個 Agent 或 Service 透過共同資訊協作。

它可能包含：

- Task Goal
- Current Plan
- Verified Facts
- Open Questions
- Worker Assignment
- Structured Result
- Conflict Flag
- Accepted Decision
- Shared Procedure

「Shared」描述 Access 與 Coordination，底層 Entry 仍有 Content Type 與 Trust State。

### Blackboard 是一種 Shared-memory Architecture

Blackboard Architecture 中，多個 Knowledge Source 或 Worker 讀寫共同 Problem-solving Space。Controller 或 Scheduling Mechanism 可以決定下一個 Contribution。

Production Blackboard 不只是 Shared Text Field，至少需要：

- Typed Entry
- Author
- Source
- Version
- Validation Status
- Write Permission
- Conflict Rule
- Subscription 或 Task Trigger
- Audit Log
- Retention

### Local Memory 與 Shared Memory 應分開

Agent-local Working Memory 可以包含：

- Raw Note
- Temporary Hypothesis
- Tool Log
- Private Scratch Artefact

Shared Memory 只應包含 Coordination 需要的資訊：

- Structured Result
- Verified Fact
- Open Question
- Accepted Decision
- Task Status

這能降低 Noise、Privacy Spread 與 Accidental Reuse。

### Shared-memory Permission

可定義操作：

- read
- propose
- validate
- approve
- supersede
- revoke
- delete

不是每個 Worker 都能 Overwrite Verified Fact 或把 Item Promotion 進 Long-term Memory。

## External Knowledge 應保留自己的 Source Identity

External Knowledge Store 包括：

- Document
- Database
- Wiki
- Policy
- Manual
- Code Repository
- Catalogue
- Knowledge Graph
- Web Page

它們通常由其他系統管理，並有自己的 Update 與 Permission Model。

常見錯誤：

```text
Retrieve 一個 Paragraph
  -> Summarise
  -> 把 Summary 存成 Permanent Fact
  -> Source 與 Version 消失
```

更好的 Record 會保留 Link：

```text
Derived Memory:
Scoped Summary

Derived From:
document_id
document_version
section
retrieval_time
access_policy
```

能保存 Source-of-truth Reference 時，不要預設把整份 Source Copy 進 Memory。

RAG 可以再取回：

- Original External Evidence
- Derived Memory
- 或兩者同時取回，但採用不同 Trust 與 Freshness Rule

## Memory 是 Lifecycle，不是 Database

完整 Memory System 至少包含：

```text
Observe
  -> Decide Whether to Write
  -> Classify Type and Scope
  -> Normalise
  -> Validate
  -> Store
  -> Retrieve Candidates
  -> Filter and Rerank
  -> Assemble Context
  -> Use
  -> Evaluate Usefulness
  -> Update, Supersede, Expire, or Delete
```

### 1. Observe

Candidate 可能來自：

- User Input
- Tool Result
- Workflow Event
- Accepted Output
- Verifier Result
- Human Decision
- Reflection

Observe 不代表自動 Approved。

### 2. Write Decision

詢問：

- Future 是否會再用？
- 是否已存在？
- 是否只是 Temporary State？
- 是否包含 Sensitive Data？
- 是否有 Source？
- User 或 Policy 是否允許持久化？
- 是否可重新取得 Original Source？

正確 Write Target 可能是 `none`。

### 3. Classify

指定：

- Content Type
- Owner and Scope
- Retention Class
- Sensitivity
- Trust State
- Source-of-truth Relationship

### 4. Normalise

將 Candidate 轉為 Structured Record。

### 5. Validate

檢查：

- Evidence
- Accuracy
- Scope
- Consent 或 Authority
- Duplication
- Conflict
- Policy
- Retention
- Write Permission

### 6. Store

根據 Access Pattern 與 Contract 選擇：

- Relational Database
- Document Store
- Key-value Store
- Vector Index
- Graph Database
- Event Log
- Object Storage

同一 Memory Record 可以有數個 Physical Index。Vector Index 通常是 Access Path，不是完整 Source of Truth。

### 7. Retrieve

根據：

- Task 與 Query
- Type
- User 或 Tenant
- Project
- Time
- Permission
- Status
- Source
- Semantic Relevance
- Exact Identifier

取得 Candidate。

### 8. Filter and Rerank

Semantic Similarity 只是其中一個 Signal。

可以加入：

- Applicability
- Scope Match
- Recency
- Source Authority
- Validation Status
- Confidence
- Contradiction
- User 或 Tenant Match
- Cost of Use

不要假裝一條 Universal Weighted Formula 適用所有 Memory Type。Hard Permission Mismatch 應直接 Filter Out，而不是只扣三分。

### 9. Assemble Context

Context Builder 決定：

- 哪些 Exact State Field 必須帶入
- 哪些 Working-memory Item 相關
- 哪些 Long-term Memory 適用
- 需要哪些 External Evidence
- 每個 Category 分配多少 Token Budget

### 10. Use and Evaluate

追蹤 Retrieved Memory 是否：

- 改變 Decision
- 改善 Task Success
- 避免重複工作
- 造成 Error
- 被忽略
- 已 Stale 或 Irrelevant

### 11. Update、Supersede、Expire 或 Delete

Memory 必須能被 Correction 與 Forgetting。

![Figure 7-3｜記憶是一個生命週期，不是資料庫](/images/the-atlas-of-agent-design-patterns-part-7/memory-lifecycle-loop.png)

## Retrieval：先判斷 Applicability，再看 Similarity

Semantic Similar Item 仍可能不可用，因為它：

- 屬於另一個 User
- 適用另一個 Product Version
- 已過期
- 尚未 Verified
- 與 Current Policy 衝突
- 已 Superseded
- 需要 Current Agent 沒有的 Permission

Robust Retrieval Pipeline：

```text
Permission and Scope Filter
  -> Lifecycle-status Filter
  -> Candidate Retrieval
  -> Semantic and Lexical Relevance
  -> Recency and Authority Reranking
  -> Contradiction Check
  -> Context-budget Selection
```

### Hard Filter

例如：

- Tenant
- User
- Project
- Region
- Memory Type
- Access Policy
- Active Status
- Effective Date
- Expiry
- Sensitivity Class

### Ranking Signal

例如：

- Semantic Relevance
- Exact-key Match
- Source Authority
- Recency
- Prior Usefulness
- Confidence
- Task Compatibility
- Novelty

### Retrieval Budget

限制：

- Memory 數量
- Token
- 每種 Type 的 Entry 數
- Age Range
- Minimum Confidence
- Duplicate Content
- Conflicting Candidate 數量

LongMemEval 顯示 Long-term Memory 能力不只是 Raw Recall，還包含 Information Extraction、Multi-session Reasoning、Temporal Reasoning、Knowledge Update 與 Abstention。

Memory System 若很有信心地找回過時 Preference，不能只因為「找到東西」就算成功。

## Conflict 與 Version Governance

Memory Conflict 很正常。

例如：

```text
Procedure v1:
使用 Billing API v1

Procedure v2:
使用 Billing API v2
```

```text
五月紀錄的 Preference:
使用簡短回答

七月紀錄的 Preference:
技術主題提供詳細解釋
```

### Conflict Type

- **Temporal**：Old 與 New Version 不同
- **Scope**：不同 User、Region、Project、Plan 或 Environment
- **Source**：Official 與 Secondary Source 不一致
- **Procedural**：兩個 Rule 指定不同 Action
- **Identity**：兩筆 Record 可能是同一或不同 Entity
- **Preference**：User Choice 因時間或 Task 不同
- **Derived-fact**：結論來自不同 Evidence

### Resolution Order

實務順序：

1. 確認 Entity 與 Scope
2. 比較 Effective Time
3. 檢查 Source Authority 與 Provenance
4. 比較 Validation Status
5. 檢查 Supersession Link
6. 判斷是否可在不同 Condition 下並存
7. 標記 Unresolved Conflict
8. High-impact Ambiguity 進 Escalation

### 不要靜默 Overwrite History

使用 Version Model：

```text
Memory v1
status: superseded

Memory v2
status: active
supersedes: v1
reason: official API migration
```

Version History 支援：

- Audit
- Rollback
- Debug
- Behaviour-change Analysis
- Source Refresh

### Invalidation 應傳播

Semantic Fact 改變時，由它衍生的 Item 也可能需要 Review。

```text
External Document Updated
  -> Semantic Claim Superseded
  -> Cached Summary Invalidated
  -> Dependent Procedure Flagged
  -> Affected Shared Decision Reverified
```

因此 Provenance 本質上像 Graph，即使 UI 看起來只是一張 Table。

![Figure 7-4｜衝突、Supersession 與 Invalidation 傳播](/images/the-atlas-of-agent-design-patterns-part-7/memory-conflict-supersession.png)

## Forgetting 是功能，不是缺陷

沒有 Forgetting 的 Memory System，時間越久可能越不可靠。

應 Forget 或 Retire 的原因：

- Task 完成
- Retention Period 結束
- User Delete
- Source Revoked
- Policy 改變
- Item 被 Superseded
- Confidence 低於 Threshold
- Memory 從未有用
- Privacy 或 Security Requirement
- Duplicate Consolidation
- Incorrect Inference

「Forget」可能代表：

- 不再進 Active Retrieval
- Expire
- Archive
- Revoke
- Tombstone
- Physical Delete
- Delete Derived Index
- 只保留必要 Audit Record

Deletion 必須涵蓋 Secondary Artefact：

- Vector Index
- Cache
- Summary
- Replica
- Derived Profile
- Shared Copy

否則系統只是在儀式上忘記，資料則在六個 Index 裡繼續過著精彩人生。

## Production Memory Architecture

Production Architecture 應分離 Control、Storage、Retrieval 與 Governance。

### Context Builder

從以下來源組裝 Model Input：

- Current Request
- Exact Workflow State
- Selected Working Memory
- Applicable Long-term Memory
- Retrieved External Evidence
- Procedure
- Policy Instruction

### Memory Router

決定 Candidate 應寫到：

- No Storage
- Working Memory
- Episodic Memory
- Semantic Memory
- Procedural Memory
- User-scoped Memory
- Shared Memory

### Write Validator

檢查：

- Source
- Scope
- Duplication
- Conflict
- Sensitivity
- Authority
- Retention
- Write Permission
- User Control

### Typed Store

不同 Memory Contract 可使用不同 Storage 與 Index。

例如：

- Workflow State 放 Transactional Store
- Episode 放 Event 或 Document Store
- Semantic Claim 放 Relational 或 Graph Model
- Procedure 放 Versioned Registry
- User Preference 放 Scoped Profile Store
- Large Source Document 放 Object Storage
- Vector Index 作 Retrieval Accelerator

### Retrieval Layer

支援：

- Metadata Filter
- Exact Lookup
- Semantic Search
- Keyword Search
- SQL
- Graph Traversal
- Time-aware Retrieval
- Authority 與 Version Reranking

### Shared-memory Gateway

控制哪些 Local Result 能被其他 Agent 看見。

它會執行：

- Task Scope
- Typed Handoff
- Trust State
- Read and Write Permission
- Conflict Flag
- Final-owner Decision

### Governance Layer

控制：

- Version
- Supersession
- Expiry
- Deletion
- Access
- Audit
- Retention
- Approval
- Source Refresh
- Organisation 所定義的 Legal 或 Policy Requirement

### Observability

追蹤：

- Write-candidate Rate
- Accepted-write Rate
- Retrieval Hit Rate
- Useful-memory Rate
- Stale-memory Rate
- Conflict Rate
- Privacy-deletion Completion
- Memory-caused Error Rate
- Retrieval Latency
- Context Token Cost
- Abstention Quality

![Figure 7-5｜Production Memory Architecture](/images/the-atlas-of-agent-design-patterns-part-7/production-memory-architecture.png)

## 如何評估 Memory System

Memory Demo 常只問：

> 系統能不能記得上一次 Conversation 的一個 Fact？

Production Evaluation 需要更多。

### Recall

需要的 Item 是否被取回？

### Precision

是否避免取回 Irrelevant 或 Prohibited Item？

### Temporal Correctness

是否使用當前時間有效的 Version？

### Update Handling

New Fact 是否正確 Supersede Old Fact？

### Scope Correctness

Item 是否適用於正確 User、Tenant、Project 與 Region？

### Abstention

沒有 Reliable Memory 時，系統是否承認不知道？

### Privacy and Access

是否阻止 Cross-user 或 Unauthorized Retrieval？

### Usefulness

Memory 是否改善 Downstream Outcome？

### Harm

Stale 或 Incorrect Memory 是否造成更差 Decision？

Evaluation Set 應包含：

- Conflicting Update
- Similar but Inapplicable Episode
- Revoked User Preference
- Expired Procedure
- Cross-tenant Trap
- Unsupported Question
- Deletion Request
- Source-version Change

Long Context 不能取代這些能力。MemGPT、LongMem、MemoryBank 等系統探索不同 Extended-memory Mechanism；LongMemEval 類 Benchmark 則讓 Update、Temporal 與 Abstention 問題可被看見。

## 不應保存什麼

### 每段 Raw Conversation

大部分內容沒有 Future Value。

### Unverified Guess

```text
使用者可能偏好……
```

Guess 不應成為 Profile Fact。

### 每個 Transient Failure

一次 Timeout 不應建立 Permanent Procedure。

### Sourceless Claim

沒有 Provenance，Correction 只能靠猜。

### 預設保存整份 External Document

除非 Duplicate 有清楚目的，否則保存 Reference 與 Index。

### 沒有 Defined Need 的 Sensitive Information

Persistence 必須有目的與控制。

### Finished Workflow Counter 當成 Long-term Knowledge

`retry_count = 2` 通常隨 Run 結束而失效。

### Raw Model Reasoning 取代 Audit

應保存 Decision、Action、Evidence 與 Outcome，而不是無限制 Private Reasoning Text。

### 不可撤銷的結論

High-impact Memory 必須能 Correction、Supersede 或 Remove。

## 完整範例：Job-scoring Agent 的 Memory Design

Task：

> 必須閱讀完整 Job Description 後，判斷職缺是否值得投遞。

### Context

目前 Model Call 可見：

- Current Job Description
- CV Summary
- Scoring Rubric
- Applicable Procedure
- Exact Row Identifier
- Relevant User Constraint

### Workflow State

```text
row_id: 253
jd_status: COMPLETE
scoring_status: IN_PROGRESS
retry_count: 0
current_node: SCORE
```

### Working Memory

```text
Required Capabilities Found:
- Product Strategy
- AI / ML
- Stakeholder Management

Potential Gap:
- Local-language Requirement

Unresolved:
- Visa Sponsorship
```

### Episodic Memory

Past Event：

```text
Situation:
LinkedIn Page 只包含 Partial JD

Action:
Fetch Approved Public Endpoint

Outcome:
取得完整 JD

Evidence:
Request Trace 與 Source Identifier
```

Similar Partial-page Failure 出現時，可取回此 Episode。

### Procedural Memory

```text
Trigger:
Stored JD 為空或 Partial

Procedure:
1. Fetch Source URL
2. 確認 Responsibilities 與 Requirements 完整
3. 必要時使用 Approved Public Endpoint
4. 仍無完整內容時標記 Pending
5. 絕不只根據 Title 評分
```

### User-scoped Memory

```text
Preference:
只考慮分數 80 以上職缺

Source:
Explicit User Instruction

Scope:
Job-scoring Workflow
```

### Semantic Memory

```text
Claim:
Scoring Threshold 為 80

Scope:
Current Workflow Version

Validation:
Approved

Version:
2.1
```

這也可能純粹放在 Procedural 或 Configuration Data。關鍵是 Source 與 Scope 清楚。

### External Knowledge

- Current Job Listing
- Company Careers Page
- Public Job-posting Endpoint
- Visa-policy Source

它們仍是 External Source，應重新 Retrieval 或 Version。

### Shared Memory

多個 Worker 參與時，只分享：

- Complete JD
- Verified Extracted Requirement
- Unresolved Question
- Final Score Component
- Source Reference

不要分享每個 Browser Log 與 Draft Hypothesis。

### Forgetting

Task 完成後：

- Working Note 過期
- Exact Workflow Counter 被移除
- Accepted Score 與 Source Reference 可依 Policy 保留
- Invalid Draft 不會 Promotion
- Outdated Listing Content 依 Retention Rule 處理

價值來自記住正確 Contract 與 Evidence，不是記住最多文字。

## 常見反模式

### 把 Vector Store 當完整 Memory System

有 Similarity，卻沒有 Version、Ownership、Trust 與 Deletion。

### 把 Content Type 與 Ownership Scope 混在一起

User、Shared、Episodic 被寫成互斥 Category。

### State 以 Prose 保存

Exact Workflow Control 變得 Lossy。

### 信任每個 Retrieved Result

沒有 Applicability、Permission、Status 或 Source Check。

### Verification 前就寫 Memory

Model Inference 直接變成 Durable Fact。

### Overwrite Old Memory

Provenance 與 Rollback 消失。

### External Document Copy 進 Memory 卻不保留 Reference

Source of Truth 消失。

### Shared Memory 有 Universal Write Access

任何 Worker 都能 Overwrite Accepted Information。

### Retrieval 只優化 Recall

系統非常擅長找到錯誤 User 的舊 Preference。

### 沒有 Deletion Propagation

Visible Record 刪除了，Embedding 與 Cache 還在。

### Memory Success 只靠 Anecdotal Recall

沒有測 Update、Conflict、Scope、Abstention 與 Harm。

## Production Checklist

### Classification

- Function、Ownership 與 Lifecycle 是否分開？
- Workflow State 是否與 Working Memory 分開？
- User 與 Shared Memory 是否被視為 Scope？
- External Knowledge 是否與 Derived Memory 分開？

### Writing

- 是否有 Write Decision？
- 是否允許答案是 `do not store`？
- 是否記錄 Source、Scope、Authority 與 Retention？
- 是否防止 Guess 變成 Verified Fact？
- 是否執行 User Control？

### Retrieval

- Hard Permission 與 Scope Filter 是否先執行？
- Similarity 是否只是其中一個 Ranking Signal？
- 是否檢查 Expiry、Supersession 與 Conflict？
- Context Budget 是否按 Type 分配？
- 系統是否可以 Abstain？

### Updating and Forgetting

- Version 是否互相連結？
- Record 是否能 Supersede 或 Revoke？
- Invalidation 是否傳播到 Derived Artefact？
- Delete Request 是否涵蓋 Index 與 Cache？
- Expiry 與 Retention Job 是否可觀測？

### Shared Memory

- Local Scratch Work 是否與 Shared State 分開？
- Write 是否 Typed 且有 Permission？
- 是否有 Final Owner？
- Proposed 與 Verified 是否分開？
- Conflict 是否明確？

### Evaluation

- Recall 與 Precision 是否都量測？
- 是否測試 Temporal Update？
- 是否測試 Cross-user 與 Cross-tenant Failure？
- 是否量測 Downstream Usefulness？
- 是否追蹤 Memory-caused Error？

## 結論

把三個軸拆開後，Agent Memory 會清楚很多：

- **Function**：Working、Episodic、Semantic、Procedural
- **Scope**：Local、Task、User、Shared、Organisation
- **Lifecycle**：Context、Active Task、Cross-session、External Source、Expired 或 Superseded

Context、State、Memory、External Knowledge 與 RAG 也各自回到正確位置：

```text
Context：
Current Model Step 的 Assembled Input

State：
精確的 Execution Control

Memory：
具有 Reuse Lifecycle 的 Retained Information

External Knowledge：
Source-managed Information

RAG：
把資訊取回 Current Context 的 Mechanism
```

Production Memory System 不是一個有 Embedding Endpoint 的 Storage Product，而是一個 Governed Loop：

```text
選擇什麼值得成為 Memory
  -> 分類 Type 與 Ownership
  -> 驗證 Source 與 Authority
  -> 帶著 Version 與 Retention 保存
  -> 依 Scope 與 Permission 取回
  -> 評估 Usefulness
  -> Update、Supersede 或 Forget
```

最重要的設計問題不是：

> Agent 可以記住多少？

而是：

> 哪些資訊應影響 Future Decision、在什麼條件下生效，以及這個影響如何被修正或移除？

Part 8 將從單一 Pattern 進入完整 Production Architecture：

> Routing、Planning、Tool、Verification、Memory、Human Approval、Budget 與 Observability，如何組合成一套受控制的系統？

## 參考資料

- [Sumers et al., *Cognitive Architectures for Language Agents*](https://arxiv.org/abs/2309.02427)
- [Park et al., *Generative Agents: Interactive Simulacra of Human Behavior*](https://arxiv.org/abs/2304.03442)
- [Packer et al., *MemGPT: Towards LLMs as Operating Systems*](https://arxiv.org/abs/2310.08560)
- [Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
- [Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366)
- [Wang et al., *Voyager: An Open-Ended Embodied Agent with Large Language Models*](https://arxiv.org/abs/2305.16291)
- [Zhong et al., *MemoryBank: Enhancing Large Language Models with Long-Term Memory*](https://arxiv.org/abs/2305.10250)
- [Wu et al., *LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory*](https://arxiv.org/abs/2410.10813)

