---
title: "PM 產品數據與實驗 03 － Tracking Plan 不是埋點清單：它其實是 PM、工程與分析之間的資料合約"
description: "很多團隊談 tracking plan 時，語氣都很像在處理一份待辦清單。"
categories: ["pm"]
tags: []
date: 2026-04-05T16:02:00
series: "PM 產品數據與實驗"
seriesOrder: 3
---

很多團隊談 tracking plan 時，語氣都很像在處理一份待辦清單。

這頁要埋。
那個按鈕要埋。
付款成功要埋。
收藏要埋。
註冊要埋。

看起來很忙，也確實埋了不少東西。可是一到真的要分析，事情就開始長出毛邊。  
同樣叫 `search`，Web 和 App 的定義不一樣。  
同樣叫 `booking_started`，有人在點 CTA 時送，有人在進入付款頁時送。  
`user_type` 有時候代表 free / paid，有時候又代表 guest / member。  
事件明明都有進資料庫，漏斗卻永遠對不起來。

這時候問題通常不是「有沒有埋點」，而是**你們根本沒有把資料定義成一份能被共同遵守的合約**。

所以我對 tracking plan 的看法一直都不是「埋點清單」，而是這樣一句話：

**Tracking plan 是 PM、工程與分析之間的資料合約。**  
它要先講清楚「什麼事情算發生了」，再講「資料該怎麼送」，最後才講「儀表板要怎麼看」。

如果前兩步沒定清楚，後面所有看似精緻的 dashboard，都只是把歧義畫得更漂亮而已。

## 為什麼很多團隊不是沒埋點，而是埋了也分析不了

埋點做不起來，有時候真的是因為還沒做。但更常見的情況其實是，資料已經在飛了，分析卻還是很痛苦。

這類團隊常見的症狀有幾種。

### 第一種，把事件名稱當備忘錄，不當定義

事件名稱如果只是為了讓工程師自己看得懂，最後幾乎一定會長成只有當事人看得懂的私房話。像 `click_btn`、`submit_form`、`step2_next`、`prod_event_7` 這類名字，短期也許方便，半年後回頭看都像考古。

好的事件名稱不是為了帥，而是為了讓未來的分析、排錯、跨團隊協作都還看得懂。

Segment 的 best practices 建議事件命名要有一致的 casing，並推薦 event 用 Title Case、property 用 snake_case。RudderStack 也建議事件名稱要用描述性、可被人直接理解的字，避免 `Event2` 這種抽象名稱；Snowplow 則進一步把 event specification、data structure、property 的命名層級分開，提醒你一致性比宗教戰更重要。問題從來不是 Title Case 比 snake_case 高級，而是**同一份資料不能今天像文件、明天像密碼**。

### 第二種，把多種商業動作硬塞進同一個事件

另一種常見失敗，是用一個超大事件把很多事情都裝進去，然後再靠 `type` 這類 property 去分辨到底發生了什麼。

例如你看到有人定義一個 `booking_action`，裡面用 `action_type` 區分 `search`、`view_listing`、`start_booking`、`payment_success`。技術上不是不能做，但分析時幾乎一定會很痛苦，因為你每次都要先記得哪個值代表哪個步驟，還要擔心不同平台是不是送了一樣的列舉值。

Snowplow 在 tracking design best practice 裡就直接把這件事點出來。它提醒 Event Specification 應該代表單一、目的清楚的 business event，像 `Add To Cart`、`Checkout Started`、`Order Completed` 這類；如果你用一個過大的事件去包很多不同動作，實作和分析都會變得混亂。

這類設計最大的問題，不是「不夠漂亮」，而是**資料粒度一開始就混掉了**。事件一旦不是單一動作，漏斗、轉換率、task success、實驗 exposure 幾乎都會開始變形。

### 第三種，只定義事件，不定義觸發條件與欄位責任

很多 tracking plan 只會寫：

- Event name
- Description
- Platform

看起來像有文件，實際上資訊遠遠不夠。

真正會在分析時把人絆倒的，往往是下面這些沒寫清楚的東西：

- 這個 event 什麼時候才算觸發
- 送一次還是可能送多次
- 是前端送，還是後端送
- 哪些 property 是必填
- 欄位型別是什麼
- 枚舉值有哪些
- user trait 是從 identify 來，還是 event 當下附帶
- 這個事件的 owner 是誰
- 上線後怎麼驗收

Twilio Segment 對 tracking plan 的定義其實講得很白。它把 tracking plan 視為全公司共用的 single source of truth，至少要回答 what、where、why，也就是你追什麼、在哪裡追、為什麼要追。這比「埋這個事件」多很多，因為它已經把商業目的和實作位置接上了。

如果 tracking plan 只寫 what，不寫 where 和 why，那份文件多半會在 sprint 結束後變成一張安靜躺著的表格，真正的語義還是藏在工程師腦袋裡。

## 先把 event、property、user trait 的責任切乾淨

這件事聽起來像基本功，但很多團隊其實是從這裡開始滑掉的。

Amplitude 對 user properties 和 event properties 的區分很實用。它把 user property 定義成描述使用者的屬性，例如 plan type、referral source、是否付費；event property 則是描述某一次事件當下的屬性，例如某次 `JoinCommunity` 的類型。更重要的是，Amplitude 特別提醒 user property 會隨時間更新，而且新值不會回寫到舊事件上。

這個提醒很值錢，因為它直接影響你怎麼設計 tracking plan。

我自己的切法通常很簡單：

- **Event**：某個可被清楚辨認的商業動作真的發生了
- **Event property**：這次動作當下的上下文
- **User trait / user property**：相對穩定、跨事件可重用的使用者屬性

例如訂房產品裡：

- `Search Performed` 是 event
- `check_in_date`、`guest_count`、`result_count` 是 event properties
- `member_tier`、`country_code`、`is_host` 是 user traits

這樣切的好處，是分析時比較不會出現「同一個欄位今天代表人、明天代表事件」的怪事。

再講更白一點。

如果某個資訊只在這一次搜尋當下成立，它就不應該被當成 user trait。  
如果某個資訊跨很多事件都值得重用，它也不該在每個 event property 裡各自複製一套。

欄位責任一旦沒切開，後面最常發生的不是報表壞掉，而是每個人都能講出一個聽起來合理、但彼此不相容的故事。

## Tracking plan 真正該長什麼樣子

我不會把 tracking plan 寫成一張只有欄位名稱的 sheet。我比較偏好把它當成一份介於 spec 和分析文件之間的東西，至少要有下面幾層。

### 1. 商業目的

先寫清楚這個事件為什麼值得追。  
不是「因為大家都會追」，而是「它會幫助我們判斷哪個問題」。

例如：

- `Search Performed`：判斷需求是否真的進到供給匹配流程
- `Listing Viewed`：判斷搜尋結果是否足夠吸引用戶點進房源
- `Booking Started`：判斷使用者是否願意從瀏覽進入交易
- `Payment Succeeded`：判斷交易是否真正完成

### 2. 觸發條件

這一欄比描述更重要。

例如 `Booking Started` 不該只寫「when booking starts」，而要寫到接近驗收等級：

> 當使用者在房源頁或訂房摘要頁按下「立即預訂」，並成功進入 checkout flow 的第一個可輸入步驟時觸發。若只是開啟 modal、尚未進入流程，不算觸發。

這樣你後面在看漏斗時，才知道這個事件到底在量什麼。

### 3. 必填 properties 與型別

至少把真正會影響分析的欄位列清楚，例如：

| property | type | required | example | 說明 |
|---|---|---|---|---|
| `listing_id` | string | yes | `lst_1024` | 房源識別碼 |
| `search_id` | string | yes | `srch_88af` | 串接一次搜尋與後續瀏覽 |
| `result_count` | integer | yes | `42` | 本次搜尋結果數 |
| `check_in_date` | date | yes | `2026-05-01` | 使用者輸入的入住日 |
| `guest_count` | integer | yes | `2` | 入住人數 |
| `platform` | string | yes | `ios` | 來源平台 |

型別這件事很容易被低估，但後面做 breakdown、filter、quality check 時，沒有型別幾乎什麼都會變慢。

PostHog 的 schema management 甚至直接把 typed property groups 做成產品能力，讓團隊可以先定義事件與欄位、型別、required 狀態，再進入實作。這個方向其實很值得學，因為它反映的不是工具癖，而是**分析要可維護，定義就不能只存在腦中**。

### 4. Owner 與驗收方式

沒有 owner 的 tracking plan，很容易變成「大家都會看，但沒有人真的負責」。

我通常會至少補兩個欄位：

- **Implementation owner**：誰負責把它正確送出來
- **Analytical owner**：誰負責確認這個事件真的可用

然後驗收方式至少寫三件事：

- sample payload 長什麼樣子
- 上線後去哪裡驗資料有進
- 哪些 sanity checks 代表它合理

這樣才算是合約，不是願望清單。

## 命名規則不是潔癖，是為了讓資料能被長期維護

這裡最常見的誤區，是把 naming convention 當成宗教戰。  
其實沒有哪一派真的神聖不可侵犯，重點只有一個：**一致，而且一看就知道它在講什麼**。

我自己的實務偏好是：

- event 名稱：人看得懂、動作清楚、同一個 tense
- property 名稱：snake_case
- 列舉值：固定字典，不讓大小寫和同義字自由生長
- ID：每個關鍵實體都要有穩定 key，例如 `user_id`、`search_id`、`listing_id`、`booking_id`

你可以採用 Segment 那種 event Title Case、property snake_case，也可以採 Snowplow 那種 event spec Title Case、schema / property snake_case。只要整個系統說同一種語言，後面就會舒服很多。

真正該避免的是這幾種：

- 同一種動作，Web 叫 `Listing Viewed`，App 叫 `view_listing`
- 同一個 property，今天叫 `plan_type`，明天叫 `user_plan`
- 一個欄位同時出現 `paid`、`Paid`、`premium`、`pro`
- 想圖省事，用 `type`、`status`、`value` 這種空泛名字裝一切

這些東西在 sprint 當下都沒那麼可怕，但三個月後你要回頭解 retention drop 或分析實驗 side effect 時，它們就會從小石頭長成一面牆。

## 什麼叫「可分析的最低條件」

這裡我想講得比一般 tracking plan 文章再硬一點。

很多團隊以為事件有進 warehouse 就叫可分析。我不同意。

我認為一個事件至少要滿足下面幾件事，才算真的可分析：

### 1. 定義清楚，別人可以複述

別的 PM、工程師、分析師看到這個事件名稱時，應該能大致說出它什麼時候觸發、用來回答什麼問題。  
如果每次都要回頭問原作者，那這份定義就還沒站穩。

### 2. schema 穩定，型別可預期

Snowplow 把 schema validation 直接放進資料管線，讓不符合 schema 的事件被送到失敗位置，而不是默默混進分析表。這件事很值得所有團隊抄。因為資料品質如果要等到 dashboard 才發現，通常已經太晚了。

### 3. 關鍵 join key 存在

如果事件無法穩定接到 `user_id`、`session_id`、`search_id`、`booking_id` 這些關鍵實體，你後面很多漏斗和歸因分析都會斷掉。

### 4. 欄位能支援你真的會做的 breakdown

不是欄位越多越好，而是**要有你真的會拿來切問題的欄位**。  
例如平台、國家、登入狀態、新舊用戶、流量來源、付款方式，這些常常比一大堆華麗但沒人用的 custom property 更值錢。

### 5. 有 QA 機制，而不是靠祈禱

這一點很多團隊都知道，卻很少真的寫進流程。  
我會把 QA 拆成三層：

- **Implementation QA**：payload 對不對、欄位有沒有漏、型別有沒有錯
- **Behaviour QA**：操作一次，事件是否只送一次，觸發時機是否正確
- **Analytical QA**：上線後一天內，事件量、平台占比、主要列舉值是否合理

做到這裡，tracking plan 才真的像合約。  
不然它比較像婚禮上的交換誓詞，講完很感人，回家還是不知道誰洗碗。

## 「漏斗閉合」其實是 tracking plan 最常被忽略的驗收

我很少看到團隊在 tracking plan 階段就明寫 funnel closure，但它其實超重要。

所謂漏斗閉合，不只是事件有按照順序存在，而是：

- 每一步都有明確事件
- 事件的定義彼此不重疊
- 可以用合理 key 串起前後步驟
- 時間窗和分母定義合理
- 不會因為平台差異導致某一步天生少資料

還是用訂房產品舉例。  
如果你的漏斗是：

1. `Search Performed`
2. `Listing Viewed`
3. `Booking Started`
4. `Payment Succeeded`

那 tracking plan 階段就該問：

- `Listing Viewed` 是否一定帶 `search_id`
- `Booking Started` 是否一定帶 `listing_id`
- `Payment Succeeded` 是否一定帶 `booking_id`
- Web 與 App 對 `Booking Started` 的定義是否一致
- 若使用者跨裝置，能不能至少在 account level 接回來

如果這些事沒先問，等你進 SQL 時才會發現漏斗像一條到處漏水的水管。

## 什麼時候不要把 tracking plan 搞得太重

寫到這裡，也要補一個邊界。

我不是主張每個小功能都要先開一份 80 欄的大型表格。  
太重的流程一樣會害人，尤其在 0 到 1 或高速迭代階段。

如果你只是測一個很小的 UX tweak，或一個一次性的 campaign landing page，tracking plan 可以輕一點。  
但就算輕，也至少要保住幾件事：

- 事件名稱與目的
- 觸發條件
- 必填欄位
- owner
- QA 方法

也就是說，**可以簡化，不要失焦**。  
不要因為怕麻煩就回到「先埋了再說」，那種做法一開始看起來省時間，後面往往會用更多時間還債。

## 我會怎麼寫一份夠用的 tracking plan

如果今天要讓 PM 自己先起一版，我會建議最低配長這樣：

1. 先從 metric tree 或漏斗挑出最關鍵的 10 到 20 個事件  
2. 每個事件補齊：
   - business purpose
   - trigger
   - owner
   - required properties
   - sample values
   - downstream metric
3. 把跨事件共用的資訊抽成 user trait 或共用 entity  
4. 定 naming rules 與 enum dictionary  
5. 為每個關鍵事件寫一條 QA checklist  
6. 在正式上線前，先驗一次 funnel closure

這樣做的結果，不只是工程比較好實作。  
更重要的是，後面進 SQL、做 cohort、做 A/B validity、查資料異常時，你會發現自己不是在一堆霧裡找答案，而是在一張已經畫好的地圖上走路。

這就是我認為 tracking plan 真正該扮演的角色。

它不是埋點清單。  
它是把商業語義翻譯成資料語義，再讓工程和分析一起照著執行的契約。

下一篇我們才會進 SQL。  
因為只有當事件層站穩了，SQL 才是在打撈證據。  
不然你只是在比較有技術感地打撈噪音。
