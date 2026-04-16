---
title: "PM 產品數據與實驗 04 － SQL for PM：先學會打撈證據，再談數據驅動"
description: "很多 PM 說自己想變得更 data-driven，第一反應都是去要更多 dashboard。"
categories: ["pm"]
tags: []
date: 2026-04-05T16:03:00
series: "PM 產品數據與實驗"
seriesOrder: 4
---

很多 PM 說自己想變得更 data-driven，第一反應都是去要更多 dashboard。

這個反應很合理，但也很危險。

合理，是因為 dashboard 確實能讓團隊更快對齊現況。  
危險，是因為它很容易讓人誤以為「看得到圖」就等於「有能力判斷」。

事實通常不是這樣。

Dashboard 很擅長回答已經被預先定義好的問題。  
例如本週轉換率多少、哪個渠道流量比較高、留存是否比上月差。  
但當你真的進到 PM 的工作現場，麻煩通常都長得比較彎。

像是：

- 為什麼 iOS 新客的 `Booking Started` 掉得特別明顯
- 為什麼某國家搜尋量沒掉，`Inventory Match Rate` 卻忽然變差
- 為什麼實驗總體看起來沒差，但新用戶似乎變好了
- 為什麼付款成功數正常，取消率卻在兩天後爬上來

這些問題很少剛好都在現成 dashboard 裡等你點。

所以我對 PM 學 SQL 的理解，不是把自己變成分析師替代品，也不是學一堆語法來證明自己很硬。  
而是很務實的一句話：

**PM 要會的 SQL，不是為了炫技，而是為了自己先把證據打撈上來。**

你不需要一開始就會很深的 window function，也不用先理解 warehouse 建設史。  
但如果你連最基本的查法都不會，很多問題最後都會卡在「我感覺哪裡怪怪的」，卻拿不出能推進決策的東西。

## PM 為什麼不能只靠 dashboard

這裡不是在貶低 dashboard。好的 dashboard 很重要。

問題是 dashboard 的本質，決定了它一定有盲點。

它通常是為了固定節奏的觀察而設計的，例如每週營運 review、growth review、產品 health check。  
換句話說，它回答的是「我們本來就知道要看的東西」。

但 PM 工作常常不是這樣。  
你更常遇到的是：

- 某個改版後，只有特定平台和特定入口出了問題
- 某個漏斗看起來沒變，但其實分母換了
- 某個 feature adoption 看起來不錯，但只集中在高意圖用戶
- 某個指標掉了，你需要先排除資料問題，再談產品問題

這些都需要你自己去拉最靠近問題的資料，而不是等別人替你建好一張圖。

這也是你 roadmap 裡把 SQL 放在 tracking plan 後面的原因。前一篇把事件語義釘住，這一篇才開始談打撈證據的最低配。整條主線不是在教 PM 變成資料工程師，而是在建立「先有定義，再有查證能力」這套分析內功。

## PM 到底要會多少 SQL

我自己的答案很簡單：

**會到你能獨立回答 60% 到 70% 的產品分析日常問題，就夠了。**

這 60% 到 70% 通常不是什麼驚天動地的大模型任務，而是很實際的幾類事：

1. 看量體：DAU、WAU、下單數、啟動數、搜尋量  
2. 看轉換：某一步轉換率多少、哪裡 drop 最多  
3. 看分群：新舊用戶、平台、國家、渠道、方案別  
4. 看時間：昨天、上週、版本切換前後、活動檔期  
5. 看關聯：某個事件發生的人，後面有沒有更容易做另一個動作  
6. 做 sanity check：數字怪怪的，是產品壞了，還是資料壞了

資料科學課表裡 Day 4 只需要 `SELECT / WHERE / GROUP BY / JOIN`，再加上時間處理、去重、資料型別。這個範圍很樸素，但其實已經足夠撐起很多 PM 的第一輪判斷。

也就是說，PM 學 SQL 的第一個目標，不是變成 SQL wizard。  
而是先停止被動地等別人替你把問題翻譯成 query。

## 先不要背語法，先學會「查一個產品問題」的順序

很多人學 SQL 會卡住，不是因為語法真的太難，而是因為學法一開始就反了。

如果你一上來就在記：

- `INNER JOIN`
- `LEFT JOIN`
- `COUNT(DISTINCT ...)`
- `DATE_TRUNC`
- `CASE WHEN`

腦袋很快就會像抽屜裡塞滿沒有標籤的零件。  
你知道自己看過，但不知道什麼時候拿哪一個。

我更推薦從產品問題往回走。

例如你現在想問：

> 為什麼本週 `Start Booking Rate` 比上週低？

那查法的順序通常是：

1. 先決定分析粒度  
   你是要看 session、user、booking，還是 event？

2. 先決定分母分子  
   是 `Booking Started / Listing Viewed`，還是 `Booking Started / Search Performed`？

3. 確認需要哪些表  
   event table？users table？orders table？experiment assignment table？

4. 先拉出最小可用資料集  
   不要一開始就 join 五張表。先把核心事件拉出來。

5. 再做 breakdown  
   平台、渠道、國家、新舊用戶、版本。

這樣你寫 SQL 時，語法不是背誦題，而比較像在把思路翻譯成資料操作。

## PM 最先該熟的是哪幾種 SQL 動作

如果要我壓成最低配，我會把 04 這篇收在五件事。

### 1. 用 `SELECT` + `WHERE` 先把資料範圍圈出來

這是所有事情的起點。

PostgreSQL 的 `SELECT` 文件把查詢步驟講得很清楚。先從 `FROM` 取資料，再用 `WHERE` 篩掉不符合條件的列，接著才做 `GROUP BY`、輸出欄位、`DISTINCT` 等處理。BigQuery 的 query syntax 也同樣把 query statement 定義成對一個或多個 table / expression 做掃描並回傳結果。

這對 PM 很重要，因為很多查詢出錯，根本不是後面的統計出錯，而是第一步的範圍就圈歪了。

例如你查本週搜尋量，如果 `WHERE event_name = 'Search Performed'` 沒加，後面再漂亮都只是錯得很整齊。

### 2. 用 `GROUP BY` 理解分佈，不只看總量

只看總量是最容易自我催眠的方式。

`GROUP BY` 的價值，是讓你看到差異到底躲在哪裡。  
PostgreSQL 也直接把它寫在 `SELECT` 流程裡。如果有 `GROUP BY` 或 aggregate function，輸出會先被組成 row groups，再計算聚合結果。

例如你查 `Booking Started` 掉了 8%，下一步通常不是喊 panic，而是先分平台看：

```sql
SELECT
  platform,
  COUNT(*) AS booking_started
FROM events
WHERE event_name = 'Booking Started'
  AND event_date BETWEEN '2026-04-01' AND '2026-04-07'
GROUP BY platform
ORDER BY booking_started DESC;
```

這類 query 很普通，但它常常是第一個把問題從「感覺怪」拉到「iOS 掉、Android 沒掉」的動作。

### 3. 用 `JOIN` 把事件接回上下文

很多產品問題不是單表就能看懂的。

PostgreSQL 對 join 的定義很直白。join query 會把一張表的 row 跟另一張表配對，條件由 expression 指定。對 PM 來說，這個能力的意義不是資料庫理論，而是你終於能把「發生了什麼」接回「這是誰、在哪裡、後來怎樣了」。

例如：

- event table 接 users table，看新舊用戶差異
- search event 接 listings table，看供給品質
- booking event 接 payments table，看付款錯誤
- assignment table 接 conversion event，看實驗效果

沒有 join，很多分析都只能停在「某事件有多少」。  
有了 join，問題才開始有上下文。

當然，join 也是 PM 最容易踩雷的地方之一。  
一個 key 接錯，數字就會膨脹得像吹風過頭的氣球。

所以我會建議 PM 每次 join 前都先問兩句：

- 我現在這張表的 grain 是什麼？
- 這個 join 會不會把一對多關係放大成重複計數？

這兩句問完，至少能少掉一半的災難。

### 4. 會去重，不要把 row 當 entity

很多 PM 第一次寫 query，最常犯的錯就是把 row 數直接當成 user 數、session 數，或 booking 數。

但資料表裡的一列，不一定等於一個你真正想數的東西。

PostgreSQL 的 `SELECT` 文件也特別把 `SELECT DISTINCT` 寫出來，因為 duplicate rows 本來就是查詢裡常見的狀況。

例如你想看每週有多少成功搜尋用戶，通常該數的是 `COUNT(DISTINCT user_id)`，不是 event rows。

```sql
SELECT
  DATE_TRUNC('week', event_time) AS week_start,
  COUNT(DISTINCT user_id) AS unique_search_users
FROM events
WHERE event_name = 'Search Performed'
GROUP BY 1
ORDER BY 1;
```

這裡真正重要的不是 `DISTINCT` 這個單字，而是你心裡有沒有一直記得：

> 我現在要數的是 event、session、user，還是 order？

沒有這個意識，SQL 再熟都可能把你帶去很錯的地方。

### 5. 會處理時間，不然趨勢很容易看歪

時間處理是另一個 PM 很容易低估的坑。

BigQuery 把 `DATE_TRUNC`、`TIMESTAMP_TRUNC`、`EXTRACT` 這些時間函數都列得很清楚；PostgreSQL 也同樣提供 `date_trunc` 等日期時間函數。這些能力看起來像小事，但你只要做過週報、活動檔期分析、版本前後比較，就知道它根本不是配角。

最常見的時間坑有三種：

- UTC 跟本地時區混在一起
- calendar day 跟 rolling 24 hours 混在一起
- event 發生時間跟資料落地時間混在一起

你如果不先處理這些，很多趨勢圖都會長得像在講故事，而不是在講證據。

## PM 最值得先練的 6 種 query 題型

如果你現在正在學，我不會建議你先從很難的語法進去。  
先把下面 6 種題型練熟，實戰價值通常最高。

### 題型 1：量體趨勢
- 每日搜尋 sessions
- 每週成功訂房數
- 每月活躍用戶數

### 題型 2：分群比較
- iOS vs Android 的 `Booking Started`
- 新客 vs 舊客的 `Payment Success Rate`
- 國家別 `Inventory Match Rate`

### 題型 3：漏斗轉換
- `Search Performed → Listing Viewed`
- `Listing Viewed → Booking Started`
- `Booking Started → Payment Succeeded`

### 題型 4：功能 adoption
- 看過新功能的人有多少
- 啟用價格提醒的人，之後的回訪率是否更高

### 題型 5：版本或檔期前後比較
- 改版前後的付款成功率
- 活動週與平常週的搜尋結果品質

### 題型 6：資料 sanity check
- 某個 event 昨天是不是突然少一半
- 某個 platform 的 property 是否開始大量 null
- 某個 enum 是否出現新值

這 6 類幾乎已經夠你撐過很多 PM 日常。  
它們沒有很花，但很能打。

## 什麼是 PM 的 SQL 最低配，什麼不是

這裡也要故意畫邊界，免得大家一頭熱衝去背一整本語法書。

### 這篇故意先不深寫的
- window functions 深水區
- 查詢效能調校
- warehouse 架構與分區策略
- 高等統計與因果推論

不是因為這些不重要，而是因為**它們不是 PM 開始建立查證能力的第一步**。

你先把下面幾件事站穩，價值通常更大：

- 知道 grain
- 知道分母分子
- 知道何時要 join
- 知道何時要 distinct
- 知道時間窗怎麼切
- 知道 query 拉出來之後要先做 sanity check

很多人會寫很難的 SQL，卻還是會在 user、session、order 之間切錯分母。  
那種感覺就像會甩花刀，結果切洋蔥還是切到手。

## SQL 最常見的幾個 PM 失誤

這段我想補幾個很實務的 failure modes。

### 1. 沒先定 grain 就開始寫

這是最大宗。  
你到底在看 user、session、event 還是 booking？  
這個沒定，後面幾乎不可能穩。

### 2. `LEFT JOIN` 寫了就安心，沒檢查重複列

很多人以為 `LEFT JOIN` 比較安全。  
其實如果右表一對多，你還是會把數字灌大。

### 3. 把 event time 當成 business time

像付款成功可能是 event time，但取消或退款可能延後很多。  
如果你不把觀察窗講清楚，很容易拿當下轉換去跟事後成本硬比。

### 4. 查出數字就直接講故事

這是 PM 很常見的誘惑。  
看到一個 breakdown 就立刻下結論，沒有先檢查樣本量、資料品質、分群定義。

### 5. 不做 sanity check

我自己每次寫完 query，至少都會先問：

- 總量有沒有離譜
- 跟 dashboard 大方向一致嗎
- null 比例怪不怪
- 分群加總是否合理
- 跟前一週相比是不是跳太大

這幾步很土，但能救命。

## 我會怎麼建議 PM 練 SQL

如果你是 PM，不是要轉職 analytics engineer，我會這樣練：

1. 永遠用同一個案例產品  
   例如訂房 app。不要今天電商、明天 SaaS、後天遊戲。

2. 每次只查一個問題  
   例如「哪個平台的 `Start Booking Rate` 掉最多」，不要一次想解整個世界。

3. 每一題都先寫 plain language  
   先用自然語言寫出分母、分子、時間窗、分群，再開始寫 SQL。

4. 查完一定寫一句結論  
   不是只有 query 跑完，而是要寫：
   - 我看到什麼
   - 我還不確定什麼
   - 下一步要查什麼

這樣你學到的就不是語法，而是分析節奏。

這也是我認為 PM 真正該從 SQL 拿到的東西。  
不是「我也會寫 query」這種身份認同。  
而是當產品出了問題時，你不再只能站在儀表板前猜，而能先下去把證據撈上來。

下一篇我們才會進更進階的 SQL，包括 window function、session 化與 funnel query。  
因為到了那一篇，SQL 才會從「查數字」真的升級成「看旅程」。
