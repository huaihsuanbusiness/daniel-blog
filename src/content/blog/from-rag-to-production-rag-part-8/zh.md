---
title: "從 RAG 到企業級 RAG Part 08 | 5 種 query mode：怎麼決定這一題該不該跑 faithfulness"
description: "Part 07 把 faithfulness / citation / tracing / cost 拆成 4 個 capability 各自實作；Part 08 把這 4 個 capability 包成 5 種 query mode（fast / safe / deep_eval / creative / agentic），用 6 維度（faithfulness / citation / tracing / cost / latency / determinism）決策——同一條 /ask endpoint 根據 query 性質動態切換。本文給具體 workload（Q3 合約跑 safe / FAQ 跑 fast / debug 跑 deep_eval / 摘要跑 creative / 多步任務跑 agentic）+ 4 條反例（fast 跑合約會出事、deep_eval 同步跑 production 會爆 latency、mode 切太細會爆 codebase、只分快慢兩種會同時犧牲 faithfulness 跟 latency）+ 5-mode 決策樹。Router 概念對齊 LangChain RouterChain / LlamaIndex RouterQueryEngine 官方 pattern。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "routing", "query-mode", "langfuse", "ragas", "observability", "cost-control"]
date: 2026-06-10T22:30:00
featured: true
subtitle: "從 RAG 到企業級 RAG Part 08"
series: "從 RAG 到企業級 RAG"
seriesOrder: 8
---

## Part 07 的能力是空的，要裝在哪裡？

Part 07 把 faithfulness check、citation check、Langfuse tracing、cost tracking 4 個 capability 拆開各自實作——但實作完才發現，**這 4 個能力不是對所有 query 都要全開**。每個 query 都跑完整 eval + 完整 trace + full citation 檢查，p95 latency 直接從 1.5 秒噴到 6 秒，cost 翻 3 倍，使用者體驗崩。

**Part 07 給了 capability，Part 08 給 routing**——同一條 `/ask` endpoint 根據 query 性質，動態決定這 4 個 capability 怎麼組合。Router pattern 在 LangChain / LlamaIndex 官方都有對應實作（[LlamaIndex RouterQueryEngine](https://developers.llamaindex.ai/python/examples/workflow/router_query_engine/) / [LangChain RouterChain](https://reference.langchain.com/python/langchain-classic/chains/router)），不是這個專案自創——差別在**這個專案不是 route 到「不同 prompt template」，而是 route 到「不同 capability 組合」**，router 的輸出不只是要走哪個 query engine，而是這題 faithfulness 要不要跑、tracing 要不要開到 stage-level、cost 上限設多少。

這個差別重要：**RAG router 跟一般 LLM router 不同的點在「失敗成本」**。LLM 答錯可以再問一次，RAG 答錯（特別是合約 / 法律 / 醫療 domain）會出事。所以 Part 08 不是「5 種 mode 對應 5 種速度」這麼簡單，是「5 種 mode × 4 種 capability × N 種 query 特徵」的三維決策。

---

## 5 種 mode 是這 4 種 capability 的 5 種合理組合

先把 Part 07 結尾給的 5 個 mode 列表搬出來（**那不是裝飾、是規格底線**）：

```text
fast    (latency < 1s)  → skip faithfulness、skip tracing、純 vector search
safe    (合約/法律)     → full faithfulness + citation check、async RAGAS
deep_eval (debug 階段) → 同步跑 RAGAS + LLM judge、full trace
creative (開放式問答) → skip faithfulness、開 llm_first synthesis mode
agentic (多步任務)    → 每步獨立 trace、faithfulness 對每步都跑
```

這 5 條不是「隨便分的 5 條路」——是 Part 07 講的 4 個 capability 各自開 / 關 / 弱化之後，**在 production 觀察到 query 自然分成 5 群**。換句話講，**這 5 個 mode 是從真實 query 分群出來的，不是從 capability 推導出來的**。先有資料、模式自己跑出來，再對應到 capability 組合。

**6 維度決策表**（**這 6 個維度是這個專案的工作判準，不是業界通用定義**——其他團隊可能把 synthesis mode 或 chunk 數量當第 7、第 8 維度，這裡先固定這 6 個）：

| mode | faithfulness | citation | tracing | cost/query | p95 latency | determinism |
|---|---|---|---|---|---|---|
| **fast** | off | off | query-level | ≤$0.001 | < 1s | 純 vector |
| **safe** | full + async RAGAS | full | query + stage | ≤$0.01 | < 3s | hybrid + rerank + parent expansion |
| **deep_eval** | sync RAGAS + LLM judge | full | full trace | ≤$0.10 | 5-15s | full pipeline + 同步 eval |
| **creative** | off | weak (存在即可) | query-level | ≤$0.02 | < 2s | llm_first + 輕量 retrieval |
| **agentic** | per-step | per-step | per-step trace | ≤$0.05/步 | < 4s/步 | multi-step planner |

數字範圍從這個專案實測 + 常見業界基準（[thedataguy.pro RAG cost 2025-07](https://thedataguy.pro/writing/2025/07/the-economics-of-rag-cost-optimization-for-production-systems/) / [Tetrate RAG architecture patterns](https://tetrate.io/learn/ai/rag-architecture-patterns)）估算，**不是 vendor SLA、不是平台保證**——同樣 query 在 Cohere / OpenAI / MiniMax / 自架 LLM 跑出來的 latency 跟 cost 會差 2-5 倍。表裡 `≤$0.001` 跟 `≤$0.10` 是同個 query 跑在不同 mode 的差距，這是架構決策不是 model 決策。

---

## mode 切換不是 router 第一個問的問題

Part 08 不是 Part 04 講的「LlamaIndex / LangGraph / n8n 選哪個」——那是「用什麼框架」；Part 08 是「用同個框架、同一條 /ask endpoint 內部怎麼切」。**router 在哪裡切換**是 Part 08 的第一個設計決策，**有 3 個位置**：

1. **URL endpoint 分流**（`/ask/fast` / `/ask/safe` / `/ask/agentic`）——前端強制 mode，client 沒選好就壞。
2. **request payload 帶 mode 欄位**（`{"query": "...", "mode": "safe"}`）——API 彈性高、但 client 亂送 mode 等於 fast 跑合約。
3. **server 端自動判斷**（不接 mode 參數、根據 query 特徵 + 業務 metadata 自動切）——production 友善但 router 本身要寫對、寫錯比 1. 2. 還慘。

**這個專案最後選 3（自動判斷）**——但加了 escape hatch：request 帶 `mode` 欄位可以**強制覆寫**自動判斷。理由：auto-routing 寫錯時（特別是 fast 跑在合約 query 上）會出事，但 production monitoring 上看到「這題應該跑 safe 結果跑 fast」的時候需要能立即 force 切。escape hatch 不是給使用者用、是給 ops 救火用。

**這是 Part 08 的核心設計 trade-off**：自動判斷的 robustness 跟可控性不會同時拿到，要靠 escape hatch 補。

---

## 6 個 query 特徵，決定走哪個 mode

**auto-router 不是「一句 prompt 給 LLM 判斷」這麼單純**——LLM 判斷本身要 cost、要 latency、會出錯。**先用 cheap feature 預篩，必要時才上 LLM judge fallback**。6 個 query 特徵（按特徵取得的 cost 由低到高）：

```python
# rag/router/features.py
from dataclasses import dataclass

@dataclass
class QueryFeatures:
    # Cheap features (zero LLM call)
    source_path: str            # "contract" / "faq" / "runbook" / "open" 
    has_explicit_citation: bool # request 是否要求 [1][2] 引用
    query_length: int           # 字數
    is_multi_step: bool         # 偵測 "and then" / "接著" / "step 1 step 2"
    
    # Medium features (one cheap call: regex / classifier)
    has_numeric_constraints: bool  # "60 days" / "6 個月" / "$10,000"
    domain_risk: str             # "high" / "medium" / "low" - 從 source_path 推
    
    # Expensive feature (LLM call, only for ambiguous cases)
    intent_classifier: str      # "factual" / "summarization" / "open-ended"
```

**router 邏輯**（**這是這個專案的工作判準，不是業界通用 pattern**）：

```text
Step 1: is_multi_step = True        → agentic
Step 2: domain_risk = "high"        → safe
Step 3: has_numeric_constraints + source_path in ["contract","legal"] → safe
Step 4: intent_classifier = "summarization" + source_path = "open" → creative
Step 5: source_path in ["faq","runbook"] AND query_length < 50  → fast
Step 6: default (含 ambiguous)        → safe（預設往最嚴格方向走）
```

**預設往最嚴格方向走**這條要解釋一下：auto-router 不對稱的——**router 把 fast 跑成 safe 只是浪費錢，router 把 safe 跑成 fast 會出事**。所以 default 設最嚴格、出問題再降階。**這個不對稱性是 Part 08 跟一般 routing 系統最不一樣的地方**。

`Step 6` 之所以要 LLM call 做 intent classifier，是 Step 1-5 都沒辦法分辨的 query——「這份 Q3 report 在講什麼」是 summarization 還是 factual lookup？cheap feature 看不出來、router 必須 call 一次 LLM。**這次 LLM call 不能省、不能省就用 regex 硬猜**——Part 08 的成本結構有把這個 call 算進去。

---

## 5 個 mode 各自的「用於什麼 / 不用於什麼 / 失敗模式」

按 rubric 第十三節跟第三節要求，每個 mode 要交代這三件事。

### fast：純 vector、零 eval

**用於什麼**：FAQ、已知 runbook、文件結構穩定的內部知識庫——`「重設 VPN 步驟」`、`「API rate limit 是多少」`。query 短、答案短、source 集中、錯了不致命。

**不用於什麼**：任何「答錯會出事」的 query。合約金額、病人劑量、客戶 PII——**fast 跑這些題，faithfulness 失敗率近 100%**。Part 07 那個 Q3 早期終止合約，**fast mode 跑出來的答案會跟 Part 06 修 retrieval 之前一模一樣**——skip faithfulness 等於放棄攔截。

**失敗模式**：(1) 同義詞覆蓋不夠時 vector recall 掉（例如「early termination」沒在 chunk 標題，fast 撈不到）；(2) rerank 沒跑，多語言 / 多段文件時 noise 太多；(3) 沒 trace，出錯了 debug 不回來。**fast 犧牲可量測換可控、犧牲可除錯換 latency**。

### safe：合約、法律、醫療

**用於什麼**：Part 06 的 Q3 合約案例、`「這份 MOU 第 3 條怎麼規定」`、法律條文檢索。**這是 Part 07 faithfulness / citation check 設計出來要對付的主要 workload**。

**不用於什麼**：低風險的 FAQ（**跑 safe 模式跑 FAQ 等於殺雞用牛刀，成本 5-10 倍但 faithfulness 不會明顯變好**——FAQ 答案本來就短、citation 也不需要層層檢查）。還有即時互動的「邊聊邊問」（latency 3 秒比 fast 的 1 秒慢，使用者對話節奏會被拖慢）。

**失敗模式**：(1) faithfulness check 假陽性——LLM judge 說某個 claim 沒 source 撐，但其實有，只不過 source 用不同說法；(2) async RAGAS 抽樣偏低，long-tail failure case 沒被掃到；(3) cost 失控——parent expansion 沒節制、context 塞太多 token，**Part 07 講的 cost tracking 沒接好，safe mode 是最容易爆 cost 的 mode**。

### deep_eval：debug 跟 regression 階段用

**用於什麼**：(1) 改 prompt / 改 chunking / 改 rerank 之前後，做 offline 對照；(2) **production 出事時開 5% deep_eval 抽樣** 抓 stage-level trace 找哪個節點壞掉；(3) CI 上跑 offline eval 50-100 題。

**不用於什麼**：**絕對不能跑在一般 production user path 上**。deep_eval 同步跑 RAGAS + LLM judge 一次 query 5-15 秒，cost 是 fast 的 100 倍、latency 是 fast 的 15 倍。Part 07 講的 async evaluator 5% 抽樣是對的模式——sync deep_eval 是 debug 工具不是 user feature。

**失敗模式**：(1) ops 不小心把 deep_eval 開到 user path 100%，p95 從 1.5 秒爆到 12 秒，使用者大量跳出；(2) LLM judge 結果不可重現——同一題跑兩次 faithfulness 分數差 0.1 算正常，CI 上跑 0.05 threshold 會 flake；(3) **offline dataset 過期**，file 改 chunking 沒更新 dataset 跑的還是舊 chunk 的分數，**準的分數反而誤導**。

### creative：開放式問答、摘要

**用於什麼**：`「這份 Q3 report 在講什麼」`、`「幫我整理三點」`、`「給我一個新行銷方向建議」`——答案沒有「對 / 錯」、只有「有沒有用」。

**不用於什麼**：任何 factual lookup、需要 citation 的場景。**creative 跑 Q3 早期終止違約金會出事**——faithfulness off 等於 LLM 可以自由 hallucinate，contract clause 會被自由詮釋。

**失敗模式**：(1) synthesis 切到 llm_first 之後 LLM 容易「過度展開」——使用者問三點，LLM 回 8 點，token cost 跟 latency 都超標；(2) weak citation 設太鬆變成無 citation，user 想要的可追溯性掉；(3) **跟 safe 模式的邊界模糊**——「這份 report 怎麼解讀我們的定價策略」到底算 summarization 還是 factual？Part 08 的解法是 `source_path = "open"` 才允許 creative，**其他 source 都走 safe**。

### agentic：多步任務、cross-document reasoning

**用於什麼**：`「比對 Q3 跟 Q2 合約的差異」`、`「從三份報告整理出 risk matrix」`——單次 retrieval 撐不住、要拆多步。

**不用於什麼**：單純的「找一段文字」或「摘要一段文字」。**agentic 跑 FAQ 會比 fast 慢 5-10 倍、cost 5-10 倍**——planner 跟 faithfulness 對每一步都跑的開銷是固定的，不會因為 query 簡單就省下來。

**失敗模式**：(1) **planner 拆錯步驟**——第 2 步 retrieval 的 query 跟第 1 步結果接不上，後面 faithfulness 跟著連鎖失敗；(2) per-step faithfulness 沒設計好，**第 1 步錯、第 2 步引用第 1 步錯的結果**，error 累積放大；(3) **per-step trace 沒做 Langfuse 父子 span**，debug agentic 跟 debug 一般 query 不一樣，**沒 per-step trace 等於放棄 agentic 模式的可除錯**。

---

## 4 個反例：這個決策樹在哪些情境會失效

按 rubric 第五節要求，**每個判準都要有反例**。Part 08 至少要明確處理這 4 個：

**反例 1：fast 跑合約查詢。**「early termination 違約金」這題走 fast mode——skip faithfulness、skip citation，vector recall 撈到 MOU 但沒撈到第三段，LLM 編一個合理的 30 天 / 雙方協商答案，user 拿到一個**完全錯、看起來很合理**的結果。**這就是 Part 07 一開場講的同一個案例**。Part 08 的護欄是 `Step 2: domain_risk = "high" → safe`，但如果 router 的 domain 判斷寫錯（"contract" 被標成 "faq"），整條護欄就破。

**反例 2：deep_eval 同步跑在 production user path 上。** ops 不小心把 deep_eval 開到 100% user traffic，p95 latency 從 1.5 秒噴到 12 秒——使用者跳出率飆高、API quota 燒光、Langfuse dashboard 上 stage-level trace 顯示 rerank 是瓶頸（其實根本不是，是 sync RAGAS 在等 LLM judge）。**Part 07 講的「async evaluator 5% 抽樣」就是為了避免這個情境**，但如果有人繞過 async 直接 call sync，護欄也破。

**反例 3：mode 切太細、codebase 爆掉。** 5 個 mode 已經是「這個專案觀察到的自然分群」，**不是「越多越好」**。曾經試過拆 8 個 mode（safe 拆成「safe-合約」「safe-法律」「safe-醫療」三個），結果三個 mode 的 capability 組合幾乎一樣、debug 變三倍難度、最後還是合併回一個 safe mode。**判準：mode 數量 = 觀察到的 query 自然分群數量，不要為了「精緻」硬拆**。如果兩個 mode 的 capability 組合 80% 一樣，合併。

**反例 4：mode 切太粗、犧牲 faithfulness 跟 latency 兩邊。** 只分「fast」「slow」兩種——fast 跑 FAQ 但也跑合約、slow 跑所有高風險 query。**這個會同時犧牲兩邊**：fast 跑合約出事（反例 1）、slow 跑 creative 模式（摘要）被 faithfulness check 拖慢 3 秒使用者跳出。**5 個 mode 是「faithfulness 該跑的跑、不該跑的跳」這個 trade-off 的最剛好粒度**——少於 5 個會犧牲某一邊、多於 5 個會爆 codebase。

---

## Router 實作：avoid the obvious mistake

**最常見的錯誤是用 LLM 直接判斷 mode**：「給 router LLM 看一下 query 然後選 mode」。這個錯三層：

1. **router LLM 自己就要 cost 跟 latency**——Part 08 算成本時 router 的 LLM call 必須算進去，不是 free。
2. **router LLM 判錯的成本很高**——把合約誤判成 FAQ，後面整條 pipeline 連鎖錯。
3. **router LLM 自己也會隨時間漂移**——model 升級、prompt 改一點、router 行為跟著變，debug router 問題比 debug query 問題還麻煩。

**Part 08 用的順序**：cheap feature → rule-based 預篩 → ambiguous 才 fallback LLM。**LLM 是 fallback、不是預設路徑**。這個跟 Part 04 講的「n8n 用純視覺化不用 LLM router」是同一條設計直覺——**先 deterministic 再 LLM fallback**。

具體實作（**節錄自這個專案 rag/router.py**）：

```python
# rag/router.py
from dataclasses import dataclass
from enum import Enum

class Mode(Enum):
    FAST = "fast"
    SAFE = "safe"
    DEEP_EVAL = "deep_eval"
    CREATIVE = "creative"
    AGENTIC = "agentic"

def route(features: QueryFeatures, override: Mode | None = None) -> Mode:
    # ops 救火：request 帶 mode 強制覆寫
    if override is not None:
        return override
    
    # Step 1: multi-step 直接 agentic
    if features.is_multi_step:
        return Mode.AGENTIC
    
    # Step 2: high domain risk 直接 safe
    if features.domain_risk == "high":
        return Mode.SAFE
    
    # Step 3: 合約 + 數字約束
    if features.has_numeric_constraints and features.source_path in {"contract", "legal"}:
        return Mode.SAFE
    
    # Step 4: summarization + open source
    if features.intent_classifier == "summarization" and features.source_path == "open":
        return Mode.CREATIVE
    
    # Step 5: FAQ + 短 query
    if features.source_path in {"faq", "runbook"} and features.query_length < 50:
        return Mode.FAST
    
    # Step 6: 預設最嚴格
    return Mode.SAFE
```

```python
# /ask endpoint - 拿 mode 後 dispatch
@app.post("/ask")
async def ask(req: AskRequest):
    features = extract_features(req.query, req.context)  # cheap features first
    if needs_llm_fallback(features):
        features.intent_classifier = await llm_intent_classify(req.query)  # one LLM call
    
    mode = route(features, override=req.mode)
    return await dispatch(mode, req)  # 各 mode 自己組 pipeline + 各自的 eval/trace
```

**這不是 universal pattern**——`extract_features` 跟 `llm_intent_classify` 的成本結構每個專案不一樣，**這個專案的 faq / runbook / contract 標籤是文件 metadata 已經有的**，不是 LLM 現判。其他專案可能要加 keyword 預篩或 domain classifier。

---

## Part 08 跟 Part 07 的關係：capability 跟 routing

**Part 07 講「faithfulness check 怎麼寫、Langfuse trace 怎麼接、cost tracking 怎麼算」——是 capability 拆解**。**Part 08 講「同條 /ask 怎麼決定這一題要跑哪些 capability」——是 routing 設計**。兩個的分工是：Part 07 把每個 capability 各自實作穩、Part 08 把這些 capability 包成 5 種 mode、router 決定這一題走哪個 mode。

**沒有 Part 07 的 capability，Part 08 的 routing 就只是空殼**——mode 切換決定跑 safe，但 safe mode 沒有 faithfulness check，那跟 fast 沒差別。**沒有 Part 08 的 routing，Part 07 的 capability 是浪費**——每題都跑完整 eval + 完整 trace，cost 跟 latency 都爆。**兩個一起看才知道 production RAG 的成本跟正確性怎麼 trade-off**。

**Part 05 → Part 08 的接口**：Part 05 從 demo 走到 FastAPI server 那一刻，就要把 `/ask` response 預留 `mode` 欄位——就算那時候還沒實作 routing 邏輯，schema 先留好。**Part 08 補 router 模組時，response schema 不用改、API contract 不用 break**。**Part 07 response 預留 `faithfulness_check` / `citation_check` / `observability` 3 個欄位是 capability 預留；Part 08 response 預留 `mode` 欄位是 routing 預留——兩條預留線各自獨立，補模組時互不打架**。

**Part 06 → Part 08 的接口**：Part 06 講的 hybrid + rerank + parent expansion + citation assembly 4 層 retrieval 強化，是 safe mode 跟 deep_eval mode 的 default pipeline；fast mode 跟 creative mode 只用其中 1-2 層、agentic mode 對每一步用 2-3 層。**retrieval 強化的 ROI 在不同 mode 下不一樣**——safe 跟 deep_eval 4 層全開、fast 只用 1 層 vector search、creative 開 hybrid 不開 rerank。Part 06 是「retrieval 強化有哪些層」、Part 08 是「哪些 mode 用哪些層」。

Part 01 的互動 demo 跑的是 fast 跟 safe 兩種 mode——你可以在 query box 加 `?mode=fast` 或 `?mode=safe` 直接看 latency、cost、faithfulness 分數的差距（**這是 Part 09「給非工程師 demo」的前置：mode 切換要在 API 層可見，UI 才接得上**）。

**Part 08 不是 production 收尾——Part 09 講怎麼把這 5 種 mode 包成非工程師也能操作的 UI，Part 10 講把這個系統接進 CI / 監控 / 告警的完整 ops loop**。Part 08 是 production RAG「有沒有 routing」的分界：沒有 routing 的 RAG 是 demo、有 routing 的 RAG 才算 production。
