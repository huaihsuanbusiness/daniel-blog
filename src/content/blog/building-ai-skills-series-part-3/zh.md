---
title: "打造AI Skill 系列 Part 3：從現有工具設計出 Skill Layer：以 Make 職缺流程為例"
description: "打造AI Skill 系列 Part 3：從現有工具設計出 Skill Layer：以 Make 職缺流程為例"
categories: ["ai"]
tags: ["ai", "mcp", "skill", "agent", "workflow", "architecture"]
date: 2026-04-01T20:13:00
featured: false
---

很多團隊談到 skill，常常一開始就卡在一個很實際的問題：

> 如果我手上已經有一堆能跑的流程、API、automation、工作表，  
> skill 到底還剩下什麼價值？

這個問題很真實。  
因為大多數團隊的起點都不是一張白紙，而是一堆已經活著、已經能工作的 execution flows。

我自己在做 Make 職缺系統時，也是從這個中間地帶開始的：

- 底層工具已經存在
- I/O contract 已經有雛形
- 還沒有正式的 skill registry
- 還沒有 skill-first gateway
- 上層 host 可能是 ChatGPT，也可能換成別的 AI application

這種情境裡，最危險的兩條路通常是：

1. 直接把底層 tools 全暴露給模型
2. 把某個複雜 workflow 直接改名叫 skill，但不改任何責任分工

我後來比較認同的路徑是第三條：

> **不要把工具丟掉重寫成 skill。**  
> **先承認工具是 execution layer，然後在它們上面建立 skill layer。**

這篇就用我現在這套 Make-based job system 來示範，怎麼從現有工具長出一層比較像樣的 skill layer。

<figure>
  <img src="./resource/ai-skill-series-part3-01-from-tools-to-skills.svg" alt="Mapping existing Make execution tools into a higher-level skill layer, showing tool-to-skill relationships" />
  <figcaption>真正的重點不是把工具改名，而是把任務方法從 execution layer 往上抽一層。</figcaption>
</figure>

---

## 先看現況：這個案例裡，底層到底有哪些工具？

根據目前的 v2 Make blueprints 與公開的 `job-skills-gateway` repo，這個系統的 execution layer 主要由四個 public tools 加一個 internal helper 組成：

- `v2_tool_fetch_recent_jobs`
- `v2_tool_bulk_score_new_jobs`
- `v2_tool_query_jobs`
- `v2_tool_generate_job_output`
- `v2_helper_resolve_job_reference`

repo 的 README 也很明確地把 skill layer 放在 ChatGPT 與 Make execution flows 之間，並指出 Make 應保留為 execution layer，而不是直接等於 skill layer。這個定位很重要，因為它代表我們不是從零發明 skill，而是在既有 execution contracts 上面建立任務能力封裝。[1]

---

## 一、第一步不是命名 skill，而是先讀懂每個 tool 的責任

這一步很多人會跳過，但我覺得它其實最重要。

如果你沒有先確認每個 tool 到底負責什麼，你很容易把 implementation detail 直接抬升成 skill 名稱，最後只是換了一套比較漂亮的字。

### 1. `v2_tool_fetch_recent_jobs`
這個工具的責任很明確：

- 接收 `source_site`、`role_keyword`、`days`、`page_from`、`page_to`
- 做 role keyword normalization
- 產生搜尋 URL
- 抓近期職缺
- 將結果寫入或整理成後續可用的資料

它的核心邊界是：  
**刷新或補入近期職缺資料。**

所以它雖然很有任務感，但本質上還是 execution tool。它沒有回答「哪些值得投」，也沒有回答「這次使用者真正要的是什麼任務方法」。

### 2. `v2_tool_bulk_score_new_jobs`
這個工具的責任是：

- 找出尚未評分的職缺，或針對指定 job 重新評分
- 根據 scoring logic 產出 score、relevance、reason
- 將評分結果寫回資料層

這支工具很容易被誤認成 skill，因為它聽起來已經很高階。  
但從系統層來看，它仍然是在執行一段 bounded capability：

> **對既有職缺資料進行批次或定點評分。**

### 3. `v2_tool_query_jobs`
這個工具暴露了一個很完整的查詢面，像是：

- `days`
- `job_status_filter`
- `min_score`
- `keyword_query`
- `top_k`
- `sort_by`
- `sort_order`

輸出則是結構化 shortlist，例如 jobs、matched count、relevant count、primary job id 等。  
它是一支非常成熟的 retrieval tool，但它回答的問題仍然是：

> **從職缺池中取回結果集。**

這跟 skill 還差一層，因為它沒有決定這次到底該查什麼、該怎麼把自然語言需求翻成 query spec、該怎麼處理查無結果或缺參數。

### 4. `v2_tool_generate_job_output`
這支工具最容易讓人猶豫，因為它已經碰到任務語義了。  
它會處理像：

- `analyze_job`
- `generate_application_pack`
- `prepare_interview_brief`

這些 mode，並且牽涉 reference resolution、JD context、生成輸出。

但即使如此，我還是會先把它看成 **high-level execution tool**，而不是 skill。  
原因是它依然更像：

> 一支多模式主工具，負責把某段高價值輸出做出來。

skill 的工作，應該是決定**什麼時候進入哪個 mode、應不應該先 resolve reference、這次允許使用哪些 supporting tools、失敗時怎麼處理**。如果這些策略都埋進同一支 tool，後面會很難演化。

### 5. `v2_helper_resolve_job_reference`
這個 helper 很重要，但我會刻意把它留在內部。

它的角色是：
- 根據 job id、company/title、或 user message 去 resolve 目標職缺
- 找不到時回 blocked / not found
- 幫高層任務把 reference 問題先處理掉

這種 helper 很像 orchestration 的內部器官，而不是應該直接對使用者公開的 skill。

---

## 二、先接受一件事：現有工具不等於 skill，但它們是做 skill 的最好材料

這是我覺得最重要的一句話：

> **現有工具不是 skill。**  
> **但現有工具往往是做 skill 的最好材料。**

因為 skill 不該否定工具，而是應該重新編排它們、治理它們、限制它們、並把它們放進更高一層的任務語義裡。

這也是為什麼我很不喜歡一種偷懶做法：

- `fetch_recent_jobs skill`
- `bulk_score_new_jobs skill`
- `query_jobs skill`
- `generate_job_output skill`

這種切法 technically 不算錯，  
但它直接把 implementation detail 外露成任務語言。

對使用者來說，他真正在問的通常不是：
- 請幫我呼叫哪支工具

而是：
- 幫我刷新近期職缺
- 幫我補齊分數
- 幫我找 shortlist
- 幫我判斷這份值不值得投

skill layer 的存在，就是把這兩種語言隔開。

---

## 三、設計 skill 時，先從使用者任務面切，不要從工具面切

如果從工具面切 skill，很容易得到一張工程師看得懂、使用者卻永遠不會那樣說話的圖。

我比較推薦的問題順序是：

1. 使用者到底在要求什麼任務？
2. 這個任務要不要跨多支工具？
3. 哪些工具應該被允許看見？
4. 哪些工具只是 helper？
5. 這個任務完成時，輸出應該長什麼樣？

用這種方式看，這套 Make 職缺流程比較穩定的 skill map 會長成下面這樣。

### Skill A：`job_ingestion`
責任是刷新職缺池。

它不是單一步驟，而是一個任務能力：

- 抓新職缺
- 補進候選池
- 必要時只對新增資料補評分

它內部主要會用到：

- `v2_tool_fetch_recent_jobs`
- 視情況再接 `v2_tool_bulk_score_new_jobs`

### Skill B：`job_scoring`
這個 skill 在 repo 裡被明確獨立出來，我覺得這個切法是合理的。[1]

它回答的是：
- 幫我補齊所有未評分職缺
- 幫我針對某個已知 job 重打分
- 幫我做 backfill

它主要對應：
- `v2_tool_bulk_score_new_jobs`

這個 skill 的價值，在於把「資料池裡還沒打分的東西補齊」這種 maintenance / curation 任務，從 ingestion 裡獨立出來。

### Skill C：`job_querying`
責任是從職缺池中查 shortlist。

它不是單純 query tool 的同義詞，因為它還應該定義：

- 自然語言如何轉成 query spec
- 缺參數時哪些值該自動補預設
- relevant / score / sort 的優先級怎麼設
- 查無結果時如何回應

它主要對應：
- `v2_tool_query_jobs`

### Skill D：`job_decision_support`
責任是針對單一職缺或少量候選職缺，產生高價值的決策輸出。

例如：
- 分析值不值得投
- 生成 application pack
- 準備 interview brief

它主要對應：
- `v2_tool_generate_job_output`
- 內部先搭配 `v2_helper_resolve_job_reference`

這個 skill 最能體現 skill layer 的價值，因為它不只是「呼叫一支大工具」，而是定義一整個任務方法與邊界。

---

## 四、Skill 的產物不該只有 prompt，而應該是一整組定義

這也是很多團隊容易低估的地方。

一個成熟的 skill，最好不要只有一份 instructions。  
至少應該有幾種不同層的資產。

### 1. Manifest
manifest 是給系統與 router 看的。

它應該包含：
- skill 名稱
- 描述
- 適用請求類型
- allowed tools
- 輸入欄位
- 輸出契約
- 邊界與限制
- 版本資訊

manifest 的價值，在於：
**可路由、可治理、可比對、可測試。**

### 2. Instructions
instructions 是給模型與設計者看的。

它應該描述：
- 任務步驟
- 澄清條件
- failure conditions
- 不該做的事
- 結果整理原則

這不是一般意義上的 prompt，而比較像任務操作手冊。

### 3. Examples
很多人把 examples 當裝飾，但我覺得 examples 是 behavior asset。

如果沒有 examples，你很難穩定校準：
- 什麼樣的 user request 應該進這個 skill
- 什麼樣的輸出算是這個 skill 的合格完成

### 4. Eval Notes
這一層常常被省略，但其實很重要。

因為當 skill 上線後，你遲早要回答：
- 它常在哪裡失敗？
- 哪種請求容易誤判？
- 哪些輸出模式需要人工 review？
- acceptance criteria 是什麼？

這些東西如果不獨立出來，skill 很容易越做越玄學。

---

## 五、用這個案例，實際示範 skill 文件會長什麼樣

下面是一個簡化過的 `job_querying` manifest 範例，重點不是格式一定要一樣，而是讓你看到 skill 文件該記錄什麼。

```yaml
name: job_querying
description: Retrieve shortlist candidates from the stored job pool.
allowed_tools:
  - v2_tool_query_jobs
inputs:
  - days
  - min_score
  - keyword_query
  - top_k
  - sort_by
  - sort_order
output_contract:
  type: shortlist
  fields:
    - jobs
    - matched_count
    - relevant_count
    - primary_job_id
boundaries:
  do_not_score_new_jobs: true
  do_not_generate_application_pack: true
```

而 instructions 可能會像這樣：

```md
# job_querying instructions

Use this skill when the user wants a shortlist from the stored job pool.

Rules:
1. Translate natural-language filters into a structured query spec.
2. Prefer stable defaults over asking unnecessary follow-up questions.
3. If the request is really about analysing a single job, route away from this skill.
4. If no jobs match, return a clear no-result response rather than inventing candidates.
```

這裡你可以很明顯地看到：

- tool contract 在下層
- skill 方法在上層
- 它們不是同一份東西

---

## 六、為什麼 skill 不應該直接寫進 Make tool 裡

這是我很想特別提醒的一點。

很多人會想：
> 既然 Make flow 已經很完整，那我就在裡面多加一些 prompt、規則、分支，不就等於做出 skill 了？

短期看很方便，長期通常會讓系統開始變黏。

### 問題 1：Strategy 與 execution 黏死
當 skill policy 寫死在 Make tool 裡，你之後想換 orchestrator、換 host、換 runtime、換 tool exposure policy，都會很痛。

### 問題 2：你其實沒有真正做出 skill-first
如果底層 tools 還是直接暴露給 host，模型仍然可能繞過你埋在某支 tool 裡的策略，直接呼叫 raw execution layer。

### 問題 3：skill 的迭代速度通常比 tool 快
tool contract 一旦穩定，往往應該盡量收斂。  
但 skill 的 routing signal、examples、instructions、failure policy，通常會比 tools 更常調整。把它們拆開，長期會舒服很多。

所以我比較認同的做法是：

- **Make 保持 tool layer**
- **skill 文件放在外部 repo**
- **skill server / router 載入 skill**
- **再由 skill 決定本次開哪些 tools**

這也是你現在 `job-skills-gateway` repo 的方向：  
Make flows 保持 execution contracts，skills 以 plain files 版本化，然後由薄薄的 FastMCP server 去載入與暴露高層能力。[1]

---

## 七、什麼東西該是 tool，什麼東西該是 skill？一個很好用的判準

如果某個模組主要回答的是：

- 要吃哪些參數？
- 跑完回什麼結構？
- 要對外部世界做什麼動作？

那它通常比較像 **tool**。

如果某個模組主要回答的是：

- 什麼情況要用它？
- 先做什麼再做什麼？
- 哪些工具這次允許出現？
- 什麼情況該澄清或 blocked？
- 什麼輸出才算完成任務？

那它通常比較像 **skill**。

我很喜歡把這個判準濃縮成一句話：

> **tool 解的是 capability**  
> **skill 解的是 task methodology**

這句話在 architecture review 的時候很好用。  
因為很多模組一拿出來，你只要問它主要回答哪一種問題，就知道它應該待在哪一層。

---

## 八、這個案例裡，skill layer 真正帶來的價值是什麼？

如果只是從功能角度看，可能有人會說：

> 反正底層 tools 都能跑，做不做 skill layer 好像也不是不能用？

但我認為 skill layer 的價值，根本不是多一層檔案，而是讓系統開始具有**語義秩序**。

### 1. 控制 tool visible surface
不同 skill 應該看到不同的 tools。這能降低誤用，也能減少模型要處理的決策負擔。

### 2. 讓任務邊界可維護
以後產品語義改變時，你優先調的是 skill，不是重寫全部 execution tools。

### 3. 讓 evaluation 有具體對象
你可以評：
- `job_ingestion`
- `job_scoring`
- `job_querying`
- `job_decision_support`

而不是評一坨不透明流程。

### 4. 為未來的 runtime / host / backend 變更留接口
一旦有 skill layer，未來你不論接 FastMCP、別的 gateway、甚至替換 Make backend，都比較容易局部化處理。

---

## 九、如果你今天手上也有一堆現成工具，最務實的 skill 化步驟是什麼？

我會建議這樣走，不要一開始就追求很漂亮的抽象。

### 第一步：先凍結工具契約
先確保每個 tool 的：
- input
- output
- error envelope
- meta 欄位

夠穩定。

### 第二步：在 tool layer 之上建立 skill registry
先用 repo、資料夾、plain files 都可以。  
重點是把 skill 資產獨立出來。

### 第三步：先切少數幾個高層 skill
不要一開始就切到十幾個。  
先從 3 到 4 個穩定任務類型開始。

### 第四步：建立外部 router / gateway
由它載入 skill，決定 allowlists 與 adapter invocation。  
不要讓 raw tools 直接面向 host。

### 第五步：最後才思考 skill 怎麼透過 MCP 暴露
先把 skill 定義清楚，再談 transport。  
這樣比較不容易把 protocol 問題和任務方法問題混在一起。

---

## 十、結論：Skill 不是替代工具，而是為工具建立語義秩序

從現有工具長出 skill layer，最重要的不是多造一層資料夾。  
而是把系統從：

> 一堆可執行流程

提升成：

> 一套可路由、可治理、可擴充的任務能力系統

對這個 Make 職缺案例而言，我最終的結論不是把四支 tools 改名叫四個 skills。  
而是：

- 保留它們作為 execution tools
- 用它們做為材料，建立高層 task skills
- 將 routing、instructions、examples、eval 往外抽
- 讓未來的 FastMCP / ChatGPT integration 面對的是 skill，而不是 implementation detail

這樣做，短期看是比較清楚；長期看，是比較自由。

因為當 skill layer 真的站起來之後，你後面要接別的 host、換 runtime、替換 backend，甚至重構 tools，本質上都會容易很多。

---

## 延伸閱讀與參考方式

本文用到的 repo、project files、官方文件與我參考的教學文，已整理在：

`./resource/references.md`

---
