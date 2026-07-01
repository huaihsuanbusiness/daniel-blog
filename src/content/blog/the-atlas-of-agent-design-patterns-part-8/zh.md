---
title: "Agent 設計模式圖鑑 Part 8｜Production Agent 架構實戰：RAG、Deep Research、Coding 與 Browser Agent"
description: "把 Router、Pipeline、State Machine、DAG、Planner、ReAct、Verifier、Memory、Policy、Budget 與 Human Approval 組裝成可運作的 Production RAG、Deep Research、Coding、Browser、企業自動化與長期監控架構。"
date: 2026-07-01T12:04:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 8
---

# Agent 設計模式圖鑑 Part 8｜Production Agent 架構實戰：RAG、Deep Research、Coding 與 Browser Agent

## Production Agent Architectures: RAG, Deep Research, Coding, and Browser Agents

前七篇，我們把 Agent 系統拆成六個維度：

1. 執行路徑
2. 決策與規劃
3. 推理與探索
4. 驗證與修正
5. Agent 組織
6. 狀態與記憶

每個維度都包含許多模式：

- Direct
- Pipeline
- Router
- State Machine
- DAG
- ReAct
- Plan-and-Execute
- Adaptive Planning
- Tree Search
- Verifier
- Generate-and-Test
- Supervisor–Worker
- Working Memory
- Procedural Memory

但真正做 Production 系統時，沒有人只部署一個「ReAct」。

一套成熟的 Agent，通常是多種模式的組合：

```text
Router
  ↓
State Machine
  ↓
Planner
  ↓
DAG or ReAct Executor
  ↓
Verifier
  ↓
Memory Update
  ↓
Final Response or Human Approval
```

這一篇不再逐一介紹積木。

我們要做的是：

> **把前七篇的積木組成可以執行、可以驗證、可以恢復、可以觀察、可以停止的 Production Agent。**

---

# 一個「看起來會動」的 Agent，為什麼還不能上 Production？

假設使用者提出：

> 比較三家供應商，整理最新價格與功能，更新採購資料庫，最後寄信給財務主管。

一個自由 Agent 可能：

1. 搜尋供應商網站
2. 擷取價格
3. 比較功能
4. 開啟內部資料庫
5. 修改採購資料
6. 撰寫 Email
7. 寄送 Email

這條路看起來完整，但真正上線前，至少還缺少：

- 使用者是否有權修改採購資料？
- 價格是否來自官方來源？
- 不同地區與方案是否混用？
- 資料庫更新是否可撤銷？
- 寄信前是否需要人工批准？
- 工具失敗後最多重試幾次？
- 已完成哪些步驟？
- 哪個操作真的執行過？
- 如果只完成一半，任務是 Failed 還是 Partial？
- 成本超過上限時要不要停止？
- 如何避免同一封 Email 寄送兩次？

Production Agent 的重點，不是「能做很多事」。

而是：

> **每一步都有明確入口、權限、狀態、預算、證據、停止條件與責任邊界。**

---

# Production Agent 的七個必要層

一套成熟架構通常可以拆成七層。

## 1. Entry and Routing

負責判斷：

- 這個 Request 是否需要 Agent？
- 可以 Direct Answer 嗎？
- 需要 RAG 嗎？
- 需要 SQL、Calculator 或專用 Workflow 嗎？
- 是否需要人工處理？

## 2. Orchestration

負責：

- Workflow
- State Machine
- Planner
- DAG
- Event Trigger
- Queue
- Human Approval Gate

它決定任務怎麼走。

## 3. Execution

負責真正執行工作：

- LLM
- Retrieval
- Search
- Browser
- Code Tools
- Database
- API
- Computer-use

## 4. Validation and Recovery

負責：

- Schema Check
- Verifier
- Citation Check
- External Test
- Retry
- Fallback
- Replanning
- Human Review

## 5. State and Memory

負責：

- Current State
- Working Memory
- Plan Version
- Tool Results
- Procedural Memory
- User Preferences
- Shared Memory

## 6. Policy and Safety

負責：

- Identity
- Permission
- Tool Allowlist
- Data Access
- Budget
- Risk Classification
- Approval
- Sandbox
- Secret Isolation

## 7. Observability and Operations

負責：

- Trace
- Audit Log
- Metrics
- Cost
- Latency
- Failure Reason
- Replay
- Alerting
- Kill Switch

![Figure 8-1 — Production Agent Reference Architecture](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-1-production-agent-reference-architecture.png)

> **Figure 8-1｜Production Agent Reference Architecture**  
> Request 經過 Identity、Policy 與 Router 後，選擇 Direct、RAG 或 Agent Workflow；Orchestrator 管理 Planner、State Machine 和 Executor，Verifier、Memory、Budget、Human Approval 與 Observability 則構成 Production 控制面。

---

# 先建立基線：什麼時候只需要簡單問答？

在談六種 Production 配方前，先保留一個最重要的基線：

```text
Input
  ↓
LLM
  ↓
Output
```

## 適合簡單問答的任務

- 翻譯
- 改寫
- 摘要
- 格式轉換
- 根據已提供內容回答
- 低風險文字生成
- 簡單分類

可以加入：

- Input Validation
- Output Schema
- Content Policy
- Token Limit
- Basic Logging

但不需要：

- Planner
- Multi-Agent
- Long-term Memory
- Tree Search
- Browser
- State Machine

Production 設計的第一原則是：

> **可以用 Direct 解決，就不要先建一座 Agent 主題樂園。**

---

# Router：決定走 Direct、RAG 還是 Agent

同一個產品通常同時包含多種執行路徑。

```text
                    ┌→ Direct
                    ├→ RAG
User Request → Router
                    ├→ SQL / Calculator
                    ├→ Agent Workflow
                    └→ Human Review
```

## Router 可以依什麼判斷？

- Intent
- Required Data Source
- User Role
- Permission
- Risk
- Expected Latency
- Cost Budget
- Need for Tools
- Need for Persistent State
- Need for Human Approval

## 一個實用的分流邏輯

### Direct

適用於：

- 所需資訊已在輸入中
- 一次呼叫可以完成
- 不需要外部工具
- 風險低

### RAG

適用於：

- 問題需要外部文件
- 答案必須有來源
- 不需要長期自主操作
- 任務主要是檢索與回答

### Agent Workflow

適用於：

- 需要多步驟工具操作
- 路徑取決於中間結果
- 需要保存狀態
- 需要規劃、重試或恢復

### Human Review

適用於：

- 高風險
- 不可逆
- 權限不足
- 資料衝突
- 政策要求人工批准

## Router 也必須能說不知道

至少需要：

- Unknown
- Ambiguous
- Unsupported
- Need Clarification

不要強迫每個 Request 都走進某條自動化路徑。

---

# 配方一：Production RAG

最簡單的 RAG 可能只有：

```text
Query
  ↓
Retrieve
  ↓
Generate
```

Production RAG 則需要處理：

- Query 是否需要改寫？
- 應該查哪個資料源？
- 使用者有權讀取哪些文件？
- Retrieval 是否召回正確內容？
- Chunk 是否過期？
- Citation 是否支持 Claim？
- 資料不足時要回答、澄清，還是拒絕？
- 成本與延遲如何控制？

## Production RAG 典型流程

```text
User Query
  ↓
Query Router / Profile
  ↓
Normalize or Rewrite
  ↓
Retrieve
  ↓
Metadata and ACL Filter
  ↓
Rerank
  ↓
Context Builder
  ↓
Generate
  ↓
Citation and Faithfulness Verifier
  ↓
Answer or Retry / Abstain
```

## 核心元件

### Query Router

決定：

- 是否需要 Retrieval
- 使用哪個 Corpus
- 是否查 SQL
- 是否使用快速或深度模式

### Retrieval

可以包含：

- Vector Search
- Keyword Search
- Hybrid Search
- Metadata Filter
- Graph Query
- SQL

### Reranker

把「語義相似」進一步排序成「對回答真正有用」。

### Context Builder

處理：

- Chunk Deduplication
- Token Budget
- Source Diversity
- Metadata
- Context Ordering
- Citation IDs

### Generator

只能根據允許使用的 Context 產生答案。

### Citation Verifier

檢查：

- Claim 是否有來源
- Citation 是否真的支持 Claim
- 是否引用錯誤段落
- 是否混用版本
- 是否遺漏重要限制

## Production RAG 的 State

即使 RAG 不需要高度自主，仍然可能保存：

- Original Query
- Rewritten Query
- Retrieved Document IDs
- Reranker Scores
- Selected Context
- Citation Mapping
- Retry Count
- Failure Reason
- Query Profile

## Production RAG 的 Failure Policy

| 失敗 | 處理 |
|---|---|
| No documents found | Clarify、Fallback Corpus 或 Abstain |
| Low retrieval confidence | Rewrite Query 或 Deep Retrieval |
| Citation mismatch | Regenerate or Reject |
| Unauthorized document | Remove and Audit |
| Stale source | Prefer newer version |
| Conflicting sources | Surface conflict or Human Review |

![Figure 8-2 — Production RAG Architecture](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-2-production-rag-architecture.png)

> **Figure 8-2｜Production RAG Architecture**  
> Query 經過 Router、Rewrite、Hybrid Retrieval、ACL Filter、Reranker 與 Context Builder，再由 Generator 產生帶 Citation 的答案；Verifier 負責檢查 Faithfulness、Coverage 與來源權限。

## Production RAG 何時不需要 Agent？

如果流程始終固定：

```text
Retrieve → Rerank → Generate → Verify
```

它本質上仍然是一條可控 Pipeline。

只有在以下情況，才需要加入 Agentic 節點：

- 動態選擇資料源
- 根據結果決定是否改寫 Query
- 多輪補查
- 工具路由
- 複雜澄清
- 自適應檢索

不要因為系統用了 LLM 和 Retrieval，就自動稱為 Agent。

---

# 配方二：Deep Research Agent

Deep Research 的任務通常不是回答一個簡單問題。

它需要：

- 拆解研究問題
- 查找多個來源
- 平行研究
- 處理衝突
- 追蹤證據
- 補足缺口
- 產生長篇綜合報告

## 典型架構

```text
Research Goal
  ↓
Planner
  ↓
Research Plan
  ↓
DAG of Research Tasks
  ├→ Worker A
  ├→ Worker B
  ├→ Worker C
  └→ Worker N
        ↓
Evidence Store
        ↓
Synthesis
        ↓
Verifier
        ↓
Complete or Replan
```

## Planner 應該產生什麼？

不是：

```text
1. Research
2. Analyze
3. Write
```

而是：

- Research Question
- Subquestion
- Allowed Sources
- Expected Evidence
- Completion Criteria
- Dependency
- Budget
- Deadline
- Failure Policy

## 為什麼需要 DAG？

不同子問題可以平行處理。

例如：

```text
Pricing
Features
Deployment
Security
Customer Evidence
```

它們完成後再進入 Synthesis。

DAG 本身不處理循環。

若 Verifier 發現證據不足，外層 State Machine 可以：

```text
VERIFY
  ↓ Fail
REPLAN
  ↓
Run New Research DAG
```

## Evidence Store

Deep Research 不應只保存 Worker 的段落摘要。

每筆 Evidence 最好包含：

- Claim
- Source
- Source Type
- Publication Date
- Access Date
- Quote or Extract
- Scope
- Confidence
- Worker
- Validation Status

## Source Policy

應優先定義：

- Official Sources
- Primary Research
- Regulatory Sources
- Reputable Secondary Sources
- Disallowed Sources
- Freshness Window

## Deep Research 的停止條件

- Required Questions Covered
- Minimum Source Diversity
- No Critical Evidence Gap
- Citation Coverage Passed
- Budget Reached
- No-improvement Limit
- Human Deadline

![Figure 8-3 — Deep Research Agent Architecture](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-3-deep-research-agent-architecture.png)

> **Figure 8-3｜Deep Research Agent Architecture**  
> Planner 將研究目標拆成帶有來源政策與完成條件的任務，透過 DAG 平行交給 Research Workers；Evidence Store 保存可追蹤證據，Synthesis 與 Verifier 再決定完成或 Replan。

## Deep Research 的常見失敗

### 搜尋很多，證據很少

Agent 讀取大量內容，卻沒有形成可驗證 Claim。

### Worker 重複工作

多個 Worker 搜尋相同問題。

### 來源被重複計算

五篇文章其實都引用同一份原始報告。

### Synthesis 混合互相衝突的版本

價格、產品或政策來自不同時間。

### 沒有完成條件

Agent 永遠還能再找一個來源。

---

# 配方三：Coding Agent

Coding Agent 的重點不在「能生成程式碼」。

而在於：

> **能在隔離環境中理解 Repository、修改程式、執行測試、讀取失敗、有限修正，並提供可重現證據。**

## 典型架構

```text
Task
  ↓
Repository Snapshot
  ↓
Planner
  ↓
Code Search and Inspection
  ↓
Generate Patch
  ↓
Sandbox Execution
  ↓
Target Tests
  ↓
Related Tests
  ↓
Full Test Suite
  ↓
Lint and Build
  ↓
Change-scope Verifier
  ↓
Human Approval
  ↓
Merge or Deliver
```

## Repository Snapshot

在修改前保存：

- Branch
- Commit SHA
- Dirty State
- Dependency Version
- Test Environment
- Runtime Version

這讓結果可重現，也能判斷 Agent 修改了什麼。

## Planner

定義：

- Suspected Area
- Files to Inspect
- Tests to Run
- Allowed Changes
- Completion Criteria
- Rollback Point

## Code Search

應先理解：

- Call Graph
- Existing Tests
- Data Flow
- Configuration
- Similar Implementation
- Error Logs

不要直接用錯誤訊息猜一個 Patch。

## Generate-and-Test

```text
Generate Patch
  ↓
Static Validation
  ↓
Run Target Test
  ↓
Fail?
  ├─ Yes → Inspect Failure → Revise
  └─ No → Broader Validation
```

## 完整驗收不能只跑目標測試

至少可能包含：

- Target Test
- Related Test Suite
- Full Relevant Suite
- Lint
- Type Check
- Format Check
- Build
- Security Scan
- Diff Review
- Reproducibility Check

## 防止 Reward Hacking

Agent 不應該：

- 刪除測試
- 跳過測試
- 放寬 Assertion
- 修改 Expected Result
- 隱藏錯誤
- 只跑容易通過的命令
- 修改無關檔案

## Human Approval

以下動作最好需要批准：

- Merge
- Push
- Deploy
- Database Migration
- Dependency Major Upgrade
- Secret or Permission Change
- Production Configuration Change

![Figure 8-4 — Production Coding Agent](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-4-production-coding-agent.png)

> **Figure 8-4｜Production Coding Agent**  
> Coding Agent 先固定 Repository Snapshot，再經 Planner、Code Search、Patch、Sandbox、分層測試、Lint、Build 與 Change-scope Verifier；只有通過驗證與批准後，才能 Merge 或交付。

## Coding Agent 的 Terminal States

- Completed
- Failed
- Partial
- Blocked
- Needs Human Review
- Cannot Reproduce
- Unsupported Environment

不是每個 Bug 都能在 Budget 內自動修好。

---

# 配方四：Browser / Computer-use Agent

Browser Agent 需要在真實介面中：

- 看畫面
- 理解狀態
- 選擇動作
- 點擊
- 輸入
- 捲動
- 等待
- 檢查結果

它比純 Tool Calling 更接近不確定環境中的互動 Agent。

## 典型循環

```text
Goal
  ↓
Observe Page
  ↓
Update Browser State
  ↓
Select Allowed Action
  ↓
Execute
  ↓
Observe New State
  ↓
Success?
  ├─ Yes → Complete
  └─ No → Recover or Continue
```

## 為什麼需要 State Machine？

Browser 操作經常包含：

- Login Required
- CAPTCHA
- Modal Open
- Form Partially Filled
- Waiting for Page
- Download Started
- Approval Pending
- Error
- Completed

如果只使用自由 ReAct，Agent 可能：

- 重複點擊
- 回到上一頁
- 遺失已填資料
- 不知道下載是否完成
- 對同一按鈕操作多次

State Machine 可以限制：

```text
LOGIN
  ↓
SEARCH
  ↓
SELECT ITEM
  ↓
FILL FORM
  ↓
REVIEW
  ↓
SUBMIT
  ↓
VERIFY
```

## Browser State 應包含

- Current URL
- Page Title
- Active Element
- Visible Controls
- Form Values
- Navigation History
- Download Status
- Last Action
- Last Observation
- Screenshot or DOM Reference
- Retry Count

## Allowed Action Policy

限制：

- Click
- Type
- Scroll
- Select
- Download
- Upload
- Navigate
- Wait

高風險動作另外標記：

- Submit
- Purchase
- Send
- Delete
- Publish
- Change Permission

## Success Verifier

不要只依賴：

> 按鈕已經點過。

應檢查：

- Confirmation Message
- New Record Exists
- Expected URL
- Download File Exists
- Form Status
- Server Response
- Transaction ID

## Recovery

常見恢復方式：

- Wait and Retry
- Re-observe Page
- Close Modal
- Return to Safe State
- Reload
- Re-authenticate
- Ask User
- Human Takeover

![Figure 8-5 — Browser and Computer-use Agent](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-5-browser-computer-use-agent.png)

> **Figure 8-5｜Browser and Computer-use Agent**  
> Browser Agent 透過 Observe、State Update、Policy Check、Action、New Observation 與 Success Verification 循環操作介面；State Machine、Duplicate-action Detection、Human Takeover 與不可逆操作 Gate 防止失控。

## Browser Agent 的常見風險

- UI 改版
- 元件辨識錯誤
- Session 過期
- 重複提交
- 隱藏 Modal
- 網路延遲
- 下載未完成
- 內容被其他使用者更新
- 不可逆操作
- 敏感資料外洩

---

# 配方五：高風險企業自動化

企業自動化不應該直接從：

```text
User Request
  ↓
Agent
  ↓
Execute
```

高風險流程需要：

- Identity
- Permission
- Policy
- Deterministic Validation
- Risk Classification
- Human Approval
- Transaction Control
- Post-condition Verification
- Audit Log
- Rollback

## 典型流程

```text
Request or Event
  ↓
Authenticate Identity
  ↓
Authorize Action
  ↓
Agent Prepares Proposal
  ↓
Deterministic Validation
  ↓
Risk Classification
  ↓
Approval Required?
  ├─ Yes → Human Review
  └─ No → Execute
              ↓
         Verify Post-condition
              ↓
         Audit and Complete
```

## Agent 應該準備 Proposal，而不是直接執行

例如付款流程：

```text
Payee
Amount
Currency
Reason
Source Invoice
Account
Risk Flags
Expected Effect
Rollback Possibility
```

Agent 可以整理資訊和建議。

但真正執行前，應交給：

- Policy Engine
- Permission Check
- Approval
- Transaction Layer

## Deterministic Validation

可以檢查：

- Required Fields
- Amount Limit
- Duplicate Invoice
- Account Status
- Vendor Allowlist
- Currency
- Approval Threshold
- Segregation of Duties
- Compliance Rule

## Human Approval

審批者必須看到：

- Proposed Action
- Evidence
- Risk
- Policy Results
- Expected Impact
- Reversibility
- Difference from Existing State

## 執行後驗證

不要因為 API 回傳 200 就宣布完成。

需要確認：

- Transaction ID
- Database State
- Ledger Entry
- Target Record
- Notification Status
- Side Effects
- Idempotency Key

## Rollback 與補償

有些操作不能真正 Rollback。

此時需要 Compensation：

- Reverse Transaction
- Cancel Request
- Restore Previous Record
- Notify Owner
- Open Incident

![Figure 8-6 — High-Risk Enterprise Automation](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-6-high-risk-enterprise-automation.png)

> **Figure 8-6｜High-Risk Enterprise Automation**  
> Request 先經 Identity、Authorization、Agent Proposal、Deterministic Validation 與 Risk Classification；高風險或不可逆操作必須 Human Approval，執行後再做 Post-condition Verification、Audit 與 Rollback／Compensation。

---

# 配方六：長期監控型 Agent

長期監控 Agent 不一定一直在「思考」。

它更像一個：

- Scheduled Workflow
- Event-driven System
- Condition Watcher
- Stateful Monitor

常見任務：

- 監控價格
- 監控系統健康
- 監控合約到期
- 監控新聞
- 監控資料品質
- 監控職缺
- 監控安全事件
- 監控供應鏈風險

## 典型流程

```text
Schedule or Event
  ↓
Load Previous State
  ↓
Collect Current Data
  ↓
Normalize
  ↓
Compare with Baseline
  ↓
Condition Met?
  ├─ No → Update State and Sleep
  └─ Yes → Verify
              ↓
           Deduplicate
              ↓
           Notify or Escalate
```

## 關鍵元件

### Scheduler / Trigger

- Cron
- Queue
- Webhook
- Event Stream
- Condition Watch

### Baseline State

保存：

- Last Checked At
- Last Value
- Last Alert
- Known Events
- Cooldown
- Cursor
- Source Version

### Change Detection

不是只看「有沒有新資料」，還要判斷：

- 是否有意義
- 是否超過門檻
- 是否只是格式變化
- 是否已經通知過
- 是否為同一事件的更新

### Deduplication

需要：

- Event ID
- Content Hash
- Source
- Time Window
- Alert Key

### Notification Policy

- Severity
- Recipient
- Channel
- Quiet Hours
- Cooldown
- Escalation
- Acknowledgement

### No-change 行為

如果條件未達成：

```text
Do not notify
```

長期監控系統不應每天寄一封「今天仍然沒有事情」的數位空氣。

## 長期監控的風險

- 重複通知
- Source 失效
- Baseline 漂移
- 靜默故障
- Scheduler 中斷
- 誤報
- 漏報
- Alert Fatigue
- State 過期
- 無限累積歷史

## 必要控制

- Health Check
- Last-success Timestamp
- Missed-run Detection
- Retry Limit
- Dead-letter Queue
- Alert Deduplication
- Cooldown
- State Retention
- Human Escalation
- Kill Switch

---

# 六種 Production Agent 配方

以下六種配方不包含 Direct 基線。

| 配方 | 主要任務 | 核心模式 | 必要驗證 | 必要 State / Memory |
|---|---|---|---|---|
| Production RAG | 文件問答 | Router、Pipeline、Rerank | Citation、Faithfulness、ACL | Query State、Source Mapping |
| Deep Research | 多來源研究 | Planner、DAG、Verifier、Replan | Source Coverage、Conflict Check | Plan、Evidence Store |
| Coding Agent | 修改可執行產物 | State Machine、Generate-and-Test | Tests、Lint、Build、Diff | Repo Snapshot、Attempt State |
| Browser Agent | 操作 UI | ReAct、State Machine、Policy | Page State、Post-condition | Navigation State、Action History |
| High-risk Automation | 執行企業操作 | Policy、Human Approval、Transaction | Deterministic Rules、Post-condition | Approval State、Audit Log |
| Long-term Monitor | 持續監控條件 | Event-driven、Stateful Workflow | Change Verification、Deduplication | Baseline、Cursor、Alert History |

---

# 每種配方使用哪些模式？

| 模式 | RAG | Deep Research | Coding | Browser | High-risk | Monitoring |
|---|---:|---:|---:|---:|---:|---:|
| Router | 高 | 中 | 低 | 低 | 中 | 中 |
| Pipeline | 高 | 中 | 中 | 低 | 高 | 高 |
| State Machine | 中 | 高 | 高 | 高 | 高 | 高 |
| DAG | 低 | 高 | 中 | 低 | 低 | 中 |
| ReAct | 低～中 | 中 | 中 | 高 | 低 | 低 |
| Planner | 低 | 高 | 高 | 中 | 低～中 | 低 |
| Verifier | 高 | 高 | 高 | 高 | 高 | 高 |
| Generate-and-Test | 低 | 低 | 核心 | 低 | 低 | 低 |
| Human Approval | 視資料 | 視風險 | Merge / Deploy | 不可逆操作 | 核心 | 高風險通知 |
| Working Memory | 中 | 高 | 高 | 高 | 中 | 低 |
| Long-term Memory | 低～中 | 中 | 程序型 | 程序型 | 規則型 | Baseline / History |

---

# 成本、延遲、可控性與適用場景

| 架構 | 成本 | 延遲 | 可控性 | 可觀測性 | 失敗恢復 | 最適合 |
|---|---:|---:|---:|---:|---:|---|
| Direct Baseline | 低 | 低 | 高 | 高 | 簡單 | 一次性文字任務 |
| Production RAG | 中 | 低～中 | 高 | 高 | 中～高 | 有來源的文件問答 |
| Deep Research | 高 | 高 | 中～高 | 中～高 | 高 | 多來源長篇研究 |
| Coding Agent | 高 | 高 | 高 | 高 | 高 | 可測試的程式任務 |
| Browser Agent | 高 | 中～高 | 中 | 高 | 中～高 | 動態 UI 操作 |
| High-risk Automation | 中～高 | 中～高 | 很高 | 很高 | 高 | 企業不可逆操作 |
| Long-term Monitor | 持續累積 | 非同步 | 高 | 很高 | 高 | 條件監控與告警 |

---

# 共用控制一：Budget

Agent 的 Budget 不只包含 Token。

還可以包含：

- Model Calls
- Tool Calls
- Search Queries
- Browser Actions
- Test Runs
- Worker Count
- Wall Time
- Monetary Cost
- Replans
- Retries

## 分層 Budget

```text
Global Task Budget
├── Planner Budget
├── Retrieval Budget
├── Worker Budget
├── Tool Budget
└── Verification Budget
```

如果只限制 Token，Agent 仍可能透過工具把成本燒成煙火。

---

# 共用控制二：Timeout

不同層需要不同 Timeout：

- Model Call Timeout
- Tool Timeout
- Worker Timeout
- State Timeout
- Approval Timeout
- Workflow Timeout
- Monitoring Source Timeout

Timeout 後的行為必須明確：

- Retry
- Fallback
- Reassign
- Partial
- Human Review
- Fail

---

# 共用控制三：Retry 與 Fallback

不是所有失敗都 Retry。

| Failure | Strategy |
|---|---|
| Temporary network error | Retry |
| Query parameter issue | Parameterized Retry |
| Primary service unavailable | Fallback |
| Output schema failure | Repair |
| Plan assumption failed | Replan |
| High-risk ambiguity | Human Review |
| Unsupported task | Stop |

---

# 共用控制四：Stop Condition

Agent 必須知道何時正式停止。

## 成功停止

- Completion Criteria Passed
- Verifier Passed
- Post-condition Verified

## 安全停止

- Budget Exhausted
- Retry Limit Reached
- Unsupported
- Permission Denied
- Required Data Unavailable
- Human Rejected
- Kill Switch Activated

## Terminal States

- Completed
- Failed
- Partial
- Pending
- Blocked
- Cancelled
- Requires Human Action

---

# Observability、Audit Log 與 Trace

Production Agent 必須能回答：

```text
這個任務走了哪條路？
為什麼選這個工具？
使用了哪些資料？
哪個步驟失敗？
重試了幾次？
誰批准了操作？
成本是多少？
最終結果真的執行了嗎？
```

## Trace

追蹤單一任務的完整路徑：

- Request ID
- Trace ID
- Parent / Child Span
- Route
- State Transition
- Tool Call
- Model Call
- Verification
- Final Outcome

## Metrics

- Success Rate
- Partial Rate
- Failure Rate
- Latency
- Cost
- Token Usage
- Tool Error Rate
- Retry Rate
- Human Approval Rate
- Citation Failure Rate
- Duplicate Action Rate

## Audit Log

高風險系統應保存：

- Actor
- Action
- Before State
- After State
- Evidence
- Policy Decision
- Approver
- Timestamp
- Transaction ID

## Replay

在安全環境中重現：

- Input
- Plan
- Tool Results
- Model Version
- Prompt Version
- State
- Policy Version

沒有版本資訊的 Trace，只是一段找不到當時宇宙狀態的歷史小說。

---

# Production Agent 的十大反模式

## 1. 所有 Request 都走 Agent

簡單任務被迫啟動完整流程。

## 2. Router 沒有 Unknown

模糊問題也被強制分流。

## 3. 工具權限只寫在 Prompt

基礎設施沒有真正限制。

## 4. Agent 沒有 State

長任務只靠對話紀錄維持進度。

## 5. Verifier 只問模型「是否正確」

沒有外部證據。

## 6. Retry 沒有上限

失敗被重複放大。

## 7. Human Approval 只剩一顆按鈕

審批者看不到影響與證據。

## 8. Trace 只有最終答案

無法定位哪一步出錯。

## 9. Memory 保存所有內容

過期、錯誤與敏感資料一起累積。

## 10. 沒有正式失敗狀態

系統永遠相信下一輪就會成功。

---

# 從需求組裝 Production Agent 的順序

不要先選 Framework。

先依序回答：

## 1. 任務是否真的需要 Agent？

能用 Direct 或 Pipeline，就先用更簡單方案。

## 2. 任務需要哪些資料與工具？

- Documents
- Database
- Web
- Browser
- Code
- API

## 3. 哪些步驟固定，哪些需要自主？

把自主性限制在真正無法事先寫死的節點。

## 4. 如何驗證？

- Schema
- Citation
- Test
- Rule
- Post-condition
- Human Review

## 5. 需要保存什麼 State？

- Progress
- Plan
- Attempts
- Approvals
- Tool Results

## 6. 需要什麼 Memory？

- Working
- Procedural
- User
- Shared
- None

## 7. 哪些操作有風險？

- Read
- Write
- Delete
- Send
- Pay
- Publish
- Deploy

## 8. 預算與停止條件是什麼？

- Cost
- Time
- Steps
- Retries
- Tool Calls
- Terminal States

## 9. 如何觀察與追責？

- Trace
- Metrics
- Audit
- Replay
- Alert

完成這些問題後，Framework 才是實作選擇，而不是架構答案。

---

# 本篇結論

一套成熟 Agent，不是一個巨大 Prompt，也不是一個可以呼叫所有工具的模型。

它通常由以下積木組成：

```text
Identity and Policy
  ↓
Router
  ↓
Workflow / State Machine
  ↓
Planner or Fixed Pipeline
  ↓
Executor / Tools
  ↓
Verifier
  ↓
Memory and State Update
  ↓
Human Approval or Final Output
```

不同任務需要不同配方：

- **Production RAG**：Router + Retrieval Pipeline + Citation Verifier
- **Deep Research**：Planner + DAG + Evidence Store + Replanning
- **Coding Agent**：Repository State + Generate-and-Test + Sandbox
- **Browser Agent**：ReAct + State Machine + Action Policy
- **High-risk Automation**：Policy + Deterministic Validation + Human Approval
- **Long-term Monitor**：Event-driven Workflow + Persistent State + Deduplication

真正讓 Agent 可以進入 Production 的，不是自主性本身。

而是：

- 自主性有邊界
- 執行有狀態
- 結果有證據
- 失敗有出口
- 操作有權限
- 成本有上限
- 系統有 Trace
- 高風險動作有人負責

下一篇是系列的最後選型篇。

Part 9 將把前八篇整理成：

- 是否需要 Agent 的決策樹
- 六維架構選擇流程
- 自主度與可控性矩陣
- 成本與品質矩陣
- Agent Architecture Canvas
- 完整架構評審 Checklist

讓讀者從「知道有哪些模式」，走到「能夠做出架構決策」。

---

# 《Agent 設計模式圖鑑》系列目錄

| Part | 主題 |
|---:|---|
| 1 | LLM Agent 不只有 ReAct：用六個維度看懂 Agent 架構 |
| 2 | Agent 執行路徑全解：Direct、Pipeline、Router、State Machine 與 DAG |
| 3 | ReAct、Plan-and-Execute 與 Adaptive Planning |
| 4 | 從一條思路到搜尋整片解法空間：CoT、ToT、GoT 與 LATS |
| 5 | Agent 驗證與自我修正 |
| 6 | Multi-Agent 架構全解 |
| 7 | Agent Memory 全解 |
| 8 | Production Agent 架構實戰 |
| 9 | 如何選擇 Agent 架構 |
| Bonus | 使用現代 Agent Framework 實作設計模式 |

---

# 圖表對位表

| 圖號 | 正式圖名 | 建議檔名 | 對應段落 |
|---|---|---|---|
| Figure 8-1 | Production Agent Reference Architecture | `figure-8-1-production-agent-reference-architecture.png` | Production Agent 七層架構 |
| Figure 8-2 | Production RAG Architecture | `figure-8-2-production-rag-architecture.png` | Production RAG |
| Figure 8-3 | Deep Research Agent Architecture | `figure-8-3-deep-research-agent-architecture.png` | Deep Research Agent |
| Figure 8-4 | Production Coding Agent | `figure-8-4-production-coding-agent.png` | Coding Agent |
| Figure 8-5 | Browser and Computer-use Agent | `figure-8-5-browser-computer-use-agent.png` | Browser / Computer-use Agent |
| Figure 8-6 | High-Risk Enterprise Automation | `figure-8-6-high-risk-enterprise-automation.png` | 高風險企業自動化 |
