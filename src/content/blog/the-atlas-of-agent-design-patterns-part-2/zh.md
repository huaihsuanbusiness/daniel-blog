---
title: "Agent 設計模式圖鑑 Part 2｜Agent 執行路徑全解：Direct、Pipeline、Router、State Machine 與 DAG"
description: "從 Direct、Pipeline、Router、State Machine、DAG，到事件驅動、人工審批與 Behavior Tree，完整拆解 Production Agent 的執行骨架、組合方式與失敗邊界。"
date: 2026-06-19T01:00:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 2
---

Part 1 提出了六個分析 Agent 架構的實務維度。這一篇深入第一個問題：

> 一項任務要如何從起點走到明確的終點？

表面上，這只是流程圖問題；到了正式環境，它同時也是可靠性問題。

執行路徑會決定：

- 哪些節點可以執行
- 哪些節點一定要執行
- 哪些路徑可以跳過
- 狀態應保存在哪裡
- 失敗後應往哪裡走
- 哪些工作可以同時進行
- 哪些節點必須等待人工審批
- 什麼情況算完成、失敗、取消或仍在等待

有些系統不論收到什麼問題，都啟動整套昂貴流程；有些系統把每個分支都交給模型，導致同一種請求每次走法不同；另一些系統有漂亮的流程圖，真正遇到工具逾時或審批沒有回覆時，卻不知道該如何恢復。

Direct、Pipeline、Router、State Machine 與 DAG，分別解決這張地圖中的不同問題。它們不是從初級到高級的階梯，也不是只能五選一。

## 執行骨架不等於節點內的智慧

執行骨架描述工作可以如何在整個系統中移動。

節點內的決策邏輯，則描述某一個節點如何選擇行動。

例如，外層可由 State Machine 控制，而研究節點內使用有界的 ReAct：

```text
START
 -> PLAN
 -> RESEARCH
 -> 有界 ReAct 選擇查詢與工具
 -> VERIFY
 -> COMPLETE
```

固定 Pipeline 裡也可以放入規劃節點：

```text
Normalize
 -> Plan
 -> Plan-and-Execute 建立子任務
 -> Retrieve
 -> Generate
 -> Validate
```

因此，只說「這是一個 ReAct Agent」，仍無法知道它的外層究竟是 Direct、Pipeline、State Machine，還是大型 Graph 裡的一個局部節點。

![Figure 2-1 — Execution Skeletons vs Node-Level Decisions](/images/the-atlas-of-agent-design-patterns-part-2/execution-skeletons-vs-node-decisions.png)

> **Figure 2-1｜Execution Skeletons vs Node-Level Decisions**  
> 外層骨架與節點內決策邏輯是分開的兩個層次，可以自由組合；Pipeline、Router、State Machine 是外層結構，Fixed Rules、Bounded ReAct 等是節點內決策。

## 五種核心執行骨架

本文標題中的五種結構，分別回答不同問題：

| 結構 | 主要問題 |
|---|---|
| Direct | 一個有明確邊界的操作能否直接完成任務？ |
| Pipeline | 必要步驟是否可在執行前確定？ |
| Router | 不同請求是否需要走不同路徑？ |
| State Machine | 流程是否必須經過明確狀態與條件轉移？ |
| DAG | 任務是否存在可分支、相依並在後方合併的有向依賴？ |

另外有兩種常被混進同一張比較表的概念：

- **Event-driven** 決定什麼事件觸發工作，以及事件如何在服務間傳遞。
- **Human-in-the-loop** 在流程中插入暫停、檢視、修改或審批控制點。

它們可以包住或出現在上述任何一種核心骨架之中。

![Figure 2-2 — Five Execution Path Patterns at a Glance](/images/the-atlas-of-agent-design-patterns-part-2/five-patterns-comparison.png)

> **Figure 2-2｜Five Execution Path Patterns at a Glance**  
> Direct、Pipeline、Router、State Machine 與 DAG 五種結構回答不同問題；常見錯誤是把整套系統硬塞進單一名詞。

## Direct：一次有界操作能完成，就不要硬造 Agent

Direct 是最小的有效執行結構：

```text
Input -> Model or Function -> Output
```

它的關鍵不是「絕對不能用工具」。Direct 仍可包含確定性的前處理、輸入驗證、輸出整理，甚至一個事先確定的工具呼叫。它沒有的是：每取得一次 observation 後，再動態決定下一步的多步迴圈。

### 適合情境

- 翻譯
- 改寫
- 摘要
- 固定欄位抽取
- 分類
- 格式轉換
- 根據已提供資訊回答
- 交給一個確定函式完成的計算

### Direct 的價值

它減少移動零件。延遲、成本與錯誤來源都比較容易理解。由於輸入與輸出契約較窄，也更容易建立穩定測試。

Direct 仍可以有：

- 輸入驗證
- 輸出 Schema
- 內容或政策檢查
- Timeout
- Token 上限
- 備援模型
- 確定性後處理

Direct 不是什麼都不管，而是不在沒有編排問題的地方製造編排問題。

### 常見失敗

一個簡單轉換任務，被擴建成 Planner -> Writer -> Critic -> Refiner，只因團隊想讓產品看起來更「Agentic」。成本可能變成四倍，品質卻沒有穩定提升。

第一個架構問題應該是：

> 在資訊來源與工具都已確定的前提下，一次有界操作能不能完成？

答案是可以時，Direct 通常是最強的基準線。

## Pipeline：以預先確定的順序完成可預測工作

Pipeline 把工作拆成事先知道的階段：

```text
Rewrite -> Retrieve -> Rerank -> Generate -> Verify
```

它的核心特徵是：主要順序由應用程式預先定義。各階段可以使用模型、規則、資料庫或工具，但系統不會在每次執行時自由重畫整條路。

### 適合情境

- RAG
- 文件解析與索引
- ETL
- 固定審查與格式化流程
- 影音處理
- 分類後執行固定寫入
- 契約穩定的批次處理

### Pipeline 為什麼適合正式環境

每個階段都可以有明確契約：

| 階段 | 契約範例 |
|---|---|
| Rewrite | 保留原始意圖，只輸出一個正規化查詢 |
| Retrieve | 回傳具有來源與排名的候選資料 |
| Rerank | 回傳穩定的前幾名與分數 |
| Generate | 只能使用提供的證據 |
| Verify | 回傳通過、失敗或需要人工檢查，並附理由 |

這讓延遲、成本、錯誤率與品質，都能在真正出問題的節點被量測。

### Pipeline 不一定完全沒有分支

正式系統的 Pipeline 可能有可選階段、條件保護或有界重試。當條件移動、等待、暫停恢復與多種終止結果成為核心時，更適合稱為 Stateful Workflow 或 State Machine。

真正有用的界線，不是流程圖上是否出現一個分叉，而是控制邏輯究竟仍是「預先確定的處理序列」，還是已經由明確狀態與轉移來組織。

### 常見失敗

- 每個請求都跑完所有階段
- 多個節點偷偷重寫同一份意圖
- 每一站都使用最大模型
- 節點契約只存在工程師腦中
- 只保存最後答案，不保存中間結果
- 節點失敗時沒有 typed error 或 fallback

Pipeline 值得信任的原因，不是畫了很多箭頭，而是每一站都能被觀測、替換與驗收。

## Router：先選對路，再決定要花多少成本

Router 選擇一條或多條下游路徑：

```text
Request
 -> Router
 -> Direct response
 -> Document retrieval
 -> SQL or analytics
 -> Calculator
 -> Bounded agent workflow
 -> Clarification or unsupported
```

Router 不一定直接解答問題。它負責選擇正確的能力、資料真相來源、風險等級與成本範圍。

### 路由訊號

Router 可以參考：

- 任務類型
- 正確的資料來源
- 使用者權限
- 資料敏感度
- 延遲要求
- 成本預算
- 風險等級
- 必要工具
- 語言或 Tenant
- 是否包含多個意圖

### Router 的實作方式

#### 確定性 Router

以規則處理界線清楚的案例：

```text
允許的算式 -> Calculator
已授權的帳戶查詢 -> SQL
詢問已索引文件 -> RAG
```

成本低、穩定，也容易解釋。

#### 模型分類 Router

由分類模型或 LLM 判斷路徑，適合自然語言變化太多，無法只靠少量規則處理的情況。但它會引入不確定性，也可能隨模型版本改變行為。

#### Semantic Router

比較 Query embedding 與路由說明或範例的相似度。語義邊界較自然時很好用，但分數接近時必須允許 abstain。

#### Hybrid Router

先執行硬性的安全、權限與資料規則；剩下模糊區域再交給模型；最後再套上信心門檻與 fallback。

這通常是比較實際的組合。

### Production Router 一定要有逃生門

Router 不應被迫把所有輸入塞進某一條支援路徑。它應明確支援：

- `unknown`
- `ambiguous`
- `unsupported`
- `need_clarification`
- `human_review`

此外還需要可由維運人員控制的 override。它必須有權限限制、留下 log，並在 trace 中可見。

### 多意圖不是單標籤分類

例如：

> 查出上個月訂單下降幅度，分析可能原因，再寫成 Email。

它同時包含資料查詢、分析與寫作。Router 更可能先把它送進 decomposition workflow，而不是假裝一個 route label 可以描述整項任務。

### 應保存的資訊

- Router 輸入
- 選擇的路徑
- Routing policy 版本
- 信心或判定依據
- 被拒絕的候選路徑
- Fallback
- 權限與風險檢查
- 人工 override

![Figure 2-2A — Router Deep Dive: Criteria, Types, Risks, and Production Notes](/images/the-atlas-of-agent-design-patterns-part-2/router-deep-dive.png)

> **Figure 2-2A｜Router Deep Dive: Criteria, Types, Risks, and Production Notes**  
> Router 的判定依據、實作類型（確定性、模型、Semantic、Hybrid）、常見風險，以及 Production 必須保留的 log 與 override 機制。

## State Machine：把進度與合法轉移寫清楚

State Machine 由有限狀態集合，以及狀態之間允許的轉移構成：

```text
START
 -> RETRIEVE
 -> VERIFY_EVIDENCE
 -> 證據足夠 -> DRAFT
 -> 證據不足且仍可重試 -> REWRITE_QUERY
 -> 已達重試上限 -> FAILED
 -> WAITING_FOR_APPROVAL
 -> 通過 -> EXECUTE
 -> 拒絕 -> CANCELLED
 -> COMPLETED
```

它要回答：

- 系統現在在哪裡
- 哪些轉移合法
- 哪個條件選擇哪一條路
- 哪些資料必須持久化
- 哪些狀態會終止本次執行

AWS Step Functions 等 Workflow Engine 會把 Task State 與 Flow State 明確分開，並提供 Choice、Wait、Map、Parallel 等控制結構；錯誤處理也會區分 Retry 與 Catch／Fallback。重點不在特定產品，而在架構原則：失敗與等待必須成為模型的一部分，不能只寫在快樂路徑旁邊的備註裡。

### 核心元素

#### State

一個具名的執行階段，例如：

- `PLANNING`
- `RETRIEVING`
- `VERIFYING`
- `WAITING_FOR_APPROVAL`
- `EXECUTING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

#### Transition

State 之間允許的移動。

#### Guard 或 Condition

選擇 Transition 的條件：

- 證據是否足夠
- Retry count 是否仍低於上限
- 使用者是否批准
- 預算是否仍足夠
- Policy check 是否通過
- Tool error 是否可重試

#### Terminal State

結束本次 Run 的狀態。正式系統通常不只需要 `success` 與 `failure`，還可能需要 `cancelled`、`partial`、`expired` 或 `needs_manual_resolution`。

### State Machine 的價值

- 有界重試清楚可見
- 暫停與恢復更自然
- 進度可持久化
- 審批狀態可被稽核
- 非法轉移可以被拒絕
- 可從 Checkpoint 恢復
- 完成條件更清楚

### State Machine 不會自動保證什麼

畫出 State 不代表系統自動擁有 durable execution、exactly-once side effect 或故障恢復。這些能力仍取決於 Runtime、Persistence Layer、Task 設計與 Idempotency。

部分引擎也支援平行 State。這不代表 State Machine 與 DAG 完全相同，也不代表相依關係複雜的平行工作不需要在某個 State 裡以 DAG 表達。

### 常見失敗

- 每個實作細節都變成一個 State
- 多個 Guard 同時成立卻沒有優先順序
- 沒有區分可重試與永久性錯誤
- 沒有 Terminal State
- State 只存在模型 Context
- 審批恢復時重做了先前的 Side Effect
- 人工拒絕與技術錯誤走同一條路

![Figure 2-3 — State Machine: Control, Recovery, Persistence, and Human Approval](/images/the-atlas-of-agent-design-patterns-part-2/state-machine.png)

> **Figure 2-3｜State Machine: Control, Recovery, Persistence, and Human Approval**  
> State、Transition、Guard、Terminal State 四個核心元素；持久化、暫停恢復、有界 Retry、多種終止狀態與稽核都需要在設計時明確寫下來。

## DAG：用無環有向關係表達依賴

DAG 是 Directed Acyclic Graph，也就是由任務與有方向的依賴關係構成，而且圖中沒有環：

```text
 -> Research A -
Problem -> Split -> Research B --> Synthesis -> Verify
 -> Research C -
```

它的核心是「依賴」，不是「平行」。當 Branch 互不依賴，而且執行引擎與資源限制允許時，才可以同時執行；有前置條件的節點仍必須等待。

Apache Airflow 將 DAG 描述為：以 dependencies 與 relationships 組織的 Tasks，用來決定它們應如何執行。Graph 定義執行順序與依賴，Task 內部做什麼則是另一層問題。

### 適合情境

- 多來源研究
- 獨立市場或競品分析
- 批次文件處理
- 有共用前置工作的測試
- MapReduce 類工作
- 多路工具呼叫後合併
- 資料與模型評估流程

### DAG 不等於 Multi-Agent

同一個 Process 可以執行所有 DAG Node，同一個 Agent 也可以啟動多個工具。反過來，多個 Agent 也可能在 State Machine 裡依序交接。

DAG 描述 Task Dependency；Multi-Agent 描述責任分工與溝通。

### Acyclic 不代表不能 Retry

執行引擎可以重新嘗試同一個 Node，而不在 Graph Topology 中增加環。

DAG 不擅長在單次 Run 裡直接表達的是語意循環，例如：

```text
Verify failed -> 回到 Research -> 重新建立 Branch -> 再次 Verify
```

這需要外層 State Machine、新的 DAG Run，或其他允許循環的控制結構。

### 平行一定要有上限

大量 Fan-out 可能讓流程更慢、更不可靠，因為所有 Branch 同時爭搶：

- API Rate Limit
- Database Connection Pool
- Model Concurrency Quota
- Browser Capacity
- Memory
- Token 或成本預算

因此需要 bounded concurrency、backpressure、資源層級上限與取消規則。能同時執行，不等於應該一次全部啟動。

### Join 邏輯本身就是設計

Synthesis 節點必須回答：

- 是否一定要等所有 Branch
- Partial Result 是否可接受
- Timeout 如何處理
- 重複內容如何移除
- 相互衝突的證據如何解決
- Provenance 如何保留
- 一個 Branch 失敗是否取消整體

![Figure 2-4 — DAG: Decompose, Run in Parallel, and Aggregate](/images/the-atlas-of-agent-design-patterns-part-2/dag.png)

> **Figure 2-4｜DAG: Decompose, Run in Parallel, and Aggregate**  
> 任務依賴驅動的無環有向圖；平行執行受資源限制，Join 邏輯是設計本身的一部分。

## Pipeline、State Machine 與 DAG 是不同抽象層

| 問題 | Pipeline | State Machine | DAG |
|---|---|---|---|
| 主要抽象 | 處理階段 | 狀態與合法轉移 | 任務與有向依賴 |
| 典型移動 | 預先確定的序列 | 條件式，可能有循環 | 依賴順序，單次 Run 內無環 |
| 分支 | 可以，但通常不是核心 | 核心能力 | 很自然 |
| Loop 與 Replan | 通常由外層或有界機制處理 | 很自然 | 需要外層控制或建立新 Run |
| 平行工作 | 可以 | 視引擎而定 | 依賴允許時很自然 |
| 暫停與審批 | 沒有持久 State 時較笨重 | 保存 State 後很自然 | 通常交給執行平台或外層 Workflow |
| 最適合 | 穩定的轉換鏈 | 長時間、可恢復、條件複雜的流程 | Fan-out、依賴複雜、可平行的工作 |
| 常見風險 | 僵硬或浪費 | State Explosion | Concurrency 與 Join 複雜度 |

這些結構可以乾淨地組合：

```text
Event
 -> Router
 -> State Machine
 -> RESEARCH State 啟動 DAG
 -> VERIFY State 檢查合併結果
 -> APPROVAL State 等待人員
 -> Output Pipeline 格式化並發布
```

最好的架構描述會說清楚每一層，而不是強迫整套系統只能貼上一個名詞。

## Event-driven：定義什麼會啟動工作

Event-driven 主要處理 Trigger 與 Message Flow，不是一種固定 Workflow Topology。

Event 可能來自：

- Webhook
- 新 Email
- 檔案上傳
- 資料庫異動
- 排程時間
- 價格門檻
- GitHub Issue
- 外部服務 Callback

接到 Event 後，可以啟動 Direct Handler、Pipeline、State Machine 或 DAG。

CloudEvents 規格的存在，是因為 Event Producer 與 Consumer 需要共同的事件描述方式。正式系統至少需要穩定的事件 identity、source、type，以及足以安全追蹤或拒絕事件的 Context。

### 真實的 Delivery 行為

分散式事件系統常見 at-least-once delivery，因此 Consumer 可能收到同一 Event 不只一次。涉及 Side Effect 的 Handler 必須具備 Idempotency，否則 Retry 可能重複寄信、重複扣款或重複建立資料。

AWS 對 Idempotent API 的說明抓住了核心：即使 Recovery 過程重複請求，預期效果仍應只發生一次。

還要處理：

- Out-of-order Event
- Late Event
- Poison Message
- Dead-letter Handling
- Schema Evolution
- Correlation 與 Trace ID
- Backpressure
- Replay

Event-driven 不是丟出去就不管，而是生命週期被分散到 Message 與 Consumer 之間，反而更需要 Observability。

## Human-in-the-loop：插入受治理的控制點

Human-in-the-loop 不是獨立推理方式，也不是一種完整拓撲。它是在流程中暫停，等待人員檢視、修改、補充或批准。

```text
Prepare action
 -> Persist state
 -> Human review
 -> approve -> resume
 -> edit -> resume with changes
 -> reject -> cancel or replan
 -> timeout -> expire or escalate
```

好的審批畫面應讓審查者看見：

- 準備執行的操作
- 使用的證據與資料來源
- 預期影響
- 風險
- 是否可回復
- 哪些欄位可以修改
- 通過或拒絕後會發生什麼

Durable Workflow 必須保存足夠 State，才能在恢復時避免重做前面的 Side Effect。LangGraph 的 interrupt 機制是其中一種實作範例：暫停 Graph、保存 State，之後再 Resume。但這個底層要求並不屬於任何單一 Framework。

適合使用人工控制的情境：

- 不可逆或高影響操作
- 權限提升
- 公開發布
- 資金轉移
- 破壞性資料操作
- 正式環境異動
- 證據互相衝突
- Policy Exception
- 最終決策必須由特定人員承擔

不要做一個只有 Approve 與 Reject，卻不顯示實際操作內容的裝飾按鈕。

## Behavior Tree：另一種層級化控制結構

Behavior Tree 以可重用的控制節點與行為節點，建立層級化切換邏輯。它廣泛用於遊戲與機器人，也可用來描述具反應性的 Agent 行為。

常見節點包括：

- **Sequence：** 依序執行，遇到失敗就停止
- **Fallback／Selector：** 依序嘗試，遇到成功就停止
- **Condition：** 檢查 Branch 是否可用
- **Action：** 執行工作
- **Decorator：** 修改 Child 的執行策略

例如：

```text
Fallback
 -> Cached Result 有效時直接回傳
 -> Sequence
 -> Retrieve
 -> Verify
 -> Generate
 -> Ask a Human
```

Behavior Tree 適合需要模組化、層級化與反應式行為的系統。對一般文字型企業 Workflow，State Machine 往往更容易讓工程、產品與維運一起閱讀。真正的選擇依據應是行為模型，而不是哪張圖看起來更高級。

## 產生程式是執行技術，不是新的路徑拓撲

Agent 可以產生 SQL、Python、Shell Command、API Call、DSL 或 Workflow Definition，再驗證並執行：

```text
Request -> Generate program -> Validate -> Execute -> Inspect result
```

當產物能被真正的 Parser、Policy Checker、Sandbox 或測試環境驗證時，這種方式可能非常可靠。

更精確的名稱是 **Program-generating Agent** 或 **Code-as-action Pattern**，而不是把「Programmatic Agent」當成與 Pipeline、DAG 並列的第六種拓撲。產生出來的程式，最後仍會透過本文描述的某一種執行骨架運作。

必要控制包括：

- Sandbox
- Least Privilege
- Command 或 API Allowlist
- 適用時使用唯讀資料庫政策
- Secret Isolation
- 時間與資源限制
- Output Size Limit
- Test 或 Verification

## 如何選擇執行骨架

下面的問題可以疊加使用，不代表每套系統只能有一個標籤。

### 1. 工作是否由外部事件觸發？

加入 Event-driven Trigger 與 Event Envelope，再選擇真正處理事件的 Workflow。

### 2. 是否包含高影響或不可逆操作？

在對應節點加入人工審批或 Policy Gate。這是控制層，不是整套流程。

### 3. 一次有界操作能否完成？

先以 Direct 為基準。

### 4. 不同請求是否需要不同能力或不同真相來源？

在下游流程前加入 Router。

### 5. 必要階段是否明確而穩定？

以 Pipeline 為起點。

### 6. 是否需要持久 State、條件轉移、暫停恢復、有界 Recovery 或多種 Terminal Outcome？

使用 State Machine 或 Durable Stateful Workflow。

### 7. 任務能否表示成有向依賴，並包含獨立 Branch 與 Join？

在對應 Pipeline 或 State 內使用 DAG。

選擇主要骨架時，可使用以下實務流程：

```text
一次有界操作能完成嗎？
 可以 -> Direct
 不行 -> 不同 Request Type 是否需要不同路徑？
 是 -> Router，再選擇下游骨架
 否 -> 是否需要持久 State、Loop、Wait 或 Approval？
 是 -> State Machine
 否 -> 是否存在適合 Fan-out 與 Join 的依賴？
 是 -> DAG
 否 -> Pipeline
```

這條流程只用來選擇起始骨架。Event Trigger、人工控制、Retry、Verification 與 Tool Policy 仍會跨越整套架構。

![Figure 2-5 — How a Router Sends Different Questions to Different Execution Paths](/images/the-atlas-of-agent-design-patterns-part-2/router-overview.png)

> **Figure 2-5｜How a Router Sends Different Questions to Different Execution Paths**  
> 依請求特性選擇對應的執行路徑：Direct、RAG、SQL、Calculator、Bounded Agent 或 Clarify/Unsupported。

## 常見執行路徑反模式

### 每個請求都跑最昂貴流程

簡單請求也支付 Planning、Retrieval、Critic 與 Multi-Agent 的延遲與錯誤表面。

### 所有分支都由 LLM 控制

沒有 Allowlist、Step Limit、State Constraint、Budget、Stop Condition 或確定性 Safety Gate。

### Router 被迫每次都猜一條路

沒有 Abstain、Clarification、Unsupported 或 Human Review。

### Retry 直接重做相同 Side Effect

逾時的付款、寄信、部署或資料寫入，沒有 Idempotency Key 或 Outcome Check 就再次執行。

### State Machine 沒有 Terminal State

Workflow 在 Retry、Verify 與 Replan 之間打轉，因為從未定義完成與資源耗盡。

### DAG 無上限 Fan-out

大量 Worker 同時塞滿 API、Model Quota、Browser Slot 與 Database。

### Human Approval 沒有 Review Context

審查者只能按 Approve 或 Reject，看不到證據、影響與真正操作。

### Program-generating Agent 繞過執行邊界

模型產生的 Code 未經 Parsing、Permission、Sandbox 或 Test 就直接執行。

## 每種骨架外層都需要的 Production Controls

| 控制 | 用途 |
|---|---|
| Trace 與 Correlation ID | 還原 End-to-end Run |
| Persisted State | 中斷後安全恢復 |
| Typed Error | 區分可重試、永久、Policy 與使用者錯誤 |
| Timeout 與 Cancellation | 停止被遺棄或卡住的工作 |
| 有界 Retry 與 Backoff | 恢復暫時故障而不無限循環 |
| Idempotency | 防止重複 Side Effect |
| Fallback | 在適當錯誤後更換方法或資源 |
| Budget Guard | 限制模型、工具與 Concurrency 成本 |
| Tool 與 Permission Policy | 限制可用行動與資料 |
| Terminal Outcome | 定義 Completed、Failed、Cancelled、Expired 與 Partial |
| Audit Log | 記錄誰或什麼做出每次決定 |
| Human Control | 保護高影響操作 |
| Observability | 量測延遲、錯誤、成本、路由品質與 Retry |

執行路徑的目的不是讓流程圖更漂亮，而是讓系統能回答：

- 這個 Run 現在在哪裡？
- 為什麼走這條路？
- 哪些事情已經發生？
- 哪個操作失敗？
- Retry 是否安全？
- 下一個決定由誰負責？
- 哪一種結果會結束本次執行？

## 結論

五種核心骨架分別解決不同問題：

- **Direct** 在一次有界操作足夠時，避免不必要的編排。
- **Pipeline** 把已知的處理順序變成可量測、可替換的階段。
- **Router** 把不同請求送到正確能力與資料真相來源。
- **State Machine** 管理持久進度、合法轉移、等待、恢復與 Terminal Outcome。
- **DAG** 在單次 Run 裡，以無環有向依賴表達 Fan-out 與 Join。

Event-driven Trigger 與 Human Approval 橫跨這些骨架；Behavior Tree 提供另一種層級控制模型；程式生成則是一種仍需底層 Workflow 承載的執行技術。

成熟系統很少只有一個標籤。更有用的描述是：

```text
Cloud Event
 -> Permission-aware Router
 -> Durable State Machine
 -> 具 Bounded Concurrency 的 Research DAG
 -> Evidence Verification
 -> 發布前 Human Approval
 -> Deterministic Output Pipeline
```

執行方式不是越自由越好。真正重要的是：哪些部分固定、哪些部分動態、如何恢復，以及人應該在哪裡接手。

Part 3 將進入下一個維度：

> Agent 如何決定下一步？

下一篇會比較 ReAct、Plan-and-Execute、Adaptive Planning、Hierarchical Planning，以及如何把局部彈性放進受控制的外層 Workflow。

## 參考資料

- [AWS Step Functions, *Learn about state machines in Step Functions*](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-statemachines.html)
- [AWS Step Functions, *Handling errors in Step Functions workflows*](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [Apache Airflow, *DAGs*](https://airflow.apache.org/docs/apache-airflow/3.0.3/core-concepts/dags.html)
- [CloudEvents, *A specification for describing event data in a common way*](https://cloudevents.io/)
- [AWS Builders' Library, *Making retries safe with idempotent APIs*](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [Colledanchise and Ögren, *Behavior Trees in Robotics and AI: An Introduction*](https://arxiv.org/abs/1709.00084)
- [LangGraph Documentation, *Interrupts and human-in-the-loop workflows*](https://langchain-ai.github.io/langgraph/concepts/breakpoints/)

