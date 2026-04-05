---
title: "PM 產品數據與實驗 05 － Window Function、Session 化與 Funnel SQL：SQL 真正開始有判斷力的地方"
description: "`count(*)`
`group by`
`sum(case when ...)`"
categories: ["pm"]
tags: []
date: 2026-04-05T16:04:00
series: "PM 產品數據與實驗系列"
seriesOrder: 5
---

很多 PM 學 SQL，會先學會算數字。

`count(*)`
`group by`
`sum(case when ...)`

這一段很重要，因為你終於能自己把問題丟進資料庫，不用每次都排隊等人幫忙。但真的進到產品現場之後，你很快會發現另一件事。

麻煩通常不是「總共有幾個人做了某件事」，而是：

- 這個人先做了什麼，後做了什麼
- 這兩個事件之間隔了多久
- 哪一次才算真正的第一步
- 這串行為應該算同一次使用，還是新的 session
- 同樣叫 conversion，分母到底是 user、session，還是 search session

也就是說，**SQL 真正開始有判斷力，不是在你多背了幾個語法，而是在你開始能讀序列、切邊界、定義旅程。**

這也是我會把 `row_number`、`lag`、`lead`、session 化和 funnel SQL 放在同一篇講的原因。它們表面上是不同技巧，骨子裡其實都在做同一件事：

> 把一串事件，整理成可以判斷使用者旅程的證據。

這篇不打算把 window functions 全部教完，也不會直接衝進最花俏的 SQL 花式操作。我要講的是 PM 真正需要掌握的那一層：**什麼時候該用這些工具，怎麼用，最容易在哪裡判斷錯。**

## 為什麼基礎 SQL 還不夠

基礎 SQL 很擅長回答橫切面的問題。

例如：

- 上週有多少 `booking_started`
- 每個國家的付款成功率是多少
- iOS 與 Android 的 `Inventory Match Rate` 差多少

但它不太擅長回答這種問題：

- 一個使用者是看了幾次房源後才開始訂房
- 同一個人連點三次 `start_booking`，哪一次才算漏斗第一步
- 這次付款失敗，是前一個事件導致的，還是隔了 40 分鐘後另一輪嘗試
- 某個 funnel 的 drop-off，到底是使用者真的卡住，還是我們把不同 session 混在一起算了

這些問題的共同點是：**你不能只看聚合後的表，必須回到事件序列本身。**

而 window functions 的價值，就在這裡。

## `row_number`：不是排名而已，它是在幫你選「哪一筆才算」

很多人第一次學 `row_number()`，會把它記成一個排名工具。這不算錯，但對 PM 來說，真正有用的地方通常不是排名，而是**挑代表列**。

最常見的場景是去重。

例如你的訂房流程裡，`booking_started` 可能因為前端重送、重新整理、網路重試，出現多筆幾乎一樣的事件。這時候如果你直接把所有 `booking_started` 都拿去算 funnel，漏斗第一步就會膨脹，後面的轉換率也會被扭曲。

這時候你更在意的問題通常不是「一共有幾筆」，而是：

- 每個 user 在某個 session 裡，第一筆 `booking_started` 是哪一筆
- 每個 search session 裡，第一個被看的房源是哪一個
- 每個訂單流程裡，最後一筆付款狀態是哪一筆

簡化後的寫法大概會長這樣：

```sql
with booking_start_ranked as (
  select
    user_id,
    session_id,
    event_time,
    row_number() over (
      partition by user_id, session_id
      order by event_time asc
    ) as rn
  from events
  where event_name = 'booking_started'
)
select *
from booking_start_ranked
where rn = 1;
```

這裡真正重要的不是語法，而是你在做的判斷：

**你正在宣告，在同一個 user + session 的範圍裡，我只承認第一筆 `booking_started` 是漏斗入口。**

這個判斷本身，比 `row_number` 三個字更重要。

### 什麼時候 `row_number` 特別有用

- 去重，保留第一筆或最後一筆事件
- 找每個 user 的首次價值行為
- 找每個 session 的入口頁、出口頁
- 將一串事件整理成 one-row-per-user 或 one-row-per-session 的分析表

### 最容易犯的錯

不是 SQL 打錯，而是 `partition by` 切錯。

你如果本來該用 `user_id, search_session_id`，卻只用 `user_id`，很可能把兩次不同搜尋旅程硬折成一條。這種錯最討厭，因為 query 會順利跑完，數字看起來也像真的，只是結論悄悄歪掉。

## `lag` / `lead`：讓你開始看見「前一步」和「下一步」

如果說 `row_number` 幫你選出「哪一筆算數」，那 `lag` 和 `lead` 就是在幫你回答：「它前後發生了什麼？」

這個能力一打開，PM 的 SQL 會突然從查表，變成讀旅程。

舉一個很常見的例子。你發現 `start_booking_rate` 在某次改版後掉了，但單看總體 funnel 看不出原因。這時你很可能想知道：

- 使用者在 `view_listing` 之後，下一個事件是什麼
- 從 `view_listing` 到 `booking_started` 中間平均隔多久
- 掉下去的人，是停在房源頁、返回搜尋頁，還是碰到付款錯誤

這時候 `lag` / `lead` 很有用。

```sql
select
  user_id,
  event_time,
  event_name,
  lag(event_name) over (
    partition by user_id
    order by event_time
  ) as prev_event,
  lead(event_name) over (
    partition by user_id
    order by event_time
  ) as next_event
from events
where event_date >= current_date - interval '7 day';
```

這類查詢不一定直接給你答案，但它能讓你看見**事件之間的關係**。

再往前一步，你可以用 `lag(event_time)` 去算兩個事件之間的時間差，找出：

- 哪些使用者在 30 秒內快速完成下一步
- 哪些人在某一步停了很久
- 哪些 session 其實已經斷掉，只是你還把它當同一次旅程

## Session 化不是自然事實，而是一種建模選擇

這裡有一個 PM 很值得早點建立的觀念：

**session 不是宇宙裡本來就存在的東西，而是你們為了分析方便，對一串事件切出的邊界。**

不同工具本來就可能切得不一樣。

GA4 把 session 定義成一段使用者互動時間，預設在 30 分鐘無活動後逾時；PostHog 也把 session 視為同一位使用者在同一瀏覽器 / 裝置上的一組事件，預設 30 分鐘無活動或最長 24 小時就切新 session。這些都不是自然定律，而是產品分析上的約定。 

這件事很重要，因為很多 PM 會不小心把 session 當成既定真相，接著用它去做過度精準的判斷。

例如：

- 對一個會跨天做決策的高單價產品，30 分鐘 inactivity 不一定代表使用者離開這輪旅程
- 對內容型產品，session 很有用；但對低頻 B2B workflow，session 有時反而比 user-day 更沒意義
- 對搜尋產品，真正適合當分析單位的，可能是 `search_session`，不是網站 session

我通常會這樣想：

- **如果你關心的是單次互動體驗**，session 很有用
- **如果你關心的是某個任務完成過程**，你可能要自己定義 task session 或 search session
- **如果你關心的是長週期價值建立**，session 往往不是主角，cohort 和 retention 反而更重要

### 一個簡化的 session 化思路

最常見的做法，是以「與前一事件的時間差是否超過某個門檻」來切 session。

```sql
with ordered_events as (
  select
    user_id,
    event_time,
    event_name,
    lag(event_time) over (
      partition by user_id
      order by event_time
    ) as prev_event_time
  from events
), session_flags as (
  select
    *,
    case
      when prev_event_time is null then 1
      when event_time - prev_event_time > interval '30 minutes' then 1
      else 0
    end as is_new_session
  from ordered_events
), sessionized as (
  select
    *,
    sum(is_new_session) over (
      partition by user_id
      order by event_time
      rows between unbounded preceding and current row
    ) as session_seq
  from session_flags
)
select *
from sessionized;
```

這段 SQL 看起來像在做技術操作，但它真正表達的是一個產品判斷：

> 如果使用者超過 30 分鐘沒有互動，我們就把下一個事件視為新的使用脈絡。

這句話成立不成立，取決於你的產品，不取決於 SQL。

## Funnel SQL：真正難的不是語法，是口徑

到了 funnel SQL，很多人會以為重點是把多個 step 串起來。其實這只是最表面的部分。

真正困難的是，你必須把漏斗的口徑定得夠清楚。至少要回答下面這幾題：

### 1. 分母是誰

你的 funnel 是 user-based、session-based，還是 task-based？

以訂房產品為例：

- 如果你問的是「有多少使用者最後成功付款」，user-based 很合理
- 如果你問的是「一次搜尋旅程的轉換效率」，你更可能要用 search session 當單位
- 如果你問的是「每次開始訂房後的付款成功率」，那分母可能應該是 booking attempt

這三種分母都可能合理，但答案會完全不同。

### 2. 順序怎麼算

Mixpanel 在 funnel 文件裡把 conversion window、re-entry、ordering 都講得很清楚。這提醒我們一件事：**漏斗從來不是只有 step list，還包含步驟之間的規則。**

同一個使用者如果出現 `A -> A -> B -> C`，你到底要：

- 把第一個 `A` 當入口
- 把最近的 `A` 當入口
- 允許 re-entry
- 還是只看第一輪

這不是技術細節，是口徑。

### 3. 轉換時間窗多長

如果 `view_listing -> booking_started -> payment_success` 允許 7 天內都算成功，和只允許 30 分鐘內算成功，代表的是完全不同的產品故事。

時間窗太長，漏斗會看起來比較好看，但可能把不同使用情境混成一鍋。時間窗太短，則可能把真實存在的轉換低估掉。

### 4. 哪些事件要排除

你要不要排掉：

- internal traffic
- 測試帳號
- 重複付款重試
- bot 流量
- 系統自動重送事件

少掉這一步，很多 funnel SQL 看起來很精密，但其實只是把雜訊算得更漂亮。

## 一個 PM 真正需要的 funnel SQL 心法

我很少要求 PM 一開始就把完整漏斗 SQL 寫得跟分析工程師一樣漂亮。比較重要的是，你要先建立下面這個順序：

1. 先定漏斗單位，是 user、session，還是 task
2. 再定每一步的事件定義與順序
3. 再定 conversion window
4. 再定 re-entry 與去重規則
5. 最後才把 SQL 寫出來

順序不要反過來。

很多人是先寫出 query，再回頭替 query 找理由。這通常就是口徑失控的開始。

## 什麼時候不要急著上 session 化或 funnel SQL

不是每個問題都值得直接上這套。

### 情境一：你只是在核對大盤

如果你只是想知道昨天的 `payment_success_rate` 有沒有異常，簡單聚合可能就夠了。這時直接把 session 化和 funnel query 全部搬出來，只會讓你花更多時間維護更脆弱的 SQL。

### 情境二：你的事件定義還沒穩

如果 `view_listing` 和 `booking_started` 的口徑都還在飄，現在就寫很完整的 funnel SQL，等於在沙地上蓋房子。先回去修 tracking plan，通常更值得。

### 情境三：你的產品旅程本來就不是 session-based

像某些 enterprise workflow、採購流程、長週期轉換，session 邏輯本來就弱。這時候 cohort、stage transition、account-level progression 可能比 session 更接近真實世界。

## 這些技巧最容易怎麼失敗

我自己最常看到的失敗，不是語法錯，而是判斷太快。

### 失敗一：把不同分析單位混在一起

第一步用 session，第二步用 user，最後又拿 order_id 做成功事件。SQL 也許能跑，但你已經在同一個漏斗裡偷換了三次分母。

### 失敗二：把工具預設當成真理

30 分鐘 timeout、first-touch re-entry、7 天 conversion window，這些都只是工具或團隊預設，不一定適合你的產品。

### 失敗三：只會算，不會讀

有人可以寫出很長的 funnel query，卻說不清楚 drop-off 背後代表的是等待、猶豫、技術錯誤，還是被切錯 session。這就像拿到了很漂亮的顯微鏡，卻不知道自己在看細胞還是灰塵。

## PM 到底要學到什麼程度

如果你讀到這裡，可能會問：那 PM 是不是要把所有 window functions、session 邏輯和 funnel framework 全部吃透？

我覺得不用。

比較實際的門檻是這樣：

- 你知道 `row_number` 常拿來做什麼，並能自己寫出 first / last event 的查詢
- 你知道 `lag` / `lead` 可以看事件序列與時間差
- 你知道 session 是建模選擇，不是自然事實
- 你知道 funnel SQL 最重要的是口徑，不是語法表演
- 你知道什麼時候該自己先查，什麼時候該拉分析師一起把定義釘死

做到這裡，SQL 對你來說就不只是查數字的工具，而開始變成**拆旅程、驗判斷、抓口徑漏洞**的工作台。

而這也正是下一篇要接的地方。

因為當你已經能看 session 與序列，下一個更難的問題就會出現：

> 不是所有人都會用同樣的方式留下來。平均值看起來沒問題，不代表產品真的沒問題。

下一篇我們來講 retention、cohort 和 segmentation，為什麼 PM 一旦只看平均值，幾乎一定會被帶偏。
