---
title: "PM 產品數據與實驗 07 － A/B Test 不只是假設與 p-value：PM 必懂的 exposure、SRM、guardrails 與 validity"
description: "你以為自己在比較 treatment 和 control，實際上比較的可能是兩群根本不對等的人。  
你以為使用者看到了新體驗，實際上很多人只是被分流到了 variant，卻沒有真的被影響。  
你以為主指標升了，結果退款、投訴、延遲、 crash 或某個關鍵下游行為一起壞掉。"
categories: ["pm"]
tags: []
date: 2026-04-05T16:06:00
series: "PM 產品數據與實驗"
seriesOrder: 7
---

很多實驗最後不是輸在想法太爛，而是輸在一件更尷尬的事。

你以為自己在比較 treatment 和 control，實際上比較的可能是兩群根本不對等的人。  
你以為使用者看到了新體驗，實際上很多人只是被分流到了 variant，卻沒有真的被影響。  
你以為主指標升了，結果退款、投訴、延遲、 crash 或某個關鍵下游行為一起壞掉。

這時候你如果只盯著 p-value 看，通常很容易走到一個危險結論：

> 實驗看起來有結果，所以可以上線。

問題是，**看起來有結果**，跟**這個結果值得相信**，中間還隔了很大一段路。

我自己會把這件事想成一個很務實的三層檢查。這不是教科書定義，比較像 PM 在產品現場做 ship / iterate / rerun 決策時的工作判準：

1. **誰真的被影響了？**  
   也就是 hypothesis、primary metric、exposure rule 有沒有定清楚。

2. **資料本身能不能信？**  
   也就是 SRM、logging、contamination、spillover 這些 validity 問題有沒有先排乾淨。

3. **就算統計上有動，商業上值不值得？**  
   也就是 effect size、guardrails、成本、風險和 rollout 條件有沒有一起看。

很多團隊把第三層當成主角，第一層和第二層卻寫得很鬆。結果不是把壞東西上線，就是把好東西錯殺。這篇就是想把這段骨架講清楚。

## 實驗設計不是先想 variant，而是先把「什麼叫成功」釘死

一個像樣的實驗設計，最少要能回答四件事：

- 我們改了什麼
- 我們預期哪個指標怎麼變
- 哪些副作用不能接受
- 誰才算真的看到了這個改動

前兩題大家通常比較熟，後兩題很容易被寫得很敷衍。

例如你想測訂房流程裡的新 paywall 文案。  
很多人會寫成：

- hypothesis：新版文案會提升付費轉換
- primary metric：payment success rate

看起來沒問題，但其實還不夠。

你還是得補：

- guardrails：refund rate、support ticket rate、payment error rate 有沒有惡化
- exposure rule：到底是「被分到 paywall variant 的人」算 exposed，還是「真的看到 paywall 的人」才算 exposed

這裡差很多。

如果使用者被分到 treatment，但因為某個條件根本沒看到 paywall，或在 paywall 出現前就離開，那他 technically 被分流了，卻不一定真的被改動影響。把這些人全塞進分母，結果通常會被稀釋，甚至會把效應方向看錯。

所以我會把實驗設計的第一步寫得很白話：

> 你不是在測某個點子，而是在測「某個改動對某群真正被影響的人，有沒有帶來值得接受的變化」。

這句話看起來囉唆，實際上很救命。

## Primary metric 要少，guardrails 要硬

Statsig 的文件一直在提醒 primary metrics 不要塞太多，通常維持 1 到 3 個比較合理；guardrails 和 explanatory metrics 則放在 secondary。這個做法很務實，因為一個實驗如果主要成功條件寫得太多，最後通常只會讓解讀變得含糊。相反地，guardrails 的角色不是幫你湊熱鬧，而是明確定義「什麼叫這個勝利不能算」。 

以訂房產品來說，如果你測的是 `booking_started` 或 `payment_success_rate`，常見的 guardrails 可以是：

- `refund_rate`
- `cancellation_rate`
- `support_ticket_rate`
- `payment_error_rate`
- 甚至 app crash、頁面延遲、客服對話量

這些指標不一定每次都會動，但你最好先寫進去。因為很多假勝利，本質上是把成本搬去別的地方。

### 一個我很常用的寫法

- **Primary metric**：你這次最終要用來拍板的那個指標
- **Guardrails**：這個改動不可以傷到的健康指標
- **Readout metrics**：幫你理解機制的中間指標，但不拿來單獨宣告贏

這樣分，實驗報告通常會乾淨很多。

## Exposure rule 不是技術備註，而是實驗分母的法律

很多 PM 知道要設分流，但沒有真的把 exposure rule 當成核心問題。

這其實很危險，因為**assignment 不等於 exposure**。

Statsig、GrowthBook 這幾年在文件裡都很強調 exposure logging 的重要性。Statsig 直接把 exposure events 當成實驗分析和健康檢查的最低資料之一；GrowthBook 也明講 tracking callback 的用途，就是把「某個 user 看到了哪個 variant」這件事確實送回資料系統。沒有這層，後面很多 lift 都只是裝飾。 

一個常見例子是頁面載入時就先 assign variant，但真正的 treatment 只有在使用者按下某個按鈕、打開某個 modal，或走到某段流程後才會發生。

這時候如果你用所有 assigned users 當分母，問題會有兩種：

1. 你把很多根本沒機會受到 treatment 影響的人算進來，訊號被沖淡  
2. control 和 treatment 在「真正看到改動的人」上的組成可能不一樣，解讀開始偏掉

所以 exposure rule 最好回答三件事：

- **觸發點在哪裡**：什麼時刻才算真正 exposed
- **分析單位是誰**：user、device、session 還是 account
- **重複曝光怎麼算**：第一次、每次、還是只算 qualify 後的曝光

這裡不是越細越好，而是越清楚越好。

## SRM 不是小 warning，它通常是在說「先別信」

如果要挑一個最值得 PM 早點養成反射動作的實驗健康檢查，我會選 SRM，sample ratio mismatch。

Microsoft 的實驗平台文章把話講得很直：**有 SRM 的 A/B test，先不要相信結果，先找 root cause。** 他們甚至提到內部分析裡，大約 6% 的 A/B tests 會出現 SRM。Statsig 也把 SRM 當成 health check 的核心項目之一，用卡方檢查去看 exposure mix 是否偏離預期。 

SRM 的意思不是「流量沒有剛好 50/50 所以看起來不漂亮」，而是：

> 實際進入分析的樣本分布，跟你原本配置的分流方式不一致，而且偏差大到不像隨機波動。

它真正可怕的地方在這裡：

**缺的通常不是隨機掉的一些人，而是某種特定的人。**  
也就是說，你的 treatment 和 control 可能已經不是可比的兩群。

常見原因很多，像是：

- 某個 variant 的 exposure logging 漏掉
- 某個瀏覽器或裝置只在其中一邊被正確記錄
- redirect、load time、crash 讓其中一邊更容易中途消失
- data join 或 segmentation 條件把其中一邊過濾得比較多
- 使用者能自我選擇進某個 variant
- ramping 本來就不均勻，卻忘了在分析時處理

這些問題的共通點是，它們都不是靠看最終 uplift 才發現，而是靠早期健康檢查先抓出來。

### 我的工作判準很簡單

- **有 persistent SRM，就不要做 ship 決策**
- 先查 assignment、exposure logging、join、segment filter
- 找到原因前，這個結果最多只能當線索，不能當結論

這會讓你少踩很多坑。

## Contamination 和 spillover：不是每個實驗都真的是乾淨隔離的

就算沒有 SRM，也不代表實驗一定有效。

另一類常被低估的問題，是 contamination 和 spillover。簡單講就是：你以為 control 跟 treatment 是兩個隔開的世界，實際上它們彼此會漏。

最典型的幾種情況：

- 同一個人跨裝置、跨瀏覽器進來，身份沒有正確連起來
- treatment 使用者創造的內容或庫存，反過來被 control 使用者看到
- 社群、邀請制、marketplace 類產品，一邊的改動直接改變另一邊的環境
- 搜尋 / ranking / recommendation 系統裡，一部分實驗流量改變了共享池子的排序或供給
- 同一個帳號底下多人共用，分流單位卻切在 device 或 browser

這時候你就算看到了統計顯著，也不一定能把效果乾淨地歸因給 variant 本身。

所以我通常會先問一個很實際的問題：

> 這個改動會不會只影響被分流的那個單位，還是會改變一個更大的共享環境？

如果答案是後者，那就要小心。  
有些情況你還是可以做實驗，但需要換 randomisation unit、改 exposure 定義，或至少在 readout 裡老實寫出限制。

## 統計顯著不等於值得上線，商業顯著也不該拿來掩蓋 validity 問題

很多團隊對「統計顯著 vs 商業顯著」這句話很熟，但真的用起來，常常只剩一半。

比較健康的順序應該是：

1. **先確定 validity 沒壞**
2. **再看統計上有沒有可信訊號**
3. **最後看商業上值不值得做**

順序不能顛倒。

如果實驗有 SRM、曝光定義不清、資料 join 有問題，那你不能說「雖然資料怪怪的，但 uplift 很大所以先上」。那種大 uplift 有時候剛好就是偏誤放大的結果。

反過來說，就算統計顯著成立，也不等於值得 rollout。

例如：

- conversion 提升 0.2%，但工程成本很高
- revenue 有動，但客服成本和退款一起上升
- 中間指標很好看，但長期留存沒有改善
- 對核心市場有利，對高價值 segment 卻是負面

這時候你真正要問的不是「有沒有顯著」，而是：

- 效果大小有沒有實際價值
- guardrails 有沒有變差
- 這個效果是不是穩定出現在關鍵 segment
- rollout 後的營運成本、風險、技術債值不值得

## PM 最後要做的不是讀 p-value，而是做決策

我比較喜歡把實驗 readout 收斂成四種動作，而不是只寫一個 winner 標籤。

### 1. Ship

適合這種情況：

- primary metric 改善
- guardrails 穩定
- exposure / SRM / logging 沒有紅旗
- 效果大小值得 rollout
- 關鍵 segment 沒有明顯負面

### 2. Iterate

適合這種情況：

- 方向看起來有潛力
- 中間機制指標有動
- 但主指標還不夠穩，或效果大小偏小
- validity 沒壞，只是版本還不夠成熟

### 3. Rerun

適合這種情況：

- SRM
- exposure rule 寫錯或漏記
- metric join 出問題
- contamination 太重
- 觀察窗切得不合理

這種時候最重要的不是硬解讀，而是承認這次結果不能拿來拍板。

### 4. Kill

適合這種情況：

- guardrails 明顯變差
- 商業風險大於收益
- 關鍵高價值族群受損
- 即使有效，也不是你想要的成長方式

這四個動作聽起來普通，但真的能把實驗制度化，靠的通常不是更複雜的統計，而是把這四種出口寫清楚。

## 什麼時候不要把一切都丟給 A/B test

雖然這篇是在講實驗 validity，但也不是所有改動都該用同一種 A/B test 邏輯處理。

像這些情況，我通常就不會假裝它只是標準網頁按鈕測試：

- 高風險基礎設施切換
- 共享市場或共享供給很強的產品
- 牽涉明顯網路效應的功能
- 樣本很小，卻想測低頻結果指標
- 影響太廣，難以乾淨隔離 control 與 treatment

這時候更合理的做法，可能是 staged rollout、guarded rollout、holdout、前後對照加上更嚴格監控，或先用 fake door、定性研究、smaller-scope experiment 驗方向。

A/B test 不是萬能尺。  
它厲害的前提，是你真的守住了比較的基本條件。

## 結尾：先問資料能不能信，再問點子有沒有贏

如果要把這篇濃縮成一句話，我會寫成這樣：

> 一個實驗值不值得相信，不是先看 p-value，而是先看 exposed 的人對不對、資料有沒有偏掉、再看這個效果值不值得上線。

這也是為什麼我會覺得 PM 需要懂 exposure、SRM、guardrails 和 validity。不是因為 PM 要變成統計學家，而是因為 PM 最後要對 ship / no-ship 負責。

下一篇我會把這件事再往真實世界推一步。

因為很多時候，資料根本不是壞在 SQL。真正讓指標突然跳、漏斗突然斷、實驗看起來怪怪的，往往是 identity、late events、bot traffic，或 rollout 本身出了事。
