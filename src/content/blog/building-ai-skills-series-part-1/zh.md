---
title: "打造AI Skill 系列 Part 1：Skill、Tool、MCP、Runtime、Orchestrator 到底差在哪？"
description: "打造AI Skill 系列 Part 1：Skill、Tool、MCP、Runtime、Orchestrator 到底差在哪？"
categories: ["ai"]
tags: ["ai", "mcp", "skill", "agent", "workflow", "architecture"]
date: 2026-04-01T20:11:00
featured: false
---

我剛開始接觸這些詞的時候，其實也是一團霧。

明明每篇文章都在講 agent、tool calling、MCP、skills、runtime，可是一旦真的想把它們放進同一套系統裡，腦中就會開始打結。  
有些文件把 skill 寫得像 prompt 包，有些文章把 MCP 講得像萬能路由器，有些框架又把 runtime、orchestrator、agent loop 全揉在一起。到最後，你以為自己是在學架構，實際上是在跟名詞玩疊疊樂。

這篇文章就是寫給那個階段的你，也寫給當時的我。

我要做的不是再丟一份抽象定義大全，而是把這幾個最常被混在一起的詞，拆回它們真正該待的位置。拆清楚之後，你不只比較容易看懂別人的文章，也比較不會在自己的系統裡，把該分層的東西又焊回一起。

<figure>
  <img src="./resource/ai-skill-series-part1-01-five-layer-model.svg" alt="A practical five-layer model for AI skills, showing host client, runtime orchestrator, skill layer, tool layer, and infrastructure transport" />
  <figcaption>先把五層分清楚，再談 skill-first、MCP、tool exposure，後面的討論才不會一直打結。</figcaption>
</figure>

---

## 為什麼這幾個詞特別容易混

如果你最近在看 AI agent、automation、MCP 或技能型架構的內容，最容易出現的混亂通常不是「模型能力不夠」，而是**系統邊界沒切乾淨**。

最常見的混法有幾種：

- 把 **skill** 當成一份 prompt 檔
- 把 **tool** 當成任何跟外部世界有關的東西
- 把 **MCP** 誤解成 skill library 或智慧路由器
- 把 **runtime / orchestrator** 跟模型本身畫上等號
- 把像 ChatGPT 這種產品，直接當成整個內部系統

這些混淆在 demo 階段不一定會出事，因為小系統很容易靠默契撐住。  
但只要你開始需要做下面這些事，混亂就會浮上來：

- 增加工具數量
- 接上外部資料源
- 控制權限
- 做 error handling
- 做 tracing 與 logs
- 想把系統從原型推進到可維護狀態

這時候你就會發現，**語義分層做得好不好，會直接影響系統能不能長大**。

---

## 我先給一個最短版答案

如果你現在只想先抓住骨架，可以先記這五句：

> **Tool 是能力。**  
> **Skill 是任務方法。**  
> **MCP 是標準介面。**  
> **Runtime / Orchestrator 是執行與協調系統。**  
> **LLM 是推理核心，不是整個應用。**

這五句不是口號，而是分工表。  
接下來我們一層一層拆。

---

## 一、Tool 是「可執行能力」，不是「任務理解」

我最喜歡用一句很務實的話來記 tool：

> tool 不是拿來理解任務的，tool 是拿來**執行一段能力**的。

只要一個東西負責對外部世界做動作，或把某種能力封裝成可重複呼叫的介面，它就很像 tool。

常見例子包括：

- 查詢資料庫
- 呼叫 API
- 抓網頁
- 寫入 Google Sheets
- 執行 SQL
- 向量檢索
- 生成結構化輸出
- 更新第三方系統狀態

在 MCP 的語境裡，tool 是 server 暴露給模型可呼叫的能力。  
官方規格把重點放在名稱、描述、schema 與可調用性，而不是背後那個能力有沒有很「聰明」。這也是為什麼一個很普通的查詢函式，和一個內部其實很複雜的 scoring flow，都仍然可以是 tool。它們的共同點不是簡單或複雜，而是**邊界清楚、輸入輸出可定義**。[1][2]

### 工程上，tool 的好壞通常看這幾件事

- input schema 是否清楚
- output shape 是否穩定
- side effects 是否可控
- 錯誤是否可診斷
- 權限是否能隔離
- 是否容易重試或觀測

請注意，這些判準和「它是不是高階任務」沒有直接關係。  
tool 不需要知道整個任務在幹嘛。tool 只需要把它負責的那一小段能力做好。

這也是很多團隊第一次做 agent 時最容易犯的錯：  
**把帶有商業語義的長流程，直接誤當成 skill；又把其實只是外部能力包裝的東西，講成像任務方法。**

---

## 二、Skill 是「任務能力封裝」，不是多一份 prompt

很多人第一次聽到 skill，直覺會把它想成：

- 一份 prompt
- 一個 markdown 資料夾
- 一包 instructions
- 一組 examples

這樣理解不能說全錯，但還不夠。

比較好的說法是：

> **skill 是一種任務能力封裝。**  
> 它定義的是「什麼時候該用這組方法、可以開哪些工具、應該怎麼走流程、最後要輸出成什麼樣子」。

這裡關鍵不是檔案形式，而是**任務方法論**。

一個成熟的 skill，至少應該回答這幾件事：

1. **任務邊界**  
   這個 skill 解決什麼問題，不解決什麼問題？

2. **路由條件**  
   哪些使用者請求或哪些訊號，表示現在該進這個 skill？

3. **允許的工具集合**  
   這次推理能看到哪些 tools？哪些不能看到？

4. **執行順序與策略**  
   是先抓資料再評分？還是先 resolve reference，再進深度分析？

5. **輸出契約**  
   最後是短摘要、JSON、風險表、候選清單，還是 application pack？

6. **品質與治理要求**  
   什麼情況該澄清？什麼情況應 blocked？什麼是不能亂猜的？

換句話說，skill 不是單純「寫得比較長的 prompt」。  
YAML、Markdown、examples、tests，頂多只是 skill 的**表達形式**。真正重要的是，你有沒有把這個任務的方法與邊界定義出來。

---

## 三、MCP 是標準介面，不是你的 skill policy engine

MCP 這個詞，現在被神話得很嚴重。

很多人一看到 MCP，就會下意識覺得：

- 有了 MCP，工具就會自己變得比較聰明
- 有了 MCP，模型自然知道要怎麼選 skill
- 有了 MCP，routing 問題就解決了
- 有了 MCP，skill-first 架構就自動成立

其實都不是。

MCP 的核心價值是：**讓 host、client、server 之間，用一致方式交換外部能力與上下文**。  
官方把 server 可暴露的 primitive 分成 tools、resources、prompts 等類型。這非常重要，因為它把能力暴露標準化了；但它沒有幫你自動完成 skill routing、tool exposure policy、risk gating 這些事情。[1][3][4]

### 一句比較不浪漫但更準確的說法

> MCP 解的是 **capability transport**。  
> 它不等於 **task policy runtime**。

這點很關鍵。

如果你只是把底層工具和幾份文件一起暴露給 ChatGPT，MCP 並不會保證模型一定先看文件、一定先讀某個 resource、一定按照你心中的 skill 流程走。  
它給你的是標準化 surface，不是自帶紀律的策略引擎。

這也是為什麼很多系統看起來「已經 MCP 化」，實際上仍然非常 tool-first。  
它們有標準介面，但沒有真正把策略層建立起來。

---

## 四、Runtime / Orchestrator 是執行層，不是 LLM 的別名

這也是非常常見的誤會。

很多人會說：
- orchestrator 就是模型
- runtime 就是 agent loop
- 反正 LLM 會選工具，那它就是 orchestrator

這種說法只對一半。

模型確實可以參與 orchestration。  
但 orchestration 不是只有「決定下一步做什麼」。

一個真正可上線的 runtime / orchestrator，通常還要負責：

- 接收請求
- 維護 state
- 管理 tool call loop
- 控制可見工具集合
- timeout / retry / fallback
- human-in-the-loop
- tracing / logging / monitoring
- 持久化與恢復長流程

LangGraph 官方把自己定位成低階 orchestration framework 與 runtime，強調 durable execution、streaming、human-in-the-loop 等能力；OpenAI Agents SDK 也把 tools、handoffs、trace 這些事情放進 runtime / SDK 層，而不是單純丟給 prompt 自己處理。[8][9]

### 這裡最容易搞混的一點

LLM 很適合做：

- intent classification
- route suggestion
- next-step planning
- tool selection
- explanation synthesis

但 LLM 不天然等於：

- state store
- retry manager
- policy engine
- observability layer
- execution scheduler

把這些東西全都壓回模型，就是很多 demo 看起來很靈、production 卻很泥濘的起點。

---

## 五、那 ChatGPT 算什麼？

這裡也要特別拆一下。

很多人心裡會默默把 ChatGPT 想成整個系統。  
但從系統設計角度看，**ChatGPT 更接近 host / client**。

OpenAI 現在的 MCP 相關文件很明確：ChatGPT developer mode 與 Apps SDK 都是在談 ChatGPT 如何連 remote MCP server、如何發現 capabilities、如何把外部能力帶進對話。這個角色本質上是**上游入口**，不是你內部 skill registry、runtime policy 或 execution backend 的總稱。[5][6][7]

所以比較準確的理解是：

- **ChatGPT**：使用者互動入口、host/client
- **你的 skill layer / skill gateway**：任務能力與治理層
- **底層 tools / Make flows / APIs**：execution layer

一旦這個分工站穩，你就比較不會把「ChatGPT 看得到工具」誤以為「ChatGPT 自動幫你解決所有系統設計問題」。

---

## 六、為什麼這些概念一混，架構就會開始失控

這不是名詞潔癖，而是工程後果。

當 skill、tool、MCP、runtime、host 混在一起，通常會出現這幾種典型問題。

### 1. Tool-first，但假裝自己是 skill-first

這是最常見的。  
你把一堆 raw tools 全丟給模型，再附幾份文件，希望模型自己學會該怎麼走任務。  
結果系統表面上像 skill-first，實際上只是把說明書放進工具箱，沒有真正建立 gating。

### 2. 把 strategy 寫死在工具裡

第二種常見問題，是把 routing、business rule、prompt policy 全塞進某個底層 tool。  
短期很快，長期會讓 strategy 和 execution 黏死，之後你想換 host、換 runtime、換 backend，都會很痛。

### 3. 把 MCP 當 orchestration engine

MCP 幫你標準化能力暴露，但不會替你做工具分群、skill selection、風險等級控制、澄清策略。  
如果你把這些期望都投射到 MCP 上，後面一定會失望。

### 4. 把 LLM 當整個系統

這是最危險也最迷人的錯誤。  
因為在原型階段，模型看起來真的好像什麼都能扛。

但你一旦開始需要：
- trace
- retry
- logs
- permission boundary
- deterministic side effects
- postmortem

你就會發現，模型是推理核心，不是萬用系統。

---

## 七、給新手的最實用心法：先用「五層模型」看系統

如果你今天不是在考名詞定義，而是真的要判斷手上的東西該放哪裡，我很建議你用這個五層模型來看。

### 第一層：Host / Client
例如 ChatGPT、你的 app、你的前端 UI。  
它負責接住使用者請求，是對話真正開始的地方。

### 第二層：Runtime / Orchestrator
負責 state、tool loop、retry、handoff、tracing、fallback。  
它決定「任務怎麼跑起來」。

### 第三層：Skill Layer
負責任務方法、邊界、allowlist、輸出契約。  
它決定「這次到底在做什麼任務」。

### 第四層：Tool Layer
負責具體能力：查、抓、算、寫、生成。  
它決定「哪一小段能力怎麼執行」。

### 第五層：Infrastructure / Transport
負責 HTTPS、auth、/mcp endpoint、VM、container、logs、secrets。  
它決定「整個東西能不能安全穩定地活著」。

這五層一旦分清楚，很多問題會突然變簡單：

- 這是 prompt 問題，還是 routing 問題？
- 這是 tool contract 錯，還是 skill 邊界錯？
- 這是 MCP transport 問題，還是 VM / TLS 問題？
- 這是 ChatGPT 的 host 行為，還是你自己 server 的 policy 行為？

---

## 八、給已經做過系統的人：可以怎麼做 architecture review

如果你已經不在「名詞霧煞煞」階段，而是開始 review 一套系統，我會建議你直接問這幾題。

### Tool review
- 每個 tool 的 input/output contract 是否穩定？
- 錯誤是否結構化？
- side effects 是否可預期？
- 有沒有隱藏太多任務語義？

### Skill review
- skill 的邊界是不是用使用者任務語言來切？
- allowed tools 是否明確？
- output contract 是否一致？
- 是否有例外處理與 blocked policy？

### MCP review
- 你暴露的是不是對的能力面？
- 有沒有把 policy 問題錯丟給 MCP？
- tools / resources / prompts 的分工是否清楚？

### Runtime review
- 哪些事情是 deterministic 的？
- 哪些事情交給模型推理？
- state 與 logs 在哪裡？
- fallback / retry / tracing 是否存在？

如果這幾題你都答得出來，那這套系統通常已經開始有骨架了。

---

## 九、結論：先把名詞拆對，系統才會長對

我很能理解一開始看這些詞時的挫折感，因為我也經歷過那個階段。  
那種感覺很像你明明已經看了很多文章，但每多看一篇，腦中的線反而越纏越緊。

真正讓事情開始清楚的，不是再背更多名詞，而是接受一件事：

> 這些詞本來就不在同一層。  
> 你不是要把它們排大小，而是要把它們放回各自該在的位置。

如果要用一句話收尾，我會這樣說：

- 用 **tool** 封裝可執行能力
- 用 **skill** 封裝任務方法
- 用 **MCP** 作為能力暴露標準
- 用 **runtime / orchestrator** 管理流程與治理
- 把 **ChatGPT** 視為 host/client，而不是整個內部系統

當這個分層站穩之後，後面不管你是要談 skill-first、tool exposure policy、FastMCP、Make integration，還是自己架 skill gateway，才會有共同語言。

---

## 延伸閱讀與參考方式

本文用到的官方文件與我參考的教學文，已整理在：

`./resource/references.md`

---
