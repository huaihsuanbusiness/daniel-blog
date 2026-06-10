---
title: "從 RAG 到企業級 RAG Part 04 | LlamaIndex、LangGraph、n8n：3 個工具的選型紀錄"
description: "我選 LlamaIndex 之前，把 LangGraph 跟 n8n 都認真研究過一輪。三個工具的核心用途不同，選型關鍵是「這個專案的核心問題是什麼」——不是「哪個最強」。這篇是選型紀錄，不是工具評比。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "langgraph", "n8n", "tooling"]
date: 2026-06-10
featured: true
subtitle: "從 RAG 到企業級 RAG Part 04"
series: "從 RAG 到企業級 RAG"
seriesOrder: 4
---

我選 LlamaIndex 之前，把 LangGraph 跟 n8n 都認真研究過一輪。這不是工具評比，是選型紀錄。

這三個工具的核心用途不同，**不是「誰取代誰」的關係**。把它們放在一起 PK 就像比較扳手、起子、鋸子哪個比較好——看你鎖的是哪顆螺絲。

---

## 一、三個工具的真實位置

**LlamaIndex = RAG / 文件型 agent 的開發框架**

LlamaIndex 本體是開源 Python / TypeScript SDK，不是拖拉式 UI。你在自己 backend（FastAPI / Docker / serverless）裡 import `llama_index`，讓它處理文件解析、chunk、index、retrieval、query engine、citation、workflow、agent。LlamaCloud / LlamaParse 是它的雲端周邊（managed parsing、ingestion、retrieval），但**核心框架還是寫程式**，不是按 UI 按鈕。

它擅長的場景：RAG pipeline、文件型 agentic workflow（parse → extract → classify → RAG）、citation-required 問答、document processing pipeline。

**LangGraph = 通用 stateful agent workflow 控制器**

LangGraph 是 LangChain 體系下的 low-level orchestration framework。它不做文件處理、不做 RAG、不做 indexing。它做的是：durable execution（流程中斷可恢復）、複雜狀態機、跨多工具分支、人類介入（human-in-the-loop）、長跑任務的保險絲。

它擅長的場景：通用 agent 編排、跨很多工具（SQL + web + RAG + 計算）、需要可恢復的長流程、需要嚴謹 production observability 的多 agent 系統。

**n8n = 視覺化業務流程自動化**

n8n 是低碼拖拉式平台。你在 UI 上拉節點、接 SaaS（Slack、Notion、Sheets、Email、HTTP）、做 if/else 邏輯。它不做文件深度處理、不做複雜 agent 編排。

它擅長的場景：業務流程自動化（每天把 CRM lead 丟到 Slack、Email trigger 接 webhook、把 Notion 頁面同步到 Sheets）、ingestion 自動化（檔案丟進雲端硬碟自動觸發 parse / chunk / index pipeline）、行銷 / 客服流程、輕量 SaaS 整合。

三個工具放在一張圖是這樣：

```text
LlamaIndex = RAG / 文件知識框架（寫程式）
LangGraph  = agent 流程控制器（寫程式）
n8n       = 業務流程自動化（拖拉 UI）

三個不是同層工具，硬放在一起比是誤會了問題。
```

---

## 二、這個專案怎麼取捨

我選了 LlamaIndex，沒選 LangGraph，也沒選 n8n。每個淘汰都有具體理由。

**為什麼選 LlamaIndex**

這個專案的需求是：一份 PDF 進來、metadata 掛好、hybrid retrieval、rerank、citation、faithfulness check、FastAPI 包起來。LlamaIndex 整套 framework 從文件讀取、indexing、retrieval、synthesis、citation 到 LlamaIndex Workflows 都包了，**RAG pipeline 需要的零件它幾乎都有**。官方文件也明確把 Workflows 定位成 event-driven、step-based、支援 branches / loops / state / human-in-the-loop 的 query workflow——也就是說，**文件型 agentic RAG 它自己就能吃下來**，不需要另外接 LangGraph。

更關鍵的是，LlamaIndex 對文件這條線已經很熟：parser、metadata、parent-child、citation、docstore、raw storage、permission filter——這些是這個專案的核心訴求，LlamaIndex 是唯一一個在「文件 RAG」這條軸上全套都做到位的框架。

**為什麼淘汰 LangGraph**

LangGraph 強的是通用 agent orchestration——durable execution、跨多工具、複雜狀態機、長跑任務。但這個專案是 RAG 系統，query 路徑相對單純（5–14 站一條線），不涉及跨很多外部工具的長跑編排，也不需要複雜狀態機。

更實際的理由：**LlamaIndex Workflows + AgentWorkflow 已經能處理這個專案需要的 agentic 場景**。這個專案後段才開始用 Workflows（Planner → Rewrite → Decompose → Retrieve → Rerank → Answer → Verify），這些都在 LlamaIndex 體系內完成。如果接 LangGraph，要另外維護兩套 workflow 抽象、心智成本高、邊界條件更多。

從 agentic 那層一路到部署那層（auth、container、cloud、CI）整條路都在 LlamaIndex 體系內解決，**LangGraph 在這個專案找不到一個非接不可的洞**。Part 08 會拆 query mode 設計，到時候會看到用 LlamaIndex Workflows 怎麼跑 5 種 mode（fast / safe / deep_eval / creative / agentic）——這就是 LangGraph 在 production RAG 裡原本可能接的位置，但用 LlamaIndex Workflows 自己拼出來了。

**這個判斷只對這個專案的文件 RAG 系統成立**。換個專案——例如要跨 CRM、ERP、客服系統跑長流程的——LangGraph 才是主力，LlamaIndex 只負責其中文件查詢那一段。

**為什麼沒選 n8n**

n8n 跟 LlamaIndex、LangGraph 不在同一層。它是拖拉式業務流程自動化，**它解的是另一個問題**：把不同的 SaaS 接起來、讓行銷 / 客服 / 資料同步流程不需要寫程式。

這個專案的 query 路徑是程式化的——FastAPI 收 query、LlamaIndex 跑 retrieval、Langfuse 記 trace、Postgres 存 metadata——這些都是 API 對 API 對接，n8n 的拖拉 UI 對這些沒幫助。

n8n 在這個專案的角色不在 query 路徑，而是**ingestion 自動化跟業務流程整合**。Part 09 拆「文件進得來、管得住、查得到」時，會看到 n8n 怎麼接 ingestion pipeline：檔案丟進 Google Drive → n8n 觸發 → 呼叫 backend API → 跑 parse / chunk / index。Part 10 拆部署時，n8n 也可能接上做 webhook 跟排程。

**所以這個專案的工具配置是這樣**：

> **LlamaIndex = RAG 主力**  
> **LangGraph  = 不接（LlamaIndex Workflows 自己吃 agentic 那塊）**  
> **n8n       = 不接 query，但 Part 09 跟 Part 10 會接 ingestion 跟業務流程**

---

## 三、為什麼這不是「PK 輸贏」

常見的誤會是把這三個工具放在一起比，問「哪個最強」「哪個會取代哪個」。這題本身就有問題。

它們各自解決的問題不同：

- LlamaIndex 問的是「怎麼把文件變成可問答的知識」
- LangGraph 問的是「怎麼讓 agent 跑得久、跑得穩、跑得可恢復」
- n8n 問的是「怎麼讓 SaaS 跟內部系統不用寫程式就能串起來」

把三個放在一起比，就像問「扳手、起子、鋸子哪個最好用」——看你鎖的是哪顆螺絲。

這個專案鎖的是 RAG 系統這顆螺絲，所以 LlamaIndex 是主力，LangGraph 跟 n8n 都不是必要工具。

但換個專案呢？如果是要做一個客服 agent，要跨 Slack、Zendesk、CRM、後台 DB 跑長流程——那 LangGraph 才是主力，LlamaIndex 只負責其中文件查詢那一段。如果是企業內部要做一個「每週自動把 Notion 整理成 Slack 摘要」——n8n 五分鐘拉完，寫程式反而慢。

**所以選型的關鍵不是「哪個最強」，是「這個專案的核心問題是什麼」**。

**快速對照**——如果你正在選 RAG / agent / 業務流程工具，這張表可以給你當第一輪篩選：

| 你的核心問題 | 主力工具 | 補充 |
|---|---|---|
| 文件 RAG / 問答 / 引用 | LlamaIndex | — |
| 文件型 agentic workflow | LlamaIndex Workflows / AgentWorkflow | 複雜狀態才考慮 LangGraph |
| 通用 agent 編排、跨多工具長跑 | LangGraph | 文件查詢可接 LlamaIndex 當工具 |
| ingestion 自動化、業務流程整合 | n8n | API 對接走程式、拖拉 UI 走 n8n |

**這篇講的選型紀錄，只適用於「文件 RAG 系統」這個情境**。換到其他情境，三個工具的優先序可能完全不一樣。

---

Part 01 的互動 demo 跑的就是這個專案的 production pipeline——想看真實 query 怎麼走，可以直接去文章頁面問。Part 05 會開始拆「從最小可用 RAG 怎麼長成這個專案」——具體 5 個檔案、3 個抽象晚一點學、3 個訊號代表該從 demo 走向 backend。LlamaIndex 怎麼從 5 行程式碼的 quickstart 慢慢長成一個 production 系統，Part 05 拆給你看。
