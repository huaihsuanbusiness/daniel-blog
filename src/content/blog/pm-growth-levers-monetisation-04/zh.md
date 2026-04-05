---
title: "PM 成長槓桿與變現 04 － Monetisation 不只是加 paywall：Fake Door、Trial、Bundling 與限制策略該怎麼選"
description: "很多產品一談 monetisation，第一個反應就是 paywall。"
categories: ["pm"]
tags: []
date: 2026-04-05T16:11:00
series: "PM 成長槓桿與變現系列"
seriesOrder: 4
---

很多產品一談 monetisation，第一個反應就是 paywall。

把免費功能收掉一點。
把 CTA 再推前面一點。
把價格頁再強硬一點。
把試用縮短。
把限制拉緊。

這些動作有時候會有用，但如果團隊一看到付費轉換卡住，就只剩下「把牆砌高一點」，通常代表一件事：

**你們還沒搞清楚自己現在到底在驗證哪一種不確定性。**

因為 monetisation 問題其實常常不是同一題。

有時你不知道的是：
- 這個付費價值有沒有真需求
- 使用者要不要先摸到價值，才願意付費
- 哪些功能應該綁在一起賣
- 收費到底該跟 seat、feature、還是 usage 走
- 哪個限制點才不會太早把人嚇跑，又能讓付費動機成立

如果這些題目混在一起，團隊就很容易做出看起來很努力、實際上很難學到東西的 monetisation experiments。

所以這篇的主張很簡單：

> Monetisation 的第一步，不是先決定 paywall 要長怎樣，而是先判斷你現在最不確定的是需求、價值體驗、方案包裝，還是使用量門檻。

一旦不確定性不同，你該用的測法也會不同。

## 先講一個最常見的誤判：把所有 monetisation 問題都當成 paywall 問題

這個誤判很常見，因為 paywall 很顯眼。

它看得見、改得動、也很容易被討論。

但真正麻煩的是，很多付費轉換卡住的原因，其實比 paywall 更前面。

例如：
- 使用者根本還沒相信這個價值值得付費
- 產品需要時間上手，太早談錢只會中斷 learning
- 付費功能切得很怪，package 本身沒有形成清楚的升級理由
- 限制策略卡在錯的地方，導致高意圖用戶和低意圖用戶一起被擋
- 你甚至還不知道某個新功能到底有沒有付費需求

這時候如果第一步就去改 paywall 文案，很容易變成局部修飾。頁面可能比較漂亮，轉換卻不一定真的變好。

所以我比較喜歡先把 monetisation experiments 分成四類：

1. **Fake Door**：先驗證需求
2. **Trial**：先讓人碰到價值，再決定要不要買
3. **Bundling / Packaging**：把價值組合成更合理的升級路徑
4. **Usage limits / 限制策略**：讓付費點跟價值消耗更貼近

這四種不是互斥，但它們回答的問題不同。

## 先測需求：什麼時候該用 Fake Door

Fake Door 很適合處理一種很具體的不確定性：

> 這個付費功能或新 offer，到底有沒有真實需求，值得你花時間做出來？

Optimizely 把 painted door test 定義成一種「先做出看起來存在的功能入口，再測興趣」的方法，本質上就是先驗證市場或使用者是否真的在意，再投入建置成本。[^optimizely-painted]

Amplitude 對 fake door 的描述更完整一點。它把 fake door 定義成：做出看起來可用、實際上尚未完成的 UI 元件，觀察使用者會不會點、誰會點、重複點幾次，藉此收 behavioural evidence，而不是只靠訪談或 survey。[^amplitude-fake-door]

這裡最重要的不是「做假按鈕」這個形式，而是它在驗證什麼：

- 需求是否存在
- 哪些 segment 最有興趣
- 這個需求是不是只停留在口頭偏好，還是真的會表現在行為上

### 什麼情況適合先跑 Fake Door

- 你想測某個 premium feature 值不值得做
- 你想知道某個 paid add-on 到底誰會想買
- 你懷疑某個 package 方向有需求，但還不想一開始就砸完整開發
- 你想招募高意圖 beta user

### Fake Door 真正測到的是什麼

這裡一定要講清楚，免得它又被神化。

Fake Door 測到的通常是：
- interest
- intent to explore
- willingness to opt in

它**不是**：
- 實際使用滿意度
- 長期留存
- 真正的 willingness to pay 全貌

Amplitude 也直接提醒，fake door 測的是 intent，不是 satisfaction，而且它比較適合 discrete、好理解、可以用一個入口說清楚的功能。複雜 workflow 就不太適合用這種方法。[^amplitude-fake-door]

### Fake Door 的邊界：不要拿它去測信任敏感的承諾

這篇一定要補這段，不然很容易變成「凡事先 fake 一下」。

Fake Door 雖然省，但也有 reputation risk。Amplitude 明講，如果做得不透明，使用者會覺得自己被騙，信任可能受損。它也建議 click 後要立刻揭露這是在測試、說明原因、給回饋或 waitlist 的路徑。[^amplitude-fake-door]

所以我不會拿 Fake Door 去測：
- 高風險金融承諾
- 已經牽涉付款或法規的功能
- 容易被理解成「你明明說有，結果根本沒有」的敏感承諾

這條路適合拿來驗證需求，不適合拿來透支信任。

## 先讓人碰到價值：什麼時候該用 Trial

有些付費轉換卡住，不是需求不存在，而是**使用者還沒真正碰到價值**。

這時候試用通常比硬上 paywall 更合理。

Trial 最適合處理的問題是：

> 這個價值要不要先讓使用者實際體驗，才有機會成立付費意願？

Stripe 的 subscription / trial 文件很有用，因為它把 trial 當成 billing lifecycle 的正式一段，而不是單純 marketing 優惠。它也明講 trial 可以和 recurring subscriptions、usage-based billing、upgrade flow 一起設計。[^stripe-trials] [^stripe-free-trials]

這提醒了一件事：

**Trial 不是折扣的別名，它其實是在設計一段受控的價值暴露期。**

### 什麼時候 Trial 比 Fake Door 更適合

- 你已經大致知道需求存在，但使用者需要 hands-on 才能理解價值
- 功能的體驗感很強，不是看文案就能決定
- 產品的價值需要一點 setup 或探索時間
- 你要測的是付費轉換，而不是單純點擊興趣

### Trial 的 tradeoff：不是越長越好，也不是越短越有 urgency 就一定贏

OpenView 講 reverse trial 時把 tradeoff 說得很清楚。一般 free trial 的好處是會逼出決策，有 urgency，所以 free-to-paid conversion 常常比較高；但對某些產品來說，若使用者在 14 或 30 天內根本還摸不到深層價值，太短的 trial 反而只是把人趕出門。[^openview-reverse-trial]

這也是為什麼 trial 不是越短越好。它得跟你的 time to value 對上。

如果產品本來就需要：
- 匯入資料
- 等結果跑出來
- 邀請團隊成員
- 經過一個完整使用週期

那 trial 設得太短，只會把沒來得及理解價值的人提早送去流失。

### Reverse Trial 什麼時候值得考慮

OpenView 把 reverse trial 定義成：新用戶先短時間體驗高階功能，期滿後若不升級，就回到 free plan。[^openview-reverse-trial]

這種做法特別適合：
- 你仍然想保留 free entry point
- 但又想讓新用戶先看到 premium 的上限
- 產品重視長期 adoption，不想一開始就把轉換對話做得太硬

它不是每種產品都適合，但對一些 PLG 產品很合理，因為它同時保留 acquisition 與 paid feature exposure。

### Trial 還有一個常被忽略的面向：合規與營運細節

Stripe 也提醒，如果你提供 trial 或 promotion，還要處理 trial 結束前的通知要求。即使用不用 Stripe 內建 trial features，仍然得遵守相關 requirements。[^stripe-compliance]

這裡想講的是：

Trial 不是只在 growth dashboard 上漂亮就好。它也牽涉 billing、email 通知、付款驗證、試用結束轉正等營運細節。

## 先重組價值：什麼時候該用 Bundling / Packaging

有時候轉換不動，不是因為價值太弱，而是因為**價值被切得很碎，升級理由不夠完整**。

這時候問題比較像 packaging，而不是單一 paywall copy。

Paddle / ProfitWell 對 bundling 的定義很樸素，但很實用：把互補、常一起購買或一起使用才更完整的東西包在一起賣，讓客戶更容易理解整體價值，也讓企業更容易提高整體銷售。[^paddle-bundling]

OpenView 在談 SaaS pricing mistakes 時也提到，good-better-best packages 很常見，因為它在客戶可理解性和公司 upsell 空間之間通常能取得不錯平衡。[^openview-packaging]

### Bundling 什麼時候有用

- 功能本來就互補，一起用比拆開更完整
- 使用者升級時想買的是 outcome，不是 feature checkbox
- 你現在的方案切分太碎，導致使用者知道某個功能不錯，卻不知道為什麼要整體升級

### Bundling 什麼時候會失敗

- 只是把冷門功能硬綁在一起
- package 沒有對應明確 persona 或 use case
- bundle 看起來像在幫公司賣更多，不像在幫客戶更快成功

這裡的重點是：**bundle 必須讓價值理解更簡單，而不是讓價格表更複雜。**

如果打包後反而讓人看不懂自己在買什麼，那通常不是 bundle 成功，而是 package 霧化。

## 讓付費點跟價值對齊：什麼時候該用 Usage limits / 限制策略

有些產品的最佳 monetisation 方式，不是把功能整片鎖起來，而是讓收費跟 usage 成長對齊。

Stripe 對 usage-based pricing 的定義很清楚：依照使用量來收費，而不是固定 flat rate。[^stripe-usage]

OpenView 在談 API usage-based pricing 時也提醒得很準：真正關鍵不是能不能按 usage 收，而是你選的 metric 要跟 business value received 相關。若 metric 選錯，你可能低估或高估價值；甚至連 error call、無結果 call 都拿來計費，就會很奇怪。[^openview-usage]

這對 PM 很重要，因為很多「限制策略」的失敗，其實不是 free 太大或 paywall 太弱，而是**limit 卡在錯的地方**。

### 好的限制策略通常有幾個特徵

- limit 跟使用者感受到的價值有關
- 在免費階段仍然能成功一次，不會完全碰不到價值
- 真的撞到限制時，使用者能理解為什麼該升級
- upgrade 之後的價值擴張很清楚

### 壞的限制策略常見長這樣

- 還沒碰到價值就先撞牆
- 限制的是低價值動作，不是高價值消耗
- 免費版根本做不了一件完整的事
- 限制點太複雜，使用者搞不清楚自己是在買什麼

Stripe 在談 pricing iterations 時有一句很值得記：價格迭代可以是新的 tier、usage threshold 調整、experimental bundle，這些都應該是 evidence-based。[^stripe-iterations]

這其實就是在說：

**usage limit 不是隨便畫一條線，而是一種要靠行為與價值證據去校正的 monetisation 設計。**

## 怎麼選：你現在最不確定的是哪一題？

如果把這篇濃縮成一張 decision map，我會這樣看：

### 1. 你最不確定的是「有人想要嗎？」
用 **Fake Door**。

### 2. 你最不確定的是「用過之後會不會比較願意買？」
用 **Trial**。

### 3. 你最不確定的是「升級理由到底該怎麼組成？」
看 **Bundling / Packaging**。

### 4. 你最不確定的是「收費點該卡在哪裡才跟價值同步？」
看 **Usage limits / Usage-based logic**。

這四種都可能跟 paywall 有關，但它們不是同一層。

Paywall 比較像最後的呈現介面。你前面那個判斷如果錯了，paywall 文案再怎麼優化，也只是幫錯題做得更精緻。

## 什麼時候不要太早優化 Paywall

這是這篇一定要講的反例。

有些情況下，太早優化 paywall 反而是在避開真正的問題。

### 1. 使用者還沒碰到第一個 value moment

如果人根本還沒成功一次，你現在要優化的是 activation，不是 paywall。太早談錢，只會讓產品還沒證明自己就先開始收費。

### 2. 你不知道 premium value 到底有沒有需求

這時候應該先跑 Fake Door 或 demand test，而不是直接做完整付費體驗。

### 3. Package 自己就站不穩

如果功能切分沒有邏輯、plan 沒對應 persona、升級理由模糊，那 paywall 通常不是主戰場。

### 4. 使用量門檻明顯選錯

當 usage threshold 本身不對時，改 paywall wording 只是修門牌，不是修房子。

## PM 在 monetisation 這塊真正該交付的是什麼

如果是我在帶這塊，我會要求團隊至少交出這些東西：

### 1. 一張 monetisation uncertainty map

先說清楚你在驗證：
- demand
- value experience
- packaging
- usage threshold

### 2. 每個實驗對應的 success metric

例如：
- Fake Door：click-through、waitlist opt-in、segment quality
- Trial：trial-to-activation、trial-to-paid、trial 後留存
- Bundle：attach rate、upgrade rate、ARPU / plan mix
- Usage limit：limit hit rate、upgrade conversion、撞牆後流失率

### 3. 不要只看當下轉換，也要看後面有沒有壞掉

付費上升如果伴隨：
- refund
- early churn
- activation 下滑
- 使用體驗變差

那很可能只是把收入往前擠，不是把 monetisation 做對。

### 4. 實驗要能回答「下一步該 build 還是該改方向」

這才是 monetisation experiment 真正的價值。

## 結語：Monetisation 不是把牆砌高，而是把付費時刻放在對的位置

我原本也很容易把 monetisation 想成 paywall 和 pricing page。後來真的把 demand、trial、packaging、usage threshold 分開看，才會發現很多轉換問題根本不是同一類。

有些時候，你該先測的是有沒有人真的要。
有些時候，你該先讓人摸到價值。
有些時候，你該重組 package。
有些時候，你該讓限制點更貼近價值消耗。

真正成熟的 monetisation，不是每次轉換一掉就把牆往前搬，而是知道：

**你現在到底在解哪一種不確定性。**

這題答對了，paywall 才有可能是好的收尾；不然它很容易只是把錯的假設做成更漂亮的牆。

## References

[^optimizely-painted]: Optimizely, “What is a painted door test? Its benefits and examples”.
[^amplitude-fake-door]: Amplitude, “What Is Fake Door Testing: Methods And Best Practices”.
[^stripe-trials]: Stripe Docs, “Configure trial offers on subscriptions”.
[^stripe-free-trials]: Stripe Docs, “Use free trial periods on subscriptions”.
[^openview-reverse-trial]: OpenView, “Your Guide to Reverse Trials”.
[^stripe-compliance]: Stripe Docs, “Manage compliance requirements for trials and promotions”.
[^paddle-bundling]: Paddle / SBI Growth, “Product Bundling Basics & Examples”.
[^openview-packaging]: OpenView, “The 5 SaaS Pricing Mistakes You’re Probably Making (And How to Avoid Them)”.
[^stripe-usage]: Stripe, “What is usage-based pricing?”.
[^openview-usage]: OpenView, “4 Tips to Monetize APIs With Usage-Based Pricing”.
[^stripe-iterations]: Stripe, “How to implement pricing iterations for your business”.
