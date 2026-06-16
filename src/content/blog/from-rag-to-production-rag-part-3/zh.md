---
title: "從 RAG 到企業級 RAG Part 03 | Production RAG 的 14 站能力地圖：從文件進來到答案出去"
description: "naive RAG 通常只覆蓋 production capability map 的一小部分。本文把 14 站重新定位成能力地圖：從建庫、query planning、retrieval、context assembly、verification 到 tracing，並標出 Multimodal / Document RAG、Structured / SQL RAG、Long-context Hybrid、Agentic RAG 分別長在哪些位置。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "retrieval", "pipeline"]
date: 2026-06-10T12:30:00
featured: true
subtitle: "從 RAG 到企業級 RAG Part 03"
series: "從 RAG 到企業級 RAG"
seriesOrder: 3
---

Part 02 結尾列了一張 14 站表，但那張是 query 端——只看答案怎麼跑出來。文件怎麼進系統、metadata 怎麼掛、index 怎麼建，那 4 站 Part 02 沒展開。

這篇把整套能力攤開。從一份 PDF 進到系統那一刻開始算，到答案回給使用者那一刻結束，系統可能用到 14 站；但單一 request 通常只啟用其中一個子集合，取決於 query 的風險、意圖與資料來源。

![Production RAG 的 14 站旅程](/images/from-rag-to-production-rag-part-3/part-03-14-station-journey.png)

```text
建制側（4 站）
1.  資料源 connector
2.  Parser / OCR
3.  Chunking + metadata + ACL
4.  Index（dense / sparse / metadata / docstore）

查詢側（10 站）
5.  Query planning（classification / rewrite / decomposition / routing）
6.  Hybrid retrieval（dense + BM25 + metadata filter）
7.  Reranking
8.  Parent-doc expansion
9.  Context compression
10. Citation assembly
11. LLM answer
12. Faithfulness check
13. Citation check
14. Tracing + eval
```

naive RAG 通常只覆蓋站 6 跟站 11。其他站不是每題必跑的關卡，而是系統在高風險、高複雜度、需要可解釋性或 debug 時應該具備的能力。

這張圖還有另一個用途：它告訴你所有 specialized patterns 應該長在哪裡，而不是被當成獨立 buzzword。

| Specialized pattern | 它接在哪些站 | 為什麼放這裡 |
|---|---|---|
| Multimodal / Document RAG | 站 2、3、10 | 這不是「多一個 retriever」，而是 parser、metadata、citation payload 的延伸 |
| Structured / SQL RAG | 站 5、6 | 這是 routing pattern：有些問題應該查 SQL / API，不應該找文件段落 |
| Long-context Hybrid | 站 8、9、10 | 它不是把所有文件塞進 context，而是 retrieve 後做 smarter packing |
| Agentic RAG | 站 5、6、12、14 | 它是 planning / tool routing / evaluate / retry / trace 的 query-time workflow |

下面照順序拆，但請把它當成能力地圖，不是每個 query 都必須照順序跑滿的規則。


> **版本提醒**：本文用 pipeline 圖與 API-shaped examples 來說明架構。套件名稱、SDK 呼叫方式、雲服務預設值都可能改版；自己的專案要 pin 版本，直接複製實作細節前請先對照最新官方文件。

---

## 一、建制側：文件怎麼進來

**站 1 — 資料源**

這站不是 AI 問題，是資料治理問題。資料在哪、格式是什麼、誰能看、多久更新、哪份是最新版、有沒有重複——這幾題沒處理好，後面 13 站做得再漂亮都會出問題。

最常見的踩坑：整個 Google Drive 資料夾全部丟進 RAG。光「重複文件」跟「過時版本」兩個坑，能多花 3 週清理工。Data source 第一步是先定義 connector，不是先寫 code。Google Drive、PDF、Notion、Slack、DB 每一個 source 都有自己的更新節奏與權限模型，要分開接，不要一次 mix。

**站 2 — Parser / OCR**

把文件轉成乾淨結構化內容。

很多 PDF 看起來是文字，實際上是圖層、表格、頁首頁尾、雙欄排版的混亂組合。普通 parser 抽出來會像「資料被果汁機打過」：表格變一行字、章節順序亂掉、footnote 跟內文黏在一起。LLM 接到這種輸入會開始腦補。

實務上分三種文件類型處理：普通文字（Markdown / Google Docs）用基本 parser 即可；合約、報告、簡報用 LlamaParse / Unstructured / Docling 這一類 layout-aware parser；掃描文件、發票、財報走 Mistral OCR / Azure Document Intelligence / AWS Textract。表格不要當成普通文字切，要保留成 Markdown table 或 JSON，否則下游 LLM 引用就會錯位。

這也是 Multimodal / Document RAG 的入口。文件不是只有 text，production 文件常常同時包含 table、image、layout、caption、page coordinate。真正麻煩的不是「模型能不能看圖」，而是這些非文字內容要怎麼被保存成可檢索、可引用、可權限控管的結構。Part 09 會把這件事放到 ingestion / document API 裡細講；在這裡先把位置標出來：它主要長在站 2、站 3、站 10。

**站 3 — Chunking + metadata + ACL**

Naive chunk 只有 text。Production chunk 多掛三組東西：metadata、ACL、parent-child 結構。

metadata 是這段文字的「身份證」：文件標題、頁碼、章節、heading path、日期、語言、doc_type、tenant_id、source_url。沒掛 metadata，使用者問「2024 Q3 簽的合作協議裡，early termination 怎麼算」，光靠 embedding 找不準，必須靠 filter 收斂。

ACL 是 access control。企業 RAG 不能讓所有人看到所有資料。每個 chunk 帶 `access_roles` 跟 `tenant_id`，查詢時在 retrieval layer 加 filter。沒做 ACL 的 RAG 很容易變成資料外洩機器，像一個嘴很鬆的圖書館員。

parent-child 結構是為站 8 鋪路：小 chunk 好搜尋，大 parent 好回答。chunk 必須掛 parent_id，之後查詢時能從小 chunk 找回整段 section。

**站 4 — Index**

Naive RAG 只有 dense vector index。Production RAG 至少有三種 index 一起跑：

- **Dense vector** — 處理語意搜尋、同義詞、模糊概念。缺點：對 `GET /users/me/profile`、`INV-2025-003`、法律條款編號這類精確字串抓不穩。
- **Sparse / BM25** — 傳統關鍵字搜尋的進階版。專門處理專有名詞、API endpoint、人名、ID、數字、條款編號。Dense 抓不到的，它抓得到。
- **Metadata / payload index** — 給 filter 用的。`document_type = legal` 跟 `access_roles contains "admin"` 這類條件，如果沒建 index，每次查詢都要掃全表，慢又危險。

這三種 index 一起建、一起查，才叫 production index layer。Qdrant 跟 Azure AI Search 都支援 dense + sparse + payload filter 的 hybrid queries，再用 RRF（Reciprocal Rank Fusion）合併結果。

---

## 二、查詢規劃 + 檢索：query 怎麼進來

**站 5 — Query planning**

使用者丟進來一句話：「這份 Q3 合約的 early termination 怎麼走？違約金是多少？幫我整理成可以回法務的版本。」

這不是一個問題，是三個。Query planning 讓系統先想清楚再做：這是什麼問題、要查哪些資料、要不要拆、要不要改寫、要去哪個 retriever。

實作上拆 4 件事：Classification（判斷問題類型）、Rewrite（把人話改成搜尋引擎比較吃得懂的查詢）、Decomposition（複雜問題拆 subquestion）、Routing（決定去哪查）。這 4 件事可以由一個 LLM 一次輸出 structured plan，也可以拆成多步 workflow。LangGraph、LlamaIndex Workflow、CrewAI、AutoGen 都能做，但新手不要一開始就上 agentic，先用 LlamaIndex RouterQueryEngine 或 LangGraph 簡單的 router node 就夠。

Structured / SQL RAG 也在這一站進場。當使用者問「上個月每個 plan 的 churn rate 是多少」或「列出 ARR 大於 10 萬且 30 天內有 support escalation 的客戶」，答案不在文件段落裡，而在 table、SQL、BI layer 或內部 API 裡。這種 query 應該被 router 導到 SQL / API tool，而不是硬塞進 vector retrieval。Part 08 會主講這個 routing decision。

**站 6 — Hybrid retrieval**

這一步才真正「去找資料」。

```text
dense vector search top 50
+ BM25 / sparse search top 50
+ metadata / ACL filter
→ RRF 合併
```

為什麼不只用 dense？因為不同問題需要不同武器。「合約終止怎麼走」這類語意題 dense 強；`GET /users/me/profile`、`SKU-9921` 這類精確字串題 BM25 強。Production 不是二選一，是一起用。

ACL filter 在這一步執行，不要在 prompt 裡跟 LLM 說「不能看 A 文件」。權限應該由 retrieval layer 強制執行，不應該交給文字生成模型臨場遵守。

**站 7 — Reranking**

Hybrid search 找 50–200 個候選，但這裡面有些只是看起來相關。Reranker 用 cross-encoder 重新排序，把有用的 5–20 個排到前面。

主流選項：Cohere Rerank（managed，馬上能跑）、BGE reranker（自架，成本可控）、Jina / Voyage（多語或重檢索場景）。Qdrant 也有 ColBERT / multivector 選項，但那比較進階，新手先用外部 reranker 比較單純。

---

## 三、上下文組裝 + 回答：候選變成 LLM 可吃的 context

**站 8 — Parent-doc expansion**

小 chunk 找得到位置，但回答時需要整段 section。

搜尋抓到一句「no platform fee shall be charged」。如果只把這一句丟給 LLM，LLM 不知道前文後理，可能答成「不收費，但未來永久免費」這種腦補答案。Parent-doc expansion 把這句所屬的整個 Section 3 拿回來，連同 3.1、3.2、3.3 一起餵給 LLM。靠 `parent_id` 在 Postgres / docstore 裡 lookup。

**站 9 — Context compression**

整段 section 抓回來後，裡面可能有一半跟問題無關。Compression 把不相關的句子過濾掉，只留跟 query 有關的內容。省 token、降低雜訊、減少 LLM 亂引用的機率。LangChain ContextualCompressionRetriever 或自寫 LLM compressor 都能做。

Long-context Hybrid 也長在這一段。它不是「把所有文件都塞進 context window」，而是先用 retrieval 找出少數高相關 parent docs，再用 compression、ordering、budget guard 做 smarter packing。當 top-k chunk 太碎、但 full corpus 又太大時，這個 pattern 才有意義。Part 06 會主講這個取捨。

**站 10 — Citation assembly**

把每個答案綁回 source / page / section。沒有 citation assembly，LLM 答對了你也無法驗證；LLM 答錯了更不知道它憑什麼錯。

實作上 context 包裡每個 chunk 帶 `source_id`、`page`、`section`，LLM prompt 要求「每個重要主張都要附來源」。LlamaIndex 的 CitationQueryEngine 或自寫 source mapper 都能做。

**站 11 — LLM answer**

終於到 LLM 生答案。但 production prompt 不會只寫「根據以下內容回答」。會更接近：

```text
你是公司內部知識助理。
只能根據提供的 context 回答。
如果 context 不足，明確說不知道。
每個重要主張都要附來源。
不要使用未出現在 context 裡的資料。
如果來源互相矛盾，指出矛盾。
```

這套 system prompt 規則決定了答案「可不可信」。把它寫軟，整個系統就只剩 demo 等級。

---

## 四、可上線的最後一塊：production 跟 demo 的差距

**站 12 — Faithfulness check**

檢查答案是否忠於來源。

context 只寫「early termination 需 30 天通知」，LLM 答成「early termination 不需要事先通知」——這就是不 faithful。因為「不需要事先通知」不是來源說的。Faithfulness check = 答案裡的每個主張，來源有沒有支持。RAGAS、DeepEval、LlamaIndex Evaluators、自寫 LLM judge 都能做。

**站 13 — Citation check**

檢查引用是否真的支持 claim。跟 faithfulness 不一樣：faithfulness 看「答案有沒有根據」，citation 看「引用對不對」。

常見錯誤：答案說 A，但引用的 source 其實只支持 B。這個錯誤在 production 環境特別痛，因為 LLM 答得頭頭是道，但引的其實是錯的來源。實作上通常是自寫 LLM judge 做 claim-level 檢查。

**站 14 — Tracing + eval**

沒有 tracing，答案錯了只能拜 AI 神明。

Tracing 記錄每次 query 的完整路徑：分類、rewrite、retrieval top chunks、rerank 後 top chunks、LLM 輸入、faithfulness 結果。Langfuse 開源、LangSmith 整合 LangChain 比較深，二擇一即可。

Agentic RAG 不能只看成「模型自己多跑幾步」。在這張 14 站圖裡，它橫跨站 5、站 6、站 12、站 14：先 planning，決定查文件還是叫工具；執行後 evaluate；不足就 retry 或改查法；最後每一步都要能 trace。沒有這些站，agentic 只是更難 debug 的 query pipeline。Part 08 會把它展開成 runtime loop。

Eval 是上線前用測試集跑 regression。50–100 題測試集就夠起步，每次改 pipeline 都跑一輪。比較指標至少有 4 個：Retrieval Recall、Answer Correctness、Faithfulness、Permission Leakage。沒做 eval，改 pipeline 就是靠感覺。

---

![最小可用與高投資報酬率站點](/images/from-rag-to-production-rag-part-3/part-03-minimum-vs-high-roi-stations.png)

## 五、最小可用：我會最先做的 3 個能力

資源有限，而且系統要回答私有或商業關鍵文件時，我會先做這 3 站：

- **站 6 — Hybrid retrieval**（dense + BM25 + metadata filter）：不做就只能靠 vector top-k，答案離題、引用錯的問題會大量出現。
- **站 10 — Citation assembly**：不做就無法驗證答案的出處，enterprise 場景幾乎不可用。
- **站 12 — Faithfulness check**：不做等於讓 LLM 自由發揮，答案可能看起來對、實際上沒根據。

這 3 站做了，系統還很陽春，但對高風險 document QA 已經有最基本護欄。低風險 FAQ 仍然可以走 Part 08 的 fast path；重點是 query 需要時，系統要有能力切過來。

## 六、進階值得加：投資報酬率最高的 3 站

資源有了，加這 3 站：

- **站 7 — Reranking**：粗找 → 精排，準度明顯提升。Cohere Rerank 上手 30 分鐘。
- **站 8 — Parent-doc expansion**：大幅減少斷章取義。
- **站 14 — Tracing + eval**：debug 跟 optimize 才有數據可看。

這 3 站加完，系統會更容易安全地優化。其他站（parser 升級、context compression、agentic query planning）是 risk-based additions，不是每個 request 的硬性成本。

---

Production RAG 不是一條固定流水線，也不是每個 request 都跑滿整張圖。14 站是一份 capability inventory：每站解一個具體問題，router 依照 query 風險與意圖選出該用的子集合。naive RAG 通常只看得到其中一小塊；風險升高時，可靠性、治理與可 debug 性才會從其他站補進來。

Part 01 的互動 demo 展示的正是這個 routing 思路——可以在文章裡直接問 RAG 系統、切 mode、看 trace 走哪條路。Part 04 會拆這些能力由 LlamaIndex、LangGraph、n8n 怎麼分工——哪個工具負責哪條線，什麼場景該接哪個。
