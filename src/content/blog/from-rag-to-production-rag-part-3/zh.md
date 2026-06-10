---
title: "從 RAG 到企業級 RAG Part 03 | 一條 RAG request 的 14 站旅程：從文件進來到答案出去"
description: "naive RAG 只覆蓋 14 站裡的 2 站。production RAG 真正多出來的不是任何一個新技術，是另外 12 站 retrieval + context engineering — 從文件進來到答案出去，每一站都在解一個具體問題。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "retrieval", "pipeline"]
date: 2026-06-10T12:30:00
featured: true
subtitle: "從 RAG 到企業級 RAG Part 03"
series: "從 RAG 到企業級 RAG"
seriesOrder: 3
---

Part 02 結尾列了一張 14 站表，但那張是 query 端——只看答案怎麼跑出來。文件怎麼進系統、metadata 怎麼掛、index 怎麼建，那 4 站 Part 02 沒展開。

這篇把整條路攤開。從一份 PDF 進到系統那一刻開始算，到答案回給使用者那一刻結束，總共 14 站。

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

naive RAG 只覆蓋站 6 跟站 11。其他 12 站缺一個，答案品質掉一個層次；缺 3 站以上，這套系統就不該叫 production RAG。

下面照順序拆。

---

## 一、建制側：文件怎麼進來

**站 1 — 資料源**

這站不是 AI 問題，是資料治理問題。資料在哪、格式是什麼、誰能看、多久更新、哪份是最新版、有沒有重複——這幾題沒處理好，後面 13 站做得再漂亮都會出問題。

最常見的踩坑：整個 Google Drive 資料夾全部丟進 RAG。光「重複文件」跟「過時版本」兩個坑，能多花 3 週清理工。Data source 第一步是先定義 connector，不是先寫 code。Google Drive、PDF、Notion、Slack、DB 每一個 source 都有自己的更新節奏與權限模型，要分開接，不要一次 mix。

**站 2 — Parser / OCR**

把文件轉成乾淨結構化內容。

很多 PDF 看起來是文字，實際上是圖層、表格、頁首頁尾、雙欄排版的混亂組合。普通 parser 抽出來會像「資料被果汁機打過」：表格變一行字、章節順序亂掉、footnote 跟內文黏在一起。LLM 接到這種輸入會開始腦補。

實務上分三種文件類型處理：普通文字（Markdown / Google Docs）用基本 parser 即可；合約、報告、簡報用 LlamaParse / Unstructured / Docling 這一類 layout-aware parser；掃描文件、發票、財報走 Mistral OCR / Azure Document Intelligence / AWS Textract。表格不要當成普通文字切，要保留成 Markdown table 或 JSON，否則下游 LLM 引用就會錯位。

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

**站 6 — Hybrid retrieval**

這一步才真正「去找資料」。

```text
dense vector search top 50
+ BM25 / sparse search top 50
+ metadata / ACL filter
→ RRF 合併
```

為什麼不只用 dense？因為不同問題需要不同武器。「合約終止怎麼走」這類語意題 dense 強；`GET /users/me/profile`、`SKU-9921` 這類精確字串題 BM25 強。Production 不是二選一，是一起用。

ACL filter 在這一步執行，不要在 prompt 裡跟 LLM 說「不能看 A 文件」——交給 LLM 守權限，等於把門鎖交給一隻會忘事的狗。

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

Eval 是上線前用測試集跑 regression。50–100 題測試集就夠起步，每次改 pipeline 都跑一輪。比較指標至少有 4 個：Retrieval Recall、Answer Correctness、Faithfulness、Permission Leakage。沒做 eval，改 pipeline 就是靠感覺。

---

## 五、最小可用：14 站裡必做的是這 3 站

資源有限，先做這 3 站：

- **站 6 — Hybrid retrieval**（dense + BM25 + metadata filter）：不做就只能靠 vector top-k，答案離題、引用錯的問題會大量出現。
- **站 10 — Citation assembly**：不做就無法驗證答案的出處，enterprise 場景幾乎不可用。
- **站 12 — Faithfulness check**：不做等於讓 LLM 自由發揮，答案可能看起來對、實際上沒根據。

這 3 站做了，系統還很陽春，但已經脫離「玩具 RAG」。

## 六、進階值得加：投資報酬率最高的 3 站

資源有了，加這 3 站：

- **站 7 — Reranking**：粗找 → 精排，準度明顯提升。Cohere Rerank 上手 30 分鐘。
- **站 8 — Parent-doc expansion**：大幅減少斷章取義。
- **站 14 — Tracing + eval**：debug 跟 optimize 才有數據可看。

這 3 站加完，這套系統就接近 production 等級了。其他站（parser 升級、context compression、agentic query planning）是更後面的事。

---

一條 production RAG request 不是一條線，是一座小型工廠。從文件進到答案出去，14 站各自解一個具體問題。naive RAG 只看得到 2 站，其他 12 站缺一個就掉一個層次。

Part 01 的互動 demo 跑的就是這 14 站完整 production pipeline——可以在文章裡直接問 RAG 系統、看 trace 怎麼流。Part 04 會拆這 14 站由 LlamaIndex、LangGraph、n8n 怎麼分工——這三個工具在 RAG pipeline 裡各自負責哪幾條線，什麼場景該接哪個。
