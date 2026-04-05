---
title: "PM LLM 應用工程與治理 Part 3 － LLM 不是自己做事：Tool Calling、RAG 與知識檢索怎麼把模型接回真實世界"
description: "很多團隊在把 LLM 接進產品時，第一個直覺都是：先把 prompt 寫好，再看看模型能不能自己撐住。"
categories: ["ai"]
tags: []
date: 2026-04-05T16:27:00
series: "PM LLM 應用工程與治理系列"
seriesOrder: 3
---

很多團隊在把 LLM 接進產品時，第一個直覺都是：先把 prompt 寫好，再看看模型能不能自己撐住。

這個起手式不是錯，只是不夠。

當問題開始碰到三種東西時，模型單靠「會說話」就不太夠用了。第一種是**系統外部的動作**，例如查訂單、算 ROI、建立 ticket、更新 CRM。第二種是**公司自己的知識**，例如政策、流程、FAQ、合約、產品文件。第三種是**必須可追溯、可稽核、可重播**的流程，因為一旦你要把輸出接進真實系統，錯的不是一句回答，而是一整段下游流程。

這也是為什麼，真正的 LLM 應用工程很快就會走到兩條線：**tool calling**，以及 **RAG / retrieval**。

它們常常一起出現，但不是同一件事。把這兩件事混成一鍋，系統很容易長得像一台拿著瑞士刀切牛排的果汁機，理論上什麼都能做，實際上每一層都鬆。

## 先講結論：tool calling 跟 RAG 在解不同問題

最簡單的分法是這樣。

**Tool calling** 在解的是：

- 模型需要用到它訓練資料之外的即時資料
- 模型需要對外部系統做動作
- 某些運算或流程不能交給模型自己腦補

OpenAI 對 function calling 的定義很直接，它是讓模型接上你提供的資料與動作，由模型決定要不要叫某個工具，再由你的系統去執行。Anthropic 的 tool use 文件也講得很清楚：Claude 會回傳結構化的 tool call，由你的應用程式執行，再把 tool result 傳回去。換句話說，模型不是直接做事，它是提出一張結構化的「點餐單」。([developers.openai.com](https://developers.openai.com/api/docs/guides/function-calling/))

**RAG / retrieval** 在解的是：

- 模型需要先查公司知識，再根據查到的片段回答
- 問題本身不是叫模型發揮推理，而是要它站在文件依據上說話
- 你需要 citations，需要知道它到底根據哪份內容回答

OpenAI 的 Retrieval 文件把這件事講得很乾淨：retrieval 的本質是 semantic search，背後是 vector stores；它的強項是就算 query 跟原文沒有太多關鍵字重疊，也能抓到語意相關的結果。([developers.openai.com](https://developers.openai.com/api/docs/guides/retrieval/))

所以兩者的差別，不是「一個比較進階」。差別是：

- **Tool calling 把模型接回系統能力**
- **RAG 把模型接回知識依據**

這兩條線都在把模型拉離純聊天，但拉回來的地方不一樣。

## Tool calling 的本質，不是讓模型自己算，而是讓模型學會叫人做事

很多人第一次接觸 tool calling，腦中會有一個很危險的錯覺：既然模型都知道該叫哪個工具，那它是不是也可以自己算、自己查、自己決定？

這個想法通常就是 production 災難的入口。

你那份筆記裡有一句話我很認同：

> LLM 不負責計算、查資料、寫入系統。LLM 只負責決定要用哪個工具與填參數，真正執行由 deterministic tool 做。 fileciteturn22file0

這句話其實很接近目前官方實務的主流做法。

在 tool calling 裡，最值得拆清楚的是三個東西：

1. **Tool spec**：你告訴模型有哪些工具可用，輸入輸出長什麼樣。
2. **Tool call**：模型根據使用者需求，回傳它想叫的工具與參數。
3. **Tool result**：你的系統真的去執行，再把結果傳回模型。

這種切法最大的好處，不是比較「工程」，而是比較可靠。

因為一旦把查詢、計算、更新資料這些事情交回 deterministic tool，你就拿回了三件很重要的東西：

- **可靠性**：同樣輸入，工具同樣輸出，不會今天心情好算成 12、明天算成 13。
- **可審計性**：你有 tool input / output log，知道到底是模型選錯工具，還是工具本身算錯。
- **可控性**：你可以做 action whitelist、參數 validator、bounded retry，而不是讓模型在系統裡自由漫遊。fileciteturn22file1

這也是為什麼，像「ROI 計算」這種事，與其讓模型自己口算，不如把公式寫進工具裡，讓模型只負責抽參數和決定是否該叫工具。對 PM 來說，這個切法很重要，因為它改變的是責任邊界：

- 模型負責理解與路由
- 工具負責執行與算準
- 系統負責驗證、記錄與回放

## RAG 的價值，也不是「讓模型變聰明」，而是讓它不要對公司文件亂猜

RAG 很容易被講成一個很神秘的詞，好像只要把文件塞進向量資料庫，模型就突然變得很懂你公司。

實際上，RAG 沒那麼浪漫。

它做的事情比較樸素：先把文件切片，做 embedding，存進 vector store。等使用者提問時，再把 query 轉成向量，找出語意最接近的 chunks，最後把這些 chunks 和問題一起丟進模型，讓模型根據找到的內容生成回答。([developers.openai.com](https://developers.openai.com/api/docs/guides/retrieval/))

所以 RAG 不是「資料庫版聊天」。它比較像是：

- 先做文件搜尋
- 再做有依據的生成

真正影響它好不好用的，往往不是模型本身，而是三件事：

### 1. 你怎麼 chunk

chunk 太小，會失去上下文；太大，會讓檢索不準、塞 prompt 又貴。你筆記裡用 300 到 500 tokens 加 overlap 當起手式，其實是很實用的預設。fileciteturn22file2

### 2. 你有沒有 citations

如果回答沒有引用來源，它就很容易退化成「看起來像根據文件，其實是根據模型自己的自信」。

### 3. 你有沒有 abstain 機制

找不到就說找不到，不是技術不夠強，而是系統比較誠實。

這也是為什麼，企業型 RAG 跟 demo 型 RAG 的差別，往往不在於向量搜尋跑得多快，而在於：

- 是否有 chunk metadata
- 是否能 trace 到 doc / chunk id
- 是否有 confidence 與 fallback
- 是否在 citations 為空時拒答或降級

## Tool calling 跟 RAG 什麼時候一起用

最典型的情境，就是客服、營運助理、內部 Copilot 這類 workflow。

例如一個訂房平台的 support assistant，使用者問：

> 為什麼我昨天刷卡成功，今天又看到一筆重複扣款？

這時系統通常不是只靠一種能力。

你可能會同時需要：

- **RAG**：先查退款政策、授權請款 FAQ、重複扣款的內部處理說明
- **Tool calling**：去叫 `get_order_status`、`get_payment_events`、`estimate_refund_timeline` 這些工具
- 最後再由模型整合成一段有人話、但有依據的回覆

這裡最常見的錯誤，是把兩條線混掉：

- 把 FAQ 當 tool
- 把即時訂單查詢塞進 RAG
- 讓模型根據檢索片段自己推論 payment state

結果就是架構看起來很 AI，實際上知識和動作兩邊都不穩。

我自己會用一個很簡單的判斷法：

### 用 RAG，如果你要回答的是「公司文件怎麼說」

- 政策
- 流程
- FAQ
- 文件內容
- 合約條款

### 用 tool calling，如果你要處理的是「系統現在知道什麼，或系統要去做什麼」

- 查訂單
- 算 ROI
- 建 ticket
- 更新 CRM
- 執行退款

### 兩者一起用，如果你需要同時處理「知識依據」與「系統動作」

這個分法不炫，但非常有用。

## 很多系統不是壞在模型不夠聰明，而是壞在工具太亂、知識切太爛

Part 3 最值得講的，不是新名詞，而是 failure modes。

### Failure mode 1：工具過多，而且長得太像

OpenAI 在 agent guide 裡提到一個很實際的觀察：不是工具越多越好，工具之間如果描述重疊，模型很容易選錯；有些系統十多個定義清楚的工具能跑得很好，但少數幾個高度重疊的工具反而更容易出錯。([openai.com](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/))

這件事對 PM 很重要，因為它提醒你：

- 工具命名要清楚
- 參數要有界線
- 不要把相似責任拆成一堆曖昧 function

### Failure mode 2：chunking 只看字數，不看文件結構

如果把 SOP、FAQ、政策文件亂切，檢索到的片段可能剛好缺一半上下文。使用者問的是退款資格，模型抓到的卻是退款時程，答案看起來很合理，但其實答非所問。

### Failure mode 3：沒有 citations，卻把回答當真

這是很多內部 RAG demo 最危險的地方。用戶以為它在引用公司文件，其實它只是在生成一段「像公司文件口吻」的回答。

### Failure mode 4：把 tool calling 當成能力炫技，而不是責任分工

有些團隊一口氣開很多 tool，什麼都想讓模型碰。這種系統在 demo 時看起來很會「做事」，上線後則常常因為權限、誤呼叫、參數不合法而滿地碎片。

## 這對 PM 的真正意義是什麼

如果你是 PM，Part 3 最重要的收穫，不是背幾個術語，而是開始知道自己在設計哪一層。

你不是在做一個「AI assistant」。

你其實在決定：

- 哪些問題屬於知識檢索
- 哪些屬於外部動作
- 哪些需要 citations
- 哪些需要 deterministic execution
- 哪些該拒答、fallback、或轉人工

也就是說，這一篇真正的主題不是 tool calling 和 RAG 本身，而是：

**PM 開始從 prompt writer，變成系統邊界的設計者。**

這也是為什麼我不太喜歡把這一切叫成 prompt engineering。因為一旦你走到這裡，問題已經不是「怎麼把 prompt 寫得更完整」，而是「怎麼讓模型、知識、工具與後端系統各自做對自己的工作」。

## 一個實用的判斷框架

如果你只想帶走一個框架，我會建議記這個：

### 問題 1：這題的答案是在文件裡，還是在系統裡？

- 文件裡 → RAG
- 系統裡 → tool calling
- 兩邊都有 → 兩者組合

### 問題 2：這件事能不能由 deterministic logic 處理？

如果可以，先交給工具，不要讓模型心算。

### 問題 3：如果回答錯了，代價是什麼？

代價越高，越需要 citations、validator、whitelist、fallback，而不是更長的 prompt。

這三題，比你多背十個框架有用。

## 先別急著做 agent

很多團隊做到這裡，下一步就想做 agent。

這個衝動很正常，因為一旦 tool calling 和 RAG 跑起來，你會很想把它們串成一條多步 workflow，讓系統自己規劃、自己判斷、自己交棒。

問題是，這一步如果太早走，常常不是升級，而是把成本、延遲和不確定性一起放大。

所以下一篇我們要談的，不是 agent 有多酷，而是另一個更難也更務實的問題：

**什麼時候真的該做多步 agent，什麼時候應該停在 guardrails、KPI 與治理。**
