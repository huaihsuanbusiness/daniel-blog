---
title: "RAG 工程實戰系列 06 － 把 RAG 做到能上線：檢索、引用、評估與可觀測性不是附加題"
description: "很多 RAG 系統在 demo 階段都很會表演。"
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:28:00
featured: false
---

很多 RAG 系統在 demo 階段都很會表演。

你問一題，它答一段。
有時候還會附來源，看起來甚至像有點可信。團隊裡的人一看，通常就會出現熟悉的句子：

- 「好像可以耶」
- 「我們再接幾份文件進來試試看」
- 「接下來就是把 prompt 調一下」

然後真的往 production 走，事情就開始變味。

你會遇到的問題通常不是「模型突然變笨」，而是：

- 明明抓到文件了，答案還是亂推
- 某些問法很穩，某些問法整個漂掉
- 同一題今天能答，明天因為文件更新又答得不一樣
- 使用者開始追問「你這句是根據哪份文件」
- 法務、客服、內部知識庫場景開始要求權限、版本與稽核
- 團隊裡有人終於問出那句關鍵問題：
  **我們怎麼知道這套系統真的有在變好？**

這一篇想講的就是：
**RAG 要上線，真正的主考卷不是 prompt，而是 evidence、citation、evaluation、ACL、versioning、observability。**

## 先講核心主張

如果要先講一句結論，我會寫成這樣：

> 沒有評估、引用與可觀測性的 RAG，不是 production system，比較像運氣不錯的 demo。

這句不是在裝嚴格，而是因為 production 場景的問題型態真的不一樣。
demo 的成功標準通常是「這題看起來答得不錯」。
production 的成功標準則更像：

- 它能不能穩定地抓到對的 evidence？
- 它的回答能不能被追溯？
- 它犯錯時，我們能不能知道是 R 壞了還是 G 壞了？
- 它的資料、權限、版本與 latency 能不能被管理？

如果這些問題沒有答案，系統就算偶爾答對，也很難被真正信任。

## RAG 上線後，第一個問題不是模型大小，而是 evidence 乾不乾淨

這一點很容易被忽略。
很多人習慣把焦點放在模型選型或 prompt engineering，但在 RAG 裡，最大的 ROI 往往來自 evidence 的品質。

因為模型最終能做的事情，其實是：

1. 從你給它的 context 裡抓重點
2. 在這個 context 邊界內做推理
3. 用一種看起來很流暢的方式把結果講出來

如果 evidence 本身就髒、亂、重複、過胖、彼此衝突，那你換再大的模型，它也只是比較有氣勢地把混亂講順而已。

所以我現在比較把 production RAG 想成這樣：

- **R** 要負責把對的證據帶回來
- **G** 要負責盡量不要超出證據邊界亂補
- **系統層** 要負責讓這件事能被觀測、被評估、被追責

## 先分清楚：錯答通常是 R 壞了，還是 G 壞了

這個 debug 心法非常重要。

一個看起來很爛的答案，表面上是同一個問題，實際上常常落在兩大類：

### 類型一：R 不到位
也就是根本沒撈到正確 evidence。
這時候常見原因包括：

- chunking 顆粒度不對
- filter 設計不對
- topK 不合理
- 沒做 hybrid / rerank
- metadata 邊界不乾淨
- documents 更新後 index 沒同步

### 類型二：G 不受控
也就是 evidence 其實到了，但模型還是亂推。
這時候常見原因包括：

- prompt 沒有明確要求 grounded answer
- citation 對齊做得很弱
- context 太胖，模型抓錯重點
- 模型習慣跨段補完，導致 hallucination
- answer template 沒有留「不知道」的出口

我自己現在的習慣是：
**先看 evidence，再看回答。**
如果根本沒抓到該抓的 chunk，那先別急著怪模型。

## citation 不是 UX 裝飾，它是風險控制

很多人一開始把 citation 當成 nice-to-have。
我現在比較不這樣看。

在 production RAG 裡，citation 最少有三個作用：

1. **讓使用者能回頭驗證**
2. **讓團隊能 debug**
3. **讓系統能被 audit**

如果系統說「依據某份 SOP，退款流程需要主管核准」，那你最好真的能把那份 SOP 的段落指出來。
不然在客服、法務、內部知識檢索這些場景，它很難被真正信任。

citation 的價值不是讓畫面看起來很像研究論文，而是把回答綁回 evidence，讓錯誤能被定位。

## evaluation 不是 vibe check，而是要能支撐迭代

RAG 很容易掉進一種假穩定：
系統看起來「差不多可用」，但你其實不知道它到底是變好了，還是只是碰巧沒踩到爛案例。

這也是為什麼 RAGAs 這類 evaluation framework 近年會被大家拿來談。官方文件現在把 RAG evaluation 拆成 retrieval 與 generation 兩邊都能看的維度，像是：

- context precision
- context recall
- faithfulness
- response relevancy 我覺得這些指標不是因為名字很漂亮，而是因為它們逼你回答幾個很實際的問題：

- 檢索抓回來的東西，真的 relevant 嗎？
- 該抓的 evidence，有進 topK 嗎？
- 回答有沒有被 context 支撐？
- 它是不是只答得流暢，但其實偏題？

如果沒有這些指標，很多團隊最後就只能靠 vibe check：
「這題感覺有比較好。」
這在 demo 很常見，在 production 不太夠。

## 先做最小指標集合，就已經比沒有好很多

你不一定一開始就要把 evaluation 平台蓋到像機房。
但如果完全沒有指標，後面通常只會靠感覺吵架。

一個很務實的最小集合可以是：

### Retrieval 面
- Recall@k
- Precision@k

### Generation 面
- Faithfulness / groundedness
- Answer relevance

### System 面
- latency
- 每問成本
- 使用者追問率
- 點 citation 的比例

這些指標不會替你解答所有問題，但至少可以讓你知道自己到底在修哪一層。

## ACL 要在 retrieval 階段做，不要等生成後再補遮羞布

這點很容易被低估，但其實很重要。

如果你的 RAG 系統接的是企業知識、內部文件、法務條款、客服案例，權限問題不能只在 answer 後面補丁。
比較正確的做法通常是：

- document 或 chunk 本身就帶 ACL metadata
- retrieval 階段就做過濾
- 不是等答案產出後才想辦法把敏感資訊遮掉

因為很多時候，風險不只是「洩漏答案」，還包含「洩漏某份文件存在」這件事。
如果 retrieval 階段不管權限，後面很容易補救不完。

## versioning 不是文件管理潔癖，而是可重現性的底線

production RAG 最煩的一件事是：
同一個問題，今天答跟明天答不一樣，但你還不知道差在哪。

這時候如果沒有版本資訊，你很難回答：

- 這個答案是根據哪個版本的文件？
- index 是什麼時候更新的？
- 這個 chunk 在 ingestion 後有沒有被改過？
- 是文件變了，還是 retrieval 邏輯變了？

這也是為什麼我覺得 source metadata、document version、chunk provenance 這些東西很 boring，但真的不能省。

## observability 決定你能不能真的 debug

如果沒有觀測資料，很多 RAG 問題最後都會變成玄學。

至少你要能看得到：

- query 是什麼
- retriever 抓回哪些 chunk
- rerank 前後排名怎麼變
- 最後組進 prompt 的 evidence 是哪些
- 模型答了什麼
- citation 對到哪裡
- 使用者後續有沒有追問、有沒有點來源

這些資訊的價值，不只是做 dashboard。
它是讓你在系統出錯時，知道到底該修 retrieval、generation、schema、chunking，還是 documents 本身。

## 什麼時候 production RAG 其實不划算

也要誠實講，並不是每個場景都值得把 production RAG 做滿。

如果你的場景是：

- 文件量很小
- 更新頻率很低
- 沒有稽核需求
- 風險不高
- 使用者其實可以自己點原文

那有時候直接做搜尋 + 摘要 + 清楚的 source linking，可能比完整的 production RAG 更省力。

這也是為什麼我會一直覺得，RAG 不是一個「有用就堆滿」的系統，而是一套要看風險、資料性質與工作負載的工程取捨。

## 我現在比較信的 production 判準

如果要把整篇收成一組我真的會拿來用的判準，大概是這樣：

1. evidence 先乾淨，generation 才有意義
2. citation 不是裝飾，是風險控制
3. evaluation 不求一開始完美，但不能沒有
4. ACL 要在 retrieval 階段做
5. versioning 是可重現性的底線
6. observability 決定你能不能真正 debug
7. 如果你不知道錯答是 R 壞還是 G 壞，系統就還沒準備好上線

## 下一篇接什麼

接下來如果要把這整套系列收束，我最想接的是一篇 case study：
**我的求職 agent 是怎麼把 JD、CV 與 rubric 串成一條 evidence pipeline。**

那篇會把前面幾篇講的方法真正落進一個系統裡，讓讀者看到這些判準不是抽象規範，而是怎麼在一條工作流裡彼此咬合。
