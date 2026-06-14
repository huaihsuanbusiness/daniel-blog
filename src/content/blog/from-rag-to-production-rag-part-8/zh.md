---
title: "從 RAG 到企業級 RAG Part 08 | Query Router 與 Agentic RAG：同一個 /ask endpoint 怎麼決定下一步"
description: "Part 07 把 faithfulness / citation / tracing / cost tracking 4 個 production 級能力裝好了，但每題都跑會讓 latency 和 cost 撐不住。Part 08 把這些能力收斂成 5 種 query mode（fast / safe / deep_eval / creative / agentic），並把 Agentic RAG 明確化為受控的 multi-step runtime loop。本文補上兩層 routing：mode router 決定能力組合，pattern router 決定走文件 RAG、SQL / API tool、long-context 或 agentic workflow。重點不是讓 LLM 自由發揮，而是用 deterministic features、escape hatch、per-step trace、budget、timeout 與 final verifier，把 /ask endpoint 變成可控的 production query router。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "routing", "query-mode", "agentic-rag", "sql-rag", "langfuse", "ragas", "observability", "cost-control"]
date: 2026-06-10T22:30:00
featured: true
subtitle: "從 RAG 到企業級 RAG Part 08"
series: "從 RAG 到企業級 RAG"
seriesOrder: 8
---

## Part 07 裝好四個檢查之後，server 慢到 user 開始跳出

上一篇 Part 07 把 faithfulness 檢查、citation 檢查、Langfuse tracing、cost tracking 四個 production 級能力都裝好了——一跑起來才發現，**每個 query 都跑完整 faithfulness + 完整 trace + 完整 citation，p95 latency 從 1.5 秒噴到 6 秒，cost 翻 3 倍，使用者跳出率飆高**。

問題不在能力裝錯，在「裝下去的時候沒分對象」。實務上 RAG query 大致分得出幾群：

- 「重設 VPN 步驟」「API rate limit 是多少」——FAQ 類，答案短、來源固定、答錯了不致命
- 「這份 MOU 第 3 條怎麼規定」——合約類，**答錯會出事**，需要 faithfulness + citation 兩道檢查
- 「幫我看 debug 一下為什麼這個 query 慢」——debug 類，要 stage-level trace，需要 deep evaluation
- 「這份 Q3 report 在講什麼」——摘要類，沒有對錯、要看起來有用
- 「比對 Q3 跟 Q2 合約的差異」——多步任務類，拆成幾步跑才撐得住

跑同一套檢查給這 5 群 query 不合理——給 VPN 重設問題跑 faithfulness 檢查是浪費錢、給合約條款跑純 vector search 是放棄攔截。

要分。**分的方式就是這篇 Part 08 要講的事**：同一個 `/ask` endpoint，根據 query 性質決定這四個能力要跑哪幾個、怎麼跑。Routing 這個概念在 LangChain 跟 LlamaIndex 官方都有對應的實作（[LlamaIndex 的 RouterQueryEngine](https://developers.llamaindex.ai/python/examples/workflow/router_query_engine/) 跟 [LangChain 的 RouterChain](https://reference.langchain.com/python/langchain-classic/chains/router)），不是新東西。

差別在這裡要 route 的不是「不同 prompt template」——**是「不同能力組合」**。router 函式看完 query 真正要回答的是四件事：

- 這題 faithfulness 要不要跑？
- citation 要做到多深？
- tracing 開到 query-level 還是 stage-level？
- 這題的成本上限設多少？

這四個問題的答案合在一起，就是 query 該走哪個 mode。

![Query Mode Router：5 種 mode 怎麼決定](/images/from-rag-to-production-rag-part-8/part-08-query-mode-router.png)

---

## 5 種 mode 跟 4 個能力的對應

Part 07 結尾給的 5 個 mode 是這一篇的起點，**不是裝飾**——把 capability 各自的開 / 關 / 弱化組合起來，能跑出 5 個有意義的生產模式：

| mode | faithfulness | citation | tracing | cost / query | p95 latency | pipeline |
|---|---|---|---|---|---|---|
| **fast** | off | off | query-level | ~USD 0.001 | < 1s | 純 vector search |
| **safe** | full + async RAGAS | full | query + stage | ~USD 0.01 | < 3s | hybrid + rerank + parent expansion |
| **deep_eval** | sync RAGAS + LLM judge | full | full trace | ~USD 0.10 | 5–15s | full pipeline + 同步 eval |
| **creative** | off | weak (存在即可) | query-level | ~USD 0.02 | < 2s | llm_first synthesis + 輕量 retrieval |
| **agentic** | per-step | per-step | per-step trace | ~USD 0.05/步 | < 4s/步 | multi-step planner |

先講一下這張表不是 SLO：**這幾個數字是我自己系統的實測 + 常見業界基準（[thedataguy.pro 的 RAG cost 文章](https://thedataguy.pro/writing/2025/07/the-economics-of-rag-cost-optimization-for-production-systems/) / [Tetrate 的 RAG architecture patterns](https://tetrate.io/learn/ai/rag-architecture-patterns)）的估算值**，不是 vendor SLA 也不是平台保證。同樣的 query 在 Cohere / OpenAI / MiniMax / 自架 LLM 跑出來的 latency 跟 cost 會差 2–5 倍。表裡 USD 0.001 跟 USD 0.10 的差距是同一題跑在不同 mode 的差距——這是架構決策，不是 model 決策，**model 換便宜一點救不回**。

每個 mode 的 faithfulness 跟 citation 開 / 關、pipeline 的檢索強度，**不是憑感覺配的，是對應到 query 失敗的後果**：

- **fast** 對應「答錯不致命」的 query——VPN 步驟答錯使用者頂多再問一次。所以把檢查全關掉換 1 秒 latency。
- **safe** 對應「答錯會出事」的 query——合約條款答錯可能讓公司賠錢。檢查全開、async RAGAS 抽樣、tracing 開到 stage-level。
- **deep_eval** 對應「系統出問題需要找出哪個環節壞掉」的 query——不是 user feature，是 debug 工具。同步跑 RAGAS + LLM judge，每個 stage 都要看。
- **creative** 對應「沒有標準答案、要看起來有用」的 query——摘要、發想、行銷建議。faithfulness 在這類題沒有意義（沒有「對」的 source），但要保留基本的 citation 讓使用者可以追。
- **agentic** 對應「單次 retrieval 撐不住」的 query——跨文件比對、風險分析。要拆多步，每步獨立 trace、每步跑 faithfulness。

開 / 關的依據是「這題如果錯了會出多大事」。

---

## 哪裡做分流，是第一個設計決定

要把這 5 種 mode 套到 production 上，第一個問題不是「怎麼設計 routing 邏輯」，是「routing 層放哪裡」。三個位置都可以：

1. **URL 端分流**——`/ask/fast` / `/ask/safe` / `/ask/agentic`。前端強制 mode。client 沒選好就壞。
2. **request payload 帶 mode 欄位**——`{"query": "...", "mode": "safe"}`。API 彈性高，client 亂送 mode 等於 fast 跑合約。
3. **server 端自動判斷**——API 不接 mode 參數，根據 query 特徵跟業務 metadata 自己切。production 友善但 router 本身要寫對。

第 1 跟第 2 都把判斷責任推給 client——client 端工程師對自家 query 風險未必熟，發包的時候選錯就出事。第 3 種（server 自動判斷）聽起來最理想，但 router 寫錯的下場跟前兩種同樣糟：合約派去 fast、safe 派去 creative，壞掉一樣壞。**差別在 server 寫錯比 client 傳錯更難抓——client 出錯 log 端看得到，server 寫錯藏在 router 邏輯裡**。Part 08 走第 3 種，但加了一個保險：request 還是可以帶 `mode` 欄位強制覆寫自動判斷。

這個強制覆寫（一般叫 escape hatch）不是給 end user 用的，是給 ops 救火用的——production 監控上看到「這題應該跑 safe 結果跑 fast」的時候要能立刻 force 切，不能等工程師改 routing code 跟 deploy 完才修。**自動化跟可控性不會兩邊都拿，escape hatch 是兩邊都要的代價**。

> 這裡就是第一個會讓 routing 失效的情境：router 自動判斷寫錯，把合約 query 派去 fast。護欄是 escape hatch 加上事後監控 alert，沒有 escape hatch 就要等下一次 deploy 才能修——這段 latency 在 production 是會鬧出人命的（真的字面意義上）。

---

## Routing 其實有兩層：mode router 跟 pattern router

Part 08 原本在講的是 **mode router**：這題要走 fast、safe、deep_eval、creative，還是 agentic。這一層決定的是「能力組合」：faithfulness 開多深、citation 做多細、trace 到哪個層級、成本上限設多少。

但 production RAG 走到這裡會多出第二層：**pattern router**。它問的不是「檢查開幾個」，而是「這題根本該查哪種東西」。

| routing 層 | 它回答的問題 | 典型輸出 |
|---|---|---|
| **Mode router** | 這題要用哪個能力組合？ | fast / safe / deep_eval / creative / agentic |
| **Pattern router** | 這題該走哪種資料取得方式？ | document RAG / SQL/API tool / long-context pack / agentic workflow |

這兩層不要混在一起。混在一起會產生一種很常見的錯誤：明明使用者問的是「上個月 query cost 最高的 10 個 tenant」，router 卻把它當成一般文件問題丟去 vector search。結果向量庫很認真地找文件，LLM 很認真地寫答案，但答案其實應該從 Postgres 或 billing table 來。

所以 Part 08 的核心可以改成一句話：

> `/ask` endpoint 不只要決定「這題要不要檢查」，還要決定「這題該用什麼 retrieval pattern」。

這也是為什麼 agentic mode 會變重要：一旦 query 需要跨 retrieval pattern，例如先查 SQL 找出高風險 tenant，再回文件庫查相關 policy，再把兩者合成風險說明，單次 retrieval 就撐不住了。這時候不是把 top_k 開大，而是要進入一個受控的 multi-step workflow。


## 6 個 query 特徵決定走哪條

自動分流最容易掉進的坑是「給 router 一個 LLM、叫他看 query 選 mode」。**這條路三層錯**：

1. router LLM 本身要 cost 跟 latency——算 production 成本時這個 call 也要算進去，不是 free 的
2. router LLM 判錯的成本很高——把合約誤判成 FAQ，後面整條 pipeline 連鎖錯
3. router LLM 會隨時間漂移——model 升級、prompt 改一點，router 行為跟著變，debug router 問題比 debug query 問題還麻煩

正確的順序是**先用 cheap feature 預篩，必要時才上 LLM fallback**。6 個 query 特徵，按取得的成本由低到高：

```python
# router/features.py
from dataclasses import dataclass

@dataclass
class QueryFeatures:
    # 免費特徵（不需 LLM）
    source_path: str              # "contract" / "faq" / "runbook" / "open"
    has_explicit_citation: bool   # request 是否要 [1][2] 引用
    query_length: int             # 字數
    is_multi_step: bool           # 偵測 "and then" / "接著" / "step 1 step 2"

    # 中等成本特徵（regex 或簡單 classifier）
    has_numeric_constraints: bool # "60 days" / "6 個月" / "USD 10,000"
    domain_risk: str              # "high" / "medium" / "low" - 從 source_path 推

    # 高成本特徵（LLM call，只在模糊情境用）
    intent_classifier: str        # "factual" / "summarization" / "open-ended"
```

決策樹：

```text
Step 1：is_multi_step = True                                 → agentic
（is_multi_step 用 regex 偵測「and then / 接著 / step 1 step 2」，**這在 production 容易誤判**——使用者寫「接著」可能是 narrative 不是 multi-step 任務。threshold 跟 keyword set 要靠真實 query 樣本調、不能照拍腦袋。誤判的下場是 fast/safe 派到 agentic 變慢 5–10 倍、agentic 派到 fast/safe 拆不出多步——兩邊都痛。）
Step 2：domain_risk = "high"                                 → safe
Step 3：has_numeric_constraints AND source_path ∈ 合約/法律  → safe
Step 4：intent_classifier = "summarization" AND source_path = "open" → creative
Step 5：source_path ∈ faq/runbook AND query_length < 50     → fast
Step 6：其他全部（包含 ambiguous）                            → safe
```

Step 6 預設走最嚴格這條要解釋一下——**routing 派錯方向的後果是不對稱的**：把 fast 派成 safe 只是浪費錢、把 safe 派成 fast 是會出事。所以 default 設最嚴格，有明確理由才降階。這個不對稱性跟一般 routing 系統的設計直覺不一樣（一般 routing 預設走中間值），**寫 RAG routing 最容易犯的錯就是把 default 設成 fast、想用 safe 救**——出事就出在這。

Step 4 為什麼需要 LLM call 做 intent classifier：Step 1 到 Step 5 都分不出的 query——「這份 Q3 report 在講什麼」是 summarization 還是 factual lookup？cheap feature 看不出來、router 必須 call 一次 LLM。**這次 LLM call 不能省、省了就是用 regex 硬猜**——猜錯的下場跟上面 Step 6 預設錯一樣。成本結構要把這個 call 算進去。


> 第二個會讓 routing 失效的情境：把 Step 6 預設改成 fast 試圖「省成本」。剛上線可能沒事，三個月後合約 query 量增加、router 沒記得改回來，faithfulness 失敗率慢慢爬升到出事才看到。護欄是「預設嚴格」這條不能動、CI 上把 Step 6 的行為寫死。

---

## 補一個重要分支：Structured / SQL RAG

不是每一題都該走 vector retrieval。

有些問題的答案不在文件 chunk 裡，而在資料庫、API、metrics table 或 billing table 裡。例如：

- 「上個月每個 tenant 的 query cost 是多少？」
- 「哪 10 個 user 的 citation failure rate 最高？」
- 「這週 ingestion job fail 的原因分佈？」
- 「Q3 合約裡 status = expired 的文件有幾份？」

這些問題如果丟進 vector DB，retriever 可能會找到跟 cost、failure、job 相關的文件，但那不是 source of truth。真正應該走的是 **Structured / SQL RAG**：

```text
User query
→ structured intent
→ readonly SQL / API allowlist
→ tenant / user permission filter
→ timeout + row limit
→ structured result table
→ answer with query provenance
```

重點是：**SQL RAG 不是讓 LLM 隨便寫 SQL**。Production 裡比較安全的做法是讓 LLM 產生 structured intent，後端再用 allowlist 對應到已審核過的 SQL template 或 API function。

例如：

```python
class PatternRoute(Enum):
    DOC_RAG = "doc_rag"
    SQL_TOOL = "sql_tool"
    LONG_CONTEXT = "long_context"
    AGENTIC = "agentic"

@dataclass
class RouteDecision:
    mode: Mode
    pattern: PatternRoute
    reason: str
```

如果 query 裡出現 KPI、count、top N、group by、time range、status 分佈這些特徵，而且 source of truth 是 app DB，那 pattern router 應該選 `SQL_TOOL`，mode 則可能仍然是 `safe`。也就是說：**SQL 是資料取得方式，safe 是檢查強度**。這兩層要拆開。

這個拆分會讓系統更像 production，不像 demo。demo 常常只有一條路：query → vector → LLM。production 裡應該是：query → route → 選工具 / 選 retriever / 選檢查深度。

---

## Agentic RAG 不是讓 agent 自由發揮

`agentic` 這個 mode 最容易被誤解成「讓 LLM 自己決定下一步」。這在 demo 很迷人，在 production 很危險。

這個專案裡比較合理的 agentic RAG，不是任由 agent 自由遊走，而是一條受控的 multi-step workflow：

![Agentic RAG Runtime Loop](/images/from-rag-to-production-rag-part-8/part-08-agentic-rag-runtime-loop.png)

```text
Planner
→ Tool routing
→ Retrieve / tool call
→ Evaluate evidence
→ Reflect / retry when needed
→ Assemble context
→ Verify + answer
```

每一步都要有邊界。沒有邊界的 agentic workflow 會長出三種怪獸：

1. **步數失控**：planner 一路拆下去，query 變成小型工作流風暴。
2. **工具失控**：LLM 為了回答一題，開始亂 call 不該 call 的工具。
3. **錯誤累積**：第 1 步錯，第 2 步引用第 1 步錯的中間結論，最後答案看起來完整但整串是歪的。

所以 agentic mode 的 production guardrails 至少要有：

| guardrail | 目的 |
|---|---|
| `max_steps` | 限制最多拆幾步 |
| `retry_limit` | 防止 reflect / retry 無限迴圈 |
| `allowed_tools` | 每個 tenant / mode 只能用允許的工具 |
| per-step budget | 每一步都有 token / latency 上限 |
| tool timeout | 工具卡住不能拖死整個 request |
| per-step trace | 每一步要有 Langfuse parent-child span |
| per-step evidence | 每一步留下 citation / source snapshot |
| final verifier | 最後仍要過 citation / faithfulness 檢查 |

一般 RAG 跟 Agentic RAG 的差異，不在「agentic 比較聰明」，而在它的錯誤表面積比較大，所以更需要 trace、budget 和 verifier。

| 一般 RAG | Agentic RAG |
|---|---|
| 一次 query，一次 retrieval | 一個任務拆成多步 |
| retriever 固定 | 每一步可以選不同 tool / retriever |
| 直接組 context | 每一步要先確認 evidence 夠不夠 |
| 最後生成答案 | 中間結果會影響下一步 |
| debug 看單次 trace | debug 看 parent-child spans |

如果沒有這些護欄，agentic mode 不是 production upgrade，而是把更大的錯誤表面積包成比較漂亮的名字。

---

## 5 個 mode 各自的「用於什麼 / 不用於什麼 / 失敗模式」

每個 mode 都要交代三件事，不然生產上會出問題。

### fast：純 vector、零檢查

**用於什麼**：FAQ、已知 runbook、文件結構穩定的內部知識庫。query 短、答案短、來源集中、錯了不致命。

**不用於什麼**：任何「答錯會出事」的 query。合約金額、病人劑量、客戶個資——fast 跑這些題，faithfulness 失敗率接近 100%。**Part 07 那個 Q3 早期終止合約的案例，fast mode 跑出來的答案會跟 Part 06 修 retrieval 之前一模一樣**——skip faithfulness 等於放棄攔截。

**失敗模式**：(1) 同義詞沒覆蓋時 vector recall 掉（「early termination」沒在 chunk 標題，fast 撈不到）；(2) 沒 rerank 過濾，多段文件 noise 太多；(3) 沒 trace，出錯了 debug 不回來。

> 第三個會讓 routing 失效的情境：production 上線後維運的人「覺得」fast 跑得不夠準、想直接加 rerank——加完 fast 的 cost 跟 latency 都上去了、5 種 mode 的區隔就崩。要解決「fast 不準」的問題，不是改 fast 本身，是把這題的 routing 改派到 safe mode。

### safe：合約、法律、醫療

**用於什麼**：Part 06 的 Q3 合約案例、法律條文檢索、MOU 條款查詢。**這是 Part 07 faithfulness / citation 兩道檢查設計出來要對付的主要工作**。

**不用於什麼**：低風險的 FAQ。跑 safe 模式跑 FAQ 等於殺雞用牛刀，cost 5–10 倍但 faithfulness 不會明顯變好——FAQ 答案本來就短，citation 也不需要層層檢查。還有即時互動的「邊聊邊問」，3 秒 latency 比 fast 的 1 秒慢太多，會拖慢使用者對話節奏。

**失敗模式**：(1) faithfulness 假陽性——LLM judge 說某個 claim 沒來源撐、其實有，只是 source 用不同說法；(2) async RAGAS 抽樣偏低，long-tail failure case 沒被掃到；(3) cost 失控——parent expansion 沒節制，context 塞太多 token，**safe mode 是 5 個 mode 裡最容易爆 cost 的**。

### deep_eval：debug 跟 regression

**用於什麼**：(1) 改 prompt / 改 chunking / 改 rerank 之前後做 offline 對照；(2) production 出事時開 5% 抽樣、抓 stage-level trace 找哪個環節壞掉；(3) CI 上跑 offline eval 50–100 題。

**不用於什麼**：**絕對不能跑在 production user path 上**。deep_eval 同步跑 RAGAS + LLM judge 一次 query 5–15 秒，cost 是 fast 的 100 倍、latency 是 fast 的 15 倍。

> 第四個會讓 routing 失效的情境：ops 為了「看更多 trace」把 deep_eval 開到 user path 100%，p95 從 1.5 秒噴到 12 秒——使用者跳出率飆高、API quota 燒光。Langfuse dashboard 上 stage-level trace 還會誤導：顯示 rerank 是瓶頸、其實根本不是、是 sync RAGAS 在等 LLM judge。Part 07 講的「async 5% 抽樣」就是為了避免這個，但有人繞過 async 直接 call sync 就破功。護欄是把 sync deep_eval 包在 `if user is internal_ops: ...` 後面、不開放給一般 user。

**失敗模式**：(1) LLM judge 結果不可重現——同一題跑兩次 faithfulness 分數差 0.1 是正常的，CI 上跑 0.05 threshold 會 flake；(2) offline dataset 過期，chunking 改了但 dataset 還在跑舊 chunk 的分數，**準的分數反而誤導**；(3) deep_eval 同步跑錯路徑（情境已述：ops 不小心開到 user path 100%）。

### creative：開放式問答、摘要

**用於什麼**：「這份 Q3 report 在講什麼」、「幫我整理三點」、「給我一個新行銷方向建議」。答案沒有對錯、只有有沒有用。

**不用於什麼**：factual lookup、需要 citation 的場景。**creative 跑 Q3 早期終止違約金會出事**——faithfulness off 等於 LLM 可以自由 hallucinate，合約條款會被自由詮釋。

**失敗模式**：(1) 切到 llm_first synthesis 之後 LLM 容易「過度展開」——使用者問三點，LLM 回 8 點，token cost 跟 latency 都超標；(2) weak citation 設太鬆變成無 citation，使用者想要的可追溯性掉；(3) **跟 safe 的邊界模糊**——「這份 report 怎麼解讀我們的定價策略」到底算 summarization 還是 factual？解法是 `source_path = "open"` 才允許 creative、其他都走 safe。

### agentic：多步任務、跨文件推理

**用於什麼**：「比對 Q3 跟 Q2 合約的差異」、「從三份報告整理出 risk matrix」。單次 retrieval 撐不住，要拆多步。

**不用於什麼**：單純的「找一段文字」或「摘要一段文字」。**agentic 跑 FAQ 會比 fast 慢 5–10 倍、cost 5–10 倍**——planner 跟 per-step faithfulness 的開銷是固定的，不會因為 query 簡單就省下來。

**失敗模式**：(1) **planner 拆錯步驟**——第 2 步 retrieval 的 query 跟第 1 步結果接不上、後面 faithfulness 跟著連鎖失敗；(2) per-step faithfulness 沒設計好，**第 1 步錯、第 2 步引用第 1 步錯的結果**，error 累積放大；(3) **per-step trace 沒做 Langfuse 父子 span**，debug agentic 跟 debug 一般 query 結構不同，沒 per-step trace 等於放棄 agentic 的可除錯。

---

## 5 個 mode 的數量怎麼落定

可能會問：為什麼是 5 個不是 3 個、不是 8 個？

從粗的開始：早期試過只分「fast」「slow」兩種——fast 跑 FAQ 但也跑合約、slow 跑所有高風險 query。這個同時犧牲兩邊：fast 跑合約出事（fast 段的「不用於什麼」已經提過）、slow 跑 creative 模式（摘要）被 faithfulness 拖慢 3 秒使用者跳出。**5 個以下粒度太粗**，會有某個 mode 為某群 query 付出不該付的代價。

從細的開始：也試過把 safe 拆成「safe-合約」「safe-法律」「safe-醫療」三個，結果三個 mode 的 capability 組合幾乎一樣、debug 變三倍難度、最後合併回一個 safe。**5 個以上粒度太細**，每多一個 mode codebase 多一份維護負擔、能力組合又沒什麼差別。

判斷「要不要拆」、「要不要合併」有兩個硬問題可以直接套：(1) 兩個 mode 的 capability 組合 80% 一樣就合併（避免疊床架屋）；(2) 同個 mode 跑不同 query 的 faithfulness 跟 cost 差距超過 3 倍就該拆（一個 mode 涵蓋太廣、會被迫在「備不住高風險」跟「備不住低成本」之間拉抖）。**這也是 5 這個數字不是 magic number 的原因**——它是從更細的拆解跟更粗的二分都試過才落定的中間值，不是觀察出來的剛好數字。

> 第五個會讓 routing 失效的情境：production 流量變大、看到某個 mode 比例很高（例如 fast 60%），就覺得「乾脆把其他 mode 砍掉只留 fast」省事。這個會把所有高風險 query 一起陪葬。護欄是 mode 數量跟觀察到的 query 風險種類掛鉤、不是跟流量比例掛鉤。

---

## Router 實作的關鍵

最常見的錯就是上面提過的「給 routing 層塞一個 LLM 叫他選 mode」——那條路三層錯（cost、判錯、漂移）都會踩。**正確順序是 cheap feature → rule-based 預篩 → ambiguous 才 fallback LLM**——LLM 是 fallback 不是預設路徑。跟「n8n 用純視覺化不用 LLM router」是同一條設計直覺：先 deterministic 再 LLM fallback。

以下是一個參考實作（基於本系列 Part 05 講到的 FastAPI server skeleton 改寫、**不是 1:1 production 跑的版本**）：

```python
# router.py
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

    # Step 1：multi-step → agentic
    if features.is_multi_step:
        return Mode.AGENTIC

    # Step 2：high domain risk → safe
    if features.domain_risk == "high":
        return Mode.SAFE

    # Step 3：合約 / 法律 + 數字約束 → safe
    if features.has_numeric_constraints and features.source_path in {"contract", "legal"}:
        return Mode.SAFE

    # Step 4：summarization + open source → creative
    if features.intent_classifier == "summarization" and features.source_path == "open":
        return Mode.CREATIVE

    # Step 5：faq / runbook + 短 query → fast
    if features.source_path in {"faq", "runbook"} and features.query_length < 50:
        return Mode.FAST

    # Step 6：其他全部 → safe（預設最嚴格）
    return Mode.SAFE
```

```python
# /ask endpoint
@app.post("/ask")
async def ask(req: AskRequest):
    features = extract_features(req.query, req.context)   # cheap features 先
    if needs_llm_fallback(features):
        features.intent_classifier = await llm_intent_classify(req.query)  # 一次 LLM call

    mode = route(features, override=req.mode)
    return await dispatch(mode, req)   # 各 mode 自己組 pipeline + 各自的 eval/trace
```

實作上幾個坑要預先知道：

- `extract_features` 跟 `llm_intent_classify` 的成本結構每個專案不一樣——上面 Part 05 skeleton 的 `source_path` 是文件 metadata 已經有的（FAQ / runbook / contract 在文件 metadata 標好了），所以免費；如果 source_path 要靠 LLM 判斷，整個成本模型要重算

- `domain_risk = "high"` 的判定如果靠 source_path 直接推（contract / legal / medical metadata 標 high），就夠用；如果是靠關鍵字掃文件內容，誤判率會高、要先跑一輪 offline dataset 校準
- `override=req.mode` 不能對所有 user 開放。這是 ops escape hatch，不是 end user feature。每次 override 都要寫入 audit log：誰覆寫、原本 mode 是什麼、覆寫成什麼、route_reason 是什麼。
- router 的輸出不應該只有 mode，還要寫下 `route_reason`、`features_snapshot`、`fallback_used`。沒有這三個欄位，routing 錯了之後很難回放。

---

## Dispatch 不要長成一坨 if-else

mode router 寫完後，下一個坑是 `dispatch(mode, req)` 很容易長成一坨 if-else。剛開始 5 個 mode 還好，後面一加 SQL tool、long-context pack、agentic workflow，dispatch 會變成新的大泥球。

比較乾淨的做法是把 mode 轉成 pipeline config：

```python
@dataclass
class PipelineConfig:
    use_hybrid: bool
    use_rerank: bool
    use_parent_expansion: bool
    citation_level: str        # "off" / "weak" / "full" / "per_step"
    faithfulness_level: str    # "off" / "async" / "sync" / "per_step"
    trace_level: str           # "query" / "stage" / "full" / "per_step"
    max_cost_usd: float
    timeout_seconds: int
    max_steps: int | None = None
    allowed_tools: list[str] | None = None
```

然後：

```python
mode = route(features, override=req.mode)
pattern = choose_pattern(features)
config = build_pipeline_config(mode, pattern)
return await run_pipeline(config, req)
```

這樣做的好處是：

- mode 邏輯跟 pipeline 組裝邏輯分開
- 新增 SQL / long-context / agentic 不會把 router 寫爆
- config 可以直接寫進 trace，後面 debug 看得到
- CI 可以測 `query → features → mode → pattern → config` 整條鏈

到這裡，`/ask` endpoint 才真的像 production router，而不是換皮的 demo endpoint。

---

## 這篇在整個系列的位置

Part 08 的位置，是把 Part 07 裝好的能力變成可控的 runtime decision。

- Part 06 解的是：怎麼找得更準。
- Part 07 解的是：怎麼知道答案有沒有亂講。
- **Part 08 解的是：每一題該不該付出這些成本。**
- Part 09 會往文件端走，處理 ingestion、metadata、ACL、document API 與 citation viewer。

如果只看一句話：

> Production RAG 不是每題都跑完整 pipeline，而是每題都要被正確地派到它該付出的 pipeline。

Query router 是這個系統的大腦。Agentic RAG 則是當一題已經不是「查一次就能答」時，讓大腦可以拆步、用工具、檢查中間結果，但仍然不失控。

下一篇 Part 09 會換到另一側：如果 query-time router 是決策層，那 ingestion / metadata / ACL 就是這個系統的治理層。沒有治理層，router 再聰明也無法保證文件真的進得來、管得住、查得到。

