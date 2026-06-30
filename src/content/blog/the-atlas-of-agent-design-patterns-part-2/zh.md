---
title: "Agent 設計模式圖鑑 Part 2｜Agent 執行路徑全解：Direct、Pipeline、Router、State Machine 與 DAG"
description: "LLM Agent 執行路徑的第一個維度：Direct、Pipeline、Router、State Machine 與 DAG 五種執行骨架的設計選擇、限制、組合方式與 Production 反模式。"
date: 2026-06-30T15:25:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 2
---


上一篇，我們把常見的 Agent 設計模式拆成六個維度：

1. 執行路徑
2. 決策與規劃
3. 推理與探索
4. 驗證與修正
5. Agent 組織
6. 狀態與記憶

這一篇要進入第一個維度：

> 任務從開始到結束，究竟怎麼走？

這看起來像一個流程圖問題，實際上卻決定了一套 Agent 系統是否能被理解、測試、恢復和控制。

有些系統無論使用者問什麼，都執行同一套 Retrieval、Reranking、Planning 和 Verification；有些系統把每一步都交給模型自由決定，導致同一個問題每次走出不同路線；還有一些系統雖然有漂亮的流程圖，真正出錯時卻不知道該回到哪個節點。

這些問題未必是模型不夠聰明。

更常見的原因是：

> 執行路徑根本沒有被設計清楚。

Direct、Pipeline、Router、State Machine 和 DAG，是五種常見的執行骨架。

它們不直接回答「模型怎麼推理」，而是決定：

- 任務會經過哪些節點
- 哪些步驟一定要執行
- 哪些路徑可以跳過
- 什麼情況下可以分支
- 哪些工作可以平行
- 失敗後應該回到哪裡
- 任務何時正式完成
- 哪些狀態必須被保存

---

## 執行路徑不是推理方式

這是第二篇最重要的概念邊界。

以下兩組名詞不在同一個分類維度：

| 執行路徑 | 節點內決策方式 |
|---|---|
| Direct | ReAct |
| Pipeline | Planning |
| Router | Tool Selection |
| State Machine | Adaptive Planning |
| DAG | Generate-and-Test |

執行路徑描述的是：

> 系統有哪些節點，以及資料如何在節點之間流動。

節點內決策描述的是：

> Agent 在某一個節點裡，如何決定下一步行動。

例如，一套系統可以使用 State Machine 控制整體流程：

```text
START
  ↓
PLAN
  ↓
RESEARCH
  ↓
VERIFY
  ↓
END
```

但在 `RESEARCH` 狀態裡，Agent 可以使用 ReAct：

```text
Observe
  ↓
Decide
  ↓
Act
  ↓
Observe Again
```

同樣地，一條固定 Pipeline 裡也可以有一個 Planning 節點；Router 選中的某條路徑，也可能啟動另一套 State Machine。

所以，看到「這是一個 ReAct Agent」時，我們仍然不知道它的整體流程究竟是 Pipeline、State Machine，還是自由 Agent Loop。

![Execution Skeletons vs Node-Level Decisions](/images/the-atlas-of-agent-design-patterns-part-2/execution-skeletons-vs-node-decisions.png)

> **Figure 2-1｜Execution Skeletons vs Node-Level Decisions**  
> 上層比較 Pipeline、Router 和 State Machine；下層比較 ReAct、Planning 和 Tool Selection & Calling，說明外層骨架與節點內智慧並不衝突。

---

## 一、Direct：有些問題根本不需要 Agent

Direct 是最簡單的執行路徑：

```text
Input
  ↓
LLM
  ↓
Output
```

模型收到輸入後，直接產生輸出。

沒有：

- 多步驟工作流
- 動態路由
- 狀態保存
- 工具循環
- 多 Agent 協調

## 適合 Direct 的任務

- 翻譯
- 改寫
- 摘要
- 格式轉換
- 簡單分類
- 固定欄位抽取
- 根據已提供內容回答問題
- 產生短文案

例如：

> 將以下內容改寫成正式商務語氣。

如果完成任務所需的資訊已經全部出現在輸入裡，通常沒有必要再啟動 Planner、Retriever 或 Multi-Agent。

## Direct 的優點

### 快

通常只需要一次主要模型呼叫。

### 便宜

沒有額外 Retrieval、工具執行或多輪驗證。

### 容易測試

輸入和輸出的關係簡單，較容易建立固定測試集。

### 容易觀察

出錯時，不需要在十幾個節點之間找問題。

## Direct 的限制

Direct 並不是「模型不能推理」，也不是「完全不能用工具」。

真正的限制是：

- 沒有自適應工具循環
- 沒有持久化的多步驟流程
- 無法自己找回缺少的外部資訊
- 不適合需要長時間狀態的任務

如果模型不知道某個外部事實，Direct 不會因為回答得更長就自動知道。

## Direct 的常見反模式

### 為了看起來像 Agent 而增加步驟

原本一次呼叫可以完成的任務，被改造成：

```text
Planner
  ↓
Writer
  ↓
Critic
  ↓
Refiner
```

成本變成數倍，品質卻沒有穩定提升。

### 對固定格式任務使用自由 Agent

如果任務只是把資料轉成固定 JSON，應優先使用：

- Schema
- Validation
- Deterministic Processing

而不是讓 Agent 自由探索。

## Production Notes

Direct 仍然可以搭配：

- Input Validation
- Output Schema
- Timeout
- Token Limit
- Content Policy
- Basic Verifier
- Fallback Model

Direct 的重點不是什麼都不管，而是不要為一扇普通的門建造整座機場。

---

## 二、Pipeline：固定順序的可控流程

Pipeline 將任務拆成固定步驟：

```text
A → B → C → D
```

以 RAG 為例：

```text
Query Rewrite
  ↓
Retrieve
  ↓
Rerank
  ↓
Generate
  ↓
Verify
```

每一個 Request 通常按照相同順序通過各個節點。

## Pipeline 的核心特徵

- 執行順序預先定義
- 每個節點責任固定
- 前一節點輸出成為下一節點輸入
- 模型通常不能自由改變主要流程
- 每個步驟可以分開測試

## 適合 Pipeline 的任務

- RAG
- 文件處理
- ETL
- 批次資料清理
- 內容生成與格式化
- 文件 Ingestion
- 固定審核流程
- 影像或音訊處理鏈

例如，文件問答系統可以固定執行：

```text
Normalize Query
  ↓
Retrieve Documents
  ↓
Rerank Chunks
  ↓
Generate Answer
  ↓
Attach Citations
```

## Pipeline 的優點

### 可預測

每次會經過哪些節點很清楚。

### 易於 Debug

答案錯了，可以分別檢查：

- Rewrite 是否改壞問題
- Retrieval 是否召回正確內容
- Reranker 是否排序錯誤
- Generator 是否誤解來源
- Citation 是否對應 Claim

### 容易做離線評估

| 節點 | 可評估指標 |
|---|---|
| Retrieval | Recall、Hit Rate |
| Reranking | NDCG、MRR |
| Generation | Faithfulness、Completeness |
| Citation | Citation Correctness |
| End-to-end | Answer Accuracy |

### 成本較容易估算

流程固定時，模型和工具呼叫次數通常有明確上限。

## Pipeline 的限制

### 所有問題可能走同一條路

即使問題很簡單，也可能經過完整 Rewrite、Retrieval、Reranking 和 Verification。

### 面對未知狀況較僵硬

某個節點失敗時，如果沒有預先定義 Fallback，整條流程可能直接中止。

### 容易形成隱性耦合

後續節點越來越依賴前面節點的特殊格式，修改其中一個節點就可能牽動整條鏈。

## Pipeline 常見反模式

### 所有節點都使用最昂貴的模型

分類、抽取、改寫和驗證不一定都需要大型模型。

### 節點責任重疊

Rewrite、Planner 和 Retriever 同時改寫 Query，最後很難追蹤原始意圖在哪裡被改變。

### 沒有節點級 Trace

只保存最後答案，不保存中間輸入輸出。錯誤發生時，系統只剩下一團黑箱煙霧。

## Production Notes

成熟 Pipeline 通常需要：

- 每個節點獨立 Schema
- Trace ID
- 節點級 Latency
- 節點級 Token 與成本
- 中間結果保存
- Timeout
- Error Type
- Fallback Policy
- 可跳過節點的條件

Pipeline 本身不一定是 Agent，但它可以包含 Agentic 節點。

---

## 三、Router：不要讓所有問題都走同一條路

Router 會先判斷問題類型，再選擇執行路徑。

```text
                    ┌→ Direct
                    ├→ RAG
User Query → Router ├→ SQL
                    ├→ Calculator
                    └→ Agent Workflow
```

Router 是 Production AI 系統裡最實用的元件之一。

它不一定直接回答問題，而是決定：

> 這個問題應該交給誰處理？

![How a Router Sends Different Questions to Different Execution Paths](/images/the-atlas-of-agent-design-patterns-part-2/router-overview.png)

> **Figure 2-2｜How a Router Sends Different Questions to Different Execution Paths**  
> User Query 經過 Router 後，被分流至 Direct、RAG、SQL、Calculator 或 Agent Workflow，並受到 Policy、Cost、Risk 和 Permission 影響。

## Router 可以依什麼分流？

### 問題類型

- 知識問答
- 計算
- 資料庫查詢
- 寫作
- 搜尋
- 程式任務

### 資料來源

- 文件庫
- SQL Database
- Web
- CRM
- API
- 使用者上傳檔案

### 使用者權限

- 一般使用者
- 管理員
- 財務人員
- 內部員工
- 外部客戶

### 風險等級

- 低風險，自動回答
- 中風險，增加驗證
- 高風險，要求人工批准

### 成本與延遲

- Fast Mode
- Safe Mode
- Deep Research
- Agentic Mode

## Router 的類型

### Rule-based Router

使用固定規則：

```text
包含明確計算 → Calculator
詢問訂單資料 → SQL
詢問文件內容 → RAG
```

優點是便宜、穩定、可解釋。

缺點是規則多了以後，會像纏在抽屜後面的充電線。

### Classifier Router

使用分類模型或 LLM 判斷 Intent。

適合自然語言變化較大的任務。

### Hybrid Router

先用規則處理明確情況，再用模型判斷模糊案例。

這通常比完全依賴模型更穩。

### Semantic Router

根據 Query Embedding 與路由描述的語義相似度選擇路徑。

它適合路由邊界偏語義化的情況，但仍然需要處理：

- 相似度接近
- 找不到明確路徑
- 多意圖問題
- 權限限制

![Router Deep Dive: Criteria, Types, Risks, and Production Notes](/images/the-atlas-of-agent-design-patterns-part-2/router-deep-dive.png)

> **Figure 2-2A｜Router Deep Dive: Criteria, Types, Risks, and Production Notes**  
> 這張額外深度圖整理 Router 的判斷依據、四種實作方法、主要風險、Unknown 路徑和 Production 監控欄位。

## Router 的優點

- 簡單問題走快速路徑
- 複雜問題才啟動昂貴流程
- 不同資料和權限可以隔離
- 各路徑可以使用不同模型
- 可以建立成本與延遲分級
- 降低不必要的 Agent 行動

## Router 的主要風險

### 路由錯誤

一旦送錯路徑，後面的系統可能再強也救不回來。

例如：

- 應該查 SQL，卻送進 RAG
- 應該直接回答，卻啟動 Deep Research
- 應該人工審核，卻自動執行

### 缺少 Unknown 路徑

Router 不應該被迫在所有路徑中選一個。

成熟 Router 應允許：

- Unknown
- Ambiguous
- Unsupported
- Need Clarification
- Human Review

### 多意圖問題

例如：

> 查上個月訂單數量，分析下降原因，再寫成 Email。

這同時包含：

- SQL
- 分析
- 寫作

單一 Route Label 可能不夠，需要先 Decompose。

## Production Notes

Router 至少應記錄：

- Router Input
- Chosen Route
- Confidence
- Alternative Candidates
- Routing Reason
- Fallback Route
- Latency
- Cost
- Final Outcome

---

## 四、State Machine：把 Agent 限制在明確狀態裡

State Machine 將系統拆成一組狀態，以及狀態之間允許的轉移。

```text
START
  ↓
RETRIEVE
  ↓
Enough Data?
  ├─ Yes → ANSWER → END
  └─ No → REWRITE QUERY → RETRIEVE
```

與 Pipeline 不同，State Machine 可以：

- 根據條件跳轉
- 回到先前狀態
- 執行有限重試
- 進入 Pending
- 等待外部事件
- 停在人工審批
- 從中斷位置恢復

![State Machine: Control, Recovery, Persistence, and Human Approval](/images/the-atlas-of-agent-design-patterns-part-2/state-machine.png)

> **Figure 2-3｜State Machine: Control, Recovery, Persistence, and Human Approval**  
> 研究型 Agent 由 PLAN、RESEARCH、VERIFY、WRITE 等狀態構成，並加入 Retry Limit、FAILED、WAITING FOR APPROVAL 和 END。

## State Machine 的基本組成

### State

系統目前位於哪個階段。

例如：

- START
- PLANNING
- RESEARCHING
- VERIFYING
- WAITING_FOR_APPROVAL
- COMPLETED
- FAILED

### Transition

系統如何從一個狀態移動到另一個狀態。

例如：

```text
VERIFYING → COMPLETED
VERIFYING → RETRYING
VERIFYING → HUMAN_REVIEW
```

### Condition

什麼條件觸發轉移。

例如：

- Citation Check Passed
- Retry Count < 2
- User Approved
- Data Is Complete
- Tool Call Failed
- Budget Exceeded

### Terminal State

任務在哪些狀態正式結束。

例如：

- COMPLETED
- FAILED
- CANCELLED
- PARTIAL
- PENDING

沒有明確 Terminal State，Agent 可能永遠覺得自己還能再試一次。

## 適合 State Machine 的情境

- Production Agent
- Browser Agent
- Coding Agent
- 審批流程
- 文件處理 Queue
- 長時間任務
- 中斷恢復
- 有限重試
- 具有明確成功與失敗條件的流程

## State Machine 的優點

### 流程可控

Agent 不能任意從任何狀態跳到任何狀態。

### 容易限制重試

```text
retry_count >= 2
  ↓
FAILED
```

### 容易保存進度

狀態和轉移可以持久化到資料庫。

### 適合 Human-in-the-loop

```text
READY_TO_SEND
  ↓
WAITING_FOR_APPROVAL
  ↓
APPROVED
  ↓
SENT
```

### 容易建立 Audit Log

每次狀態變化都能留下：

- 時間
- 原因
- 執行者
- 工具結果
- 成本
- 失敗原因

## State Machine 的限制

### 狀態爆炸

如果每個細節都變成 State，流程圖很快會像地鐵圖和神經突觸的混合體。

### 條件衝突

同一個狀態可能同時符合多個 Transition，必須定義優先順序。

### 對高度未知任務可能過度僵硬

當下一步幾乎無法事先列舉時，State Machine 應該包住局部 Agent，而不是取代局部 Agent。

## State Machine 與 ReAct

它們非常適合一起使用：

```text
State Machine：
控制目前位於 RESEARCH 狀態

ReAct：
在 RESEARCH 狀態內決定搜尋、開頁面或改寫 Query
```

State Machine 提供邊界，ReAct 提供局部彈性。

---

## 五、DAG：把可拆分工作平行執行

DAG 是 Directed Acyclic Graph，也就是有向無環圖。

它允許任務拆成多條分支，平行執行後再合併：

```text
                 ┌→ Research A ─┐
Problem → Decompose
                 ├→ Research B ─┼→ Synthesis
                 ├→ Research C ─┤
                 └→ Research N ─┘
                                  ↓
                               Verify
                                  ↓
                                Output
```

「無環」代表資料流不會沿著 DAG 本身回到先前節點。

![DAG: Decompose, Run in Parallel, and Aggregate](/images/the-atlas-of-agent-design-patterns-part-2/dag.png)

> **Figure 2-4｜DAG: Decompose, Run in Parallel, and Aggregate**  
> Problem 經過 Decompose 後形成多個平行研究分支，所有必要分支完成後進入 Synthesis、Verify 和 Output。

## 適合 DAG 的任務

- Deep Research
- 多來源資料搜集
- 批次文件處理
- 多市場比較
- 多個測試平行執行
- 多模型獨立分析
- MapReduce 類型工作
- 大量互不依賴的子任務

## DAG 的核心價值

### 平行化

如果 Research A、B、C 互不依賴，就不必等一個做完才開始下一個。

### 清楚表達依賴

Synthesis 必須等待必要分支完成。

### 適合大型任務拆解

Planner 可以先將任務拆成多個節點，再交由執行引擎安排併發和依賴。

## DAG 的限制

### 不適合直接表達循環

如果需要：

```text
Verify Failed
  ↓
Return to Research
```

這就不是單純 DAG。

可以由外層 State Machine 重新建立一次 DAG Run。

### 平行不一定更快

如果所有 Worker 同時搶：

- 同一個 API
- 同一個 Database
- 同一個模型配額
- 同一個 Browser Session

平行反而可能造成：

- Rate Limit
- Connection Exhaustion
- Queue Congestion
- Token 峰值
- 成本瞬間放大

### 合併結果可能很困難

多個分支可能：

- 內容重複
- 結論衝突
- 格式不同
- 使用不同版本
- 對同一概念使用不同名稱

因此 Synthesis 通常需要：

- 去重
- 衝突處理
- 來源排序
- 格式統一
- 完整性檢查

## DAG 與 Multi-Agent

DAG 不一定代表 Multi-Agent。

一個程式也可以平行執行多個普通函式；同一個 Agent 也可以平行呼叫多個工具。

反過來，多 Agent 也不一定使用 DAG。多個 Agent 可能依序交接，或在 State Machine 裡運作。

DAG 描述的是依賴關係，不是 Agent 數量。

---

## Pipeline、State Machine 和 DAG 有什麼差別？

| 比較項目 | Pipeline | State Machine | DAG |
|---|---|---|---|
| 主要結構 | 線性步驟 | 狀態與條件轉移 | 有向依賴圖 |
| 是否固定順序 | 通常是 | 不一定 | 依依賴關係 |
| 條件分支 | 有限 | 很強 | 支援 |
| 循環 | 通常沒有 | 支援 | 不支援 |
| 重試 | 簡單 | 很適合 | 通常由外層控制 |
| 平行 | 有限 | 可以 | 很適合 |
| 中斷恢復 | 中 | 很適合 | 視執行引擎 |
| 典型用途 | 固定流程 | 長任務與恢復 | 平行子任務 |
| 常見風險 | 過度僵硬 | 狀態爆炸 | 聚合與依賴複雜 |

可以用交通系統理解：

- Pipeline 是固定站序的列車
- Router 是轉運中心
- State Machine 是帶交通號誌和迴轉規則的道路網
- DAG 是多條支線同時運輸，最後在中央倉庫合併

它們也可以組合：

```text
Router
  ↓
State Machine
  ↓
RESEARCH 狀態內執行 DAG
  ↓
VERIFY
  ↓
Pipeline 格式化輸出
```

---

## 六、Event-driven：不是有人提問才開始工作

前面五種路徑大多從使用者輸入開始。

Event-driven 系統則由事件觸發：

```text
New Email Arrives
  ↓
Classify
  ↓
Extract Attachment
  ↓
Store
  ↓
Notify
```

常見事件包括：

- 收到 Email
- GitHub 出現新 Issue
- 有新檔案上傳
- 資料庫欄位更新
- Webhook 到達
- 排程時間到了
- 價格超過門檻
- 外部服務回傳結果

## Event-driven 的優點

- 適合長期自動化
- 不需要使用者手動啟動
- 容易和企業系統整合
- 適合 Queue 與 Worker
- 可以把大型流程拆成非同步任務

## Event-driven 的主要風險

### 重複事件

同一個 Webhook 可能被送達多次。

因此需要：

- Idempotency Key
- Event ID
- Deduplication
- Processed State

### 事件順序錯亂

Event B 可能比 Event A 更早到達。

系統不能只依賴接收順序。

### Poison Message

某個永遠處理失敗的事件可能不斷回到 Queue。

需要：

- Retry Limit
- Dead-letter Queue
- Error Classification
- Manual Inspection

### 無法還原完整路徑

事件分散在多個服務後，沒有 Trace ID 就很難知道一個任務走過哪些系統。

---

## 七、Human-in-the-loop：有些路徑必須停下來

Human-in-the-loop 不是獨立推理方式，而是一種執行控制模式：

```text
Generate Draft
  ↓
Human Review
  ↓
Approved?
  ├─ Yes → Send
  └─ No → Revise
```

適合人工節點的情況：

- 寄出 Email
- 執行付款
- 刪除資料
- 發布公開內容
- 修改 Production
- 法律與醫療高風險判斷
- 權限提升
- 不可逆操作
- 資料來源互相衝突
- 模型信心不足

## 人類要審什麼？

不要只顯示一個 Approve 按鈕。

應提供：

- Agent 準備做什麼
- 使用了哪些資料
- 風險是什麼
- 預期影響
- 是否可撤銷
- 可以修改哪些欄位

## 審批後從哪裡繼續？

State 必須保存。

否則批准後重新跑完整流程，可能導致：

- 重複寄信
- 重複寫入
- 重複付款
- 重複建立任務

Human-in-the-loop 不是智慧不足的補丁，而是風險邊界的一部分。

---

## 八、Behavior Tree：用層級節點組織行為

Behavior Tree 常見於遊戲、機器人和控制系統，也可以用來編排 Agent 行為。

常見節點包括：

### Sequence

依序執行所有子節點，只要其中一個失敗，整個 Sequence 就失敗。

### Selector

依序嘗試子節點，只要其中一個成功，就停止。

### Condition

檢查條件是否成立。

### Action

執行實際動作。

例如：

```text
Selector
├── Condition: Cached Answer Available
│   └── Return Cached Answer
├── Sequence
│   ├── Retrieve
│   ├── Verify
│   └── Generate
└── Ask Human
```

Behavior Tree 比 State Machine 更強調可重用、層級化的行為模組。

---

## 九、Programmatic Agent：先產生可執行物，再執行

Programmatic Agent 不只產生自然語言答案，而是先建立可執行產物：

- Python
- SQL
- Shell Command
- API Request
- DSL
- Workflow Definition
- Query Plan

再由系統執行和驗證：

```text
User Request
  ↓
Generate Program
  ↓
Validate
  ↓
Execute
  ↓
Inspect Result
```

例如：

> 計算每個月份的流失率。

Agent 可以：

1. 產生 SQL
2. 檢查是否唯讀
3. 執行 SQL
4. 驗證結果
5. 整理成表格

這通常比讓模型直接猜一個數字可靠。

但它也需要：

- Sandbox
- Permission Control
- Resource Limits
- SQL Read-only Policy
- Command Allowlist
- Execution Timeout
- Secret Isolation

---

## 五種核心執行路徑比較

![Five Execution Path Patterns at a Glance](/images/the-atlas-of-agent-design-patterns-part-2/five-patterns-comparison.png)

> **Figure 2-5｜Five Execution Path Patterns at a Glance**  
> 比較 Direct、Pipeline、Router、State Machine 和 DAG 的適用情境、優勢、限制、典型複雜度和案例，並附上修正後的選擇流程。

| 模式 | 路徑結構 | 動態分支 | 循環 | 平行處理 | 可控性 | 典型用途 |
|---|---|---:|---:|---:|---:|---|
| Direct | 單次輸入輸出 | 否 | 否 | 否 | 很高 | 翻譯、摘要、改寫 |
| Pipeline | 固定順序 | 少 | 通常否 | 有限 | 很高 | RAG、文件處理 |
| Router | 先分流 | 是 | 視後續路徑 | 可以 | 高 | 多工具、多模式 |
| State Machine | 狀態與條件 | 很強 | 是 | 可以 | 很高 | Production Agent |
| DAG | 有向依賴圖 | 是 | 否 | 很強 | 高 | Deep Research、批次 |

---

## 如何選擇執行路徑？

可以依序問：

## 1. 一次呼叫能否完成任務，而且所有資訊都已提供？

可以：

> 優先使用 Direct。

## 2. 不同 Request 是否需要不同工具或資料路徑？

需要：

> 使用 Router。

## 3. 是否需要明確 State、重試、暫停恢復或人工審批？

需要：

> 使用 State Machine。

## 4. 子任務能否獨立平行，最後再合併？

可以：

> 使用 DAG。

## 5. 若以上都不是，流程是否固定且穩定？

是：

> 使用 Pipeline。

這不是絕對分類，但比「所有任務都使用 Agent」更接近 Production 設計。

---

## 常見反模式

## 反模式一：每個問題都跑完整流程

簡單問題也啟動 Planner、Retriever、Critic 和 Multi-Agent。

結果是：

- 更慢
- 更貴
- 更多錯誤節點
- 更難觀察

## 反模式二：把所有分支交給 LLM

模型可以自由呼叫任何工具，卻沒有：

- Tool Allowlist
- Max Steps
- Budget
- State Constraint
- Stop Condition

這不是自主，而是失去邊界。

## 反模式三：Pipeline 沒有 Fallback

某個來源失敗，整條鏈直接中止。

## 反模式四：State Machine 沒有 Terminal State

任務在 RETRY、REPLAN 和 VERIFY 之間永久旋轉。

## 反模式五：DAG 過度平行

數十個 Worker 同時啟動，撞上：

- API Rate Limit
- Database Connection Limit
- Queue Backlog
- Token 峰值

## 反模式六：Router 沒有 Unknown

無論多模糊，都被迫選一條路。

## 反模式七：人工審批只是裝飾

審批者看不到操作內容、資料來源和影響範圍，只能盲按 Approve。

---

## Production 執行路徑應具備什麼？

| 能力 | 作用 |
|---|---|
| Trace ID | 串起完整任務 |
| State Persistence | 保存進度 |
| Timeout | 防止無限等待 |
| Retry Limit | 防止無限重試 |
| Idempotency | 防止重複執行 |
| Fallback | 主路徑失敗時切換 |
| Budget Guard | 限制成本 |
| Tool Allowlist | 限制可用工具 |
| Terminal States | 定義完成、失敗與取消 |
| Audit Log | 記錄誰做了什麼 |
| Human Approval | 保護高風險操作 |
| Observability | 追蹤 Latency、Error 和 Cost |

執行路徑的價值，不只是讓流程圖比較漂亮。

它讓系統可以回答：

- 現在走到哪裡？
- 為什麼走這條路？
- 哪個節點失敗？
- 已經試過幾次？
- 是否還值得繼續？
- 任務完成了嗎？
- 哪些操作真的執行過？

---

## 本篇結論

Direct、Pipeline、Router、State Machine 和 DAG 分別解決不同流程問題。

- **Direct**：一次就能完成的簡單任務
- **Pipeline**：固定且可預測的處理流程
- **Router**：讓不同 Request 走不同路徑
- **State Machine**：條件轉移、重試、恢復、持久化和審批
- **DAG**：可平行拆解和合併的工作
- **Event-driven**：由外部事件啟動的自動化
- **Human-in-the-loop**：高風險和不可逆操作
- **Behavior Tree**：層級化、可重用的行為
- **Programmatic Agent**：產生並執行可驗證程序

成熟系統很少只使用一種。

更常見的組合是：

```text
Event
  ↓
Router
  ↓
State Machine
  ↓
某個 State 內執行 Pipeline 或 DAG
  ↓
Human Approval
  ↓
Terminal State
```

執行路徑不是越自由越好。

真正重要的是：

> 哪些部分應該固定、哪些地方需要分支、哪些工作可以平行，以及哪些節點必須停下來驗證。

下一篇將進入第二個維度：

> Agent 如何決定下一步？

Part 3 會完整比較 ReAct、Plan-and-Execute、Adaptive Planning、Hierarchical Planning 和 HTN，並解釋為什麼成熟系統通常讓 Planner 管全局、ReAct 處理現場，再由 Verifier 決定是否重新規劃。
