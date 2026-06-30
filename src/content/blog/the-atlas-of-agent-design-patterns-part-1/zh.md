---
title: "Agent 設計模式圖鑑 Part 1｜LLM Agent 不只有 ReAct：用六個維度看懂 Agent 架構"
description: "把常見的 LLM Agent 設計模式整理到六個維度：執行路徑、決策與規劃、推理與探索、驗證與修正、Agent 組織、狀態與記憶。讀完之後，你不需要背下所有 ReAct、Plan-and-Execute、ToT、Reflexion 之類的名稱，而是可以先判斷一個新框架改動了哪一層。"
categories: ["ai"]
tags: ["ai", "agent", "design-patterns", "architecture", "llm"]
date: 2026-06-30T01:56:00
featured: false
series: "Agent 設計模式圖鑑"
seriesOrder: 1
---

談到 LLM Agent，很多人的第一個問題是：

> Agent 應該使用 ReAct，還是 Plan-and-Execute？

這個問題本身沒有錯，但範圍太窄。

因為在一套完整的 Agent 系統裡：

- ReAct 可能只負責根據工具結果決定下一步
- State Machine 負責控制整體流程
- Verifier 負責驗收結果
- Memory 負責保存狀態與經驗
- Supervisor 負責把工作分配給多個 Worker

它們解決的是不同層次的問題。

如果把這些名詞全部放進同一張比較表，再要求選出「最好的一種」，很容易得到一個看似完整、實際上無法落地的答案。

這也是 Agent 架構最常見的理解障礙：

> 名詞很多，但分類軸沒有先釐清。

這篇文章會先建立一張地圖，把常見 Agent 設計模式拆成六個維度：

1. 執行路徑
2. 決策與規劃
3. 推理與探索
4. 驗證與修正
5. Agent 組織
6. 狀態與記憶

讀完這篇後，你不需要背下所有名詞。

更重要的是，當你再次看到一個新的 Agent Framework、論文、產品或架構名稱時，可以先判斷：

> 它究竟改變了 Agent 系統的哪一層？

---

## 一套 Agent，為什麼會同時出現這麼多名詞？

先看一個簡化的研究型 Agent：

```text
使用者提出問題
 ↓
Router 判斷問題類型
 ↓
Planner 拆解研究任務
 ↓
Research Worker 搜尋與讀取資料
 ↓
Verifier 檢查來源與結論
 ↓
資料不足時重新規劃
 ↓
Writer 整理答案
```

這套系統可以同時包含：

- **Router**：選擇任務路徑
- **Plan-and-Execute**：先拆解任務，再逐步執行
- **ReAct**：Worker 根據工具回傳結果決定下一步
- **State Machine**：控制任務目前位於哪個階段
- **Verifier**：檢查來源、格式或答案品質
- **Supervisor–Worker**：分配多個角色的工作
- **Working Memory**：保存目前已找到的資料與進度
- **Bounded Retry**：限制失敗後最多重試幾次

這些模式彼此沒有衝突。

它們更像一台車上的不同系統：

| 車輛問題 | 對應概念 |
|---|---|
| 車身如何分類 | SUV、轎車、旅行車 |
| 使用哪種動力 | 汽油、電動、油電 |
| 如何換檔 | 手排、自排 |
| 如何傳遞動力 | 前驅、後驅、四驅 |
| 如何輔助駕駛 | ACC、車道置中、自動停車 |

如果有人問「SUV 和油電哪個比較好」，很難直接回答。

因為兩者根本不在同一個分類維度。

Agent 架構也一樣。

- ReAct 描述的是決策節奏
- State Machine 描述的是流程控制
- Multi-Agent 描述的是工作如何分配
- Memory 描述的是資訊如何保存

先把維度拆開，後面的比較才有意義。

---

![Figure 1-1｜Six Dimensions of Agent Architecture](/images/the-atlas-of-agent-design-patterns-part-1/01-six-dimensions-overview.png)

> **Figure 1-1｜Six Dimensions of Agent Architecture**
> 一套完整 Agent 系統可以同時組合六個架構維度。這些不是互斥選項，而是可以一起使用的設計層。

---

## Agent 架構的六個維度

本文採用以下六個維度整理常見 Agent 模式。

這不是唯一可能的學術分類，而是一套偏向工程設計、產品判斷與系統選型的工作模型。

| 維度 | 它回答的問題 | 常見模式 |
|---|---|---|
| 執行路徑 | 任務從開始到結束怎麼走？ | Direct、Pipeline、Router、State Machine、DAG |
| 決策與規劃 | Agent 如何決定下一步？ | ReAct、Plan-and-Execute、Adaptive Planning、HTN |
| 推理與探索 | 面對多種解法時如何搜尋？ | Self-consistency、Tree of Thoughts、Graph of Thoughts、LATS |
| 驗證與修正 | 如何知道做錯？錯了怎麼辦？ | Retry、Fallback、Critic、Verifier、Generate-and-Test、Reflexion |
| Agent 組織 | 一個 Agent 做完，還是多個角色合作？ | Single Agent、Supervisor–Worker、Debate、Blackboard、Swarm |
| 狀態與記憶 | Agent 記得什麼？保存多久？ | Working、Episodic、Semantic、Procedural、Shared Memory |

一套系統可以在每個維度各自選擇一種或多種模式。

例如：

```text
執行路徑：State Machine
決策方式：Plan-and-Execute + ReAct
探索方式：Single-path
修正方式：Verifier + Bounded Retry
組織方式：Single Agent
記憶方式：Working Memory + Procedural Memory
```

這段描述，比「這是一個 ReAct Agent」提供了更多真正有用的架構資訊。

---

## 維度一：任務怎麼走？

第一個維度是 **Execution Path**，也就是任務的流程骨架。

它關心的不是模型怎麼思考，而是：

> 任務會經過哪些節點？什麼條件下切換路徑？失敗後回到哪裡？

### Direct

最簡單的形式：

```text
Input
 ↓
LLM
 ↓
Output
```

適合：

- 翻譯
- 改寫
- 簡單摘要
- 格式轉換
- 一次性分類

很多問題根本不需要 Agent。

如果輸入和輸出之間沒有工具、狀態、分支或持久化的多步驟流程，直接呼叫模型通常更快、更便宜，也更容易測試。

### Pipeline

Pipeline 會把任務拆成固定步驟：

```text
Rewrite
 ↓
Retrieve
 ↓
Rerank
 ↓
Generate
 ↓
Verify
```

每個步驟責任清楚，適合流程相對穩定的工作。

Production RAG 經常採用這種骨架，原因很實際：

- 容易記錄每一階段的輸入與輸出
- 容易定位失敗位置
- 可以分別評估 Retrieval、Reranking 和 Generation
- 成本與延遲相對容易預估

Pipeline 的限制也很明確。

每個 Request 通常會經過預先設定的節點，即使某些步驟對當前問題沒有必要。

### Router

Router 會先判斷問題該走哪條路：

```text
 ┌→ Direct Answer
使用者問題 → Router ├→ RAG Search
 ├→ SQL
 ├→ Calculator
 └→ Agent Workflow
```

Router 可以依照以下條件分流：

- 問題類型
- 使用者權限
- 所需工具
- 成本預算
- 風險等級
- 延遲要求
- Query Profile

它的價值通常不在於「更會回答」，而是避免每個問題都啟動最昂貴的完整流程。

### State Machine

State Machine 會明確記錄系統目前位於哪個狀態：

```text
START
 ↓
RETRIEVE
 ↓
資料足夠？
 ├─ 是 → ANSWER
 └─ 否 → REWRITE QUERY
 ↓
 RETRIEVE
```

它特別適合需要以下能力的系統：

- 重試上限
- 任務中斷後恢復
- 人工審批
- 失敗分流
- 長任務進度保存
- 明確停止條件

ReAct 可以決定「下一個動作是什麼」。

State Machine 則負責限制：

> 哪些狀態允許哪些動作。

一個負責現場判斷，一個負責交通規則。

### DAG

DAG 是 Directed Acyclic Graph，也就是有向無環圖。

它適合把互不依賴的工作平行執行：

```text
 ┌→ Research A ─┐
問題 → Decompose ├→ Research B ─┼→ Synthesis
 └→ Research C ─┘
```

Deep Research、批次資料分析和多來源比較，都可能使用 DAG。

DAG 可以平行，但原則上不包含循環。

State Machine 則可以讓流程回到先前狀態。

這兩者的差別會直接影響重試、恢復與任務編排方式。

---

![Figure 1-2 — Direct, Pipeline, Router, State Machine, and DAG](/images/the-atlas-of-agent-design-patterns-part-1/02-execution-structures.png)

> **Figure 1-2｜Direct, Pipeline, Router, State Machine, and DAG**
> 五種常見執行骨架的結構比較：Direct 是單次輸入輸出，Pipeline 是固定順序，Router 負責分流，State Machine 根據狀態轉移，DAG 則把可拆分工作平行執行後再合併。

---

## 維度二：下一步怎麼決定？

第二個維度是 **Decision and Planning**。

這一層才是 ReAct 和 Plan-and-Execute 所在的位置。

### ReAct

ReAct 的基本節奏可以簡化成：

```text
Reason
 ↓
Act
 ↓
Observe
 ↓
Reason Again
```

例如，一個搜尋 Agent 可能：

1. 搜尋第一組關鍵字
2. 發現結果不夠精確
3. 改寫查詢
4. 開啟其中一個來源
5. 發現資料過期
6. 改找官方文件
7. 整理結果

下一步取決於前一步的 Observation。

這類模式適合：

- 網頁搜尋
- Debug
- Browser 操作
- API 探索
- 工具結果不可預期的任務

ReAct 的問題通常不是缺乏彈性，而是彈性太高。

如果沒有最大步數、工具白名單、預算限制與停止條件，Agent 可能：

- 反覆搜尋
- 重複讀取同一份資料
- 一直換方法
- 看起來很忙，實際進度沒有增加

### Plan-and-Execute

Plan-and-Execute 會先建立完整或高層計畫：

```text
目標
 ↓
建立計畫
 ↓
執行步驟 1
 ↓
執行步驟 2
 ↓
執行步驟 3
 ↓
整合結果
```

它適合：

- 長篇研究
- 多階段報告
- 專案規劃
- 有明確交付物的任務
- 容易漏項的分析工作

它的優勢是全局性。

Agent 在開始前先確認有哪些子問題需要處理，比較不容易因第一個搜尋結果就偏離整體目標。

風險則在初始計畫。

如果前提錯了，後續步驟可能執行得非常完整，方向仍然不對。

### Adaptive Planning

Adaptive Planning 在 Plan-and-Execute 上加入重新規劃：

```text
建立計畫
 ↓
執行一步
 ↓
檢查結果
 ↓
是否需要修改計畫？
 ├─ 否 → 繼續
 └─ 是 → 更新剩餘步驟
```

例如：

```text
原計畫：
1. 從職缺頁取得完整 JD
2. 分析技能要求
3. 進行匹配評分
```

第一步失敗後，系統可以改成：

```text
更新後：
1. 嘗試公司 Career Page
2. 嘗試公開 Job API
3. 仍無完整正文則標記 Pending
4. 不根據職稱推測內容
```

這裡的關鍵不是「再試一次」，而是剩餘計畫已經改變。

### 最常見的混合架構

實務上很少需要把 ReAct 和 Plan-and-Execute 二選一。

更常見的結構是：

```text
Planner 建立高層計畫
 ↓
Executor 執行某個子任務
 ↓
子任務內使用 ReAct
 ↓
Verifier 檢查結果
 ↓
必要時重新規劃
```

可以把它理解成：

- Planner 管全局
- ReAct 處理現場
- Verifier 負責驗收
- State Machine 限制流程

---

![Figure 1-3｜Planner, ReAct Executor, Verifier, and Replanner](/images/the-atlas-of-agent-design-patterns-part-1/03-planner-react-executor.png)

> **Figure 1-3｜Planner, ReAct Executor, Verifier, and Replanner**
> Planner 產生高層計畫，Executor 在子任務內使用 ReAct，Verifier 負責檢查結果，失敗時再由 Replanner 修改剩餘計畫。

---

## 維度三：多種解法怎麼探索？

有些任務只需要一條合理路徑。

另一些任務則存在大量候選方案。

第三個維度關心的是：

> Agent 要沿著一條路走到底，還是同時探索多條路？

### Single-path Reasoning

只產生一條主要解題路徑。

優點是快、便宜，適合大多數日常任務。

缺點是早期判斷一旦偏掉，後續內容通常也會跟著偏移。

### Self-consistency

對同一個問題產生多次獨立結果，再選擇較一致的答案。

它適合：

- 有明確答案的推理題
- 分類
- 固定評分
- 可以投票的任務

多數一致只能降低偶發誤差，無法保證事實正確。

如果所有候選都使用相同的錯誤資訊，投票不會把錯誤變成真相。

### Generate-and-Rank

先產生多個候選，再由 Ranker 或評估規則排序：

```text
問題
 ↓
產生方案 A、B、C
 ↓
根據成本、風險、品質評分
 ↓
選擇最佳候選
```

它適合：

- 架構選型
- 文案
- 程式方案
- 多個都可能合理的答案

### Tree of Thoughts

Tree of Thoughts 允許思路分叉：

```text
 起點
 ┌────┼────┐
 路徑 A 路徑 B 路徑 C
 │ │
 A1/A2 B1/B2
```

系統可以：

- 評估分支
- 淘汰候選
- 保留較有希望的路線
- 回到先前節點探索其他方向

### Graph of Thoughts

Graph of Thoughts 允許不同分支重新合併。

這對多來源研究特別有用。

不同研究路徑可能找到互補資料，最後需要把中間結果整合，而不是只保留其中一條路。

### LATS / Tree Search

這類方法會把 Agent 行動視為搜尋空間，反覆：

- 提出候選行動
- 執行或模擬
- 評估結果
- 保留較好的分支
- 回溯並繼續探索

它適合能夠客觀判斷成功與否的環境，例如：

- 程式測試
- Browser 操作
- 遊戲
- 可驗證的結構化任務

代價也很直接：

- 更多模型呼叫
- 更多工具執行
- 更多狀態管理
- 更高評估成本

---

![Figure 1-4｜Line, Tree, and Graph Search Structures](/images/the-atlas-of-agent-design-patterns-part-1/04-search-structures.png)

> **Figure 1-4｜Line, Tree, and Graph Search Structures**
> Line 只保留一條路，Tree 允許分支、剪枝與回溯，Graph 則能讓不同路徑重新合併並重用中間結果。

---

## 維度四：做錯後怎麼修？

Agent 能採取很多行動，不代表它知道結果是否正確。

第四個維度處理的是：

> 驗證、失敗恢復，以及如何避免同樣的錯誤反覆出現。

### Retry

Retry 適合暫時性錯誤：

- API Timeout
- 網路中斷
- Rate Limit
- 暫時無法取得頁面
- 模型輸出格式偶發錯誤

如果根本原因沒有改變，原樣重試往往只會把同一個錯誤再跑一次。

因此，Retry 應該有：

- Backoff
- Retry Limit
- Timeout
- Escalation

### Fallback

Fallback 會切換備援方案：

```text
Primary Action
 ↓
Success?
 ├─ Yes → Continue
 └─ No → Fallback Option → Continue
```

它的目標通常是提高可用性，不一定保證備援路徑和主路徑具有完全相同的品質。

### Critic

Critic 負責指出問題，例如：

- 論證缺口
- 格式錯誤
- 遺漏需求
- 潛在風險
- 結論與證據不一致

Critic 比較像審稿者。

它提供質化回饋，但不一定能做出嚴格的 Pass / Fail 判定。

### Verifier

Verifier 依照規則、Schema、證據或政策檢查輸出。

例如：

- JSON 是否符合 Schema
- SQL 是否唯讀
- Citation 是否對應 Claim
- 必要欄位是否存在
- 是否違反權限規則
- 是否通過合規要求

Critic 和 Verifier 的差別可以簡化成：

- Critic：哪裡可以改進？
- Verifier：是否達到門檻？

### Generate-and-Test

Generate-and-Test 不是一次生成多個候選再選冠軍。

它的典型流程是：

```text
Generate
 ↓
Run Test
 ↓
Pass?
 ├─ Yes → Accept
 └─ No → Inspect Failure
 ↓
 Revise
 ↓
 Run Test Again
```

它適合：

- Code Generation
- SQL Validation
- Data Transformation
- Executable Workflow
- API Request
- Build 與 Deployment

真正重要的不是模型說「看起來沒問題」，而是結果是否在真實環境中通過檢驗。

### Reflexion

Reflexion 會把失敗經驗保存給未來任務使用：

```text
Attempt
 ↓
Failure
 ↓
Reflect
 ↓
Update Strategy / Memory
 ↓
Future Attempt
```

例如：

```text
失敗紀錄：
只根據職稱進行評分，沒有取得完整 JD。

程序規則：
缺少完整正文時標記 Pending，不根據職稱推測。
```

這已經跨入 Memory 維度。

因為修正不只影響當前答案，也會改變未來的行為。

---

![Figure 1-5｜Six Common Verification and Recovery Patterns](/images/the-atlas-of-agent-design-patterns-part-1/05-verification-paths.png)

> **Figure 1-5｜Six Common Verification and Recovery Patterns**
> 六種代表性的驗證與復原模式：Retry、Fallback、Critic、Verifier、Generate-and-Test、Reflexion。這張圖不是「六種錯誤處理路徑」，因為 Critic 和 Verifier 主要負責發現與判定問題，不一定直接執行恢復。

---

## 維度五：工作由誰完成？

一套 Agent 可以由單一 Agent 完成，也可以拆成多個角色。

### Single Agent

同一個 Agent 負責：

- 規劃
- 使用工具
- 執行
- 檢查
- 回答

這是最簡單、成本最低，也最容易 Debug 的形式。

很多任務根本不需要 Multi-Agent。

只要：

- 狀態清楚
- 工具邊界明確
- 驗證機制可靠
- 停止條件合理

Single Agent 就可能已經足夠。

### Role-based Single Agent

同一個模型在不同階段切換角色：

```text
Planner
 ↓
Writer
 ↓
Critic
```

它看起來像多個角色，但底層仍可能是同一個模型、同一份 Context、同一個執行程序。

### Supervisor–Worker

Supervisor 負責：

- 拆解任務
- 分派 Worker
- 追蹤進度
- 收集結果
- 聚合輸出

Worker 則負責特定子任務。

```text
 Supervisor
 ┌──────┼──────┐
 Research Coding Reviewer
 \ | /
 Return Results
 ↓
 Supervisor Aggregates
 ↓
 Response
```

重要的是：

> Worker 不應該直接跳過 Supervisor，把各自結果送到最終 Response。

Supervisor 或明確的 Aggregator 必須負責整合。

### Debate

多個 Agent 提出不同立場，再由 Moderator 或 Judge 比較：

```text
Agent A
Agent B
Agent N
 ↓
Moderator / Judge
 ↓
Final Answer
```

它適合：

- 找盲點
- 比較競爭觀點
- 高風險決策
- 模糊問題

但多數決不能取代外部驗證。

### Blackboard

多個 Agent 共用一個工作區：

```text
Shared Blackboard
├── 已知事實
├── 待辦事項
├── 中間結果
├── 風險
└── 候選答案
```

不同 Agent 不需要互相傳遞完整對話，只要讀寫共享狀態。

### Swarm

Swarm 讓多個輕量 Agent 自主協作，中央控制較少。

這類架構很靈活，但也更難處理：

- 重複工作
- 無限交接
- 責任歸屬
- 成本控制
- 結果衝突
- 停止條件

多 Agent 最大的風險，通常不是某個 Worker 不夠聰明，而是：

> 每個 Worker 都做了一點工作，最後沒有人對完整交付負責。

---

![Figure 1-6｜Five Common Agent Organisation Patterns](/images/the-atlas-of-agent-design-patterns-part-1/06-organisation-patterns.png)

> **Figure 1-6｜Five Common Agent Organisation Patterns**
> Single Agent、Supervisor–Worker、Debate、Blackboard 和 Swarm 是不同的組織模式，不是從低階到高階的成熟度光譜，也不是嚴格的自主度排序。

---

## 維度六：Agent 記得什麼？

最後一個維度是 Memory。

Memory、Context、State 和 RAG 經常被混在一起，但它們保存的內容與用途不同。

### Working Memory

保存當前任務正在使用的資料，例如：

- 使用者問題
- 已讀文件
- 工具結果
- 中間結論
- 尚未完成的步驟

它通常只在當前任務或短時間內有效。

### Short-term State

保存工作流進度：

- 目前位於哪個 State
- 哪些步驟已完成
- 已重試幾次
- 哪些 Worker 尚未返回
- 下一個節點是什麼

Context 側重：

> 模型目前看得到什麼。

State 側重：

> 系統目前走到哪裡。

### Episodic Memory

保存過去發生的事件：

```text
上次讀取某網站時，主要頁面需要 JavaScript。
改用公開 API 後成功取得資料。
```

它比較接近任務經驗。

### Semantic Memory

保存較穩定的事實與知識：

- 公司資料
- 產品規格
- 領域知識
- 使用者長期設定
- 系統定義

這類資料通常需要：

- 來源
- 版本
- 更新時間
- 信任等級

### Procedural Memory

保存做事規則：

```text
H 欄已有完整 JD
→ 直接使用 H 欄內容

H 欄空白
→ 讀取 E 欄 URL

找不到完整正文
→ 標記 Pending
→ 不根據職稱猜分
```

Procedural Memory 決定 Agent 應該怎麼做，而不只是知道哪些事實。

### User Memory

保存使用者偏好與長期限制，例如：

- 回答語言
- 文件格式
- 測試要求
- 交付方式
- 固定工作規則

這類記憶需要更謹慎的：

- 隱私控制
- 更新機制
- 刪除能力
- 權限管理

### Shared Memory

讓多個 Agent 共用：

- 任務進度
- 中間產物
- 已驗證事實
- 待處理問題
- 工具結果

Shared Memory 可以降低重複工作，也可能把一個 Agent 的錯誤傳給整個系統。

Memory 並不是越多越好。

如果缺少以下治理，記憶很容易變成一間沒有索引的倉庫：

- 來源
- 時間
- 版本
- 信任等級
- 更新條件
- 衝突處理
- 遺忘機制

---

![Figure 1-7｜Context, State, Memory, and RAG](/images/the-atlas-of-agent-design-patterns-part-1/07-context-state-memory-rag.png)

> **Figure 1-7｜Context, State, Memory, and RAG**
> Context 是模型當下可見資訊，State 是工作流目前進度，Memory 保存跨步驟或跨任務資訊，RAG 則從外部知識來源檢索內容。

---

## Workflow、Agent 和 Agentic Workflow 有什麼差別？

這三個詞沒有一套所有團隊都完全同意的邊界。

以下是一套偏向工程實務的工作定義。

### Workflow

Workflow 的主要流程由開發者事先決定：

```text
A → B → C → D
```

模型可以參與某些節點，但不能自由改變主要流程。

### Agent

Agent 可以根據：

- 目標
- 狀態
- 工具結果
- 環境回饋

自主選擇下一步行動：

```text
Observe
 ↓
Decide
 ↓
Act
 ↓
Observe Again
```

自主性較高，同時也更需要：

- 預算
- 權限
- 停止條件
- 審計
- 驗證

### Agentic Workflow

Agentic Workflow 位於兩者之間。

整體流程仍由 Workflow 控制，但某些節點允許 Agent 自主決策。

例如：

```text
固定流程：
Router → Research → Verify → Answer

Research 節點內：
Agent 自主搜尋、改寫 Query、選擇來源
```

這通常是 Production 系統更常採用的折衷。

| 項目 | Workflow | Agentic Workflow | Autonomous Agent |
|---|---|---|---|
| 主要流程 | 預先定義 | 大致固定 | 動態決定 |
| 局部自主決策 | 少 | 有 | 很多 |
| 可控性 | 高 | 高～中 | 中～低 |
| 成本可預測性 | 高 | 中～高 | 低 |
| Debug 難度 | 低 | 中 | 高 |
| 適合 Production | 很高 | 很高 | 視任務而定 |

把所有工作都改造成完全自主 Agent，通常不會自動提升品質。

自主性應該放在：

> 事先很難寫死，但結果仍然能被驗證的節點。

而不是平均灑在整條流程上。

---

## Agent 自主度和系統控制是兩條不同軸線

常見系統可以沿著自主度提高：

- Direct
- Fixed Pipeline
- Router
- Agentic Workflow
- Plan-and-Execute
- Adaptive Agent
- Long-running Autonomous Agent

但它們不應該被畫成一條單純的成熟度階梯。

原因是：

> 自主度越高，通常越靈活，但系統控制與可預測性往往下降。

因此，更準確的方式是使用二維矩陣：

- X 軸：Agent Autonomy
- Y 軸：System Control and Predictability

其中：

| 模式 | 自主度 | 控制與可預測性 |
|---|---|---|
| Direct | 很低 | 很高 |
| Fixed Pipeline | 低 | 很高 |
| Router | 低～中 | 高 |
| Agentic Workflow | 中 | 中～高 |
| Plan-and-Execute | 中～高 | 中 |
| Adaptive Agent | 高 | 中～低 |
| Long-running Autonomous Agent | 很高 | 低 |

Agentic Workflow 通常位於較實用的平衡區：

- 保留必要彈性
- 仍有清楚流程
- 容易加入 Budget、Verifier 和 Human Approval
- 比完全自主 Agent 更容易 Debug

### Multi-Agent 不應該放在這條階梯上

Multi-Agent 描述的是組織方式，而不是固定自主度。

一套 Multi-Agent 系統可以：

- 高度腳本化
- 中度 Agentic
- 高度自主

所以它不應該被放在 Adaptive Agent 和 Long-running Autonomous Agent 之間，當成「更高一級」的自主模式。

---

![Figure 1-8｜Agent Autonomy and System Control](/images/the-atlas-of-agent-design-patterns-part-1/08-autonomy-controllability-spectrum.png)

> **Figure 1-8｜Agent Autonomy and System Control**
> 二維矩陣同時呈現 Agent Autonomy 與 System Control and Predictability。Multi-Agent 是組織選擇，可以存在於多種自主度，不是固定的一個成熟度階段。

---

## 如何完整描述一套 Agent？

以一個 Production RAG 為例，只說「我們使用 ReAct」仍然不夠。

可以改成：

| 維度 | 架構選擇 |
|---|---|
| 執行路徑 | Router + Stateful Workflow |
| 決策與規劃 | 簡單 Query 使用固定流程，複雜 Query 使用 Plan-and-Execute |
| 工具執行 | Retrieval 節點內使用有限制的 ReAct |
| 推理與探索 | Multi-query Retrieval + Generate-and-Rank |
| 驗證與修正 | Citation Verifier + Faithfulness Check + Bounded Retry |
| Agent 組織 | Single Agent，必要時呼叫專用工具 |
| 狀態與記憶 | Working State + Procedural Memory |
| 治理 | Budget Guard + Tool Allowlist + Timeout |

這段描述已經可以回答：

- 哪些流程固定
- 哪些節點允許自主決策
- 做錯後如何發現
- 最多重試幾次
- Agent 可以使用哪些工具
- 狀態保存在哪裡
- 成本如何受控

這才是一套可以進行架構討論的描述。

---

## 六個維度的完整速查表

| 維度 | 代表模式 | 適合解決 | 常見風險 |
|---|---|---|---|
| 執行路徑 | Pipeline、Router、State Machine、DAG | 控制任務整體流程 | 流程僵硬、分支爆炸、狀態混亂 |
| 決策與規劃 | ReAct、Plan-and-Execute、Adaptive Planning | 決定下一步行動 | 繞圈、計畫過時、無限重新規劃 |
| 推理與探索 | Self-consistency、ToT、GoT、LATS | 搜尋多種候選解法 | 成本高、評分器不可靠 |
| 驗證與修正 | Retry、Verifier、Generate-and-Test、Reflexion | 發現錯誤並恢復 | 假綠燈、重複失敗、記憶污染 |
| Agent 組織 | Single、Supervisor、Debate、Blackboard、Swarm | 分工與協作 | 重工、交接損失、責任不清 |
| 狀態與記憶 | Working、Episodic、Semantic、Procedural | 保存進度、知識與經驗 | 過期、衝突、檢索錯誤、隱私問題 |

---

## 看到新的 Agent 名詞時，先問六個問題

Agent 領域經常出現新名詞。

有些是新的研究方法，有些是既有模式的重新組合，也有些只是產品包裝。

不需要先背名稱，可以先問：

1. **它改變了任務的執行路徑嗎？**
2. **它改變了下一步的決策方式嗎？**
3. **它是否同時探索多個候選解法？**
4. **它如何驗證與修正錯誤？**
5. **它增加了新的 Agent 角色或協作方式嗎？**
6. **它保存了哪些狀態、知識或失敗經驗？**

如果六個問題都答不出來，那個新名詞可能還不足以構成一套清楚的架構方法。

如果能回答，就可以把它放回既有地圖裡比較，而不是再建立一座孤立的名詞島。

---

## 本篇結論

ReAct 和 Plan-and-Execute 都很重要，但它們只處理 Agent 架構中的一個維度：

> 下一步如何決定。

一套完整 Agent 還需要處理：

- 任務怎麼流動
- 多種方案怎麼探索
- 錯誤怎麼被發現
- 失敗後怎麼恢復
- 一個或多個 Agent 如何分工
- 狀態、知識和經驗怎麼保存

因此，選擇 Agent 架構時，不必先問：

> 哪一種模式最好？

先把任務放進六個維度，逐層回答：

```text
流程怎麼走？
下一步怎麼決定？
候選解法怎麼搜尋？
結果怎麼驗證？
工作由誰完成？
狀態與經驗怎麼保存？
```

這六個問題回答完，架構通常已經浮出輪廓。

下一篇會先深入第一個維度：

> Agent 的任務到底怎麼走？

Part 2 將完整比較 Direct、Pipeline、Router、State Machine、DAG、Event-driven 與 Human-in-the-loop，並說明哪些情況根本不需要 Agent。
