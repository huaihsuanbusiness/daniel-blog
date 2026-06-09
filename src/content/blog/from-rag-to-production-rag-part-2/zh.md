---
title: "從 RAG 到企業級 RAG Part 02 | chunk + embedding 還活著：企業級 RAG 真正多出來的那幾層"
description: "技術社群說 chunking 跟 embedding 過時了，但這句話半對半錯。production RAG 真正多出來的不是任何一個新技術，是 12 站 retrieval engineering。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "retrieval", "observability"]
date: 2026-06-10
featured: true
subtitle: "從 RAG 到企業級 RAG Part 02"
series: "從 RAG 到企業級 RAG"
seriesOrder: 2
---

技術社群裡常聽到一句話：「chunking/embedding 做 RAG 已經過時了，現在最先進的是 X。」

這句話半對半錯。

對的部分：naive RAG（chunk + embedding + vector top-k → LLM）這套 single-step pipeline，在 production 環境下不夠用。答案離題、引用錯、成本失控——這些不是某個 RAG 框架的問題，是 pipeline 設計的問題。

錯的部分：把「chunking 過時」「embedding 過時」「vector DB 過時」這三件事混為一談。

事實上，這 3 個技術在 production RAG（企業級 RAG）裡仍然是地基。**真正過時的不是任何一個技術，是「只靠這 3 個就假裝是 production RAG」這個組合。**

這篇要拆清楚的是：chunking / embedding / vector DB 在 production 環境裡實際扮演什麼角色，以及它們上面要疊哪些層，系統才能撐起真實查詢。

---

## 一、3 個技術的實際角色

**chunking 在 production 裡做什麼？**

不是「把文件切小、丟進向量 DB」就結束。Production 環境的 chunking 包含：保留語意邊界（不要從句中切）、掛 metadata（章節、頁碼、時間、語言、權限）、規劃 parent-child 結構（搜尋找小 chunk，組裝回原文大段落）。

Anthropic 在 2024 提出的 Contextual Retrieval 是清楚案例：在每個 chunk 前補上文件脈絡，再做 embedding 跟 BM25，top-20 chunk retrieval failure rate 從 5.7% 降到 1.9%，失敗率降低約 67%。

**embedding 在 production 裡做什麼？**

Dense embedding 處理語意搜尋。但它對專有名詞、代碼、數字、日期、產品型號常常抓不到——這在保單、信用卡合約、法務文件這類精確詞密集的場景特別明顯。Production 一定要再疊一層 sparse / BM25——兩個一起用（hybrid search）才能同時覆蓋「語意」跟「精確詞」兩種需求。

**vector DB 在 production 裡做什麼？**

Vector DB 仍然是語意搜尋的最佳工具。但它不該是唯一真相來源。Production 系統的 raw 文件、metadata、權限、parent document、eval 結果，都放在 Postgres / S3 / object store，vector DB 只負責 vector search 那一段。

**簡單說：3 個技術都活著，過時的只是「只用它們」的單薄組合。**

---

## 二、1 個完整的 production RAG request

要說明 naive RAG 缺什麼，最直接的方式是走 1–2 次 production pipeline。

**情境 A：投資人 pitch deck 設計檢查**

假設我在做自己的投資人 pitch deck，問題是：

> 「這份 deck 的前 30 秒，會讓 DocSend 2024 那份研究裡說的『平均 2 分 42 秒』的投資人，願意停下來繼續看嗎？同類型的 deck 在前 30 秒通常做什麼？」

這題要走到答案，會經過 14 站：

```text
1.  Query 進到系統
2.  Query classification（這題屬於 pitch design + competitive analysis）
3.  Query rewrite（轉成好搜尋的關鍵字）
4.  Query decomposition（拆成 3 個 sub-query：前 30 秒、DocSend 研究、同類型 deck）
5.  Routing（決定要查哪些資料源：pitch deck 設計文、DocSend 研究、競爭對手 deck 拆解、創業方法論）
6.  Hybrid retrieval（dense + BM25 + metadata filter）
7.  Reranking（粗找 50-100 個候選，精排到 5-20 個）
8.  Parent-doc expansion（小 chunk 找回整篇文章段落）
9.  Context compression（壓掉無關內容）
10. Citation assembly（把 source / page / section 綁起來）
11. LLM 生成答案
12. Faithfulness check（答案有沒有被來源支持）
13. Citation check（引用對不對）
14. Tracing + logging（記錄每一步給 eval / debugging）
```

**情境 B：客戶切換成本分析**

另一個常見的查詢是 B2B 銷售的：

> 「對方有需求、有預算、也看得懂你的價值，但一直不買。問題出在哪？要不要繼續 push？」

這類查詢在 production 環境需要：跨多份訪談筆記、跨多份商業模式分析、跨多份客戶案例——是真正的多源、跨文件、需要多步推理的問題。naive RAG 在這個情境下通常會答得很淺。

**這 14 站是 production RAG 的最小集合。naive RAG 極簡版只覆蓋第 6 跟第 11。** 其他 12 站缺一個，答案品質就掉一個層次；缺 3 個以上，系統就不該上 production。

---

## 三、過時的只有那一塊

按 production 觀察整理：

- **沒過時：** chunking（搭配 metadata、parent structure）
- **沒過時：** embedding（搭配 sparse / BM25 做 hybrid）
- **沒過時：** vector DB（只是 retrieval system 的一個元件）
- **過時了：** 「chunk + embedding + vector top-k → LLM」這套 single-step pipeline

這個區分在 production 環境裡很關鍵。**決定 RAG 答案品質上限的，不是 embedding model 多強，而是 retrieval 系統設計得多完整。**

這也是這個專案把 70% 精力花在 retrieval layer 的原因——hybrid search、reranking、context assembly、citation 這些能力，比換一個更貴的 embedding model 更能拉開差距。

---

## 四、這個專案的 V0 → V4 演進

這個專案的版本演進大致可以分成 4 個階段：

### V0 — 純向量版

```text
文件 → chunk → embedding → vector top-k → LLM
```

V0 的常見失敗模式：問具體數字答不出來、問跨章節綜合問題答成片段拼接、引用來源給錯頁。

### V1 — 加上 hybrid + rerank

```text
+ sparse / BM25
+ metadata filter
+ reranker（先抓 100，再精排 10）
```

V1 解掉 V0 大約 60% 的失敗模式——精確詞抓到了、rerank 把最相關的 10 個排到前面。但還缺 citation、缺 eval。

### V2 — 加上 context assembly + citation

```text
+ parent-doc expansion
+ context compression
+ citation assembly
```

V2 開始有可信回答——每個答案都附 source / page / section，引用對得起來。

### V3 — 加上 observability + eval

```text
+ faithfulness check
+ citation check
+ offline eval dataset
+ Langfuse tracing
+ cost / latency tracking
```

V3 之後 debug 跟 optimize 才有數據可看，不再靠「試試看哪個 prompt 比較好」這種土法煉鋼。

### V4 — 加上 query planning + agentic

```text
+ query classification
+ query rewrite / decomposition
+ routing
+ agentic workflow（agent 決定何時查、查哪裡、查幾次）
```

V4 處理最難的查詢：跨多文件、跨多資料源、需要多步推理的問題。

這個 V0 → V4 是這個專案的實際演進順序。**Part 02 只給一張全貌圖，後面 9 篇會逐段拆。**

---

chunk + embedding 在 2026 仍然是 RAG 的地基，沒過時。過時的只有「只用它們就假裝是 production」那套單薄做法。

**真正決定 RAG 上限的，是中間這 12 站 retrieval engineering。**

這套 14 站 pipeline 不只用在 RAG 內部。pitch deck 設計檢查、客戶切換成本分析、訪談方法驗證、workflow 工具選擇——這些情境都吃同一套 retrieval engineering 邏輯；差別只在 routing 跟 context assembly 怎麼設計。

下一篇（Part 03）會畫一張完整的 14 站 pipeline 圖，每站拆解做了什麼、怎麼實作、用什麼工具。

想直接體驗 production 14 站怎麼跑，可以從 Part 01 的互動 demo 開始——那個 demo 跑的，就是這篇講的 14 站完整 production pipeline。
