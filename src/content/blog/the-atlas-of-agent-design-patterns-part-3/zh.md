---
title: "Agent 設計模式圖鑑 Part 3｜ReAct、Plan-and-Execute、Adaptive Planning 與 HTN"
description: "從固定決策、有界 ReAct、顯式計畫、Adaptive Replanning、Hierarchical Planning 到正式 HTN，完整拆解 Production Agent 如何結合 Planner、Executor、Verifier、State Machine 與政策控制。"
date: 2026-06-20T17:00:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 3
---

Part 2 拆解了 Agent 系統的外層執行骨架：

- Direct
- Pipeline
- Router
- State Machine
- DAG

這些結構描述工作可以如何在系統中移動，卻沒有完全決定某一個節點內部應該做什麼。

假設 State Machine 進入 `RESEARCH`，這個節點仍可能需要判斷：

- 搜尋官方文件
- 查詢內部資料
- 改寫失敗的查詢
- 檢查 API 回應
- 要求使用者補充資訊
- 判斷證據已經足夠並停止
- 因無法安全完成而升級處理

這就是決策與規劃層。

核心問題是：

> 下一個行動應該有多少部分由程式預先決定、事前規劃、執行中修正，或由正式程序模型選出？

本文比較五種實用方法：

1. 固定決策邏輯
2. 有界 ReAct
3. Plan-and-Execute
4. Adaptive Planning 與 Replanning
5. Hierarchical Decomposition，以及正式的 HTN Planning

另外也會把兩個常被混進同一張清單的概念拆開：

- **Goal** 定義想達成的結果。
- **Policy** 限制哪些行動可以執行。

Goal 與 Policy 會影響每一種策略，但它們不是與 ReAct、Plan-and-Execute 並列的規劃演算法。

## 執行骨架與決策策略是不同層

外層 State Machine 可以定義：

```text
START
  -> PLAN
  -> RESEARCH
  -> VERIFY
  -> ANSWER
  -> END
```

進入 `RESEARCH` 後，系統仍可採用不同方式。

### 固定邏輯

```text
搜尋官方來源
  -> 抽取必要欄位
  -> 回傳結構化結果
```

下一步由應用程式決定。

### 有界 ReAct

```text
讀取目標與當前狀態
  -> 選擇允許的行動
  -> 執行工具
  -> 讀取正規化 Observation
  -> 更新進度
  -> 再次選擇或停止
```

下一個行動取決於最新 Observation，但只能在明確限制內選擇。

### Plan-and-Execute

```text
建立結構化計畫
  -> 選擇當前 Step
  -> 執行 Step
  -> 保存結果
  -> 繼續、局部修復或 Replan
```

系統先建立全局計畫，再處理各個 Step。

這些策略可以同時存在於同一套外層 Workflow。State Machine 可以先呼叫 Planner，再讓有界 ReAct Executor 執行單一步驟，最後由 Verifier 決定是否允許下一次狀態轉移。

![Figure 3-1 — One Execution Skeleton with Three Decision Strategies](/images/the-atlas-of-agent-design-patterns-part-3/skeleton-with-three-decision-strategies.png)

> **Figure 3-1｜One Execution Skeleton with Three Decision Strategies**  
> 外層 State Machine 同一個 RESEARCH 節點可以依需求切換 Fixed Logic、有界 ReAct 或 Plan-and-Execute 三種決策策略。

## 更精確的規劃層地圖

| 關注點 | 主要問題 | 常見機制 |
|---|---|---|
| 固定決策邏輯 | 下一步是否早已知道？ | Rule、應用程式碼、Fixed Workflow |
| 反應式行動選擇 | 下一個動作是否依賴最新 Observation？ | 有界 ReAct 或其他 Closed-loop Policy |
| 顯式規劃 | 是否應在執行前先拆解任務？ | Plan-and-Execute |
| Replanning | 新證據是否讓剩餘計畫失效？ | 由 Trigger 啟動的 Adaptive Planning |
| 層級化拆解 | Goal 是否包含多層 Subgoal？ | Hierarchical Planner |
| 正式程序拆解 | 是否存在可重用的 Domain Decomposition Model？ | HTN Planner |
| 計畫驗證 | 提出的 Plan 是否可行、可接受？ | Verifier、Simulator、Solver、Policy Check |
| 治理 | 哪些行動可執行，成本上限是多少？ | Policy Layer、Budget、Approval、Audit |

這張地圖刻意保留不同層級，避免把所有名字都誤認成完整的 Agent Architecture。

## 固定決策邏輯：已知的工作應保持確定性

固定決策邏輯代表應用程式已經知道下一步：

```text
Classify
  -> Retrieve
  -> Generate
  -> Verify
```

模型可以在某個 Step 內工作，但不能自由重畫整套流程。

### 適合情境

- 文件 Ingestion
- 固定抽取與轉換
- 穩定的 RAG 流程
- 已知的審批程序
- 確定性驗證
- 有既定規則的 Compliance 操作
- 每個 Request 都需要相同流程的任務

### 優點

- 成本與延遲可預測
- 測試直接
- 權限明確
- 執行容易重現
- 錯誤來源容易定位
- 不容易陷入 Loop

### 限制

遇到應用程式沒有建模的情況時，固定流程無法自行反應。

若官方頁面失效，系統必須預先定義：

- 切換到其他允許來源
- 將欄位標為 unavailable
- 要求提供憑證
- 以 Typed Failure 結束
- 升級給人員處理

Fixed Logic 並不是不成熟。它常常是 Production Agent 最正確的外層邊界。只有在預定規則真的不足時，才需要加入自主性。

## ReAct：根據最新 Observation 選擇下一個行動

原始 ReAct 方法讓 Reasoning Trace、Task-specific Action 與 Observation 交錯出現。以工程角度來看，最有用的核心是 Closed Loop：

```text
Current Goal and State
  -> Choose Action
  -> Act in Environment
  -> Receive Observation
  -> Update Next Decision
```

ReAct 本身不要求特定 Workflow Engine 或 Node Boundary。到了正式環境，團隊通常會把 ReAct-style Loop 放進有界 Executor Node，避免局部工具選擇控制整套應用程式。

### 適合情境

- 網頁與文件研究
- Debug
- Browser 操作
- API 探索
- File-system 調查
- 操作陌生介面
- 必須先看到結果，才能知道下一個有效行動的任務

### 範例

目標是確認某產品目前的 Billing Rule：

```text
Action:
開啟官方 Pricing Page

Observation:
只顯示 Annual Price

Action:
開啟官方 Billing Documentation

Observation:
只有部分 Plan 支援 Monthly Billing

Action:
檢查官方 FAQ 的 Plan-level Exception
```

價值在於根據 Observation 修正方向，而不是事前硬列出所有 URL。

### ReAct 是局部適應，不等於全局可靠

原始 Action-Observation Loop 不會自動提供：

- 可量測的進度定義
- 可靠的完成條件
- Permission Enforcement
- 成本控制
- 重複行動偵測
- Durable State
- 中斷恢復
- 證據品質
- 最終結果驗收

這些能力屬於 ReAct 外層的 Production Architecture。

## ReAct 為什麼會一直做事卻沒有進度

典型失敗看似忙碌，實際重複相同狀態：

```text
Search Query A
  -> 證據不足
Search Query B
  -> 證據不足
再次 Search Query A
  -> 開啟先前已排除的頁面
再次 Search Query B
```

常見原因如下。

### 沒有 Progress Model

Executor 只知道要繼續，卻不知道哪些 Requirement 尚未完成。

### Observation 沒有結構化

工具輸出直接變成 Context 裡的長文字，沒有抽取：

- Source Identity
- Relevant Facts
- Unresolved Questions
- Conflict
- Failure Reason
- Suggested Next Action

### 沒有 Duplicate Detection

Runtime 無法辨識重複的：

- Query
- URL
- Tool Call
- Parameter
- Error Condition
- 只是換句話說的等價行動

### Completion Criteria 太模糊

「繼續研究，直到資料足夠」無法驗證。

更好的條件是：

```text
Complete when:
- 每個必要比較欄位都有資料或明確標為 unavailable
- 每個事實都有允許的來源
- 所有重大衝突都已記錄
- 不再存在 Critical Verifier Failure
```

### Tool Freedom 過大

大量 Tool 沒有 Permission、Cost、Priority 或 Call Limit，只會產生探索雜訊。

## Production ReAct 需要明確契約

有界 Executor 應收到：

- 當前 Step Objective
- Allowed Tools
- Available Inputs
- Completion Criteria
- Prohibited Actions
- Remaining Budget
- Maximum Actions
- Current Progress State
- Escalation Policy

每個 Tool 應回傳結構化 Observation，而不是任意文字。

例如：

```json
{
  "tool": "official_docs_search",
  "status": "success",
  "source": "https://example.com/docs",
  "facts": [
    {"field": "monthly_billing", "value": "selected_plans_only"}
  ],
  "unresolved": ["which plans support monthly billing"],
  "retryable": false
}
```

每次 Observation 後，Loop 應判斷三種結果：

1. **complete**：Step Contract 已滿足
2. **continue**：有理由執行另一個允許行動
3. **escalate**：在權限或 Budget 內無法完成

![Figure 3-2 — Production ReAct Loop with Explicit Step Contract](/images/the-atlas-of-agent-design-patterns-part-3/react-production-loop.png)

> **Figure 3-2｜Production ReAct Loop with Explicit Step Contract**  
> 有界 Executor 必須收到 Step Objective、Allowed Tools、Completion Criteria、Budget 與 Escalation Policy；每次 Observation 後判斷 complete、continue 或 escalate。

## Plan-and-Execute：先建立全局結構，再開始行動

Plan-and-Execute 比較適合被視為一整類工程模式，而不是只有一個權威、唯一實作的演算法。

它的核心節奏是：

```text
Goal
  -> Produce Explicit Plan
  -> Execute Plan Steps
  -> Integrate Results
```

相關研究以不同方式分開規劃與工具 Observation。Plan-and-Solve Prompting 先拆解再解決 Subtask；ReWOO 則把 Planner-like Reasoning、取得工具證據的 Worker，以及整合結果的 Solver 分開。這些方法彼此相關，但不應被描述成完全相同的 Architecture。

### 適合情境

- 長篇研究
- 多文件審查
- Migration Planning
- 大型程式碼改動
- 市場分析
- 有大量 Requirement 的專案工作
- 有順序或 Dependency Constraint 的任務
- 必須公開進度的任務

### 優點

#### 全局覆蓋

Planner 可以在執行前列出所有必要面向。

#### 進度可追蹤

系統可以區分：

- pending
- ready
- running
- blocked
- completed
- failed
- skipped

#### 分工清楚

獨立 Step 可交給不同 Tool、Worker 或 DAG Branch。

#### 容易規劃整合

每個 Step 的 Expected Output 可以事先設計成適合 Final Synthesis 的格式。

### 核心弱點

外觀完整的 Plan 仍可能不可行、遺漏 Requirement，或建立在錯誤 Premise 上。

如果 Planner 沒有讀取真實輸入而直接猜測，Executor 可能非常有效率地完成錯誤任務。因此，產生 Plan 不能取代資料取得、Constraint Check 與 Verification。

## Plan 必須可執行，而不是儀式性清單

以下不是可執行 Plan：

```text
1. 研究主題
2. 分析資訊
3. 撰寫答案
```

它只是把任務換句話說。

Production Step 應包含：

| 欄位 | 用途 |
|---|---|
| Step ID | 穩定識別碼 |
| Objective | 這個 Step 必須達成的結果 |
| Inputs | 必要 State 與 Artefact |
| Dependencies | 必須先完成的 Step |
| Allowed Tools | Executor 可用能力 |
| Expected Output | 應產生的結構化結果 |
| Completion Criteria | 可觀測的驗收條件 |
| Failure Policy | Retry、Fallback、Block、Replan 或 Stop |
| Budget | 時間、Token、Call 或成本 |
| Status | 當前生命週期狀態 |
| Provenance Requirements | 結果必須攜帶的證據 |

例如：

```text
Step ID:
S3

Objective:
收集每個候選產品的官方價格

Dependencies:
S1 評估標準完成
S2 候選清單核准

Allowed Tools:
Official Web Search
Browser

Expected Output:
含 Source URL 與 Access Date 的結構化 Pricing Table

Completion Criteria:
每個候選都有已公開價格
或明確的 unavailable / undisclosed 狀態

Failure Policy:
先查 Official Pricing Page
再查 Official Documentation
再查 Official Announcement
仍無資料時標為 unavailable

Budget:
6 Tool Calls
8 Minutes
```

這樣 Executor 才得到有界任務，Verifier 也有驗收契約。

![Figure 3-3 — Executable Plan Contract](/images/the-atlas-of-agent-design-patterns-part-3/executable-plan-contract.png)

> **Figure 3-3｜Executable Plan Contract**  
> Plan Step 不能只是任務名稱，必須包含 Objective、Dependencies、Allowed Tools、Expected Output、Completion Criteria、Failure Policy 與 Budget。

## Plan Validation：Plan 是提案，不是證明

語言模型可以產生看似合理，實際違反 Precondition、遺漏 Required Effect，或使用環境中不存在 Action 的 Plan。

驗證強度應與任務風險匹配。

### Natural-language Review

適合低風險工作，主要檢查 Requirement 遺漏與順序問題。

### Deterministic Check

檢查：

- Required Field
- Dependency Reference
- Step Dependency 是否無環
- Permitted Tool
- Budget Total
- Known Precondition
- Output Schema

### Simulation 或 Dry Run

在不可逆操作前，以 Environment Model 測試 Plan。

### External Planner 或 Solver

如果 Domain 有正式 Action、Precondition、Effect 與 Constraint，Classical Planner 或 Solver 能提供比自由文字生成更強的保證。例如 LLM+P 先把自然語言問題轉成 Planning Representation，再把 Plan Search 交給 Classical Planner。

這不代表每個商業 Workflow 都需要 PDDL。真正的重點是：流暢的 Plan 不等於有效的 Plan。

## Adaptive Planning：現實改變時，修正剩餘計畫

Static Plan 假設 Premise 持續成立。Adaptive Planner 會檢查 Execution Feedback，並在重大假設失效時修改剩餘工作。

```text
Create Plan
  -> Execute One Step
  -> Inspect Result
  -> Is Remaining Plan Still Valid?
       yes -> continue
       no  -> local repair or revised plan
```

Adaptive Planning 不應代表每個 Step 後都重寫整份 Plan。它需要明確 Trigger 與有界 Authority。

### 合理的 Replan Trigger

- Critical Premise 為假
- Required Data 不可取得
- Dependency 改變
- 使用者 Goal 或 Constraint 改變
- Verifier 拒絕結果
- Tool 或 Capability 不可用
- Remaining Budget 無法支撐原 Plan
- 多次 Local Repair 失敗
- 發現新的高優先風險

### Local Repair 與 Global Replan

以下情況使用 **Local Repair**：

- Objective 仍然正確
- 只有一個 Step 的實作失敗
- Approved Fallback 仍可滿足同一契約
- Dependency 與後續 Step 不變

以下情況才使用 **Replanning**：

- 一個 Premise 同時影響多個 Step
- 原本的 Decomposition 已失效
- Deliverable 或 Constraint 改變
- 後續 Dependency 必須重寫
- 出現新的 Approval 或 Policy Boundary

### 保存仍有效的已完成工作

Revised Plan 不應默默丟棄仍然正確的結果。

例如：

```text
Plan v1

Completed:
S1 定義評估標準
S2 選擇候選 Framework

Blocked:
S3 收集官方定價
```

Replan 後：

```text
Plan v2

Preserved:
S1 定義評估標準
S2 選擇候選 Framework

Revised:
S3A 搜尋官方文件
S3B 搜尋官方公告
S3C 明確標記未公開定價

Unchanged:
S4 比較架構
S5 產生建議
```

### Versioning Requirement

應保存：

- Immutable Original Goal
- Current Plan Version
- Previous Plan Version
- Replan Trigger
- Plan Diff
- Preserved Steps
- Invalidated Steps
- New Dependencies
- Replan Count
- Verifier Decision
- 批准修改的 Actor 或 Model

AdaPlanner 等研究展示了根據 Feedback 修正 Plan 的方法；正式環境則需要再加上 Plan Version、Limit 與 Auditability，避免 Replanning 本身成為失控 Loop。

![Figure 3-4 — Adaptive Planning with Versions](/images/the-atlas-of-agent-design-patterns-part-3/adaptive-planning-with-versions.png)

> **Figure 3-4｜Adaptive Planning with Versions**  
> Replan 由明確 Trigger 啟動；Revised Plan 不丟棄仍有效的 Completed Work，並記錄 Plan Diff、Replan Count 與 Preserved Steps。

## Hierarchical Planning：以多個層級拆解 Goal

當 Goal 包含數個獨立工作領域時，Flat Plan 很快會失去可管理性。

Hierarchical Planning 會分層：

```text
Main Goal
  -> Subgoal A
       -> Task A1
       -> Task A2
  -> Subgoal B
       -> Task B1
       -> Task B2
  -> Subgoal C
       -> Task C1
```

例如：

```text
Produce Market Recommendation
  -> Analyse Market
       -> Estimate Size
       -> Identify Growth Drivers
  -> Analyse Competitors
       -> Collect Pricing
       -> Compare Features
       -> Review Positioning
  -> Produce Recommendation
       -> Synthesise Findings
       -> Identify Risks
       -> Recommend Action
```

### 優點

- 上層只追蹤 Outcome，不必追每次 Tool Call
- Subgoal 可以分工
- Local Failure 可以隔離
- Context 可限制在 Worker 的任務範圍
- 獨立 Branch 可以成為 DAG Node

### 風險

- Subgoal 之間重複工作
- Assumption 不一致
- Hand-off 過程丟失原始意圖
- Output Format 不相容
- 所有 Subtask 都完成，Parent Goal 卻仍未完成

Hierarchical Decomposition 因此需要：

- Parent 與 Child Completion Contract
- Shared Facts 與 Terminology
- Source Provenance
- Dependency Management
- Integration Owner
- Cross-subgoal Verification

## HTN：以 Domain Method 做正式層級拆解

Hierarchical Task Network Planning 是正式規劃方法。它會把 Compound Task 不斷 Refinement 成較低層 Task Network，直到只剩可執行的 Primitive Task。

核心概念如下。

### Compound Task

需要被拆解的任務：

```text
Process Customer Refund
```

### Method

當條件成立時，可以套用的 Domain-specific Decomposition：

```text
Standard Refund Method:
  Verify Order
  Check Eligibility
  Calculate Amount
  Execute Refund
  Notify Customer
```

### Primitive Task

Execution System 可以直接執行的 Action：

```text
Query Order Database
Create Approval Request
Issue Refund
Send Confirmation
```

真正差異不只是「Plan 由人事先寫好」。HTN 依賴由 Task、Method、Constraint 與 Operator 構成的 Domain Knowledge。這個 Domain Model 常由專家設計與治理，但 Method 也可能被產生或學習，再經過驗證。

### 適合 HTN 的情境

- 已建立的 Operational Procedure
- Logistics 與 Fulfilment
- Customer Service Process
- IT Operations
- Regulated Approval
- 可重用的 Domain-specific Decomposition
- 允許程序比開放創意更重要的環境

### 優點

- Decomposition 可稽核
- Method 可重用
- 容易整合 Domain Rule
- Search Space 可控制
- 執行結構一致

### 限制

- Domain Model 建置與維護成本高
- 未建模任務仍然困難
- 過時 Method 會持續產生過時行為
- 多個 Method 同時適用時需要選擇策略
- 正式正確性仍取決於 Domain Model 是否正確

### HTN 與 LLM 可以組合

實務架構可以是：

```text
LLM:
理解自然語言 Request
  -> 對應已知 Task 並抽取 Parameter

HTN Planner:
選擇適用 Method
  -> 拆解成 Primitive Task

Execution System:
執行允許的 Primitive Task

LLM:
處理語言密集節點並解釋結果
```

LLM 處理模糊性，HTN Model 限制程序。

## Goal 與 Policy 是跨流程約束，不是同層策略

前面的類別描述 Decision 或 Plan 如何產生。Goal 與 Policy 則橫跨所有類別。

### Goal

Goal 定義 Desired State 或 Acceptance Condition。

好的 Goal 可以量測：

```text
Target Tests 全部通過
Full Test Suite 通過
Lint 通過
Build 成功
沒有修改無關檔案
```

模糊 Goal 則是：

```text
Improve the Repository
```

Fixed Logic、ReAct、Plan-and-Execute、Adaptive Planning 與 HTN 都需要 Goal。

### Policy

Policy 定義 Proposed Action 是否可執行：

```text
Proposed Action
  -> Policy Check
       -> allowed -> execute
       -> approval required -> pause
       -> denied -> reject or fallback
```

Policy 可以限制：

- Tool
- Permission
- Data Access
- Cost
- Risk
- Privacy
- Network Access
- Reversibility
- Human Approval

重要 Policy 應由 Application 或 Infrastructure Enforcement，而不是只寫在 Prompt。

例如：

- Read-only Database Credential
- Scoped API Token
- Network Restriction
- Sandboxed File Access
- Tool Allowlist
- Spending Limit
- Approval Gate

不應讓 Agent 成為判斷自己是否需要遵守安全規則的唯一權威。

## 主要決策策略比較

| 維度 | Fixed Logic | Bounded ReAct | Plan-and-Execute | Adaptive Planning | HTN |
|---|---|---|---|---|---|
| 核心節奏 | 依預定規則執行 | 根據 Observation 決定 | 先 Plan，再 Execute | Plan、Execute，符合 Trigger 時修改 | 透過 Domain Method Refinement |
| 全局視角 | 由開發者編碼 | 通常較弱 | 較強 | 較強且可更新 | 編碼於 Task-Method Model |
| 局部適應 | 除非預設 Branch，否則低 | 在限制內高 | 取決於 Executor | 允許 Repair 或 Replan 時高 | 限於可用 Method 與 Execution Feedback |
| 可預測性 | 高 | 較低 | 中 | 中至較低 | 在已建模 Domain 內高 |
| 主要風險 | 僵硬 | Loop 與 Local Myopia | 高效率執行錯誤 Plan | Replan Drift 與成本 | Domain Model 過時或不完整 |
| 最適合 | 穩定任務 | 不確定 Tool Interaction | Requirement 多的長任務 | 變動環境中的長任務 | 已建立且可重用的程序 |
| 必要控制 | Test 與 Typed Failure | Limit、Progress、Policy、Stop Criteria | Plan Schema 與 Plan Validation | Version、Trigger、Diff、Replan Limit | Method Governance 與 Domain Validation |

這些是預設判斷，不是普世分數。有清楚契約的 Bounded ReAct，可能比模糊的 Static Plan 更可預測。

## Production Hybrid：Planner、Bounded Executor、Verifier 與 Replanner

穩健架構通常會組合多種方法：

```text
User Goal
  -> Planner
  -> Versioned Plan Store
  -> State Machine 選擇 Ready Step
  -> Bounded Executor
       -> 依情況使用 Fixed Logic 或 ReAct
  -> Verifier
       -> Pass
       -> Local Repair
       -> Replan
       -> Fail or Escalate
```

### Planner 責任

- 理解完整 Goal
- 建立 Subgoal 與 Step
- 定義 Dependency
- 分配 Budget
- 定義 Output 與 Completion Criteria
- 找出 Approval 與 Policy Boundary

### Executor 責任

- 執行一個 Step Contract
- 只使用允許 Tool
- 根據 Observation 做局部適應
- 正規化結果
- 更新 Progress
- 遇到 Blocker 時回報，而不是偷偷修改 Goal

### Verifier 責任

- 檢查 Step Contract
- 驗證 Evidence 與 Output Schema
- 偵測 Requirement 遺漏
- 區分 Local Repair 與 Global Replan
- 接受或拒絕完成狀態

### Replanner 責任

- 只對有效 Trigger 反應
- 保存仍有效的 Completed Work
- 更新剩餘 Dependency
- 產生 Plan Diff
- 遵守 Replan Limit

### State Machine 責任

- 保存 Progress
- 控制合法 Transition
- 管理 Retry 與 Waiting
- 執行 Terminal State
- 協調 Approval

### Policy Layer 責任

- 授權 Tool 與 Data
- 限制成本與時間
- 攔截高影響 Action
- 要求 Human Approval
- 建立 Audit Trail

![Figure 3-5 — Production Planning Architecture](/images/the-atlas-of-agent-design-patterns-part-3/production-planning-architecture.png)

> **Figure 3-5｜Production Planning Architecture**  
> Planner 產生 Versioned Plan，State Machine 選擇 Ready Step，Bounded Executor 執行，Verifier 驗收，Replanner 在 Trigger 出現時修正剩餘工作。

## 如何選擇策略

從可以可靠完成任務的最小彈性開始。

### 使用 Fixed Logic

- 下一步已知
- Environment 穩定
- 每個 Request 使用相同契約
- Predictability 比 Adaptation 更重要

### 加入 Bounded ReAct

- 下一個有效 Action 依賴最新 Tool Result
- Environment 難以事前列舉
- 需要 Local Exploration
- Completion 仍可驗證

### 加入 Plan-and-Execute

- 任務包含許多 Requirement
- 遺漏成本高
- Progress 必須可見
- Dependency 或 Delegation 很重要

### 加入 Adaptive Replanning

- Premise 可能在執行中改變
- Static Plan 可能失效
- Local Repair 有時不足
- 系統能判斷 Material Replan Trigger

### 使用 Hierarchical Decomposition

- Flat Plan 太大
- Subgoal 有不同 Owner 或 Context
- Parent 與 Child Completion 可以定義

### 使用 HTN

- Domain 有可重用且受治理的 Procedure
- Valid Decomposition Method 可以被建模
- Consistency 與 Auditability 是核心

### 使用 External Planner 或 Solver

- Precondition 與 Effect 可以形式化
- Feasibility 比流暢說明更重要
- Constraint 太重要，不能只靠自由生成
- 需要 Valid 或 Optimal Plan

## 常見反模式

### 每個任務都先 Planning

翻譯或固定抽取不需要五步 Plan。

### 把 Plan 當成 Ground Truth

Generated Plan 只是完成任務方式的 Hypothesis。

### ReAct 沒有 Step Contract

Executor 探索 Tool，卻不知道應產出什麼。

### 每個 Observation 後都 Replan

系統修改 Plan 的時間比執行更多。

### Local Failure 觸發 Global Replan

一個 Endpoint 不可用，就丟掉整份 Plan。

### Replanning 沒有 Version

Previous Plan 消失，Goal Drift 與重複工作無法追蹤。

### Hierarchy 沒有 Integration Owner

每個 Subgoal 都完成，卻沒有人負責 Final Outcome。

### 把所有 Goal-directed Loop 當成獨立架構

所有有用 Agent 都追求某個 Goal。真正差異在 Action Selection、Planning、Verification 與 Control 如何實作。

### Safety Rule 只寫在 Prompt

模型被要求不要使用某項能力，但 Runtime 仍毫無限制地暴露它。

### Planner 與 Executor 重複做同一件事

Planner 已定義 Research Strategy，Executor 卻從頭重新設計整項任務。

### 不願承認任務無法滿足

正確的 Terminal Result 可能是：

- unavailable
- unsupported
- blocked
- partial
- requires human action

再多一次 Planning 也無法創造不存在的 Evidence 或 Permission。

## Production Planning 應保存什麼

| 紀錄 | 用途 |
|---|---|
| Original Goal | 防止 Drift |
| Goal Version | 記錄已授權的 Goal Change |
| Current Plan Version | 指定 Active Plan |
| Plan Diff | 說明修改內容 |
| Replan Trigger | 證明修改理由 |
| Step Contract | 定義 Execution 與 Acceptance |
| Step Dependency | 控制 Ready 狀態 |
| Step Status | 追蹤 Progress |
| Tool Call 與 Observation | 保存實際執行 |
| Evidence 與 Provenance | 支援 Verification |
| Retry Count | 限制 Local Repair |
| Replan Count | 限制 Global Revision |
| Remaining Budget | 控制成本 |
| Policy Decision | 保存 Permission 與 Risk Check |
| Verifier Result | 接受或拒絕完成 |
| Terminal Outcome | Completed、Partial、Blocked、Failed 或 Cancelled |

沒有這些記錄，長任務只是一段很長的對話，而不是可管理流程。

## 完整範例：研究 Agent Framework

Goal 是：

> 比較三個 Agent Framework，並推薦適合 Production RAG 的選擇。

### Router

選擇 Research Workflow，而不是 Direct Q&A。

### Planner

建立：

```text
S1 定義評估標準
S2 確認候選 Framework
S3 收集官方 Architecture 資訊
S4 比較 State 與 Persistence
S5 比較 Observability 與 Testing
S6 比較 Tool 與 Multi-agent Support
S7 評估 Risk 與 Operational Fit
S8 產生 Recommendation
```

每個 Step 都有 Contract、Budget 與 Completion Criteria。

### Executor

執行 `S3` 時，有界 ReAct Executor 可以：

```text
開啟官方 Architecture Documentation
  -> 必要欄位缺失
開啟官方 Persistence Documentation
  -> 記錄 Capability 與 Version
檢查官方 Repository
  -> 抽取結構化 Evidence
所有欄位有資料或明確 Unknown 時停止
```

### Verifier

檢查：

- 每個重要 Claim 是否來自官方 Source
- 每個 Comparison Field 是否涵蓋
- Missing Information 是否標記 Unknown
- 是否混用了不同 Version 的資料
- Recommendation 是否遵循 Criteria

### Adaptive Replan

其中一個 Framework 沒有公開 Pricing 或必要技術欄位。

Replanner 只修改剩餘工作：

```text
將推測欄位替換成：
- Publicly Documented Capabilities
- Explicitly Marked Unknowns
- No Unsupported Estimate
```

### Synthesis

整合已驗證結果並產生 Recommendation。

這不是 Pure ReAct，也不是 Pure Plan-and-Execute，而是 Router、Planning、Bounded Action Selection、Verification、State Management 與 Triggered Replanning 的治理式組合。

## 結論

把不同機制分層後，規劃層會清楚很多：

- **Fixed Decision Logic** 讓已知工作維持確定性。
- **Bounded ReAct** 根據最新 Observation 調整局部行動。
- **Plan-and-Execute** 在執行前建立顯式全局結構。
- **Adaptive Planning** 在 Material Trigger 出現後修改剩餘工作。
- **Hierarchical Planning** 把大型 Goal 組織成多層 Subgoal。
- **HTN** 以正式 Domain Model 將 Compound Task 拆成 Executable Task。
- **Plan Verification** 判斷看起來合理的 Plan 是否真的可接受。
- **Goal 與 Policy** 橫跨所有策略，定義結果與邊界。

Production 目標不是最大化規劃自由，而是把彈性放在正確位置：

```text
固定的外層控制
  + 需要全局覆蓋時使用 Explicit Plan
  + Observation 重要時使用 Bounded Local Adaptation
  + Acceptance 前執行 Verification
  + 只有現實讓 Plan 失效時才做 Versioned Replanning
```

Part 4 將從 Planning 進入 Search：

> 當問題存在多個候選解法時，Agent 應如何探索、比較、剪枝與選擇？

## 參考資料

- [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629)
- [Xu et al., *ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models*](https://arxiv.org/abs/2305.18323)
- [Wang et al., *Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models*](https://arxiv.org/abs/2305.04091)
- [Sun et al., *AdaPlanner: Adaptive Planning from Feedback with Language Models*](https://arxiv.org/abs/2305.16653)
- [Liu et al., *LLM+P: Empowering Large Language Models with Optimal Planning Proficiency*](https://arxiv.org/abs/2304.11477)
- [Huang et al., *Language Models as Zero-Shot Planners: Extracting Actionable Knowledge for Embodied Agents*](https://arxiv.org/abs/2201.07207)
- [Valmeekam et al., *Large Language Models Still Can't Plan: A Benchmark for LLMs on Planning and Reasoning about Change*](https://arxiv.org/abs/2206.10498)
- [Au et al., *SHOP2: An HTN Planning System*](https://arxiv.org/abs/1106.4869)
- [Höller et al., *On Hierarchical Task Networks*](https://arxiv.org/abs/1606.06900)

