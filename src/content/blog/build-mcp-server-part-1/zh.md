---
title: "自主建造 MCP Server — Part 1：MCP 到底改變了什麼"
description: "從 workflow 腦到 client / server / tool contract 的責任重切，MCP 真正改變的不是「可不可以呼叫工具」，而是「誰該負責思考，誰該負責執行」。"
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-03-31T19:17:00
featured: false
subtitle: "從 workflow 腦到 client / server / tool contract 的責任重切，MCP 真正改變的不是「可不可以呼叫工具」，而是「誰該負責思考，誰該負責執行」。"
---

我前一版的 job agent，其實已經能跑了。

Make 會抓職缺、寫入資料、做初步評分、做 RAG 型分析，最後再把結果回給 ChatGPT。從功能清單看，它幾乎已經有一個 agent 的外觀。真正讓我決定繼續往下重構的，不是「功能不夠多」，而是我慢慢發現了一件更根本的事：

> **當一條 workflow 開始同時扮演 intake、planner、router、tool executor、reply formatter，它就會變成一個很會做事，但很難長大的系統。**

這也是我開始從 Make-first workflow，走到 Make MCP server，再走到 self-hosted FastMCP gateway 的原因。這條系列文不是要說 Make 不好，也不是要把 MCP 神話成銀彈。我要寫的是比較工程實際的一件事：

> **MCP 最有價值的地方，不是幫 LLM 接工具，而是幫你把系統的責任邊界切乾淨。**

如果你過去做過 workflow、自動化、bot integration，或已經有一堆能跑的 backend flows，這篇就是寫給你的。

![Responsibility shift from workflow brain to MCP contract surface](./resource/build-your-own-mcp-server-part-1-01-responsibility-shift.svg)

## 先講結論：MCP 不是新的 API 包裝詞

MCP 的官方文件把它描述成一個讓應用程式向模型暴露 **tools、resources、prompts** 等能力的協定。它不只是某個 SDK，也不是某家公司的私有整合格式。從規格角度來看，MCP 同時定義了：

- base protocol
- lifecycle management
- tool / resource / prompt 這些核心 primitive
- transport
- HTTP-based authorization

這些東西聽起來很規格書，但對工程實作最重要的啟發只有一句：

> **模型不應該直接碰你的內部實作細節，它應該透過一層有明確契約的 capability surface 來接外部世界。**

這也是為什麼，我後來不再把 MCP 理解成「把現有 REST API 再包一層」，而是把它看成：

- 一個能力暴露模型
- 一個責任分工模型
- 一個讓 host、client、server 分工更清楚的協定層

## 對 workflow builder 來說，MCP 真正改變了什麼

如果你原本的系統是 Make、n8n、Zapier、或任何 workflow-first 自動化堆出來的，你大概很熟這種架構：

```text
chat input
→ parse intent
→ route
→ call tools
→ format reply
→ store task state
```

問題是，當這一套長久演化之後，workflow 常常會被迫同時扮演四種角色：

1. **transport adapter**  
   接 webhook、接 chat event、接 message payload。

2. **orchestrator**  
   決定先做什麼、後做什麼、失敗怎麼繞。

3. **reasoning shell**  
   幫忙猜使用者想做什麼、該選哪個子流程、要不要追問。

4. **execution layer**  
   真正去抓資料、寫資料、打 API、調用模型。

在小系統裡，這樣做沒什麼問題。  
在能跑的那一刻，它甚至是最務實的做法。

但一旦你開始把 ChatGPT、Claude 或其他 host 接進來，這個結構就會暴露出一個毛病：

> **推理和執行混在一起，結果兩邊都做不漂亮。**

MCP 對這類系統最重要的改變，不是多一個工具註冊格式，而是你終於有理由把這四件事切開。

## Host、client、server 三層分工，為什麼比以前重要

MCP 規格把 host、client、server 的角色分得很明確。

- **Host** 是使用者所在的主體，例如 ChatGPT。
- **Client** 是 host 內部建立的 MCP 連線實體。
- **Server** 是真正暴露 capabilities 的遠端或本地服務。

這個分工看起來很抽象，但它對實作有一個非常實際的效果：

### 以前
你會把很多「應該由 host 做的事」塞進 workflow 裡。

例如：
- 對使用者回話
- 根據上下文選工具
- 決定這輪該繼續問還是執行
- 把多個工具結果整理成自然語言回覆

### MCP 之後
你比較容易問對問題：

- 哪些事該留在 host 的 reasoning loop
- 哪些事該放在 MCP server 的 contract surface
- 哪些事應該留在 backend execution tools

這就是我現在很常用的一個工作判準：

> **如果某件事比較像「替模型決定下一步」，它通常不該繼續藏在底層 workflow。**

反過來說，如果某件事只是把一段穩定業務邏輯做完，例如抓 recent jobs、查 shortlist、輸出 interview brief，那它就很適合留在 execution layer。

![Host, client, server, and backend responsibilities](./resource/build-your-own-mcp-server-part-1-02-host-client-server.svg)

## 這也是我為什麼沒有停在「Make MCP server」那一步

我在 v2 已經做過一件很重要的事：把 Make-first workflow 整理成比較像 execution engine 的樣子。

那一步其實已經比原本乾淨很多。  
但它還有一個限制：

> **工具入口雖然換成 MCP 了，真正的策略層還沒有完全從 Make 脫出來。**

所以我後來才會走到 v3：自架 Oracle VM、掛 FastMCP、讓 server 讀 GitHub 上的 `job-skills-gateway` repo，然後只對外暴露 skill-level tools。

那個 repo 的 README 和 architecture 文件，剛好把這件事講得很清楚：

- ChatGPT 是 top-level host
- FastMCP skill server 是 thin layer
- Make 仍是 execution layer
- skill server 只暴露四個高層技能
- raw Make flows 不直接對外暴露

這個差別很關鍵。

因為真正有價值的，不是讓 ChatGPT 能呼叫 `fetch_recent_jobs`。  
而是讓它看到的是：

- `job_ingestion`
- `job_scoring`
- `job_querying`
- `job_decision_support`

這四個名字已經不是 implementation detail，而是 **product-facing capability**。

## 工具化，不等於契約化

這一點我覺得是很多團隊會踩到的坑。

你當然可以把一堆 backend flows 暴露成 tool。  
技術上這沒有問題。  
但那不代表你已經完成了比較成熟的 MCP 化。

因為「工具可以被呼叫」和「工具是穩定契約」是兩回事。

一個比較成熟的 tool contract，至少要讓 host 看得懂這幾件事：

- 它是幹嘛的
- 什麼時候該叫它
- 輸入長什麼樣
- 輸出長什麼樣
- 失敗時會怎麼回
- 哪些 helper 不該直接暴露

也正因如此，我現在越來越傾向把 skill / tool surface 當成產品設計，而不是單純的 wrapper work。

如果這層沒設計好，MCP server 很容易退化成另一種 API gateway。  
外觀看起來更 modern，實際上只是把舊混亂搬到新入口。

## 這也是為什麼「skills」值得存在

對我這個 job agent 案例來說，skills 的價值不只是文檔。

它的作用比較像：

- 用高層語義把底層 execution tools 包起來
- 幫模型建立 capability boundary
- 讓 skill-first 變成 server 真實暴露的介面，而不是 prompt 裡的願望

這也是我現在很認同的一種做法：

> **不要期待模型自己乖乖先讀 repo 裡的 skill 文件，再幫你選工具。**
> **比較穩的做法，是讓 server 一開始就只暴露對的高層能力。**

也就是說，skills 不是用來取代 runtime selection。  
skills 更像是把「什麼能力應該被看見」先決定好。

真正的 runtime selection，後面還是會強烈受到：
- tool name
- description
- schema
- currently visible inventory

這也是系列 B 我會另外獨立寫一篇的原因。

![Where MCP actually helps in a workflow-heavy stack](./resource/build-your-own-mcp-server-part-1-03-where-mcp-helps.svg)

## 什麼情況下，你其實不需要自己架 MCP server

我很不想把這篇寫成「每個人都該自架 MCP」。

不是。

如果你只是：

- 本地單人使用
- 還在驗證一個原型
- 只有一兩個本機工具
- 沒有公開 HTTPS endpoint 的需求
- 沒有 secrets、policy、tool exposure 的治理需求

那你很可能先用 local stdio server 就夠了。  
甚至如果只是驗證某個概念，直接用現成 connector 或 PaaS 先跑起來也很合理。

我自己會考慮進到 self-hosted remote MCP server，通常是因為同時出現了幾個條件：

- 我真的要一個 public HTTPS endpoint
- 我不想讓 host 直接看到所有 raw backend tools
- 我需要把 secrets、adapter、routing policy 留在自己可控的 server
- 我希望 skill definitions 以 repo file 的方式版本化
- 我想保留既有 Make investment，但又不想讓 Make 繼續當整個系統的大腦

如果這些條件你還沒遇到，先不要急著進到 VM、Cloudflare、nginx 這個運維地獄入口。

## 我目前的工作判準：MCP 最適合用來重切責任，不適合用來美化混亂

如果要把這篇濃縮成一句我自己真的拿來做決策的話，那就是：

> **MCP 最值得的場景，不是你手上已經有很多工具，而是你需要重新定義誰有權看見哪些工具、誰該負責推理、誰只該負責執行。**

這也是為什麼我把這個系列分成三條線：

- 系列 A 講認識與建造
- 系列 B 講 transport、安全、契約、skills 這些工程深化
- 系列 C 才回到 make-job-agent-v3 這個具體案例

因為如果你一開始就只看「怎麼把 tool 暴露出去」，很容易錯過真正更貴的事情：

- contract 設計
- tool surface 治理
- host / server / backend 的責任分工
- 以及「不要讓 workflow 繼續假裝自己是 agent 大腦」

## 這篇最想留下的反例

我也想刻意留一個反例，避免這篇變成另一種技術信仰。

**不是每一個 workflow-heavy 系統都值得導入 MCP。**

有些團隊的痛點其實只是：
- 流程太亂
- schema 不穩
- secrets 到處亂放
- 命名沒有層次
- tool descriptions 寫得很爛

如果是這樣，你就算加了 MCP，也只是把一團亂搬到新的通訊協定上。  
這時候真正該先做的，不是自架 server，而是先把 backend execution contracts 整理乾淨。

這也是為什麼，我在自己的遷移順序裡，永遠把這條路放在前面：

1. 先整理 execution contracts
2. 再整理高層 skills
3. 再決定 server 怎麼暴露
4. 最後才談 host 怎麼接入

## 下一篇我會開始講真正會卡人的地方

如果 Part 1 講的是「MCP 到底改變了什麼」，那 Part 2 就會開始講更具體、更泥濘的那一段：

- Oracle VM 怎麼準備
- public IP、VCN、subnet、Internet Gateway、security rules 哪些缺一不可
- Cloudflare、nginx、FastMCP 怎麼接成真的 HTTPS `/mcp`
- 為什麼本機有跑，不代表外面打得到
- 為什麼你以為是 FastMCP 壞了，最後常常其實是網路層或 TLS 沒對齊

也就是說，下一篇才是真正開始搬磚。

![Migration ladder from workflow-first to contract-oriented MCP](./resource/build-your-own-mcp-server-part-1-04-migration-ladder.svg)
