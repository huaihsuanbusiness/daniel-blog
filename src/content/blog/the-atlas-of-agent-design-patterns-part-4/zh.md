---
title: "Agent 設計模式圖鑑 Part 4｜從一條思路到搜尋整片解法空間：CoT、ToT、GoT 與 LATS"
description: "完整比較 Single-path Reasoning、Chain of Thought、Self-consistency、Generate-and-Rank、Beam Search、Tree of Thoughts、Graph of Thoughts、MCTS、LATS、Case-based Reasoning 與 Neuro-symbolic Reasoning。"
date: 2026-06-30T20:05:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 4
---

前幾篇分別回答了：

- 任務從開始到結束怎麼走？
- Agent 如何決定下一步？
- Planner、ReAct 與 Adaptive Planning 如何合作？

這一篇要進入第三個維度：

> 當一個問題存在多種可能解法時，Agent 應該如何探索？

有些任務幾乎不需要探索。

例如：

- 翻譯一句話
- 將資料轉成固定 JSON
- 根據單一文件回答明確問題
- 呼叫 Calculator 計算數值
- 查詢一個已知資料欄位

但另一些任務沒有唯一、顯而易見的路徑：

- 一個程式錯誤可能有多種根因
- 一套系統可能有多種架構方案
- 一份研究報告可能有不同分析框架
- 一個 Browser Agent 可能有多條操作路線
- 一個複雜計畫可能有多種執行順序
- 一道數學題可能有多條推導方式

如果 Agent 在最開始就選定一條路，再一路走到底，早期的一個錯誤判斷可能污染後續所有結果。

因此，系統可以選擇：

1. 產生多個候選
2. 評估候選品質
3. 保留較有希望的方向
4. 淘汰不合理的分支
5. 必要時回到前面的節點
6. 合併不同路徑的資訊
7. 根據環境回饋調整搜尋方向
8. 在成本耗盡前選出最終結果

這就是從 Single-path Reasoning，一路走向 Self-consistency、Generate-and-Rank、Tree of Thoughts、Graph of Thoughts，以及 LATS 的能力演進。

---

## 推理、規劃與搜尋有什麼不同？

這三個概念經常同時出現，但它們解決的問題不同。

## 推理：如何得到下一個結論？

推理關心：

> 根據目前已知資訊，可以推出什麼？

例如：

```text
所有 Enterprise 方案都支援 SSO
Plan X 是 Enterprise 方案

因此：
Plan X 支援 SSO
```

這是一段從資訊到結論的推導。

## 規劃：為了完成目標，要做哪些事？

規劃關心：

> 完成任務需要哪些步驟，以及順序如何安排？

例如：

```text
1. 找到官方定價
2. 比較核心功能
3. 檢查部署限制
4. 分析適用客群
5. 整理推薦
```

Plan-and-Execute、Adaptive Planning 與 HTN，主要屬於這一層。

## 搜尋：存在多條路時，要探索哪一條？

搜尋關心：

> 當有多個候選解法時，應該展開哪些、淘汰哪些、保留哪些？

例如：

```text
修復方案 A
修復方案 B
修復方案 C
       ↓
評估與測試
       ↓
選擇最有希望的方案
```

一套 Agent 可以同時：

- 使用 Planner 拆解任務
- 使用 ReAct 執行工具
- 使用 Tree Search 探索多個方案
- 使用 Verifier 判定哪一條路通過

因此，規劃和搜尋不是二選一。

Planner 決定有哪些工作要做；Search 決定一個問題有多個可能解法時，哪一條值得繼續。

---

## 一、Single-path Reasoning：沿著一條路走到底

Single-path 是最簡單的推理方式。

```text
Problem
  ↓
Intermediate Step 1
  ↓
Intermediate Step 2
  ↓
Intermediate Step 3
  ↓
Answer
```

系統只保留一條主要路徑。

每一步都建立在前一步的結果上，不會同時探索替代方案。

## 適合 Single-path 的情境

- 問題簡單
- 答案明確
- 錯誤成本低
- 延遲要求高
- 後續有可靠外部驗證
- 探索其他候選的價值不高

例如，Agent 產生一段 SQL，然後交給資料庫執行。

即使生成時只走一條路，只要後面有：

- Read-only Policy
- SQL Parser
- Execution Test
- Result Validation

Single-path 仍然可能非常可靠。

## Single-path 的限制

### 早期錯誤會一路傳下去

如果第一個中間判斷錯了，後面所有步驟可能都建立在錯誤前提上。

### 不會主動比較其他方案

第一個看起來合理的解法，不一定是最佳解法。

### 容易被生成順序鎖定

模型一旦選擇某個方向，後續內容通常會沿著那個方向繼續，而不是重新打開其他可能性。

---

## 二、Chain of Thought：讓一條路變得更完整

Chain of Thought，簡稱 CoT，讓模型在產生最終答案前，生成一系列中間推理步驟。

```text
Problem
  ↓
Intermediate Reasoning
  ↓
Intermediate Reasoning
  ↓
Answer
```

CoT 的核心仍然是一條路。

它可以讓推理過程更完整，但本身並不代表系統具備：

- 多候選探索
- 候選比較
- 分支剪枝
- 回溯
- 搜尋控制器
- 環境回饋

因此：

> **CoT 是一條被展開的推理鏈，不是一棵搜尋樹。**

## CoT 適合什麼？

- 多步驟數學問題
- 條件推理
- 邏輯整理
- 複雜問題拆解
- 需要中間結構的分析

## CoT 的限制

中間步驟寫得很完整，不代表每一步都正確。

更長的推理，也不一定代表更高品質。

在 Production 系統裡，比起保存大量自由文字形式的推理，更適合保存可驗證的結構化資訊：

- 使用了哪個工具
- 選擇了哪一條規則
- 讀取了哪些來源
- 哪些條件通過
- 哪些條件失敗
- 為什麼切換到 Fallback
- Verifier 給出什麼判定

系統真正需要的是可審計的 Decision Record，而不是把所有內部推理原封不動公開。

---

## 三、Self-consistency：多走幾次，再對答案投票

Single-path 只產生一條路。

Self-consistency 則會對同一個問題進行多次獨立生成：

```text
Path A → Answer 42
Path B → Answer 42
Path C → Answer 39
Path D → Answer 42
Path E → Answer 41
```

最後選擇最一致的答案：

```text
Final Answer → 42
```

它的核心直覺是：

> 如果多條不同推理路徑都抵達相同答案，那個答案可能更可靠。

## Self-consistency 的基本流程

```text
Problem
  ↓
Sample Multiple Paths
  ↓
Extract Final Answers
  ↓
Normalize Equivalent Answers
  ↓
Vote
  ↓
Final Answer
```

## 適合 Self-consistency 的任務

- 有相對明確的答案
- 答案容易標準化
- 可以透過投票比較
- 多條推理方式可能得到相同結論

例如：

- 數學題
- 選擇題
- 短答案推理
- 分類
- 固定量表評分

## 不適合的任務

- 開放式文章
- 架構設計
- 多個答案都可能合理
- 難以判斷答案是否等價
- 少數高品質答案可能勝過多數普通答案

## 多數不等於真實

假設五條路徑都依賴同一份錯誤資料，它們可能非常一致地答錯。

Self-consistency 主要降低的是生成中的偶發不穩定，不能取代：

- 事實查證
- 工具執行
- 來源驗證
- 真實測試

## Production Self-consistency 需要什麼？

| 元件 | 作用 |
|---|---|
| Sampling Count | 決定生成幾條路徑 |
| Diversity Policy | 避免候選過度相似 |
| Answer Normalization | 統一答案格式 |
| Semantic Grouping | 合併語意相同答案 |
| Agreement Threshold | 設定最低一致度 |
| Tie-breaking Rule | 處理平票 |
| Abstain Condition | 一致度不足時不強答 |
| Budget Limit | 控制生成成本 |

例如：

```text
Agreement ≥ 70%
  → Accept

Agreement < 70%
  → Send to Verifier
```

---

## 多候選、多路徑搜尋與 Multi-Agent 是三件不同的事

這是本篇最重要的概念邊界之一。

產生五個答案，不代表系統使用了五個 Agent。

同一個 Agent 也可以：

- 生成五個候選
- 建立一棵搜尋樹
- 對候選進行評分
- 回溯並重新探索

反過來，多個 Agent 也可能完全沒有探索不同解法，只是各自執行固定工作。

| 情況 | 多候選 | 多路徑搜尋 | Multi-Agent |
|---|---:|---:|---:|
| 同一模型生成五個答案 | 是 | 不一定 | 否 |
| 同一 Agent 執行 Tree Search | 是 | 是 | 否 |
| 三個 Worker 各讀一份文件 | 有多個輸出 | 不一定 | 是 |
| 三個 Agent 提出不同方案，再由 Judge 選擇 | 是 | 是 | 是 |
| Supervisor 將固定任務分派給 Worker | 不一定 | 不一定 | 是 |

Multi-Agent 描述的是：

> 有多少個獨立角色或執行單位在合作。

多路徑搜尋描述的是：

> 系統是否探索多個候選解法。

這兩個維度可以重疊，但不是同一件事。

![Figure 4-1 — Line, Tree, and Graph Reasoning Structures](/images/the-atlas-of-agent-design-patterns-part-4/line-tree-graph-reasoning-structures.png)

> **Figure 4-1｜Line, Tree, and Graph Reasoning Structures**  
> Line 只保留一條路；Tree 允許分支、剪枝與回溯；Graph 則能讓不同路徑重新合併並重用中間結果。多條路徑本身不等於 Multi-Agent。

---

## 四、Generate-and-Rank：先提出候選，再依標準排序

Self-consistency 主要看哪個答案最常出現。

Generate-and-Rank 則先產生多個候選，再根據品質標準進行排序。

```text
Problem
  ↓
Generate Candidates
  ├─ Candidate A
  ├─ Candidate B
  ├─ Candidate C
  └─ Candidate D
  ↓
Evaluate
  ↓
Rank
  ↓
Select
```

## 適合 Generate-and-Rank 的任務

- 架構設計
- 文案選擇
- Query Rewrite
- 程式修復
- SQL 生成
- Tool Selection
- 計畫生成
- RAG 答案候選
- UI 或產品方案比較

## Self-consistency 與 Generate-and-Rank 的差別

| 比較項目 | Self-consistency | Generate-and-Rank |
|---|---|---|
| 核心方法 | 投票 | 評分與排序 |
| 適合輸出 | 明確答案 | 多種合理方案 |
| 是否需要 Ranker | 不一定 | 需要 |
| 能否選擇少數優秀候選 | 較難 | 可以 |
| 主要風險 | 多數共同犯錯 | Ranker 判斷錯誤 |

## Ranker 可以怎麼做？

### Rule-based Ranker

根據硬性規則淘汰候選：

- JSON 是否合法
- 是否包含 Citation
- SQL 是否唯讀
- 是否包含必要欄位
- 是否超過成本限制

### Model-based Ranker

讓模型依 Rubric 比較候選。

### External Evaluator

使用真實環境驗證：

- Unit tests
- SQL execution
- Compiler
- Browser result
- Retrieval metrics
- Rule engine
- Simulator

### Hybrid Ranker

先用硬性規則淘汰不合格候選，再讓模型比較剩餘方案。

這通常比直接要求模型「選最好的」更可靠。

![Figure 4-2 — Generate-and-Rank](/images/the-atlas-of-agent-design-patterns-part-4/generate-and-rank.png)

> **Figure 4-2｜Generate-and-Rank**  
> Candidate Generator 產生多個候選，依序經過 Hard Validation、External Evaluation 與 Ranking，最後選出最佳方案。重點不只是多生成，而是有可靠的評估標準。

---

## 搜尋系統需要哪些核心元件？

當系統不只在終點比較完整答案，而是在中間持續展開與淘汰候選時，就開始接近真正的 Search System。

一個多路徑搜尋系統通常包含五個核心元件。

## 1. Candidate Generator

負責產生：

- 多個答案
- 多個下一步行動
- 多個子計畫
- 多個程式修補方案
- 多個 Query
- 多個中間推理狀態

## 2. State Representation

負責描述每條路徑目前走到哪裡。

例如：

```text
Completed:
- Found official pricing
- Found deployment documentation

Missing:
- Enterprise limits
- Regional availability
```

如果 State 只是一大段無結構文字，系統會很難比較兩個候選究竟差在哪裡。

## 3. Evaluator

負責評估候選：

- 正確性
- 完整性
- 可執行性
- 成本
- 風險
- 來源品質
- 約束是否滿足
- 與目標的距離

## 4. Search Controller

負責決定：

- 下一個展開哪個候選
- 保留幾個候選
- 何時剪枝
- 何時回溯
- 是否合併分支
- 是否繼續向下探索

## 5. Stopping Rule

負責判斷何時停止：

- 找到通過全部測試的方案
- 達到最低品質門檻
- 搜尋時間耗盡
- Token Budget 耗盡
- 已探索最大節點數
- 最佳分數長時間沒有改善
- 所有候選都不可行

如果沒有可靠 Evaluator，多路徑系統只是在生成更多文字。

如果沒有 Stopping Rule，搜尋樹則可能一路長到 Token 帳單開始進行光合作用。

---

## 五、Beam Search：每一層只保留前 K 個候選

完整展開所有分支通常太昂貴。

Beam Search 的做法是：

> 每一層產生多個候選，但只保留分數最高的前 K 個。

假設 Beam Width 為 2：

```text
                    Start
              ┌──────┼──────┐
             A       B       C
             8       7       3
              ↓
           保留 A、B
          ┌──┴──┐  ┌──┴──┐
         A1    A2 B1     B2
          6     9  8      4
              ↓
          保留 A2、B1
```

## 核心參數

### Beam Width

每一層保留幾個候選。

K 越小：

- 成本較低
- 搜尋範圍較窄
- 更容易錯過早期低分、後期高價值的方案

K 越大：

- 探索較廣
- 成本較高
- 逐漸接近完整樹搜尋

### Scoring Function

候選如何評分。

### Maximum Depth

最多探索幾層。

### Termination Condition

什麼情況停止。

## Beam Search 的定位

Beam Search 可以看成：

> Generate-and-Rank 與完整 Tree Search 之間的受限搜尋。

Generate-and-Rank 通常在完整候選生成後才排序。

Beam Search 則會在中間每一層持續評估與淘汰候選。

## 主要風險

### 局部高分不代表最終最好

某個候選在早期看起來普通，後續可能通往最佳結果。

Beam Search 可能過早把它刪除。

### 候選缺乏多樣性

前 K 名可能只是相同方案的不同措辭。

可以加入：

- Semantic Deduplication
- Diversity Penalty
- Category Quota
- Novelty Score

---

## 六、Tree of Thoughts：分支、評估、剪枝與回溯

Tree of Thoughts，簡稱 ToT，將問題解決過程表示成一棵樹。

```text
                     Start
                ┌─────┼─────┐
              Thought A   Thought B   Thought C
               ┌──┴──┐      │        ┌──┴──┐
              A1    A2      B1       C1    C2
```

每個 Thought 不是單一 Token，而是一個有意義的中間狀態，例如：

- 一個子目標
- 一個部分解法
- 一個候選計畫
- 一個數學中間結果
- 一個程式修改方向
- 一組已完成的操作

## ToT 的基本流程

```text
Current State
  ↓
Generate Candidate Thoughts
  ↓
Evaluate Candidates
  ↓
Select Promising Branches
  ↓
Expand
  ↓
Backtrack if Necessary
```

## CoT 和 ToT 差在哪裡？

| 能力 | Chain of Thought | Tree of Thoughts |
|---|---:|---:|
| 中間推理步驟 | 有 | 有 |
| 同時保留多條路徑 | 否 | 是 |
| 評估中間狀態 | 通常沒有 | 有 |
| 剪枝 | 否 | 有 |
| 回溯 | 否 | 有 |
| 搜尋控制器 | 沒有 | 有 |
| 候選狀態管理 | 沒有 | 有 |

CoT 是一條鏈。

ToT 則是一個由以下元件組成的搜尋系統：

- Candidate Generator
- State Representation
- Evaluator
- Search Controller
- Stopping Rule

## ToT 適合什麼任務？

- 早期選擇會影響後續
- 存在多種中間方案
- 可以評估部分解
- 需要回溯
- 搜尋空間可被限制
- 單一路徑失敗成本較高

例如：

- 解謎
- 數學組合問題
- 程式設計
- 排程
- 複雜決策
- 文章結構規劃
- 多步驟方案設計

## Thought 應該多大？

Thought 太小：

```text
每一個 Token 都是一個節點
```

搜尋空間會迅速爆炸。

Thought 太大：

```text
整篇完整答案是一個節點
```

系統又會退化成 Generate-and-Rank。

合適的 Thought 應該：

- 可以獨立評估
- 對後續決策有意義
- 不至於讓樹過深
- 可以保存與比較

例如 Coding Agent 的候選 Thought 可以是：

- 修改 API Retry 邏輯
- 修正資料庫 Transaction
- 增加輸入 Schema Validation

而不是將每一行程式碼變成一個節點。

## ToT 如何評估候選？

### Value Score

直接給候選一個分數。

### Pairwise Comparison

比較兩個候選何者較好。

### Classification

將候選分類為：

- Promising
- Uncertain
- Impossible

### External Testing

使用真實環境：

- 程式編譯
- 單元測試
- Constraint Check
- SQL Execution
- Browser State

外部測試通常比模型自評更可靠。

## ToT 的主要風險

### 搜尋樹快速膨脹

若每個節點產生 5 個候選，深度為 6：

```text
5⁶ = 15,625 個葉節點
```

因此必須限制：

- Branching Factor
- Maximum Depth
- Beam Width
- Total Node Count
- Token Budget
- Tool Budget

### 模型同時當選手和裁判

同一模型生成候選，又評估自己的答案，可能放大相同偏誤。

### 狀態難以去重

不同文字可能代表相同實質狀態。

需要：

- State Canonicalization
- Semantic Deduplication
- Duplicate Branch Detection

![Figure 4-3 — Tree Search: Branching, Pruning, and Backtracking](/images/the-atlas-of-agent-design-patterns-part-4/tree-search-pruning-backtracking.png)

> **Figure 4-3｜Tree Search: Branching, Pruning, and Backtracking**  
> 搜尋樹從 Root 產生候選分支，Evaluator 對中間狀態評分；低價值分支被 Prune，失敗路徑則 Backtrack，最後保留通過驗證的解法。

---

## 七、Graph of Thoughts：思路不只分叉，也可以重新合併

Tree of Thoughts 通常假設每個節點只有一個主要父節點。

但有些問題不是純樹狀。

例如，競爭分析可能有三條研究路徑：

```text
Pricing Analysis
Feature Analysis
Customer Analysis
```

最後的產品定位結論，需要同時整合三條路徑。

Graph of Thoughts，簡稱 GoT，允許：

- 一個節點依賴多個前置節點
- 不同思路重新合併
- 中間結果重複使用
- 多個候選被聚合
- 某個結果被重新轉換或精煉

```text
Pricing ─────┐
             ├→ Positioning Analysis
Features ────┤
             │
Customers ───┘
```

## Tree 和 Graph 的差別

| 比較項目 | Tree of Thoughts | Graph of Thoughts |
|---|---|---|
| 節點父級 | 通常一個 | 可以多個 |
| 分支合併 | 較不自然 | 核心能力 |
| 中間結果重用 | 較弱 | 強 |
| 主要結構 | 階層樹 | 有向圖 |
| 適合任務 | 尋找一條較佳路徑 | 整合多條互補路徑 |
| 管理難度 | 高 | 更高 |

## GoT 常見操作

### Generate

從一個節點產生多個候選。

### Aggregate

將多個節點合併成新結果。

### Refine

根據回饋改善一個既有節點。

### Reduce

將多個冗長結果壓縮成較小表示。

### Transform

把資訊轉成另一種格式或分析視角。

## 適合 GoT 的任務

- 多來源研究
- 跨文件整合
- 競爭分析
- 需求分析
- 多角色意見整合
- 長篇報告
- 多階段內容生成
- 需要重用中間結果的工作

## GoT 的主要風險

### 依賴關係更複雜

系統需要知道：

- 哪個節點依賴哪些結果
- 上游內容更新後，哪些節點失效
- 哪些資料已經被聚合
- 哪些分支存在衝突

### 合併可能稀釋重要資訊

Aggregator 可能把少數但重要的觀點壓掉。

### 中間資料容易重複

多條分支可能引用同一份資料，讓結果看似有多個證據，其實只是同一來源被重複包裝。

### 循環需要受到限制

如果節點可以互相修改，必須設定：

- Cycle Limit
- Versioning
- Convergence Rule
- Update Policy

---

## 八、MCTS 與 LATS：把 Agent 行動變成搜尋問題

Tree of Thoughts 主要處理中間 Thought。

但真正的 Agent 不只在文字中推理，它還會：

- 呼叫工具
- 修改程式
- 執行測試
- 操作 Browser
- 查詢資料庫
- 觀察環境狀態

這時，搜尋的對象不再只是「想法」，而是：

> 一連串可以在環境中執行的行動。

## MCTS 的四個核心階段

Monte Carlo Tree Search 通常可以概括為四個循環階段。

### 1. Selection

從 Root 開始，選擇一條值得繼續探索的路徑。

系統通常會平衡：

- 已知表現較好的分支
- 尚未充分探索的分支

### 2. Expansion

在選中的節點下新增一個或多個候選行動。

### 3. Simulation 或 Evaluation

向前模擬、執行或評估這個分支可能帶來的結果。

在 LLM Agent 裡，這一步不一定是完整隨機模擬，也可能是：

- 模型 Value Estimate
- 工具執行
- 測試結果
- 環境 Observation
- Verifier Score

### 4. Backpropagation

把結果分數沿著路徑向上回傳，更新上游節點的價值估計。

```text
Selection
  ↓
Expansion
  ↓
Simulation / Evaluation
  ↓
Backpropagation
  ↓
Next Search Iteration
```

## LATS 加入了什麼？

Language Agent Tree Search，簡稱 LATS，將語言 Agent 的能力放進樹搜尋架構。

搜尋節點可能包含：

```text
Environment State
+ Action History
+ Observation
+ Reflection
+ Value Estimate
```

基本流程可以理解為：

```text
Current State
  ↓
Generate Candidate Actions
  ↓
Select an Action
  ↓
Act in Environment
  ↓
Observe Result
  ↓
Evaluate and Reflect
  ↓
Update Search Tree
  ↓
Expand or Backtrack
```

## ToT 和 LATS 的差別

| 比較項目 | Tree of Thoughts | LATS |
|---|---|---|
| 主要搜尋對象 | Thought | Action and Environment State |
| 是否需要工具 | 不一定 | 通常需要 |
| 是否取得外部回饋 | 可選 | 核心能力 |
| 節點內容 | 中間推理狀態 | 行動、觀察、反思、價值 |
| 適合場景 | 解題與方案探索 | Coding、Browser、互動環境 |
| 評估方式 | 模型或規則 | 環境回饋 + 模型評估 |

## Coding Agent 範例

目標：

> 修復一個整合測試失敗。

候選方向：

```text
A. 修改輸入驗證
B. 修改資料庫查詢
C. 調整 Authentication 設定
```

探索分支 A：

```text
Apply Patch
  ↓
Run Tests
  ↓
3 Tests Still Fail
```

探索分支 C：

```text
Apply Patch
  ↓
Run Tests
  ↓
Target Tests Pass
```

真實測試結果成為搜尋回饋。

這比要求模型自行判斷「哪個方案看起來比較合理」更可靠。

## Browser Agent 範例

目標是完成網站操作。

候選行動：

- 點擊搜尋框
- 開啟篩選器
- 返回上一頁
- 修改 URL
- 捲動尋找按鈕

每次行動後，Agent 取得新的畫面或 DOM State，再判斷是否更接近目標。

## LATS 的主要限制

### 真實執行成本高

每個分支可能都需要：

- 呼叫 API
- 執行測試
- 建立 Sandbox
- 操作 Browser
- 保存與恢復狀態

### 有些行動不可逆

不能為了探索五條路徑，真的：

- 寄出五封 Email
- 建立五筆付款
- 刪除五次資料
- 修改五次 Production

不可逆操作必須放在：

- Sandbox
- Mock Environment
- Temporary Branch
- Test Database
- Human Approval Gate

### Value Function 容易被鑽漏洞

如果 Coding Agent 的唯一目標是「讓測試通過」，它可能直接刪掉測試。

因此，評分不能只看短期成功，還要考慮：

- 是否遵守約束
- 是否產生副作用
- 是否可維護
- 是否破壞其他功能
- 是否超過成本
- 是否通過完整測試

![Figure 4-4 — MCTS and LATS Search Loop](/images/the-atlas-of-agent-design-patterns-part-4/mcts-lats-search-loop.png)

> **Figure 4-4｜MCTS and LATS Search Loop**  
> Search Controller 進行 Selection 與 Expansion，Agent 在 Sandbox Environment 執行 Action，取得 Observation、Test Result、Reflection 與 Value，再將結果 Backpropagate 至搜尋樹。

---

## 九、Case-based Reasoning：先找相似案例

不是每一個問題都需要從零開始搜尋。

Case-based Reasoning 的基本流程是：

```text
New Problem
  ↓
Retrieve Similar Cases
  ↓
Compare Conditions
  ↓
Adapt Previous Solution
  ↓
Verify in Current Context
```

## Case 和一般知識有什麼不同？

一般知識：

```text
API 401 通常和 Authentication 有關。
```

案例：

```text
在 Project X 中，401 的原因是 Token Audience 錯誤。
修正 OAuth Configuration 後恢復。
```

案例通常包含：

- 問題情境
- 當時採取的行動
- 執行結果
- 失敗原因
- 適用條件
- 後續教訓

## 適合的任務

- 客服
- 故障診斷
- IT Operations
- 程式錯誤修復
- 維修
- 法律案例研究
- 企業 SOP
- 重複出現的業務問題

## 主要風險

### 表面相似，條件不同

相同錯誤訊息，不一定代表相同根因。

### 舊案例可能過期

產品版本、API、法規與組織流程可能已改變。

### 直接複製，沒有適配

正確流程應該是：

```text
Retrieve
  ↓
Compare Conditions
  ↓
Adapt
  ↓
Verify
```

而不是找到最像的案例就照抄。

---

## 十、Neuro-symbolic Reasoning：讓 LLM 與規則和 Solver 合作

LLM 擅長：

- 理解自然語言
- 處理模糊描述
- 生成候選
- 對非結構化資訊歸納
- 解釋結果

符號系統擅長：

- 精確規則
- 數學計算
- 邏輯約束
- 可重現執行
- 一致性檢查
- 路徑搜尋

Neuro-symbolic 系統會將兩者結合：

```text
Natural-language Problem
  ↓
LLM Parses Requirements
  ↓
Structured Representation
  ↓
Rule Engine / Solver / Program
  ↓
Verified Result
  ↓
LLM Explains Result
```

## 常見組合

- LLM + SQL
- LLM + Python
- LLM + Constraint Solver
- LLM + Rule Engine
- LLM + Knowledge Graph
- LLM + Planning Engine

## 範例：會議排程

使用者提出：

> 幫五個人安排會議，每個人只能在特定時段參加，而且會議室不能重複使用。

LLM 可以：

1. 解析人員、時段與限制
2. 將限制轉成結構化 Constraint
3. 交給 Solver 求解
4. 將結果轉回自然語言

這通常比讓模型單純在文字中猜一個排程可靠。

## 最大風險

Solver 可以精確執行規則。

但如果 LLM 一開始轉換出的 Constraint 錯了，Solver 只會：

> 精確地解出錯誤問題。

因此，每一層都要驗證：

- 自然語言是否被正確解析
- Constraint 是否完整
- Solver 是否成功
- 最終解釋是否忠於 Solver Result

---

## Evaluator 才是搜尋系統的地基

多路徑系統最容易被高估的是 Candidate Generator。

真正困難的部分通常是：

> 系統如何知道哪個候選比較好？

如果 Generator 很強，但 Evaluator 很弱，好答案可能已經被生成出來，系統卻把它淘汰了。

Evaluator 可以分成四層。

## 第一層：硬性格式與規則

- JSON 是否合法
- 必要欄位是否存在
- SQL 是否唯讀
- 是否超過成本
- 是否使用允許工具

## 第二層：可執行測試

- 程式是否編譯
- 測試是否通過
- Query 是否可執行
- API 是否返回預期結果
- Constraint 是否滿足

## 第三層：事實與來源驗證

- Claim 是否有來源支持
- Citation 是否對應
- 是否使用過期資訊
- 是否漏掉必要要求

## 第四層：偏好與品質排序

- 可讀性
- 維護性
- 完整性
- 風格
- 商業適用性

合理順序應該是：

```text
Hard Validation
  ↓
External Tests
  ↓
Factual Verification
  ↓
Preference Ranking
```

不要讓一段語氣漂亮但測試失敗的程式碼，靠文筆奪冠。

---

## 多樣性也需要設計

生成十個候選，不代表系統真的探索了十個方向。

例如：

```text
方案 A：使用 Redis Cache
方案 B：加入 Redis 快取
方案 C：透過 Redis 進行快取
```

這三個候選只是在重述同一個方案。

## 增加真正多樣性的方法

### 使用不同評估視角

- Performance
- Security
- Cost
- Maintainability
- User Experience

### 使用不同約束

- Lowest Cost
- Lowest Latency
- Simplest Implementation
- Highest Reliability
- Minimum Change

### 使用不同方案類別

- Rule-based
- Retrieval-based
- Database-based
- Event-driven
- Agent-based

### Semantic Deduplication

先將實質相同的候選合併。

### Category Quota

要求至少保留：

- 一個最低成本方案
- 一個最高可靠方案
- 一個最小修改方案
- 一個長期架構方案

這通常比單純提高 Temperature 更可控。

---

## 什麼任務值得付出多路徑搜尋成本？

多路徑方法不應該成為預設。

可以先問以下問題。

## 1. 問題真的存在多個重要候選嗎？

如果答案明確，Single-path 可能就足夠。

## 2. 早期選擇會影響後續嗎？

如果選錯第一步會讓整條路徑失敗，Tree Search 的價值較高。

## 3. 中間狀態可以被評估嗎？

如果連部分解都無法評分，搜尋控制器也不知道該保留哪條路。

## 4. 最終結果可以被外部驗證嗎？

例如：

- Unit tests
- Compiler
- Database
- Browser State
- Rule Engine
- Citation Check

外部訊號越可靠，搜尋越有價值。

## 5. 探索行動是否安全？

不可逆操作不適合自由搜尋。

## 6. 額外品質值得額外成本嗎？

搜尋通常呈現邊際效益遞減：

- 前幾個候選可能快速提高品質
- 後續繼續探索，成本持續增加
- 品質提升逐漸趨緩

![Figure 4-5 — Search Cost and Answer Quality](/images/the-atlas-of-agent-design-patterns-part-4/search-cost-answer-quality.png)

> **Figure 4-5｜Search Cost and Answer Quality**  
> 從 Single-path 到 Generate-and-Rank、Beam Search 與 Tree Search，品質可能提升，但成本也持續上升，後段通常出現 Diminishing Returns。

---

## 搜尋成本如何控制？

假設每個節點產生 4 個候選，搜尋深度為 5。

完整展開可能產生：

```text
4⁵ = 1,024 個葉節點
```

這還沒計算：

- 候選生成成本
- 評估成本
- 工具呼叫成本
- Context 儲存
- State Persistence
- 去重
- 回溯
- 最終整合

Production 系統通常會設定：

| 限制 | 作用 |
|---|---|
| Max Candidates | 限制總候選數 |
| Max Branching Factor | 限制每個節點的子分支 |
| Max Depth | 限制搜尋深度 |
| Beam Width | 限制每層保留數 |
| Max Tool Calls | 限制工具使用量 |
| Max Tokens | 控制模型成本 |
| Max Wall Time | 控制執行時間 |
| Early Stop | 找到合格方案後立即停止 |
| No-improvement Limit | 多輪無改善時停止 |
| Cost-aware Score | 把成本納入評分 |

最佳候選不一定是品質分數最高的候選。

Production 系統可能選擇：

```text
Quality: 92
Cost: 5
```

而不是：

```text
Quality: 93
Cost: 50
```

多出來的一分，未必值得十倍成本。

---

## 各搜尋策略完整比較

| 模式 | 候選數量 | 中途評估 | 剪枝 | 回溯 | 分支合併 | 外部回饋 | 成本 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Single-path | 1 | 少 | 否 | 否 | 否 | 可搭配 | 低 |
| Self-consistency | 多個完整答案 | 通常否 | 否 | 否 | 投票聚合 | 通常否 | 中～高 |
| Generate-and-Rank | 多個完整候選 | 最後評估 | 可淘汰 | 通常否 | 通常選一個 | 可搭配 | 中～高 |
| Beam Search | 每層保留 K 個 | 是 | 是 | 有限 | 通常否 | 可搭配 | 高 |
| Tree of Thoughts | 多分支 | 是 | 是 | 是 | 通常選路徑 | 可搭配 | 高 |
| Graph of Thoughts | 圖狀候選 | 是 | 是 | 可設計 | 是 | 可搭配 | 很高 |
| MCTS / LATS | 行動搜尋樹 | 是 | 是 | 是 | 通常選路徑 | 是 | 很高 |
| Case-based Reasoning | 相似案例 | 案例篩選 | 可淘汰 | 不一定 | 可整合 | 驗證當前情境 | 中 |
| Neuro-symbolic | 結構化候選 | 規則或 Solver | 是 | 視系統 | 視系統 | 精確執行結果 | 中～高 |

---

## 是否需要評分器、回溯與高成本？

| 模式 | 需要評分器 | 能否回溯 | 是否需要外部工具 | 相對成本 |
|---|---:|---:|---:|---:|
| Single-path | 否 | 否 | 否 | 低 |
| Self-consistency | 需要聚合器 | 否 | 否 | 中 |
| Generate-and-Rank | 是 | 否 | 可選 | 中 |
| Beam Search | 是 | 有限 | 可選 | 高 |
| Tree of Thoughts | 是 | 是 | 可選 | 高 |
| Graph of Thoughts | 是 | 可設計 | 可選 | 很高 |
| LATS | 是 | 是 | 通常需要 | 很高 |
| Case-based Reasoning | 需要案例相似度 | 不一定 | 通常需要檢索 | 中 |
| Neuro-symbolic | 需要規則或 Solver | 視系統 | 是 | 中～高 |

---

## 任務類型與策略選擇表

| 任務特性 | 建議方式 |
|---|---|
| 簡單，而且可以外部驗證 | Single-path + Verifier |
| 有明確答案，但單次生成不穩 | Self-consistency |
| 有多個完整方案需要比較 | Generate-and-Rank |
| 每一階段都有很多候選 | Beam Search |
| 需要分支、剪枝與回溯 | Tree of Thoughts |
| 多條路徑需要合併 | Graph of Thoughts |
| 需要在環境中行動並取得回饋 | MCTS / LATS |
| 有大量過去案例可以重用 | Case-based Reasoning |
| 存在硬性規則或數學約束 | Neuro-symbolic Reasoning |

---

## 常見反模式

## 反模式一：任何問題都使用 Tree of Thoughts

簡單任務也建立搜尋樹，只會增加成本與延遲。

## 反模式二：生成很多候選，卻沒有可靠 Evaluator

這不是搜尋，只是堆積草稿。

## 反模式三：把多次生成當成 Multi-Agent

多個 Samples 不等於多個 Agent。

## 反模式四：模型同時生成、評分與驗收

相同偏誤可能貫穿所有階段。

## 反模式五：把投票當成事實驗證

多數答案也可能共同依賴錯誤資料。

## 反模式六：沒有語義去重

搜尋樹裡充滿實質相同、措辭不同的節點。

## 反模式七：沒有 State Canonicalization

兩條路徑已經抵達相同狀態，系統仍把它們當成不同分支。

## 反模式八：只看品質，不計成本

搜尋成本增加十倍，品質可能只提升一點點。

## 反模式九：對不可逆操作進行自由探索

不能為了比較寄信策略，真的寄出五封 Email。

## 反模式十：搜尋沒有停止條件

只要還能產生新候選，Agent 就持續探索。

---

## 一個完整範例：Coding Agent 如何搜尋修復方案

任務：

> 修復一個 API 整合測試失敗。

錯誤：

```text
Expected 200
Received 401
```

## 第一步：建立目前狀態

```text
Known:
- Endpoint exists
- Request reached the server
- Test token was generated

Unknown:
- Token validity
- Audience
- Scope
- Header format
```

## 第二步：產生候選根因

```text
A. Token expired
B. Wrong audience
C. Missing scope
D. Authorization header malformed
```

## 第三步：初步排序

根據設定與錯誤紀錄：

```text
B: 8.2
C: 7.8
A: 5.1
D: 4.9
```

## 第四步：展開候選分支

探索 B：

```text
Inspect token claims
  ↓
Audience does not match API configuration
```

探索 C：

```text
Inspect scope
  ↓
Required scope is already present
```

## 第五步：執行修正與外部測試

```text
Fix Audience Configuration
  ↓
Run Target Integration Test
  ↓
Pass
```

## 第六步：擴大驗證

```text
Run Authentication Test Suite
  ↓
Pass

Run Lint
  ↓
Pass

Run Build
  ↓
Pass
```

## 第七步：停止搜尋

已找到通過全部完成條件的方案，不再展開其他低分分支。

這套流程同時使用：

- Candidate Generation
- Generate-and-Rank
- Tree Expansion
- Environment Feedback
- Generate-and-Test
- Early Stopping

真正讓它可靠的，不是 Agent 想了很多條路。

而是：

> 每一條重要路徑都接受了真實環境的檢驗。

---

## 本篇結論

Agent 探索解法的方式，可以從一條路一路延伸成完整搜尋系統。

- **Single-path Reasoning**：只保留一條主要路徑
- **Chain of Thought**：讓單一路徑包含更多中間步驟
- **Self-consistency**：多次生成，依答案一致度聚合
- **Generate-and-Rank**：產生多個候選，再依標準排序
- **Beam Search**：每層保留前 K 個候選
- **Tree of Thoughts**：分支、評估、剪枝與回溯
- **Graph of Thoughts**：允許不同路徑合併與重用
- **MCTS / LATS**：將 Agent 行動、環境回饋與樹搜尋結合
- **Case-based Reasoning**：從過去相似案例出發
- **Neuro-symbolic Reasoning**：讓 LLM 與規則、程式和 Solver 合作

搜尋越複雜，不代表結果一定越好。

多路徑方法只有在以下條件成立時才值得：

1. 問題真的存在多個重要候選
2. 早期選擇會影響後續結果
3. 系統可以評估中間狀態
4. 搜尋成本受到限制
5. 最終結果可以外部驗證
6. 探索行動不會產生不可逆副作用

最重要的問題不是：

> Agent 可以產生多少條思路？

而是：

> 它如何知道哪一條路值得繼續，以及何時應該停止？

下一篇，我們會進入第四個維度：

> Agent 怎麼知道自己做錯了？

Part 5 將完整比較 Retry、Fallback、Self-Refine、Critic、Verifier、Generate-and-Test、Replanning 與 Reflexion，並說明為什麼真正的驗證不能只靠模型說「我重新檢查過了」。
