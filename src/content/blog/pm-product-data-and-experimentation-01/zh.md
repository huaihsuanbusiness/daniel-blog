---
title: "PM 產品數據與實驗 01 － North Star 不夠：PM 怎麼用 HEART、guardrails 與 counter-metrics 定義對的成功"
description: "很多 PM 第一次開始碰產品指標時，都會先被灌輸一個很有力量的觀念：找出你的 North Star Metric，整個團隊就會開始對焦。"
categories: ["pm"]
tags: []
date: 2026-04-05T16:00:00
series: "PM 產品數據與實驗系列"
seriesOrder: 1
---

很多 PM 第一次開始碰產品指標時，都會先被灌輸一個很有力量的觀念：找出你的 North Star Metric，整個團隊就會開始對焦。

這句話不算錯。

問題是，很多團隊停在這裡就不往前了。

結果很常是這樣。數字真的上去了，但產品沒有變得比較好。甚至更糟，團隊還會以為自己正在變好，因為 dashboard 上那個最大顆的數字很漂亮。

這也是我想寫這篇的原因。North Star 很重要，但它只能回答「我們大致往哪裡走」，還不夠回答「我們是不是用對的方法在走」。

如果只盯一個北極星，團隊很容易走進三種假進步。

第一種是把短期刺激當成長期價值。第二種是把局部優化當成整體改善。第三種是把使用者還願不願意回來，誤判成使用者只是剛好被推著往前走。

所以這篇文章的主張很簡單。

**North Star 不是一個單點指標，而是一個成功指標系統的起點。**

我自己會把這套系統拆成四層：

1. **North Star**：你到底想放大的核心價值是什麼
2. **Input metrics**：有哪些可行動的輸入在驅動它
3. **HEART**：這些成長是否真的在改善使用者體驗
4. **Guardrails / counter-metrics**：你是不是為了拉高主指標，偷偷把別的東西弄壞了

North Star 負責對焦，HEART 負責校正，guardrails 負責保命。這三件事缺一個，產品都可能看起來在成長，實際上卻在偏航。

## North Star 先回答的，不是公司想看什麼，而是使用者在哪裡真的拿到價值

North Star 之所以有用，不是因為它神祕，也不是因為每家公司都該有一句很帥的口號式指標。它有用，是因為它試圖把三種語言接起來：客戶價值、產品行為、商業結果。

Amplitude 在 North Star playbook 裡特別強調，North Star 的角色就是把 customer value、product work 和 business outcomes 綁到同一條線上；Google 早期在 HEART 論文裡也講得很清楚，產品衡量不能只停在流量，而要回到能否反映 key goals 與 user-centered outcomes。

這裡最常見的誤會是，把「公司很在意」和「使用者有得到價值」直接畫上等號。

例如訂房產品把 `Weekly Successful Bookings` 當 North Star，方向通常是合理的。因為成功訂房通常代表使用者真的找到房、完成下單，也代表平台把供給和需求接起來了。這個指標同時碰到使用者價值和商業結果，算是很像樣的候選人。你的 roadmap 與案例筆記也正是沿用這個定義。 

但就算這個 North Star 本身合理，也不代表只看它就夠。

因為成功訂單可以靠很多方式長出來。有些方式是在創造價值，有些方式只是把摩擦往後移，或把成本藏到別的地方。

舉個很實際的例子。

假設你把付款頁做得更強硬，少了很多確認步驟，`Payment Success Rate` 上升了，`Weekly Successful Bookings` 也真的長了。團隊歡天喜地，覺得這波改版打中了。

但兩週後你發現：

- 取消率變高
- 客服單變多
- 退款率上升
- 負評開始出現「下單太急」「資訊不清楚」

那這次成長，到底算不算產品變好？

我不會算。

因為這更像是把 conversion 往前拉，然後把代價丟給售後、營運和使用者信任。

North Star 在這裡沒有失效。真正失效的是團隊把 North Star 當成唯一裁判。

## 真正有用的 North Star，通常有兩個條件

第一，它要**盡量貼近 realized value**，也就是使用者真的拿到價值，不是只做了一個看起來像在接近價值的動作。

第二，它要**能往下拆成幾個你真的動得了的 inputs**。Amplitude 建議會把 North Star 再接上少量、可直接影響的 inputs，而不是讓北極星孤零零地掛在天上。

所以在訂房產品裡，這樣拆通常比較合理：

| 層級 | 指標 | 代表的問題 |
|---|---|---|
| North Star | Weekly Successful Bookings | 本週到底有沒有成功創造完成的訂房價值 |
| 需求側輸入 | Qualified Visitors、Search Sessions | 有沒有足夠且夠準的需求進來 |
| 供給側輸入 | Active Properties、Inventory Match Rate | 使用者找不找得到適合的房源 |
| 漏斗輸入 | View Rate、Start Booking Rate、Payment Success Rate | 價值路徑中哪一步在漏 |

這一層還只是「行動地圖」。你知道該看哪裡，但還不知道這樣的成長是不是健康。

這就是 HEART 要進來的地方。

## HEART 不是第二個北極星，而是用來避免你把產品做成「數字很好看但體驗很怪」

Google 提出的 HEART framework，本質上是在提醒產品團隊：使用者體驗不能只被壓縮成單一商業數字。HEART 代表 Happiness、Engagement、Adoption、Retention、Task Success，搭配 Goals-Signals-Metrics 的過程，幫團隊把抽象的「產品有沒有變好」拆成比較可以操作的觀察方式。

這裡我特別想收掉一個常見誤會。

**HEART 不是叫你固定湊出五個數字，做成一張很滿的 dashboard。**

那樣通常只會把事情弄得更吵。

HEART 真正有用的地方，是它逼你問一句比較不舒服的話：

> 我們這次追的成長，對使用者來說，到底改善了哪一種體驗？

這一句很值錢。

因為很多團隊其實沒有回答過。

例如同樣是想提高訂房成功數，若用 HEART 去看，你會開始發現不同改法影響的是不同層面。

- **Happiness**：使用者是否覺得流程清楚、資訊可信、價格合理
- **Engagement**：使用者是否願意持續搜尋、收藏、比較
- **Adoption**：新功能像是價格提醒、地圖篩選、收藏清單，有沒有人真的開始用
- **Retention**：第一次訂過的人，下次還會不會回來找房
- **Task Success**：是否更快找到可訂、合適、可付款成功的房源

這時候你就會發現，單看 `Weekly Successful Bookings` 會把很多不同性質的改善揉在一起。

有些改動是讓人更快找到對的房。有些改動只是把人催進付款。有些改動則是讓人下單後後悔的速度變快。

在這三種情況下，North Star 可能都上升，但 HEART 看起來會完全不同。

所以我更喜歡把 HEART 當成**體驗壓力測試**，而不是 KPI 補充包。

它不是來取代 North Star。它是來問你，這個成長是不是站得住腳。

## Guardrails 跟 counter-metrics 是產品團隊最常偷懶，但也最容易救命的一層

這一層很多團隊都知道名詞，真的做時卻常常虛晃一招。

最典型的寫法長這樣：

- Primary metric：訂房成功率
- Guardrail metrics：留存、客服、退款、崩潰率

看起來很完整，但其實只是列了一串名詞。真正麻煩的地方根本沒處理。

Guardrail metrics 的價值，不在於你有沒有列出來，而在於它們能不能在決策時真的擋住你。Mixpanel 把 guardrail metrics 定義成在實驗時同步觀察的次要指標，用來偵測主要指標上升時是否對其他產品面向造成 unintended impact；Microsoft 則提醒，一個好的 metric 系統要能拆解、診斷，特別是 performance、reliability 這類 guardrail，不能只等總體數字掉了才發現。

我自己會這樣分：

- **Primary metric**：這次改動最想推動什麼
- **Guardrail metrics**：這次改動不能破壞什麼
- **Counter-metrics**：如果 primary metric 上升，最可能一起變差的是什麼

很多公司其實把 guardrails 和 counter-metrics 混著用，實務上也沒問題。重點不是名詞，而是你有沒有把「代價」放進成功定義裡。

還是拿訂房產品來看。假設這次目標是提高 `Start Booking Rate`，那我會很自然地一起盯：

| 角色 | 指標 | 為什麼要看 |
|---|---|---|
| Primary | Start Booking Rate | 使用者是否更願意開始下單 |
| Guardrail | Payment Error Rate | 不能因為流程改動導致支付錯誤上升 |
| Guardrail | Support Ticket Rate | 不能把理解成本轉嫁給客服 |
| Counter-metric | Cancellation Rate | 不能用倉促決策換來後續取消 |
| Counter-metric | Refund Rate | 不能讓表面訂單成長變成售後成本 |

這裡有個很重要的判斷。

**Guardrail 不是「看到變差再討論」，而是「先定義多差算不能接受」。**

不然最後很容易變成會議室裡最熟悉的畫面：主指標升 6%，護欄壞 3%，大家開始用不同的口氣替自己喜歡的結果辯護。

那不是數據驅動。那只是換成用圖表吵架。

## 真的能拿來用的做法，是把成功寫成一個「四層成功堆疊」

如果你現在剛開始替產品建立指標系統，我會建議不要從「我要列出哪些 KPI」開始，而是用下面這種方式寫。

### 1. 先寫 North Star statement

不是只有一個數字，還要寫一句話把它綁回使用者價值。

> 我們用 `Weekly Successful Bookings` 作為 North Star，因為它最接近使用者成功找到合適住宿並完成交易的實現價值，也能連到平台的供需媒合與收入結果。

### 2. 再寫 3 到 5 個 inputs

這一步是為了讓團隊知道「改哪裡比較有機會動到北極星」。

例如：

- Qualified Visitors
- Inventory Match Rate
- View Rate
- Start Booking Rate
- Payment Success Rate

### 3. 用 HEART 問體驗是否真的變好

不要五項全上。挑這次最 relevant 的。

如果你這一季在解 activation 與搜尋體驗，可能更該盯的是：

- Task Success：搜尋到可訂房源的比例、搜尋到下單的中位時間
- Happiness：搜尋後滿意度、價格信任感、資訊清楚度
- Retention：新客第一次成功訂房後的 30 日回訪搜尋率

### 4. 把 guardrail / counter-metrics 寫成「停止條件」

例如：

- 若 `Payment Error Rate` 顯著上升，停止 rollout
- 若 `Cancellation Rate` 超出基準 10%，重新檢查流量品質與資訊透明度
- 若 `Support Ticket Rate` 上升，先回看流程與文案，而不是急著放量

做到這一步，成功才真的被定義完整。

不然很多團隊其實只是替「想做的事」找一個方便過關的數字而已。

## 什麼情況下，不適合只盯單一 North Star

這篇不是在反 North Star。我要反的是把它神化。

下面幾種情況，我都不會建議團隊把所有討論都壓成一個單點數字。

### 1. 多邊市場還沒穩定前

像訂房、外送、媒合這種雙邊或多邊市場，單一 North Star 很容易把某一側的健康度吃掉。

你看訂房成功數上升，可能其實是用補貼在硬拉需求，供給側體驗和房東品質卻在變差。這種產品一開始就要把需求、供給和交易品質一起看，不然很容易把市場平衡搞壞。

### 2. 產品還沒找到明確價值行為前

有些很早期的產品，連什麼算「真正拿到價值」都還不清楚。這時候急著拍板一個 North Star，常常只是把不確定性包裝成確定。

這種階段比較實際的做法，是先用多個候選行為觀察哪些最能預測留存或商業結果，再慢慢收斂。

### 3. 團隊只擁有局部責任時

公司層級可以有 company North Star，但單一產品小隊未必適合直接拿同一顆來管日常決策。

如果你的團隊只負責 onboarding，卻天天被要求對總收入負責，最後通常只會導致大家講話很大聲，但改不動真正能改的槓桿。

North Star 要能對焦，也要能對責任。

## 這套做法最常怎麼失敗

我看過最常見的失敗模式，大概有四種。

### 1. 把 North Star 寫成老闆最愛的財務結果

例如直接把 Revenue 當唯一指標，然後期待每個產品決策都能直接優化它。不是不行，但多數產品團隊根本無法在那麼短的 feedback loop 內看懂自己做了什麼。

### 2. 把 HEART 當 checklist，而不是判斷工具

每一類都硬湊一個數字，最後 dashboard 滿到像年貨大街。看起來很完整，實際上誰也不知道這季最重要的是哪兩個訊號。

### 3. Guardrails 寫了，但沒有門檻

這是最常見的裝忙版本。列了一串保護指標，可是真出事時，大家還是各說各話，因為從來沒定義什麼叫不能接受。

### 4. 拿指標替錯的策略背書

指標系統再漂亮，也救不了錯的產品判斷。

若核心問題其實是供給不足，你一直優化付款轉換，只會把爛體驗更有效率地放大。

## 最後收一下

North Star 很重要，但它更像指南針，不是整台導航系統。

它讓你知道大方向，卻不會自動告訴你這次成長是不是站得住，代價是不是太高，或體驗是不是正在被你自己吃掉。

所以我現在比較少問團隊「你們的 North Star 是什麼」，我更想問的是：

- 你們怎麼判斷這個 North Star 真的代表使用者價值？
- 你們用哪幾個 inputs 去驅動它？
- 你們用哪幾個 HEART 面向確認體驗沒有走偏？
- 你們的 guardrails 真的擋得住錯的成功嗎？

這四題都答得出來，North Star 才不是牆上的標語，而是能拿來做決策的系統。

下一篇我會接著往下寫另一個很容易被低估的問題。

很多團隊其實不是沒有 North Star，也不是沒有 metric tree，而是**同樣叫 conversion、retention、active user，不同人拉出來就是不同數字**。

那時候你會發現，光有指標架構還不夠，還得補上指標字典、口徑治理，以及 semantic layer 這一層。否則你以為大家在討論同一個數字，實際上每個人手上的都是不同版本。
