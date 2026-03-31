---
title: "MCP 工程深化 04：skills 與 runtime selection 不是一回事"
description: "Part 04 of the MCP Engineering Deep Dive series."
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-03-31
featured: false
---

**副標：repo 裡有 skill，不等於 runtime 真的會照它選工具。真正決定模型怎麼選的，常常是你最後暴露出去的 tool surface、session 看到的 inventory，以及 server instructions 與 schema 是否彼此一致。**

我這篇想寫的，不是「skills 很重要」這種誰都會點頭的句子。

我想寫的是另一件更容易在實作裡踩爆的事：

> **你把 skill 檔案寫好，不代表模型 runtime 真的會照那套邏輯走。**

這個認知不是我在文件裡看到的，而是我真的撞了一次牆才學會的。

最早讓我警覺的請求很簡單：

> 幫我把沒打分的都打分。

我原本期待的是：
- 走 `job_scoring`
- 只做 score-only
- 不重新抓最近職缺

結果實際上，runtime 卻跑去更像 ingestion 的路徑。那一刻我才真正意識到，**skills、tool metadata、live session inventory、runtime selection** 根本不是同一層東西。

![Skill assets are not the same thing as runtime selection](./resource/mcp-engineering-deep-dive-04-01-skill-vs-runtime.svg)

## 先講結論：skill 是資產層，不是自動存在的 routing gate

FastMCP 現在確實提供了 skills utilities，能列出、下載、同步 skill 資產；它甚至透過 `skill://{name}/SKILL.md` 這種 URI 形式，讓 skill 可以被 discover。可是這件事描述的是**技能資產如何被發現與取得**，不是「模型一定會先讀完 skill 再做工具選擇」。

而 MCP 規範真正定義給模型看的第一等公民，仍然是 **tools**。官方規格對 tools 的描述很直接：tool 會有唯一名稱與 schema metadata，而模型就是透過這個 surface 去理解它能做什麼。OpenAI 的工具設計指南也很白話地提醒你：**description 要簡潔明確，因為模型會根據 description 決定要送什麼**。

所以我後來比較穩的心智模型是：

- **skill**：策略資產、知識資產、邊界文件
- **tool**：runtime 真正會被列出與呼叫的能力表面
- **server instructions**：給 host / model 的操作手冊
- **provider / inventory**：現在這個 session 真正看得到哪些東西

只要這四層沒有對齊，你的模型就很可能表面看起來懂你的 skill，實際上還是在照另一套訊號選工具。

## 我最後把問題拆成四層，事情才開始變清楚

我現在最常用的一張 debug 地圖，是把這整件事拆成四層。

### 第 1 層：repo 裡的 skill 資產
這一層是你寫在 GitHub 的東西：
- `manifest.yaml`
- `instructions.md`
- `examples.md`
- `eval-notes.md`
- router policy / fallback policy

它們非常重要，因為這一層決定你對能力邊界的**設計意圖**。

### 第 2 層：server 實際暴露的 tool surface
這一層是模型真的會看到的東西：
- tool name
- description / docstring
- input schema
- output shape
- 哪些 tool 被列出

這一層才是 runtime 每一輪都會直接接觸的介面。

### 第 3 層：live deployment 與 session inventory
這一層是很多人會忘的：
- 你是不是已經部署新版 code
- tool inventory 是不是刷新了
- ChatGPT 這個 session 看到的是不是最新版本
- 你是不是其實還在用舊的 metadata

### 第 4 層：模型當下的 runtime selection
這一層才是最後發生的行為：
- 這輪到底列出了哪些 tool
- 哪個 tool 最像這個 request
- 哪個 schema 看起來最能接住這個意圖
- server instructions 有沒有真的幫上忙

![The four layers that shape runtime selection](./resource/mcp-engineering-deep-dive-04-02-four-layers.svg)

這四層一旦拆開來看，很多「模型怎麼這麼笨」的抱怨，其實都會改寫成比較有用的工程問題：

- 是 skill 沒寫清楚？
- 還是 tool description 在釋放相反訊號？
- 還是 session 還沒刷新？
- 還是這兩個工具從 schema 上看起來太像？

## 技術上真正影響 routing 的，常常不是你寫給人看的文件

OpenAI 在工具設計指引裡有一句很值得抄在白板上：

> **Write concise, explicit tool descriptions. The model chooses what to send based on your description.**

這句話聽起來像寫作建議，但其實是 runtime 行為建議。

因為一旦模型拿到的是：
- 一顆叫 `job_ingestion` 的工具
- 參數裡有 `force_rescore`
- description 又沒有清楚說它不是 score-only path

那它把「補打分」理解成 ingestion 路徑，反而是很合理的。

也就是說，**skill 文件裡就算有寫清楚，tool schema 和 description 仍然可以把模型往另一邊拉走**。

### 一個典型的誤導長相

```yaml
name: job_ingestion
input_schema:
  type: object
  properties:
    source_site:
      type: string
    days:
      type: integer
    page_from:
      type: integer
    page_to:
      type: integer
    force_rescore:
      type: boolean
```

如果這顆 tool 對外長這樣，它在模型眼裡就像一把非常萬用的瑞士刀。

### 比較健康的分法

```yaml
name: job_scoring
public: true
allowed_backend_tools:
  - v2_tool_bulk_score_new_jobs
guardrails:
  - Do not fetch recent jobs in this skill.
  - Do not claim a fetch or refresh happened in this path.
```

上面這段其實就是你 repo 裡 `job_scoring` manifest 的重點精神：**score-only 就是 score-only**。這種 guardrail 一旦 manifest、server docstring、tool schema、examples 都一起對齊，runtime 才比較不會漂移。

## repo 裡有 deterministic policy，不等於 live path 真的照它跑

你在 `router/skill-selection-policy.md` 裡，其實已經把第一版 skill-first routing 的規則寫得很清楚了：
- 先選一個 public skill
- `job_decision_support` 優先於 `job_scoring`
- `job_scoring` 優先於 `job_ingestion`
- `job_querying` 是比較廣的讀取型路徑
- v1 應避免自動多 skill chaining

這份 policy 很有價值，因為它替「系統應該怎麼想」先做了 deterministic 边界。

但我要很誠實地說，**有這份 policy，不代表 live runtime 就一定走這條路**。

原因很簡單：
- policy 是 repo 裡的設計意圖
- runtime 選擇是當下 session 對可見 tool surface 的反應

如果你沒有把 policy 真的實作成：
- 只暴露對應 skill 的 backend tool
- 或在 gateway 先做 deterministic gating
- 或使用 `allowed_tools` / visibility filtering 把不該看到的工具藏起來

那這份 policy 仍然比較像架構備忘錄，而不是生效中的交通號誌。

## 真正有用的做法，不是一直補 prompt，而是重畫能力邊界

這是我這次最確定的一個 lesson learned。

如果一個 request 長期被誤導，不要第一時間只怪模型。先問這三件事：

1. **是不是兩顆工具從模型角度看太像？**
2. **是不是 public surface 混進了不該暴露的底層能力？**
3. **是不是 skill、tool description、schema、examples 沒有多層一致？**

### 後來我比較相信的修法

#### 修法 1：一個 public tool 只承擔一種主要意圖
- `job_ingestion` 就處理 refresh / fetch
- `job_scoring` 就處理 score-only / backfill
- `job_querying` 就處理 shortlist / filter / rank
- `job_decision_support` 就處理單一職缺深度輸出

#### 修法 2：helper 永遠不要假裝是 public skill
像 `resolve_job_reference` 這種東西非常重要，但它應該是 internal helper，不應該直接出現在模型的 public tool surface 上。

#### 修法 3：manifest、docstring、schema、examples 要一起改
如果你只改其中一層，系統就還是會像破音吉他一樣，某幾個頻段持續走音。

![The fix is boundary redesign, not just prompt tweaking](./resource/mcp-engineering-deep-dive-04-03-boundary-fix.svg)

## 一個比較務實的開發流程

如果你也想把 skills 寫進 FastMCP / MCP server，而不是停在 repo 漂亮、runtime 亂走，我現在比較推薦這個流程。

### Step 1：先寫 skill manifest，不要先寫 tool docstring
先把這幾件事寫清楚：
- 這顆 skill 的 public name 是什麼
- 它處理的 user intent 是什麼
- 它允許哪些 backend tools
- 明確不要做什麼
- 缺哪些 context 要 fail

### Step 2：把 server tool surface 對齊 manifest
- tool name 要和 skill boundary 一致
- description 要直接講它做什麼，不做什麼
- schema 不要留會誤導的萬用參數
- 如果需要 hidden helper，就不要把它公開列出

### Step 3：重啟 server，重新建立 session
不要假設 code 改了，session 就自動看到新版 inventory。

### Step 4：用最小 client 驗證 inventory
我很推薦用最小客戶端先看 list_tools / list_skills，而不是一開始就把 ChatGPT 當黑盒神諭。

```python
from fastmcp import Client
from fastmcp.utilities.skills import list_skills

async with Client("https://your-server.example.com/mcp") as client:
    tools = await client.list_tools()
    skills = await list_skills(client)
    print([t.name for t in tools])
    print([s.name for s in skills])
```

### Step 5：最後才測自然語言 request
測句子時也不要只測 happy path。

至少要測：
- 補打分
- refresh + score
- shortlist query
- 單一 job 深度分析
- 混合型 request

## server instructions 值得寫，但不要神化它

MCP 維護者自己也寫過一篇很好的文章，專門談 **server instructions**。那篇文的核心訊息我很認同：server instructions 是一份給 LLM 的 user manual，對工具使用效果確實很有影響。

但我會特別補一句：

> **server instructions 有幫助，不等於它可以取代乾淨的 tool surface。**

我的做法是把它當成：
- skill 之上的補充導航
- 用來補充 selection heuristics 與禁忌
- 用來說明 server 的 operating style

而不是當成「既然 surface 很亂，那就靠 instructions 補救」的萬靈丹。

## 我最後留下來的 checklist

每次 skills 寫完、server 改完、準備重新測 routing 前，我都會跑這張表。

- 這個 request 的主要意圖，是否對應唯一 public tool？
- repo manifest 有沒有和 docstring 同步？
- tool schema 有沒有偷偷暴露會誤導模型的參數？
- internal helper 有沒有藏好？
- server instructions 有沒有補上最重要的 operating hints？
- live deployment 有沒有重啟？
- client session 有沒有刷新？
- list_tools / list_skills 的結果是不是你以為的那套？

![A practical testing loop for skills and runtime selection](./resource/mcp-engineering-deep-dive-04-04-testing-loop.svg)

## 最後一句話

我現在最不相信的一句話，就是：

> skill 都寫好了，模型應該知道怎麼走。

不是。

它最多只代表你把**策略資產**整理好了。

真正的 runtime 行為，仍然取決於：
- tool surface 長什麼樣
- inventory 目前列出什麼
- server instructions 給了什麼導航
- host / session 看到的是哪個版本

所以，如果你想讓 skill-first server 真的運作，不要只寫 skills。

你要做的是把 **manifest、docstring、schema、visibility、session refresh、runtime tests** 一起當成同一件工程工作。這樣 skill 才不會只是 repo 裡很美的文件，而會真的變成模型行為的一部分。
