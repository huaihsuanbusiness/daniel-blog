---
title: "MCP 工程深化 03：Contract design / schema discipline / versioning 決定工具能不能長大"
description: "Part 03 of the MCP Engineering Deep Dive series."
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-03-31T20:12:00
featured: false
subtitle: "真正難維護的 MCP 伺服器，不是 tool 太少，而是 contract 太鬆。當你開始面對多 client、版本演進、helper tool 與 public tool 並存時，schema discipline 才是穩定性的主角。"
---

很多團隊第一次寫 MCP tool 時，注意力都放在「功能能不能跑」。

這很正常。  
但只要系統開始長大，你很快就會發現，真正難的不是寫出下一個工具，而是回答這些問題：

- 這個輸入欄位到底代表什麼？
- `null` 和空字串一樣嗎？
- 這個錯誤 client 能不能穩定分支？
- 如果我要改名字、改意義、改 side effect，到底算不算 breaking change？
- 這支 tool 是 helper 還是 public contract？
- host 現在會看到哪個版本？
- 舊 client 升級慢時，我是不是得同時養兩套 schema？

這些都不是「程式碼風格」問題。  
它們是 **contract design** 問題。

一旦你的 server 開始被多個 client、不同 host、不同版本、甚至不同團隊使用，真正決定系統可不可以演進的，通常不是邏輯本身，而是：

> **你的 tool contract 到底有多穩。**

![Contract before code](./resource/mcp-engineering-deep-dive-03-01-contract-before-code.svg)

## 先講結論：在 MCP world，schema 不是文件附錄，而是行為邊界

MCP 規範把 TypeScript schema 視為 protocol 的 source of truth，JSON Schema 則是從它生成。這個設定其實很有啟發性：在這個世界裡，schema 不是事後補的說明書，而是**互通性本身的一部分**。工具層也一樣。tool name、description、input schema、output 結構、error shape，會一起影響 host 怎麼列出工具、模型怎麼選工具、client 怎麼生成參數、以及你未來怎麼安全地演進它。  

所以如果你把 schema 當成「反正之後再修」的東西，你不是只在欠文件債。  
你其實是在欠**執行邊界債**。

## 第一層：好的 contract 不是多寫幾個欄位，而是把語意釘死

一支 tool 的第一個工作，不是表現自己很彈性。  
它的第一個工作是讓別人**不需要猜你原本想的是什麼**。

### 壞 contract 常見長相
- 欄位名稱太泛，例如 `type`、`data`、`value`
- 同一個欄位在不同狀況下代表不同意義
- 輸入全部 optional，實際上卻有隱形前提
- 空字串、缺值、`null` 混在一起
- 錯誤全部回成自然語言
- helper 內部欄位直接外漏給 public client

### 比較健康的 contract 長相
- 名稱清楚對應一個概念
- required / optional 分工明確
- side effect 可被描述
- error 能被 machine branch
- 回傳結構穩定，不靠 prose 理解

這裡最容易被低估的一點是：  
**模型也是 schema 的使用者。**

如果 schema 太鬆，模型就要猜。  
如果 schema 太亂，模型就會用奇怪的方式補完。  
如果 schema 太 chatty，host 端的穩定性就會下降。

![Schema discipline reduces model guesswork](./resource/mcp-engineering-deep-dive-03-02-schema-discipline.svg)

## 第二層：Schema discipline 不是為了好看，而是為了降低 runtime 猜測

很多人會把 schema discipline 想成「型別控的偏執」。  
我現在反而覺得，它是一種很務實的 reliability 投資。

### 為什麼？
因為 MCP 工具不是只有工程師手動打 API。  
它還會被：

- host 列出
- 模型閱讀 metadata
- 模型依 schema 生成 arguments
- client 根據 output 決定下一步
- 其他工具鏈再包一層使用

這表示一個鬆散 schema 帶來的問題不是只有「程式碼醜」，而是：

- 模型不知道哪個欄位最重要
- client 不知道錯誤能不能重試
- downstream 不知道可以安全依賴什麼
- 未來改版時不知道哪裡算 breaking

### 我自己現在比較信幾個規則

#### 規則 1：一個欄位只承擔一個概念
例如：
- `job_id` 就是 job id
- 不要讓它有時候放純 id，有時候放 URL，有時候放「模糊參照」

#### 規則 2：能 enum 就不要 folklore string
只要一個欄位的可能值其實有限，就不要任由它變成大家口口相傳的 magic string。

#### 規則 3：不要把 helper 內部資料偷偷混進 public output
這會讓 public contract 看起來很豐富，但長期很難維護。  
因為你會開始不確定哪些欄位真的被依賴。

#### 規則 4：error code 要先於 error prose
自然語言錯誤可以保留。  
但真正可依賴的是結構化 code 與可預期欄位。

## 第三層：Versioning 不是禮貌，它是多 client 世界裡的生存能力

只要你的 MCP server 開始有：

- 多個 host
- 多個 client
- beta / stable 並行
- internal helper 與 public tool 共存
- 不同 release cadence

versioning 就不再是「之後再說」的問題。  
它會變成一個很務實的工程問題：

> **我今天改這個工具，誰會壞？**

MCP 本身的 protocol versioning 用日期字串來標示 backward incompatible changes，並維持一套清楚的版本語意。這件事對工具設計也很有啟發：不是每次調整都要暴力開新名字，但每一個 breaking change 都應該被明確管理。FastMCP 現在也已經支援 component versioning，讓同一份 codebase 可以同時服務不同版本的工具。這表示版本管理在 MCP 世界裡不是理論課，而是實際可運作的能力。  

![Versioning map](./resource/mcp-engineering-deep-dive-03-03-versioning-map.svg)

### 哪些變更通常是安全的 additive changes
- 新增 optional field
- 新增補充 metadata
- 新增不破壞舊邏輯的 enum value
- 讓輸出更完整，但不改變舊欄位語意

### 哪些通常是 breaking changes
- 改欄位名稱
- 改欄位意義
- 把 optional 變 required
- 改 side effect
- 把原本穩定的 output shape 改掉

### 我現在比較喜歡的版本策略
不是每次都直接砍掉重練，  
而是：

- additive change 先走原工具
- breaking change 用 versioned tool 或新工具並存
- 給 migration window
- 在 references / docs / examples 裡同步更新

這件事看起來多做了一點文書。  
但實際上，你是在替未來少掉很多「為什麼昨天可以、今天不行」的 debug 時數。

## 第四層：Public tool 與 helper tool 混在一起時，contract 特別容易漂

這是我很想特別講的一個坑。

當一個 server 同時有：
- public tools
- internal helper tools
- orchestration-only transforms
- output formatting helpers

contract 很容易開始漂。  
因為你會不知不覺地把 internal assumptions 帶進 public surface。

例如：
- 把內部 trace 欄位直接塞進 public output
- 把 only-for-router 的欄位保留在 schema 裡
- 用內部命名慣例命名 public parameters
- 為了方便 server 內部拼裝，讓 public output 長得非常不自然

長期下來，這會造成一種很麻煩的狀況：

> **你以為自己有很多可組合的工具，實際上你有的是一批帶著內部假設外漏的工具。**

所以 public contract 的一個重要原則是：  
**讓 public tool 對外只說它該說的話。**  
helper 的細節，應該留在 helper 層。

## 一個比較健康的 contract review checklist

每次要新增或改一支工具時，我現在比較喜歡先問這幾題：

1. 這支工具的主語意是一句話講得清楚的嗎？
2. 欄位名稱是不是另一個工程師第一次看也能猜對？
3. `null`、空字串、缺值有沒有被刻意區分？
4. 錯誤能不能用 code 分流，而不是只能看 prose？
5. 如果今天有舊 client，這個改動會不會讓它壞掉？
6. 這是 public contract，還是 internal helper contract？
7. 這次 release 要不要更新 examples、golden prompts、references？

![Contract review checklist](./resource/mcp-engineering-deep-dive-03-04-contract-review-checklist.svg)

## 一個最小但比較像樣的 FastMCP 工具形狀

下面這個例子只是示意，但它抓的是我現在比較在意的方向：  
名稱清楚、輸入明確、輸出有穩定 shape、錯誤可 branch。

```python
from pydantic import BaseModel, Field
from fastmcp import FastMCP

mcp = FastMCP("Job Tools")

class QueryJobsInput(BaseModel):
    keyword: str = Field(..., description="Search keyword for job lookup")
    min_score: int | None = Field(default=None, ge=0, le=100)
    top_k: int = Field(default=10, ge=1, le=50)

@mcp.tool
def query_jobs(params: QueryJobsInput) -> dict:
    return {
        "status": "ok",
        "data": {
            "items": [],
            "count": 0
        },
        "error": None
    }
```

真正重要的不是 pydantic 本身。  
而是這個工具已經開始回答：
- 什麼欄位是必要的
- 範圍在哪裡
- 回應長什麼樣
- client 可以依賴什麼

## 這篇最想留下的一句話

在 MCP 世界裡，工具不是因為能跑就成熟。  
它是因為：

- 語意夠清楚
- schema 夠穩
- error 可分流
- 版本能演進
- public 與 helper 邊界夠乾淨

才真正變成一份可以長期依賴的 contract。

也就是說：

> **工具能不能長大，通常不是由程式碼決定，而是由 contract discipline 決定。**
