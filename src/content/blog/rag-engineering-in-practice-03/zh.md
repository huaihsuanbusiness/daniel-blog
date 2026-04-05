---
title: "RAG 工程實戰系列 03 － Chunking 的工程哲學：你不是在切字，而是在設計證據單位"
description: "很多人在做 RAG 時，最早學到的名詞之一就是 chunking。然後事情常常就從這裡開始歪掉。"
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:25:00
featured: false
---

很多人在做 RAG 時，最早學到的名詞之一就是 chunking。然後事情常常就從這裡開始歪掉。

大家會開始討論 chunk size 該設多少、overlap 該不該開、是不是要用某個 splitter 才比較專業。這些都不是沒用，但如果你太早把 chunking 想成「切字技術」，後面很容易一路歪到 evidence pack 爆肥、召回品質不穩、模型抓錯重點，最後再把鍋丟給 embedding 或模型本身。

我後來比較願意把 chunking 想成另一件事：

**你不是在切文字，你是在替未來的檢索與生成設計證據單位。**

這篇會用一個很實際的案例來談這件事，也就是求職 agent 裡的 JD、CV、rubric 檢索。這個場景很適合講 chunking，因為它不是單純問答，而是很吃對應關係、可引用性、以及輸出穩定度的工作流。你很快就會看到，CV 跟 rubric 根本不該用同一把刀切。

## 先講核心主張

如果只記一句，我希望是這句：

> chunking 不是把文件切小，而是把資料切成能被檢索、能被引用、也能被模型穩定使用的證據單位。

這句話聽起來有點抽象，但其實很工程。因為在 RAG pipeline 裡，一個 chunk 通常至少同時扮演兩個角色：

1. **檢索單位**，也就是搜尋系統要抓回來的最小顆粒度  
2. **引用單位**，也就是你希望模型真正拿來支撐答案的最小證據顆粒度

如果它對第一件事有利，對第二件事卻很糟，那它就不是好 chunk。

## 為什麼只談 chunk size 很容易把問題看錯

Pinecone 與 LangChain 的文件都會談 chunking 的起跑方式。LangChain 也很直接地建議，多數情況可以先從 `RecursiveCharacterTextSplitter` 起跑，再去調 `chunk_size` 跟 `chunk_overlap`。這些都很合理。citeturn803663search2turn803663search3turn803663search7

但合理的起跑點，不等於完整的設計原則。

工程上真正該先問的，通常不是「我要切幾個 tokens」，而是這句：

> 我到底希望這一塊資料，之後在系統裡扮演什麼角色？

很多團隊其實把不同資料型態全塞進同一種 splitter。結果 FAQ、法規、履歷、Slack 對話、評分 rubric 全都被切得像工廠土司一樣整齊。看起來很規則，實際上未必比較好用。

## 兩種最常見的壞味道

### 1. Chunk 太大，像一塊很吵的自助餐拼盤

這種 chunk 常常因為其中一句很 relevant，就整塊被撈回來。問題是整塊裡面有大半是噪音。Evidence pack 會變胖，模型注意力被稀釋，token 也被吃掉。

在求職 agent 的案例裡，CV 最容易出現這種情況。假設一塊 chunk 同時塞了：

- 成長數字
- discovery interviews
- partnerships
- AI prototype
- PM cadence

只要 JD 提到 AI，這整塊都可能被抓回來。但模型真正需要的，搞不好只有跟 AI prototype 有關的兩句。剩下的 scale metrics 跟 partnership 只是讓 relevant reason 變得更吵。

### 2. Chunk 太碎，像滿地紙屑

另一種問題是反過來。切得很小，看起來很乾淨，但每一塊都缺上下文。這時候搜尋抓回來的不是 evidence，而是碎片。模型只好自己把碎片黏起來，hallucination 的空間就變大。你還會被迫把 topK 拉高，因為不多撈幾塊根本拼不出完整語意。

這就是為什麼「越細越好」這種說法很危險。不是不能切細，而是要看你到底在切什麼。

## 為什麼 CV 最該切細

我後來很確定的一件事是：**CV 通常值得比你直覺更細地切。**

原因不是履歷比較短，而是它回答的問題不一樣。

在求職 scoring 或 cover letter 場景裡，CV 很少是在回答「請總結這個人」。它更常在回答：

- 這份 JD 的需求，對應到我哪幾段經歷？
- 哪幾條 bullet 最值得拿來打這個職缺？
- 哪個 angle 最適合寫 cover letter？
- 哪些 non-negotiables 一開始就不 match？

這些不是全文摘要問題，而是**對應關係問題**。  
而對應關係問題最怕的，就是一塊資料裡混了太多不同訊號。只命中一個，卻整盤端回來。

所以對 CV 來說，我通常不太迷信固定 token 切塊。我更偏好按主題或可映射證據點切，例如：

- scale metrics
- ambiguity handling / 0→1 scope
- experimentation / funnel thinking
- AI prototype
- PM cadence
- partnership / external demos

這樣抓回來的 topK，比較像「證據清單」，不是「自傳章節」。

## 為什麼 rubric 反而不該切太碎

rubric 的角色完全不一樣。

CV 比較像證據池。  
rubric 比較像規則本身。

你在檢索 CV 時，常常希望抓 2 到 3 段，甚至更多。  
但在 rubric 這邊，你通常只需要 1 到 2 段規則，就足以驅動評分與輸出格式。如果把 rubric 切得太碎，反而容易出兩個副作用：

1. 模型撈到 criteria，卻漏掉 hard gate  
2. top1 / top2 每次撈回不同子塊，評分漂移開始變大

這種漂移很煩，因為它看起來不像大 bug，卻會慢慢把系統穩定性磨掉。

所以 rubric 比較好的切法，不是切得很小，而是切成**自足規則群**。也就是一塊拿到，就足以獨立驅動一小段行為，例如：

- identity & task
- output shape
- constraints
- highlights
- criteria groups
- hard gates

你把 rubric 從 9 段調成 11 段，我覺得就是這個方向。不是為了追求更碎，而是讓每段更自足。

## chunking 跟 evidence pack 是一起設計的

這也是很容易被漏掉的地方。

看到 prompt 太長時，很多人第一反應都是「那我把 chunk 再切小一點」。  
但很多時候更有效的做法，不是把 chunk 再剁碎，而是**先控制 evidence pack 的組裝策略**。

以你的求職 scoring 場景來看，一個很務實的配方是：

- rubric：topK = 2
- profile：topK = 1
- CV：topK = 2 到 3
- JD：先直接給全文，等流程穩了再考慮做 JD chunk retrieval

這個配方的重點不是它神奇，而是它讓 evidence 保持在一個模型還吃得下、也比較不會飄的範圍裡。比起盲目加 topK，這種做法通常更省 tokens，也比較穩。

## 一個很實用的 smoke test

如果你手上已經有一批 chunk，還沒正式做評估集，我反而會先做一個很土炮但很好用的檢查：

> 如果我只允許用一句 query 召回這一塊，它有沒有一個清楚主題？

如果答案是「沒有，它其實包含四個主題」，那它多半就太肥了。

另一個檢查也很實際：

> 當我把 CV topK 設成 3，整個 evidence pack 會不會胖到我根本不敢直接塞給模型？

如果會，那你要先想的通常是：

- CV 要不要再切細
- topK 要不要先降
- rubric / profile 的帶法要不要收斂

而不是先怪模型怎麼又爆 token。

## 什麼時候這套判準不成立

這裡要補一個重要反例。  
CV 該切細、rubric 不該太碎，這個判準不是萬用真理。它成立的前提，是你現在處理的問題本質上是 evidence mapping。

如果你今天處理的是別種資料型態，判準可能就得改。

例如：

- **FAQ / 知識庫文章**：常常更適合按標題階層切  
- **法規 / 合約**：條文完整性往往比細粒度更重要  
- **表格型資料**：有時候要把欄位語意帶進每一列  
- **程式碼或設定檔**：常常更適合結構感知或語言感知邊界citeturn803663search11turn803663search14turn803663search18

所以真正該先問的，不是「多少 tokens」，而是：

- 我在處理什麼資料型態？
- 下游問題是摘要、查找、比對，還是規則套用？
- 我希望模型拿回來的是證據、背景，還是規則？

## 我現在比較相信的工程判準

如果要把這篇收成幾條我自己真的會拿來用的判準，大概是這樣：

1. 一塊一個主題，一塊可獨立引用  
2. 先按資料角色切，再談 chunk size  
3. 證據池資料通常比規則型資料更值得切細  
4. chunking 跟 evidence-pack design 是同一個問題的兩面  
5. chunk 太大會稀釋注意力，chunk 太碎會逼模型腦補  
6. 如果 chunking 設計得對，RAG 會突然變得很工程，也很可控

## 下一篇接什麼

如果這篇是在講證據單位怎麼設計，那下一篇就會往更結構化的地方走：  
**當你開始把 metadata 放進 vector DB，並且想用 `source_type`、`memory_set` 這類欄位去 filter 時，schema 與 payload index 就不再是瑣事，而是檢索系統的一部分。**
