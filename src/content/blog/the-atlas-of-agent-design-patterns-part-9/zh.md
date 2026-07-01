---
title: "Agent 設計模式圖鑑 Part 9｜如何選擇 Agent 架構：決策樹、評估矩陣與常見反模式"
description: "從是否需要 Agent 開始，透過六維選型流程、評估矩陣、Production 實用性排序、常見反模式與架構評審 Checklist，將 Agent 名詞轉化成可落地的架構決策。"
date: 2026-07-01T13:58:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 9
---

## How to Choose an Agent Architecture: Decision Trees, Evaluation Matrices, and Anti-Patterns

前八篇，我們已經看過 Direct、Pipeline、Router、State Machine、DAG、ReAct、Planning、Tree Search、Verifier、Multi-Agent 與 Memory。

知道名詞，只代表你擁有一盒積木。

更難的是：

> 面對真實需求，應該拿哪些積木、拒絕哪些積木，以及如何證明這套架構值得進入 Production？

Part 9 的主要任務，是讓讀者從「知道名詞」走到「可以做架構決策」。

本文會完成四件事：

1. 判斷任務是否真的需要 Agent
2. 沿六個維度做選型
3. 以成本、延遲、可靠度與可觀測性評估方案
4. 使用 Architecture Canvas、反模式表與 Review Checklist 完成正式評審

---

## 一、先問：這個任務真的需要 Agent 嗎？

很多團隊一開始就問：

- 要用 ReAct 還是 Plan-and-Execute？
- 要不要 Multi-Agent？
- 要不要 Long-term Memory？
- 要不要 Tree of Thoughts？

但更早的問題應該是：

> 這個任務能不能由 Direct、Pipeline 或 Router 完成？

Agent 不是預設答案。

Agent 是當固定邏輯無法合理處理以下情況時，才應該加入的能力：

- 下一步依賴中間 Observation
- Tool Result 會改變後續路線
- 任務路徑無法事先完整列舉
- 任務需要持久 State
- 任務需要動態 Planning
- 任務需要有限自主地處理未知情況

### Direct

適合：

- 一次模型呼叫
- 無外部工具
- 不需要持久 State
- 低風險
- 輸入中已有足夠資訊

例如翻譯、改寫、摘要、分類與格式轉換。

### Pipeline

適合：

- 固定順序
- 每一步可預測
- 可獨立測試
- 不需要動態選擇下一個 Tool

例如：

```text
Upload
 ↓
Parse
 ↓
Validate
 ↓
Store
```

### Router

適合：

- 不同 Request 需要不同路徑
- 不同資料來源
- 不同成本層級
- 不同風險與工具

例如：

```text
User Request
 ↓
Router
 ├→ Direct
 ├→ RAG
 ├→ SQL
 ├→ Calculator
 ├→ Agent Workflow
 └→ Human Review
```

### Agentic Workflow

適合：

- 下一步依賴 Observation
- 需要多輪工具互動
- 需要有限自主
- 需要 Retry、Fallback 或 Replanning

### Stateful Agent

如果任務包含以下需求，通常需要 State Machine 或持久 State：

- Pause / Resume
- Human Approval
- Retry Limit
- Replanning
- 長時間執行
- 斷點恢復
- Pending / Partial / Blocked 等終止狀態

![Figure 9-1 — Do You Need an Agent?](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-1-do-you-need-an-agent.png)

> **Figure 9-1｜Do You Need an Agent?**
> 先從 Direct、Pipeline 與 Router 開始，只有當下一步依賴 Observation、工具回傳或持久 State 時，才升級成 Agentic Workflow 或 Stateful Agent。

---

## 二、把需求轉成可判斷的系統特性

不要直接從需求跳到 Framework。

先把需求轉成五類架構特性。

### 任務特性

- 單步或多步？
- 固定或動態？
- 是否有分支？
- 是否需要循環？
- 是否需要平行？
- 是否需要 Pause / Resume？
- 是否需要人工批准？

### 資料特性

- 資料是否已在輸入中？
- 是否需要 RAG？
- 是否需要即時 Web？
- 是否需要 SQL？
- 是否涉及敏感資料？
- 是否有版本與時效？

### 工具特性

- 工具有幾種？
- 工具是否可逆？
- 是否會寫入？
- 是否有高風險操作？
- 是否需要 Sandbox？
- 是否有權限差異？

### 品質特性

- 是否有明確正確答案？
- 是否能定義 Completion Criteria？
- 是否能外部測試？
- 是否需要 Citation？
- 是否允許 Partial？
- 是否需要 Human Judgment？

### 運營特性

- 延遲上限
- 成本上限
- 可觀測性
- 可重現性
- 合規要求
- Audit
- Availability
- Error Budget

---

## 三、六維架構選擇流程

一套 Agent Architecture 不應只用一個名稱描述。

應沿六個維度分別選擇。

### 維度一：Execution Path

回答：

> 任務從開始到結束怎麼走？

| 模式 | 適合情境 | 主要優點 | 主要風險 |
|---|---|---|---|
| Direct | 單步、低風險 | 最簡單、最低成本 | 能力有限 |
| Pipeline | 固定流程 | 可控、可測試 | 不適合動態分支 |
| Router | 多種 Request | 成本與路徑分流 | 錯誤路由 |
| State Machine | 長任務、恢復、審批 | 狀態清楚 | 設計成本較高 |
| DAG | 可平行子任務 | 提升吞吐 | 依賴管理 |
| Event-driven | 監控、非同步 | 適合事件與排程 | 分散狀態複雜 |

選型問題：

```text
流程固定嗎？
是否有分支？
是否需要循環？
是否需要持久 State？
是否需要平行？
是否由事件觸發？
```

### 維度二：Decision and Planning

回答：

> 下一步怎麼決定？

#### Fixed Decision

適合路線可預先定義、成本與風險需要高度可控的任務。

#### ReAct

適合下一步依賴工具結果的 Browser、Debug、Search 與 API Exploration。

需要：

- Max Steps
- Tool Allowlist
- Duplicate Detection
- Stop Condition

#### Plan-and-Execute

適合：

- 長任務
- 有多個子目標
- 容易漏項
- 需要先估算 Budget

#### Adaptive Planning

適合：

- 初始計畫可能失效
- 外部資料不穩定
- Tool 可能不可用
- 需要修改剩餘步驟

需要：

- Plan Version
- Replan Trigger
- Maximum Replans
- Completed Step Registry

#### HTN

適合已有 SOP、企業流程與受控拆解方法。

### 維度三：Reasoning and Search

回答：

> 系統要探索幾條候選路徑？

| 模式 | 何時使用 | 必要前提 |
|---|---|---|
| Single-path | 簡單問題、成本敏感 | 有強 Verifier |
| Self-consistency | 明確答案、可投票 | 可正規化答案 |
| Generate-and-Rank | 多個完整方案 | 有可靠 Ranker |
| Beam Search | 每層有多候選 | 中間狀態可評分 |
| Tree of Thoughts | 需要剪枝與回溯 | Evaluator 可信 |
| Graph of Thoughts | 多路徑需合併 | 狀態管理成熟 |
| MCTS / LATS | 環境中行動與回饋 | Sandbox 與外部 Observation |

如果沒有可靠 Evaluator，不要使用複雜 Search。

### 維度四：Verification and Recovery

回答：

> 系統怎麼知道自己做錯，以及怎麼修？

| 失敗類型 | 建議模式 |
|---|---|
| 暫時性錯誤 | Retry |
| 參數不理想 | Parameterized Retry |
| 主方法不可用 | Fallback |
| 格式或局部品質問題 | Self-Refine |
| 需要問題診斷 | Critic |
| 需要 Pass / Fail | Verifier |
| 可執行產物 | Generate-and-Test |
| 初始計畫失效 | Replanning |
| 未來應避免重犯 | Reflexion |
| 高風險或不可逆 | Human Review |

### 維度五：Agent Organisation

回答：

> 工作由誰完成？

#### Single Agent

預設選項。

#### Role-based Single Agent

需要責任分離，但不需要真正獨立執行。

#### Supervisor–Worker

適合子任務清楚、可平行、需要中央治理的情況。

#### Planner–Executor–Critic

適合規劃、執行與診斷責任分離。

#### Debate / Voting

適合多觀點、反方分析或固定候選聚合。

#### Blackboard

適合多 Agent 共享中間結果。

#### Peer-to-Peer / Swarm

只適合高度分散且已具成熟 Control Plane 的場景。

### 維度六：State and Memory

回答：

> 應該保存什麼，以及保存多久？

| 類型 | 用途 |
|---|---|
| Stateless | 單次任務 |
| Working Memory | 當前任務中間資訊 |
| Short-term State | Workflow 進度 |
| Episodic Memory | 過去事件與結果 |
| Semantic Memory | 穩定知識 |
| Procedural Memory | SOP 與規則 |
| User Memory | 使用者授權的偏好 |
| Shared Memory | 多 Agent 共用資訊 |
| External Knowledge Store | 外部 Source of Truth |

![Figure 9-2 — Six-Dimensional Architecture Selection Workflow](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-2-six-dimensional-architecture-selection-workflow.png)

> **Figure 9-2｜Six-Dimensional Architecture Selection Workflow**
> 從任務特性出發，依序選擇 Execution Path、Decision、Search、Verification、Organisation 與 Memory，最後套用 Policy、Budget、Observability 與 Human Approval。

---

## 四、完整選型矩陣

| 任務特性 | Execution Path | Decision / Planning | Search | Verification | Organisation | State / Memory |
|---|---|---|---|---|---|---|
| 單次文字任務 | Direct | Fixed | Single-path | Schema / Basic Check | Single Agent | Stateless |
| 固定文件處理 | Pipeline | Fixed | Single-path | Schema / Rule | Single Agent | Short-term State |
| 多類型問答 | Router | Fixed / Router | Single-path | Route Check | Single Agent | Query State |
| 文件問答 | RAG Pipeline | Fixed / Query Rewrite | Retrieval + Rerank | Citation / Faithfulness | Single Agent | Query State + External Knowledge |
| 動態 Browser 任務 | State Machine | ReAct | Single-path / Limited Search | Post-condition | Single Agent | Browser State + Action History |
| Coding 修復 | State Machine | Plan-and-Execute | Generate-and-Test | Tests / Build / Diff | Single Agent 或 Role-based | Repo Snapshot + Attempt State |
| Deep Research | State Machine + DAG | Adaptive Planning | Generate-and-Rank | Source Coverage / Citation | Supervisor–Worker | Evidence Store + Working Memory |
| 多觀點評估 | Pipeline / State Machine | Fixed | Debate / Voting | Judge + External Verifier | Multi-Agent | Shared State |
| 高風險企業操作 | State Machine | Fixed Policy Flow | 通常不需 Search | Rule + Human Approval | Single Agent / Role-based | Approval State + Audit Log |
| 長期監控 | Event-driven | Fixed / Limited Agentic | Single-path | Change Verification | Single Agent | Baseline + Alert History |
| 高度分散協作 | Event-driven / P2P | Local Planning | Distributed Search | Global Verifier | Peer-to-Peer / Swarm | Shared Memory + Control Plane |

---

## 五、什麼時候選 ReAct、Planning 或 Adaptive Planning？

### ReAct

使用時機：

- 每一步需要 Observation
- 無法預先知道下一個 Tool
- 任務路徑短至中等
- 局部決策比全局計畫更重要

不要用於：

- 非常長的任務
- 高風險固定流程
- 有清楚依賴與完整交付物的專案

### Plan-and-Execute

使用時機：

- 多個明確子目標
- 需要避免漏項
- 子任務順序重要
- 需要先估算 Budget

### Adaptive Planning

使用時機：

- 外部資料可能不存在
- Tool 可能失效
- 原始假設可能錯
- 需要修改剩餘計畫

---

## 六、什麼時候需要多路搜尋？

多路搜尋只有在以下條件成立時才值得：

- 問題存在多個重要候選
- 早期選擇會影響後續
- 中間結果可評估
- 有足夠 Budget
- 有可靠 Evaluator
- 搜尋行動可安全執行

| 情境 | 建議 |
|---|---|
| 多次生成且答案可投票 | Self-consistency |
| 多個完整方案需比較 | Generate-and-Rank |
| 每層保留少數候選 | Beam Search |
| 需要剪枝與回溯 | Tree of Thoughts |
| 需要合併路徑 | Graph of Thoughts |
| 在環境中行動與回饋 | LATS |

---

## 七、什麼時候需要 Multi-Agent？

適合 Multi-Agent：

- 子任務自然分離
- 可平行執行
- 不同 Agent 需要不同工具或權限
- 需要獨立觀點
- 一個 Context 太大
- 需要中央治理或共享工作區

不適合 Multi-Agent：

- 任務高度依賴同一 Context
- 一個 Agent 已能完成
- 沒有 Aggregator
- 沒有 Final Owner
- 沒有共享狀態治理
- 交接成本高於執行成本

最小可行順序：

```text
Single Agent
 ↓
Role-based Single Agent
 ↓
Supervisor–Worker
 ↓
Blackboard / Debate
 ↓
Peer-to-Peer / Swarm
```

這不是成熟度階梯，而是協調成本的增加順序。

---

## 八、驗證機制如何選？

| 任務 | 優先驗證 |
|---|---|
| JSON / Schema | Deterministic Validation |
| SQL | Parser + Read-only Policy + Execution |
| RAG | Citation + Faithfulness |
| Coding | Tests + Lint + Build |
| Browser | Post-condition |
| Research | Source Coverage + Conflict Check |
| 高風險操作 | Policy + Human Approval + Audit |
| 開放式文字 | Rubric + Critic + Human Sampling |

原則：

- 能用規則，不只用 LLM
- 能執行，不只目視
- 能查來源，不只投票
- 高風險需要責任與授權
- Verifier 必須能輸出 Fail

---

## 九、Memory 如何選？

### Working Memory

使用於長任務、中間資訊與 Context 壓縮。

### Short-term State

使用於 State Transition、Retry、Approval、Pause / Resume。

### Episodic Memory

使用於相似案例、過去事件與行動回放。

### Semantic Memory

使用於可治理的穩定知識。

### Procedural Memory

使用於 SOP、工具規則與驗收程序。

### User Memory

只保存使用者明確授權、長期穩定且可查看與刪除的偏好。

### 不使用 Long-term Memory

當任務一次性、資料敏感、資訊容易過期，或可以從 Source of Truth 重新檢索時。

---

## 十、自主度 vs 可控性

| 模式 | 自主度 | 可控性 |
|---|---:|---:|
| Direct | 很低 | 很高 |
| Fixed Pipeline | 低 | 很高 |
| Router | 低～中 | 高 |
| Agentic Workflow | 中 | 中～高 |
| Plan-and-Execute | 中～高 | 中 |
| Adaptive Agent | 高 | 中～低 |
| Long-running Autonomous Agent | 很高 | 低 |

Production Sweet Spot 通常是：

> 局部自主 + 明確 Workflow + Policy + Verifier + Human Approval。

![Figure 9-3 — Agent Autonomy and System Control Matrix](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-3-agent-autonomy-system-control-matrix.png)

> **Figure 9-3｜Agent Autonomy and System Control Matrix**
> 自主度越高通常越靈活，但可預測性下降。Agentic Workflow 常位於實用平衡區，而 Multi-Agent 不是固定自主度等級。

---

## 十一、成本、延遲、可靠度與可觀測性

### 成本

- Model Calls
- Token
- Tool Calls
- Search API
- Browser
- Sandbox
- Human Review

### 延遲

- 模型延遲
- 工具延遲
- Worker 等待
- 人工審批
- Retry

### 可靠度

- Success Rate
- Partial Rate
- Retry Rate
- Verifier Pass Rate
- Post-condition Success

### 可觀測性

- Trace
- State Transition
- Tool Call
- Prompt / Model Version
- Cost
- Failure Reason
- Audit

---

## 十二、成本 vs 品質矩陣

| 架構 | 潛在品質 | Runtime Cost | 延遲 | Operational Risk | 適合 |
|---|---:|---:|---:|---:|---|
| Direct | 低～中 | 低 | 低 | 低 | 單次任務 |
| Pipeline | 中 | 低～中 | 低 | 低 | 固定流程 |
| RAG | 中～高 | 中 | 低～中 | 中 | 有來源問答 |
| Agentic Workflow | 高 | 中～高 | 中～高 | 中～高 | 動態多步驟 |
| Multi-Agent | 視設計 | 高 | 高 | 高 | 自然分工 |
| Long-running Autonomous | 不穩定 | 很高 | 很高 | 很高 | 少數特殊場景 |

原則：

> 在達到品質門檻的方案中，選擇成本、延遲與運營風險最低者。

![Figure 9-4 — Cost vs Quality Matrix](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-4-cost-vs-quality-matrix.png)

> **Figure 9-4｜Cost vs Quality Matrix**
> 架構越複雜不代表品質一定越高。Production 選型應先設定品質門檻，再選擇成本、延遲與運營風險最低的可行方案。

---

## 十三、Production 實用性排序

這裡的排序不是能力強弱，而是大多數 Production 專案應優先掌握與考慮的順序。

| Tier | 模式 | Production 實用性 | 建議 |
|---|---|---:|---|
| A | Direct、Pipeline、Router、State Machine、Verifier | 很高 | 優先掌握 |
| A | RAG、ACL、Citation、Budget、Trace | 很高 | 常見核心能力 |
| B | DAG、Plan-and-Execute、Generate-and-Test | 高 | 依任務使用 |
| B | Working Memory、Procedural Memory | 高 | 長任務與治理 |
| C | Supervisor–Worker、Debate、Blackboard | 中 | 有自然分工再用 |
| C | Self-consistency、Generate-and-Rank、Beam Search | 中 | 有 Evaluator 再用 |
| D | Tree of Thoughts、Graph of Thoughts、LATS | 低～中 | 高價值特殊場景 |
| D | Peer-to-Peer、Swarm | 低 | 成熟 Control Plane 才使用 |
| D | Long-running Autonomous Agent | 低 | 高運營成本與風險 |

---

## 十四、十大 Agent 反模式與修正方法

| 反模式 | 問題 | 修正方法 | 驗收標準 |
|---|---|---|---|
| Framework-first | 先選工具再找需求 | 先完成 Architecture Canvas | Pattern 選擇有理由 |
| Pattern Shopping | 新 Pattern 全部加入 | 每個 Pattern 必須對應需求 | 無無用途元件 |
| Multi-Agent Inflation | 角色名稱冒充獨立 Agent | 先用 Role-based Single Agent | 有獨立責任才算 Agent |
| Search Without Evaluator | 搜尋更多卻不知何者較好 | 先建立 Evaluator | 中間狀態可評分 |
| Memory Without Governance | 所有內容進 Vector Store | 加 Source、Scope、Version、Expiry | 記憶可更新、刪除 |
| Human-in-the-loop Theater | 只有 Approve 按鈕 | 顯示證據、風險、影響 | 審批者能實質判斷 |
| Autonomy as KPI | 把自主度當成熟度 | 設定最低必要自主度 | 自主性有明確收益 |
| Retry as Recovery | 所有錯誤都重試 | 先分類 Failure | Retry 只處理暫時性錯誤 |
| Demo Success as Production Readiness | 一次成功就上線 | 測試 Failure Path | 正常、失敗、高風險皆驗證 |
| No Final Owner | 多個 Agent 無人負責 | 指定 Final Owner | 只有一個正式完成者 |

---

## 十五、Agent Architecture Canvas

一張完整 Canvas 應包含十五個欄位。

1. User Goal
2. Success Criteria
3. Inputs and Data
4. Tools and Actions
5. Execution Path
6. Decision and Planning
7. Search Strategy
8. Verification and Recovery
9. Agent Organisation
10. State and Memory
11. Policy and Safety
12. Budget and Limits
13. Observability
14. Terminal States
15. Final Owner

每個欄位都必須回答：

- 這個決策是什麼？
- 為什麼需要？
- 有哪些限制？
- 怎樣驗收？

![Figure 9-5 — Agent Architecture Canvas](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-5-agent-architecture-canvas.png)

> **Figure 9-5｜Agent Architecture Canvas**
> 透過十五個欄位，把需求、工具、流程、Planning、Search、Verification、Organisation、Memory、Policy、Budget、Observability 與 Final Owner 放在同一張架構畫布上。

---

## 十六、完整案例：從需求到架構

需求：

> 建立一個部落格 Ask AI，使用者可以問文章內容，系統根據站內文章回答並附來源。必要時可以改寫 Query，但不能自由瀏覽全網，也不能無限重試。

### Step 1：是否需要 Agent？

大部分流程是固定 RAG Pipeline。

只有 Query Rewrite、Retrieval Retry 和 Clarification 需要有限 Agentic 能力。

結論：

```text
不是 Full Agent
而是 Agentic RAG Workflow
```

### Step 2：Execution Path

```text
Router
 ↓
RAG Pipeline
 ↓
Citation Verifier
```

### Step 3：Decision

- Fixed Flow
- Bounded Query Rewrite
- Maximum 1 Retry

### Step 4：Search

- Hybrid Retrieval
- Reranker
- Source Diversity
- 不需要 Tree Search

### Step 5：Verification

- Citation Coverage
- Claim Support
- Permission Check
- Answerability

失敗結果：

- Retry
- Clarify
- Abstain

### Step 6：Organisation

Single Agent 足夠。

不需要 Multi-Agent。

### Step 7：State and Memory

需要：

- Original Query
- Rewritten Query
- Retrieved IDs
- Citation Map
- Retry Count

不需要：

- Episodic Memory
- User Memory
- Shared Memory

### Step 8：Policy

- 只可使用站內文章
- 不可引用未授權內容
- 不可自由 Web Search
- 不生成無來源事實

### Step 9：Budget

- Max Retrieval Calls: 2
- Max Rewrite: 1
- Max Answer Tokens
- Max Latency
- No Infinite Retry

### Step 10：Terminal States

- Completed
- Clarification Required
- Unsupported
- Insufficient Evidence
- Failed

### 最終架構描述

```text
User Goal:
Answer questions from blog content with citations

Execution Path:
Router → RAG Pipeline → Citation Verifier

Decision:
Fixed flow with one bounded Query Rewrite

Search:
Hybrid Retrieval + Rerank

Verification:
Citation Coverage
Claim Support
Permission Check

Organisation:
Single Agent

State:
Original Query
Rewritten Query
Retrieved IDs
Citation Map
Retry Count

Memory:
No unrestricted long-term memory

Policy:
Blog corpus only
No unsupported claims
No open Web access

Budget:
2 retrieval calls
1 rewrite
bounded latency and tokens

Terminal States:
Completed
Clarification Required
Unsupported
Insufficient Evidence
Failed

Final Owner:
RAG Orchestrator
```

---

## 十七、架構評審 Checklist

### Need Review

- [ ] 任務確實需要 Agentic 能力
- [ ] 已確認 Direct、Pipeline 或 RAG 無法單獨完成
- [ ] Agent 自主性有可衡量收益
- [ ] 沒有為了流行而加入 Agent

### Workflow Review

- [ ] Execution Path 已明確定義
- [ ] 所有 State 有入口與出口
- [ ] 所有 Loop 有上限
- [ ] Retry、Repair、Replan 已分開
- [ ] Terminal States 已定義
- [ ] Pause / Resume 行為已定義
- [ ] Human Approval 後如何 Resume 已定義

### Tool and Permission Review

- [ ] 使用最小權限
- [ ] Read / Write 工具已分開
- [ ] 高風險工具有 Approval Gate
- [ ] Secret 已隔離
- [ ] Sandbox 已建立
- [ ] Tool Allowlist 不只寫在 Prompt
- [ ] 不可逆操作有 Idempotency 或 Compensation

### Verification Review

- [ ] Completion Criteria 明確
- [ ] Verifier 可以輸出 Fail
- [ ] 優先使用 deterministic checks
- [ ] 可執行產物有真實測試
- [ ] RAG 有 Citation / Faithfulness Check
- [ ] Browser 有 Post-condition
- [ ] 高風險操作有執行後驗證
- [ ] 測試與驗收條件不能被 Agent 任意修改
- [ ] 支援 Partial / Unsupported / Pending

### State and Memory Review

- [ ] State 與 Memory 已分開
- [ ] Working Memory 有 TTL
- [ ] Long-term Memory 有 Source
- [ ] Memory 有 Scope、Version、Expiry
- [ ] 未驗證內容不能直接寫入
- [ ] User / Tenant Isolation 已完成
- [ ] Shared Memory 有 Read / Write 權限
- [ ] 支援 Supersede、Delete、Audit
- [ ] 可從 Source of Truth 取得的資料不重複永久保存

### Cost and Reliability Review

- [ ] Global Budget 已定義
- [ ] Per-step Budget 已定義
- [ ] Max Steps 已定義
- [ ] Retry Limit 已定義
- [ ] Replan Limit 已定義
- [ ] Tool Call Limit 已定義
- [ ] Timeout 已定義
- [ ] No-progress Detection 已完成
- [ ] Kill Switch 已建立
- [ ] 有 Safe Mode 或降級路徑

### Observability Review

- [ ] 每個任務有 Trace ID
- [ ] State Transition 可觀察
- [ ] Tool Call 可追蹤
- [ ] Model Version 已保存
- [ ] Prompt Version 已保存
- [ ] Cost 與 Latency 可量測
- [ ] Failure Reason 可查詢
- [ ] 高風險操作有 Audit Log
- [ ] 可以安全 Replay

### Human Responsibility Review

- [ ] 已指定 Final Owner
- [ ] 已指定 Approver
- [ ] 避免 Self-approval
- [ ] Human Review 顯示證據與風險
- [ ] Approval 有 Expiry
- [ ] 執行前會重新驗證狀態
- [ ] 拒絕、逾時、取消都有處理路徑

### Go-Live Decision

- [ ] Go
- [ ] Pilot
- [ ] No-Go
- [ ] Required Remediation 已記錄
- [ ] Review Owner 已指定
- [ ] Review Date 已記錄

---

## 十八、Go、Pilot、No-Go 判定

### Go

- Completion Criteria 明確
- 主要流程可驗證
- 權限最小化
- Failure Path 已測試
- Trace 完整
- 高風險操作有 Approval

### Pilot

- 核心流程可運作
- 仍需人工監控
- 某些 Failure Mode 尚未充分驗證
- 限定使用者、資料與範圍
- 有快速 Kill Switch

### No-Go

- 無可靠 Verifier
- 高風險工具無 Approval
- 無持久 State
- 無成本上限
- 無 Terminal State
- 記憶治理不清
- 無法 Audit
- 失敗可能造成不可逆傷害

---

## 十九、最終選型原則

1. 先選最簡單可行架構
2. 把自主性放在真正需要的節點
3. 先設計 Verifier，再設計 Agent
4. 風險越高，自主度越低
5. Memory 必須可治理
6. Multi-Agent 必須有 Final Owner
7. 成本與延遲是架構需求
8. 正式失敗是一種能力
9. 所有 Loop 都需要出口
10. Production Readiness 來自可控性

---

## 本篇結論

選擇 Agent 架構，不是挑一個最熱門的名詞。

而是回答：

```text
任務怎麼走？
下一步怎麼決定？
要探索幾條候選？
錯誤怎麼驗證與恢復？
工作由誰完成？
State 與 Memory 怎麼保存？
```

再用四個 Production 約束收尾：

```text
Policy
Budget
Observability
Human Responsibility
```

整個系列可以收束成一句話：

> **最好的 Agent 架構，是用最低必要複雜度，可靠完成任務的架構。**

---

## 《Agent 設計模式圖鑑》系列目錄

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

## 圖表對位表

| 圖號 | 正式圖名 | 建議檔名 | 對應段落 |
|---|---|---|---|
| Figure 9-1 | Do You Need an Agent? | `figure-9-1-do-you-need-an-agent.png` | 是否需要 Agent |
| Figure 9-2 | Six-Dimensional Architecture Selection Workflow | `figure-9-2-six-dimensional-architecture-selection-workflow.png` | 六維選型流程 |
| Figure 9-3 | Agent Autonomy and System Control Matrix | `figure-9-3-agent-autonomy-system-control-matrix.png` | 自主度與可控性 |
| Figure 9-4 | Cost vs Quality Matrix | `figure-9-4-cost-vs-quality-matrix.png` | 成本、品質與風險 |
| Figure 9-5 | Agent Architecture Canvas | `figure-9-5-agent-architecture-canvas.png` | 最終架構設計畫布 |
