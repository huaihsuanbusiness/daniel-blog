---
title: "AI代理工作流系列 7 — AI 如何接上世界：MCP 不會取代 Workflow，它是讓 Agent 能安全使用工具的中間層"
description: "MCP 不是 workflow killer，也不是比 webhook 更潮的替代品。它真正做的，是把工具、資料與提示暴露成標準化介面，讓 agent 能以更一致、更安全的方式接上外部世界。"
categories: ["ai"]
tags: ["ai", "agent", "workflow", "mcp", "architecture", "openai", "make"]
date: 2026-04-02T09:59:00
featured: false
---

很多人第一次接觸 MCP，很容易立刻產生兩種誤會。

第一種誤會是：

> MCP 會取代 workflow。

第二種誤會是：

> MCP 只是比較新潮的 webhook 或 function calling 包裝。

我現在比較相信的說法是：

> **MCP 不是用來取代 workflow 的。它是讓 agent 能比較一致、比較安全、比較可治理地使用工具、資料與既有系統的中間層。**

如果 workflow 是工廠裡真正搬貨、分流、重跑、補償的輸送帶，MCP 比較像是把工廠的控制面板、插座、規格、權限，整理成模型可以理解的標準介面。

這篇想做的事很簡單：把 MCP 放回正確位置，順便把它和 webhook、Make、agent、workflow 的責任邊界切乾淨。

---

## 問題的本質不是 AI 不夠聰明，而是它沒有可靠的手

早期很多 AI 應用其實卡在同一件事：

- 能回答問題
- 能產生文字
- 但不太能穩定地對外部世界做事

傳統軟體系統的結構比較像：

`程式 → API → 系統`

但 AI 世界的結構更像：

`模型 → ??? → 工具 / 資料 / 外部系統`

中間缺的是一層讓模型能理解、發現、呼叫、接收結果，而且帶著 schema、權限與連線規則的中介層。

這就是 MCP 開始有價值的地方。

---

## MCP 到底是什麼？

官方現在的說法很清楚。MCP，也就是 **Model Context Protocol**，是一個開放協定，用來讓 LLM 應用更一致地接上外部工具與資料來源。

它不是某一個單一產品，也不是某一間公司的私有 API。它比較像一個「AI 用的標準工具介面」。

MCP 規格與學習文件現在把它描述成一個 client-server architecture。大致上有三個角色：

- **Host**：真正承載 AI 體驗的應用，例如 IDE、chat app、assistant
- **Client**：Host 裡負責維持與 MCP server 連線的元件
- **Server**：對外提供工具、資源或 prompt 能力的程式

這個切法很重要，因為它直接說明了一件事：

> MCP 本身不是 agent，也不是 workflow engine。  
> 它是一個讓 host 能透過 client 去連各種 server 的通訊與能力暴露標準。

---

## MCP 真的提供的是哪三種東西？

MCP 不只是「tool calling」。如果只把它理解成工具呼叫，會低估它的作用範圍。

目前 MCP 的核心能力可以大致拆成三種：

### 1. Tools

這是大家最容易理解的部分。Tools 是模型可呼叫的函式或操作，讓 LLM 可以查資料、跑 API、執行動作、啟動流程。

### 2. Resources

Resources 比較像提供上下文的資料入口。它們不一定是可執行動作，更像是模型可以讀取的外部內容與資料源。

### 3. Prompts

Prompts 在 MCP 裡不是單純「一段文字」。它更像是結構化、可參數化、可顯式觸發的互動模板。官方文件甚至直接提到，這些 prompts 可以引用 resources 與 tools，形成比較完整的 workflow experience。

這一點很值得注意，因為它直接說明：

> **MCP 並不是只能暴露零碎工具，它也可以暴露更高階的互動模板與工作樣板。**

---

## MCP 解決的是什麼問題？

### 1. 工具接法不要每次都重造輪子

如果沒有 MCP，你很容易進入這種世界：

- 每接一個系統，就寫一套自己的 integration
- 每個工具用不同的 schema 與描述方式
- 權限、認證、參數驗證、結果格式，全都各寫各的
- 換一個 AI client，很多接法又得重做一次

MCP 做的事，不是消滅所有整合成本，而是把這些整合的基礎介面標準化。

OpenAI 在 MCP tool guide 裡就把它講得很白：與其手工把每個 function call 綁到不同服務，不如把模型指向一個或多個 MCP server，由這些 server 當成集中化的 tool host。這樣 orchestration 會更簡單，工具管理也更集中。

### 2. 讓模型「知道有哪些工具」這件事變得比較正式

一個工具要好用，不只是因為它能執行，而是因為模型要知道：

- 這工具是幹嘛的
- 何時該用它
- 參數怎麼填
- 回來的結果長什麼樣
- 它和旁邊那把工具差在哪裡

這也是為什麼官方文件一直強調 schema、description、detailed scenario description 這類欄位。因為 MCP 不只是幫你接線，它也在幫你把工具的語義暴露給模型。

### 3. 把認證、權限、transport 拉回可治理範圍

MCP 的架構文件有明講 transport layer 會處理 communication channels 與 authentication。OpenAI Codex 的 MCP 文件也明講目前支援：

- 本機 STDIO server
- Streamable HTTP server
- bearer token 與 OAuth 這類認證方式

這件事之所以重要，是因為 agent 接外部世界最大的風險，從來不只是「會不會用錯工具」，而是：

- 憑證怎麼發
- 權限怎麼收斂
- 哪些能力該暴露
- 哪些能力只能局部開放

MCP 沒有自動幫你把安全問題全部解掉，但它至少讓這些問題有比較標準、可組織化的接點。

---

## 但 MCP 沒有解決什麼？

這一段更重要。因為很多人對 MCP 的期待太滿，結果把它當成一種「AI 全部都靠它就好」的總解法。

MCP 沒有直接解決這些事情：

### 1. 它不是 workflow engine

MCP 不幫你做：

- 長鏈流程設計
- retry policy
- 排程
- 補償交易
- 人工審核節點
- idempotency
- 資料轉換管線
- 長時間任務狀態管理

這些事情比較像 Make、n8n、Temporal、Airflow，或你自己寫的 orchestration layer 在處理的事。

### 2. 它不是 business logic 的替代品

你公司的規則、營運例外、審批條件、錯誤處理，都不會因為接了 MCP 就突然消失。

MCP 幫你做的是暴露能力，不是替你定義整個業務流程。

### 3. 它不是「比較高級的 webhook」

Webhook 解決的是 **事件通知**。它常見的形狀是：

- 某件事發生
- 丟一個 HTTP request 到指定端點
- 觸發下游反應

MCP 解決的則是 **模型如何發現、選擇、呼叫、讀取、組合工具與上下文**。兩者根本不是同一層。

Webhook 可以是某條 workflow 的觸發器。  
MCP 可以是 agent 接觸那條 workflow 或其他工具的介面。  
它們會相遇，但不是互斥替代關係。

---

## 為什麼我說 MCP 不會取代 Workflow？

因為官方文件和實際產品都在告訴你同一件事：

> **MCP 更像是讓 workflow 變成 agent 可呼叫工具的橋，而不是把 workflow 整個吃掉。**

最清楚的例子就是 Make。

Make 的 MCP server 文件現在寫得很直接：它可以把你的 active、on-demand scenarios 變成 AI 可呼叫的 tools；AI client 像 Claude、ChatGPT 可以透過 MCP 來跑 scenario、管理情境裡的資源，而 scopes 會決定可呼叫的工具範圍。

這句話背後的含義其實非常大：

- Make scenario 沒有消失
- workflow engine 沒有被取代
- agent 並不是直接「理解所有 API」
- 而是 workflow 被包成模型可用的工具介面

換句話說，MCP 不是在消滅 workflow，而是在讓 workflow 被 agent 使用。

這也是我現在最喜歡的一句架構總結：

> **MCP 讓 Agent 能使用 Workflow。**

不是取代，而是接上。

---

## Make 在這個世界裡到底是哪一層？

如果把整個堆疊切乾淨，我會這樣看：

- **LLM / Agent**：負責理解目標、做判斷、選工具
- **MCP**：負責把工具、資源、prompt 以標準方式暴露給 agent
- **Workflow engine（例如 Make）**：負責穩定執行多步流程、管理資料、重跑、重試、記錄、營運邏輯
- **Apps / APIs / DB**：真正做事的外部系統

所以對我來說，Make 在這個世界裡不是 MCP 的競爭者，反而很常是 MCP 背後最有價值的 execution engine。

尤其 Make 文件現在已經把一件事講得很清楚：scenario 要成為 MCP tool，必須有清楚的 inputs / outputs，最好有詳細描述，而且通常要設成 active + on-demand。這等於是在逼你把原本給人看的 workflow，整理成模型也能理解的工具契約。

這是一件很好的事。因為真正成熟的 agent 系統，不該只靠模型「猜」工具怎麼用。

---

## MCP vs Webhook vs 直接 API 串接

很多人會把這三件事混成一坨，我建議直接這樣分：

### Webhook

適合：

- 事件發生就通知
- 單向觸發
- 事件驅動整合

強項是即時觸發，不是給模型做動態工具探索。

### 直接 API integration

適合：

- 你只服務單一產品或單一應用
- 工具很少
- 你願意手工維護所有 schema 與權限處理
- 不需要 client 可攜性

強項是直接、薄、可客製。缺點是每接一個工具都要自己維護。

### MCP

適合：

- 你要讓 AI client 發現與使用多個工具 / 資源
- 你想把工具描述、schema、權限與 transport 拉回標準層
- 你希望不同 host / client 有機會重用同一組能力
- 你想讓 workflow、資料源、操作能力都透過統一介面暴露

它不是最短路徑，但在系統一複雜起來之後，通常是更穩的中間層。

---

## 一個實用的分層圖：誰在決定，誰在執行，誰在搬資料

我現在最喜歡的分法其實很簡單：

### Agent 負責決定

它理解使用者目標、判斷下一步、決定該用哪一個工具。

### MCP 負責接線與標準化

它讓工具與資料不再是每個 client 都要重寫一次的私人接法，而是可描述、可授權、可連線、可發現的能力面。

### Workflow 負責穩定執行

它把那些需要：

- retry
- logging
- approval
- mapping
- compensation
- schedule
- data handling

的事情穩定跑完。

這三層如果切乾淨，你的系統反而比較不容易變成一團糨糊。

---

## 什麼時候其實不需要 MCP？

不是所有東西都該上 MCP。這段很重要，因為它關係到你會不會把架構做得太胖。

### 1. 你只有一個內部系統、幾個固定函式

如果你只是做一個很窄的應用，而且只有少數穩定操作，直接 function calling 或直接 API integration 可能更簡單。

### 2. 你的工具完全不需要被其他 AI client 重用

如果這些能力只會被單一後端服務使用，沒有 host / client portability 的需求，MCP 的好處可能不夠大。

### 3. 你真正缺的不是介面標準，而是流程設計與工具治理

很多團隊以為自己需要 MCP，實際上缺的是：

- 把工具定義清楚
- 把權限收斂
- 把 workflow 切乾淨
- 把 error path 做出來
- 把 observability 補齊

MCP 幫不了你替代這些思考。

---

## 真正實用的架構觀念：不要問 MCP 能不能取代 Workflow，要問它能不能讓 Workflow 更容易被 Agent 正確使用

這是我寫完這一輪研究後最相信的一句話。

如果你把 MCP 當成 workflow 替代品，你很容易失望。因為它不會自動幫你處理：

- retry
- state machine
- branch orchestration
- compensation
- business rules
- operational visibility

但如果你把它當成 agent 與外部能力之間的標準中間層，你會開始看見它真正的價值：

- 讓工具暴露方式更一致
- 讓 auth 與 scope 更清楚
- 讓 AI client 比較能理解何時該用哪個能力
- 讓既有 workflow engine、資料系統、搜尋能力，都能被較有秩序地接進 agent stack

這時候整個系統就會長得比較像：

`User → Agent → MCP → Workflow / APIs / DB → Result`

而不是：

`Agent 自己猜怎麼打每一支 API`

---

## 結論：MCP 不是終點，它是接口層；Workflow 不是過時，它是執行骨架

如果要把這篇壓成最短的一句話，我會這樣講：

> **Agent 決定要做什麼，MCP 負責把能力接進來，Workflow 負責把事情穩穩做完。**

所以我不會把 MCP 看成 workflow 的替代品。  
我會把它看成一個很重要的橋樑層。

它讓 agent 不必每次都重新學會怎麼接每個世界；  
也讓我們不用把所有執行邏輯都硬塞進模型腦袋裡。

這才是我現在覺得最合理的架構分工。

---
