---
title: "AI代理工作流系列 6 — 什麼時候該用 Workflow，什麼時候才真的需要 Agent？"
description: "不是多步就叫 agent，也不是有人審核就不叫 agent。這篇用 Daniel 的實作經驗，結合 Anthropic 與 OpenAI 的主流定義，整理一套更實用的 workflow vs agent 判斷方法。"
categories: ["ai"]
tags: ["ai", "agent", "workflow", "automation", "openai", "anthropic", "make"]
date: 2026-04-02T09:58:00
featured: false
---

我一直有在用 Make 處理自動化流程，也開始更認真地碰 AI agent 的系統設計。這一路沒有走得很帥，反而比較像一路拆雷。

真正讓我開始把 **workflow** 和 **agent** 分開想，不是因為我突然看懂了所有名詞，而是因為我踩過一個很典型的坑：我只是想讓 AI 幫我把一段話濃縮成一句話，本來一個 model call 就能結束，結果我一時手癢，硬套了 plan-and-execute 這種看起來很 agentic 的結構。最後得到的不是更聰明的系統，而是更長、更慢、更貴，也更難 debug 的鏈路。

那次之後，我才慢慢長出一個比較實用的工作判準：

> **不是步驟多寡決定你是不是 agent，而是「下一步由誰決定」。**

這篇不是官方 taxonomy 大全，而是 Daniel 自己在實作裡越用越相信的一套判斷方法。它和 Anthropic、OpenAI 目前比較主流的說法相容，但我會把重心放在實際做系統時，怎麼少踩坑、少過度設計、少把簡單問題硬做成很像 agent 的東西。

---

## 先把主流定義說清楚，不然後面很容易混線

Anthropic 在 *Building Effective Agents* 裡給了一個很實用的區分：

- **Workflow**：LLM 與工具沿著預先定義好的 code path 被編排
- **Agent**：模型會動態決定自己的流程與工具使用方式

我很喜歡這個分法，因為它不是用「有沒有聊天框」、也不是用「有幾個步驟」來分類，而是抓住真正的控制權問題。

OpenAI 的 *A practical guide to building agents* 與 building agents guide 也給了很接近的方向：先找最簡單可行的解法；如果 deterministic、rule-based 的方式還撐得住，就先不要急著把系統升級成 agent。Agent 真正適合的，是那些傳統規則與固定流程開始失靈的情境。

所以我現在比較不會再講：

- 多步 = agent
- 有 human-in-the-loop = agent
- 有 tool use = agent
- 有 planner = agent

這些都可能是訊號，但都不是最可靠的分界。

---

## 我現在最常用的判斷順序

### 1. 一個 model call 能解嗎？

如果能，就先不要造 workflow。

這句話很老實，但很少人真的做到。很多系統不是因為問題真的複雜才變複雜，而是因為人太早開始設計架構。

像這些任務，很多時候一個 call 就夠：

- 把口語整理成正式 email
- 把一段逐字稿濃縮成摘要
- 幫一段文字改成某種語氣
- 從明確欄位產出固定格式內容

這種情況下，你再去加 planner、router、memory、multi-agent，通常不是在升級，而是在把一個小問題工程化。

而且主流文件也都在提醒這件事。Anthropic 明講，很多時候最成功的做法不是複雜框架，而是簡單、可組合的模式；OpenAI 也明講，agent 比傳統 automation 更擅長的是 deterministic 與 rule-based 開始失效的地方。這其實已經暗示了一個順序：**先把單輪與簡單 augmentations 用到極限，再往上加。**

### 2. 如果一個 call 不夠，路徑能不能先畫出來？

如果可以，我通常先選 workflow。

這是我目前最常用、也最穩的判準。因為很多真實工作雖然是多步，但它的主路徑其實很清楚。你知道每一步大概要做什麼，也知道錯在哪裡時該往哪裡查。

像我自己早期用 Make 練 workflow 時，很常做這種鏈：

`Webhook → 擷取資料 → 正則或欄位處理 → 篩選 → 歸檔 / 通知`

這條路不是不複雜，但它是可預先定義的。你可以把主流程畫出來，也可以為失敗點加 retry、error handler、人工審核、資料補償。這種任務裡，workflow 的價值非常高，因為它：

- 可控
- 可測
- 可觀察
- 可重跑
- 可維護

我現在也還是在用這種方式處理很多工作：

- 定時抓職缺
- 做基礎評分
- 把高分項目送進下一段分析
- 排程與同步資料
- API 串接與資料轉換

它們有時很長，但只要主路徑能先畫出來，我大多還是先選 workflow。

### 3. 如果主路徑不能先寫死，才開始認真考慮 agent

真正該考慮 agent 的，是另一種問題：

> **任務的路徑只有在執行中才會慢慢浮出來。**

例如使用者不是丟給你一份固定表單，而是說：

> 幫我找適合我的遠端產品職缺，先過濾掉不合理的，再比較前三個值得投的機會，最後幫我改寫一版對應的自我介紹。

這時候系統下一步到底該先搜尋、先讀履歷、先問追問、還是先比對條件，往往不是一開始就能完全寫死的。工具怎麼選、資訊要補到哪裡、什麼時候該停、什麼時候該回頭問人，都是在執行過程中才決定。

這時候 agent 才真的開始有價值。你要的不是一條更長的鏈，而是：

- 根據現場資訊調整策略
- 在不同工具之間做動態選擇
- 面對模糊輸入時持續澄清
- 在發現資訊不足時決定回頭補資料

這才是 agent 與 workflow 的真正分野。

### 4. Human-in-the-loop 很重要，但它比較像設計訊號，不是唯一 taxonomy

我以前很容易把問題簡化成一句話：

> 要不要讓人參與中間過程？

這句話不是沒用，但它不夠。

因為它有兩個很值得記住的反例。

#### 反例一：有人介入，但它仍然只是 workflow

例如內容審稿流程：

`系統先產生初稿 → 人工審核 → 按規則發布`

中間有人工 checkpoint 沒錯，但主要路徑還是預先定義好的。這種東西比較像帶人工審核的 workflow，不一定需要 agent。

#### 反例二：沒有人介入，但它已經是 agent

例如 browser agent 在文件站裡自己搜尋、點開、讀頁面、換關鍵字、決定下一步去哪裡。整個過程可能沒有真人插手，但如果每一步都是根據環境狀態動態調整，這其實已經是 agent 行為。

所以比較準的說法是：

> **human-in-the-loop 會影響互動設計與風險控制，但真正的分類核心，還是控制權與路徑的可預定性。**

---

## 我現在會用的四層判斷梯

如果你不想每次都重新哲學思辨，我建議直接用這個順序判斷。

### Level 0：單輪就解得掉嗎？

先問自己：

- 任務輸入是否夠清楚？
- 輸出格式是否可直接規定？
- 失敗成本是否低？
- 有沒有其實只要多補 context、few-shot、RAG 就能解？

如果答案大多是 yes，先不要建 workflow，更不要建 agent。

### Level 1：多步，但可預先編排嗎？

如果任務需要多步，但大致可畫出主路徑，而且你能為例外情況設規則，先選 workflow。

這類任務典型長相是：

- 分類後丟到固定處理線
- 同步資料到多個系統
- 根據明確條件做分支
- 固定欄位轉換與通知

這時候要優先投資的是：

- 模組責任切分
- observability
- retry 與補償
- idempotency
- human approval checkpoint

不是 agent loop。

### Level 2：多步，而且下一步要靠模型現場決定嗎？

如果下一步依賴執行中取得的新資訊，而且工具與流程都可能動態改變，才進入 agent 的範圍。

像這些任務比較接近：

- 開放式 research assistant
- browser-based task completion
- 跨多工具的 debugging assistant
- 需要多輪追問、澄清、重規劃的任務

這類系統比較需要的是：

- 好的工具定義
- 明確的退出條件
- 追蹤與 trace
- guardrails
- 必要時的人類介入點

### Level 3：真的需要多 agent 嗎？

我現在對 multi-agent 很保守。

因為一堆人一開始就把系統拆成 planner、researcher、writer、critic、reviewer，看起來很華麗，但通常先死在：

- prompt boundary 模糊
- tool overlap
- trace 很難讀
- latency 與 cost 爆掉
- 責任歸因越拆越不清楚

OpenAI 目前的建議也很接近這個方向：先把單一 agent 的工具與指令設計好，真的不夠，再往 multi-agent 演進。對大多數剛起步的團隊來說，**single agent + clear tools + workflow shell** 往往比一開始就做 agent society 更實際。

---

## 什麼情況下，我會刻意不要用 Agent？

這一段非常重要，因為真正有專業感的文章不能只講「什麼時候用」，一定要講「什麼時候不要用」。

### 1. 任務高度可預測

如果主路徑可預先定義，而且例外情況也能用規則覆蓋，workflow 比 agent 更穩。

### 2. latency / cost 壓力很真實

Anthropic 已經講得很直接了：agent 往往是用 latency 和 cost 換表現。這不是缺點，而是 tradeoff。問題是很多任務根本不值得這樣換。

### 3. 你需要強稽核、強可追溯

有些營運與審批流程，最重要的不是靈活，而是：

- 每一步都可查
- 每一步都可重跑
- 每一步都可稽核
- 任何錯誤都能明確定位

這些情況下，workflow 通常還是更合適的骨架。

### 4. 你其實還沒把工具與邊界定義清楚

很多「agent 不穩」問題，最後不是模型太笨，而是：

- 工具描述很爛
- 工具責任重疊
- 輸入輸出 schema 不清楚
- 成功條件沒有定義
- 失敗後該怎麼做沒講

在這種狀態下，先補工具設計與流程觀測，通常比急著上 agent 更有效。

---

## 什麼情況下，我反而會開始偏向 Agent？

### 1. 使用者輸入高度模糊，而且每次都不一樣

固定規則很容易裂開，這時候 agent 的彈性開始有價值。

### 2. 任務需要探索，而不是只需要執行

研究、偵錯、調查、跨頁面找資料、比對候選方案，這些都不是單純的 pipeline。

### 3. 工具選擇不能事先完全寫死

你知道系統有哪幾種工具，但不知道這次到底該先用哪一個，甚至不知道途中會不會改道。這時候 agent 的控制權才值得被打開。

### 4. 你願意為更高完成度，交換更多觀測與治理成本

這是最現實的一句話。Agent 不是免費升級包，它會帶來：

- 更高的 trace 與 evaluation 需求
- 更細的 guardrail 設計
- 更複雜的 tool governance
- 更高的 failure mode 表面積

如果你不打算付這些成本，就不要只因為它看起來比較聰明而上 agent。

---

## 我現在最常用的一個架構選擇：Workflow 骨架 + Agent 島嶼

真正實作之後，我反而越來越少做「純 workflow」或「純 agent」這種二分法。

我現在更常用的方式是：

> **用 workflow 當營運骨架，用 agent 當局部的高彈性決策節點。**

例如：

- 排程、資料同步、通知、歸檔，交給 workflow
- 開放式搜尋、比較、內容重寫、瀏覽器操作，交給 agent

這種分工的好處是：

- 主骨架可觀測
- 高風險點可加人工審核
- 模型只在真正需要判斷的地方出手
- 不會把整條鏈都變成一團不可預測的黑盒

這也是我現在最推薦多數團隊的起手式。不是因為它最潮，而是因為它最容易活著上線。

---

## 一個我自己越來越相信的決策表

| 問題 | 比較適合 Workflow | 比較適合 Agent |
|---|---|---|
| 主路徑能否先畫出來 | 可以 | 不太行 |
| 下一步由誰決定 | 工程師 / 規則 | 模型依現場資訊決定 |
| 輸入是否模糊多變 | 低 | 高 |
| 工具是否能先綁死 | 大多可以 | 常常不行 |
| 失敗後要不要好查 | 很重要 | 也重要，但更難 |
| latency / cost 壓力 | 高 | 可接受更高成本 |
| 核心價值 | 穩定執行 | 動態決策 |

---

## 最後一句我現在最相信的話

如果我在系統開始跑之前，就能把主路徑畫出來，我通常還是先選 workflow。  
如果那條路只有在系統跑起來之後才會慢慢顯形，我才會認真考慮 agent。

人在不在中間，當然重要。  
但它比較像是在提醒我這是不是一個需要互動設計與風險控制的問題，而不是唯一的分類答案。

對我來說，workflow 和 agent 不是誰比較高級，而是：

> **哪一種控制方式，比較符合這個問題本身。**

---

## Image Asset Plan

1. filename: ai-agentic-workflow-series-06-01-decision-ladder.svg  
   purpose: 用一張圖解釋單輪、workflow、agent、multi-agent 的判斷階梯  
   placement: 放在「我現在會用的四層判斷梯」段落前  
   alt: Workflow 與 Agent 的判斷階梯圖  
   prompt: A blog-friendly SVG decision ladder for AI system design. Four levels from bottom to top: Single LLM Call, Workflow, Agent, Multi-Agent. Use clean rounded boxes, subtle colors, arrows upward, minimal labels, English in-diagram labels, modern product-doc style, generous spacing, no clutter.

2. filename: ai-agentic-workflow-series-06-02-workflow-vs-agent-table.svg  
   purpose: 視覺化呈現 workflow 與 agent 的核心差異  
   placement: 放在決策表段落後  
   alt: Workflow 與 Agent 的控制權差異圖  
   prompt: A clean comparison SVG for a technical blog showing Workflow vs Agent. Left side workflow with predefined path, checkpoints, retry, auditability. Right side agent with dynamic tool selection, runtime branching, replanning. English labels, soft product illustration style, readable and uncluttered.

---

## 資料來源

詳細來源請見 `./resource/references.md`。
