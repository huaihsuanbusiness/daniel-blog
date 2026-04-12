---
title: "PM LLM 應用工程與治理 Part 2 － 從 Prompt 到輸出合約：為什麼 JSON schema、validator、retry 才是企業落地的第一道門票"
description: "- 你已經做過 prompt，開始發現「看起來對」和「系統真的能接」是兩回事
- 你正在做分類、抽取、摘要、intake、ROI 估算、ticket triage 這類要進下游流程的任務
- 你是 PM、工程、AI PM、PMO，想把 PoC 拉近 production 一點點"
categories: ["ai"]
tags: []
date: 2026-04-05T16:26:00
series: "PM LLM 應用工程與治理"
seriesOrder: 2
---

這篇適合誰先看：

- 你已經做過 prompt，開始發現「看起來對」和「系統真的能接」是兩回事
- 你正在做分類、抽取、摘要、intake、ROI 估算、ticket triage 這類要進下游流程的任務
- 你是 PM、工程、AI PM、PMO，想把 PoC 拉近 production 一點點

如果上一篇在畫地圖，這篇就是先把其中一條最常被低估的路挖深。

## 我想先把一句容易被忽略的話講白

企業落地的第一道門票，通常不是模型多聰明。  
而是**輸出能不能被下游可靠接住**。

這句話聽起來沒有很性感，但它常常比你用的是哪個模型更決定專案能不能真的往前走。

因為真實世界裡，很多 PoC 不是死在答案不夠像人話，而是死在這些地方：

- JSON 長得像，但 parse 不過
- 欄位齊了，但 enum 值漂掉
- 格式對了，但語義其實矛盾
- retry 一開，成本像漏水一樣往下滴
- 最後只好人工複製貼上，整個自動化名存實亡

你筆記裡把 Day 3 壓成一句「prompt 變規格」，我覺得非常準。因為到這一步，你要做的已經不是讓模型講得更像答案，而是把它的輸出變成一個**可驗證、可修復、可治理的資料介面**。

## 為什麼「請用 JSON 輸出」還遠遠不夠

很多人第一個直覺是這樣：

> 請用 JSON 回答，欄位要有 title、department、risk_level。

這當然比自由文字好。但如果你真的要把輸出餵給程式，只靠這句 usually 不夠。

因為模型很可能會：

- 多送一個你沒想要的欄位
- 把 `risk_level` 寫成 `medium` 而不是 `Med`
- 把 number 輸成 `"12 hours"` 這種字串
- 把 array 寫成逗號分隔字串
- 包一段「以下是 JSON」在前面
- 在資訊不足時亂補值，不填 null

這些錯誤在聊天畫面裡通常沒那麼刺眼，到了系統裡卻會像小石頭卡齒輪，一顆就夠讓整條流程停住。

所以真正關鍵的，不是「模型願不願意用 JSON」，而是你有沒有把輸出定義成一份 contract。

## 我會怎麼看這份輸出合約：四道門

如果要把這件事講得簡單一點，我會把企業落地的輸出合約看成四道門。

### 第一道：Schema

這是最外層，也是最容易理解的一道門。

你先定義：

- 欄位是什麼
- 哪些必填
- 型別是什麼
- enum 有哪些合法值
- 允不允許額外欄位
- number 的範圍是什麼
- array 至少要幾個元素

這一步最像在寫規格書。

OpenAI 現在把 Structured Outputs 做成獨立能力，核心也是同一件事：讓模型輸出遵守你提供的 JSON Schema，而不是只生成「看起來像 JSON 的東西」。這個 distinction 很重要。因為 JSON mode 解的是語法感，schema 解的是結構契約。

### 第二道：Validator

但 schema 還不夠。

因為有些錯，不是 schema 能抓的。

例如：

- `estimated_time_saved_hours_per_week = 9999`
- `department = "Operations"`，語義對但 enum 不在白名單
- `risk_level = Low`，可是內容明明提到敏感資料與自動外發
- 使用者同時說「每週省 20 小時」和「每月只省 3 小時」
- 輸出裡混進 email、phone、ID 這種 PII

這些東西需要 validator。

也就是說，你不只檢查**格式**，還要檢查：

- parse 過不過
- required 欄位齊不齊
- keys 有沒有多或少
- enum 合不合法
- 數值範圍合理不合理
- business rules 有沒有互撞
- PII 是否被帶出來

我很喜歡你筆記裡一句話：

> 我要的是爛資料下也不爆炸。  
>

這句話其實就是 validator 的精神。

### 第三道：Retry

很多人知道要 retry，但 retry 寫得像在拜拜。

輸出一錯就重跑，重跑還錯再重跑，最後模型看起來很勤勞，帳單也很勤勞。

我比較推薦的是 **bounded retry**，而且每一次 retry 都要有很明確的修復目的。

例如：

- Retry #1：指出 schema 錯在哪，要求只回合法 JSON
- Retry #2：再更嚴格一次，禁止多餘文字，保守填值

兩次都不過，就不要再無限循環。直接 fallback。

因為 retry 的目的是**修格式**，不是讓模型反覆祈禱自己突然變成熟。

### 第四道：Fallback

這一層很常被忘掉，但 production 裡超重要。

如果格式還是不對、資料不足、風險過高、PII 遮不乾淨、欄位互撞，那就要有退路。

常見的退路有幾種：

- 回保守預設 JSON
- `confidence = Low`
- 列出缺資料清單
- 回退到人工 review
- 不更新系統，只生成 draft

這一步的價值，不是讓流程變醜，而是讓它不要硬撞。

## 一個很實際的例子：用例 intake 為什麼很適合拿來講這件事

你筆記裡拿「use case intake + ROI estimate」做 Day 3 和 Day 4 的練習，我覺得很聰明，因為這類任務剛好卡在 LLM 最常被高估的地帶。

表面上它很像只是抽資訊：

- use_case_title
- department
- estimated_time_saved_hours_per_week
- risk_level
- next_steps

但真實世界裡，這種任務其實很容易壞：

- 標題模糊
- 部門寫法很多種
- 工時估算互相矛盾
- 風險等級其實需要結合規則判定
- next_steps 容易漂成一整段空泛建議

如果你只是讓模型自由回答，它也許會寫得很像 consultant note。  
但如果你要把這份輸出送進 dashboard、roadmap 或 weekly review，它就需要 contract。

這也是我很喜歡這類 use case 的地方。它把「prompt 很好看」和「系統真的能用」的差別攤得很清楚。

## 格式合規率，為什麼值得被單獨拿出來看

很多團隊做 PoC 時只看兩件事：

- 回答看起來對不對
- 使用者喜不喜歡

這兩件都重要，但對企業導入來說不夠。

你筆記裡提到 **format compliance rate**，我會把它視為很值得單獨看的前置指標。

因為它回答的是更基礎的一個問題：

**這個輸出有沒有穩到足以被流程接住？**

如果一個任務的語意準確率不錯，但 format compliance rate 只有 70%，那你很可能還不能讓它直連下游。  
反過來說，如果格式穩、validator 成熟、fallback 清楚，就算語意還不是完美，你也比較有機會安全地把它放進半自動流程。

這也是為什麼我會說，格式穩定不是小事，而是 adoption 的地基。

## Structured Outputs 不是全部，但它很值得

這裡也要講一個邊界，免得寫成 tool 崇拜。

Structured Outputs 很好用，但它不是萬靈丹。

它能幫你解的是：

- required key 不見
- enum 漂掉
- 結構不合法
- JSON parse 失敗

它不能替你解的通常是：

- business logic 是否合理
- 數字是否自相矛盾
- 風險分級是否符合你公司的規則
- PII 是否該被遮
- 這次輸出是否該進人工審核

所以不要把 Structured Outputs 想成「有它就不用 validator」。  
比較像是：**有它之後，你的 validator 才終於不用一直在地上撿語法碎片。**

## 什麼時候不需要把事情做到這麼硬

還是要補一個反例，不然整篇會太像 engineering maximalism。

不是每個任務都需要 schema + validator + retry + fallback 這套全開。

### 通常不需要全開的情境

- 純人讀摘要
- 內部一次性腦暴
- 早期探索問題空間
- 明顯不會接下游系統
- 反正一定人工覆核，而且量很小

例如你只是要主管報告的草稿摘要，結果最後本來就會人工重寫，那你不一定要先把一切都做成 JSON contract。

這條線值得做的前提是：

- 輸出會被反覆用
- 會進系統
- 會被追蹤
- 會產生成本或風險
- 你真的希望它從「助手」變成「元件」

如果沒有這些前提，先停在 prompt 層，有時才是成熟。

## 最後我想留給你的判準

所以，如果你問我：

**什麼時候才算真的跨過了 prompt，開始進到企業可落地的 LLM 專案？**

我的答案是：

**當你不再只問「怎麼讓它回答得更好」，而開始問「怎麼讓系統能穩定接住、驗證、修復、回退這個輸出」的時候。**

那一刻，你做的已經不是單純 prompting。  
你在寫一份輸出合約。

而 schema、validator、retry、fallback 這四件事，就是這份合約最先要長出來的骨架。

## 下一篇會接什麼

下一篇會往上走到第三層，也就是：

- tool calling
- deterministic tools
- retrieval
- RAG
- citations

也就是為什麼很多任務不是「模型再聰明一點」就會好，而是該讓它學會什麼時候查資料、什麼時候叫工具、什麼時候停止自己亂答。
