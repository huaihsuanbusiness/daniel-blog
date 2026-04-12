---
title: "PM LLM 應用工程與治理 Part 1 － 不只是 Prompt Engineering：PM 到底在做什麼，才算真正把 LLM 用進產品與工作流"
description: "- 你已經會用 ChatGPT，但開始想把 LLM 接進產品、內部流程或自動化工作流
- 你常聽到 prompt engineering、RAG、tool calling、agents，可是感覺大家都在講同一鍋
- 你是 PM、ex-engineer、AI PM、PMO，正在想這些東西到底怎麼分層"
categories: ["ai"]
tags: []
date: 2026-04-05T16:25:00
series: "PM LLM 應用工程與治理"
seriesOrder: 1
---

這篇適合誰先看：

- 你已經會用 ChatGPT，但開始想把 LLM 接進產品、內部流程或自動化工作流
- 你常聽到 prompt engineering、RAG、tool calling、agents，可是感覺大家都在講同一鍋
- 你是 PM、ex-engineer、AI PM、PMO，正在想這些東西到底怎麼分層

如果這個主題是你第一次碰，我建議先看這篇。它不是教你某一個技巧，而是先把地圖畫出來。

## 先講一句我想壓住全篇的話

很多團隊以為自己在做 AI，實際上只是在聊天視窗裡把 prompt 修得比較漂亮。

那不是沒價值。Prompt engineering 當然重要。沒有好的 prompt，很多東西連 PoC 都跑不穩。問題是，一旦你要把模型接進產品、資料、權限、成本與責任鏈，事情就不再只是 prompt engineering。

它開始變成另一件事：

**LLM application engineering and governance。**

也就是說，你不只在寫提示詞。你在設計一套能被接住、被觀測、被修復、被治理的系統。

## 我原本也以為，prompt 寫好就差不多了

剛開始碰 LLM 的時候，最自然的直覺就是這樣：

- prompt 再清楚一點
- 再補幾個 examples
- 再把輸出格式寫死
- 再加一句「如果不知道就說不知道」

這些都對，而且很有用。你筆記裡那套 role / task / constraints / output format / examples，其實就是很實用的起手式。拿去做分類、抽取、摘要，都能比「隨手打一段需求」穩很多。

但我後來真的動手把東西往產品裡接，才發現 prompt 能解的問題和不能解的問題，邊界很明顯。

Anthropic 在官方 prompt engineering 文件裡就直接提醒了一件很重要的事：**不是每個 failing eval 都該拿 prompt 來修。** 有些問題比較像模型選型、延遲、成本，甚至是整體系統設計的問題。這個提醒很關鍵，因為它等於在官方文件裡明講：prompt 不是萬能扳手。  
OpenAI 近一年的文件結構其實也在講同一件事。他們把 prompt engineering、structured outputs、function calling、tools、evals 分成不同能力，而不是全部打包成 prompting。

所以，我現在更願意把 prompt engineering 看成第一層，而不是整棟樓。

## 我會怎麼分這棟樓：五層責任分工

如果你問我，PM 到底在做什麼，才算真的把 LLM 用進產品與工作流，我會用下面這五層來看。

### 第一層：互動層

這一層才是大家最熟悉的 prompt engineering。

你在做的是：

- 定角色
- 定任務
- 定限制條件
- 定輸出格式
- 定 examples
- 用 few-shot、delimiters、rubric、self-check 去把輸出拉穩

這一層很適合處理：

- 一次性的摘要
- 小型分類
- 文案重寫
- 低風險的資訊抽取
- 還在摸問題空間的 PoC

如果你的任務是「把一段客服訊息分成 Billing / Bug / Feature Request」，或者「從文字裡抽 email 與 deadline」，那 prompt engineering 往往就夠用了。至少在 PoC 階段，真的夠。

但它的限制也很快會冒出來：

- 模型回得漂亮，不代表下游吃得下去
- 回答看起來對，不代表格式一定穩
- 就算格式穩，也不代表數值邏輯沒錯
- 更別提權限、成本、審計、回放這些事情

### 第二層：輸出合約層

這一層開始從「讓人看懂」轉成「讓系統接得住」。

你不再只要求模型「請用 JSON 回」，而是開始定：

- schema
- required fields
- enum
- type
- additionalProperties
- validator
- retry
- fallback

換句話說，你在把 prompt 變成一份**輸出合約**。

這個差別非常大。因為一旦輸出要進 CRM、ticketing、reporting pipeline、BI dashboard 或任何下游系統，自由文字就會突然變得很浪漫，也很危險。

你筆記裡那句「固定 JSON 是企業落地的第一道門票」，我很認同。因為真正重要的不是它看起來工程味很重，而是它把模型輸出從「像答案」變成「可被驗證的資料物件」。

這也是為什麼 OpenAI 後來把 Structured Outputs 明確做成一個獨立能力。因為 JSON mode 和 schema-constrained output 不是同一件事。前者只是比較像 JSON，後者才是你真的開始在寫 contract。

### 第三層：工具層

到了這裡，模型不只是寫答案，而是開始**決定什麼時候該叫工具**。

比方說：

- 算 ROI
- 查 usage metrics
- 去 internal API 拿資料
- 建 ticket
- 更新 CRM
- 做 web search
- 呼叫 file search

這時候的問題不再是「prompt 夠不夠清楚」，而是：

- 哪些工具可以叫
- 哪些不能叫
- 參數怎麼驗
- 結果怎麼記 log
- 誰真正執行工具
- 錯了怎麼回退

這也是你筆記裡把 tool spec、tool_call、tool_result 分開講的原因。這個分法很對，因為它讓 LLM 的責任被切得比較乾淨：**模型負責決定與組參數，真正執行由 deterministic tools 做。**fileciteturn24file8turn24file6

這裡如果還把它叫成 prompt engineering，就太小了。你已經在做應用編排了。

### 第四層：知識接地層

很多人碰到 hallucination，第一反應是再多寫幾句 prompt。

有時有效，但很多時候不夠。

如果你的任務本質上依賴公司政策、內部 SOP、FAQ、產品文件、法律文件、定價資料，那問題通常不是 prompt 沒寫好，而是模型根本沒有足夠上下文。

這時候才會進到 RAG 這條線：

- chunking
- embeddings
- vector search
- top-k
- rerank
- citations
- confidence

也就是說，你不是要模型憑空變聰明，而是要它先**找到對的資料**，再回答。

這一層很像把模型從嘴很會講，拉回資料面前坐好。

### 第五層：工作流與治理層

再往上走，就是 agent、state、memory、guardrails、fallback、evaluation、KPI、event schema、dashboard、RACI、RAID log 這些東西。

到了這一層，你已經不只是「在用 LLM」。

你在做的是：

- 多步工作流
- 可觀測性
- 權限控管
- 風險事件管理
- 成本與延遲權衡
- C-level 能看懂的 impact reporting

這一層最容易被講得很炫，因為一講到 agent，簡報通常會突然長出很多箭頭和發光方塊。

但真正麻煩的地方不是「能不能讓 agent 跑起來」，而是：

- 什麼時候根本不該用 agent
- 哪些任務一步就夠
- 哪些動作風險太高不能自動化
- guardrails 不完整時怎麼 fallback
- 怎麼量化 format compliance、accuracy、latency、cost、risk incidents

如果沒有這一層，很多 LLM 專案最後都會停在 demo 很亮，流程很脆。

## 為什麼只打「prompt engineering」這張牌通常不夠

因為它通常只能解決第一層問題。

而真實世界的 failure，常常出現在下面這些地方：

### 1. 不是回答不好，是格式接不進去

這是最常見，也最容易被低估的一種失敗。

你看著輸出覺得差不多，工程師看著 log 只想關視窗。因為欄位少一個、enum 漂掉、number 變 string、外面包了三句說明，整個流程就卡住。

### 2. 不是模型不會，是它根本不該自己算

很多人第一次做 ROI assistant，都會讓模型自己心算。跑得出答案，還會講人話，看起來很香。

但只要你真的把 log 留下來，就會發現：

- 同樣輸入，可能每次略有不同
- 公式會偷偷漂
- assumptions 不一致
- 數值四捨五入規則會變

這種東西在簡報裡沒事，在系統裡就很危險。

### 3. 不是它不夠聰明，是它根本沒有資料

如果答案應該來自公司手冊、內部政策或產品知識庫，那 hallucination 的本質通常不是「模型愛亂掰」，而是你要它閉眼考 open book 題。

### 4. 不是它不會做，是你沒有給它邊界

越是能呼叫工具、能做多步任務的系統，越需要白名單、validator、PII masking、bounded retry、fallback、logging。

沒有這些，agent 看起來就像很努力的實習生，半夜還偷偷拿你的公司卡刷東西。

## 那 prompt engineering 到底什麼時候夠用？

夠用，而且很多時候非常夠用。

我反而覺得，很多團隊太快跳去談 RAG 和 agents，忘了有些問題其實只要把 prompt 寫紮實就能解。

### 通常夠用的情境

- 低風險、單步任務
- 回答給人看，不直接進系統
- 可以接受人工覆核
- 目標是先驗證 usefulness，而不是先追求 full automation
- 任務本身不依賴外部即時資料或專屬內部知識

例如：

- 會議摘要
- 初步分類
- 粗抽重點
- 草稿生成
- 研究問題整理

這些場景如果一開始就上 agent，往往是技術上可行，但工作上不划算。

## 什麼時候就不能再假裝只是 prompt 問題了？

我會看三個信號。

### 第一個信號：輸出要被機器吃

只要輸出不是給人讀完就算，而是要被程式接進去，prompt 就不能單打獨鬥了。你需要 contract。

### 第二個信號：答案依賴外部資料或動作

只要要查資料、做計算、更新系統、呼叫 API，就不是單純 prompt。你需要 tools 或 retrieval。

### 第三個信號：你開始要對成本、風險與治理負責

只要專案已經進到「這可以上線嗎」「出事誰看 log」「PII 怎麼遮」「月成本多少」「成功率怎麼量」，你做的就已經是 AI system design 了。

## 這篇真正想幫你壓住的判準

所以，如果你問我：

**PM 到底在做什麼，才算真正把 LLM 用進產品與工作流？**

我的答案不是「用了 agent」或「接了 RAG」。

而是：

**當你開始為輸出合約、工具邊界、知識接地、失敗修復、成本、觀測性與治理負責時，你做的就不再只是 prompt engineering。**

Prompt 很重要，但它只是第一層。  
真正讓東西可交付的，是後面那幾層你有沒有補起來。

這也是我為什麼會把這整條線叫做 **LLM application engineering and governance**，而不是 prompt engineering。因為前者比較準，也比較誠實。

## 什麼時候不要硬把事情講太大

最後還是要補一個邊界。

不是每個 AI 小功能都需要被講成系統工程。

如果你只是：

- 幫團隊做一個好用的摘要 prompt
- 做一個內部腦暴助手
- 跑一個臨時 PoC
- 還在探索 use case，連真正使用者都沒對齊

那就先不要急著把自己包裝成在做 agents platform。

很多時候，最成熟的做法不是把圖畫大，而是知道什麼時候停在第一層，什麼時候才值得往第二層、第三層走。

這個判斷，本身就是產品能力。

## 下一篇會接什麼

下一篇我會把第二層拆開來講，也就是這整條線裡最容易被低估、但最先讓東西變得可落地的地方：

**從 prompt 到輸出合約。**

也就是為什麼 JSON schema、validator、retry、fallback 不是工程師的小題大作，而是企業導入 LLM 的第一道門票。
