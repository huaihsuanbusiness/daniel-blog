---
title: "MCP 工程深化 02：Security / auth / public server hardening 不是補丁，而是產品邊界"
description: "Part 02 of the MCP Engineering Deep Dive series."
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-03-31
featured: false
---

**副標：如果你的 MCP server 會對外、會寫資料、會碰到真實使用者，那安全就不是最後一層 middleware，而是從工具暴露面、認證流、授權範圍到回應內容都必須一起設計的系統邊界。**

很多人第一次把 MCP server 對外公開時，腦中浮現的安全清單通常長這樣：

- 把 HTTPS 打開
- 加一個 API key
- 看起來能擋掉未授權請求
- 出事再補 rate limit
- 有需要再加 OAuth

這套順序不是完全錯。問題是，它很容易讓你把安全想成**部署完成後才補上的殼**。  
對公開 MCP server 來說，這種想法通常太晚。

因為只要你的 server 真的對外，安全問題就不只存在於登入那一層。  
它同時存在於：

- 模型可以看見哪些 tools
- 哪些 tools 只是 helper，哪些才應該公開
- 認證證明了誰的身分
- 授權決定了他可以做什麼
- proxy、edge、header forwarding 會不會扭曲你的假設
- 錯誤訊息是不是正在洩漏你不打算公開的內部結構

也就是說，**security 不是 patch，它是 public MCP server 的產品邊界。**

![Security starts at the tool surface](./resource/mcp-engineering-deep-dive-02-01-security-is-surface-area.svg)

## 先講結論：如果你的 MCP server 是 public server，就不要用「先通再補」的節奏來想安全

MCP 官方的 security best practices 本來就不是把安全寫成單一 auth 教學。它明確把 prompt injection、confused deputy、token passthrough、tool safety、least privilege、和 consent 等風險一起列進去。OpenAI 的 ChatGPT developer mode 文件也直接提醒，developer mode 提供完整 MCP client support，但它同時是危險模式，你必須自己承擔 prompt injection、模型誤判、以及惡意 MCP 的風險。FastMCP 這邊則已經把 authentication、authorization、middleware、以及更細的 component-level / server-level auth 都視為 production concerns。這幾件事放在一起看，意思很清楚：

> **真正的 public MCP server，不是「我有 auth」就算安全，而是「我的暴露面、權限、工具行為、與回應邊界」都被設計過。**

## 第一層：先縮小 public surface，而不是一開始就把所有東西暴露成 tool

這是最容易被忽略的一層。

很多團隊剛開始做 MCP 時，因為很想讓 host 看見「能力很多」，會直覺把所有可呼叫功能都公開成 tools。  
但這裡有一個很務實的問題：

> **模型能看見的東西，本身就是攻擊面。**

如果某個工具只適合 server 內部串接，或者只是一個解析、轉換、補資料的 helper，它未必要被列入 public tool list。  
公開工具數量越多：

- host 的選擇空間越大
- 模型選錯工具的風險越高
- 你需要保護的操作面越大
- auth / authz policy 也會更複雜

MCP 規範也提醒，client 不應把 tool annotations 當成可信真理，因為 metadata 本身未必可信。這再往前推一步，其實就是：**不要把工具暴露面設計成依賴好運。**

### 我的判準是這樣
如果某個能力屬於以下其中一種，我通常會先傾向不公開：

- 只給其他 server-side flow 用的 helper
- 輸入輸出很醜、只適合內部拼裝的工具
- 需要太多上下文才安全的工具
- 寫入性太強，但目前還沒有夠成熟的 authz 邊界
- 容易被 prompt injection 騙去做錯事的工具

公開 tool list 不是 feature checklist。  
它比較像是：**你願意讓模型看到、理解、並嘗試調用的最小能力面。**

![Authentication and authorization are different jobs](./resource/mcp-engineering-deep-dive-02-02-auth-vs-authorization.svg)

## 第二層：Authentication 和 authorization 是兩份工作，不要混成一團

這是另一個經典坑。

很多專案會說：

> 我們已經有 token 了。  
> 所以應該安全了。

這句話只說明了一件事：**你可能知道對方是誰。**  
它完全沒有說明：**他能做什麼。**

### Authentication 在回答
- 這個 request 是誰發的？
- token 合不合法？
- audience、issuer、expiry 對不對？

### Authorization 在回答
- 這個 actor 能不能列出某個工具？
- 能不能讀這個 resource？
- 能不能執行這個 tool？
- 能不能做寫入、刪除、或高成本操作？

FastMCP 3.x 已經把 authorization 拆得很清楚：你可以做 server-wide policy，也可以做 component-level auth，甚至讓 list responses 本身就先被過濾。這種設計很重要，因為真正健康的 public server，不應該等到執行工具那一刻才告訴你「其實你不該看見這個」。  

### 一個很實用的原則
- **Authentication** 決定是否進門
- **Authorization** 決定進門之後能走到哪裡
- **Tool surface design** 決定你這棟建築到底有幾個入口

少掉任何一層，系統都會變脆。

## 第三層：public server hardening 不是只看 app，而是看整條路徑

當你把 server 放到公網之後，安全就不再只是 app code 的事。  
它變成一條端到端鏈路：

- DNS / CDN / edge
- TLS termination
- reverse proxy
- header forwarding
- origin app
- auth middleware
- tool execution
- response shaping

只要其中一段假設錯了，你的安全模型就會漂掉。

### 這也是為什麼我現在會把 hardening 分成五層

#### 1. Edge layer
這一層處理的是：
- TLS
- 基本流量保護
- bot / abuse 初步阻擋
- 公網入口的健康狀態

#### 2. Proxy layer
這一層處理的是：
- `/mcp` path 是否被正確保留
- Authorization header 是否真的傳到 origin
- timeout / buffering / request body 行為
- upstream 錯誤會不會被吃掉或改寫

#### 3. Server layer
這一層處理的是：
- auth middleware
- scope / role checks
- request validation
- logging / tracing / rate limiting

#### 4. Tool layer
這一層處理的是：
- 哪些工具公開
- 哪些工具只讀
- 哪些工具有副作用
- 是否有高成本工具需要額外 guardrail

#### 5. Response layer
這一層處理的是：
- 錯誤訊息是否可被 client 穩定處理
- 是否洩漏 stack trace 或內部 route
- 是否回傳多餘敏感欄位
- 是否過度 verbose，讓模型拿到它不該知道的東西

![Public server hardening checklist](./resource/mcp-engineering-deep-dive-02-03-public-server-hardening.svg)

## Prompt injection 對 public MCP server 的風險，比很多人想得更靠近 execution

這一點很值得單獨講。

只要模型會根據外部內容決定要不要調工具，prompt injection 就不是「聊天內容髒髒的」而已。  
它可能直接影響：

- 工具選擇
- 權限濫用
- 對寫入工具的誤觸發
- 敏感資源的暴露順序
- 模型是否被誘導去拿多餘資料

MCP 官方 security guidance 也特別點出這類風險。  
所以如果你有 public server，我會建議你至少做到這幾件事：

- 把高風險寫入工具跟讀取工具分清楚
- 讓 dangerous tools 的 schema 更嚴格
- 在 response 裡不要回傳會讓下一輪更容易被利用的過量細節
- 對高權限工具做額外 authz，而不是只靠模型判斷

換句話說，**你不能把 tool safety 外包給模型的善良。**

## 我現在比較信的一套做法：先縮暴露面，再做權限，再做觀測

如果要把整件事濃縮成一套工程順序，我現在會這樣做：

1. **先縮 public surface**  
   不要急著把 helper 全部公開。

2. **再把 authn / authz 切乾淨**  
   認證負責身分，授權負責可做的事。

3. **最後補觀測與治理**  
   logging、tracing、rate limiting、golden prompts、以及實際 host 測試。

這個順序比「先上線，再一路打補丁」健康得多。  
因為它承認了一件很現實的事：

> **MCP server 一旦公開，它就不是單純的 Python app，而是一個會被模型、host、proxy、與使用者共同影響的執行邊界。**

![A practical security decision ladder](./resource/mcp-engineering-deep-dive-02-04-security-decision-ladder.svg)

## 一個最小但比較健康的 FastMCP 方向

下面這段不是要你直接複製進 production，而是示意一個比較健康的思路：  
把 authentication、authorization、以及精簡工具暴露面一起想。

```python
from fastmcp import FastMCP
from fastmcp.server.middleware import AuthMiddleware
from fastmcp.server.auth import require_scopes

mcp = FastMCP("Example Public Server")

mcp.add_middleware(
    AuthMiddleware(
        auth=lambda ctx: ctx.has_scope("mcp:read")
    )
)

@mcp.tool
@require_scopes("jobs:read")
def query_jobs(keyword: str, top_k: int = 10) -> dict:
    # strict validation + bounded response
    ...
```

真正的重點不是 decorator 本身，而是：

- 你已經先想清楚哪個 tool 應該存在
- 哪個 scope 應該能看見它
- 回傳結果要不要再裁切
- 哪些高權限操作應該另外拆出去

## 這篇最想留下的一句話

很多人把 public MCP server 的安全想成：

> **如何保護一個 MCP app**

但我現在更傾向這樣想：

> **如何替模型與外部世界之間，畫出一條不會因為一個 token 就全部鬆掉的執行邊界。**

這條邊界，才是 security、auth、hardening 真正要處理的事。
