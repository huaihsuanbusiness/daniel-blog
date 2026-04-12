---
title: "PM 產品數據與實驗 08 － 資料不是壞在 SQL：PM 真正常遇到的是 identity、late events、bot traffic 與 rollout 失敗"
description: "- query 寫錯了嗎
- dashboard 壞了嗎
- 那個 SQL 是不是 join 爆掉了"
categories: ["pm"]
tags: []
date: 2026-04-05T16:07:00
series: "PM 產品數據與實驗"
seriesOrder: 8
---

很多 PM 一看到數字怪掉，第一反應會是：

- query 寫錯了嗎
- dashboard 壞了嗎
- 那個 SQL 是不是 join 爆掉了

這些當然有可能，但如果你真的做久一點產品數據和實驗，會慢慢發現另一件事。

**資料最常先壞掉的地方，通常不是 SQL。**

更常見的，是這些東西先出問題：

- anonymous user 跟 logged-in user 沒接好
- 同一個人跨裝置、跨瀏覽器被算成兩個人
- 事件晚到，昨天的漏斗今天又自己補了一截
- internal traffic、debug traffic、bot traffic 混進來
- rollout 還沒穩，指標就先被放到 production 現場翻攪
- session 的定義跟產品任務根本不對盤

這也是為什麼很多看起來像「分析問題」的怪數字，最後查到根源時，其實是在 identity、event time、traffic quality 或 release control 這些層。

如果要給 PM 一個比較不容易亂掉的 debug 順序，我會用這個版本。這不是標準教條，比較像我自己會先走的排查層次：

1. **Identity layer**：是不是同一個人被拆開、或不同人被合在一起  
2. **Time layer**：事件是按 event time 還是 processing time 算？有沒有 late events  
3. **Traffic layer**：有沒有 internal / developer / bot / spam traffic 混進來  
4. **Release layer**：最近有沒有 progressive rollout、feature flag、版本切換、kill switch 介入  
5. **Query layer**：最後才回來查 SQL、join、table definition

這個順序不是因為 SQL 不重要，而是因為**很多最痛的數據問題，SQL 只是最後把傷口照出來，不是傷口本身。**

## 第一層先查 identity：到底是同一個人，還是你以為是同一個人

identity 問題最麻煩的地方，在於它很容易讓指標看起來「差一點點」，但那個差一點點會一路傳染。

Amplitude、Segment、PostHog 的官方文件都把 identity resolution 講得很清楚：如果 anonymous ID、device ID、user ID 沒有正確串起來，同一個使用者可能會在不同 session、裝置、平台上被拆成不同人；反過來，如果 distinct ID 亂掉，甚至會把不同人合成一個人。 

這會直接影響：

- DAU / WAU / MAU
- 漏斗每一步的 user counts
- cohort retention
- A/B test 的 assignment 一致性
- 跨裝置旅程分析

### 最常見的幾種壞法

#### 1. 匿名到登入沒有接上

使用者先用匿名身分瀏覽，登入後才有 user ID。  
如果 identify / merge 流程沒接好，前半段行為和後半段行為就不會接起來。

結果通常是：

- activation 看起來偏低
- onboarding 漏斗中間像被刀切
- 登入前行為對後續留存或付費的關聯變弱

#### 2. 同一個人跨裝置被拆成兩個人

這在內容、電商、訂房、B2B 都很常見。  
使用者白天在手機看，晚上回桌機下單。如果 identity stitching 沒做好，前半段和後半段就是兩條旅程。

你會看到：

- search 看起來很多，booking 好像跟不上
- first-touch 和 conversion 像是不同人完成的
- 某些 acquisition source 表現奇怪地差

#### 3. 不同人被錯誤合併

PostHog 文件就直接提醒，如果 distinct ID 生成有 bug，甚至有人被識別成 `null`、`true` 這種 generic 值，不同人的資料可能被合成一個人。這種錯很毒，因為它不是少算，而是把行為關係整個扭曲掉。 

### PM 該先怎麼查

我通常會先看這幾件事：

- 同一批高意圖用戶是否出現不合理的 anonymous → identified 斷層
- 某些平台、瀏覽器、app version 的 identify rate 是否特別怪
- user-level 漏斗和 device-level 漏斗是否差距異常大
- 實驗的 assignment unit 和產品登入 / 合併邏輯是否一致

很多時候，這一步就能解開一半謎團。

## Session 不是自然定律，切錯 session 就像把旅程切爛

session 問題常常被當成分析細節，但它其實會直接改寫漏斗。

GA4、PostHog 這類工具都提供 session 相關定義，但那通常只是預設，不是產品真相。對一些產品來說，30 分鐘 inactivity 很合理；對另一些高考慮期任務，這個切法根本太粗暴。

例如訂房產品就很典型：

- 使用者今天中午看房源
- 晚上回來和家人討論後才開始訂
- 隔天補資料、完成付款

如果你把這整段旅程硬切成幾個 session，很多 user journey 看起來都會像中途放棄。

所以我會把 session 當成一種分析建模選擇，而不是天生存在的實體。  
真的要做決策時，常常更重要的是：

- website session
- search session
- booking task session
- user-day / user-week

哪個單位最能反映你在解的那個問題。

### 一個很實際的判斷

- 如果你在看單次體驗摩擦，session 很有用
- 如果你在看任務完成，task session 可能更合理
- 如果你在看長週期價值，cohort 和 retention 通常比 session 更重要

很多「漏斗突然斷掉」其實只是 session 定義不再對產品現況成立。

## 第二層查時間：late events 會讓昨天的數字今天長出新尾巴

如果你看過昨天的 dashboard 今天又自己改數字，你大概已經碰過 late events 了。

Google Cloud Dataflow 的文件把 late data 定義得很清楚：如果 watermark 已經走過某個 window 的結尾，這時才到的資料，對那個 window 來說就是 late data。這是資料流系統語言，但翻成 PM 能用的版本，其實就是：

> 事件發生的時間，和事件被你系統處理進來的時間，不一定是同一件事。

這件事一旦沒想清楚，很多數字都會怪。

### 常見情境

- 使用者離線後補送事件
- app 在弱網路下延遲上傳
- server-side pipeline 重跑
- queue 壅塞，晚一段時間才寫進 warehouse
- ETL / ELT job 因故延後完成

這些情況都會造成：

- 昨天的 DAU 今天變
- 昨天的 funnel 今天補高一截
- cohort 表反覆回填
- A/B test 某些 metrics 在不同日子看起來像兩個世界

### 這時候最重要的是把三件事分開

1. **event time**：事情真正發生的時間  
2. **ingestion / processing time**：資料被收進系統的時間  
3. **reporting cutoff**：你什麼時候把某一天視為可結算

很多團隊不是不懂 late events，而是沒有把 cutoff 講明。結果 daily dashboard 每天都像潮汐，大家看久了就開始對數據失去信任。

我自己的偏好是：

- daily monitoring 用暫時數字，但明講 freshness
- 正式週報或實驗 readout，用有 grace period 的 settled data
- 對高延遲事件，單獨標示 expected lag，不假裝是即時

## 第三層查 traffic quality：不是所有流量都該進你的產品判斷

bot traffic、internal traffic、developer traffic 這件事，大家都知道要排，但很多團隊排得很鬆。

GA4 官方說明裡有兩個很實用的點：

- GA4 會自動排除 known bots and spiders，但你看不到被排掉多少
- internal traffic 和 developer traffic 還是要自己定義 data filters 去處理 

這意味著一件事：**自動 bot 過濾不是萬靈丹。**

如果你只依賴工具內建排除，你還是可能看到：

- 某個國家或 referrer 突然暴衝
- landing page views 飆高但後續完全不動
- 某個 funnel 第一步異常膨脹
- 員工測試、QA、客服操作把真實使用者埋掉

PostHog 也有教你怎麼過濾 internal users。這類機制不是裝飾，而是分析基本功。因為只要 traffic quality 一髒，後面 conversion、retention、甚至實驗結果都會一起被拉歪。 

### 我會特別盯的訊號

- 某些 IP / country / referrer 的流量型態明顯不像真人
- pageview 或 search 暴增，但 view → start → pay 幾乎沒動
- internal cohorts 在重要儀表板裡沒有被排乾淨
- developer debug mode、staging app、測試帳號混進 production analytics
- 某些新版本或 QA 週期前後，事件量突然不合邏輯地膨脹

## 第四層查 rollout：很多指標異常，其實是 release control 沒守住

這一層是我覺得 PM 最容易低估的。

很多人把 rollout 當成工程細節，但如果你正在看產品指標、實驗結果、或 data incidents，release control 其實是第一線。

LaunchDarkly 的文件把 release flags、kill switch flags 講得很務實：release flags 用來逐步放量，kill switch 用來在緊急狀況下快速把功能關掉。Firebase Remote Config rollouts 也明講，rollout 過程要一邊看 Crashlytics、一邊看 Google Analytics，比對 rollout group 和 control group 的穩定度。 

這些做法背後的意思很一致：

> production 不是一個非黑即白的世界。你需要可以逐步放量、觀察、停損、回滾的控制層。

### Progressive rollout 為什麼重要

因為很多問題只有上 production 才會出現：

- 某些機型 crash
- 某個地區的 network path 特別慢
- 第三方服務在高流量下不穩
- 某個新流程把客服工單打爆
- 某些邊界條件只有真實用戶規模才會踩到

如果你直接 100% 開，等於把調查難度和風險一起放大。

比較穩的節奏通常是：

1. 先小流量 rollout
2. 看核心指標與 guardrails
3. 特別盯 crash、latency、support、payment errors 這種即時健康訊號
4. 沒事再逐步擴大
5. 有問題立刻 kill switch 或回退

### Rollout 不等於 A/B test

這點很重要。

- **A/B test** 比較像是在回答「哪個版本比較好」
- **rollout** 比較像是在回答「這個版本在 production 撐不撐得住」

兩者會互相支援，但不要混成同一件事。  
有些改動你需要先 experiment，再 rollout。  
有些高風險改動你就算沒做標準 A/B，也一定要 guarded rollout。

## 一個我會真的拿來用的 data debug playbook

如果某天你看到：

- 指標突然跳
- 漏斗突然斷
- retention 突然變形
- 實驗結果怪到不敢信

我會建議先照這個順序查。

### Step 1：看 release log

- 最近有沒有 feature flag 放量
- 有沒有 app release、SDK 升版、tracking code 改版
- 有沒有 kill switch / rollback
- 有沒有 ETL job 失敗或延遲

### Step 2：看 traffic 組成

- 哪些 country、device、referrer、platform 在動
- internal / developer / QA traffic 有沒有混進來
- 有沒有明顯 bot 或 spam pattern

### Step 3：看 identity

- identify / merge rate 有沒有掉
- anonymous 和 logged-in 事件比例有沒有異常
- user counts 和 device counts 差距是否突然拉大
- experiment assignment unit 和 identity logic 有沒有衝突

### Step 4：看時間

- event time 和 processing time 的 lag 有沒有拉長
- 這個 dashboard 是不是還在回填窗口裡
- 某些關鍵事件是不是晚到特別嚴重

### Step 5：最後才看 SQL

- join key 有沒有改
- filter 條件有沒有誤傷
- denominator 有沒有被換掉
- session / user / order 粒度有沒有混用

這套順序的好處是，它會逼你先查「資料生成與控制層」，而不是一開始就陷進 query 細節森林。

## Daily monitoring 和 weekly review 要怎麼接

資料監控如果只停在 dashboard，常常會變成每天盯曲線、每週還是沒結論。

我比較喜歡把它拆成兩種節奏。

### Daily monitoring 看什麼

- crash / payment error / support ticket 這種即時健康指標
- rollout group vs control 的差異
- event volume、identify rate、ingestion lag
- funnel 入口是否異常膨脹
- 有沒有 internal / spam 流量異常

這一層的重點是早發現，不是早下大結論。

### Weekly review 看什麼

- 已 settle 的核心指標
- cohort / segment 層級的變化
- 上週 rollout 或實驗到底要 ship、iterate、kill 還是 rerun
- 哪些 data issue 已確定是 instrumentation 問題，不該再用來吵產品好壞
- 哪些 guardrails 需要變成固定監控

daily 像雷達，weekly 像判案。  
兩個都要有，節奏才會穩。

## 結尾：怪數字先查 identity、time、traffic、release，再回來問 SQL

如果要把這篇收成一句話，我會寫：

> 當指標突然跳、漏斗突然斷、實驗突然怪，不要第一秒就怪 SQL。先查 identity、事件時間、流量品質和 rollout 控制層。

因為很多時候，SQL 只是最後一面鏡子。  
真正出錯的，是更上游的定義、資料管線、流量乾淨度，或 release 節奏。

這篇也算是把系列一的骨架收尾了。

前面幾篇講的是怎麼定指標、怎麼建 tracking、怎麼拉 SQL、怎麼做 cohort、怎麼守住 experiment validity。走到這裡，讀者應該已經有一套比較完整的數據與實驗骨架。接下來再往成長系列走，才不會把 tactics 當答案本身。
