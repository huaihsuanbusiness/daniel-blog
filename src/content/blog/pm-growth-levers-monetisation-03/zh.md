---
title: "PM 成長槓桿與變現 03 － Lifecycle 不是亂發提醒：Retention 其實是在設計使用者回來的理由"
description: "歡迎信幾封。
推播幾則。
多久沒回來就發提醒。
多久沒下單就丟折扣。"
categories: ["pm"]
tags: []
date: 2026-04-05T16:10:00
series: "PM 成長槓桿與變現系列"
seriesOrder: 3
---

很多團隊一講 lifecycle，第一個反應都是訊息編排。

歡迎信幾封。
推播幾則。
多久沒回來就發提醒。
多久沒下單就丟折扣。

這些東西不是不能做，但如果 lifecycle 只剩下「什麼時候再敲一下使用者」，它最後通常會長成一個很忙、很滿、也很吵的系統。

**真正有用的 lifecycle，不是在想怎麼多發一點訊息，而是在想：使用者為什麼值得再回來一次？**

這句話聽起來有點抽象，但它其實比一堆 campaign calendar 實際。因為 retention 從來不只是訊息送達率、開信率或 click-through rate。Retention 本質上是在問：當使用者離開當下工作階段之後，產品有沒有留下足夠強的理由，讓他願意再開一次？

所以這篇想先把兩個常被混在一起的東西拆開：

- lifecycle 不是亂發提醒
- retention 不是把人叫回來就算成功

如果用一句更硬的話來說，我會這樣寫：

> lifecycle 是把資料、時機、訊息和頻率接成一條有邏輯的回訪路徑；retention 則是在設計「回來之後仍然有價值」這件事。

## 為什麼很多 lifecycle 操作看起來很忙，實際上卻只是在增加打擾

最常見的問題不是工具不夠強，而是團隊太早把 lifecycle 理解成 delivery system。

某個事件發生就寄信。
超過七天沒來就推播。
商品加到購物車沒買就提醒。
註冊後三天沒完成 onboarding 就再 nudging 一次。

問題不是這些 flow 一定沒用，而是很多 flow 其實只回答了「什麼時候可以發」，沒有回答「為什麼這一則在這個時刻對這個人是有幫助的」。

Braze 近年的 lifecycle 定義其實有一個很值得抓的點：它把 lifecycle marketing 寫成一種**跟著使用者關係狀態演化的溝通方式**，不是孤立 campaign 的堆疊，也不是固定日程表的重複播放。[^braze-lifecycle]

這個差別很重要。因為只要還停在固定行銷節奏，你會很容易做出這種東西：

- 新用戶第 1 天寄 welcome
- 第 3 天寄教學
- 第 5 天寄優惠
- 第 7 天寄問卷

看起來很完整，實際上卻可能完全沒有接住使用者那幾天真正發生了什麼。

有人可能早就找到價值，不需要再被教一次。
有人還沒到價值，折扣根本太早。
有人已經流失，問卷只是補刀。

**Lifecycle 真正該依附的，不是行事曆，而是訊號。**

## Retention 其實是在設計「回來的理由」

這篇的核心判準，我想講得很直接：

很多 retention 操作之所以越做越吵，是因為它們在放大提醒，沒有在放大理由。

Mixpanel 在講 value moments 時講得很準。它把 value moment 定義成使用者真正感受到產品價值的事件或一連串行為，而且很明白地說，**越快把人帶到 value，越能提高他們留下來的機率**。[^mixpanel-value]

把這個想法接回 lifecycle，其實就會看到一件事：

> 好的 lifecycle 不是把人從流失邊緣拖回來，而是持續把人推回那些能再次產生價值的時刻。

所以「回來的理由」通常不是提醒本身，而是提醒後面那個價值結構。

舉例來說：

- 專案工具裡，回來的理由可能是還沒完成的工作、被指派的新任務、同事剛回覆的討論
- 內容產品裡，回來的理由可能是新的推薦、持續追蹤的主題更新、上次看到一半的清單
- 訂房產品裡，回來的理由可能是收藏房源價格變動、行程日期快到、供給狀況改變、先前搜尋條件終於有更好的 match

這些都不是「發提醒」本身，而是**產品裡真的發生了值得再來一次的事情**。

如果產品沒有這個理由，只靠更多訊息去補，通常只是把干擾做大。

## Lifecycle 和 retention 的差別，不是有沒有發訊息，而是有沒有把訊號接進來

Braze 對 lifecycle strategy 的描述裡，我很認同一件事：真正的 lifecycle，不是排程表，而是把資料、訊息和 timing 綁在一起，依照使用者行為變動。[^braze-lifecycle]

這也是我比較偏好的 PM 判準：

### 1. 有沒有一個明確的狀態定義

使用者現在是在：
- 新進但未啟動
- 已啟動但尚未形成習慣
- 曾活躍但開始降溫
- 已經 lapse，需要 re-engage

如果這些狀態沒有定義，你的 lifecycle 多半就只是訊息排程，不是 lifecycle。

### 2. 每個狀態有沒有對應的價值問題

例如：
- 未啟動的人，問題通常是還沒碰到第一個 value moment
- 已啟動但沒形成習慣的人，問題是還沒建立重複使用的理由
- 開始降溫的人，問題可能是價值頻率下降、內容不相關，或產品已經退出當前情境

這一步很重要，因為它決定你到底是在處理 activation、habit formation、win-back，還是在錯把 acquisition 問題當 retention 問題。

### 3. Trigger 是不是跟那個問題真的有關

Customer.io 的文件寫得很務實。Campaign trigger 決定的是誰什麼時候進入流程，還可以配 filters、exit conditions 與 frequency settings，讓流程保持相關性。[^customerio-trigger]

這提醒了一件很實際的事：

**Trigger 不是裝飾，它其實就是你對「這個人現在發生了什麼」的判斷。**

如果 trigger 跟價值問題沒關，後面文案再漂亮都救不太回來。

## 為什麼 holdout 很重要：不做對照組，你很難知道自己是在幫忙還是在製造假象

Lifecycle 很容易掉進一種自我感覺良好的陷阱。

你發了一波 onboarding nudge。
回訪率上升了。
點擊率也不錯。
團隊看起來很開心。

但這裡有一個老問題：

> 這些人本來就會回來，還是因為你這則訊息真的有增量？

如果沒有 holdout，很多 lifecycle 成效其實很難分清楚。

Braze 的 Global Control Group 文件很值得看，因為它把這件事講得非常工程化。它會隨機抽一部分使用者進 control group，不讓他們收到對應訊息，然後再拿 treatment sample 去比 uplift。Braze 也特別提醒：交易型訊息可能要排除在 global control 之外，不能一刀切。[^braze-control]

這裡的重點不是你一定得用 Braze，而是你該學這個思路：

- 要有穩定的 holdout
- 要知道哪些訊息不能 withholding
- 要分清 campaign-specific control 和 global holdout 是不同用途

沒有這個對照，你很容易把自然回訪、季節性變動、產品更新、促銷期影響，全都錯算到 lifecycle 身上。

## 提醒不是打擾，前提是 timing 和 context 都有對上

如果 lifecycle 要做得不像 spam，通常有三件事要守住。

### 1. 時機必須貼著行為，不是貼著行銷月曆

Customer.io 對 trigger 的設計很清楚：event、attribute / segment、important date、relationship change，不同 trigger 處理的是不同類型的變化。[^customerio-trigger]

這也意味著你不要只問「這週要不要發」，而是該問：

- 這個人剛剛做了什麼
- 他停在哪裡
- 什麼時候最可能需要這則訊息
- 這則訊息過了這個窗口還有沒有意義

舉例：

- 註冊後 48 小時還沒走到 aha proxy，可能適合 activation nudge
- 已收藏房源但三天沒回來，可能適合價格或供給變動提醒
- 已完成第一次訂房，之後一週適合回顧或下次旅程靈感，不一定適合再推「如何開始使用」

### 2. 內容要對應使用者此刻的問題，不是對應你想推的東西

很多 retention 操作之所以吵，是因為內容是團隊想講的，不是使用者現在需要的。

這也是為什麼我比較喜歡從「回來的理由」反推訊息，而不是先想渠道。

- 如果理由是未完成任務，內容就該是續做
- 如果理由是新結果出現，內容就該是結果
- 如果理由是供給更新，內容就該是更新
- 如果理由是價值還沒形成，內容就該是更快到價值的方法

### 3. 要有 exit rule，不要讓人一直留在舊劇本裡

Customer.io 文件有一個很容易被忽略但其實很重要的點：filters 和 exit conditions 都是拿來維持流程相關性。[^customerio-trigger]

這件事很像你在修產品邏輯，而不是在排 email campaign。

如果使用者已經：
- 完成付費
- 回到高活躍狀態
- 做完那個你原本要提醒他做的事

那他就應該退出原本那條 flow。

不然 lifecycle 很容易變成一種追打，訊息比使用者的真實狀態慢半拍，最後只剩煩。

## 頻率上限不是保守，而是保留未來被相信的空間

只要 lifecycle 稍微做大，頻率上限幾乎都會變成必要條件。

Braze 在 frequency capping 的文件裡直接講：當你的訊息規模同時含 lifecycle、triggered、transactional、conversion campaigns 時，你需要控制頻率，不然通知會變得 spammy 或 disruptive。[^braze-freq]

OneSignal 也把這件事講得很直白：發太多會導致 unsubscribe、disengagement，或直接形成糟糕體驗，所以才要設分鐘、時、日、週等不同上限。[^onesignal-freq]

這裡最值得記住的不是「大家都有這功能」，而是這個產品判準：

> 頻率上限不是為了讓發送數字看起來漂亮，而是為了保留使用者未來還願意看你下一則訊息的機會。

很多團隊只在乎這次 campaign 要不要送出去，卻沒有把「之後還能不能被信任」算進來。

## 個人化不一定要很重，規則版 often 就夠了

Lifecycle 很容易被想像成超複雜的推薦引擎，好像沒有 AI decisioning 就做不起來。

實際上，很多時候先把規則版做好就已經很夠用。

例如：
- 看過某類型房源兩次以上，但還沒收藏 → 給同類型 shortlist
- 已收藏但 72 小時未回來 → 給價格 / 庫存變動
- 完成首次訂房後一週 → 給行前資訊或下一次使用情境

這種規則版個人化不華麗，但它很實際。它至少先回答了：

- 你為什麼現在收到這則
- 它跟你之前做過的事有什麼關係
- 它是想幫你完成什麼

這比一堆泛泛的「別忘了回來看看」有用太多。

## 什麼時候 lifecycle 不是你該先修的地方

這篇一定要補反例，不然很容易被讀成「只要做好 lifecycle，retention 就會變好」。

沒有這麼萬能。

### 1. 產品本身沒有穩定價值

如果回來之後仍然是空白、沒供給、常錯、內容不對，那 lifecycle 再勤勞也只是把人叫回來再失望一次。

### 2. 問題其實在 acquisition 或訊息承諾

如果進來的人本來就不對，或 landing / value prop 根本講錯，後面做再多 retention flow 也只是把錯的流量接得更細。

### 3. 你根本沒有 holdout

沒有對照組時，很多 lifecycle uplift 其實只是自然回訪或季節波動。這種時候團隊會越做越有信心，但那個信心可能是紙做的。

### 4. 你的頻率已經把 permission 用光了

有些 retention 不是輸在內容不夠，而是使用者已經學會忽略你。

這時候再多一則訊息，通常不是 solution，只是 background noise。

## PM 真正該交付的，不是幾封信，而是一個 retention operating logic

如果這塊是 PM 在帶，我會要求至少交出這幾樣東西：

### 1. Lifecycle state map

把使用者狀態切清楚：
- 未啟動
- 已啟動但未形成習慣
- 活躍
- 降溫
- 流失 / 待喚回

### 2. 每個狀態對應的「回來理由」

不是一句 campaign slogan，而是產品層面的理由。

### 3. 每條 flow 的 trigger、exit rule、holdout 設計

這是判斷力，不是工具設定。

### 4. 頻率上限與渠道優先順序

什麼情境用 email，什麼情境用 push，什麼情境乾脆不要發。

### 5. 成功指標不要只看開信和點擊

至少要看：
- 回訪
- 重複核心行為
- 留存
- 下游轉換
- 是否有負向訊號上升，例如退訂、關通知、uninstall

## 結語：Lifecycle 的工作不是提醒你記得我，而是讓你覺得回來值得

我原本也很容易把 lifecycle 想成一套訊息節奏。後來真的把 retention 拆成 value、timing、holdout 和 frequency 來看，才會發現那套節奏只是表面。

真正有用的 lifecycle，不是把使用者叫回來而已，而是讓他在回來的那一刻，能接到一個合理、相關、而且有價值的下一步。

如果你現在的 retention 操作越做越多，退訂也越來越多，我不會先問你文案夠不夠會寫。我會先問：

**這個人現在到底為什麼值得被你打擾？**

如果這題答得出來，lifecycle 才有機會變成產品體驗的一部分，而不是通知系統的擴音器。

下一篇會往 monetisation 那條線走，談另一個同樣常被過度簡化的問題：當 PM 要提升付費轉換，第一步不是直覺把 paywall 砌得更高，而是先搞清楚你現在到底是在驗證需求、體驗價值、還是 packaging 與 usage threshold。

## References

[^braze-lifecycle]: Braze, “What is lifecycle marketing? Strategies, stages, and real examples”.
[^mixpanel-value]: Mixpanel Docs, “Measure Value: The Foundation of Product Analytics”.
[^customerio-trigger]: Customer.io Docs, “Campaign triggers, filters, and frequencies”.
[^braze-control]: Braze Docs, “Global Control Group”.
[^braze-freq]: Braze Docs, “Rate Limiting and Frequency Capping”.
[^onesignal-freq]: OneSignal Docs, “Push frequency capping”.
