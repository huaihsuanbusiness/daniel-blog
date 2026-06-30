---
title: "Agent 設計模式圖鑑 Part 3｜ReAct、Plan-and-Execute 與 Adaptive Planning：Agent 如何決定下一步"
description: "完整比較 Fixed Workflow、ReAct、Plan-and-Execute、Adaptive Planning、Hierarchical Planning 與 HTN，並拆解 Production Agent 如何結合 Planner、Executor、Verifier、State Machine 與 Policy Guardrails。"
date: 2026-06-30T19:20:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 3
---

上一篇，我們談的是 Agent 的執行骨架：

- Direct
- Pipeline
- Router
- State Machine
- DAG
- Event-driven
- Human-in-the-loop

這些模式決定：

- 任務會經過哪些節點
- 哪些節點可以分支
- 哪些工作能夠平行
- 任務失敗後回到哪裡
- 狀態如何保存
- 流程何時正式結束

但即使執行路徑已經畫好，系統仍然必須回答另一個問題：

> Agent 現在應該做什麼？

例如，一個研究 Agent 進入 `RESEARCH` 狀態後，下一步可能是：

- 搜尋網頁
- 改寫關鍵字
- 開啟官方文件
- 查詢資料庫
- 比較多個來源
- 要求使用者補充資訊
- 判斷資料已經足夠
- 停止研究並開始整理答案

這些選擇不一定能在開發階段全部寫死。

Agent 需要根據：

- 使用者目標
- 當前狀態
- 已完成工作
- 工具回傳結果
- 剩餘預算
- 權限與風險限制

選擇下一個行動。

這正是 Fixed Workflow、ReAct、Plan-and-Execute、Adaptive Planning、Hierarchical Planning 和 HTN 所處理的問題。

它們不是不同種類的完整 Agent，而是不同的決策與規劃方式。

---

## 執行路徑與決策方式不是同一件事

先看一套簡化的 State Machine：

```text
START
  ↓
PLAN
  ↓
RESEARCH
  ↓
VERIFY
  ↓
ANSWER
  ↓
END
```

這張圖只告訴我們系統會經過哪些狀態。

但進入 `RESEARCH` 後，系統仍然可以採取不同的決策方式。

## 固定邏輯

```text
Search
  ↓
Open Top Results
  ↓
Extract Facts
  ↓
Return
```

下一步由程式預先決定。

## ReAct

```text
Observe Current State
  ↓
Decide Next Action
  ↓
Use Tool
  ↓
Inspect Observation
  ↓
Decide Again
```

下一步取決於最新的工具結果。

## Plan-and-Execute

```text
Research Goal
  ↓
Create Subplan
  ↓
Execute Step 1
  ↓
Execute Step 2
  ↓
Return Structured Result
```

系統先建立局部計畫，再逐步執行。

因此，同一個 State Machine 裡，可以在某個節點使用固定流程，也可以使用 ReAct 或 Plan-and-Execute。

反過來，一個 Plan-and-Execute Agent 也可以被放進 Pipeline、State Machine 或 DAG 裡執行。

| 問題 | 對應維度 |
|---|---|
| 任務會經過哪些節點？ | 執行路徑 |
| Agent 下一步做什麼？ | 決策與規劃 |
| 是否探索多個候選？ | 推理與搜尋 |
| 做錯後如何恢復？ | 驗證與修正 |

把這些問題分開，Agent 架構才不會變成一鍋名詞濃湯。

![Figure 3-1 — One Execution Skeleton, Three Decision Strategies](/images/the-atlas-of-agent-design-patterns-part-3/skeleton-with-three-decision-strategies.png)

> **Figure 3-1｜One Execution Skeleton, Three Decision Strategies**  
> 同一個 `RESEARCH` 狀態，可以使用 Fixed Workflow、ReAct 或 Plan-and-Execute。執行骨架控制整體路線，決策策略控制節點內的行為。

---

## 一、Fixed Workflow：下一步早已決定

在討論 ReAct 前，先從最可控的方式開始。

Fixed Workflow 代表下一步由程式或流程定義，而不是由模型自由選擇。

```text
Classify
  ↓
Retrieve
  ↓
Generate
  ↓
Verify
```

如果 `Retrieve` 完成，下一步就是 `Generate`。

模型不會突然決定搜尋網頁、建立子任務或重新設計整套流程。

## 適合 Fixed Workflow 的任務

- 步驟穩定
- 任務邊界明確
- 每個 Request 都需要相同步驟
- 結果格式固定
- 成本與延遲必須高度可預測
- 自主決策帶來的價值有限

例如：

```text
Upload File
  ↓
Parse
  ↓
Chunk
  ↓
Embed
  ↓
Index
```

這類 Ingestion Pipeline 通常不需要 Agent 自己決定下一步。

## 優點

- 容易測試
- 容易重現
- 成本穩定
- 權限邊界清楚
- 不容易陷入無限循環
- 節點責任容易定義

## 限制

當外部環境不確定時，固定流程可能不夠靈活。

例如，一個資料來源無法讀取後，如果系統沒有預先設計 Fallback，就不知道應該：

- 改寫 Query
- 切換來源
- 要求登入
- 標記資料不可取得
- 停止任務

Fixed Workflow 並不落後。

很多成熟 Agent 系統的外層仍然是固定流程，只把少數無法事先寫死的節點交給 Agent。

---

## 二、ReAct：看完結果，再決定下一步

ReAct 可以理解為 Reasoning 與 Acting 的交錯循環。

在實際系統裡，更有用的描述是：

```text
Read Goal and Current State
  ↓
Decide Next Action
  ↓
Call Tool
  ↓
Normalize Observation
  ↓
Update Progress
  ↓
Decide Again
```

它不需要先列出完整計畫。

每執行一次行動，就根據新的 Observation 重新判斷下一步。

## ReAct 範例：查詢一家公司最新定價

第一次行動：

```text
Action:
Search the official pricing page
```

Observation：

```text
The pricing page only shows annual plans.
```

第二次行動：

```text
Action:
Search the official billing documentation
```

Observation：

```text
Monthly billing is available only for selected plans.
```

第三次行動：

```text
Action:
Open the official billing FAQ
```

Agent 不需要在開始前知道所有搜尋步驟。

它會根據每一次工具結果修正方向。

## ReAct 適合什麼任務？

### 工具結果不可預測

例如：

- Search
- Browser
- API
- Database
- File System
- Computer-use

### 任務路徑難以事先寫死

例如：

- Debug
- 網頁研究
- 尋找完整文件
- 操作陌生介面
- 多來源查證

### 下一步高度依賴上一個結果

例如：

```text
API returns 401
  ↓
Inspect authentication

API returns 404
  ↓
Inspect endpoint

API returns empty data
  ↓
Inspect query parameters
```

不同 Observation 會導向不同動作。

## ReAct 的優點

### 適應性高

Agent 可以根據真實環境調整策略。

### 適合探索

不需要事先列出所有可能分支。

### 工具結果可以修正模型判斷

模型不必只依賴內部知識，可以透過外部資料更新狀態。

### 局部失敗後容易換路

某個來源失敗後，可以改用另一個來源，不必重做整個任務。

---

## ReAct 為什麼容易繞圈？

ReAct 的主要問題通常不是缺乏行動能力，而是缺乏全局控制。

典型失敗如下：

```text
Search Query A
  ↓
Results insufficient
  ↓
Search Query B
  ↓
Results insufficient
  ↓
Search Query A again
  ↓
Open a previous result
  ↓
Search Query B again
```

Agent 看起來一直在做事，實際進度卻沒有增加。

## 原因一：沒有進度定義

Agent 只知道「繼續找」，卻不知道什麼叫資料足夠。

## 原因二：Observation 沒有結構化

工具結果只是長篇文字，Agent 很難追蹤：

- 已查過哪些來源
- 哪些問題尚未解決
- 哪些資訊互相衝突
- 哪些查詢已經失敗
- 哪些行動正在重複

## 原因三：沒有重複行動檢查

系統沒有偵測：

- 相同 Query
- 相同 URL
- 相同 Tool Call
- 相同參數
- 相同失敗原因

## 原因四：停止條件太模糊

例如：

> 繼續搜尋，直到找到足夠資訊。

「足夠」沒有被轉成可判定條件。

## 原因五：工具選擇過度自由

Agent 可以呼叫十幾種工具，卻沒有：

- Tool Allowlist
- Tool Cost
- Tool Priority
- Permission Boundary
- Maximum Calls

最後每個工具都摸一遍，任務仍停在原地。

---

## Production ReAct 需要哪些護欄？

ReAct 不應該是完全自由的無限循環。

至少需要：

| 護欄 | 作用 |
|---|---|
| Maximum Steps | 限制最大行動次數 |
| Tool Allowlist | 限制可用工具 |
| Per-tool Limit | 限制單一工具使用次數 |
| Budget Guard | 限制 Token、時間與 API 成本 |
| Duplicate Detection | 阻止重複查詢與操作 |
| Stop Conditions | 定義任務何時完成 |
| Progress State | 記錄已完成與未完成項目 |
| Failure Escalation | 多次失敗後切換 Fallback 或人工處理 |
| Tool Result Schema | 將 Observation 結構化 |
| Audit Trace | 保存 Action、Result 與 Decision Record |

一個更穩定的 ReAct Loop 可以寫成：

```text
Goal + Current State
  ↓
Check Budget and Policy
  ↓
Select Allowed Action
  ↓
Execute Tool
  ↓
Normalize Observation
  ↓
Update Progress
  ↓
Stop Condition?
  ├─ Yes → Complete
  └─ No → Select Next Action
```

重點不是讓 Agent 每一步都重新發明世界，而是讓它在邊界內調整。

![Figure 3-2 — Production ReAct Loop](/images/the-atlas-of-agent-design-patterns-part-3/react-production-loop.png)

> **Figure 3-2｜Production ReAct Loop**  
> Production ReAct 不只是 Action 與 Observation 的循環，還需要 Budget Guard、Tool Policy、Max Steps、Duplicate Detection、Progress State 和明確停止條件。

---

## 三、Plan-and-Execute：先看完整地圖，再開始走

Plan-and-Execute 採用不同節奏。

它不會立即呼叫工具，而是先把目標拆成多個步驟。

```text
Goal
  ↓
Create Plan
  ↓
Execute Step 1
  ↓
Execute Step 2
  ↓
Execute Step 3
  ↓
Synthesize Result
```

例如，任務是：

> 比較三個 Agent Framework，並推薦適合 Production RAG 的選擇。

Planner 可能先建立：

```text
1. Define evaluation criteria
2. Collect official architecture information
3. Compare workflow control
4. Compare persistence and observability
5. Compare multi-agent support
6. Evaluate Production risks
7. Produce recommendation
```

Executor 再依序處理每一步。

## Plan-and-Execute 適合什麼任務？

- 任務較長
- 有明確交付物
- 容易漏項
- 需要多來源資料
- 子任務有前後依賴
- 需要追蹤進度
- 需要將工作分配給多個 Worker

常見情境包括：

- Deep Research
- 市場分析
- 長篇報告
- 專案規劃
- 大型程式修改
- 多文件審閱
- 跨系統資料整理

## Plan-and-Execute 的優點

### 全局性較好

在行動前先確認任務包含哪些部分。

### 不容易被第一個結果帶走

ReAct 可能看到第一個有趣來源就一路深挖。

Planner 會提醒系統仍有其他子問題未完成。

### 進度容易追蹤

可以清楚知道：

- 哪些步驟已完成
- 哪些步驟正在執行
- 哪些步驟被阻塞
- 哪些結果尚未整合

### 適合平行分工

Planner 可以將互相獨立的步驟放進 DAG，交給多個 Worker 同時執行。

---

## Plan-and-Execute 為什麼會一路走錯？

Plan-and-Execute 的弱點集中在初始計畫。

如果 Planner 錯誤理解任務，Executor 可能非常有效率地完成一份錯誤計畫。

例如，使用者要求：

> 評估某職缺是否適合我。

Planner 卻建立：

```text
1. Read the job title
2. Infer likely responsibilities
3. Compare inferred requirements with the CV
4. Produce a score
```

問題在於：

- 沒有讀取完整 JD
- 根據職稱猜測內容
- 後續每一步都建立在錯誤輸入上

最後報告可能結構完整、語氣專業，仍然不可信。

## 常見失敗一：計畫過度抽象

```text
1. Research the topic
2. Analyze the findings
3. Write the answer
```

這不是可執行計畫，只是把任務換句話說。

## 常見失敗二：計畫過度細碎

Planner 列出數十個微型步驟，執行成本與狀態管理快速膨脹。

## 常見失敗三：沒有依賴關係

某些步驟必須等待前置資料，但 Planner 把它們同時啟動。

## 常見失敗四：沒有完成條件

「研究競爭者」不是可驗收步驟。

更好的寫法是：

```text
Collect official pricing, core features, target users,
and deployment model for every selected competitor.
```

## 常見失敗五：計畫建立後不再更新

外部條件已改變，Agent 仍照原計畫一路執行。

---

## 好計畫應該包含什麼？

一個可執行計畫不只是步驟清單。

每個步驟最好包含：

| 欄位 | 說明 |
|---|---|
| Step ID | 唯一識別碼 |
| Objective | 這一步要完成什麼 |
| Inputs | 需要哪些資料 |
| Allowed Tools | 可以使用哪些工具 |
| Dependencies | 依賴哪些前置步驟 |
| Expected Output | 應產生什麼結果 |
| Completion Criteria | 如何判斷完成 |
| Failure Policy | Retry、Fallback、Pending 或 Stop |
| Cost Budget | Token、時間與工具限制 |
| Status | Pending、Running、Completed、Failed |

例如：

```text
Step ID:
S3

Objective:
Collect official pricing information

Inputs:
Company names and official domains

Allowed Tools:
Web Search, Browser

Dependencies:
S1 evaluation criteria completed

Expected Output:
Structured pricing table with source and access date

Completion Criteria:
Pricing found for every company,
or unavailable items explicitly marked

Failure Policy:
Try official pricing page,
then official documentation,
then official announcements,
otherwise mark Unavailable
```

這才是一個 Executor 能執行、Verifier 能驗收的計畫。

![Figure 3-3 — From Goal to an Executable Plan](/images/the-atlas-of-agent-design-patterns-part-3/executable-plan-contract.png)

> **Figure 3-3｜From Goal to an Executable Plan**  
> Planner 不只是列步驟，而是把模糊目標轉成帶有 Input、Tool、Dependency、Expected Output、Completion Criteria、Failure Policy 和 Budget 的執行契約。

---

## 四、Adaptive Planning：計畫不是聖旨

Adaptive Planning 會在執行過程中更新剩餘計畫。

```text
Create Plan
  ↓
Execute Step
  ↓
Inspect Result
  ↓
Plan Still Valid?
  ├─ Yes → Continue
  └─ No → Revise Remaining Plan
```

它結合了 Plan-and-Execute 的全局視角，以及 ReAct 的現場適應能力。

## 什麼情況需要 Replan？

### 前提被證明錯誤

例如：

- 原本以為官方 API 可用
- 實際上 API 已停止服務
- 剩餘計畫需要改走其他來源

### 新資訊改變任務方向

例如：

- 研究中發現產品已停止營運
- 原本的功能比較失去意義
- 應改成遷移方案比較

### 某一步無法完成

例如：

- 頁面需要登入
- 文件不存在
- 權限不足
- 工具不支援

### 預算不足

原計畫需要十次大型模型呼叫，但剩餘 Budget 只允許三次。

### 驗證失敗

Verifier 發現：

- Citation 不完整
- 來源不可靠
- 結論缺少證據
- 必要欄位遺漏

這時不一定只需重寫答案，可能要回頭補研究。

## Replanning 不等於全部重來

成熟的 Adaptive Planning 通常只修改剩餘步驟。

例如：

```text
Completed:
1. Define comparison criteria
2. Identify candidate frameworks

Blocked:
3. Collect pricing from official pricing pages
```

更新後：

```text
Preserved:
1. Define comparison criteria
2. Identify candidate frameworks

Revised:
3A. Search official documentation
3B. Search official announcements
3C. Mark unavailable pricing explicitly
4. Continue architecture comparison
```

已完成且仍有效的結果不需要丟棄。

## Replan Trigger 應該明確

不要讓 Agent 每完成一步就重新設計整套計畫。

可以設定：

- Critical assumption failed
- Required data unavailable
- Verifier rejected output
- Dependency changed
- Budget threshold reached
- User goal changed
- Two consecutive step failures
- New high-priority risk discovered

## Adaptive Planning 的風險

### 過度重新規劃

Agent 花大量時間修改計畫，真正執行的工作反而很少。

### 計畫漂移

每次 Replan 都稍微改變目標，最後偏離原始需求。

### 已完成結果被重複執行

Planner 沒有讀取 State，重新安排已完成步驟。

### Replan 變成逃避失敗

某一步失敗後不斷換計畫，而不是承認資料無法取得。

因此，Adaptive Planning 需要：

- Immutable User Goal
- Completed Step Registry
- Replan Reason
- Plan Version
- Maximum Replans
- Plan Diff
- Verifier Approval for Major Changes

![Figure 3-4 — Adaptive Planning and Plan Versioning](/images/the-atlas-of-agent-design-patterns-part-3/adaptive-planning-with-versions.png)

> **Figure 3-4｜Adaptive Planning and Plan Versioning**  
> Plan v1 執行至某一步失敗後，保留已完成結果，記錄 Replan Trigger 與 Plan Diff，再建立只修改剩餘步驟的 Plan v2。

---

## 五、Hierarchical Planning：大任務不是一張扁平清單

當任務變長時，把所有步驟放在同一層會快速失控。

Hierarchical Planning 會將大目標拆成子目標，再把子目標拆成可執行任務。

```text
Main Goal
├── Subgoal A
│   ├── Task A1
│   ├── Task A2
│   └── Task A3
├── Subgoal B
│   ├── Task B1
│   └── Task B2
└── Subgoal C
    ├── Task C1
    └── Task C2
```

例如：

```text
Produce Market Analysis
├── Analyze Market
│   ├── Estimate market size
│   └── Identify growth drivers
├── Analyze Competitors
│   ├── Collect pricing
│   ├── Compare features
│   └── Review positioning
└── Produce Recommendation
    ├── Summarize findings
    ├── Identify risks
    └── Recommend strategy
```

## Hierarchical Planning 的價值

### 降低複雜度

上層只需要關心子目標是否完成，不必追蹤每一次工具呼叫。

### 容易分派 Worker

每個子目標可以交給不同專業 Agent。

### 容易局部重試

競爭者分析失敗，不必重做市場規模分析。

### 容易控制 Context

每個 Worker 只接收與自己任務相關的資訊。

## Hierarchical Planning 的風險

### 子目標之間重複工作

兩個 Worker 可能查詢相同資料。

### 上下層資訊丟失

上層 Planner 的意圖，在多次轉交後被簡化或扭曲。

### 整合困難

每個子任務都完成，不代表主目標已經完成。

例如：

- 格式不同
- 假設不同
- 日期不同
- 結論互相矛盾

因此，Hierarchical Planning 通常需要：

- 明確 Input / Output Contract
- Shared Fact Registry
- Source Tracking
- Dependency Management
- Final Synthesis
- Cross-task Verification

---

## 六、HTN：使用預先定義的方法拆解任務

HTN 是 Hierarchical Task Network。

它同樣把大任務拆成小任務，但和自由式 Planner 有一個重要差別：

> HTN 通常使用人類預先定義的拆解方法。

例如，對「處理客戶退款」這個任務，可以定義：

```text
Process Refund
├── Verify Order
├── Check Refund Eligibility
├── Calculate Refund Amount
├── Request Approval if Required
├── Execute Refund
└── Notify Customer
```

這不是模型臨時想出的計畫，而是企業已經定義好的程序。

## HTN 的基本元素

### Compound Task

需要被拆解的大任務。

例如：

```text
Process Customer Refund
```

### Method

將大任務拆解的方法。

例如：

```text
If order is within 30 days:
Use Standard Refund Method

If order is older than 30 days:
Use Exception Review Method
```

### Primitive Task

可以直接執行的最小任務。

例如：

- Query order database
- Calculate refund
- Create approval request
- Send confirmation email

## HTN 適合什麼情境？

- 企業 SOP
- 客服流程
- 物流
- 財務審批
- IT Operations
- Compliance
- 已知處理方法的任務
- 需要高度一致性的流程

## HTN 的優點

- 比自由 Planning 更可控
- 拆解方式可審核
- 容易符合企業規則
- 執行結果一致
- 適合權限與合規管理
- 子流程可以重用

## HTN 的限制

- 需要人工建立方法庫
- 面對未知任務較弱
- 規則維護成本高
- 方法過時後可能穩定地做錯
- 多個 Method 同時適用時需要選擇策略

## HTN 和 Plan-and-Execute 的差別

| 項目 | Plan-and-Execute | HTN |
|---|---|---|
| 計畫來源 | 模型動態產生 | 預先定義的 Method |
| 靈活性 | 高 | 中 |
| 可控性 | 中 | 高 |
| 一致性 | 中 | 高 |
| 未知任務 | 較適合 | 較不適合 |
| 企業 SOP | 可以 | 很適合 |
| 主要風險 | 計畫幻覺 | 規則過時 |

HTN 可以和 LLM 結合：

```text
LLM:
理解自然語言需求並選擇 HTN 任務

HTN Engine:
依照已核准 Method 拆解與執行

LLM:
處理其中需要語言理解的節點
```

這種結構讓 LLM 處理模糊理解，讓 HTN 處理可靠流程。

---

## 七、Goal-driven Agent：目標清楚，路線不固定

Goal-driven Agent 只給定最終目標，由 Agent 持續選擇最可能接近目標的行動。

```text
Goal
  ↓
Observe Current State
  ↓
Choose Action
  ↓
Measure Progress
  ↓
Repeat
```

例如：

> 讓這個 Repository 通過完整測試。

Agent 可以自行：

- 檢查 Repository
- 執行測試
- 讀取錯誤
- 修改程式
- 再次測試
- 執行 Lint
- 檢查 Build

Goal-driven 的彈性很高，但必須有可衡量的完成條件。

好的目標：

```text
All target tests pass
Full test suite passes
Lint passes
Build succeeds
No unrelated files changed
```

模糊目標：

```text
Improve the repository
```

後者幾乎沒有停止依據。

## Goal-driven Agent 需要什麼？

- Measurable Objective
- Current State
- Progress Metric
- Allowed Actions
- Failure Boundary
- Resource Budget
- Completion Verifier
- Maximum Iterations

沒有這些限制，目標導向很容易變成永遠還能再改善一點。

---

## 八、Policy-based Decision：不是能做就可以做

Agent 決定下一步時，不應只考慮：

> 哪個行動最可能完成任務？

還要考慮：

- 權限
- 風險
- 成本
- 隱私
- 合規
- 可撤銷性
- 使用者設定

Policy-based Decision 會在行動前檢查：

```text
Proposed Action
  ↓
Policy Check
  ├─ Allowed → Execute
  ├─ Requires Approval → Pause
  └─ Denied → Reject or Use Fallback
```

## 常見 Policy

### Tool Policy

哪些工具可以使用？

### Permission Policy

哪些資料可以讀寫？

### Cost Policy

本次任務最多使用多少模型與工具成本？

### Risk Policy

哪些操作需要人工批准？

### Data Policy

哪些資料不能送到外部模型？

### Environment Policy

哪些操作只能在 Sandbox 執行？

## 為什麼 Policy 不應只寫在 Prompt？

Prompt 是行為指示，不是可靠的強制執行機制。

重要限制應由程式或基礎設施執行，例如：

- SQL Read-only Connection
- File-system Sandbox
- API Scope
- Tool Allowlist
- Spending Limit
- Approval Gate
- Network Restriction

不要讓 Agent 自己決定是否遵守自己的安全規則。

---

## ReAct、Plan-and-Execute 與 Adaptive Planning 完整比較

| 比較項目 | ReAct | Plan-and-Execute | Adaptive Planning |
|---|---|---|---|
| 核心節奏 | 行動後再決定 | 先規劃再執行 | 先規劃，執行中更新 |
| 全局視角 | 較弱 | 強 | 強 |
| 現場適應 | 很強 | 較弱 | 強 |
| 是否先建立計畫 | 不一定 | 是 | 是 |
| 是否修改計畫 | 通常沒有正式計畫 | 通常少 | 是 |
| 適合任務 | 搜尋、Debug、Browser | 報告、研究、長任務 | 外部環境不穩定的長任務 |
| 成本可預測性 | 較低 | 中～高 | 中 |
| 主要風險 | 繞圈、短視 | 錯誤計畫一路執行 | 過度 Replan、目標漂移 |
| 所需護欄 | Max Steps、Tool Policy | Plan Schema、Completion Criteria | Plan Version、Replan Trigger |
| 最佳用途 | 局部 Executor | 上層 Planner | Production 長任務 |

---

## 最實用的混合模式：Planner + ReAct Executor + Verifier

成熟系統通常不會選擇純 ReAct 或純 Plan-and-Execute。

更常見的組合是：

```text
User Goal
  ↓
Planner
  ↓
Structured Plan
  ↓
State Machine selects current step
  ↓
ReAct Executor
  ↓
Verifier
  ├─ Pass → Next Step or Final Answer
  ├─ Repair → Return to Executor
  └─ Replan → Return to Planner
```

## Planner 負責

- 理解完整目標
- 拆解子任務
- 定義依賴關係
- 設定完成條件
- 分配 Budget
- 選擇執行順序

## ReAct Executor 負責

- 在單一步驟內使用工具
- 根據 Observation 調整行動
- 嘗試有限的局部 Fallback
- 更新步驟狀態
- 回傳結構化結果

## Verifier 負責

- 判斷步驟是否真的完成
- 檢查輸出格式
- 驗證來源
- 判斷是否需要局部修復
- 判斷是否需要整體 Replan

## State Machine 負責

- 限制允許的狀態轉移
- 保存進度
- 限制 Retry
- 控制人工審批
- 定義 Terminal State

## Policy Layer 負責

- 限制工具
- 限制資料存取
- 限制成本
- 攔截高風險操作
- 要求 Human Approval

可以把這套組合理解成：

> Planner 管全局，ReAct 處理現場，Verifier 負責驗收，State Machine 管交通，Policy Layer 守邊界。

![Figure 3-5 — Production Planning Architecture](/images/the-atlas-of-agent-design-patterns-part-3/production-planning-architecture.png)

> **Figure 3-5｜Production Planning Architecture**  
> Planner、Plan Store、State Machine、ReAct Executor 和 Verifier 形成主要工作流；Budget Guard、Tool Policy、State Persistence、Audit Trace 與 Human Approval 則構成外層治理。

---

## 不同任務應該使用哪種決策方式？

| 任務特性 | 建議方式 |
|---|---|
| 步驟完全固定 | Fixed Workflow |
| 只需選擇一個工具 | Router / Tool Selection |
| 下一步依賴工具結果 | ReAct |
| 任務長且容易漏項 | Plan-and-Execute |
| 計畫可能因外部結果改變 | Adaptive Planning |
| 任務可拆成多層子目標 | Hierarchical Planning |
| 已有成熟企業 SOP | HTN |
| 目標可客觀驗證、路線未知 | Goal-driven Agent |
| 操作涉及權限、成本或風險 | Policy-based Decision |

---

## 決策與規劃的常見反模式

## 反模式一：所有任務都先規劃

簡單翻譯也先列五步計畫，只會增加延遲。

## 反模式二：把計畫當成事實

Planner 產生的步驟仍然可能錯誤。

計畫需要被驗證，不是被膜拜。

## 反模式三：ReAct 沒有停止條件

Agent 不斷搜尋、開頁面和改 Query，卻沒有資料充分標準。

## 反模式四：工具結果全部塞進 Context

沒有結構化 State，導致 Agent 忘記哪些工作已完成。

## 反模式五：Replan 沒有版本

新計畫覆蓋舊計畫，無法知道改了什麼、為什麼改。

## 反模式六：子任務沒有完成條件

Executor 回傳一段文字，系統就把步驟標記完成。

## 反模式七：計畫粒度不一致

某些步驟需要一分鐘，另一些需要數小時，難以調度和驗收。

## 反模式八：安全規則只寫在 Prompt

Agent 理論上「不應該」執行高風險操作，但工具層沒有真正限制。

## 反模式九：ReAct 和 Planner 重複工作

Planner 已安排搜尋三個來源，Executor 又重新設計整套研究策略。

## 反模式十：一直重新規劃，不肯承認失敗

資料不存在、權限不足或工具不支援時，正確結果可能是：

- Pending
- Unavailable
- Unsupported
- Requires Human Action

不是所有任務都能靠多想幾輪解決。

---

## Production Planning 應該記錄什麼？

| 資料 | 用途 |
|---|---|
| Original Goal | 防止任務漂移 |
| Current Plan Version | 追蹤最新計畫 |
| Plan Diff | 記錄每次修改 |
| Step Status | 追蹤進度 |
| Step Dependencies | 控制執行順序 |
| Tool Calls | 追蹤實際行動 |
| Observations | 保存工具結果 |
| Completion Criteria | 驗收步驟 |
| Retry Count | 限制局部重試 |
| Replan Count | 限制重新規劃 |
| Remaining Budget | 控制成本 |
| Failure Reason | 選擇 Repair、Fallback 或 Stop |
| Verifier Result | 判斷是否通過 |
| Terminal State | Completed、Failed、Partial、Pending |

沒有這些記錄，長任務只是一段很長的對話，不是一個可管理的系統。

---

## 一個完整範例：研究型 Agent 如何決定下一步

任務：

> 比較三種 Agent Framework，並推薦適合 Production RAG 的架構。

## 第一步：Router

判斷這不是簡單問答，需要 Research Workflow。

## 第二步：Planner

建立計畫：

```text
1. Define evaluation criteria
2. Identify candidate frameworks
3. Collect official architecture information
4. Compare persistence and state management
5. Compare observability and testing
6. Compare multi-agent capabilities
7. Evaluate risks
8. Produce recommendation
```

## 第三步：Executor

執行「Collect official architecture information」時使用 ReAct：

```text
Search official documentation
  ↓
Open architecture page
  ↓
Information incomplete
  ↓
Search persistence documentation
  ↓
Open official repository
  ↓
Extract structured findings
```

## 第四步：Verifier

檢查：

- 是否全部來自官方來源
- 是否涵蓋所有評估欄位
- 是否標記缺失資料
- 是否混用不同版本資訊

## 第五步：Adaptive Replan

發現其中一個 Framework 沒有公開某項資訊。

更新剩餘計畫：

```text
Replace unavailable field with:
- Publicly documented capabilities
- Explicitly marked unknowns
- No inferred claims
```

## 第六步：Synthesis

整合所有結果，產生推薦。

這套系統不是單純 ReAct，也不是單純 Plan-and-Execute。

它同時使用：

- Router
- Structured Planning
- ReAct Execution
- Verification
- Adaptive Replanning
- State Management
- Budget Guard
- Tool Policy

這才更接近 Production Agent。

---

## 本篇結論

Agent 決定下一步的方式，可以從高度固定一路走向高度自主。

- **Fixed Workflow**：下一步由程式預先決定
- **ReAct**：根據工具結果逐步選擇行動
- **Plan-and-Execute**：先建立全局計畫，再逐步執行
- **Adaptive Planning**：執行中根據新資訊修改剩餘計畫
- **Hierarchical Planning**：將大型目標拆成多層子目標
- **HTN**：依照預先核准的方法拆解任務
- **Goal-driven Agent**：根據目標與進度持續選擇行動
- **Policy-based Decision**：在權限、風險與成本邊界內決策

沒有一種方法永遠最好。

簡單任務不需要 Planner；固定流程不需要自由 ReAct；高風險 SOP 不應交給模型臨時發明。

Production 系統更常採用：

```text
Router
  ↓
Planner
  ↓
Structured Plan
  ↓
State Machine
  ↓
ReAct Executor
  ↓
Verifier
  ↓
Continue / Repair / Replan
```

真正重要的不是讓 Agent 擁有最多自由，而是：

> 在最需要彈性的地方允許自主，在需要可靠性的地方建立約束。

下一篇，我們會進入第三個維度：

> 當一個問題存在多種可能解法時，Agent 應該怎麼搜尋？

Part 4 將完整比較 Single-path Reasoning、Self-consistency、Generate-and-Rank、Beam Search、Tree of Thoughts、Graph of Thoughts、MCTS 與 LATS。
