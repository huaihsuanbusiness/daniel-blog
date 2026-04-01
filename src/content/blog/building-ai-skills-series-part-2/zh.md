---
title: "打造AI Skill 系列 Part 2：為什麼 ChatGPT 不該直連底層工具：打造 Skill-first 架構"
description: "打造AI Skill 系列 Part 2：為什麼 ChatGPT 不該直連底層工具：打造 Skill-first 架構"
categories: ["ai"]
tags: ["ai", "mcp", "skill", "agent", "workflow", "architecture"]
date: 2026-04-01T20:12:00
featured: false
---

如果你手上已經有一批能跑的工具，第一個直覺通常很合理：

> 既然 ChatGPT 已經能透過 MCP 呼叫工具，那就把工具直接接上去不就好了？

這個想法我完全懂。  
因為它快、直觀，而且在原型階段常常真的能動。

問題是，**能動** 和 **能長大**，是兩回事。

當你的工具開始涉及多步驟流程、資料寫入、權限、帳號、external side effects、品質治理，讓 ChatGPT 直接看見底層工具，通常不是最短路，而是把系統治理外包給一個本來就不該獨自承擔這些責任的機率模型。

這篇要談的，不是「直連工具一定錯」，而是：

> 對於有任務語義、有風險控制、有演化需求的系統，  
> **ChatGPT 最好不要直連底層工具。**  
> 你通常需要一層 skill-first gateway 或 thin skill server，先做 task boundary 與 tool exposure 的控制。

<figure>
  <img src="./resource/ai-skill-series-part2-01-skill-first-gateway.svg" alt="Direct-tool access versus skill-first gateway, contrasting raw tool exposure with a gateway that controls skill selection and tool exposure" />
  <figcaption>差別不只是架構圖比較漂亮，而是 policy、風險與任務語義到底放在哪一層。</figcaption>
</figure>

---

## 先說結論：直連底層工具不是不能做，而是有適用範圍

我不想把這篇寫成教條文，所以先把反例講清楚。

### 什麼情況下，直連底層工具是可以成立的？

如果你的系統符合下面條件，ChatGPT 直連底層工具未必是問題：

- 工具數量很少
- 幾乎沒有 side effects
- 沒有高風險資料寫入
- 任務邏輯很薄
- 你只是做 prototype、demo、內部實驗
- 工具之間幾乎沒有複雜依賴

例如：
- 查天氣
- 查某個只讀知識庫
- 簡單搜尋與摘要
- 少量無副作用的 utility tools

這種情境下，直接讓模型看見工具，很可能是最快的做法。  
但只要系統開始變成下面這種樣子，狀況就完全不同了：

- 先抓資料，再評分，再查詢，再生成深度輸出
- 工具之間有前後順序
- 有 helper tool 不應被公開暴露
- 有些工具應該只在特定 skill 下可見
- 有 blocked / clarification / not-found 等治理要求
- 工具執行結果會寫入資料表或觸發外部系統

這時候，直連底層工具就會很容易變成「快是很快，但後面很難收」。

---

## 一、直連底層工具，看似省事，實際上把責任丟給了錯的地方

沒有 skill-first 設計時，典型做法通常是：

1. 把底層 tools 以 MCP 暴露給 ChatGPT
2. 再附一些 prompt、rules、markdown 或 resource
3. 期待模型自己理解何時該用哪個工具、以什麼順序組合它們

這裡有一個很隱性的假設：

> 模型能穩定地從工具描述與文件裡，  
> 自己重建你原本想要的任務邏輯。

這就是問題所在。

MCP tools 的責任是暴露能力；resources 用來提供可讀上下文；prompts 是可發現、可帶參數的模板。這些 primitive 都很有用，但都不等於「強制 skill-first 流程控制器」。如果底層工具全部對模型可見，模型理論上就能直接選用其中任何一個，你原本心中的 skill boundary 並沒有被真正 enforce。[1][2][3][4]

換句話說：

> 你不是在讓模型「更有能力」，  
> 而是在讓模型「替你承擔本來應該由系統設計承擔的決策」。

---

## 二、MCP 很重要，但 MCP 不是 skill policy engine

這一點一定要講清楚。

很多人會以為只要把 skill 文件放進 MCP resources 或 prompts，事情就自然解決了。  
這種期待太高了。

MCP 的價值在於標準化能力暴露，讓 host、client、server 可以一致地交換 tools、resources 與 prompts。它沒有直接幫你解這些問題：

- 哪個 skill 應該被選中
- 哪些底層工具此刻應該被隱藏
- 哪些 helper 工具不能直接對模型公開
- 哪些失敗該 blocked、哪些該澄清
- 哪些任務要先 query、哪些要先 resolve reference

所以我很喜歡用一句更準確的話來描述：

> **MCP 是 capability transport，不是 task policy runtime。**

這也是為什麼很多系統雖然「MCP 接好了」，行為上卻還是很 tool-first。  
它們有標準介面，但沒有策略層。

---

## 三、Skill-first 架構真正要做的事，是減少模型必須即興決定的事情

很多人以為 skill-first 是一種比較官僚、比較保守的設計。  
但我反而覺得，skill-first 其實是在幫模型減負。

如果沒有 skill-first 層，模型每次都要即興回答這些問題：

- 這句話屬於哪一類任務？
- 這次該先抓還是先查？
- 需要不要先重打分？
- 哪些 tools 現在應該可見？
- 需不需要先澄清？
- 哪一步失敗時應該怎麼收斂？
- 不同工具的輸出要怎麼拼裝？

對開放式研究任務，讓模型多即興一些，可能有價值。  
但對於已知 domain、已知 side effects、已知流程邊界的系統，讓模型即興決定的事情越多，系統通常越難治理。

所以 skill-first 的真正哲學不是「限制模型」，而是：

> **把可以 deterministic 化、policy 化、schema 化的部分先收斂，  
> 把模型真正該做的推理留給模型。**

這樣模型的推理預算，才會花在比較有價值的地方。

---

## 四、什麼是 thin skill server？它到底在幫你扛什麼？

很多人一聽到 skill server，就會擔心是不是又要多造一層大平台。

其實一個好的 **thin skill server**，應該非常克制。  
它不是第二個 monolith，也不是把底層 tools 重寫一遍。

它主要只做四件事：

1. **載入 skill 定義**
2. **做最小必要的 routing**
3. **控制 tool exposure policy**
4. **把高層 skill 調用翻譯成底層工具序列**

重點是那個 **thin**。

它不應該吞掉所有 execution complexity。  
它不應該重做資料層。  
它也不應該變成新的 workflow engine。

它真正要做的是：  
**把語義層與執行層隔開。**

---

## 五、用一個很實際的例子看：直連底層工具為什麼會開始出事

假設你把這幾個工具直接暴露給 ChatGPT：

- `fetch_recent_jobs`
- `bulk_score_new_jobs`
- `query_jobs`
- `generate_job_output`

然後使用者說：

> 幫我去 JobStreet 找三天內 PM 職缺，把 80 分以上的挑出來，然後分析哪幾個值得投。

從人類視角，這句話很自然。  
但從系統角度，它其實至少包含三個不同任務：

1. 更新候選池
2. 查 shortlist
3. 針對 shortlist 做決策支持

如果沒有 skill-first 層，模型必須自己決定：

- 先抓還是先查？
- 要不要先重打分？
- query spec 應該怎麼從自然語言轉出來？
- shortlist 要分析全部，還是先只取 top N？
- 缺 reference 時該不該追問？
- 某個 helper 該不該先被調？

這些行為也許一次做得對，  
也可能每次都對得有點不一樣。

只要這些步驟開始牽涉 side effects，例如重抓、重打分、更新 datastore、寫入外部系統，這種不穩定就不再只是 UX 問題，而會變成治理問題。

---

## 六、Skill-first 的接法，真正改變的是「模型看見的世界」

比較穩的做法，不是讓 ChatGPT 看到全部 raw tools。  
而是只讓它看見少數幾個**任務級 skill**。

例如在職缺系統裡，它比較合理看到的是：

- `job_ingestion`
- `job_querying`
- `job_decision_support`

對 ChatGPT 來說，這是任務語義。  
它看到的是「這次要完成什麼」，不是「底層到底有幾支 flow」。

然後在 server 內部，再把 skill 映射到具體 tools：

- `job_ingestion` → `fetch_recent_jobs`，必要時再接 `bulk_score_new_jobs`
- `job_querying` → `query_jobs`
- `job_decision_support` → `generate_job_output`，必要時先走 `resolve_job_reference`

這樣做的好處，不只是比較優雅，而是比較**可治理**。

### 1. 使用者語義與系統語義終於對齊

使用者永遠不會說：
> 請幫我執行 `query_jobs`

他會說：
> 幫我列出最近三天 80 分以上的職缺

skill-first 的作用，就是把使用者語言轉成系統任務語言，再由系統任務語言去調用底層 execution layer。

### 2. Tool surface 大幅縮小

一個 skill 真正需要看的 tools，通常遠比你想像中少。  
把 visible tool set 縮小，可以降低誤用率，也能減少模型在工具發現與選擇上的負擔。OpenAI 自己的 MCP / tools 指南也很強調 allowlist 與工具描述品質的重要性。[5][6]

### 3. 品質治理終於有穩定對象

沒有 skill-first 層時，你很難評估「job decision support 這個能力」到底做得好不好。  
因為模型可能每次都走不一樣的工具序列。

有了 skill-first 層，你可以清楚定義：
- 這個 skill 的入口長什麼樣
- 允許哪些工具
- 缺 reference 時是否 blocked
- 結果要回哪些欄位
- 失敗時要怎麼收斂

---

## 七、那 ChatGPT 在這裡應該扮演什麼角色？

我的答案是：

> **ChatGPT 應該是上游 host 與對話入口，  
> 但不應該獨自承擔你整個系統的 orchestration policy。**

OpenAI 的 Apps SDK 與 developer mode 文件，本來就是在描述這種結構：ChatGPT 連一個可公開存取的 remote MCP server，由 server 暴露能力給 ChatGPT。這意味著你完全可以在 ChatGPT 與底層 execution tools 之間，加上自己的 skill gateway，而不是把 raw tools 裸露給 host。[6][7]

在這個模式下，比較健康的分工是：

- **ChatGPT**：對話、理解使用者上下文、生成最終回答
- **Skill gateway / thin skill server**：skill routing、tool exposure、request/response normalization
- **Make / APIs / DB / crawlers**：execution

這種分工不是為了多造一層，而是讓每一層都做自己擅長的事。

---

## 八、Skill-first server 不該變成什麼

這裡我也想提醒另一個極端。

很多團隊在建立這層時，會不小心把它做成第二個 monolith。  
這一樣不是好路。

一個好的 thin skill server 不應該：

- 重寫底層 Make flows
- 自己實作整個資料層
- 吸收所有 business logic
- 取代 secret manager 或部署層
- 變成新的 workflow engine

它應該盡量維持在下面這些責任：

- skill loading
- request normalization
- minimal routing
- tool allowlists
- adapter invocation
- response normalization

只要它開始吞掉太多 execution 細節，它就會失去「thin」的價值，最後變成另一個你很難替換的系統。

---

## 九、對專業團隊而言，skill-first 不是美學，而是治理

這一點我覺得很值得講重一點。

skill-first 不是讓架構圖看起來比較先進，也不是為了追流行名詞。  
它直接關係到幾個你遲早會遇到的實務問題。

### 1. 權限與風險隔離

如果某些 tools 會寫資料、操作帳號、觸發外部服務、消耗配額，你應該能明確控制：  
**哪些任務可以看見它們，哪些不行。**

### 2. 可觀測性

當使用者說：
> 今天系統怎麼怪怪的？

你需要回答的不是「模型可能想歪了」。  
你需要知道：

- 進了哪個 skill
- 看到了哪些 tools
- 走了哪個 adapter
- 哪一步被 blocked
- 哪一步回了 structured error

### 3. 可演化性

未來你可能會：
- 換 backend
- 換向量系統
- 拆分某些生成任務
- 換 host
- 換 runtime

只要 skill-first 層還在，這些替換都比較容易局部化。

### 4. 可評估性

沒有 skill-first 層時，你很難穩定地評估某個任務能力。  
有了 skill-first 層之後，你可以直接對：
- `job_ingestion`
- `job_querying`
- `job_decision_support`

做評估，而不是對一鍋 tool soup 做模糊批評。

---

## 十、什麼時候你真的該從直連底層工具，走向 skill-first？

我會用下面這個清單來判斷。

如果你有三項以上答「是」，我會很認真考慮上 skill-first 層。

- 工具數量開始變多
- 工具有 side effects
- 有 helper 工具不該公開
- 使用者請求經常是多步驟任務
- 你需要權限或風險分級
- 你需要 structured errors
- 你想要更穩的 evaluation 對象
- 你未來想替換 backend 或 runtime
- 你開始感覺模型「有時很聰明，但很難管」

這些訊號一旦出現，直連底層工具通常就開始進入報酬遞減區。

---

## 十一、結論：直連底層工具很快，但 skill-first 才能長久

我完全理解為什麼那麼多團隊一開始會選擇直連底層工具。  
因為真的很快，也很有成就感。

但如果你的系統已經具有：

- 穩定 domain
- 多步驟任務
- 明確 side effects
- 品質與風險治理需求
- 長期演化需求

那麼繼續讓 ChatGPT 直連底層工具，代價通常會越來越高。

我自己更傾向的路徑是：

- 保留底層 tools 作為 execution layer
- 在其上建立 thin skill server
- 只把高層 skill 暴露給 ChatGPT
- 由 skill server 控制 routing、tool exposure 與 adapter invocation

這樣做不是多造 bureaucracy，  
而是把系統從「模型即興操作工具」提升為「受治理的任務能力架構」。

---

## 延伸閱讀與參考方式

本文用到的官方文件與我參考的教學文，已整理在：

`./resource/references.md`

---
