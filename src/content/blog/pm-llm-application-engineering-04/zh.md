---
title: "PM LLM 應用工程與治理 Part 4 － Agent 不是萬靈丹：什麼時候該做多步工作流，什麼時候該停在 Guardrails、KPI 與治理"
description: "做到 tool calling 和 RAG 之後，幾乎每個團隊都會出現同一種衝動。"
categories: ["ai"]
tags: []
date: 2026-04-05T16:28:00
series: "PM LLM 應用工程與治理"
seriesOrder: 4
---

做到 tool calling 和 RAG 之後，幾乎每個團隊都會出現同一種衝動。

既然模型已經會查資料、會叫工具、也能根據結果整理回答，那下一步是不是就該做 agent？是不是應該讓它自己拆步驟、自己規劃、自己交辦、自己回寫？

這個衝動很合理。

也是很多系統開始膨脹、變慢、變貴、變難管的起點。

我不是說 agent 不值得做。相反地，真正做得好的 agent 系統，確實能把多步工作流、模糊判斷和跨工具協作處理得比傳統 rule-based automation 更自然。只是，這件事的門檻從來不在於「能不能做出 while loop」，而在於你是否知道什麼時候該做、做到哪裡該停、以及一旦要上線，該怎麼治理。

這也是為什麼 Part 4 不想從「agent 有多神」開始，而是從一個比較不性感但很必要的判斷開始：

**agent 不是萬靈丹。很多情況下，真正該補的不是 autonomy，而是 guardrails、evals、KPI 與治理。**

## 先校正一件事：agent 不是一個會自己想通一切的 AI 人格

OpenAI 在 building agents guide 裡把 agent 講得很務實。它不是某種神祕存在，而是讓模型在 loop 裡反覆使用工具、處理多步任務的 workflow。Anthropic 對 effective agents 的觀察也很接近：最成功的 agent implementations，往往不是靠很複雜的 framework，而是靠簡單、可組合的 patterns。

這兩個官方說法我很喜歡，因為它們都把 agent 拉回了地面。

如果硬要把 agent 拆成最小單位，我會用你筆記裡那條線：

- planner
- executor
- tools
- memory / state
- guardrails
- fallback fileciteturn22file3

這個拆法很實際。

因為它直接提醒你：一個 agent 不是「多幾句 prompt」而已。它是至少六個責任層一起工作。

## 什麼時候該做 agent

我自己會用一個很保守的標準。

只有當任務同時符合下面三件事時，我才會認真考慮 agent：

### 1. 任務本身是多步，而且步驟之間有條件依賴

例如：

- 先抓 usage metrics
- 再算 ROI
- 再比對異常門檻
- 再產出週報摘要
- 最後決定要不要升級通知或轉人工

這種流程如果完全寫死成傳統 workflow，維護成本可能很高；但如果交給 agent，它就有空間用 planner / executor 去處理中間的判斷與例外。

### 2. 任務含有模糊性，不是單一 deterministic step 就能解

如果只是「把欄位抽成 JSON」，不需要 agent。Part 2 那套 schema、validator、retry 就夠了。

如果只是「查政策再回答」，很多時候 RAG 就夠了。

Agent 真正有價值的地方，是在任務本身需要一點判斷與交棒，而不是只是多了一步。

### 3. 任務的 business value 高到值得承擔額外成本與治理負擔

OpenAI 在 agents guide 裡很明確地提醒，應該先滿足 accuracy target，再處理 cost 和 latency。這句話其實翻成 PM 語言就是：只有在值得的 use case 上，才去買更高的複雜度。

換句話說，agent 不是因為你「會做」就該做，而是因為某個用例值得你付出治理成本。

## 什麼時候不要用 agent

這個問題其實更重要。

你那份筆記裡列了幾個理由，我基本上都同意：穩定性、成本、延遲、可控性、可稽核性。fileciteturn22file3

我會把它整理成四種典型情境。

### 1. 任務一步就能解

如果是單步 extraction、分類、摘要、格式化輸出，不要為了「看起來比較 AI」就硬做 agent。這時候多步 loop 帶來的通常不是價值，而是延遲與不確定性。

### 2. 任務邊界還不清楚

很多團隊在 use case 其實都還沒講明白時，就想上 agent。這通常只會把混亂放大。你連流程 owner 都還沒定義好，agent 只是幫你把曖昧變成自動化曖昧。

### 3. 高風險動作還沒有護欄

像扣款、退款、改資料、發正式信件、對外發送這種事，如果 action whitelist、validator、PII 保護、approval gate 都還沒建好，就不該交給 agent 自動跑。

### 4. 你其實缺的是 governance，不是 autonomy

很多 pilot 不是輸在模型不夠聰明，而是沒有人能回答這些問題：

- 失敗了怎麼辦？
- 誰負責拍板？
- 哪些資料能碰？
- 哪些動作不能自動做？
- 上線後怎麼監控？
- 出事時怎麼回放？

OpenAI 在 2026 那篇 governed AI agents cookbook 裡把這個 tension 寫得很準：真正卡住企業的不只是能不能做出 prototype，而是沒人能回答「這可以安全部署嗎？」；而且它提出一個很關鍵的觀點，**governance drives delivery**。

這句話很好，因為它剛好反過來。

很多人覺得治理是拖慢交付的東西。但在 enterprise 場景裡，往往是 guardrails 夠清楚、責任邊界夠清楚，東西才真的上得了 production。

## Agent 的核心，不在「會不會規劃」，而在「能不能被控制」

談 agent 時，最容易被高估的是 planner。

大家很愛討論模型會不會拆步驟，會不會自己找方法，會不會像人一樣規劃。這些能力當然重要，但在 production 裡，真正決定系統能不能活下來的，往往不是 planner，而是 guardrails。

OpenAI Cookbook 把 guardrails 定義得很直白：guardrails 的目的就是讓 agents 的行為安全、一致，而且在預期邊界內。

我自己最在意的 guardrails，大概有五層。

### 1. Action whitelist

先定義 agent 允許用哪些工具，不在清單裡的就不能碰。這不是保守，而是最基本的控制面。

### 2. Parameter / output validators

模型提出 tool call，不代表參數就可信。輸出長得像 JSON，也不代表它真能安全接下游。validator 的存在，是要把模型回傳的東西再過一次規則檢查。

### 3. PII / sensitive data controls

你筆記裡把 email、phone、ID 遮罩列成 guardrails，這很對。fileciteturn22file3 很多企業專案真正敏感的不是模型回答錯，而是 agent 看到了不該看的資料，或把不該帶出去的內容帶出去了。

### 4. Bounded retry

模型壞一次可以重試，但不該無限繞圈。retry 上限其實是在幫你管理成本、延遲與風險。

### 5. Replayable logs

如果一個 agent 出錯後你無法回放，那它就不是真的 production system，只是一段無法追責的運氣。

## 多 agent 不是成熟，很多時候只是更重

這幾年 agent 討論裡有個很常見的誤會：多 agent 好像比較高級。

OpenAI 在 agents guide 裡的建議其實很值得聽：先把 single agent 的能力吃滿，再考慮 multi-agent。多 agent 的好處是分工清楚，但也會帶來額外的複雜度與 overhead。

我很同意這個取向。

多 agent 真正適合的，不是「看起來很複雜」的情境，而是這種情況：

- 工具真的很多，而且責任區塊清楚
- 任務之間需要 manager / specialist 分工
- 單一 agent 已經因工具重疊或指令複雜度開始失準

不然很多時候，一個 agent 加清楚的 prompt templates、policy variables、工具描述，反而比較穩。

## 沒有 evals，就沒有真的治理

很多團隊談治理時，會先想到法務、審批、風險清單。這些都重要，但如果沒有 evals，治理其實站不穩。

OpenAI 的 eval docs 與 evaluation best practices 很直接：因為生成式 AI 本身是 variable、non-deterministic 的，傳統測試方法不夠，所以要用 evals 來測量 accuracy、performance、reliability。

這句話其實值得 PM 多想一下。

在傳統軟體世界裡，系統對不對，常常是 binary。今天 API 回 200 還是 500，通常很清楚。

在 LLM 系統裡，不是這樣。

你可能會遇到：

- 格式合規，但答案沒幫助
- 內容大致正確，但 citations 不對
- 工具選對了，但參數抽錯
- latency 太慢，使用者根本不等它
- 成本沒爆，但 adoption 很差

所以 evals 的價值，不只是「測模型好不好」，而是把整個系統拆成可量測的部分。

你筆記裡列的那些指標，其實就很適合拿來做 PM 等級的 eval / KPI layer：

- format compliance rate
- task success / accuracy
- latency
- cost
- adoption
- risk incidents fileciteturn22file0

這些指標比單看 benchmark 分數有用得多，因為它們真的會影響要不要上線。

## KPI 不是報表裝飾，而是 agent 上線前的生存條件

如果要把 LLM / agent 系統講給 C-level 或營運主管聽，我會把 KPI 分成四層。

### 1. 品質層

- task success rate
- accuracy
- citation correctness
- abstain correctness

### 2. 結構層

- format compliance
- tool-call validity
- retry rate
- fallback rate

### 3. 營運層

- P50 / P95 latency
- 每次成本、每月成本
- adoption、回訪率、覆蓋率

### 4. 風險層

- PII incidents
- unsafe action attempts
- manual escalation rate
- user-reported failure severity

這種切法的好處是，你不會再把「模型很聰明」當成唯一成功標準。

一個東西如果 accuracy 80%，但格式一直壞、延遲很長、重試很兇、成本太高，那它還是不適合 production。

## 治理真正要落地，最後還是會回到 event schema、報表與責任分工

你筆記裡 Day 7 那段其實非常值得留下來，因為它把很多人最不想碰的東西講得很實際：

- event schema
- ETL
- BI / dashboard
- RACI
- RAID log fileciteturn22file4

這一段很重要，因為它提醒我們：

AI 治理不是只有 policy document，也不是只有 safety deck。它最後還是要落到：

- 每次執行有沒有記錄
- 哪個 step 失敗最多
- 哪個市場 adoption 最低
- 哪個 use case 成本最高
- 哪個風險事件需要 escalations
- 誰拍板、誰負責、誰被通知

NIST 的 AI RMF 與 Generative AI Profile 之所以值得看，不是因為它會幫你寫 prompt，而是因為它把 trustworthiness 和 risk management 拉回組織層次。

這也是為什麼，我會把治理理解成另一種 scaffolding。

不是為了變慢，而是為了讓你真的能從 pilot 走到 production。

## 一個比較實際的 PM operating model

如果今天你手上有一個 AI productivity initiative，要從 PoC 走到 production，我會建議至少用這個順序想：

1. **先確認是不是 agent 問題**  
   很多時候只是 structured outputs + tools 就夠。

2. **定義允許動作與資料邊界**  
   先畫 whitelist，不要先做萬能助手。

3. **把 failure modes 寫出來**  
   缺資料、工具失敗、PII、選錯工具、loop 過長，各自怎麼 fallback。

4. **先做 eval，再談 scale**  
   沒有 baseline metrics，就不要講 rollout。

5. **把 event schema 與 dashboard 畫出來**  
   你不需要等系統完美才記錄，反而要越早記。

6. **定責任**  
   誰對 accuracy 負責、誰對 policy 負責、誰對人工接手流程負責。

這一整套比「我們也做了 agent」有價值得多。

## 收尾：最成熟的 PM，不是做出最炫的 agent，而是知道哪裡該停

如果前幾篇在講的是：

- prompt 不只是 prompt
- schema 是輸出合約
- tool calling 與 RAG 是把模型接回真實世界

那 Part 4 想講的其實是最後這一步：

**真正成熟的 PM，不是最先把每個流程都做成 agent 的人，而是最清楚知道哪裡該自動化、哪裡該留護欄、哪裡該轉人工、哪裡該先治理再擴張的人。**

Agent 不是萬靈丹。

但當你真的知道它在什麼條件下值得做，又能把 guardrails、evals、KPI、event schema 和責任分工一起帶進來，它就不再只是 demo 裡很會思考的角色，而會開始像一個可以被組織接住的系統。
