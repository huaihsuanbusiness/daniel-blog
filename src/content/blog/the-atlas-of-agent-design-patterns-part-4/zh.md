---
title: "Agent 設計模式圖鑑 Part 4｜從單一路徑到 Tree、Graph、MCTS 與 LATS"
description: "從 Single-path、Chain-of-Thought、Self-consistency、Generate-and-Rank、Beam Search、Tree of Thoughts、Graph of Thoughts，到 MCTS、LATS、Evaluator、Diversity、Stopping Rule 與 Search Budget，完整拆解 Production Agent 如何探索候選解法。"
date: 2026-06-22T09:00:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 4
---


Part 3 討論 Agent 如何決定下一步：

- 遵循固定邏輯
- 根據最新 Observation 反應
- 先建立顯式 Plan
- 在執行中修改剩餘 Plan
- 以 Hierarchy 拆解大型 Goal

這一篇處理另一個問題：

> 當系統面前存在多個候選解法或行動序列時，應如何探索、比較，以及決定何時停止？

有些任務幾乎不需要 Search：

- 翻譯一句話
- 抽取固定欄位
- 呼叫已知的 Calculator
- 從單一權威紀錄回答
- 把資料轉成指定 Schema

另一些任務則有真正重要的替代路徑：

- Bug 有多個合理 Root Cause
- 系統架構有多種可辯護設計
- Browser Task 有多種 Action Sequence
- Plan 有不同 Decomposition
- 數學問題有不同推導
- 報告可以採取不同分析框架

選擇第一條看起來合理的路最便宜；當早期選擇會大幅影響最後結果時，也最脆弱。

具備 Search 能力的系統可以：

1. 產生多個 Candidate State 或 Action
2. 評估 Candidate
3. 保存有希望的 Branch
4. Prune 無效或低價值 Branch
5. Branch 失敗時 Backtrack
6. Merge 互補的中間結果
7. 根據 Environment Feedback 更新搜尋方向
8. 在品質、風險與 Budget 條件滿足時停止

真正困難的不是產生更多文字，而是維持可信的 Search Process。

## Reasoning、Planning、Search 與 Evaluation 是不同層

這幾個名詞常一起出現，但它們回答不同問題。

### Reasoning

Reasoning 從目前資訊推導結論：

```text
所有 Enterprise Plan 都支援 SSO
Plan X 是 Enterprise Plan
因此 Plan X 支援 SSO
```

### Planning

Planning 選擇可能把 Current State 帶到 Goal 的 Task 或 Action：

```text
收集官方證據
  -> 比較能力
  -> 驗證限制
  -> 產生建議
```

### Search

Search 管理替代路徑：

- 哪個 State 應該 Expand
- 哪個 Candidate 應該保留
- 哪個 Branch 應該 Prune
- 是否 Backtrack
- 是否 Merge Result
- 何時停止

### Evaluation

Evaluation 估計某個 State、Action 或完整 Solution 是否有效、有用、安全或較佳。

同一套系統可以同時使用四者：

```text
Planner 定義工作
  -> Search Controller 探索 Candidate
  -> Executor 執行 Action
  -> Evaluator 評分結果
  -> Verifier 驗收最終 Outcome
```

這些名稱不能互換。Planner 可以只產生一份 Plan 而完全沒有探索替代方案；Search Controller 可以探索多份 Candidate Plan；Verifier 也可以把它們全部拒絕。

## Search System 的五個核心組件

在比較各種 Named Method 之前，先看它們需要的機械結構。

### Candidate Generator

產生可能的：

- Answer
- Intermediate State
- Next Action
- Plan
- Code Patch
- Query
- Decomposition

### State Representation

記錄每個 Candidate 真正代表的狀態。

有效 State 可以包括：

```text
Goal Progress
Known Facts
Unresolved Requirements
Actions Already Taken
Evidence and Provenance
Cost Used
Policy Status
Environment State
```

如果 State 只是一段沒有結構的 Conversation Transcript，系統很難辨識和比較實際上等價的 Branch。

### Evaluator

以以下訊號評估或分類 Candidate：

- Hard Constraint
- Executable Test
- Factual Evidence
- Goal Progress
- Risk
- Cost
- Preference
- Maintainability
- Policy Compliance

### Search Controller

決定：

- 下一個 Expand 的 Candidate
- 每個 Node 產生多少 Child
- 哪些 Branch 存活
- 何時 Prune
- 何時 Backtrack
- 是否 Merge
- 如何平衡 Exploration 與 Exploitation

### Stopping Rule

在以下情況結束：

- 找到可驗收 Solution
- Quality 超過門檻
- 沒有 Feasible Candidate
- Budget 耗盡
- 達到 Max Depth 或 Node Count
- 長時間沒有 Improvement
- 不可逆 Action 需要 Approval
- Task Blocked 或 Unsupported

沒有 Evaluator，多條路只是一疊 Draft；沒有 Stopping Rule，Search Space 會長成一片昂貴灌木林。

![Figure 4-1 — Anatomy of a Multi-Path Search System](/images/the-atlas-of-agent-design-patterns-part-4/line-tree-graph-reasoning-structures.png)

> **Figure 4-1｜Anatomy of a Multi-Path Search System**  
> 從 Problem 或 Current State 開始，依序經過 Candidate Generator、Search Frontier、Evaluator、Stopping Rule 與 Backtrack／Merge，最終輸出 Accepted Solution 或判定為 Blocked。Search 的每一步都依賴前一步的結果，不是一條平直的 Chain。


## Single-path Reasoning 與 Chain-of-Thought

Single-path System 只保存一條主要 Trajectory：

```text
Problem
  -> Intermediate State
  -> Intermediate State
  -> Answer
```

這常常是最正確的 Baseline。

### 一條路就足夠的情況

- 任務簡單
- Latency 很重要
- Environment 提供強 External Verifier
- 探索其他 Candidate 沒有多少價值
- 第一次選錯方向的成本低

例如系統只產生一條 SQL，再依賴：

- Read-only Connection
- Parser
- Execution
- Result Check
- Query Limit

可靠性來自 Verifier 與 Execution Boundary，而不是產生五條 SQL。

### Chain-of-Thought 不是 Search Tree

Chain-of-Thought Prompting 鼓勵模型在答案前產生 Intermediate Reasoning Step。原始研究顯示，這種 Prompting 可以改善多步推理任務表現。

它的基本形狀仍是一條 Chain：

```text
Prompt
  -> Intermediate Reasoning
  -> Intermediate Reasoning
  -> Answer
```

Chain-of-Thought 本身不提供：

- 多個持久 Candidate
- Search Frontier
- Branch Scoring
- Pruning
- Backtracking
- State Merging
- Environment Feedback

因此：

> Chain-of-Thought 可以讓一條路徑更顯式，但不會自動形成 Multi-path Search System。

在 Production 裡，Auditability 應集中於結構化且可觀測的 Artefact：

- 執行過的 Action
- 使用的 Tool
- 參考的 Evidence
- 檢查的 Condition
- State Transition
- Verifier Result
- 被接受與拒絕的 Candidate

系統不需要暴露或儲存無限制的 Private Reasoning Text，才能做到 Traceable。

## Self-consistency：抽樣多條路，再聚合答案

Self-consistency 是搭配 Chain-of-Thought-style Reasoning 的 Decoding Strategy。它不採用單一路徑 Greedy Decoding，而是 Sample 多個不同 Reasoning Path，再選出最一致的 Final Answer。

```text
Path A -> 42
Path B -> 42
Path C -> 39
Path D -> 42
Path E -> 41

Aggregate -> 42
```

### 最適合的情況

- Task 有相對明確的 Answer
- Equivalent Answer 可以 Normalise
- 不同 Path 可能走到同一結果
- Sampling Variance 是重要 Error Source

常見例子：

- Arithmetic Reasoning
- Multiple Choice
- Short-answer Reasoning
- Classification
- Fixed-scale Decision

### 它沒有做什麼

Self-consistency 一般比較的是完整 Answer，不會維護 Intermediate State Frontier，也不會刻意決定某個 Branch 應該比另一個 Branch 多 Expand 一步。

因此更精確的描述是：

> Sample-and-Aggregate，而不是 Tree Search。

### Agreement 不等於 Evidence

多條 Path 可能共享：

- 相同的錯誤 Premise
- 相同的過時 Source
- 相同 Model Bias
- 相同 Prompt-induced Shortcut

Agreement 可以降低偶發的 Decoding Variance，不能取代 Fact Verification、Test 或 Source Check。

### Production Control

- Sample Count
- Sampling Diversity
- Answer Normalisation
- Semantic Grouping
- Agreement Threshold
- Tie Handling
- Abstention
- Cost Budget
- Verifier Fallback

例如：

```text
Agreement >= threshold
  -> Verify and Accept

Agreement below threshold
  -> Abstain, Collect Evidence, or Use Another Evaluator
```

## Generate-and-Rank：先產生完整 Candidate，再評分

Generate-and-Rank 是通用工程 Pattern，不是一個只有單一權威實作的演算法。

```text
Problem
  -> Candidate Generator
       -> A
       -> B
       -> C
       -> D
  -> Hard Validation
  -> External Evaluation
  -> Ranking
  -> Select, Combine, or Abstain
```

適合需要比較多個完整替代方案的情境：

- Architecture Option
- Query Rewrite
- Code Patch
- SQL Candidate
- Plan
- Product Decision
- Answer Draft
- Tool Choice

### Self-consistency 與 Generate-and-Rank

| 維度 | Self-consistency | Generate-and-Rank |
|---|---|---|
| 聚合依據 | Answer Agreement | 顯式 Evaluation Criteria |
| 最適合 | 一個可正規化答案 | 多個合理替代方案 |
| Intermediate Search | 無 | 通常無 |
| Evaluator | Answer Aggregator | Ranker 或 External Test |
| 主要風險 | 相同錯誤贏得投票 | 弱 Ranker 選錯 Candidate |

### Evaluator 應分層

在比較 Preference 前，先淘汰 Invalid Candidate。

建議順序：

```text
Hard Constraints
  -> Executable Tests
  -> Evidence Verification
  -> Quality and Preference Ranking
```

#### Hard Constraints

- Schema Valid
- Required Field 存在
- 只用 Permitted Tool
- SQL 唯讀
- Budget 符合

#### Executable Tests

- Code Compile
- Unit Test Pass
- SQL 可執行
- Browser State 符合 Goal
- Constraint 可滿足

#### Evidence Verification

- Claim 有 Source
- Citation 真正支援 Claim
- Date 與 Version 相容
- Required Evidence 沒有缺失

#### Preference Ranking

- Maintainability
- Readability
- Strategic Fit
- User Preference
- Long-term Cost

Hard Test 失敗的 Candidate，不應因為文字漂亮而獲勝。

![Figure 4-2 — Generate-and-Rank](/images/the-atlas-of-agent-design-patterns-part-4/generate-and-rank.png)

> **Figure 4-2｜Generate-and-Rank**  
> Candidate Generator 產生多個候選，依序經過 Hard Validation、External Evaluation 與 Ranking，最後選出最佳方案。重點不只是多生成，而是有可靠的評估標準。


## Beam Search：維持有上限的 Frontier

Beam Search 是 Approximate Search Strategy，每次 Expansion Layer 只保留分數最高的 `K` 個 Partial Candidate。

```text
Start
  -> A (8), B (7), C (3)
  -> Keep A and B

Expand A and B
  -> A1 (6), A2 (9), B1 (8), B2 (4)
  -> Keep A2 and B1
```

### 核心控制

- Beam Width
- Branching Factor
- Scoring Function
- Maximum Depth
- Diversity Policy
- Termination Condition

### 為什麼有用

Full Expansion 會指數成長，Beam Search 可以限制 Active Frontier。

### 為什麼有風險

Beam Search 一般不具 Complete 保證。某個 Branch 早期分數很低，最後卻可能通往最佳 Solution；一旦被 Prune，通常就不會回來。

標準 Beam Search 也不提供一般性 Backtracking。它是逐層向前推進的 Bounded Frontier。若系統能恢復先前被 Prune 的 Branch，代表它另外加入了其他機制。

### Diversity 很重要

Top-`K` Frontier 可能只是同一個想法的五種寫法。

可加入：

- Semantic Deduplication
- Diversity Penalty
- Category Quota
- Novelty Score
- State Canonicalisation

Diverse Beam Search 就是明確優化 Diversity，而不是保留近似相同 Sequence 的一種例子。

## Tree of Thoughts：搜尋有意義的 Intermediate State

Tree of Thoughts 不只保留一條 Chain-of-Thought，而是把連貫的中間單位當成 Search State。

Thought 可以是：

- Partial Mathematical Solution
- Candidate Subgoal
- Code-repair Direction
- Partial Plan
- Completed Action Set
- Article Structure

核心流程是：

```text
Represent Current State
  -> Generate Candidate Thoughts
  -> Evaluate Candidates
  -> Select States to Expand
  -> Prune Weak States
  -> Continue, Backtrack, or Stop
```

原始 Framework 展示了透過 Breadth-first Search、Depth-first Search 與 State Evaluation 進行 Deliberate Exploration。

### ToT 與 CoT 的差異

| 能力 | Chain-of-Thought | Tree of Thoughts |
|---|---:|---:|
| Intermediate Unit | 有 | 有 |
| Persistent Alternative | 無 | 有 |
| Intermediate Evaluation | 非內建 | 核心 |
| Search Controller | 無 | 有 |
| Pruning | 無 | 有 |
| Backtracking | 無 | 取決於選用 Search |
| State Management | 極少 | 必要 |

### Thought Granularity

Thought 必須大到可評估，小到可 Expand。

太小：

```text
Every Token Becomes a Node
```

Search 立即爆炸。

太大：

```text
The Entire Final Answer Becomes One Node
```

方法退化成 Generate-and-Rank。

有效 Thought 應：

- 會改變下一個 Decision
- 有有意義的 State Representation
- 可以獨立 Evaluate
- 可以 Compare 或 Deduplicate
- 不會讓 Tree 無必要地過深

### Evaluation Option

- Scalar Value Estimate
- Pairwise Comparison
- Promising / Uncertain / Impossible
- Deterministic Constraint
- External Test
- Environment Feedback

應優先使用最強的可用訊號。Compiler 通常比模型對 Code 的風格信心更可靠。

### Search Control

- Branching Factor
- Maximum Depth
- Maximum Nodes
- Beam Width
- Duplicate-state Detection
- No-improvement Limit
- Time and Tool Budget
- Accepted-solution Threshold

![Figure 4-3 — Tree Search: Branching, Pruning, and Backtracking](/images/the-atlas-of-agent-design-patterns-part-4/tree-search-pruning-backtracking.png)

> **Figure 4-3｜Tree Search: Branching, Pruning, and Backtracking**  
> 搜尋樹從 Root 產生候選分支，Evaluator 對中間狀態評分；低價值分支被 Prune，失敗路徑則 Backtrack，最後保留通過驗證的解法。


## Graph of Thoughts：合併、轉換並重用中間結果

Tree 通常讓一個 Node 只有一個 Parent，但部分任務需要更豐富的 Dependency Structure。

Graph of Thoughts 把中間資訊表示成 Graph Vertex，把依賴表示成 Edge。操作可以包括：

- Generate
- Aggregate
- Refine
- Reduce
- Transform
- Feedback

例如：

```text
Pricing Analysis --------\
Feature Analysis ----------> Positioning Synthesis
Customer Evidence --------/
```

一個 Downstream Thought 可以同時依賴數個 Upstream Thought；中間結果也可以被重用，不必複製到不同 Branch。

### GoT 不只是「最後會 Merge 的 Tree」

真正能力是 Thought Unit 之間可以形成任意 Dependency Graph。

可用於：

- 整合互補分析
- 根據 Feedback Refine Result
- 把數個 State Distil 成一個
- 在不同 Downstream Task 重用同一中間結果
- Iteratively Improve State

### Production Requirement

Graph-shaped Reasoning 需要：

- Node Identity
- Dependency Tracking
- Versioning
- Invalidation Rule
- Provenance
- Merge Semantics
- Conflict Handling
- Deduplication
- Iteration 或 Cycle Limit
- Convergence Criteria

如果 Upstream Evidence 改變，由它衍生的 Downstream Node 可能需要失效並重新計算。

### 主要風險

Graph 可能比它所表示的問題更難理解。只有在 Merge 與 Reuse 真的是核心需求時，GoT 才有價值；不能因為 Graph 看起來比 Tree 高級就使用。

## MCTS：以 Tree Statistics 平衡探索與利用

Monte Carlo Tree Search 透過重複 Iteration 建立 Search Tree。傳統流程包含四個階段：

1. **Selection：** 在已知高價值與尚未充分探索的 Branch 之間取得平衡。
2. **Expansion：** 增加一個或多個 Child。
3. **Simulation 或 Evaluation：** 估計新 State 的 Outcome。
4. **Backpropagation：** 把結果沿訪問過的 Ancestor 更新回去。

```text
Selection
  -> Expansion
  -> Simulation / Evaluation
  -> Backpropagation
  -> Next Iteration
```

Classic MCTS 常使用 Rollout；現代變體也可能使用 Learned Policy、Value Estimate、Domain Heuristic 或真實 Environment Result。

MCTS 不只是「有分數的 Tree of Thoughts」。它會保存多次 Visit 的 Statistics，並以 Tree Policy 決定下一份 Search Effort 應投入哪裡。

## LATS：搜尋 Language Agent 的 Action 與 Environment State

Language Agent Tree Search 把 Language-model Reasoning、Action Generation、Monte Carlo Tree Search、LM Value Function、Self-reflection 與 External Environment Feedback 結合在一起。

Node 可以保存：

```text
Environment State
Action History
Observation
Reflection
Value Estimate
Visit Statistics
```

簡化 Iteration：

```text
Select Tree State
  -> Generate Candidate Actions
  -> Execute or Simulate Action
  -> Observe Environment
  -> Evaluate and Reflect
  -> Update Tree Statistics
  -> Expand, Revisit, or Backtrack
```

### ToT 與 LATS

| 維度 | Tree of Thoughts | LATS |
|---|---|---|
| 主要 State | Intermediate Thought | Agent 與 Environment State |
| Environment Action | 可選 | 核心 |
| External Feedback | 可選 | 核心 |
| Search Statistics | 取決於 Controller | MCTS-style |
| 常見任務 | Deliberate Problem Solving | Coding、Web Interaction、Interactive QA |
| 主要成本 | Model Evaluation | Model、Environment Execution 與 State Management |

### Environment Feedback 的價值

Code Repair：

```text
Candidate Patch
  -> Run Tests
  -> Observe Failure
  -> Update Branch Value
```

Browser Interaction：

```text
Candidate Click
  -> Receive New DOM or Screen
  -> Measure Progress
  -> Update Search State
```

只要 Environment Signal 真正反映 Desired Outcome，它會比詢問模型「哪個 Action 聽起來最好」更可靠。

### Safety Boundary

只有當 Exploration 可回復或被隔離時，Action Search 才安全。

使用：

- Sandbox
- Temporary Branch
- Test Database
- Mock Service
- Dry Run
- Reversible Transaction
- Approval Gate

不能為了探索五條路，真的送出五筆付款、刪除五份 Production Data 或發布五個版本。

### Reward Hacking 與 Weak Value Function

如果 Score 只有「讓 Test Pass」，系統可能直接刪掉 Test。

Evaluator 還必須考慮：

- Unchanged Requirement
- Policy Compliance
- Side Effect
- Maintainability
- Full Regression Suite
- Security
- Cost
- User Intent

![Figure 4-4 — MCTS and LATS Search Loop](/images/the-atlas-of-agent-design-patterns-part-4/mcts-lats-search-loop.png)

> **Figure 4-4｜MCTS and LATS Search Loop**  
> Search Controller 進行 Selection 與 Expansion，Agent 在 Sandbox Environment 執行 Action，取得 Observation、Test Result、Reflection 與 Value，再將結果 Backpropagate 至搜尋樹。


## Case-Based Reasoning 與 Neuro-symbolic 是相鄰組件

把這兩個概念移出主要 Search Topology 光譜後，分類會清楚許多。

### Case-Based Reasoning 提供經驗與 Candidate Prior

經典 Case-Based Reasoning 常被描述為：

- Retrieve Similar Case
- Reuse 或 Adapt Solution
- Revise Proposed Solution
- 適當時 Retain New Experience

Case 可以包含：

- Context
- Action
- Outcome
- Failure
- Applicability Condition
- Lesson

Case Retrieval 可以初始化或偏置 Search，但本身不等於 Beam、Tree、Graph 或 MCTS Controller。

主要風險：

- Surface Similarity 掩蓋不同 Condition
- Case 已過時
- 未 Adapt 就直接套用
- Case Memory 被錯誤經驗污染
- Similarity Metric 忽略 Critical Constraint

每個 Retrieved Case 都必須重新對照 Current Environment。

### Neuro-symbolic 組件強化 Representation 與 Evaluation

Neuro-symbolic System 結合 Neural Component 與 Symbolic Structure 或 Procedure。

Agent Workflow 可以是：

```text
Natural-language Request
  -> LLM 抽取 Variable 與 Constraint
  -> Solver 或 Rule Engine 計算 Valid Result
  -> Verifier 檢查 Mapping 與 Output
  -> LLM 解釋結果
```

可強化：

- Constraint Satisfaction
- Mathematical Calculation
- Planning
- Rule Enforcement
- Consistency Check
- Executable Validation

Neuro-symbolic 不是單一 Search Topology。Solver 可以被用作：

- Candidate Generator
- Evaluator
- Verifier
- Planner
- Constraint Filter

核心失敗模式是 Translation Error：Solver 可以非常精確地解出錯誤 Formalisation。

## Evaluator 是整套系統的中心

Candidate Generation 最顯眼，因此最容易被高估。真正決定 Search 是否改善品質的，通常是 Evaluation。

Production Evaluator 應分層。

### Layer 1：Hard Validity

- Schema
- Required Field
- Permission
- Allowed Tool
- Syntax
- Budget
- Invariant Check

### Layer 2：Environment Execution

- Test
- Compiler
- Database
- Browser State
- Simulator
- Solver
- Rule Engine

### Layer 3：Evidence 與 Factual Support

- Source Authority
- Citation Support
- Date 與 Version
- Missing Evidence
- Conflict Detection

### Layer 4：Preference

- Readability
- Maintainability
- User Preference
- Strategic Fit
- Cost-quality Trade-off

順序很重要。Preference 不應救回 Invalid 或 Unsupported Candidate。

### 避免同一 Model 同時是唯一 Generator、Judge 與 Approver

同一 Model 在所有階段出現，Error 可能高度相關。

可使用：

- Deterministic Check
- Environment Feedback
- Independent Evaluator
- Rubric-based Pairwise Comparison
- Calibrated Abstention
- 高影響 Decision 的 Human Review
- Disagreement Analysis
- Source-grounded Verification

## Diversity 與 State Canonicalisation 必須被設計

十個 Generated Candidate 可能只有一個真實想法：

```text
Use Redis Caching
Add a Redis Cache Layer
Route Caching through Redis
```

這不是三種真正不同的 Strategy。

可使用：

- 依不同 Objective Generate
- 依不同 Constraint Generate
- 強制不同 Solution Category
- Semantic Deduplication
- Canonical State Key
- Category Quota
- Novelty Threshold
- 保留一個 High-risk / High-upside Candidate
- 保留一個 Low-cost Candidate

Diversity 應在 Problem State 上評估，而不只是文字不同。

## Search Budget 與 Stopping Rule

如果每個 Node 產生四個 Child，Depth 為五，Full Expansion 可能產生：

```text
4^5 = 1,024 Leaf Nodes
```

實際成本還包含：

- Generation
- Evaluation
- Tool
- State Persistence
- Deduplication
- Backtracking
- Environment Reset
- Final Synthesis

Production Limit 可以包括：

| 限制 | 用途 |
|---|---|
| Maximum Candidates | 限制總 Frontier |
| Maximum Branching Factor | 限制每個 State 的 Child |
| Maximum Depth | 限制 Search Horizon |
| Beam Width | 限制每 Layer Active Candidate |
| Maximum Nodes | 限制 Tree 或 Graph Size |
| Maximum Tool Calls | 限制 Environment Interaction |
| Token Budget | 限制 Model Cost |
| Wall-clock Limit | 限制 Latency |
| No-improvement Limit | 停止沒有進展的 Search |
| Accepted-solution Threshold | 找到合格結果後停止 |
| Cost-aware Score | 懲罰昂貴 Candidate |
| Irreversible-action Gate | 在不安全執行前停止 |

最高 Raw Score 不一定是最好的 Production Choice：

```text
Candidate A:
Quality 92
Cost 5

Candidate B:
Quality 93
Cost 50
```

多一分品質未必值得十倍成本。

## 如何選擇 Search Strategy

從能處理真實不確定性的最便宜方法開始。

| Task Condition | 起始方法 |
|---|---|
| 一條路足夠且可 External Verify | Single Path + Verifier |
| 一個可正規化 Answer 在 Sample 間不穩定 | Self-consistency |
| 多個完整 Alternative 需要比較 | Generate-and-Rank |
| Partial Candidate 逐 Layer 發展 | Beam Search |
| Early Choice 重要且需要 Backtracking | Tree of Thoughts 或其他 Tree Search |
| Intermediate Result 必須 Merge 或 Reuse | Graph of Thoughts |
| Search 會在 Environment 中行動並接收 Feedback | MCTS-style Action Search 或 LATS |
| 有大量類似且已驗證 Case | Case Retrieval 作為 Prior |
| 存在 Formal Constraint 或精確 Procedure | Solver、Rule Engine 或 Neuro-symbolic Component |

在支付 Multi-path Search 成本前，先問：

1. 是否真的存在不同 Candidate？
2. Intermediate State 能否表示？
3. Candidate 能否被可靠 Evaluate？
4. Early Choice 是否影響後續 Outcome？
5. Exploration 是否安全且可回復？
6. Quality Gain 是否值得成本？
7. 是否有明確 Stopping Rule？

如果 Evaluator 不可靠，更多 Branch 通常只會放大不確定性。

![Figure 4-5 — Search Cost and Answer Quality](/images/the-atlas-of-agent-design-patterns-part-4/search-cost-answer-quality.png)

> **Figure 4-5｜Search Cost and Answer Quality**  
> 從 Single-path 到 Generate-and-Rank、Beam Search 與 Tree Search，品質可能提升，但成本也持續上升，後段通常出現 Diminishing Returns。


## 常見反模式

### 所有任務都用 Tree Search

簡單且可驗證的 Transformation 不需要 Search Frontier。

### 有很多 Candidate，卻沒有可靠 Evaluator

這是 Draft Accumulation，不是 Search。

### 把 Sampling 誤認成 Multi-Agent

同一 Model 產生多次，不等於多個 Agent。

### 用 Self-consistency 做 Fact Checking

Agreement 不能建立 Truth。

### 把 Beam Search 說成 Complete 或預設支援 Backtracking

被 Prune 的 State 通常不會回來。

### ToT 只剩裝飾性 Tree Diagram

沒有 State Representation、Evaluation 與 Control，Tree 沒有操作意義。

### 不需要 Merge 或 Reuse，仍硬用 GoT

Graph 增加 Dependency Cost，卻沒有增加價值。

### LATS 直接探索不可逆 Production Action

Search 必須發生在 Sandbox、Simulation 或受控制的 Reversible Environment。

### Model-only Scoring

Generator 與 Evaluator 重現相同錯誤。

### 沒有 Semantic Deduplication

Frontier 被 Paraphrase 塞滿。

### 沒有 Stopping Rule

只要還能產生 Candidate，就繼續 Search，直到 Infrastructure、Budget 或讀者先投降。

## 完整範例：搜尋 Code Repair

Task：

> 修復一個 Expected `200`、實際收到 `401` 的 API Integration Test。

### 表示 Current State

```text
Known:
- Endpoint Exists
- Request Reached Server
- Test Token Was Generated

Unknown:
- Token Validity
- Audience
- Scope
- Authorisation Header Format
```

### 產生不同 Candidate Cause

```text
A. Expired Token
B. Wrong Audience
C. Missing Scope
D. Malformed Authorisation Header
```

### 使用 Hard Signal 與 Evidence Ranking

根據 Configuration、Log 與 Token Claim，排列值得優先測試的 Branch。

### Expand Branch B

```text
Inspect Token Claims
  -> Audience Does Not Match API Configuration
```

### 執行可回復 Candidate Fix

```text
Update Test Configuration
  -> Run Target Integration Test
  -> Pass
```

### 擴大 Verification

```text
Run Authentication Test Suite
  -> Pass

Run Lint
  -> Pass

Run Build
  -> Pass

Check Unrelated Files
  -> Unchanged
```

### Stop

Completion Contract 已滿足，因此不再 Expand 低價值 Branch。

可靠之處不在於 Model 想出了四個 Root Cause，而在於重要 Candidate 經過真實 Environment Test，且 Full Acceptance Criteria 通過後 Search 立即停止。

## 結論

主要機制位於 Search System 的不同位置：

- **Single-path Reasoning** 保存一條 Trajectory。
- **Chain-of-Thought** 讓一條 Trajectory 更顯式。
- **Self-consistency** Sample 完整 Path 並聚合 Answer。
- **Generate-and-Rank** 評估多個完整 Alternative。
- **Beam Search** 維持有上限的 Layer-wise Frontier。
- **Tree of Thoughts** 搜尋被評估的 Intermediate Thought State。
- **Graph of Thoughts** 合併、轉換並重用 Intermediate State。
- **MCTS** 以 Tree Statistics 分配重複 Search Effort。
- **LATS** 把 MCTS-style Search 用於 Language Agent Action 與 Environment Feedback。
- **Case-Based Reasoning** 提供可重用經驗與 Candidate Prior。
- **Neuro-symbolic Component** 提供 Formal Representation、Constraint、Computation 或 Verification。

更多 Branch 不會自動產生更多 Truth。

Production Search System 需要：

```text
Meaningful Candidates
  + Explicit State
  + Reliable Evaluation
  + Bounded Search Control
  + Safe Execution
  + Stopping Rule
```

最重要的問題不是 Model 可以產生多少 Thought，而是：

> 什麼訊號足以支持繼續 Expand 這條路，又有什麼條件可以證明 Search 應該停止？

Part 5 將處理 Output 或 Action 驗證失敗後的問題：

> Agent 應如何 Retry、Fallback、Repair、Replan 或從失敗中學習，同時避免建立另一個失控 Loop？

## 參考資料

- [Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903)
- [Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171)
- [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601)
- [Besta et al., *Graph of Thoughts: Solving Elaborate Problems with Large Language Models*](https://arxiv.org/abs/2308.09687)
- [Zhou et al., *Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models*](https://arxiv.org/abs/2310.04406)
- [Browne et al., *A Survey of Monte Carlo Tree Search Methods*](https://doi.org/10.1109/TCIAIG.2012.2186810)
- [Vijayakumar et al., *Diverse Beam Search: Decoding Diverse Solutions from Neural Sequence Models*](https://arxiv.org/abs/1610.02424)
- [Aamodt and Plaza, *Case-Based Reasoning: Foundational Issues, Methodological Variations, and System Approaches*](https://doi.org/10.3233/AIC-1994-7104)
- [Susskind et al., *Neuro-Symbolic AI: An Emerging Class of AI Workloads and their Characterization*](https://arxiv.org/abs/2109.06133)

