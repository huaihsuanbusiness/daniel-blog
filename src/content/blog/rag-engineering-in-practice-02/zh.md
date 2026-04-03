---
title: "RAG 工程實戰系列 02 － 從關聯式到向量：資料庫選型地圖與向量資料庫的真正位置"
description: "很多資料庫討論都很愛從「SQL vs NoSQL」開始。"
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:24:00
featured: false
---

很多資料庫討論都很愛從「SQL vs NoSQL」開始。  
這不是錯，只是對 2026 年的工程選型來說，通常太粗了。

因為你真的在選的，往往不是語法陣營，而是這些事情：

- 你的工作負載是 OLTP、OLAP、Search，還是 Retrieval
- 你的資料模型是 relational、document、graph，還是 vector
- 你更在意交易一致性、查詢彈性、檢索延遲，還是維運成本
- 你到底是在做一個 app 的 system of record，還是在做一個檢索子系統

這篇想做的，就是把資料庫重新放回 workload 與資料模型來看。  
最後再回答大家近年最愛問的那題：

> 向量資料庫到底是什麼？它跟「傳統資料庫加上向量功能」差在哪裡？

## 先講核心主張

如果這篇要先講一句話，我會寫成這樣：

> 你不是在選一個「比較酷」的資料庫，你是在選哪一種系統，能在你的工作負載下維持正確性、可查找性、延遲與維運成本的平衡。

這句話看起來有點嚴肅，但它很實用。  
因為資料庫選型真正會出事的地方，很少是 logo 選錯，而是**你拿錯類型去解錯問題**。

## 為什麼 SQL vs NoSQL 不夠用

SQL vs NoSQL 這個切法在入門階段很好用，但真的拿來做工程選型，常常太粗。

例如：

- PostgreSQL 可以做 OLTP，也能透過 pgvector 撐一定程度的向量檢索
- MongoDB 是 document model，但也有 vector search
- Qdrant 是典型 vector-native
- Snowflake / Redshift 是 OLAP / warehouse 取向，近年也在補向量能力

所以你如果還是只問「它是 SQL 還是 NoSQL」，其實抓不到真正重要的決策點。

## 我現在比較相信的第一刀：先看 workload

比起 SQL vs NoSQL，我更喜歡先看工作負載。

### 1. OLTP
這類系統在意的是：

- 低延遲小交易
- 強一致性
- 資料正確性
- 寫入與更新頻繁

像訂單、帳務、會員狀態、庫存，通常都屬於這一掛。

### 2. OLAP
這類系統比較像：

- 少量大查詢
- 掃描、聚合、報表
- 追求吞吐量與分析能力

重點不是交易，而是分析與查詢效率。

### 3. Search / Retrieval
這類系統把「找得到」當成主業。  
全文檢索、倒排索引、向量相似度搜尋、hybrid retrieval 都比較屬於這個範圍。

這三種 workload 的物理問題根本不一樣。  
你如果拿 OLTP 的心態去看 retrieval，常常會很容易做出不必要的架構糾結。

## 再看資料模型：你到底在存什麼樣的世界

除了 workload，第二刀我會看 data model。

### Relational
強項是：

- schema 明確
- 約束清楚
- JOIN、交易語義完整
- 適合 system of record

### Document
強項是：

- 一筆 document 就能帶一段完整語意
- schema 演進比較彈性
- 很適合內容型、設定型、事件型資料

### Graph
當關係查詢本身是主角時，graph 很有吸引力。  
但它不是每個系統都需要。

### Vector
向量模型的重點不是「它比較 AI」，而是它把資料投影成高維語意空間，讓相似度搜尋成為第一公民。

## 向量到底在解什麼問題

向量不是魔法，它只是另一種表示方式。

你把一段文字、圖片、商品描述、使用者行為嵌進一個高維空間裡，然後希望：

- 語意近的點，距離也近
- 問句跟 relevant passage 會靠在一起

這樣做的好處是：  
你不需要 query 跟文件用完全同樣的字，也有機會抓到語意相關內容。

但這也帶出另一個物理問題：  
**如果資料量很大，每次都線性掃描所有向量，成本會很醜。**

所以才會有 HNSW、IVF 這類 ANN 結構。

## 什麼叫向量資料庫

如果要講得比較專業但不裝神秘，我會這樣定義：

> 向量資料庫是一種把向量相似度檢索當成第一公民的資料系統。它不只存向量，還要把距離度量、ANN index、metadata 過濾、查詢延遲與可觀測性整合成可運行的產品。

這裡的關鍵字是**第一公民**。

很多資料庫「可以放向量」，不代表它就是向量資料庫。  
差別常常在於：向量搜尋是附加能力，還是整個查詢路徑與資料結構設計的中心。

## vector-native 跟 vector-capable 的差別

這是我覺得很有用的一刀。

### vector-native
這類系統本來就是為了向量檢索而生。  
像 Qdrant 這種產品，核心資料結構、filter 與檢索的整合方式、ANN index、payload 設計，都把 retrieval 當主業。

### vector-capable
這類系統本體原本不是專門做向量檢索，但後來長出向量能力。  
像 PostgreSQL + pgvector、MongoDB 的 vector search、甚至某些 warehouse 的向量功能，都比較像這一型。

它們的優勢通常是：

- 資料不用搬家
- 跟原本 app / analytics stack 整合比較順
- 權限、備份、維運可以沿用原本系統

代價通常是：

- 檢索調校與上限可能沒那麼專精
- 在複雜 retrieval workload 上，未必像 vector-native 那麼舒服

## 什麼時候其實不需要獨立向量資料庫

這裡也要講一句很重要的反例。

不是每個 RAG 或 semantic search 專案，都值得第一天就拉一套獨立 vector DB。  
如果你現在的情境是：

- 資料量還不大
- retrieval 不是產品主路徑
- 你本來就有 PostgreSQL / Supabase
- 你比較在意一致性、治理、備份與簡單維運

那一開始走 pgvector 這類 vector-capable 路線，很可能更實際。

反過來說，如果你的情境是：

- retrieval 本身就是主路徑
- 高 QPS
- 複雜 filter
- 多租戶
- metadata 邊界很多
- 需要獨立縮放與調校

那像 Qdrant 這種 vector-native 的產品，會更像正確的戰場。

## 為什麼這跟 RAG 很有關

回到前一篇。  
RAG 不等於向量資料庫，但如果你真的要做 retrieval-heavy 的 RAG，資料庫選型又確實會決定很多後續事情。

因為你後面會遇到的都不是抽象問題，而是很實際的事：

- metadata filter 要不要好做
- payload index 好不好設
- 跟現有 app DB 的責任怎麼切
- retrieval 是不是要獨立擴展
- vector search 跟 source-of-truth 要不要拆開

這也是為什麼我會覺得：  
向量資料庫真正的位置，不是在「AI stack 的最潮玩具」，而是在整個資料系統地圖裡的一個 retrieval-oriented 角色。

## 我現在比較相信的選型判準

如果把整篇收成幾條我真的會帶走的判準，大概是：

1. 先看 workload，再看資料模型  
2. 先問 retrieval 是主路徑還是配角  
3. vector-native 跟 vector-capable 都有合理主場  
4. 不要因為大家在講向量資料庫，就假設自己一定要獨立拉一套  
5. 真正該選的是整體系統邊界，不是單一元件的潮度

## 下一篇會接什麼

下一篇我會進一個更細、也更容易在實作裡踩到的點：

**chunking。**

也就是說，當你真的開始做 retrieval 時，最早看起來像小事、最後卻會一路影響到 evidence pack、召回品質與輸出穩定度的那個地方。
