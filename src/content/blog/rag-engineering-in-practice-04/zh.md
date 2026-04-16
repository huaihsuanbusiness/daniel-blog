---
title: "RAG 工程實戰系列 04 － Qdrant filter 為什麼噴 `Index required`：payload index、schema 與 filter 設計一次講懂"
description: "第一次在 Qdrant 上加 filter，很多人都會撞上一個很反直覺的錯誤："
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:26:00
featured: false
---

第一次在 Qdrant 上加 filter，很多人都會撞上一個很反直覺的錯誤：

> Bad request: Index required but not found for "source_type"

你第一眼看到它，通常會有一點問號。因為 payload 裡明明就有 `source_type`，filter 看起來也很正常，為什麼 Qdrant 還要你先建 index？

這種錯很適合讓人誤會。
表面上它像一個煩人的 400，實際上它在提醒你一件很重要的事：

**當你開始用 `source_type`、`memory_set`、`job_id` 這些 metadata 來控制檢索時，你已經不只是在存向量，你其實在做 schema 設計。**

這篇想做的，不只是教你把錯誤修掉。我想把 payload index、field schema、filter 設計，以及它們跟 RAG retrieval 的關係一次講清楚。

## 先講核心主張

如果只收成一句話，我會這樣講：

> payload index 不是 Qdrant 的小細節，它是你把結構化條件正式引進檢索系統的那一步。

在 RAG 裡，我們很常一邊做向量相似度，一邊又想加結構化限制。像是：

- 只查 `source_type = "cv"`
- 只查某個 `memory_set`
- 只查某個 tenant 或 job
- 只撈某個版本之後的資料

這些條件本身不是 embedding 在解的。它們屬於 filter 的世界。Qdrant 的 payload index，就是讓這個世界不要變成一灘泥。 ## 為什麼 payload 有欄位，不代表 filter 能用

在 Qdrant 裡，一個 point 的 payload 基本上就是任意 JSON。你可以很自由地放：

```json
{
  "source_type": "cv",
  "memory_set": "daniel_job_memory_v1",
  "title": "PM cadence",
  "text": "..."
}
```

但「你存了這個欄位」跟「系統能有效拿它來 filter」是兩回事。

Qdrant 官方文件寫得很清楚：如果你想更有效率地用 filters，就應該替 payload fields 建 index，而且通常只替那些真的會拿來 filter 的欄位建。官方 API reference 也把 create payload index 當成明確操作，而不是隱式幫你做掉。 這就是為什麼很多人會在看起來合法的 filter 上撞到 `Index required`。不是因為 payload 沒這欄，而是因為 Qdrant 不接受你把這欄當成正式的查詢維度，卻又不給它對應的索引結構。

## 把 payload index 想成 schema migration，事情會突然很合理

理解這件事最順的方法，就是不要把它當成「Qdrant 小脾氣」，而是把它當成 schema migration。

如果你的 vector DB 只放向量，它比較像一個高維相似度倉庫。
但只要你開始在 payload 裡放這些東西：

- `source_type`
- `memory_set`
- `job_id`
- `rubric_id`
- `version`
- `tenant_id`

你就不只是加 metadata 而已。你其實已經在宣告這些欄位未來要參與怎樣的查詢。

從這個角度看，payload index 很像是在說：

> 好，這個欄位不是路過的 metadata，它是正式進入 query plan 的成員了。

## 最常見的 field schema 怎麼看

Qdrant 常見的 payload index schema 大概就是：

- `keyword`：精準字串匹配
- `integer` / `float`：數值篩選或排序
- `bool`：布林條件
- `text`：全文搜尋相關用途

在 RAG memory 或知識檢索場景裡，最常見的一批 metadata 幾乎都偏向 `keyword`，例如：

- `source_type`
- `memory_set`
- `rubric_id`
- `profile_id`
- `tenant_id`

因為它們不是拿來做模糊匹配的，而是拿來切集合、切租戶、切資料來源。

## 哪些欄位最值得先建 index

如果你剛開始做 Qdrant-based retrieval，我不建議一口氣替所有 payload 欄位都建 index。
Qdrant 官方文件和文章都很一致地提醒：payload index 會吃額外資源，所以應該優先放在真正高頻、真正有篩選價值的欄位上。 就你的案例來看，我還是會先建這兩個：

1. `source_type`
2. `memory_set`

### `source_type`
這通常是你最常用的 filter 之一。你可能需要分開：

- rubric
- profile
- cv
- jd_chunk

如果不靠這個欄位切，很多查詢很容易把不同資料角色混在一起。

### `memory_set`
只要你打算在同一個 collection 裡放多套 memory，這幾乎就是救命欄位。
它可以像 tenant boundary，也可以像 knowledge-space boundary。

這兩個欄位都很適合 `keyword`。

## 建 index 的 API 長什麼樣

Qdrant 官方 API Reference 現在是用 `PUT /collections/{collection_name}/index` 來建立 payload index，body 裡指定 `field_name` 跟 `field_schema`。 例如：

```bash
curl -X PUT "$QDRANT_URL/collections/daniel_job_memory_v1/index" \
  -H "Content-Type: application/json" \
  -H "api-key: $QDRANT_API_KEY" \
  -d '{
    "field_name": "source_type",
    "field_schema": "keyword"
  }'
```

再來一條：

```bash
curl -X PUT "$QDRANT_URL/collections/daniel_job_memory_v1/index" \
  -H "Content-Type: application/json" \
  -H "api-key: $QDRANT_API_KEY" \
  -d '{
    "field_name": "memory_set",
    "field_schema": "keyword"
  }'
```

第一輪先把最常用的 filter 維度立起來，通常比一次研究完所有進階參數更有價值。

## 建完 index 之後，filter 世界才真正開始穩

你原本想做的 query，多半會長得像這樣：

```json
{
  "searches": [
    {
      "query": [/* embedding */],
      "limit": 2,
      "with_payload": true,
      "filter": {
        "must": [
          { "key": "source_type", "match": { "value": "rubric" } }
        ]
      }
    }
  ]
}
```

這種設計在 RAG 裡很常見。同一個 query vector，但對不同 `source_type` 做不同查詢路徑，最後再組成 evidence pack。問題不是這種設計奇怪，而是你如果沒有把這些維度正式 index 化，整套檢索會變得又慢又脆，甚至直接被拒絕。

## 怎麼驗證 index 真的建好了

### 方法一：看 schema / payload metadata
如果你的部署方式支援查看 collection 的 payload schema，可以確認 `source_type` 是否真的被註冊成對應的 schema type。

### 方法二：重新跑原本的 filter query
這通常最直觀。
如果原本是 `Index required`，建完 index 後再跑一次，差異會非常明顯。

## 什麼欄位不值得亂建 index

不是所有 payload 欄位都值得 index。

我現在比較信的判準是兩條：

1. **高頻 filter**
   幾乎每次查詢都會用到

2. **高選擇性**
   能大幅縮小搜尋空間

像 `source_type`、`memory_set`、`tenant_id`，通常就很符合。
但如果某個欄位幾乎不 filter，或者只有很少的值，建 index 的收益可能就沒那麼高。Qdrant 官方也一直提醒，payload index 不是免費午餐。

## 三個很常見的誤會

### 誤會一：欄位名差不多就好
不行。
你存的是 `source_type`，filter 寫 `type`，Qdrant 不會幫你通靈。

### 誤會二：`match.value` 是模糊搜尋
對 `keyword` 來說，它就是精準匹配。
`cv` 跟 `cv_bullet` 不是同一件事。

### 誤會三：建 index 會讓相似度更準
這也不對。
payload index 的工作主要是讓 filter 更有效率、更可靠地參與查詢。向量相似度本身準不準，還是更取決於 embedding、chunking、query wording。

## 這件事跟 RAG 為什麼有關

很多人會把 payload index 當成 Qdrant 的 implementation detail。
但在 RAG 系統裡，它其實不是瑣事。

因為你一旦開始做：

- source-based retrieval
- tenant separation
- different evidence lanes
- version-aware retrieval
- ACL-ish filtering

那你其實就在把語意相似跟結構化條件放進同一套 query system 裡。payload index 正是在支撐這個交界面。

## 什麼時候這篇的判準不成立

如果你的 collection 很小、filter 很少，或者你還只是做 PoC，有些欄位暫時不 index 也不一定立刻痛到不行。
但只要你的檢索開始走向：

- 高頻 filter
- 多路查詢
- 多資料來源
- 多租戶
- production latency

那 payload index 幾乎就會從「可選優化」升級成「正規 schema 設計的一部分」。

## 下一篇接什麼

這篇是在講：當你把 metadata 正式拉進 retrieval system，schema 與 payload index 就得跟著長出來。

下一篇則會處理另一種更讓人抓狂的問題：**Qdrant 的 JSON 400 地獄。**
也就是那種看起來 body 合法、JSON validator 也過了，結果 server 還是回你 `expected value`、`key must be a string`、`line 2 column 32` 的場景。
