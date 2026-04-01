---
title: "自主建造 MCP Server — Part 3：MCP 高級框架比較與怎麼選"
description: "Part 3 of the MCP Server build series."
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-03-31T19:24:00
featured: false
---

**副標：FastMCP、MCP Framework、xmcp、Spring AI MCP Server 四條路線，真正該比的不是誰功能表最長，而是你的語言棲地、部署模型、auth 壓力、以及團隊未來要怎麼維運。**

到這一篇，事情終於開始變得比較像工程選型，而不是概念導讀。

如果 Part 1 講的是「MCP 到底改變了什麼」，Part 2 講的是「怎麼真的把一台 remote MCP server 架起來」，那 Part 3 要回答的，就是很多人卡最久、但又最容易被寫成整理文的一題：

> **我要用哪個 MCP framework？**

我自己一開始也以為這只是「Python 還是 TypeScript」的問題。後來真的去讀官方文件、試著對照部署方式、auth 路線、transport、現有系統語言，以及我自己的 job agent v3 架構之後，我才發現：

> **MCP framework 選型，真正決定的不是 hello world 寫起來順不順，而是你準備把 MCP server 當成一個小工具、一個 web app、還是一個要活很久的 integration layer。**

這篇我會把四條常見路線放在同一張地圖上看：

- **FastMCP**
- **MCP Framework**
- **xmcp**
- **Spring AI MCP Server**

我不會寫成百科全書，也不會假裝有唯一正解。  
我比較想做的是把它們放回工程現場，回答一個更實際的問題：

> **如果你的目標是把 ChatGPT 接上一個可公開、可治理、可演進的 MCP server，哪一條路最不容易把自己走進維運泥沼？**

![Framework map for FastMCP, MCP Framework, xmcp, and Spring AI MCP Server](./resource/build-your-own-mcp-server-part-3-01-framework-map.svg)

## 先講我的結論

如果你只是想先知道結論，我的判準很簡單：

- **FastMCP** 最適合「Python 棲地、想快速做出 thin server、又不想自己扛太多協定細節」。
- **MCP Framework** 最適合「TypeScript 棲地，而且你要的是比較像傳統後端框架的 MCP server 開發體驗」。
- **xmcp** 最適合「你想把 MCP 嵌進既有 JS / TS web app，或偏愛 file-based、adapter、plugin 的現代 DX」。
- **Spring AI MCP Server** 最適合「你本來就在 Java / Spring 世界，並且希望把 MCP server 做成企業內的正式平台能力」。

這四個選項不是同一種東西的不同皮膚。  
它們其實代表四種不同的工程世界觀。

## 先不要急著比語言，先比四個問題

我現在挑 framework，不會先問「大家最近在用哪個」，而是先問下面四題。

### 1. 你的 MCP server 是獨立服務，還是要嵌進既有 app？

這題很關鍵。

如果你要的是一個獨立、清楚、薄薄的 skill gateway，**FastMCP** 和 **MCP Framework** 都很好理解。  
如果你要把 MCP 能力直接嵌進既有 Next.js / Express / NestJS app，**xmcp** 的 adapter 思路就很有吸引力。  
如果你本來就是 Spring Boot 微服務世界，**Spring AI MCP Server** 幾乎是另一個等級的自然選擇。

### 2. 你主要在解「tool exposure」，還是在解「platform integration」？

有些團隊只需要把幾顆工具穩定暴露出去。  
有些團隊則是要：

- 接 auth
- 接既有 middleware
- 接 observability
- 接 deployment pipeline
- 接組織內部治理

這兩種需求長得不一樣。  
前者會偏向 FastMCP 這種很薄、很快、很直接的 server 取向。  
後者則比較容易被 xmcp 或 Spring AI 這種更完整的 app / platform 導向吸引。

### 3. 你需要的 auth 是示範等級，還是 production 等級？

官方 MCP 規格現在已經把 HTTP-based authorization 寫得很清楚，remote MCP server 不是「有個 URL 就好」，而是要面對受保護資源、token、resource server 這些事。  
所以如果你真的準備把 server 對外公開，auth 不再是可以最後再補的配菜。  
這也會直接影響你怎麼看待 framework。

### 4. 你要的是「開發很爽」，還是「六個月後還看得懂」？

這題沒有標準答案，但一定要先問。  
有些框架會讓你三十分鐘就有東西跑起來。  
有些框架則是在你一個月後回來改 auth、versioning、transport、tool metadata 的時候，才開始顯出差別。

## 四個框架放在同一張圖上看

| 維度 | FastMCP | MCP Framework | xmcp | Spring AI MCP Server |
|---|---|---|---|---|
| 主要語言 | Python | TypeScript | TypeScript | Java |
| 心智模型 | thin server / thin gateway | 傳統框架 | web-native framework | enterprise platform |
| 適合獨立 server | 很適合 | 很適合 | 適合 | 適合 |
| 適合嵌進既有 web app | 中等 | 中等 | 很強 | 取決於你本來就用 Spring |
| transport 取向 | local + remote 都順 | stdio + HTTP Stream | HTTP / stdio + adapters | stateless / streamable HTTP / annotations |
| auth 取向 | framework 內建能力持續成長 | 文件與框架層支持明確 | middleware + auth plugins | Spring Security / Spring 生態 |
| 適合的團隊 | Python / AI tooling | TS backend 團隊 | TS full-stack / platform 團隊 | Java / enterprise 團隊 |
| 我的感受 | 最像「工程務實派」 | 最像「框架派」 | 最像「現代 DX 派」 | 最像「企業平台派」 |

![Decision matrix for choosing an MCP framework](./resource/build-your-own-mcp-server-part-3-02-decision-matrix.svg)

## 四條路各自長什麼樣

## 1. FastMCP：如果你想要的是一個薄、清楚、可治理的 Python MCP layer

FastMCP 的吸引力很直接。  
它的核心承諾是：你把 Python function 寫好，它幫你處理 schema、validation、transport、protocol lifecycle 這些 MCP 該有的麻煩事。官方也明講它的目標是讓你從 prototype 走到 production，而不是只做本地 demo。這也是我最後選它的主要原因之一。

### 最像它的使用情境

- 你本來就熟 Python
- 你要做的是一層很薄的 server
- 你希望把 Make、internal APIs、vector search、資料表查詢等東西包成高層 tools
- 你要的是 **thin skill server**，不是整個 web platform

### 最小可用示意

```python
from fastmcp import FastMCP

mcp = FastMCP("job-skill-server")

@mcp.tool
def query_jobs(keyword: str, min_score: int = 80) -> dict:
    """Return shortlist-friendly jobs from the stored pool."""
    return {
        "keyword": keyword,
        "min_score": min_score,
        "matched_count": 3
    }

if __name__ == "__main__":
    mcp.run()
```

### 什麼時候它特別合理

對我這次的 v3 來說，我不是要重寫整個執行層。  
我只是想做一層：

- 讀 skills
- 暴露 skill-level tools
- 擋掉不該公開的 helper
- 把 skill 呼叫翻譯成 Make webhook

這種時候，FastMCP 很剛好。  
它不會逼你先進入一個很重的框架世界，但也不是只給你一把低階 SDK 匕首然後叫你自己開荒。

### 安裝與版本建議

```bash
uv pip install fastmcp
```

如果你準備上 production，我很建議直接 **pin 版本**，不要用寬鬆的 `>=`。  
FastMCP 官方文件自己也提醒，因為 MCP 生態還在快速變，production 應該鎖 exact version。

## 2. MCP Framework：如果你想用 TypeScript，而且想要「像框架」的感覺

MCP Framework 的氣質和 FastMCP 不太一樣。

FastMCP 比較像「讓你很快做出一顆 server」。  
MCP Framework 比較像「讓你進入一個完整、有慣例、有 CLI、有 component discovery 的 TypeScript 框架世界」。

官方文件把它的賣點講得很清楚：

- automatic discovery
- CLI scaffolding
- stdio / SSE / HTTP Stream
- built on the official MCP SDK
- auth for remote endpoints

### 典型起手式

```bash
npm install -g mcp-framework
mcp create my-mcp-server
cd my-mcp-server
npm install
```

### 最小風格示意

```ts
import { MCPServer, MCPTool } from "mcp-framework";
import { z } from "zod";

class QueryJobsTool extends MCPTool {
  name = "query_jobs";
  description = "Return shortlist-friendly jobs from the stored pool.";

  schema = z.object({
    keyword: z.string(),
    min_score: z.number().default(80),
  });

  async execute(args: { keyword: string; min_score: number }) {
    return {
      keyword: args.keyword,
      min_score: args.min_score,
      matched_count: 3,
    };
  }
}

const server = new MCPServer();
server.start();
```

### 我怎麼看它

如果你是 TypeScript backend 團隊，而且希望：

- 專案結構有框架幫你立骨架
- 新人加入比較容易理解
- transport / auth / debugging 有比較完整的官方路徑
- 你想做的是「正式 MCP server」，不是把一段 handler 勉強接成工具

那 MCP Framework 很值得看。  
它對遠端 transport 的態度也比很多輕量方案更明確。

### 它的代價

代價是：你要接受比較明顯的框架主張。  
如果你偏好的是非常 web-native、非常 file-based、非常 adapter-first 的開發方式，那你可能會更喜歡 xmcp。

## 3. xmcp：如果你想把 MCP server 長進現代 web app，而不是獨立擺一顆

xmcp 是四者裡最有「現代 TypeScript web framework」味道的一個。

它的官方文件一直在強調幾件事：

- 快速 scaffold
- file-based experience
- transports out of the box
- adapters for Next.js / Express / NestJS
- authentication plugins
- deployment to Vercel 等平台

這種味道跟 MCP Framework 很不一樣。  
MCP Framework 比較像在說「我是一個 MCP 專用框架」。  
xmcp 更像在說「把 MCP 能力自然地接進你已經熟的 web app 世界」。

### 起手式

```bash
npx create-xmcp-app@latest
```

### 一個很 xmcp 的例子

```ts
// src/tools/query-jobs.ts
import { z } from "zod";

export const schema = z.object({
  keyword: z.string(),
  min_score: z.number().default(80),
});

export default async function queryJobs({
  keyword,
  min_score,
}: {
  keyword: string;
  min_score: number;
}) {
  return {
    keyword,
    min_score,
    matched_count: 3,
  };
}
```

如果你要接既有 Express app，官方文件甚至直接給出這種路徑：

```ts
import { xmcpHandler } from "./.xmcp/adapter";

app.get("/mcp", xmcpHandler);
app.post("/mcp", xmcpHandler);
```

### 它最強在哪裡

它不是只讓你做 MCP server。  
它是讓你把 MCP server 變成你現有應用的一部分。

所以如果你的環境是：

- Next.js app
- Express app
- 想走 plugin / middleware / auth integration
- 想把部署交給 Vercel 或既有 JS 平台
- 團隊本來就是 full-stack TypeScript

那 xmcp 的吸引力會非常高。

### 它真正的代價

它的代價不是「不好」，而是它很容易讓你一路往 app platform 的方向走。  
如果你的目標只是做一層很薄的 skill gateway，這種能力有時反而太多。

## 4. Spring AI MCP Server：如果你活在 Spring 世界，這幾乎不是選擇題

如果你是 Java / Spring Boot 團隊，Spring AI MCP Server 的優勢不是「它功能比較酷」，而是：

> **你幾乎不用改變整個組織慣性，就能把 MCP 變成現有平台能力的一部分。**

Spring AI 官方文件現在對 MCP 已經提供：

- MCP overview
- streamable HTTP server starter
- stateless server starter
- annotations
- Spring beans 自動轉 tool specs

### 一個 annotation 風格示意

```java
@Component
public class JobTools {

    @McpTool(name = "query-jobs", description = "Return shortlist-friendly jobs")
    public String queryJobs(
            @McpToolParam(description = "Keyword", required = true) String keyword,
            @McpToolParam(description = "Minimum score", required = false) Integer minScore) {
        return "keyword=" + keyword + ", minScore=" + minScore;
    }
}
```

### 什麼時候它最合理

- 你已有 Spring Security
- 你已有 Boot starter、配置中心、observability
- 你想讓 MCP server 長進既有微服務體系
- 你需要的是組織級可維運性，而不是單兵最短路

### 它不是最適合每個人的原因

如果你只是想做一顆 skill gateway，把幾個 backend tools 包起來給 ChatGPT 用，那這條路通常偏重。  
你會得到很多企業級能力，但也要接受更高的啟動成本。

## 那我為什麼最後還是選 FastMCP

因為我的問題不是「怎麼在現有 web app 裡多一個 MCP route」，也不是「怎麼把 MCP 做進企業平台」。

我的問題比較具體：

- 我想在 Oracle VM 上自己架一顆 remote MCP server
- 我想接 GitHub 上版本化的 skills
- 我想把 Make 留在後面當 execution layer
- 我只想暴露幾顆高層 skill tools
- 我想保留足夠薄的 server，不想太早把 orchestration 腦又塞回去

這組前提下，FastMCP 是最對味的。  
不是因為它最潮，而是因為它最像我需要的那種東西：

> **一個薄、清楚、足夠 production-minded，但不會逼我先搭完整 app platform 的 MCP server framework。**

![Four framework routes and their deployment gravity](./resource/build-your-own-mcp-server-part-3-03-deployment-gravity.svg)

## 我的選型判準，給你直接拿去用

如果你也在選，我會建議你直接用這個順序問：

### 選 FastMCP，如果你符合這些條件
- 你主要是 Python
- 你要的是 thin gateway
- 你需要自己控 server 對外暴露哪些工具
- 你不想被 web framework 綁太深

### 選 MCP Framework，如果你符合這些條件
- 你主要是 TypeScript backend
- 你想要完整框架感
- 你要 stdio 和 remote transport 都清楚
- 你希望 CLI / discovery / auth 有比較完整的框架支持

### 選 xmcp，如果你符合這些條件
- 你主要是 TypeScript full-stack
- 你想把 MCP 嵌進 Next.js / Express / NestJS
- 你很重視 adapter / middleware / plugin / deployment DX
- 你不想把 MCP server 當成完全獨立服務

### 選 Spring AI MCP Server，如果你符合這些條件
- 你本來就在 Java / Spring 生態
- 你有企業級維運要求
- 你需要和 Spring Security / Boot / bean lifecycle 深整合
- 你要的不是薄 server，而是平台能力

## 一個反例：不要因為「文件看起來最完整」就直接選最重的

我想刻意放一個反例。

很多人看到 Spring AI 或一些 enterprise-friendly 路線，會很自然地覺得這比較成熟、比較安全。  
這不一定錯，但它不代表適合你現在這一題。

如果你的 MCP server 其實只是：

- 藏住一堆 backend execution tools
- 暴露三到五顆高層 capabilities
- 對外接 ChatGPT / Claude
- 你只想先把 contract 與 tool surface 理順

那你先上最重的框架，常常只是在提早背 organisation tax。

有些系統真正需要的不是企業平台，而是先有一層薄、清楚、可治理的 interface。

## 我對框架選型的最後一句話

我現在越來越不相信「哪個 framework 最好」這種問法。  
我比較相信這一句：

> **選 MCP framework，不是在選功能最多的那個，而是在選哪一種責任分工最貼近你真正要建的 server。**

如果你建的是平台，就選平台。  
如果你建的是 gateway，就選 gateway。  
如果你建的是 app extension，就選最會嵌進 app 的那條路。

下一篇我會接著講另一個更容易被誤會、但其實超級關鍵的主題：

> **skills 是什麼，以及 skills 架構到底該怎麼設計。**

因為真正讓系統變得比較「像人話」、比較可治理的，很多時候不是 framework 本身，而是你怎麼把能力邊界整理成 skill layer。

![Selection checklist for choosing an MCP framework](./resource/build-your-own-mcp-server-part-3-04-selection-checklist.svg)
