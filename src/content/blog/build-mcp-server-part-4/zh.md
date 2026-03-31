---
title: "自主建造 MCP Server — Part 4：skills 是什麼，以及 skills 架構怎麼設計"
description: "Part 4 of the MCP Server build series."
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-03-31
featured: false
---

如果 Part 3 講的是「你該選哪個 framework」，那 Part 4 講的就是另一個更容易誤會、但更貼近實際成敗的主題：

> **skills 到底是什麼？**

我這次做 v3 的過程裡，最打臉我的其實不是 Oracle VM、不是 Cloudflare、也不是 nginx。  
真正讓我改觀的，是我對 skill 這件事原本有一個很自然、但其實很危險的誤解：

> **我原本以為 skill 包寫完整，模型就會照著 skill 邊界去選工具。**

現實不是這樣。

你可以有：
- `manifest.yaml`
- `instructions.md`
- `examples.md`
- `eval-notes.md`
- router policy
- intent signals

但這不代表 runtime 真正看到的工具表面，就會乖乖跟著這些文件走。  
真正影響模型當下選不選某顆工具的，常常不是 repo 裡那份很漂亮的 skill 文件，而是：

- tool name
- description
- input schema
- 目前 session 真正可見的 inventory
- server 端是否真的把 skill policy 接成 live path

這也是我最後會把 `job_scoring` 從 `job_ingestion` 裡硬拆出來的原因。  
不是為了讓架構更漂亮，而是因為我終於意識到：

> **repo 裡有 skill，和 runtime 真正拿 skill 當 routing gate，不是同一件事。**

![Where skills sit relative to MCP primitives and runtime tools](./resource/build-your-own-mcp-server-part-4-01-skills-vs-primitives.svg)

## 先講最重要的一句：skills 不是 MCP 規格裡的 primitive

這一點一定要先講清楚。

MCP 官方規格裡，server 對外暴露的核心能力是：
- **tools**
- **resources**
- **prompts**

skills 不是這三個之一。  
也就是說，**skills 不是 MCP protocol 內建的第一級概念**。

那 skills 到底是什麼？

我現在更願意把它理解成：

> **一層位在 host reasoning 與 backend execution 之間的能力整理層。**

它的任務不是取代 MCP，也不是取代 tools。  
它比較像是：

- 替模型整理能力邊界
- 用高層意圖包住低層 backend tools
- 把策略說明、允許使用的 backend、輸入規格、guardrails、fallback 寫清楚
- 讓 server 可以暴露 **skill-level entry points**，而不是把一排 raw flows 直接攤在模型面前

這也是為什麼我在 `job-skills-gateway` repo 裡，不是直接把 Make blueprints 當成 skills，而是另外做了一層 skill files。

## 對我的 v3 來說，skills 的真正角色是什麼

先講我的目標。

我不是要做一個「模型自己看 GitHub repo，再自己決定要讀哪份文件」的浪漫系統。  
我真正要的是：

1. GitHub 上有一份可版本化的 skill layer
2. FastMCP server 開機時讀這份 skill layer
3. 對 ChatGPT 只暴露少數高層能力
4. backend Make flows 留在後面當 execution layer
5. internal helper 繼續存在，但不要直接對外曝光

所以在我的設計裡：

- **skills 是 strategy-facing assets**
- **MCP tools 是 runtime-facing surfaces**
- **Make blueprints 是 execution contracts**

這三層一定要分開看，不然你很快就會把所有東西攪成一鍋。

![Skill package anatomy and the three-layer architecture](./resource/build-your-own-mcp-server-part-4-02-skill-package-anatomy.svg)

## 我最後把 repo 長成這個樣子

下面這棵樹，基本上就是我現在最喜歡的技能層專案骨架：

```text
job-skills-gateway/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── deployment-runbook.md
│   └── make-tool-catalog.md
├── skills/
│   ├── job_ingestion/
│   │   ├── manifest.yaml
│   │   ├── instructions.md
│   │   ├── examples.md
│   │   └── eval-notes.md
│   ├── job_scoring/
│   │   ├── manifest.yaml
│   │   ├── instructions.md
│   │   ├── examples.md
│   │   └── eval-notes.md
│   ├── job_querying/
│   │   ├── manifest.yaml
│   │   ├── instructions.md
│   │   ├── examples.md
│   │   └── eval-notes.md
│   └── job_decision_support/
│       ├── manifest.yaml
│       ├── instructions.md
│       ├── examples.md
│       └── eval-notes.md
├── contracts/
├── make_adapter/
├── mcp_server/
└── router/
```

這個結構的價值，不只是看起來工整。  
它真正做到的是：**把文件職責拆開**。

- `skills/*/manifest.yaml`  
  給機器與 runtime 看的 skill contract

- `skills/*/instructions.md`  
  給模型與人看的操作指令

- `skills/*/examples.md`  
  給 selection 與 review 看的範例意圖

- `skills/*/eval-notes.md`  
  記錄 failure modes、驗收點、容易誤選的地方

- `contracts/`  
  記錄低層 Make / webhook 契約

- `make_adapter/`  
  記錄 secret、endpoint、mapping 與執行層對接方式

也就是說，**skills 不是孤立文件，而是一整組能力治理資產。**

## skill manifest 到底該寫什麼

如果只能挑一份最重要的 skill 文件，我會選 `manifest.yaml`。

因為它是最接近「skill contract」的地方。  
我自己會把它寫成至少包含這幾件事：

- `name`
- `version`
- `description`
- `public`
- `intent_signals`
- `allowed_backend_tools`
- `required_context`
- `input_schema`
- `execution_policy`
- `output_contract`
- `guardrails`
- `fallbacks`

以我現在的 `job_scoring` 為例，它長這樣：

```yaml
name: job_scoring
version: 1.0.0
status: draft
description: Score jobs already stored in the system.

public: true

intent_signals:
  - score unscored jobs
  - backfill scores
  - 把沒打分的都打分
  - 補打分

allowed_backend_tools:
  - v2_tool_bulk_score_new_jobs

required_context:
  - request_id
  - session_id
  - trace_id

input_schema:
  type: object
  properties:
    target_job_id:
      type: string
      nullable: true
    force_rescore:
      type: boolean
      default: false

guardrails:
  - Do not fetch recent jobs in this skill.
  - Do not imply that a refresh happened.
```

我喜歡這種寫法，因為它不是只有功能描述，還把**能力邊界**寫進去了。

## instructions.md 不該寫成行銷文

另一個很常見的誤區，是把 `instructions.md` 寫成一份很漂亮的介紹文。  
這樣對人可能很舒服，但對模型幫助通常不夠大。

我現在更喜歡把 `instructions.md` 寫成：

- 這顆 skill 是拿來做什麼
- 不該拿來做什麼
- 允許使用哪些 backend
- 執行邏輯順序
- 回覆時要保留哪些 operational facts
- 哪些事情不能亂猜

例如：

```md
# job_scoring instructions

You are handling score-only maintenance tasks for jobs already stored in the system.

## Use this skill when
- the user wants to score all unscored jobs
- the user wants to re-score a known stored job

## Do not use this skill when
- the user wants to fetch recent jobs
- the user wants shortlist retrieval
- the user wants deep single-job analysis

## Backend tool
- v2_tool_bulk_score_new_jobs

## Important rules
- Do not say that new jobs were fetched in this path.
- Do not imply that a refresh happened.
- Do not invent scored_count.
```

這種 instructions 看起來沒有那麼華麗，但比較像 runtime 真的會受益的文件。

## skill layer 真正要解的，不只是分類，而是能力邊界

這次我踩到最典型的一個坑，就是 `job_ingestion` 跟 `job_scoring` 原本邊界不夠乾淨。

一開始系統把「幫我把沒打分的都打分」送去 `job_ingestion`。  
原因不是 skill 文件完全沒寫，而是整體系統釋放了太多混亂訊號：

- `job_ingestion` 這顆工具有 `force_rescore`
- skill 文件寫了邊界，但 runtime 公開表面還是像一把瑞士刀
- score-only 與 refresh-scope scoring 被揉在一起

這最後逼我承認一件事：

> **skills 的核心工作，不是替工具取比較好聽的名字，而是把容易互相誤導的能力拆乾淨。**

所以後來我才把 `job_scoring` 明確獨立出來，讓它專門處理：
- 補打分
- backfill
- re-score stored job

而 `job_ingestion` 回到自己的本位：
- fetch recent jobs
- insert
- 視情況做 scoring，但不再冒充 score-only 路徑

![Runtime selection is shaped by more than the skill files](./resource/build-your-own-mcp-server-part-4-03-runtime-selection-layers.svg)

## repo 裡有 skill，不代表 runtime 真的在用 skill

這一點是我整個 Part 4 最想強調的。

很多人以為只要：
- repo 有 skill files
- server 會 load skills
- router 有 policy

那模型就會照著 skill 規則走。

現實通常更複雜。

runtime 真正會受到影響的，至少有四層：

1. **repo skill assets**  
   也就是 manifest、instructions、examples、eval notes

2. **server 公開的 tool metadata**  
   包含 tool name、description、input schema、docstring

3. **live deployment 是否真的更新**  
   code 拉上去、service 重啟、inventory 重新載入了沒

4. **host 端 session 是否已刷新**  
   ChatGPT 這一輪對話看到的是新的工具視圖，還是舊的？

只要其中一層落後，你看到的 routing 行為就可能和你以為的「設計完成態」不一樣。

## 我現在怎麼開發一顆新 skill

我自己現在比較穩的流程大概是這樣。

### 第一步：先切邊界，不要先寫 prompt
先問：
- 這顆 skill 的主要 job 是什麼？
- 什麼事情一定不做？
- 它是否和既有 skill 有重疊？
- internal helper 要不要藏起來？

### 第二步：建立 skill skeleton

```bash
mkdir -p skills/job_scoring
touch skills/job_scoring/manifest.yaml
touch skills/job_scoring/instructions.md
touch skills/job_scoring/examples.md
touch skills/job_scoring/eval-notes.md
```

### 第三步：先寫 manifest，再寫 instructions
原因很簡單：  
manifest 比較像 contract，instructions 比較像 operating guidance。  
如果一開始沒有 contract，instructions 很容易越寫越散。

### 第四步：對齊 server 的公開表面
這一步非常重要。  
skill 寫完之後，我一定會回頭檢查：

- tool name 是否在釋放錯誤訊號
- description 是否和 skill 邊界一致
- input schema 是否在鼓勵模型走歪路
- 有沒有不該公開的 helper 被看見

### 第五步：刻意做反例測試
例如這類句子我一定會試：
- 幫我把沒打分的都打分
- 重打分這一筆
- 幫我重新抓最近三天再順便打分
- 幫我分析這個職缺值不值得投

因為 skill 的失敗，通常不是在理想案例，而是在邊界模糊的句子。

## 一個很關鍵的工作判準

我現在很常用一個判準來檢查 skill layer 有沒有寫對：

> **如果把 skill 文件拿掉，只看 runtime 暴露的 tool surface，模型還會不會被帶去正確方向？**

如果答案是否定的，那代表你的 skill layer 還沒有真正落地。  
它可能只是 repo 裡一份漂亮文件，還不是 live system 的一部分。

## 我對 skills 的最後一句話

我現在不再把 skills 當成「寫給模型看的補充文件」。  
我更傾向把它當成：

> **一層把高層意圖、backend 契約、guardrails、fallback、以及 tool exposure 治理在一起的能力設計。**

如果這層做得好，MCP server 對模型來說就不只是工具列表，而是比較像一個整理過、邊界清楚、可持續演化的能力表面。

下一篇我會回到比較泥濘的地方，寫 Oracle VM 與 FastMCP 在真正部署與維運時那些值得記錄的坑。

![Skill development loop from manifest to live routing checks](./resource/build-your-own-mcp-server-part-4-04-skill-dev-loop.svg)
