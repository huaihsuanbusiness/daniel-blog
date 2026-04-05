---
title: "PM 產品數據與實驗 02 － Metric Tree 還不夠：PM 為什麼也該懂指標字典、口徑治理與 semantic layer"
description: "很多 PM 開始建立數據能力時，第一個會學到的進階工具是 metric tree。"
categories: ["pm"]
tags: []
date: 2026-04-05T16:01:00
series: "PM 產品數據與實驗系列"
seriesOrder: 2
---

很多 PM 開始建立數據能力時，第一個會學到的進階工具是 metric tree。

這很合理。

因為 metric tree 很直覺。你把最上面的目標拆開，往下找到 drivers，再一路拆到團隊真的能動手改的地方。它很適合拿來做 root cause analysis，也很適合逼團隊停止空泛討論。Mixpanel 和 Count 都把 metric tree 描述成從高層目標一路往下連到 input metrics 的結構，核心用途就是把策略和行動接起來。

所以我不是要唱反調說 metric tree 沒用。

我反而覺得，它很有用。

但它常常只解決了一半的問題。

它會告訴你，`Weekly Successful Bookings` 可以拆成流量、供給、漏斗轉換。它也會告訴你，`Payment Success Rate` 掉了，可能是支付錯誤、房態不一致、或風控流程卡住。

可它不會自動解決另一個更日常、也更惱人的問題：

> 同樣叫 conversion、retention、active user，為什麼不同人拉出來的數字會不一樣？

這個問題不是沒有分析能力，而是沒有定義能力。

也就是說，你可能已經有地圖了，但還沒有字典。大家看似在討論同一個節點，實際上每個人心裡的意思都不同。

這篇文章想講的，就是這個責任分工。

**Metric tree 負責回答什麼在驅動結果。Metric dictionary 負責回答這個結果到底是什麼。Semantic layer 則負責讓不同工具、不同人、不同報表真的拿到同一個答案。**

如果少掉後兩層，metric tree 很容易長成一棵很漂亮、但每個節點都在偷偷漂移的樹。

## Metric tree 解的是因果與行動，不是口徑治理

我們先替 metric tree 說句公道話。

它最大的價值，是把高層結果拆成團隊可操作的 drivers。Count 在介紹 metric tree 時就特別點出，每個節點除了可以有 business definition，也可以有 formula；而它之所以有效，不只是因為結構圖好看，更因為建立過程會逼業務和資料團隊對「到底要怎麼拆」達成共識。

這種對話非常重要。

因為很多公司做數據，其實最缺的不是 dashboard，而是「高層指標往下拆之後，誰對哪一段負責」。

還是用訂房產品來看。你可以把 `Weekly Successful Bookings` 拆成這樣：

| 層級 | 指標 |
|---|---|
| North Star | Weekly Successful Bookings |
| L1 | Qualified Visitors、Inventory Match Rate、Payment Success Rate |
| L2 | Search Sessions、View Rate、Start Booking Rate、Active Properties |
| L3 | 搜尋結果可用率、房態同步成功率、支付錯誤率、價格透明度相關訊號 |

這張樹很有用。

因為當北極星往下掉時，你不需要第一時間進入宗教辯論。你可以先看是需求有問題、供給有問題，還是交易有問題。

但請注意，這棵樹就算畫得再精緻，也還是不會幫你解決下面這些事：

- `Qualified Visitors` 到底有沒有排除 internal traffic
- `Start Booking Rate` 的分母是看過房源的人，還是進到房源頁的人
- `Payment Success Rate` 算的是 order-level 還是 attempt-level
- `Weekly` 是用 UTC、台灣時間，還是市場所在地時間
- 退款後的訂單會不會回填修正
- 重複事件、late events、bot traffic 要不要排除

這些東西一旦沒定義好，metric tree 就只是在幫大家把歧義畫得更漂亮。

## 指標字典不是資料團隊的行政作業，而是數據決策的法律條文

我很喜歡你資料課表裡那句話：**每個數字都要能被法庭質詢。**

這句很準。

因為一個成熟的指標，不該只有名稱。它至少要能回答「它怎麼算、從哪來、什麼時候更新、哪些情況不算、誰負責維護」。你上傳的指標字典材料也明確提到，一個合格的字典要統一命名、統一口徑，並確保指標具備一義性，不要同一個名字在不同情境下有不同意思。

我自己會把 metric dictionary 當成指標系統的**定義層**，它至少該包含下面這些欄位：

| 欄位 | 要回答什麼 |
|---|---|
| 指標名稱 | 這個數字到底叫什麼 |
| 商業定義 | 它代表的商業意義是什麼 |
| 計算公式 | 分子、分母、聚合方式是什麼 |
| Grain | 是 user、session、order，還是 property level |
| 時間窗 | 日、週、月怎麼切，時區是什麼 |
| 去重規則 | 重複事件怎麼處理 |
| 過濾條件 | 是否排除測試帳號、員工流量、bot |
| 資料來源 | 來自哪張表、哪個事件 |
| 更新頻率 | 即時、日更、回填 |
| Owner | 誰能修改、誰負責解釋 |
| 常見誤差 | late events、refund backfill、identity stitching 等注意事項 |

這些欄位看起來不浪漫，但它們才是讓數字能被討論的前提。

### 同樣叫 conversion，差一點點就會差很多

最常見的災難不是 SQL 寫錯，而是每個人都「只差一點點」。

例如同樣是 `Start Booking Rate`，可能出現這三個版本：

1. `booking_start / listing_view`
2. `unique_users_started_booking / unique_users_viewed_listing`
3. `sessions_with_booking_start / sessions_with_search_result`

三個都可以叫開始訂房率。

三個也都不是亂寫。

但它們回答的問題完全不同。

第一個看的是事件轉換。第二個比較接近 user-level 行為。第三個則混進了 session 定義和更上游的搜尋結果暴露。

如果這三個版本在公司裡同時存在，而大家開會時都只說「開始訂房率」，那不是分析，是大型同音異義字事故現場。

所以我通常會說，**metric tree 讓你知道該往哪裡追，metric dictionary 才讓你知道你追的是不是同一個東西。**

## 指標治理不是 BI 小組的事，它其實是產品治理的一部分

講到這裡，很多人會開始把問題丟給資料團隊。

「那就請 BI 建字典啊。」

技術上可以這樣分工，但責任上不能這樣切。

因為指標定義從來不是純資料問題，它同時是產品問題、營運問題、財務問題。

舉例來說，`Successful Booking` 要不要把 24 小時內取消的訂單算進去？

這件事不是分析師自己能決定的。

如果你算進去，這個指標比較接近交易完成當下的轉換效率。若你不算進去，它比較接近更保守、偏品質的完成訂單。兩種都不是絕對錯，但會對產品決策產生不同偏好。

這就是治理。

治理不是把定義寫在 Confluence 而已。治理真正包含的是：

- 誰有權改定義
- 改之前要跟哪些角色對齊
- 改完要怎麼公告
- 舊版怎麼 sunset
- 哪些報表需要一起更新
- 歷史數字要不要回填

如果這些沒設好，資料團隊就會變成公司裡最忙的翻譯員，每個會議都在解釋「為什麼你昨天看到的是 12.4%，今天變成 11.7%」。

那不是因為資料團隊不夠強。通常只是因為組織沒有把指標當成產品資產在管。

## Semantic layer 做的，是把定義真正推到每一個查詢與工具上

到這裡，很多團隊會覺得，我們把字典寫好不就好了？

還不夠。

因為文件裡寫得再完整，只要每個人還是各自重寫 SQL、各自建 BI calculated field、各自在 Python notebook 裡補 case when，最後定義還是會再次分裂。

這就是 semantic layer 要解的事。

Looker 很早就把 semantic model 放在核心位置，Google Cloud 2024 年也再次強調，它的設計目標就是讓 teams **define metrics once and use them everywhere**，以換來 governance、security 與 trust；dbt 近年的 Semantic Layer 也明講，中心思想就是把 metric definitions 從 BI layer 拉回 modeling layer，讓不同 business units regardless of tool 都能用到同一份 metric definition，改一次就能在所有應用更新。

這段話其實很值得 PM 聽懂。

因為 semantic layer 不是「另一個報表工具」，也不是把術語講玄一點的 metadata。

它真正做的事，是把商業定義變成可執行的查詢邏輯，然後讓各種消費端都走同一條路。

LookML 的例子就很典型。Looker 會先在模型裡定義 dimensions、measures、joins，再讓使用者用 business terms 去組 query，而不是每個人自己寫底層 SQL。

這件事聽起來像工程細節，但它其實直接改變 PM 的工作環境。

因為一旦 semantic layer 在，PM 跟分析師討論的重點就比較像：

- 我們這個指標的商業定義對不對？
- 這個維度該不該開放自助分析？
- 這次定義變更會影響哪些消費者？

而不是天天回到：

- 你這條 SQL 可以借我嗎？
- 為什麼你 dashboard 的付費用戶比我的少？
- 這個 where 條件你有沒有多排一個 state？

## 可以把這三層想成不同責任，不要混成一坨

我會把它們這樣分：

| 層 | 它回答什麼 | 沒有它會怎樣 |
|---|---|---|
| Metric Tree | 什麼在驅動結果 | 只看結果，不知道從哪裡下手 |
| Metric Dictionary | 這個指標到底是什麼 | 同名不同義，會議吵不完 |
| Semantic Layer | 怎麼讓所有工具拿到同一個答案 | 文件寫得漂亮，實作還是分裂 |

這個分法很重要，因為很多團隊最大的問題不是三者都沒有，而是三者被混著叫。

有人把 metric tree 畫成一張大圖，就以為定義已經完成。有人寫了一頁 glossary，就以為 self-service 會自然發生。也有人導入 semantic layer 工具後，才發現底層事件命名和 business definition 根本還沒整理好。

結果不是工具沒用，而是責任分工沒切乾淨。

## 什麼時候該先做字典，不要急著上 semantic layer

這裡我故意講一個比較不熱血的答案。

不是每個團隊都該立刻上 semantic layer。

如果你現在是下面這種情況，我反而會建議先別衝：

### 1. 團隊還只有單一分析師、單一 BI 工具

這時候最大的痛，通常還不是 cross-tool inconsistency，而是核心指標本身都還沒釘死。先把前 20 個最重要的 metrics dictionary 寫穩，比急著找平台更划算。

### 2. Tracking 還很亂

事件命名不穩、user identity 亂跳、late events 沒規則，這種狀態下導 semantic layer，很像在地基還沒乾時就急著鋪木地板。看起來比較高級，但踩下去還是會晃。

### 3. 指標 ownership 不清楚

如果任何人都能隨手改指標定義，而且沒有 change log、沒有 approval flow，再好的 semantic layer 也只是在加速混亂同步。

我會更推薦的順序是：

1. 先把 metric tree 畫出來，知道你在解什麼問題
2. 先把核心 metrics dictionary 寫出來，讓數字能對話
3. 再決定要不要用 semantic layer 把定義推進系統裡

這個順序比較慢，但通常比較不會花大錢把混亂自動化。

## 一個訂房產品的最小落地版本，可能長這樣

如果今天你是訂房產品的 PM，我會建議先從 8 到 12 個核心指標開始，不要一口氣鋪滿全公司。

例如：

### Step 1：先有樹

把 `Weekly Successful Bookings` 往下拆成：

- Qualified Visitors
- Inventory Match Rate
- View Rate
- Start Booking Rate
- Payment Success Rate
- Cancellation Rate
- Refund Rate

### Step 2：再寫字典

以 `Payment Success Rate` 為例，不要只寫名字，要寫成這種程度：

- 定義：完成付款成功的訂單數 / 開始付款的訂單數
- Grain：order-level
- Timezone：Asia/Taipei
- 去重：同一 order 多次支付嘗試只算最終成功一次
- 排除：internal traffic、測試帳號
- 回填：退款不影響此指標，但影響 Refund Rate
- Owner：Payments PM + Analytics

### Step 3：最後才上 semantic layer

等這些定義穩了，再把 dimensions、measures、joins、access control 真的進模型，讓 BI、SQL、自助分析、甚至 AI agent 都吃同一套商業語義。

這樣做的好處不是只有「數字一致」。

更大的好處是，當數字突然跳動時，你比較知道該先懷疑哪一層。

- 是業務真的變了？那去看 metric tree
- 是定義漂了？那去看 metric dictionary
- 是不同工具邏輯不一致？那去看 semantic layer

這種分層，會讓 debug 速度快很多。

## 最後收一下

Metric tree 很重要，但它不是萬靈丹。

它幫你把業務目標拆成可行動的結構，這件事超級有價值。只是它解的是「怎麼拆」，不是「怎麼定義」，更不是「怎麼在全公司重複使用同一個定義」。

所以如果你的團隊已經開始遇到這些症狀：

- 同名指標不同數
- 不同報表互相打架
- 每個分析需求都要重新寫 SQL
- PM 問一個簡單問題，要排隊等資料團隊翻譯

那通常不是你們不夠 data-driven，而是指標系統少了中間那幾層。

你需要的不只是更大的 dashboard，也不只是更精緻的 metric tree。

你需要把這三件事補齊：

- 用 **metric tree** 建立因果地圖
- 用 **metric dictionary** 釘死定義
- 用 **semantic layer** 讓定義真的活在系統裡

做到這一步，產品團隊才比較有機會從「大家都很會看數字」，進到「大家終於在看同一個數字」。

下一篇如果往後接，就該落到事件層了。

因為當你把指標定義與治理釘住後，下一個問題就會變成：這些數字背後的事件，到底有沒有被正確埋、正確命名、正確驗收。那時候就會進到 tracking plan 這條線。
