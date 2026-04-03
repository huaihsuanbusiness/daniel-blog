---
title: "RAG 工程實戰系列 05 － Qdrant 的 JSON 400 地獄：問題通常不在 Qdrant，而在你真正送出去的 body"
description: "如果你是用 Make 或其他低代碼工具打 Qdrant，最容易把人逼瘋的，通常不是向量檢索本身，而是那種看起來完全不合理的 JSON 400。"
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:27:00
featured: false
---

如果你是用 Make 或其他低代碼工具打 Qdrant，最容易把人逼瘋的，通常不是向量檢索本身，而是那種看起來完全不合理的 JSON 400。

你會看到這些錯：

- `Format error in JSON body: key must be a string`
- `expected value at line 1 column 1`
- `expected value at line 2 column 32`

最氣的是，你把 body 貼去 JSON validator，居然還過。  
然後你就開始懷疑人生，懷疑 Qdrant，懷疑 HTTP module，最後懷疑自己是不是該先離開電腦去買杯咖啡。

這篇想講的核心很簡單：

**Qdrant 的 JSON 400，很多時候不是 Qdrant 壞掉，而是 server 實際收到的 body，根本不是你以為你送出去的那個東西。**

這件事一旦想通，排查路線就會突然很乾淨。你不再把錯誤想成「Qdrant 有沒有接受我的 request」，而是先回頭問：

> 我真的送出了一個它期望的 JSON object 嗎？還是我只是送出了一個看起來很像 JSON 的字串？fileciteturn14file1

## 先講核心主張

如果要把這篇收成一句話，我會這樣講：

> JSON 400 不是 Qdrant 的問題類型，而是客戶端真相的問題類型。

這裡所謂的客戶端真相，指的是 server 真正收到的 bytes。  
不是你在 Make 裡看到的模板，不是你貼到 validator 的內容，也不是你腦中想像的 request body。

Qdrant 其實很誠實。它收到什麼，就照什麼解析。你覺得自己送的是 object，但它如果實際收到的是 string，它就會把你打回來。這沒什麼玄學。fileciteturn14file1turn851418search2

## 先把兩種最常用的 endpoint 釘死

很多 JSON 400 看起來像 parse error，實際上是 body shape 根本跟 endpoint 不對齊。

Qdrant points 相關常見的幾條路徑，大概是：

- `POST /collections/{collection}/points`  
  用來 upsert points
- `POST /collections/{collection}/points/query`  
  單筆 query
- `POST /collections/{collection}/points/query/batch`  
  批次 queryciteturn851418search2turn851418search4

這裡有一個很容易踩的坑：  
**單筆 endpoint 跟 batch endpoint 期待的 body 長得不一樣。**

### 單筆 query
Qdrant 要的是類似這種 object：

```json
{
  "query": [0.1, 0.2, 0.3],
  "limit": 3,
  "with_payload": true
}
```

### batch query
Qdrant 要的是：

```json
{
  "searches": [
    {
      "query": [0.1, 0.2, 0.3],
      "limit": 2
    },
    {
      "query": [0.1, 0.2, 0.3],
      "limit": 1
    }
  ]
}
```

如果你把 batch body 打到單筆 endpoint，錯誤訊息未必會很貼心地告訴你「你用錯 endpoint」，它可能只回你一個很討厭的 400。fileciteturn14file1turn851418search2

## 三種最常見的「看起來像 JSON，但其實不是」

這類問題我現在幾乎都先從三個方向查。

### 1. 你以為送的是 JSON object，其實送的是 JSON string

這是最常見的。  
你在工具裡看到的內容可能長這樣：

```json
{
  "query": [0.1, 0.2],
  "limit": 3
}
```

但真正送出去的其實是：

```json
"{"query":[0.1,0.2],"limit":3}"
```

這時候 validator 還是會說合法，因為它確實是一個合法的 JSON string。  
問題是 Qdrant 要的是 object，不是外面又多包一層引號的字串。fileciteturn14file1

這種情況最常見的根源就是 **double-stringify**。  
你先把 object stringify 一次，再讓 HTTP module 又把整個東西當字串送出去。看起來像 JSON，其實只是一顆 JSON 風味糖果。

### 2. 你以為送的是 array，實際上 array 被展平成裸數字串

你本來想送的是：

```json
{
  "query": [-0.02, 0.03, 0.04]
}
```

但有些低代碼工具在 raw 模板裡插值時，會把 array 展成：

```json
{
  "query": -0.02, 0.03, 0.04
}
```

這就已經不是合法 JSON 了。  
server 當然會在某個 column 爆掉。這類 `line 2 column 32`，很多時候就是在跟你說：**你的 vector 根本沒有被包成 JSON array。**fileciteturn14file1

### 3. endpoint 跟 body shape 根本不匹配

這個也很常見。  
你送的是：

```json
{
  "searches": [...]
}
```

但 URL 寫的是 `/points/query`。  
或者你明明打 `/points/query/batch`，卻只送了一個單筆的 `query` object。

這種錯很討厭，因為它看起來像 JSON parse error，實際上是 **request shape 與 endpoint contract 不相符**。fileciteturn14file1turn851418search2

## 最穩的排查順序：先把最小可用跑通

我現在很少一開始就上 batch query、filter、payload、rerank 全家餐。  
JSON 問題最有效的排查法，其實很樸素：

### Step 1：先跑單筆 query，不加 filter

```json
{
  "query": [/* embedding */],
  "limit": 1,
  "with_payload": true
}
```

### Step 2：確認 vector 真的是 array，不是字串
這一步超無聊，但很重要。  
如果 HTTP 模組有 request preview 或 raw log，一定要看那個，不要只看你自己組的模板。

### Step 3：再加 filter
等單筆 query 穩了，再把 `filter.must` 加回來。

### Step 4：最後才升級到 batch
這時候才把 URL 換成 `/points/query/batch`，body 也改成 `searches: [...]`

這個順序的好處是，你永遠知道自己是在哪一層把事情弄壞的。fileciteturn14file1

## 為什麼 JSON validator 會過，但 server 還是報錯

這件事真的很容易把人搞混。  
因為 validator 只能檢查你貼進去的內容是不是一份合法 JSON。它不會幫你檢查：

- 你是不是把 object 包成 string
- 你的 endpoint 跟 body shape 是否對齊
- 你的 array 在實際插值時有沒有被展平
- 你的 HTTP client 最後是不是根本送了別的東西

也就是說，validator 驗的是**你手上的文字**，不是**server 端實際收到的 request body**。  
這兩者常常不是同一件事。fileciteturn14file1

## 在 Make 或低代碼工具裡，我比較信的做法

如果你是在 Make 這類環境裡工作，我會比較建議這幾條：

### 1. 優先用 object builder，不要狂拼 raw text
如果平台有「Create JSON」或類似模組，通常比你在 raw body 裡徒手插值更穩。

### 2. embedding 要當資料，不要當文字
一旦你把 embedding 先變成字串，再塞回 JSON，後面很容易出現裸數字、CSV 風味、或 escape 一團亂的問題。

### 3. 避免 double-stringify
這件事值得講三次。  
如果整個 body 是 object，就讓 HTTP module 直接送 object。不要自己先 stringify，再交給它幫你包第二次。fileciteturn14file1

## 這類錯誤跟 Qdrant 其實沒那麼有關

這也是我後來比較確定的一件事。  
很多人會把這種問題歸類成「Qdrant 不好用」。但說穿了，這比較像是：

- 低代碼工具的插值真相
- HTTP client 的 body 序列化真相
- endpoint contract 與 payload shape 的真相

Qdrant 在這裡只是負責很誠實地告訴你：「我收到的不是我要的東西。」

## 什麼時候這篇的判準不成立

這裡也要補個邊界。

不是所有 400 都是 JSON 組裝問題。  
有些 400 確實可能是：

- filter schema 不對
- payload index 沒建
- query 結構用的是舊版 SDK / wrapper 期待的格式
- endpoint 路徑本身打錯

所以這篇的核心判準不是「看到 400 就一定是 double-stringify」，而是：

> 先確認 server 收到的是不是一份 shape 正確的 request，再去懷疑更高層的 retrieval 設計。

## 我現在比較相信的 debug 心法

如果你要我把這類問題收成一組我真的會拿來用的判準，大概是這樣：

1. 先確認 endpoint  
2. 再確認 body 最外層 shape  
3. 再確認 vector 是不是 array  
4. 再確認是不是被 double-stringify  
5. 單筆跑通後，才升級到 batch  
6. filter 跟 payload index 問題，留到 JSON 真的穩之後再查

這樣做不華麗，但很有效。

## 下一篇接什麼

這篇是在講 client 真相。  
下一篇會往另一個更大的主題走：**RAG 怎麼從能回答，走到真的能上線。**

也就是說，retrieval、citation、evaluation、ACL、versioning、observability 這些原本看起來像附加題的東西，為什麼其實才是 production RAG 的主考卷。
