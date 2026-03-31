---
title: "我怎麼在 LangGraph、n8n、Make 之間做選擇：為什麼我現在先押 Make"
description: "從實務工作型態出發，比較 LangGraph、n8n 與 Make，並說明我目前為什麼先選擇 Make。"
categories: ["ai"]
tags: ["ai", "agentic-workflow", "langgraph", "n8n", "make", "automation"]
date: 2026-03-30
featured: false
---

更新日期：2026-03-30

如果你最近也在看 agentic workflow 工具，應該很容易被比較文洗到有點麻。

大家都在問：
- 能不能接 LLM
- 能不能做 agent
- 能不能 loop
- 能不能接 API
- 能不能 human-in-the-loop

但我越看越覺得，很多文章一開始就問錯了。

因為 **LangGraph、n8n、Make 並不是同一層工具**。真正決定選型的，通常不是「誰也做得到」，而是：

> **你的主要複雜度，到底是流程整合，還是 agent runtime 治理？**

我最後確實偏向 **Make**。

但這篇不是站隊文，也不是最終技術評估報告。它比較像一篇給 PM、builder、automation practitioner 的選型前導文：如果你也在把 AI 放進既有業務流程、自動化整合與資料流裡，應該先怎麼選。

---

## 我怎麼比的：先把事實和偏好拆開

這次我不只看 Daniel 收的 9 份素材，也回頭查了官方文件、價格頁和 Make Community 幾個關鍵討論。這一版我刻意把 **fact** 和 **view** 分開。

### 我拿來當作事實地板的，是這些東西

- **LangGraph** 官方文件，確實把 persistence、durable execution、interrupt、resume、human-in-the-loop 放在核心位置。
- **n8n** 官網目前公開的 Cloud 價格頁，Starter 和 Pro 的入門門檻比 Make 高一截；它同時明確維持 self-host 路線。
- **Make** 官方文件能確認幾件事：
  - If-else / Merge 是在 **2026-03-10** 公開 beta 推出的
  - If-else flow 後 **不能再放 Router，也不能再放另一個 If-else**
  - Make 已經把 **MCP server、MCP toolboxes、AI agent tools** 放進正式文件體系裡
- **Make Community** 也找得到 formula editor / mapping / 自動 pop-up / 特殊字元輸入的抱怨。

### 我當成主觀判斷的，是這些東西

- 我現在的工作，到底比較像 business automation，還是像 long-running agent system
- 我願意用多少工程複雜度，去換多少控制權
- 我現在更想要更低摩擦的落地速度，還是更高上限的 runtime 抽象

比較準確的說法是：**這是 Daniel 目前任務型態下的選擇，不是所有團隊的唯一答案。**

---

## 先看同層的事實：三個工具各自比較自然的主場

| 工具 | 它原生在解什麼問題 | 比較自然的主場 | 我不會先拿它來做什麼 |
|---|---|---|---|
| LangGraph | stateful agent orchestration / runtime 治理 | 長任務、多 agent、checkpoint、interrupt / resume、human approval | 單純的 SaaS 串接與一般營運流程自動化 |
| n8n | 可視覺化 workflow automation，但保留較高工程擴充性 | 自架 workflow、技術型流程、AI + API + 條件控制 | 完全不想碰工程細節、只想快速拼商務流程的團隊 |
| Make | visual-first business automation，近年加上 AI / MCP / agents | SaaS 整合、營運流程、AI 判讀插進既有流程、快速交付 | deeply stateful、長生命週期、需要 runtime 級治理的 agent 系統 |

簡單說：
- **LangGraph** 在處理 agent 的生命週期
- **n8n** 在處理技術團隊也願意維護的 workflow
- **Make** 在處理商務流程怎麼更快落地，然後把 AI 補進去

---

## 我拿三種實際 workload 來比，事情就清楚很多

### 1. 職缺雷達流程

這類流程很典型：

- 定時抓職缺
- 清洗資料
- 先做基礎評分
- 把高分項目送進後續 AI / RAG 分析
- 再通知我或回寫資料表

這種任務裡有 AI，但骨架其實還是 workflow。主問題不是「agent 怎麼維持狀態」，而是「資料怎麼流、服務怎麼接、流程怎麼穩定跑」。

在這種 workload 下：

- **Make** 很自然，因為它本來就擅長事件驅動、SaaS 串接、視覺化流程和營運型自動化。
- **n8n** 也能做，而且如果我更在意自架、程式擴充或更自由的控制流，它甚至可能更香。
- **LangGraph** 不是不能做，但有點像拿越野車跑我每天通勤的路。

如果我今天只要把這條流程先跑起來，我會先選 Make。

### 2. CRM lead enrichment + LLM scoring + Slack 通知

再進一步一點。

例如：
- CRM 進來一筆 lead
- 去外部服務補資料
- 讓 LLM 做分類或評分
- 某些 case 需要人工看一眼
- 最後再回寫 CRM、Slack、mail 或其他內部系統

這時候，**Make 和 n8n 的差距才真正開始有意思**。

因為這已經不是單純接服務而已，還會碰到：
- 條件分流夠不夠自然
- 出錯怎麼補救
- 要不要 self-host
- 團隊願不願意吃更多工程心智

在這個 workload 下，我不會說 Make 穩贏。比較準的說法是：

- 如果我要 **更快搭起來、把現成服務接順、先交付可用版本**，我更容易選 Make。
- 如果我很在意 **自架、環境控制權、流程自由度和更深的客製化**，我會更認真看 n8n。

這裡其實很難做百分之百公平的比較，因為兩邊交換的不是同一種東西：Make 比較像把摩擦降到很低；n8n 比較像把自由度拉高，但代價也會往工程端偏一點。

### 3. 長生命週期 research agent

這是另一個世界。

假設今天我要做的是這種系統：

- 任務跑很久
- 要查很多來源
- 中間可能等人工批准
- 要保存狀態，之後再恢復
- 還要知道它現在在哪一個 checkpoint、為什麼停在那裡、怎麼回放

這時候真正的問題就不再是「能不能串 API」了，而是：

> **你到底把 agent 的執行生命週期當成什麼來治理？**

到了這個層級，LangGraph 的優勢就很自然。因為它處理的不是「多幾個步驟」，而是 runtime semantics 本身：state、persistence、interrupt、resume、durable execution、human-in-the-loop。

這也是我不會硬說 Make 或 n8n 與 LangGraph 在這種場景下設計上等價的原因。可以拼出可用版本，和原生抽象，中間差很多。

---

## 所以，我現在為什麼還是先選 Make？

我現在偏向 Make，不是因為它比較潮，也不是因為我覺得它全面贏；而是因為把問題拉回我目前最常做的那一類工作後，它的回報速度最高。

### 第一個原因：它最符合我現在的主要複雜度

我眼前大多數工作，主體還是：

- 事件進來
- 資料轉換
- 條件判斷
- 呼叫 AI 或外部 API
- 把結果送到下一站

這裡真正痛的不是狀態機，而是整合摩擦。

Make 在這種場景下給我的感覺很直接：
- 視覺化成熟
- 常用整合多
- scenario 的搭建速度快
- 很多非工程型流程，能在不太醜的前提下先跑起來

> **對我目前這種 AI-enhanced business workflow，Make 的交付回報比最高。**

這個說法比「最誠實的答案」更準，也比較站得住。

### 第二個原因：它的入門門檻，對我這種情境比較友善

這段我刻意不講太滿，因為不同平台的計價模型根本不是同一種東西。

- **Make** 官方價格頁目前顯示的入門級距，大致是 Core、Pro、Teams 三層，頁面是用 **10k credits / mo** 的顯示方式呈現。
- **n8n** 官網目前的 Cloud 入門公開價格，大致是 **Starter €20 / 月、Pro €50 / 月**（年繳）。
- **LangGraph** 的開源部分表面上可以很便宜，但它真正會吞掉的常常不是 license，而是工程時間、部署、infra、觀測、測試與維運成本。

所以我沒有硬把三者換算成一張「誰最便宜」的總價表，因為那樣很容易假精準。

但如果問題只是：**我現在要開局，哪個 public entry ticket 比較不重？**  
那 Make 確實比較容易先進場。

### 第三個原因：它的上限沒有很多人第一次以為的那麼低

我這次重看官方文件後，更確定一件事：Make 當然不是 LangGraph，也不是 n8n，但它也已經不是那種只能做「A 傳到 B、B 傳到 C」的老派自動化工具了。

它現在至少已經把這些東西放進正式能力版圖：
- AI Agents
- MCP server
- MCP toolboxes
- AI agent tools 裡的 MCP tools
- If-else / Merge 這種比早期 Router-only 更完整一點的 flow control
- Code / API 作為逃生口

所以我的看法不是「Make 可以取代所有工具」，而是：

> **在真正撞到 runtime 上限之前，它其實可以先把很多實務需求做完。**

對我來說，這個「先做完很多實務需求」的價值，比抽象層級的純度更先發生。

---

## 但 Make 的刺，我不想替它遮住

我不會因為自己偏向 Make，就把它寫得很圓。

### formula / mapping / operator 體驗，真的不夠好

Make 在簡單 mapping 時很順，可只要進入比較厚的公式、條件、字串處理、operator 組合，體驗就很容易變得煩。

我這次回看 Make Community，看到的痛點其實很一致：
- formula pop-up 會打斷輸入
- 某些字元會被 editor 自動解讀
- 例如分號可能被當成函式參數分隔，而不是你想輸入的字元
- 複雜公式常常讓人寧願先去外部文字編輯器整理，再貼回來

這些不會讓工具立刻不能用，但會慢慢消耗手感。更麻煩的是，它不是那種「你做對了就沒事」的問題，而是 editor 本身就會開始跟你唱反調。

所以我的做法其實很簡單：
- 簡單邏輯，交給 visual mapping
- 一旦邏輯開始變醜，我就直接上 Code 或 API

與其硬在 editor 裡拗，不如早一點承認工具邊界。

### 它的控制流其實是最近才補完整一截

這點我這次特別回頭查了官方文件。

Make 的 **If-else / Merge** 是到 **2026-03-10** 才公開 beta 的。這代表在那之前，條件分流很大一部分其實更依賴 Router。

Router 當然有用，但它和 If-else / Merge 解的不是同一題：
- Router 比較像多路分發
- If-else / Merge 比較像條件選一路，再自然合流

這個差別在小 scenario 裡也許還好；流程一長，感受會很明顯。

### 就算現在補上 If-else / Merge，它也還不是任意深的控制流系統

這裡官方限制寫得很明白：在 **If-else flow** 裡，**不能再放 Router，也不能再放另一個 If-else**。

這不是小 bug，而是直接提醒你：**Make 的設計重心依然是「可管理、可視覺化的 scenario」，不是讓你無限嵌套出一個複雜控制流 runtime。**

所以如果你的主問題是：
- 深層 branching
- 長任務中的狀態治理
- 中途中斷後恢復
- agent 之間共享 state
- checkpoint / replay / audit

那我不會建議因為 Make 現在多了 If-else / Merge，就把它當成 LangGraph 的替代品。這樣太樂觀了。

---

## 我的結論在哪些情況下會失效？

### 如果你的團隊本來就是 code-first

那 Make 的低摩擦不一定最值錢。你本來就習慣自己接 infra、寫邏輯、治理部署，這時候 n8n 或 LangGraph 的吸引力會高很多。

### 如果 self-host、資料控制權、內網部署是硬需求

那 n8n 的權重會直接上升。這時候不是搭建速度問題，而是環境控制權問題。

### 如果任務的核心不是整合，而是 runtime semantics

也就是說，如果你真正卡住的是：
- 狀態怎麼保存
- 任務怎麼暫停與恢復
- 人工審核怎麼進入執行模型
- 長任務怎麼治理

那我的結論就會往 LangGraph 傾斜。

換句話說，我現在偏向 Make，不是因為它永遠最對。  
而是因為**我眼前多數問題的核心複雜度，還沒有移到 runtime 那一層。**

---

## 最後一句話

我現在先選 Make，不是因為我覺得它比較高級。

我選它，是因為把工作拉回現場之後，我發現自己目前最常解的還是這一類問題：
- 事件怎麼進來
- 流程怎麼跑順
- AI 怎麼插進既有系統
- 資料怎麼送到下一站
- 哪裡要保留人工節點
- 哪裡不值得過度設計

對這種問題，Make 給我的不是完美答案。  
但它給我的，是**最快落地、門檻沒那麼重，而且在真正碰到上限之前夠用很久的答案。**

這不一定適合所有團隊。  
但對我現在的任務型態，它最合身。
