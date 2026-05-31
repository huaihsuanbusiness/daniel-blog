---
title: "這不只是一篇文章，這是一個可互動的 RAG 實驗台"
description: "把 RAG 的黑盒子打開。你不只會看到答案，也會看到 query mode、workflow、tool routing、retry loop 與 trace 是怎麼一路把這次請求推到終點。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "retrieval", "observability"]
date: 2026-05-31T05:20:00
featured: true
subtitle: "從 RAG 到 Production RAG｜Part 1"
series: "從 RAG 到 Production RAG"
seriesOrder: 1
---

我不想把這個系列的第一篇，寫成一篇只有名詞、架構圖、流程框的靜態技術文。

因為 RAG 真正有趣的地方，不是你看過幾張 pipeline 圖，也不是你記住了幾個新名詞。真正有趣的是：**當一個問題真的進來時，系統到底怎麼走，哪裡做了判斷，哪裡做了限制，哪裡選擇保守，哪裡又為了品質多繞了一步。**

所以這篇文章，我決定反過來做。

不是先講定義，再講架構，再講 lesson。
而是先把一個真的可以互動的 RAG 實驗台放在你面前。

你可以直接問它問題。
你可以切換 `query_mode`。
你可以決定這次要不要開 `workflow`、`tool routing`、`retry loop`。
你送出之後，不只會看到答案，還會看到：

- 這次 planner 怎麼改寫問題
- 走的是哪條 retrieval path
- workflow 有沒有介入
- tool router 有沒有啟動
- retry loop 有沒有真的重試
- citation check / runtime budget / observability 留下了什麼痕跡

這也是我想替這個系列先立住的一個核心態度：

> **Production RAG 不是一個只會回答問題的系統。**
> **Production RAG 是一個你能看懂它怎麼回答、為什麼這樣回答、以及它在哪裡被約束住的系統。**

## 先不要急著看答案，先看它走過的路

如果你只把 RAG 看成「把文件丟給模型，再把答案吐回來」，你會很快遇到一個問題：

你知道它有沒有答對，卻不知道它是怎麼答成這個樣子的。

但只要系統開始進入 production 情境，這件事就不夠了。

你會開始在意：

- 這次到底走的是 `fast` 還是 `creative`
- 為什麼 planner 重寫了 query
- 為什麼它沒有開 workflow
- 為什麼 retry loop 最後沒重試
- citation check 為什麼 fail 了，但答案還是被回傳
- runtime budget 為什麼擋住了某些更昂貴的路徑

這些東西，才是 production RAG 和玩具 RAG 真正分叉的地方。

## 這個 Part 1 在整個系列裡扮演什麼角色

這篇不是總覽文，也不是教學文。

它比較像整個系列的入口實驗台。

你可以把它想成：

- 一個可互動的 demo
- 一個 RAG trace viewer
- 一個 production controls 的展示場
- 一個之後每篇文章都會回頭引用的共同現場

接下來的系列文章，會慢慢拆開這些能力背後的設計：

- 為什麼需要不同的 `query_mode`
- 為什麼 `workflow` 不是預設就該開
- `tool routing` 在什麼情境才值得出場
- `retry loop` 怎麼影響答案品質與延遲
- `citation check`、`faithfulness`、`runtime budget` 為什麼是 production RAG 的必要層

但在那之前，我比較想先讓你親手看一次。

看一個問題進來之後，這套系統實際上做了什麼。

## 怎麼使用這個實驗台

你可以用三種方式看這個實驗台：

### 1. 當成一般聊天介面

直接問問題，先感受不同 mode 的回答差異。

### 2. 當成一個 runtime control panel

切換：

- `query_mode`
- `use_workflow`
- `use_tool_routing`
- `use_retry_loop`

然後觀察這次 request 的路徑怎麼變。

### 3. 當成一個 trace viewer

不要只看最終答案，請把焦點放在：

- planner 怎麼重寫
- retrieval 取回了幾份 source
- workflow / tool routing / retry loop 的啟閉
- citation check 與 runtime budget 怎麼影響這次結果

如果這一篇能讓你開始對這些層有直覺，這個系列就算起跑成功了。

下一篇，我會正式回到那個更基本、但也更容易被說錯的問題：

**RAG 到底是不是還停留在 chunk + embedding？**
