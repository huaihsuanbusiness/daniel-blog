---
title: "Agent 設計模式圖鑑 Part 1｜LLM Agent 不只有 ReAct：用六個維度看懂 Agent 架構"
description: "用六個實務設計維度分析 LLM Agent：執行路徑、決策與規劃、推理與探索、驗證與修正、Agent 組織，以及狀態與記憶。"
date: 2026-06-17T09:00:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 1
---

談到 LLM Agent，很多人第一個問題是：

> 應該使用 ReAct，還是 Plan-and-Execute？

這個問題合理，但它只比較了 Agent 系統的一個部分：**下一步行動如何決定**。

一套真正可上線的 Agent，可能在工具執行節點內使用 ReAct，由狀態機控制整體流程，再由驗證器判斷結果是否通過；同時以記憶保存進度，並由監督者協調多個專業工作者。這些機制不是在搶同一份工作，而是位於不同的架構層。

如果把所有 Agent 名詞塞進同一張比較表，再問哪一個最好，答案通常看似完整，實際上無法落地。架構討論的第一步，不是挑選模式，而是先分清楚每個模式回答了什麼問題。

本文使用六個實務設計視角：

1. **執行路徑**：任務如何從開始走到結束
2. **決策與規劃**：下一步行動如何選擇
3. **推理與探索**：多個候選方案如何搜尋
4. **驗證與修正**：錯誤如何被發現、隔離與處理
5. **Agent 組織**：責任如何分配
6. **狀態與記憶**：哪些資訊要保存、由誰持有、保存多久

這六個維度是一套偏向工程實作、產品判斷與正式環境審查的**工作模型**，不是唯一或公認的學術分類法。

## 同一套系統可以同時包含多種模式

先看一個研究型 Agent：

```text
使用者提出問題
 -> Router 判斷問題類型
 -> Planner 拆解研究任務
 -> Research Worker 搜尋與閱讀來源
 -> Verifier 檢查證據與結論
 -> 證據不足時由 Replanner 修改剩餘計畫
 -> Writer 整理最終回答
```

同一套系統可能同時使用：

- **Router**：選擇任務路徑
- **Plan-and-Execute**：先建立高層計畫
- **ReAct**：讓工作者依照最新觀察結果選擇工具與行動
- **State Machine**：限制允許的狀態轉移
- **Verifier**：依照證據、資料格式或政策驗收結果
- **Supervisor-Worker**：協調不同專業角色
- **Working Memory**：保存目前發現與進度
- **Bounded Retry**：限制同一失敗最多重試幾次

因此，問 Router 和 ReAct 哪個比較好，就像問變速箱和導航系統哪個比較好。兩者處理的是不同問題。

![Figure 1-1 — Six Dimensions of Agent Architecture](/images/the-atlas-of-agent-design-patterns-part-1/01-six-dimensions-overview.png)

> **Figure 1-1｜Six Dimensions of Agent Architecture**  
> 用一張圖把六個維度放在一起：執行路徑、決策與規劃、推理與探索、驗證與修正、Agent 組織、狀態與記憶。

## 六維架構地圖

| 維度 | 它回答的問題 | 代表模式 |
|---|---|---|
| 執行路徑 | 任務從開始到結束怎麼走？ | Direct、Pipeline、Router、State Machine、DAG |
| 決策與規劃 | 下一步行動如何決定？ | ReAct、Plan-and-Execute、Adaptive Planning |
| 推理與探索 | 多個候選方案如何搜尋？ | Single-path、Self-consistency、Generate-and-Rank、Tree of Thoughts、Graph of Thoughts、LATS |
| 驗證與修正 | 如何發現錯誤、控制影響並恢復？ | Retry、Fallback、Critic、Verifier、Generate-and-Test、Reflexion |
| Agent 組織 | 工作由誰負責、如何整合？ | Single Agent、Supervisor-Worker、Debate、Blackboard、Swarm |
| 狀態與記憶 | 哪些資訊要保存、由誰持有、保存多久？ | Working State、Episodic、Semantic、Procedural、User、Shared Memory |

每個維度都可以選擇一種或多種機制。例如：

```text
執行路徑 State Machine
決策方式 Plan-and-Execute + Bounded ReAct
探索方式 預設 Single-path；必要時 Generate-and-Rank
驗證方式 Deterministic Check + Citation Verifier + Bounded Retry
組織方式 Single Agent + Specialist Tools
狀態與記憶 Working State + Governed Procedural Memory
治理機制 Budget Guard + Tool Allowlist + Timeout + Approval Gate
```

這段描述，比「我們做了一個 ReAct Agent」提供了更多可實作、可驗收的資訊。

## 維度一：任務如何在系統中流動？

執行路徑是整套系統的控制骨架。它關心的是：

> 任務可以經過哪些節點？順序是什麼？什麼條件會切換路徑？失敗後要去哪裡？

### Direct

Direct 是單次輸入到輸出：

```text
Input -> Model -> Output
```

翻譯、改寫、擷取、簡單分類等一次性轉換，通常不需要 Agent。若任務沒有實質工具使用、持久狀態、分支或多步恢復，直接呼叫模型通常更便宜、更快，也更容易測試。

### Pipeline

Pipeline 使用預先定義的固定順序：

```text
Rewrite -> Retrieve -> Rerank -> Generate -> Verify
```

它適合正式環境，因為每個步驟都有清楚輸入與輸出，可以分別量測延遲、成本、品質與失敗率。缺點是僵硬：即使某個請求不需要其中一個步驟，也可能照樣走完整條流程。

### Router

Router 先選擇要走哪一條路：

```text
User Request -> Router -> Direct Answer
 -> RAG Search
 -> SQL
 -> Calculator
 -> Agent Workflow
```

路由判斷可以根據意圖、權限、風險、所需工具、預算、延遲要求或資料敏感度進行。Router 的價值通常不是「讓模型更聰明」，而是避免每一個簡單問題都啟動最昂貴的完整流程。

### State Machine

State Machine 明確記錄目前狀態與允許的狀態轉移：

```text
START -> RETRIEVE -> ENOUGH_EVIDENCE?
 yes -> ANSWER -> END
 no -> REWRITE_QUERY -> RETRIEVE
```

它適合需要斷點恢復、人工審批、有限重試、失敗路由與明確停止條件的系統。

ReAct 可以決定目前最適合的局部行動；State Machine 則決定目前狀態允許哪些行動。前者提供現場判斷，後者負責交通規則。

### DAG

DAG 是沒有循環的有向圖。互相獨立的分支可以平行執行，最後再整合：

```text
Problem -> Decompose -> Research A --\
 -> Research B ----> Synthesis
 -> Research C --/
```

DAG 適合批次分析、多來源研究與可平行拆解的任務。由於 DAG 按定義不能形成循環，若流程需要反覆修正，通常要在外層使用 State Machine，或重新啟動一次新的圖執行。

![Figure 1-2 — Direct, Pipeline, Router, State Machine, and DAG](/images/the-atlas-of-agent-design-patterns-part-1/02-execution-structures.png)

> **Figure 1-2｜Direct, Pipeline, Router, State Machine, and DAG**  
> Direct、Pipeline、Router、State Machine 與 DAG 五種執行路徑模式，從單次呼叫到可平行子任務依複雜度遞增。

## 維度二：下一步怎麼決定？

ReAct、Plan-and-Execute 與 Adaptive Planning 都位於決策與規劃這一層。

### ReAct

ReAct 讓推理、行動與觀察交錯進行：

```text
Reason -> Act -> Observe -> Reason Again
```

搜尋工作者可能先查一個來源，發現資料過期後改寫查詢，再切換到官方文件。下一步取決於最新的觀察結果。

ReAct 適合網頁研究、除錯、瀏覽器操作與 API 探索等工具結果難以預測的任務。它在正式環境中的主要風險不是彈性不足，而是彈性沒有邊界。可靠實作需要最大步數、工具白名單、成本與時間預算、循環偵測，以及清楚的完成條件。

原始的 [ReAct 方法](https://arxiv.org/abs/2210.03629)讓推理軌跡與任務行動交錯進行，並沒有規定特定的工作流程邊界。正式系統常把 ReAct 限制在某個工作流程節點內，讓局部工具使用保有彈性，同時維持整體流程可控。這是工程選擇，不是 ReAct 定義的一部分。

### Plan-and-Execute

Plan-and-Execute 先建立完整或高層計畫，再執行步驟：

```text
Goal -> Build Plan -> Execute Steps -> Integrate Result
```

它適合長篇研究、多階段報告與容易漏項的分析任務。優點是有全局視野；風險是初始前提一旦錯誤，後續步驟可能執行得很完整，卻仍然走向錯誤方向。

### Adaptive Planning

Adaptive Planning 會根據新證據修改尚未完成的步驟：

```text
Build Plan -> Execute One Step -> Check Result
 -> Keep Plan
 -> Revise Remaining Steps
```

這和 Retry 不同。Retry 是在大致相同的計畫下重跑某個行動；重新規劃則改變接下來要做什麼。

### 常見的正式環境混合架構

實務上常見的組合是：

```text
Planner 建立高層計畫
 -> Executor 在子任務內使用 Bounded ReAct
 -> Verifier 驗收完整度與品質
 -> 必要時由 Replanner 修改剩餘計畫
 -> State Machine 控制狀態轉移與上限
```

![Figure 1-3 — Planner, ReAct Executor, Verifier, and Replanner](/images/the-atlas-of-agent-design-patterns-part-1/03-planner-react-executor.png)

> **Figure 1-3｜Planner, ReAct Executor, Verifier, and Replanner**  
> Planner 建立高層計畫；Bounded ReAct 在子任務內執行；Verifier 驗收；Replanner 修改剩餘計畫。

## 維度三：候選方案怎麼探索？

決策模式處理下一步行動；搜尋模式則決定系統只走一條候選路線，還是同時探索多條路。

### Single-path Reasoning

系統只產生一條主要路徑。優點是快、成本低，適合多數日常任務；缺點是前段一旦判斷錯誤，後續結果容易一起偏移。

### Self-consistency

原始的 [Self-consistency 方法](https://arxiv.org/abs/2203.11171)會抽樣多條不同的推理路徑，再選擇最一致的答案。它能降低部分解碼變異，但「多數一致」本身不是證據；多個候選方案仍可能共享同一個錯誤前提。

### Generate-and-Rank

系統先產生多個候選方案，再依照明確條件評分：

```text
Generate A, B, C -> Score Cost, Risk, Quality -> Select or Combine
```

排序器本身就是架構的一部分。若評分規則模糊，或只偏好文風而無法判斷正確性，多生成幾個候選方案，只會得到一堆被自信排序的錯誤答案。

### Tree of Thoughts

[Tree of Thoughts](https://arxiv.org/abs/2305.10601) 把中間解題狀態表示成分支。系統可以展開較有希望的節點、評估分支、淘汰較弱路線，並回到前面的狀態探索其他方向。它最適合「在完整答案完成前，就能評估部分結果」的任務。

### Graph of Thoughts

[Graph of Thoughts](https://arxiv.org/abs/2308.09687) 不只是「樹狀搜尋最後把分支合併」。不同思考單元可以有多個前置依賴，也能被轉換、聚合與重用，形成比樹更一般化的圖結構。較實用的理解方式是：中間結果可以重新組合與重用，但不同 GoT 系統不一定具有相同拓撲。

### LATS 與行動搜尋

[Language Agent Tree Search（LATS）](https://arxiv.org/abs/2310.04406)結合樹狀搜尋、語言模型行動、價值估計、自我反思與外部回饋。更廣義地說，行動搜尋會提出候選行動、執行或模擬、評估結果、保留較好的分支，再繼續探索。它最適合結果可以可靠評分的環境，例如程式測試、遊戲、具有明確成功條件的瀏覽器任務，以及其他可驗證的結構化任務。

搜尋不是免費午餐。它會增加模型呼叫、工具執行、狀態量、延遲，以及對評估器品質的依賴。

![Figure 1-4 — Line, Tree, and Graph Search Structures](/images/the-atlas-of-agent-design-patterns-part-1/04-search-structures.png)

> **Figure 1-4｜Line, Tree, and Graph Search Structures**  
> 從單一路徑、Self-consistency、Generate-and-Rank 走到 Tree of Thoughts、Graph of Thoughts 與 LATS 的多路搜尋結構。

## 維度四：錯誤如何被發現與處理？

能採取很多行動，不代表系統知道自己是否做對。行動能力與驗證能力必須分開設計。

### Retry

Retry 適合逾時、速率限制、暫時性網路錯誤或偶發格式失敗。它需要退避策略、硬性上限、逾時限制與升級處理路徑。若根本原因沒有改變，原樣重跑通常只會複製同一個失敗。

### Fallback

Fallback 會更換方法或資源，例如備用模型、替代 API、快取結果或降級模式。它提高可用性，但備援路徑不一定提供相同品質與保證。

### Critic

Critic 提供質化回饋，例如遺漏需求、論證薄弱、缺少證據或存在風險。它適合支援修訂，但不一定能產生可自動執行的通過／不通過結果。

### Verifier

Verifier 依照明確契約檢查結果，例如資料格式、測試、證據、政策、權限或數值不變量。好的 Verifier 必須有可觀測條件與清楚的判定邊界。

可以簡化成：

- **Critic：** 哪裡需要改進？
- **Verifier：** 是否達到驗收門檻？

### Generate-and-Test

Generate-and-Test 會把輸出放進外部或可重現的測試環境：

```text
Generate -> Run Test -> Pass?
 yes -> Accept
 no -> Inspect Failure -> Revise -> Test Again
```

它特別適合程式碼、SQL、資料轉換、API 呼叫、建置與部署。模型說「看起來正確」，不等於測試真的通過。

### Reflexion

原始的 [Reflexion 方法](https://arxiv.org/abs/2303.11366)使用文字化回饋與情節記憶緩衝區，讓後續嘗試能利用前次失敗經驗。正式系統可以進一步驗證經驗、保留來源資訊、對規則做版本控制、讓過期規則失效，並只把可靠經驗提升為程序性記憶。

這些治理能力屬於正式環境的延伸，不應被誤認為原始研究方法本身。把每次自我反省直接永久寫入記憶很危險，錯誤經驗可能污染未來所有執行。

![Figure 1-5 — Verification and Recovery Patterns](/images/the-atlas-of-agent-design-patterns-part-1/05-verification-paths.png)

> **Figure 1-5｜Verification and Recovery Patterns**  
> 從 Retry、Fallback、Critic 到 Verifier 與 Generate-and-Test 的驗證與恢復模式，各有不同的成本與責任邊界。

## 維度五：責任如何分配？

Agent 組織方式定義責任、溝通與整合方式。Agent 數量增加，不會自動提高答案品質。

### Single Agent

一個 Agent 同時負責規劃、工具使用、執行、檢查與回答。它成本低，也容易除錯。許多任務只要有清楚的狀態、工具邊界、驗證器與停止條件，Single Agent 就已經足夠。

### Supervisor-Worker

Supervvisor 負責拆解、分派、追蹤與整合；Worker 負責特定子任務。Worker 應把結構化結果交回 Supervisor 或專門的彙整者。若 Worker 各自把內容直接寫進最終答案，矛盾、重複與缺漏會很難控制。

### Debate

真正的 Debate 會讓多個 Agent 在一輪或多輪中回應彼此的主張，再由 Moderator、Judge 或彙整步驟處理分歧。若只是各自提出獨立方案，再交給 Judge 選擇，更準確的名稱是 **Panel-and-Judge**。兩種形式都可能暴露盲點，但內部一致不等於外部驗證；Judge 也可能共享相同偏誤，或缺少辨別「說得有說服力」與「真的正確」所需的證據。

### Blackboard

多個 Agent 透過結構化共享狀態交換資訊，而不是傳遞完整對話。這能降低上下文重複，也支援非同步工作；但需要資料格式、寫入權限、來源追蹤與衝突處理。

### Swarm

Swarm 透過同儕互動或局部協調運作，而不是依賴固定的中央 Supervisor。它在動態或分散式環境可能有效，但也帶來重複工作、循環交接、責任不清與停止條件薄弱等風險。若系統始終由固定中央節點指揮，更適合稱為 Supervisor-led，而不是 Swarm。

Multi-Agent 是組織選擇，不是成熟度等級。Single Agent 可以高度自主；Multi-Agent 工作流程也可以被嚴格控制。

![Figure 1-6 — Agent Organisation Patterns](/images/the-atlas-of-agent-design-patterns-part-1/06-organisation-patterns.png)

> **Figure 1-6｜Agent Organisation Patterns**  
> Single Agent、Supervisor-Worker、Debate、Blackboard 與 Swarm 等組織方式的責任與整合邊界。

## 維度六：哪些資訊會被保留？

Context、State、Memory 與 RAG 有關聯，但不能混為一談。

### Context（上下文）

Context 是模型此刻可以看到的內容，包括指令、對話、取回片段、工具結果，以及目前上下文視窗內的工作資料。

### Workflow State（工作流程狀態）

State 記錄系統走到哪裡：目前節點、已完成步驟、重試次數、待審批項目、工作者狀態與下一個轉移。Context 強調模型看得到什麼；State 強調流程現在位於哪裡。

### Working Memory（工作記憶）

Working Memory 支援目前任務，包括中間發現、當前子目標、暫時摘要與尚未解決的問題。它可以存放在模型 Context 之外，只有需要時才選擇性注入。

### 依內容類型區分的長期記憶

- **Episodic Memory（情節記憶）**：過去執行的事件與結果
- **Semantic Memory（語意記憶）**：相對穩定的事實與概念
- **Procedural Memory（程序性記憶）**：經過驗證的任務執行規則

這三者是「記憶內容」的分類，不應和所有權或部署範圍混在同一層。

### 依範圍與所有權區分的記憶

- **User Memory（使用者記憶）**：使用者偏好與持久限制
- **Shared Memory（共享記憶）**：多個 Agent 或程序可以存取的資訊
- **Organisation Memory（組織記憶）**：在更大範圍共享、受到治理的知識與程序

範圍決定誰可以讀寫，也會改變隱私、存取控制、刪除與衝突處理的要求。

### RAG

[Retrieval-Augmented Generation（RAG）](https://arxiv.org/abs/2005.11401)會按需求從外部知識庫取回資訊，並讓生成過程以取回資料為條件。在 Agent 系統中，原始來源仍位於 Agent Memory 之外，應保留自己的來源資訊、權限與更新週期。RAG 可以提供上下文，但取回的文件不會自動變成 Agent 的持久記憶。

任何持久記憶都需要治理：來源、時間、版本、可信度、權限、衝突處理、更新規則，以及遺忘或刪除機制。

![Figure 1-7 — Context, State, Memory, and RAG](/images/the-atlas-of-agent-design-patterns-part-1/07-context-state-memory-rag.png)

> **Figure 1-7｜Context, State, Memory, and RAG**  
> Context、State、Memory 與 RAG 各自負責不同範圍；長期記憶還要依內容類型與所有權再分層。

## Workflow、Agentic Workflow 與 Autonomous Agent 的差異

業界對這些名詞沒有唯一邊界，以下使用偏工程實務的定義。

| 特性 | Workflow | Agentic Workflow | Autonomous Agent |
|---|---|---|---|
| 主流程 | 預先定義 | 大致受控 | 動態決定 |
| 局部自主性 | 低 | 選擇性開放 | 高 |
| 可預測性 | 高 | 中到高 | 較低 |
| Debug 難度 | 低 | 中 | 高 |
| 成本可預測性 | 高 | 中 | 較低 |
| 常見正式環境適用度 | 很高 | 經常是最佳折衷 | 任務確實需要時再用 |

Agentic Workflow 保留受控的主流程，只在特定節點開放自主決策。例如整體固定為 `Route -> Research -> Verify -> Answer`，但 Research 節點可以自行選擇查詢與工具。

這種「局部自主、整體可控」通常是正式環境中很實用的折衷。自主性應放在規則確實難以事先寫死，而且輸出仍可以被驗證的位置。

## Agent 自主性與系統控制是不同問題

更高自主性可以增加適應能力，但通常會降低可預測性。它不是從 Direct 一路升級到 Autonomous Agent 的成熟度階梯。

自主性與系統控制應被視為兩條獨立軸，而不是編號式成熟度階梯。實際位置取決於具體實作：規則式 Router 可以非常可控；擁有廣泛工具權限的學習式 Router 可能較難預測。Plan-and-Execute 也可以被嚴格限制，或被做成接近自主系統。

![Figure 1-8 — Agent Autonomy and System Control](/images/the-atlas-of-agent-design-patterns-part-1/08-autonomy-controllability-spectrum.png)

> **Figure 1-8｜Agent Autonomy and System Control**  
> 自主度與可控性是兩條獨立軸；Agentic Workflow 通常落在兩者之間的實用折衷區。

## 一套完整 Agent 架構應該怎麼描述？

不要只說「我們使用 ReAct」，而要把實際選擇說清楚：

| 設計面向 | 選擇範例 |
|---|---|
| 執行路徑 | Router + Stateful Workflow |
| 規劃方式 | 簡單請求使用固定流程；複雜請求使用 Plan-and-Execute |
| 工具執行 | 只在選定節點內使用 Bounded ReAct |
| 候選探索 | 需要時使用 Multi-query Retrieval + Generate-and-Rank |
| 驗證方式 | Deterministic Schema Check、Citation Check、Bounded Retry |
| 組織方式 | 預設 Single Agent；只有拆解確實需要時才增加 Supervisor |
| 狀態與記憶 | Durable Workflow State + Governed Procedural Memory |
| 治理機制 | Tool Allowlist、Budget Guard、Timeout、Approval Gate、Audit Trail |

這樣在架構審查時，才能討論真正重要的問題：

- 哪些路徑是固定的？
- 哪些節點可以由模型選擇行動？
- 通過驗收需要什麼證據？
- Retry 與 Replan 的上限是多少？
- 允許存取哪些工具與資料？
- State 保存在哪裡？
- 如何限制成本、延遲與風險？

## 評估新 Agent Pattern 的六個問題

看到新的論文、框架或產品名稱時，可以先問：

1. 它是否改變任務的執行路徑？
2. 它是否改變下一步行動的選擇方式？
3. 它是否會探索多個候選方案或執行軌跡？
4. 它如何驗證結果並從失敗恢復？
5. 它是否引入新的責任分配或協作模式？
6. 它會保存哪些狀態、知識或經驗？

再補上四個跨維度的正式環境問題：

- 預算與停止條件是什麼？
- 哪些行為可觀測、可測試？
- 權限與人工審批在哪裡執行？
- 元件意見衝突時，誰對最終結果負責？

若一個新名稱無法回答其中任何問題，它可能只是重新包裝，而不是新的架構方法。

## 結論

ReAct 很重要，但它不是完整 Agent 架構。它主要描述推理、行動與觀察交錯進行的方式。完整系統仍必須定義流程、探索策略、驗證、責任、資訊邊界與營運控制。

六個維度提供了一張可重複使用的地圖：

```text
任務怎麼走？
下一步怎麼決定？
多個候選怎麼探索？
結果怎麼驗證，失敗怎麼恢復？
工作由誰負責？
哪些資訊被保留，由誰控制？
```

回答完這些問題後，Agent 名稱會變得更容易比較，也更不容易被誤用。

## 主要參考資料

- [Yao 等人，*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629)
- [Wang 等人，*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171)
- [Yao 等人，*Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601)
- [Besta 等人，*Graph of Thoughts: Solving Elaborate Problems with Large Language Models*](https://arxiv.org/abs/2308.09687)
- [Zhou 等人，*Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models*](https://arxiv.org/abs/2310.04406)
- [Shinn 等人，*Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366)
- [Lewis 等人，*Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
