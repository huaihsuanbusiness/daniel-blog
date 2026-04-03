---
title: "RAG 工程實戰系列 01 － RAG 不只是向量資料庫：先把整張系統地圖看懂"
description: "很多人第一次碰 RAG，很容易先把注意力放在向量資料庫上。這其實很合理，因為看起來最有「新技術感」的地方，通常就是 embedding、向量搜尋、ANN index 這些詞。"
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:23:00
featured: false
---

很多人第一次碰 RAG，很容易先把注意力放在向量資料庫上。這其實很合理，因為看起來最有「新技術感」的地方，通常就是 embedding、向量搜尋、ANN index 這些詞。

但真的把系統做起來之後，你很快就會發現一件事：**向量資料庫常常只是 RAG 裡的一條腿，RAG 本身是整台機器。**

這篇想做的事很單純，就是先把整張地圖攤開來。先搞清楚 RAG 到底在解什麼問題、它跟向量資料庫的責任邊界在哪裡、典型 pipeline 長什麼樣，還有為什麼很多看起來像模型問題的東西，最後其實都會回到 evidence、context、evaluation 這些比較不 flashy 的地方。

## RAG 真正在解什麼問題

如果把大型語言模型當成一位會寫、會整理、也很會把話講順的同事，那它最大的問題通常不是「不會講」，而是**不知道自己不知道**。

這種問題在真實工作裡常常長這樣：

- 文件更新了，模型還停在舊知識
- 真正要查的資料在內網、SOP、工單、合約、筆記裡，不在公開網頁
- 你需要它講得有根據，但它很會把不確定講得很確定

RAG 的價值，不是把模型變得更有靈魂，而是讓它在生成之前，先被餵到可驗證的資料。換句話說，RAG 真正解的是 **grounding** 問題，不是文筆問題。

## 先講核心主張

如果這篇要先丟一句結論，我會寫成這樣：

> RAG 不是向量資料庫。向量資料庫通常只是檢索層的一個實作選項，RAG 則是一套包含檢索、上下文組裝、生成約束與評估的系統設計。

這個差別很重要。因為如果你一開始就把 RAG 理解成「把文字切塊、丟去向量資料庫、再叫模型回答」，後面很容易一路踩坑，然後懷疑是不是自己模型不夠大。

## 比較嚴格的 RAG 定義

一句話版可以說：

**RAG = 先檢索，再生成。**

但如果你真的要把它做成一個能用的系統，我反而會比較想用這個版本：

> RAG 系統 = 檢索 + context building + 有約束的 generation + evaluation / observability

少了任何一塊，系統都可能看起來會動，但其實不太可靠。

- **檢索**：把相關 evidence 帶回來
- **context building**：決定哪些內容真的該進 prompt、順序怎麼排、怎麼去重
- **有約束的 generation**：要求模型根據 evidence 回答，必要時承認資料不足
- **evaluation / observability**：知道系統到底有沒有變好，出錯時能不能定位是 R 壞了還是 G 壞了

## 為什麼 RAG 不等於向量資料庫

這裡很值得切清楚。

向量資料庫解的是：  
**我怎麼把資料投影進向量空間，然後有效率地做相似度搜尋。**

RAG 解的是：  
**我怎麼讓模型在回答時，能站在對的 evidence 上，而不是靠參數記憶與流暢胡說。**

這兩者有重疊，但不是同一件事。

你可以用向量資料庫做 RAG。  
但你也可以：

- 用 BM25 / 倒排索引做稀疏檢索
- 做 hybrid retrieval
- 用結構化查詢、SQL、Graph query 當 retrieval 的一部分
- 先 recall，再 rerank，再進生成

所以更準的講法應該是：

- **RAG** 是方法與系統
- **Vector DB** 是其中一種 retrieval 元件

## 典型 RAG pipeline 長什麼樣

如果把一個比較典型的 RAG pipeline 拆開，大概會有兩條主流程：

### 1. 離線流程：ingestion / indexing
- 收集文件
- 清洗與正規化
- chunking
- embedding
- 建 index
- 保留 metadata，例如文件 ID、章節、版本、ACL、日期

### 2. 線上流程：retrieval / generation
- 理解 query
- recall top-k 候選
- 做 rerank 或 fusion
- 組 evidence pack
- 要求模型 grounded answer
- 補 citation
- 記錄 logs、metrics、feedback

你會發現，向量資料庫大致只占其中一小段。  
如果前後都沒做好，它就算再快，也救不了整套系統。

## 檢索只是第一關，context building 才是很多系統開始歪掉的地方

很多人第一次做 RAG 時，會把心力全放在「有沒有把相關段落撈回來」。這當然重要，但只撈回來還不夠。

因為後面還有一個很實際的問題：

> 你到底要把哪些 evidence 組進 prompt？順序怎麼排？要不要去重？要不要保留文件來源與版本資訊？

這就是 context building。  
它很 boring，但常常決定輸出穩定度。

一包 evidence 太胖，模型會抓不到重點。  
一包 evidence 太碎，模型又會腦補。  
這些都不是向量資料庫單獨能解的。

## 生成層真正該做的，是把模型綁回 evidence

RAG 裡的 generation，不該只是「看到 evidence 後再自由發揮」。  
比較健康的做法通常是：

- 要求回答引用來源
- 沒足夠 evidence 時說不知道
- 盡量不要跨 evidence 過度補完
- 對高風險場景做 answer shape 與 citation 的約束

這也是為什麼很多 production RAG 系統會把 prompt 設計成比較像審稿規格，而不是創作模式。

## 評估與可觀測性不是附加題

這也是最常被延後、但最後一定會回頭補的一塊。

如果沒有 evaluation 與 observability，你很難回答：

- 這次改 chunking 到底有沒有變好？
- topK 調高後，是 recall 變好，還是只是噪音變多？
- 某題答錯，是 retrieval 沒抓到 evidence，還是 generation 超譯？
- 文件更新後，答案是因為版本差異改變，還是因為系統漂了？

所以 production RAG 跟 demo RAG 最大的差別，通常不是模型大小，而是你有沒有開始認真對待 evidence、citation、metrics、logs 這些東西。

## 什麼時候其實先不要做 RAG

這裡也要補一句誠實話。

不是每個場景都值得一開始就上完整 RAG。  
如果你的場景是：

- 文件量很小
- 更新不頻繁
- 風險不高
- 使用者本來就會點原文
- 資料型態很結構化

那有時候搜尋 + 摘要 + 清楚 source linking 就夠了。

RAG 真正划算的地方，通常在於：

- 文件量大
- 更新頻繁
- 查詢方式很多變
- 需要 grounded answer
- 需要追溯與稽核

## 這篇要留下的幾個判準

如果要收成幾條我自己會帶走的規則，大概是：

1. RAG 先是 evidence system，才是 LLM system  
2. 向量資料庫很重要，但它不是整套系統  
3. 檢索、context building、generation、evaluation 缺一不可  
4. 很多問題不是模型太弱，而是 evidence 邊界沒設計好  
5. production RAG 的難點，往往比 demo 更接近資料工程與系統工程

## 下一篇會接什麼

下一篇我會把鏡頭拉到更底層一點，回答另一個很常被混在一起的問題：

**如果 RAG 不是向量資料庫，那向量資料庫在整個資料系統地圖裡，到底站在哪裡？**

也就是從關聯式、文件型、搜尋系統一路看到 vector-native 與 vector-capable 的差別。
