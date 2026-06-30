---
title: "Agent 設計模式圖鑑 Part 6｜Multi-Agent 架構全解：Supervisor、Debate、Blackboard 與 Swarm"
description: "完整比較 Single Agent、Role-based Single Agent、Supervisor–Worker、Planner–Executor–Critic、Debate、Voting、Blackboard、Peer-to-Peer 與 Swarm，並說明 Production Multi-Agent 的通訊、共享狀態、責任邊界、成本與失敗治理。"
date: 2026-07-01T00:04:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 6
---

前幾篇，我們分別討論了：

- 任務從開始到結束怎麼走
- Agent 如何決定下一步
- 多種解法如何搜尋
- 錯誤如何被驗證與修正

這一篇要進入第五個維度：

> 工作應該由一個 Agent 完成，還是交給多個 Agent 分工？

Multi-Agent 很容易讓架構圖看起來氣勢磅礡。

畫面上有：

- Planner Agent
- Research Agent
- Coding Agent
- Critic Agent
- Reviewer Agent
- Supervisor Agent
- Memory Agent

每個角色都有自己的卡片、圖示和箭頭，整張圖像一間數位辦公室。

但角色變多，不代表系統就變聰明。

更多 Agent 同時也代表：

- 更多模型呼叫
- 更多 Context 轉交
- 更多狀態同步
- 更多重複工作
- 更多責任邊界
- 更多失敗點
- 更難重現的結果
- 更高成本與延遲

因此，Multi-Agent 的核心問題不是：

> 可以建立多少個 Agent？

而是：

> **工作是否真的需要分工，以及分工後如何確保每個角色知道自己該做什麼、把結果交給誰、什麼時候停止？**

---

## Multi-Agent 是組織方式，不是推理方式

這是本篇最重要的概念邊界。

Multi-Agent 描述的是：

> 有多少個獨立角色或執行單位，以及它們如何協作。

它不直接描述：

- 任務是否使用 ReAct
- 是否先做 Planning
- 是否探索多條推理路徑
- 是否使用 Tree of Thoughts
- 是否有 Retry 或 Verifier
- 是否保存 Memory

一套 Multi-Agent 系統可以同時使用：

```text
執行路徑：State Machine
決策方式：Plan-and-Execute
探索方式：Single-path
驗證方式：Verifier + Generate-and-Test
組織方式：Supervisor–Worker
記憶方式：Shared Working Memory
```

Multi-Agent 只是其中一個維度。

## 多個答案不等於多個 Agent

以下情況都不一定是 Multi-Agent：

- 同一個模型生成五個候選
- 一個 Agent 使用 Tree Search
- 一個 Agent 依序切換 Planner、Writer、Critic Prompt
- 一個 Workflow 包含多個 LLM Node

反過來，多個 Agent 也不一定探索不同解法。

例如：

- Agent A 讀文件一
- Agent B 讀文件二
- Agent C 讀文件三

它們只是平行分工，不一定在競爭不同答案。

| 情況 | 多候選 | 多路徑搜尋 | Multi-Agent |
|---|---:|---:|---:|
| 同一模型生成五個答案 | 是 | 不一定 | 否 |
| 一個 Agent 執行 Tree Search | 是 | 是 | 否 |
| 同一模型切換三個角色 Prompt | 不一定 | 不一定 | 通常否 |
| 三個 Worker 分別處理不同文件 | 有多個輸出 | 不一定 | 是 |
| 三個 Agent 提出方案，由 Judge 選擇 | 是 | 是 | 是 |

---

## 一、Single Agent：先問是否真的需要多人

Single Agent 由同一個執行單元完成整個任務：

```text
User Request
  ↓
Single Agent
  ├─ Plan
  ├─ Use Tools
  ├─ Update State
  ├─ Verify
  └─ Answer
```

這不代表它只能做簡單任務。

只要系統具備：

- 清楚的工具邊界
- 結構化 State
- Planner
- Verifier
- Budget Guard
- Retry Limit
- Memory

一個 Agent 也可以處理相當長的工作。

## Single Agent 的優點

### Context 一致

不需要把任務背景反覆轉交給不同角色。

### 責任清楚

只有一個主要執行者，不容易出現「我以為另一個 Agent 會處理」。

### 成本較低

少了多角色的 Prompt、轉交、同步和聚合。

### 容易 Debug

整條 Trace 比較集中。

### 容易建立停止條件

不需要等待多個 Agent 互相確認。

## Single Agent 的限制

- Context 可能過大
- 工具與責任過多
- 不同技能難以隔離
- 長任務容易遺失局部資訊
- 無法真正平行執行獨立工作
- 一個錯誤可能污染整個任務

## 什麼時候優先使用 Single Agent？

- 任務可以由一個 Context 處理
- 工具數量不多
- 不需要平行工作
- 任務責任不需要隔離
- 交接成本高於分工收益
- 一個強模型已經足夠完成

Production 設計的預設應該是：

> **先從 Single Agent 開始，只有當分工真的解決問題時才增加 Agent。**

---

## 二、Role-based Single Agent：一個模型，切換多個角色

Role-based Single Agent 會在不同階段使用不同角色 Prompt：

```text
Planner Role
  ↓
Writer Role
  ↓
Critic Role
  ↓
Finalizer Role
```

表面上看起來像四個 Agent。

但底層可能仍然是：

- 同一個模型
- 同一個執行程序
- 同一個 State
- 依序執行
- 沒有真正獨立的 Worker

## 它有什麼價值？

### 責任分離

不同階段只關注自己的任務。

### Prompt 更聚焦

Planner 不需要同時寫文章；Critic 不需要同時執行工具。

### 較容易控制流程

角色順序由 Workflow 決定。

### 成本低於真正 Multi-Agent

不需要維護多個獨立 Agent Session。

## 它不是什麼？

Role-based Single Agent 不等於：

- 多個自主 Agent
- 真正平行執行
- 獨立 Context
- 獨立 Memory
- Peer-to-Peer 協作

## 主要風險

### 角色只是換名字

Planner、Writer 和 Critic 使用幾乎相同 Prompt，只是標題不同。

### 共用相同盲點

同一模型可能在所有角色中重複同一錯誤。

### Context 污染

Critic 已經看過 Generator 的完整思路，更容易沿著同樣假設判斷。

### 假獨立性

系統宣稱「三個 Agent 一致通過」，實際上只是同一個模型連續說了三次。

---

![Figure 6-1 — One Model, Multiple Roles, or Multiple Agents?](/images/the-atlas-of-agent-design-patterns-part-6/one-model-multiple-roles-or-multiple-agents.png)

> **Figure 6-1｜One Model, Multiple Roles, or Multiple Agents?**  
> Single Agent、Role-based Single Agent 與真正 Multi-Agent 的差別，不只在角色名稱，而在是否具有獨立責任、Context、State、執行與通訊邊界。

---

## 三、Supervisor–Worker：最常見的 Multi-Agent 架構

Supervisor–Worker 是最常見、最容易控制的 Multi-Agent 模式。

Supervisor 負責：

- 理解目標
- 拆解任務
- 分派 Worker
- 追蹤進度
- 處理失敗
- 聚合結果
- 決定任務是否完成

Worker 負責特定子任務：

```text
                  Supervisor
            ┌────────┼────────┐
        Research   Analysis   Writing
            \          |          /
              Return Results
                     ↓
            Supervisor Aggregates
                     ↓
                  Response
```

## Supervisor 的責任

### Task Decomposition

把目標拆成可以獨立執行的子任務。

### Worker Selection

根據技能、權限、成本與負載選擇 Worker。

### Contract Definition

為每個 Worker 定義：

- Input
- Objective
- Allowed Tools
- Expected Output
- Completion Criteria
- Budget
- Deadline

### Progress Tracking

知道哪些任務：

- Pending
- Running
- Completed
- Failed
- Blocked
- Cancelled

### Result Aggregation

比較、去重、處理衝突並產生最終輸出。

## Worker 不應該直接輸出最終答案

常見錯誤流程：

```text
Supervisor
  ↓
Worker A / Worker B / Worker C
  ↓
Final Response
```

如果 Worker 直接連到 Final Response，會出現：

- 結果格式不同
- 重複內容
- 互相矛盾
- 缺少整體結論
- 沒有人負責驗收

正確流程是：

```text
Workers Return Results
  ↓
Supervisor or Aggregator
  ↓
Verifier
  ↓
Final Response
```

## 適合 Supervisor–Worker 的任務

- 多來源研究
- 不同技能的子任務
- 可平行執行的工作
- 大量文件處理
- 多市場比較
- Coding + Testing + Review
- 需要中央治理的企業流程

## 主要風險

### Supervisor 成為瓶頸

所有工作都經過 Supervisor，可能造成延遲與 Context 壓力。

### Worker 任務重疊

分工不清導致多個 Worker 做相同工作。

### Worker 結果無法聚合

不同 Worker 使用不同格式、假設與版本。

### Supervisor 過度介入

Worker 每一步都要回報，協調成本高於執行本身。

### Worker 失敗沒有替代方案

Supervisor 只會等待，不知道如何重派、Fallback 或標記 Partial。

---

![Figure 6-2 — Supervisor–Worker: Delegate, Return, Aggregate](/images/the-atlas-of-agent-design-patterns-part-6/supervisor-worker-delegate-return-aggregate.png)

> **Figure 6-2｜Supervisor–Worker: Delegate, Return, Aggregate**  
> Supervisor 先定義工作契約並分派任務；Worker 執行後必須回傳結構化結果，再由 Supervisor 聚合、解決衝突、驗證並產生最終答案。

---

## 四、Planner–Executor–Critic：依責任拆分認知工作

Planner–Executor–Critic 是一種常見的角色分工。

## Planner

負責：

- 理解目標
- 拆解步驟
- 定義依賴
- 設定完成條件
- 安排執行順序

## Executor

負責：

- 執行目前步驟
- 使用工具
- 更新 State
- 回報結果
- 處理局部失敗

## Critic

負責：

- 找出問題
- 檢查遺漏
- 評估風險
- 提供修改建議

這個架構常被寫成：

```text
Planner
  ↓
Executor
  ↓
Critic
  ↓
Executor Revises
```

但 Production 版本通常還需要 Verifier：

```text
Planner
  ↓
Executor
  ↓
Critic
  ↓
Executor Revises
  ↓
Verifier
  ├─ Pass → Continue / Complete
  ├─ Repair → Executor
  └─ Replan → Planner
```

## Critic 不應該同時是最終 Verifier

Critic 可以說：

- 哪裡有風險
- 哪裡論證不足
- 哪裡應該補充

Verifier 則必須依規格做：

- Pass
- Fail
- Repair
- Replan
- Escalate

兩者責任不同。

## 適合這種分工的任務

- 長篇內容生成
- 複雜研究
- 程式開發
- 計畫製作
- 多輪修訂
- 有明確驗收標準的工作

## 主要風險

### Planner 與 Executor 重複規劃

Executor 不執行步驟，反而重新設計整套計畫。

### Critic 永遠找得到新問題

沒有最大 Review Rounds 和接受門檻。

### Verifier 只看文筆

真正的規格、測試和來源沒有被檢查。

### 角色間資訊過多

每個角色都接收完整 Context，失去分工意義。

---

![Figure 6-3 — Planner–Executor–Critic with Verification](/images/the-atlas-of-agent-design-patterns-part-6/planner-executor-critic-verification.png)

> **Figure 6-3｜Planner–Executor–Critic with Verification**  
> Planner 管理全局計畫，Executor 執行目前步驟，Critic 提供問題診斷，Verifier 依完成條件決定 Continue、Repair 或 Replan。

---

## 五、Debate：讓不同觀點彼此攻防

Debate 讓多個 Agent 提出不同立場，再由 Moderator 或 Judge 整合。

```text
Agent A: Support
Agent B: Oppose
Agent C: Risk Review
        ↓
Moderator / Judge
        ↓
Final Decision
```

## Debate 適合什麼？

- 多個合理觀點
- 高風險決策
- 找盲點
- 評估 Trade-off
- 政策與策略分析
- 架構方案比較
- 需要反方觀點的任務

## Debate 的價值

### 強迫系統提出替代觀點

避免第一個答案成為唯一框架。

### 暴露隱藏假設

不同角色會挑戰對方使用的前提。

### 適合風險分析

可以專門安排一個 Red Team 或 Risk Agent。

## Debate 的風險

### 觀點是 Prompt 製造的，不一定是真正多樣

三個 Agent 可能只是換不同語氣講相同內容。

### 說服力勝過正確性

Judge 可能偏好表達流暢的 Agent。

### 無限辯論

雙方不斷重複立場。

### 多數一致仍然可能錯

如果所有 Agent 使用相同錯誤資料，辯論只會讓錯誤更精緻。

## Production Debate 需要什麼？

- 固定輪數
- 明確議題
- 獨立證據要求
- 禁止重複論點
- Claim–Evidence 格式
- Judge Rubric
- External Verifier
- 最終 Abstain 選項

---

## 六、Voting：用聚合選擇答案

Voting 讓多個 Agent 對候選進行選擇。

常見方式：

- Majority Vote
- Weighted Vote
- Rank Aggregation
- Approval Voting
- Confidence-weighted Vote

```text
Candidate A
Candidate B
Candidate C
      ↓
Agent Votes
      ↓
Aggregate
      ↓
Selected Candidate
```

## Voting 適合什麼？

- 有明確候選集合
- 答案容易正規化
- 評估標準一致
- 需要降低單一 Judge 偏誤

## Voting 不等於驗證

五個 Agent 都投給同一答案，不代表答案正確。

它只表示：

> 在這組候選與這組投票者中，這個答案最受支持。

Voting 應搭配：

- Ground Truth
- External Test
- Source Verification
- Constraint Check

## Weighted Voting 的風險

若權重來源不可靠，系統只是把偏誤乘上係數。

需要知道：

- 權重如何計算
- 是否依任務類型調整
- 過去表現是否仍有效
- Agent 是否使用相同資料與模型

---

## 七、Blackboard：共享工作區，而不是互傳整段對話

Blackboard 架構讓多個 Agent 讀寫一個共享工作區。

```text
                Shared Blackboard
        ┌──────────┼──────────┐
    Researcher   Analyst    Writer
        ↕            ↕          ↕
       Facts      Findings     Draft
```

Blackboard 可以保存：

- Task Goal
- Known Facts
- Open Questions
- Subtasks
- Evidence
- Candidate Solutions
- Risks
- Decisions
- Draft Output
- Worker Status

## Blackboard 的優點

### 降低點對點傳訊

Agent 不必把完整 Context 傳給每一個 Agent。

### 中間結果可以重用

多個 Worker 可以讀取已驗證的事實。

### 適合非同步協作

Worker 可以在不同時間更新共享狀態。

### 容易觀察整體進度

Blackboard 成為任務的共同視圖。

## Blackboard 的風險

### 資訊污染

一個 Agent 寫入錯誤，其他 Agent 全部沿用。

### 重複與衝突

同一事實可能出現多個版本。

### 資料無限增長

所有中間內容都被保留，Blackboard 逐漸變成數位儲藏室。

### 權限不清

每個 Agent 都能修改所有內容。

## Production Blackboard 需要什麼？

- Typed Entries
- Source
- Author
- Created At
- Version
- Validation Status
- Confidence
- Read / Write Permission
- Conflict Resolution
- Expiry
- Immutable Audit Log

最好將內容分類：

```text
Proposed
Verified
Rejected
Superseded
```

而不是所有內容都視為同等可信。

---

## 八、Peer-to-Peer：Agent 直接互相協作

Peer-to-Peer 架構沒有單一中央 Supervisor。

Agent 可以直接：

- 發送任務
- 請求資訊
- 提供結果
- 轉交責任
- 協商下一步

```text
Agent A ↔ Agent B
   ↕          ↕
Agent C ↔ Agent D
```

## 適合什麼？

- 高度分散的工作
- 不同 Agent 擁有不同資源
- 中央節點容易成為瓶頸
- 任務拓撲會動態改變
- 多個服務自治協作

## Peer-to-Peer 的優點

- 沒有單點 Supervisor
- 某個 Agent 失敗時其他 Agent 仍可工作
- 協作彈性高
- 適合動態網路

## 主要風險

### 責任漂移

任務在 Agent 間不斷轉手，沒有人負責完成。

### 訊息爆炸

每個 Agent 都向多個 Agent 廣播。

### 循環交接

```text
A → B → C → A
```

### 狀態不一致

不同 Agent 對任務進度有不同理解。

### 權限擴散

Agent A 可以透過 Agent B 間接使用原本無權使用的工具。

## 必要控制

- Message Schema
- Correlation ID
- Task Owner
- Hop Limit
- TTL
- Deduplication
- Capability Registry
- Permission Propagation Rules
- Terminal Owner
- Conflict Resolution

---

## 九、Swarm：大量輕量 Agent 的分散協作

Swarm 通常包含多個輕量 Agent，以局部規則和共享目標協作。

它可能沒有單一中央 Planner。

Agent 根據：

- 鄰近訊息
- 當前狀態
- 局部任務
- 簡單協作規則

決定下一步。

```text
Agent 1 ↔ Agent 2 ↔ Agent 3
   ↕          ↕          ↕
Agent 4 ↔ Agent 5 ↔ Agent 6
```

## Swarm 適合什麼？

- 大量可拆分小任務
- 動態環境
- 冗餘與韌性
- 探索型問題
- 分散資源調度
- 局部決策足以推動整體目標

## Swarm 的價值

### 韌性

單一 Agent 失敗不一定中斷整體。

### 可擴展

可以增加更多輕量 Agent。

### 適合局部資訊

每個 Agent 不需要知道全局。

### 可能出現湧現行為

簡單規則可能形成複雜協作。

## Swarm 的主要風險

### 湧現行為不一定是好事

不可預測不等於智慧。

### 重複工作

多個 Agent 可能同時處理相同任務。

### 成本失控

大量小型呼叫累積成高額成本。

### 無法停止

沒有中央節點負責判定完成。

### 很難 Debug

單一結果可能來自大量局部互動。

### 責任不清

失敗後很難定位哪個 Agent 或哪條訊息造成問題。

## Production Swarm 需要什麼？

- Global Goal
- Local Rules
- Task Claiming
- Lease / Lock
- Duplicate Prevention
- Global Budget
- Message TTL
- Maximum Hops
- Convergence Metric
- Stop Condition
- Kill Switch
- Observability
- Human Override

不要因為圖上有很多小圓點，就把系統想像成數位蜂群的魔法儀式。

沒有協作規則的 Swarm，只是一群同時消耗 Token 的陌生人。

---

![Figure 6-4 — Debate, Voting, and Blackboard](/images/the-atlas-of-agent-design-patterns-part-6/debate-voting-blackboard.png)

> **Figure 6-4｜Debate, Voting, and Blackboard**  
> Debate 透過觀點攻防找盲點；Voting 對候選做聚合選擇；Blackboard 則讓多個 Agent 共享中間狀態與已驗證資訊。三者解決的是不同協作問題。

![Figure 6-5 — Peer-to-Peer and Swarm Coordination](/images/the-atlas-of-agent-design-patterns-part-6/peer-to-peer-swarm-coordination.png)

> **Figure 6-5｜Peer-to-Peer and Swarm Coordination**  
> Peer-to-Peer 允許 Agent 直接互相交接與協商；Swarm 依局部規則進行大規模分散協作。兩者都需要 Task Owner、Hop Limit、Message TTL、Budget、Stop Condition 與 Kill Switch。

---

## 通訊拓撲如何影響 Multi-Agent？

Multi-Agent 不只差在角色名稱，也差在訊息如何流動。

## Centralized

```text
Workers ↔ Supervisor
```

優點：

- 控制清楚
- 容易觀察
- 責任明確

風險：

- Supervisor 成為瓶頸
- 單點故障
- Context 過載

## Hierarchical

```text
Top Supervisor
├── Team Supervisor A
│   ├── Worker A1
│   └── Worker A2
└── Team Supervisor B
    ├── Worker B1
    └── Worker B2
```

優點：

- 適合大型任務
- 降低單一 Supervisor 壓力
- 容易分區治理

風險：

- 多層交接失真
- 延遲增加
- 責任被稀釋

## Blackboard

```text
Agents ↔ Shared Workspace
```

優點：

- 中間結果重用
- 非同步協作
- 降低點對點訊息

風險：

- 資訊污染
- 版本衝突
- 權限複雜

## Peer-to-Peer

```text
Agents ↔ Agents
```

優點：

- 彈性與韌性
- 無單一中心

風險：

- 訊息爆炸
- 循環交接
- 狀態不一致

## Swarm

```text
Many Local Interactions
→ Emergent Global Result
```

優點：

- 大規模分散
- 局部自治
- 高冗餘

風險：

- 難以預測
- 難以停止
- 難以追責

---

## Shared Memory 不是把所有 Context 丟進同一個資料庫

Multi-Agent 系統常需要共享狀態。

但 Shared Memory 不應該等於：

> 所有 Agent 的完整對話與工具結果全部保存。

這會造成：

- Context 膨脹
- 敏感資料擴散
- 錯誤資訊污染
- 檢索品質下降
- 重複內容
- 無法判斷最新版本

## Shared Memory 應該保存什麼？

- Task ID
- Original Goal
- Current Plan
- Verified Facts
- Open Questions
- Step Status
- Worker Assignment
- Structured Results
- Source References
- Conflict Flags
- Final Decisions

## 不同資料應有不同信任狀態

```text
Proposed
  ↓
Verified
  ↓
Accepted

Rejected
Superseded
Expired
```

## 每筆共享資料至少需要

- Author Agent
- Timestamp
- Source
- Version
- Confidence
- Validation Status
- Scope
- Expiry
- Access Policy

---

## Agent 之間應該如何交接？

不要只傳一段自然語言：

```text
Please continue the task.
```

應該使用結構化 Handoff Contract。

例如：

```text
Task ID:
research-17

Objective:
Collect official pricing for Framework A

Inputs:
Official domain, evaluation rubric

Allowed Tools:
Search, Browser

Expected Output:
Pricing table with source and access date

Completion Criteria:
All public plans captured,
or missing values explicitly marked

Known Constraints:
Do not use third-party pricing claims

Current Status:
Pending

Deadline:
10 minutes

Return To:
Supervisor
```

## Handoff Contract 的核心欄位

| 欄位 | 作用 |
|---|---|
| Task ID | 追蹤子任務 |
| Objective | 定義目標 |
| Inputs | 限制 Context |
| Allowed Tools | 控制權限 |
| Expected Output | 統一格式 |
| Completion Criteria | 判斷完成 |
| Budget | 控制成本 |
| Deadline | 防止無限等待 |
| Return To | 明確回傳對象 |
| Failure Policy | 定義 Retry、Fallback 或 Partial |

沒有 Contract 的交接，很像把一張沒有地址的便利貼塞進風裡，然後期待它準時抵達正確辦公桌。

---

## Multi-Agent 中誰負責最終答案？

這個問題必須明確回答。

可能的責任者包括：

- Supervisor
- Aggregator
- Judge
- Verifier
- Finalizer
- Human Approver

但不能是：

> 大家都負責。

如果所有 Agent 都能直接寫最終答案，會出現：

- 多個版本
- 互相覆蓋
- 結論衝突
- 無法追蹤責任
- 不知道哪個結果已被驗證

Production 系統應指定：

```text
Single Final Owner
```

並定義：

- 哪些輸入可以採用
- 如何處理衝突
- 是否需要 Verifier
- 誰有權正式完成任務
- 哪個狀態代表 Final

---

## Multi-Agent 的成本從哪裡來？

Multi-Agent 成本不只來自模型呼叫。

還包括：

- Prompt 重複
- Context 複製
- Worker 啟動
- 訊息傳遞
- State 同步
- 結果聚合
- 衝突解決
- 重複檢索
- 等待慢 Worker
- Verifier 與 Judge
- Retry 與 Reassignment

假設一個任務需要：

- 1 次 Supervisor 規劃
- 4 個 Worker
- 每個 Worker 3 次工具呼叫
- 1 次 Critic
- 1 次 Verifier
- 1 次 Aggregator

看起來只有幾個角色，實際執行可能已經超過十幾次模型與工具互動。

## Multi-Agent 常見延遲問題

### Straggler

整體任務等待最慢 Worker。

### Sequential Handoff

角色依序執行，無法真正平行。

### Context Serialization

大量中間結果需要序列化與重新載入。

### Review Bottleneck

所有結果等待同一個 Critic 或 Verifier。

## 成本控制方法

- Max Agents
- Max Worker Calls
- Concurrency Limit
- Per-worker Budget
- Shared Retrieval Cache
- Deduplication
- Early Cancellation
- Timeout
- Partial Aggregation
- Cheap Model for Simple Workers
- Centralized Tool Results
- Stop Low-value Branches

---

## Multi-Agent 的主要失敗模式

## 1. Duplicate Work

多個 Worker 執行相同任務。

### 對策

- Task Claiming
- Unique Task ID
- Shared Assignment Registry
- Deduplication

## 2. Responsibility Gap

每個 Agent 都以為別人會處理。

### 對策

- Single Task Owner
- Completion Criteria
- Return To
- Terminal Owner

## 3. Handoff Loss

交接時丟失需求、來源或限制。

### 對策

- Structured Handoff Contract
- Source References
- Immutable Goal
- Required Fields

## 4. Conflicting Results

不同 Agent 給出相反結論。

### 對策

- Conflict Flag
- Evidence Comparison
- Aggregator
- Verifier
- Human Review

## 5. Infinite Delegation

Agent A 交給 B，B 交給 C，C 又交回 A。

### 對策

- Hop Limit
- Delegation Graph
- Cycle Detection
- Maximum Depth

## 6. Shared Memory Pollution

未驗證資訊被所有 Agent 使用。

### 對策

- Proposed / Verified 狀態
- Write Permission
- Source and Version
- Validation Gate

## 7. Worker Silence

Worker 超時或中斷，Supervisor 永遠等待。

### 對策

- Deadline
- Heartbeat
- Timeout
- Reassignment
- Partial Result Policy

## 8. Judge Bias

Judge 偏好文筆、模型或角色。

### 對策

- Rubric
- Blind Evaluation
- External Tests
- Calibration Set
- Multiple Judges only when justified

## 9. Cost Explosion

角色與訊息不斷增加。

### 對策

- Global Budget
- Per-agent Budget
- Max Messages
- Concurrency Limit
- Early Stop

## 10. No Final Owner

任務產生很多結果，沒有正式完成者。

### 對策

- Final Owner
- Verifier
- Terminal State
- Audit Record

---

## Multi-Agent Production 控制面

一套成熟的 Multi-Agent 系統，除了 Agent 本身，還需要一個 Control Plane。

## Agent Registry

保存：

- Agent ID
- Role
- Capabilities
- Allowed Tools
- Permissions
- Model
- Cost Tier
- Current Load
- Health Status

## Task Registry

保存：

- Task ID
- Parent Task
- Owner
- Status
- Dependencies
- Deadline
- Budget
- Attempt Count

## Message Bus

處理：

- Message Schema
- Delivery
- Deduplication
- Ordering
- Retry
- TTL
- Dead-letter Queue

## Shared State

保存：

- Goal
- Plan
- Verified Facts
- Worker Results
- Conflicts
- Decisions

## Policy Layer

控制：

- Tool Access
- Data Access
- Delegation Rights
- Cost
- Risk
- Human Approval

## Observability

追蹤：

- Agent Trace
- Message Count
- Tool Calls
- Token Cost
- Latency
- Handoff Failures
- Duplicate Work
- Worker Timeout
- Final Outcome

## Kill Switch

在以下情況停止系統：

- Cost Limit Exceeded
- Message Storm
- Delegation Cycle
- No Progress
- Security Violation
- Human Cancellation

---

## 九種組織模式完整比較

| 模式 | 主要結構 | 真正獨立 Agent | 中央控制 | 共享狀態 | 平行能力 | 相對成本 | 主要風險 |
|---|---|---:|---:|---:|---:|---:|---|
| Single Agent | 一個執行單元 | 1 | 高 | 單一 State | 低 | 低 | Context 過載 |
| Role-based Single Agent | 一個模型切換角色 | 通常 1 | 高 | 共用 | 低 | 低～中 | 假獨立性 |
| Supervisor–Worker | 中央分派與聚合 | 多個 | 高 | 可選 | 高 | 中～高 | Supervisor 瓶頸 |
| Planner–Executor–Critic | 按認知責任分工 | 可多個 | 中～高 | 通常有 | 中 | 中～高 | 角色重疊 |
| Debate | 多觀點 + Judge | 多個 | 中 | 可選 | 中 | 高 | 說服力偏誤 |
| Voting | 多個投票者 | 多個 | 中 | 候選集合 | 高 | 中～高 | 多數共同犯錯 |
| Blackboard | 共享工作區 | 多個 | 中 | 核心能力 | 高 | 高 | 記憶污染 |
| Peer-to-Peer | 直接互連 | 多個 | 低 | 分散或共享 | 高 | 高 | 循環交接 |
| Swarm | 大量局部協作 | 多個 | 很低 | 局部／分散 | 很高 | 很高 | 難以預測與停止 |

---

## 任務類型與組織模式選擇表

| 任務特性 | 建議模式 |
|---|---|
| 一個 Context 足以完成 | Single Agent |
| 需要分離角色但不需真正獨立 | Role-based Single Agent |
| 子任務清楚且需要中央治理 | Supervisor–Worker |
| 規劃、執行、審查責任需分離 | Planner–Executor–Critic |
| 需要競爭觀點與反方分析 | Debate |
| 候選固定且適合聚合選擇 | Voting |
| 多個 Agent 需要共享中間結果 | Blackboard |
| 中央節點會成為瓶頸 | Peer-to-Peer |
| 大量小任務、動態分散協作 | Swarm |

---

## 什麼時候不要使用 Multi-Agent？

## 1. 任務沒有自然分工

只是為了追求架構感而拆角色。

## 2. 子任務高度依賴同一份 Context

切開後反而需要反覆同步。

## 3. 一個 Agent 已經可以穩定完成

增加角色只會增加成本。

## 4. 沒有聚合與驗收機制

多個輸出不知道如何整合。

## 5. 工具和資料無法安全隔離

更多 Agent 只會擴大風險。

## 6. 沒有觀察與停止能力

看不到訊息流、成本與任務狀態。

## 7. 延遲要求很高

多輪交接可能無法接受。

## 8. 問題需要單一責任與一致判斷

例如高風險批准，不應由一群 Agent 互相推卸責任。

---

## 一個完整範例：多來源研究報告

任務：

> 比較三個 Agent Framework，並推薦適合 Production RAG 的方案。

## Step 1：Supervisor 建立子任務

```text
Task A:
Collect official architecture information

Task B:
Evaluate persistence and state management

Task C:
Evaluate observability and testing

Task D:
Evaluate cost and operational complexity
```

## Step 2：Worker 執行

每個 Worker 取得：

- 相同 Evaluation Rubric
- 不同 Objective
- Allowed Sources
- Expected Output Schema
- Completion Criteria
- Budget

## Step 3：Blackboard 保存中間結果

```text
Verified Facts
Open Questions
Source Links
Conflicts
Missing Data
```

## Step 4：Critic 檢查

- 是否漏掉必要維度
- 是否依賴第三方來源
- 是否存在不同版本混用
- 是否有未標記推測

## Step 5：Supervisor 聚合

- 去重
- 統一格式
- 處理衝突
- 補充缺口

## Step 6：Verifier 驗收

- 官方來源覆蓋
- 必要欄位
- 未知值明確標記
- Recommendation 是否有證據

## Step 7：Final Owner 輸出

由 Supervisor 或 Finalizer 產生單一正式答案。

這套架構使用：

- Supervisor–Worker
- Blackboard
- Critic
- Verifier
- Shared State
- Final Owner

但不需要 Swarm，也不需要 Peer-to-Peer。

架構的價值來自清楚分工，不是角色數量。

---

## Production Multi-Agent Checklist

## 是否真的需要多 Agent？

- 是否存在自然可分離的子任務？
- 是否需要平行執行？
- 是否需要技能或權限隔離？
- 分工收益是否高於交接成本？
- 一個 Agent 是否已足夠？

## 角色與責任

- 每個 Agent 是否有單一清楚責任？
- 是否有 Final Owner？
- 是否定義 Return To？
- 是否定義 Completion Criteria？
- 是否避免角色重疊？

## 通訊

- 是否使用結構化 Message Schema？
- 是否有 Correlation ID？
- 是否有 Hop Limit 與 TTL？
- 是否能偵測循環與重複訊息？
- 是否有 Dead-letter Queue？

## 狀態與記憶

- 是否區分 Proposed 與 Verified？
- 是否保存 Source、Author、Version？
- 是否限制 Read / Write Permission？
- 是否有 Conflict Resolution？
- 是否有 Expiry？

## 成本與停止

- 是否有 Global Budget？
- 是否有 Per-agent Budget？
- 是否有 Max Agents？
- 是否有 Concurrency Limit？
- 是否有 No-progress Detection？
- 是否有 Kill Switch？

## 驗證與治理

- Worker 結果是否經過聚合與驗證？
- 是否有 Tool Policy？
- 是否有 Delegation Permission？
- 高風險操作是否需要 Human Approval？
- 是否能重現完整 Agent Trace？

---

## 本篇結論

Multi-Agent 的價值不在於讓畫面上出現更多 Agent 卡片。

它真正解決的是：

- 任務分工
- 技能隔離
- 權限隔離
- 平行執行
- 觀點競爭
- 中間結果共享
- 分散協作
- 系統韌性

本篇介紹的主要模式包括：

- **Single Agent**：一個執行單元完成整體任務
- **Role-based Single Agent**：同一模型在不同階段切換角色
- **Supervisor–Worker**：中央拆解、分派、聚合與驗收
- **Planner–Executor–Critic**：按認知責任分工
- **Debate**：以不同立場找出盲點
- **Voting**：對候選做聚合選擇
- **Blackboard**：透過共享工作區協作
- **Peer-to-Peer**：Agent 直接互相交接與協商
- **Swarm**：大量輕量 Agent 依局部規則分散協作

更多 Agent 不代表更高品質。

真正成熟的 Multi-Agent 系統必須能回答：

```text
誰負責什麼？
誰可以使用哪些工具？
結果要回傳給誰？
共享資料是否已驗證？
發生衝突時誰決定？
任務何時正式完成？
成本失控時如何停止？
```

如果這些問題沒有答案，多 Agent 只會把一個黑箱拆成更多小黑箱，再用箭頭把它們串成一座迷宮。

下一篇，我們會進入第六個架構維度：

> Agent 的 Context、State、Memory 和 RAG 到底有什麼不同？

Part 7 將完整比較 Working Memory、Episodic Memory、Semantic Memory、Procedural Memory、User Memory、Shared Memory，以及記憶寫入、檢索、過期、衝突與污染治理。
