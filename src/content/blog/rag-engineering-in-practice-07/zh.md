---
title: "RAG 工程實戰系列 07 － 我的求職 agent 是怎麼把 JD、CV 與 rubric 串成一條 evidence pipeline"
description: "如果前面六篇比較像是在拆概念、補判準、清理地雷，那這篇就比較像把那些東西真正放回一條工作流裡，看它們到底是怎麼咬在一起的。"
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:29:00
featured: false
---

如果前面六篇比較像是在拆概念、補判準、清理地雷，那這篇就比較像把那些東西真正放回一條工作流裡，看它們到底是怎麼咬在一起的。

這篇不打算教你把一個 job agent 從零複製出來。  
它比較像是一篇 case study，回答這種問題：

- 為什麼我最後把 JD、CV、rubric 分成不同角色？
- 為什麼 CV 要切細，rubric 不要切太碎？
- 為什麼 `source_type`、`memory_set` 這些欄位不能只是順手塞進 payload？
- 為什麼 evidence pack 要刻意控瘦？
- 為什麼系統有時候看起來是模型亂講，實際上其實是 retrieval 在偷出事？

如果你前面幾篇都有看，這篇應該會有一種「原來那些規則不是在講道理，是在收拾真實問題」的感覺。fileciteturn15file0turn15file3turn15file4

## 先講核心主張

如果要先講一句結論，我會寫成這樣：

> 讓這套 job agent 穩起來的，從來不是某個神奇模型或單一工具，而是你怎麼把 JD、CV、rubric 變成一條可檢索、可引用、可控成本的 evidence pipeline。

這句話裡，最重要的不是「agent」，而是 **evidence pipeline**。

因為你真的把系統跑起來之後，很快就會發現：  
多數錯誤不是因為模型突然笨了，而是因為 evidence 的形狀不對、進來的順序不對、角色混在一起，或者整包 evidence 太胖，模型最後只能一邊喘一邊亂抓重點。fileciteturn15file0turn15file4

## 一開始如果只把它當「把 CV 跟 JD 丟給模型」的問題，很快就會撞牆

這是很多人第一版最容易採用的直覺做法：

1. 把 JD 全文丟進去  
2. 把 CV 全文丟進去  
3. 再補一段 rubric 或 scoring prompt  
4. 叫模型評分、寫 relevant reason、寫 cover letter

這種做法不是完全不能用。  
在文件量小、任務簡單、沒有多輪 evidence 組裝時，它甚至可能一開始看起來還不錯。

但只要你真的把它用在一個比較穩定的工作流裡，問題就會慢慢浮出來：

- CV 太長，模型開始抓錯重點
- rubric 某條 hard gate 沒被讀到
- 同一份 JD 今天打這個分，明天又漂掉
- relevant reason 開始摻進不在 JD 的敘事
- evidence pack 越來越胖，最後撞到 token 或 MAX_TOKENS 的天花板fileciteturn15file0turn15file4

我後來比較確定，這不是 prompt 再修兩輪就會自然變好的問題。  
它其實是在跟你說：**這條工作流的證據單位、資料角色、檢索邊界，還沒有被設計好。**

## 這個系統裡，JD、CV、rubric 不是同類資料

一開始很容易把它們想成「反正都是文字，統一向量化、統一檢索就好」。但真的跑久了就會發現，這三種資料在系統裡的責任完全不同。

### JD：事實來源與工作要求
JD 的角色比較像任務上下文。  
它定義的是：

- 這份工作在找什麼
- 有哪些 deliverables
- 哪些 requirements 是明講的
- 哪些限制是 non-negotiable

在很多流程裡，JD 甚至不一定要先切 chunk。第一版直接帶全文，常常比較穩。因為模型需要的是整體工作輪廓，而不是只看其中一段條列。fileciteturn15file4

### CV：證據池
CV 不是規則，也不是主問題。  
它比較像一個 evidence pool，你要從裡面抓出最能映射到 JD 的那幾段經歷。

所以 CV 最怕太肥。  
如果一段 chunk 裡混了太多訊號，只因為命中一個 AI prototype 或 growth keyword 就整塊撈回來，後面模型很容易把別的無關成分也一起講進 relevant reason 裡。fileciteturn15file0

### rubric：規則與框架
rubric 更像規則本身。  
它不是讓模型去找靈感的，它是用來限制格式、定義 criteria、補 hard gate、控制輸出 shape 的。

所以 rubric 不能像 CV 那樣切得太散。  
你希望每一塊規則群是自足的，不然 top1 / top2 只撈到半套，整個評分就可能漂掉。fileciteturn15file0

## chunking 真正改變的，不只是 retrieval，而是整個下游輸出穩定度

### 為什麼 CV 要切細
因為這裡要解的不是「總結一份履歷」，而是：

- 哪一段最對這份 JD
- 哪些 bullet 最值得拿來 support 某個判斷
- 這份履歷有哪些 evidence 能映射到某條 requirement

這是一種 evidence mapping 問題，不是全文摘要問題。  
所以 CV 更適合按主題或可映射證據點切。fileciteturn15file0turn15file4

### 為什麼 rubric 不能太碎
rubric 太碎時，模型很容易只撈到 criteria，卻漏掉 gate 或 output constraints。結果不是系統壞掉，而是它開始偷偷變得不穩。

這種不穩最麻煩，因為它不像 crash 那樣明顯。  
它只是讓今天跟明天的 scoring 漂一點、理由多一點、格式歪一點，然後整套東西慢慢失去可信度。fileciteturn15file0

## evidence pack 要刻意控瘦，不然你只是在做一包很貴的噪音

很多人看到輸出不穩，第一反應會是：

- 多帶幾塊 evidence
- 把 topK 拉高
- 多加一點 profile / background
- 再塞一點 rules

但 evidence pack 不是越大越好。  
如果你讓模型一次吞太多半相關內容，它不一定變得更 grounded，反而更容易抓錯支點。更別說 token 成本跟輸出穩定度都會開始變差。fileciteturn15file0turn15file4

在這個求職 scoring 流程裡，一個比較務實的配方反而是：

- rubric：topK = 2
- profile：topK = 1
- CV：topK = 2 到 3
- JD：先直接提供全文，等流程穩再考慮 JD chunk retrieval

這個配方好用，不是因為它是什麼黃金數字，而是因為它強迫你承認：

> evidence pack 也是設計出來的，不是撈越多越厲害。fileciteturn15file0turn15file4

## 為什麼 `source_type`、`memory_set` 這些欄位不能只是順手放進 payload

當這套系統開始把不同類型的資料都放進同一個 collection 裡時，metadata 就不再只是裝飾。

像這些欄位：

- `source_type`
- `memory_set`
- `rubric_id`
- `profile_id`
- `job_id`

看起來很 boring，但它們其實在定義檢索邊界。  
你如果沒有把這些欄位正式拉進 query plan，retrieval 就很容易變成「好像相關，但角色混在一起」的狀態。fileciteturn15file1turn15file2

這也是為什麼我後來會把 payload index 想成 schema migration。  
不是因為 Qdrant 有奇怪規定，而是因為你真的在做一套混合了：

- 向量相似
- 結構化 filter
- 多資料角色
- evidence lanes

的 retrieval system。  
這時候 schema 就不是可有可無的小細節了。fileciteturn15file1

## 很多看起來像模型亂講的問題，最後都回到 retrieval 邊界沒切乾淨

這個案例另一個很有感的地方，是它會逼你學會分辨：

- 到底是 R 壞了
- 還是 G 壞了

因為表面上看，一個 relevant reason 寫歪了，大家都會先怪模型。  
但你去看 evidence pack 後，常常發現：

- 該抓的 CV chunk 沒進來
- 抓進來的是太肥的 chunk
- rubric 只撈到半套規則
- `source_type` 沒切乾淨，profile 或別的東西混進來
- topK 太大，噪音蓋過真正該講的 evidencefileciteturn15file0turn15file4

這時候問題其實不是模型亂講，而是你餵給它的證據邊界本來就不乾淨。  
它只是很流暢地把不乾淨的 context 講順而已。

## 這套系統為什麼最後比較穩，不是因為它更複雜，而是因為邊界更清楚

真正讓系統穩下來的，大概是這幾件事：

1. JD、CV、rubric 角色切清楚  
2. CV 與 rubric 用不同 chunking 策略  
3. evidence pack 刻意控瘦  
4. retrieval 用 `source_type`、`memory_set` 等欄位做正式邊界  
5. 開始用「先看 evidence，再怪模型」的 debug 習慣  
6. 把輸出的穩定性，當成 retrieval 設計的一部分，而不是 prompt 附帶效果

## 什麼時候這個案例的判準不成立

不是每個 RAG 系統都像 job matching 這麼適合細粒度 evidence mapping。  
這套判準成立，是因為你的問題本質上很像：

- requirement matching
- evidence-backed scoring
- constrained writing

如果今天你做的是：

- FAQ assistant
- 長文摘要
- 合約問答
- 程式碼檢索
- 多模態文件

那 chunking、retrieval、filter schema 的最佳形狀很可能都不一樣。  
所以這篇比較適合把它看成一個 case study，不是萬用模板。

## 我現在從這個案例裡最相信的幾條規則

1. 先分清資料角色，再談 retrieval  
2. CV 像證據池，rubric 像規則本  
3. evidence pack 要刻意控瘦  
4. metadata 欄位不是裝飾，它們在定義檢索邊界  
5. 很多模型問題，其實是 evidence 邊界問題  
6. production RAG 會不會穩，常常不是看模型有多強，而是看 evidence pipeline 有沒有被設計好

## 這整套系列最後想留下什麼

我最想留下的，可能不是某個單一工具結論，而是這個感覺：

> RAG 真正難的地方，常常不是 embedding、不是模型、也不是向量資料庫本身，而是你有沒有把 evidence 的角色、邊界、顆粒度與流向想清楚。

當這些東西清楚了，系統會突然從「很像魔法」變成「可以 debug 的工程」。
