---
title: "Agent 設計模式圖鑑 Part 5｜Agent 驗證與自我修正：Retry、Critic、Verifier、Reflexion 與 Generate-and-Test"
description: "完整比較 Retry、Parameterized Retry、Fallback、Self-Refine、Critic、Verifier、Generate-and-Test、Replanning、Reflexion 與 Human Review，並說明如何建立不會無限循環的 Production 修正機制。"
date: 2026-06-30T20:18:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 5
---

想像一個 Coding Agent 接到任務：

> 修復登入 API 的整合測試。

它修改了程式碼，然後回覆：

> 已完成修正，我重新檢查過了，現在應該可以正常運作。

這句話聽起來很有信心。

但它可能根本沒有：

- 執行測試
- 檢查 Build
- 驗證其他登入流程
- 確認沒有刪掉失敗測試
- 檢查是否修改到無關檔案
- 比對原始需求是否真的完成

它只是再次閱讀了自己剛生成的程式碼，然後給出另一個主觀判斷。

這正是 Agent 系統最危險的假綠燈之一：

> **把「模型說自己檢查過」誤當成真正的驗證。**

Agent 能產生答案，不代表它知道答案是否正確。

Agent 能指出問題，也不代表它能可靠判定問題是否已經解決。

當任務失敗時，系統還必須決定：

- 是暫時性錯誤，應該 Retry？
- 是參數不對，應該 Parameterized Retry？
- 是主方法不可用，應該 Fallback？
- 是輸出品質不足，應該 Self-Refine？
- 是需要 Critic 提供修改意見？
- 是必須由 Verifier 做 Pass / Fail 判定？
- 是應該實際執行測試？
- 是答案錯了，還是整條路線錯了？
- 失敗經驗應不應該寫入 Memory？
- 哪些高風險節點必須交給人？

這一篇要處理第四個架構維度：

> **Agent 如何發現錯誤、選擇修復方式，並在有限成本內可靠停止？**

---

## 為什麼「再想一次」不是驗證？

最弱的自我檢查流程通常長這樣：

```text
Generate Answer
  ↓
Think Again
  ↓
Looks Good
  ↓
Accept
```

問題在於，第二次判斷通常仍然使用：

- 同一個模型
- 同一份 Context
- 同一組錯誤前提
- 同樣缺失的外部資訊
- 同樣模糊的成功標準

如果第一次錯誤來自錯誤資料，模型再想一次仍然只是在錯誤資料上重新排列句子。

如果第一次錯誤來自錯誤需求理解，第二次也可能把原本的誤解說得更完整。

如果第一次程式碼沒有執行，第二次閱讀程式碼也無法證明它能運作。

因此，驗證的可靠度主要取決於：

1. **判定標準是否明確**
2. **驗證訊號是否獨立**
3. **是否能接觸真實環境**
4. **是否能提供可重現的證據**
5. **是否能拒絕，而不是永遠給出通過**

## 從主觀檢查到外部證據

可以把常見驗證方式粗略分成幾層：

```text
重新閱讀輸出
  ↓
Self-Refine
  ↓
Critic Review
  ↓
Rule / Schema Verifier
  ↓
External Test or Execution
  ↓
Human Review for judgment and irreversible risk
```

這不是絕對排名。

例如：

- JSON Schema 對格式的判定，通常比人類目視更可靠
- Unit Test 對程式行為的判定，通常比 LLM 評語更可靠
- Human Review 對商業風險與模糊語境可能更有價值
- 人類也可能疲勞、誤判或盲目批准

真正要問的不是：

> 哪一種驗證方式最高級？

而是：

> **這個失敗是否存在可以被客觀觀察的證據？**

![Figure 5-1 — Verification Reliability Ladder](/images/the-atlas-of-agent-design-patterns-part-5/verification-reliability-ladder.png)

> **Figure 5-1｜Verification Reliability Ladder**  
> 從重新閱讀、Self-Refine、Critic、Verifier，到外部測試與 Human Review，驗證訊號逐步變得更獨立、更可觀察；但不同任務需要的證據類型並不相同。

---

## 一、Retry：同一個動作，再試一次

Retry 是最簡單的恢復方式。

```text
Action
  ↓
Failure
  ↓
Wait
  ↓
Retry Same Action
```

它適合：

- API Timeout
- 暫時性網路錯誤
- Rate Limit
- 服務短暫不可用
- 偶發格式解析錯誤
- 暫時性的資源鎖定

Retry 隱含一個重要假設：

> **同一個動作稍後再次執行，有合理機會成功。**

例如：

```text
HTTP 503
  ↓
Wait 2 seconds
  ↓
Retry
```

如果錯誤是暫時性服務壓力，Retry 可能有效。

但如果錯誤是：

```text
HTTP 401
```

同樣的 Token、Header 和 Endpoint 再送十次，通常只會收到十次 401。

## Retry 必須有上限

Production Retry 至少需要：

- Maximum Attempts
- Timeout
- Backoff
- Jitter
- Retryable Error List
- Non-retryable Error List
- Terminal Failure
- Observability

例如：

```text
Attempt 1
  ↓ Fail: 503
Wait 1s

Attempt 2
  ↓ Fail: 503
Wait 2s

Attempt 3
  ↓ Fail: 503
Stop and Fallback
```

不要寫成：

```text
Try until success
```

這句話是 Token、API 費用與值班工程師共同的天敵。

## 哪些錯誤通常不該 Retry？

- 權限不足
- Schema 不合法
- 必要欄位缺失
- 目標不存在
- 使用者要求超出支援範圍
- 明確政策拒絕
- 不可逆操作已成功但回應遺失
- 同一輸入必然造成的程式錯誤

Retry 前必須先做 Error Classification。

---

## 二、Parameterized Retry：不是原樣重來

Parameterized Retry 仍然嘗試完成同一個步驟，但會調整執行參數。

例如：

```text
Search Query A
  ↓ No useful result
Search Query B
```

或：

```text
Parse with strict schema
  ↓ Failed
Parse with repaired input and explicit schema guidance
```

常見調整包括：

- 改寫 Query
- 調整 Timeout
- 縮小資料範圍
- 降低 Batch Size
- 切換輸出格式
- 增加必要 Context
- 修改 Tool Parameters
- 改用較保守的模型設定

## Retry 和 Parameterized Retry 的差別

| 項目 | Retry | Parameterized Retry |
|---|---|---|
| 目標 | 相同 | 相同 |
| 方法 | 相同 | 基本方法相同 |
| 參數 | 不變 | 有調整 |
| 適合問題 | 暫時性失敗 | 輸入或參數不理想 |
| 主要風險 | 重複同一錯誤 | 無限嘗試不同參數 |

Parameterized Retry 不是隨機亂改。

系統應記錄：

- 哪個參數被修改
- 修改原因
- 之前的失敗訊號
- 是否真的改善結果
- 已嘗試過哪些組合

否則 Agent 可能在不同措辭之間來回換皮，形成一座 Parameter Carousel。

---

## 三、Fallback：換一條備援路徑

Fallback 不再堅持原方法。

它會切換到不同的：

- 模型
- 工具
- API
- 資料來源
- 演算法
- 執行模式
- 人工處理路徑

```text
Primary Method
  ↓
Success?
  ├─ Yes → Continue
  └─ No → Fallback Method
             ↓
          Continue or Fail
```

例如：

```text
Primary:
Official API

Fallback 1:
Official Web Page

Fallback 2:
Cached Data

Fallback 3:
Human Review
```

## Retry 和 Fallback 的差別

Retry 是：

> 同一扇門再敲一次。

Fallback 是：

> 換一扇門，甚至換一棟樓。

## Fallback 不一定等價

主模型和備援模型可能：

- 品質不同
- Context Window 不同
- 支援工具不同
- 安全政策不同
- 延遲與成本不同

主資料來源和 Cache 也可能：

- 新鮮度不同
- 欄位不完整
- 缺少最新更新

因此，Fallback 結果應標記：

- 使用了哪條備援路徑
- 品質是否降級
- 資料時間
- 缺失欄位
- 是否需要後續補查

## 常見 Fallback 反模式

### 隱藏主路徑失敗

系統成功回覆，不代表主要服務健康。

### 備援路徑未測試

平常永遠不用，真正故障時才發現 Fallback 也壞了。

### 安全限制較弱

主路徑有完整權限檢查，備援路徑卻繞過政策。

### 無限 Fallback Chain

```text
A → B → C → D → A
```

最後形成環狀災難觀光巴士。

---

## Retry、Fallback 和 Replanning 到底差在哪裡？

這三者都會在失敗後繼續任務，但修改範圍不同。

## Retry

```text
同一步
+ 同一方法
+ 同一參數
```

## Parameterized Retry

```text
同一步
+ 同一類方法
+ 修改參數
```

## Fallback

```text
同一步
+ 改用另一種方法或服務
```

## Replanning

```text
重新檢查目標與剩餘路線
+ 修改後續步驟或依賴關係
```

例如，任務是取得完整職缺資料。

### Retry

重新請求同一個 URL。

### Parameterized Retry

增加 Header、延長 Timeout，或改用另一個頁面參數。

### Fallback

改讀公司 Career Page 或公開 Job API。

### Replanning

發現無法取得完整正文後，修改後續計畫：

```text
停止自動評分
標記 Pending
要求人工補充 JD
不根據職稱推測
```

![Figure 5-4 — Retry, Fallback, or Replan?](/images/the-atlas-of-agent-design-patterns-part-5/retry-fallback-replan-routing.png)

> **Figure 5-4｜Retry, Fallback, or Replan?**  
> 先判斷失敗是否暫時、參數是否可調、是否存在等價備援方法；只有當前提、依賴或剩餘路線失效時，才進入 Replanning。

---

## 四、Self-Refine：模型自己審稿、自己修改

Self-Refine 的基本流程是：

```text
Generate
  ↓
Review Own Output
  ↓
Produce Feedback
  ↓
Revise
```

它適合改善：

- 文句
- 結構
- 完整性
- 格式
- 說明清晰度
- 遺漏項目

例如，一篇產品比較初稿缺少風險段落。

Self-Refine 可以指出：

```text
The comparison includes features and pricing,
but does not discuss deployment risk.
```

接著補上內容。

## Self-Refine 的優點

- 實作簡單
- 不一定需要額外模型
- 適合文字品質改善
- 可以使用明確 Rubric
- 比完全不檢查更好

## Self-Refine 的限制

### 同一個盲點可能持續存在

如果模型不知道某項事實，它不會因為自我反省就突然知道。

### 容易把改寫當修正

句子更漂亮，但核心錯誤仍然存在。

### 容易產生虛假修正感

模型會說：

> 已修正所有問題。

但沒有提供可檢查的變更證據。

### 可能越改越差

多輪 Self-Refine 可能：

- 刪掉正確細節
- 增加不必要內容
- 改變原始需求
- 將不確定資訊寫得更肯定

## Production Self-Refine 應該怎麼做？

不要使用：

```text
Please improve the answer.
```

應提供明確 Rubric：

```text
Check only:
1. Missing required sections
2. Unsupported factual claims
3. Output schema
4. Contradictions
5. Word limit
```

並要求輸出：

```text
Issues Found
Proposed Changes
Revised Output
Unresolved Issues
```

Self-Refine 是修稿工具，不是外部事實驗證器。

---

## 五、Critic：指出哪裡有問題

Critic 的責任不是直接判定最終 Pass / Fail，而是提供有方向的問題診斷。

```text
Generator
  ↓
Draft
  ↓
Critic
  ↓
Feedback
  ↓
Generator Revises
```

Critic 可以檢查：

- 推理缺口
- 證據不足
- 遺漏需求
- 語意矛盾
- 風險
- 可維護性
- 讀者理解障礙
- 替代方案

## Self-Refine 和 Critic 的差別

Self-Refine 通常由同一個執行單元進行：

```text
Generate → Review Self → Revise
```

Critic 則是一個明確分離的角色或步驟：

```text
Generator → Critic → Generator
```

底層模型可以相同，但最好至少做到：

- 不同 Prompt
- 不同 Context
- 明確 Rubric
- 不同責任
- 獨立輸出格式

## 好 Critic 應該輸出什麼？

```text
Issue:
The recommendation is not supported by official sources.

Evidence:
The answer cites only third-party summaries.

Severity:
High

Required Fix:
Retrieve official documentation or mark the claim as unverified.
```

比起：

```text
The answer could be improved.
```

前者更能轉成可執行修復。

## Critic 的主要風險

### Critic 也可能錯

Critic 可能要求移除正確內容，或把風格偏好當成錯誤。

### 過度批評

如果沒有停止門檻，Critic 永遠能找到另一個可改進之處。

### Critic 與 Generator 共用相同偏誤

兩者可能共同忽略同一問題。

### Feedback 不可執行

評論很多，卻沒有指出怎麼修。

因此，Critic 需要：

- Scope
- Rubric
- Severity
- Evidence
- Required Action
- Maximum Review Rounds

---

## 六、Verifier：依規格判定 Pass 或 Fail

Verifier 和 Critic 最大的差別是：

> **Critic 提供問題診斷；Verifier 負責做出驗收判定。**

典型流程：

```text
Output
  ↓
Verifier
  ↓
Pass?
  ├─ Yes → Accept
  └─ No → Reject / Repair / Replan
```

Verifier 應該依賴明確標準，例如：

- JSON Schema
- Required Fields
- Unit Tests
- SQL Read-only Policy
- Citation Coverage
- Source Match
- Permission Rules
- Completion Criteria
- Business Constraints

## Verifier 不應只回覆「看起來正確」

好的 Verifier Output 應包含：

```text
Status: FAIL

Failed Checks:
- Missing citation for Claim 3
- Output exceeds 500 words
- Required field "risk_level" is absent

Evidence:
- Claim 3 has no source reference
- Word count: 684

Next Action:
Repair output without changing verified sections
```

## Deterministic Verifier

適合：

- Schema
- 格式
- 欄位
- 數值
- 權限
- 編譯
- 測試
- 明確規則

優點是可重現。

## Model-based Verifier

適合：

- 語意完整性
- 摘要忠實度
- 論證品質
- 是否回答使用者問題
- 風格與可讀性

但需要：

- 明確 Rubric
- 校準資料
- 一致評分格式
- False Positive / Negative 監控
- 定期重新評估

## Hybrid Verifier

合理順序通常是：

```text
Schema and Rule Checks
  ↓
External Execution
  ↓
Evidence Verification
  ↓
Model-based Quality Review
```

先檢查客觀條件，再評估主觀品質。

不要讓一段文字因為「寫得很有說服力」，就跨過失敗的 Unit Test。

---

## Generator、Critic 和 Verifier 的責任如何分開？

這三個角色經常被混在一起。

## Generator

負責：

- 產生候選輸出
- 根據 Feedback 修改
- 不負責替自己核發通過證書

## Critic

負責：

- 指出問題
- 說明嚴重度
- 提供修正方向
- 不一定擁有最終否決權

## Verifier

負責：

- 依完成條件驗收
- 給出 Pass / Fail
- 提供失敗證據
- 決定 Repair、Replan、Escalate 或 Stop

![Figure 5-2 — Generator, Critic, and Verifier](/images/the-atlas-of-agent-design-patterns-part-5/generator-critic-verifier.png)

> **Figure 5-2｜Generator, Critic, and Verifier**  
> Generator 產生與修改內容；Critic 診斷問題並提供 Feedback；Verifier 根據規格與證據做 Pass / Fail 判定。三者責任分離，才能避免模型自己出題、自己作答、自己宣布滿分。

---

## 七、Generate-and-Test：真的執行才算數

Generate-and-Test 的核心不是「多產生幾個候選再選一個」。

那是 Generate-and-Rank。

Generate-and-Test 的流程是：

```text
Generate Artifact
  ↓
Execute Test
  ↓
Pass?
  ├─ Yes → Accept
  └─ No → Inspect Failure
             ↓
          Revise Artifact
             ↓
          Execute Test Again
```

它適合任何可執行、可觀察的產物：

- 程式碼
- SQL
- API Request
- Shell Command
- Data Transformation
- Workflow Definition
- Constraint Solution
- Browser Action Sequence

## Coding Agent 範例

任務：

> 修復 API 回傳 401 的錯誤。

第一輪：

```text
Generate Patch
  ↓
Run Target Test
  ↓
Fail: Expected 200, received 401
```

Agent 讀取失敗訊號：

```text
Token audience does not match the API configuration.
```

第二輪：

```text
Revise Authentication Configuration
  ↓
Run Target Test
  ↓
Pass
```

但還不能立即宣布完成。

還需要：

```text
Run Authentication Test Suite
  ↓
Run Full Test Suite
  ↓
Run Lint
  ↓
Run Build
  ↓
Check Unrelated Changes
```

## 測試本身也可能有問題

Generate-and-Test 並不是魔法。

如果測試太弱，Agent 可能：

- 通過錯誤的實作
- 只修正單一案例
- 破壞其他功能
- 刪除或跳過測試
- 修改 Expected Result 讓錯誤看起來消失

因此，需要防止 Reward Hacking：

- 測試不可由 Agent 任意刪除
- 關鍵測試應受到保護
- 必須執行完整相關測試
- 檢查測試檔案是否被修改
- 加入靜態分析與 Build
- 比對變更範圍
- 需要時由外部 Verifier 驗收

## Test Result 必須結構化

```text
Command:
pytest tests/auth

Exit Code:
1

Passed:
18

Failed:
2

Failure Signatures:
- token audience mismatch
- expired fixture

Files Changed:
- src/auth/config.py
```

這比把整段 Terminal Log 塞回 Context 更容易讓 Agent可靠修正。

![Figure 5-3 — Generate-and-Test Coding Loop](/images/the-atlas-of-agent-design-patterns-part-5/generate-and-test-coding-loop.png)

> **Figure 5-3｜Generate-and-Test Coding Loop**  
> Agent 在 Sandbox 中產生 Patch、執行目標測試、讀取結構化失敗訊號、修改並重測；通過後仍需執行完整測試、Lint、Build 和變更範圍檢查。

---

## 八、Replanning：錯的可能不是答案，而是整條路線

有時候，修正當前輸出沒有用。

因為真正錯的是：

- 問題理解
- 初始假設
- 資料來源
- 任務拆解
- 步驟依賴
- 執行順序
- 成功標準

例如，一個 Research Agent 原計畫是：

```text
1. 搜尋新聞
2. 整理產品價格
3. 推薦方案
```

執行中才發現：

- 新聞文章引用的是舊價格
- 官方價格頁依地區不同
- 使用者其實需要企業方案
- 原本研究路線無法回答問題

這時如果只 Self-Refine 最終文章，仍然是在錯誤資料上美容。

Replanning 應該修改剩餘計畫：

```text
1. 保留已確認的產品清單
2. 改查官方地區定價
3. 補充企業方案限制
4. 標記無法確認的價格
5. 重新產生推薦
```

## 什麼時候應該 Replan？

- 關鍵假設失敗
- 必要資料不可取得
- 目標被誤解
- 多個步驟連續失敗
- Verifier 發現結構性缺口
- 依賴關係改變
- 預算不足以完成原計畫
- 使用者更新需求

## Replanning 不是萬用 Retry

如果資料確實不存在，Replan 也不應該無限換方法。

合理結果可能是：

- Unavailable
- Pending
- Unsupported
- Partial Result
- Human Action Required

---

## 九、Reflexion：把失敗變成未來經驗

Reflexion 不只修正當前輸出，而是將失敗轉成可供未來使用的經驗。

```text
Attempt
  ↓
Failure
  ↓
Analyze What Happened
  ↓
Extract Lesson
  ↓
Store in Memory
  ↓
Retrieve in Future Attempt
```

例如：

```text
Failure:
Scored a job using only the title.

Lesson:
Never score a role without the full job description.

Procedure:
If the stored JD is empty, fetch the source URL.
If the full text is still unavailable, mark Pending.
```

下一次遇到相似任務時，系統先取回這條 Procedural Memory。

## Reflexion 和 Self-Refine 的差別

Self-Refine：

> 改善現在這份輸出。

Reflexion：

> 改變未來遇到相似任務時的行為。

## Reflexion 應該存什麼？

適合儲存：

- 失敗情境
- 根因
- 有效修復
- 適用條件
- 不適用條件
- 來源與時間
- 信心
- 驗證結果

不應該只存：

```text
Be more careful next time.
```

這句話的操作價值接近貼在螢幕旁的一張模糊便利貼。

## Reflexion 的主要風險

### 錯誤教訓

Agent 可能從一次偶發失敗得出錯誤規則。

### 過度概括

```text
某次官方 API 失敗
→ 以後永遠不要使用官方 API
```

### 記憶污染

未驗證的反思被寫入長期記憶，之後持續影響任務。

### 規則過期

API、產品與流程已更新，但舊教訓仍被取回。

### 記憶衝突

兩次任務產生相反規則。

因此，Reflexion Memory 需要：

- Evidence
- Scope
- Confidence
- Version
- Created At
- Expiry
- Validation Status
- Superseded By
- Human Approval for high-impact procedures

![Figure 5-5 — Reflexion Memory Loop](/images/the-atlas-of-agent-design-patterns-part-5/reflexion-memory-loop.png)

> **Figure 5-5｜Reflexion Memory Loop**  
> 失敗被分析成具備情境、根因、修復與適用範圍的 Lesson；只有經過驗證的經驗才寫入 Memory，並在未來相似任務中被檢索與重新驗證。

---

## 十、Human Review：高風險節點的最後防線

有些操作即使模型信心很高，也不應該完全自動執行。

例如：

- 寄送對外 Email
- 執行付款
- 刪除資料
- 修改 Production
- 核准貸款
- 發布法律或醫療建議
- 權限提升
- 大規模聯絡客戶
- 接受不可逆合約
- 寫入高價值主資料

Human Review 的價值不只是「人可能比較聰明」。

更重要的是：

- 責任歸屬
- 商業判斷
- 風險接受
- 例外處理
- 最終授權

## 人類需要看到什麼？

一個只有 `Approve` 和 `Reject` 的按鈕通常不夠。

審批畫面至少應提供：

- Agent 準備做什麼
- 為什麼這樣做
- 使用了哪些來源
- 哪些檢查已通過
- 哪些風險仍存在
- 操作影響範圍
- 是否可撤銷
- 預覽與差異
- 替代方案
- 超時後怎麼處理

## Human Review 也可能失敗

- 盲目批准
- 審批疲勞
- 資訊過多
- 缺少重要 Context
- 權限角色錯誤
- 無法追蹤修改內容
- Agent 在等待期間狀態已改變

因此，人類審批也需要：

- Clear Decision Context
- Expiry
- Revalidation Before Execution
- Approver Identity
- Audit Log
- Segregation of Duties
- No Self-approval
- Safe Resume State

Human Review 是安全控制，不是把所有不確定性丟給人類的垃圾桶。

---

## Self-Refine、Critic、Verifier 與 Reflexion 完整比較

| 模式 | 核心任務 | 影響範圍 | 是否給 Pass / Fail | 是否依賴外部證據 | 是否影響未來任務 | 主要風險 |
|---|---|---|---:|---:|---:|---|
| Self-Refine | 自己找問題並改稿 | 當前輸出 | 通常否 | 通常否 | 否 | 同一盲點、越改越差 |
| Critic | 診斷問題並提供 Feedback | 當前輸出或方案 | 通常否 | 可搭配 | 否 | 評論錯誤、過度批評 |
| Verifier | 依規格驗收 | 當前步驟或輸出 | 是 | 應盡量使用 | 否 | 規則不完整、假陽性／假陰性 |
| Reflexion | 將失敗轉成經驗 | 未來相似任務 | 否 | 應先驗證 | 是 | 錯誤記憶、過度概括、過期 |

---

## 驗證方式可靠度比較

| 驗證方式 | 獨立性 | 可重現性 | 適合檢查 | 不適合單獨處理 |
|---|---:|---:|---|---|
| 重新閱讀 | 低 | 低 | 明顯遺漏、語句 | 事實、執行結果 |
| Self-Refine | 低 | 低～中 | 結構、格式、完整性 | 共同盲點 |
| Critic | 中 | 中 | 品質、風險、論證缺口 | 嚴格 Pass / Fail |
| Model Verifier | 中 | 中 | 語意完整性、忠實度 | 精確執行結果 |
| Rule / Schema Check | 高 | 高 | 格式、欄位、政策 | 開放式品質 |
| External Test | 高 | 高 | 程式、SQL、工具行為 | 模糊商業判斷 |
| Source Verification | 高 | 中～高 | 事實與 Citation | 無來源的創意任務 |
| Human Review | 視流程 | 中 | 高風險、模糊判斷、授權 | 大量重複的客觀檢查 |

可靠系統通常不只使用一層。

例如 Coding Agent：

```text
Static Validation
  ↓
Target Test
  ↓
Related Test Suite
  ↓
Full Test Suite
  ↓
Lint
  ↓
Build
  ↓
Change Review
```

---

## 失敗類型與修復策略表

| 失敗類型 | 典型訊號 | 優先策略 | 不應該做什麼 |
|---|---|---|---|
| 暫時性基礎設施錯誤 | Timeout、503、Rate Limit | Retry + Backoff | 無限立即重試 |
| 參數不理想 | Query 無結果、Batch 太大 | Parameterized Retry | 隨機改參數不記錄 |
| 主服務不可用 | API Down、Model Outage | Fallback | 假裝品質完全相同 |
| 輸出格式錯誤 | Schema Fail、缺欄位 | Repair / Self-Refine | 重做整套研究 |
| 內容品質不足 | 遺漏、矛盾、論證弱 | Critic + Revise | 只要求「再想一次」 |
| 明確規格未通過 | Policy、Rule、Required Field | Verifier → Reject / Repair | 讓 Generator 自己宣布 Pass |
| 可執行產物失敗 | Test、Build、SQL Error | Generate-and-Test | 靠模型目視判斷 |
| 關鍵假設錯誤 | 資料來源無效、目標誤解 | Replanning | 一直改最終文字 |
| 重複性失敗 | 相似任務反覆犯錯 | Reflexion + Validated Memory | 寫入模糊或未驗證教訓 |
| 高風險或不可逆操作 | Payment、Delete、Publish | Human Review | 自動探索多條真實操作路徑 |
| 不支援或資料不存在 | Unsupported、Unavailable | Stop / Pending / Partial | 無限 Replan |

---

## 如何建立不會無限循環的修正機制？

驗證與修正模式組合後，很容易形成循環：

```text
Generate
  ↓
Critic
  ↓
Revise
  ↓
Verifier
  ↓
Fail
  ↓
Revise Again
```

如果沒有邊界，Agent 永遠可以再修一次。

## 1. 先分類失敗

每次失敗必須被歸類，例如：

- Transient
- Invalid Input
- Quality Failure
- Policy Failure
- Tool Failure
- Missing Data
- Plan Failure
- Unsupported
- Human Decision Required

不同失敗不能全部送回同一個 Retry Loop。

## 2. 設定每種迴圈的上限

例如：

| 迴圈 | 上限 |
|---|---:|
| Network Retry | 3 |
| Schema Repair | 2 |
| Critic Revision | 2 |
| Generate-and-Test | 4 |
| Replanning | 2 |
| Human Approval Reminder | 1 |

## 3. 要求每輪有可觀察進展

例如：

- 失敗測試數量下降
- 缺失欄位減少
- Citation Coverage 提升
- 未解決問題減少
- 新增有效來源
- Verifier 分數提高

如果兩輪沒有進展：

```text
No-improvement Limit Reached
  ↓
Fallback / Replan / Stop
```

## 4. 偵測重複行動與重複錯誤

記錄：

- Action Signature
- Input Hash
- Error Signature
- Output Hash
- Tool Parameters
- Plan Version

如果相同輸入產生相同失敗，不應該偽裝成新嘗試。

## 5. 使用遞增式升級策略

```text
Retry
  ↓
Parameterized Retry
  ↓
Fallback
  ↓
Repair
  ↓
Replan
  ↓
Human Review or Stop
```

不是每次失敗都直接啟動最昂貴流程。

## 6. 設定總 Budget

除了每個 Loop 的上限，還要有全任務限制：

- Max Tokens
- Max Tool Calls
- Max Wall Time
- Max Cost
- Max Model Calls
- Max State Transitions

## 7. 定義 Terminal States

至少包括：

- Completed
- Failed
- Partial
- Pending
- Unsupported
- Cancelled
- Requires Human Action

「沒有完全成功」不代表必須繼續嘗試。

## 8. 保存修正歷史

每輪記錄：

- Attempt Number
- Failure Type
- Evidence
- Strategy Used
- Changes Made
- Result
- Cost
- Next Decision

這能防止 Agent 忘記自己已經試過什麼。

---

## Production 驗證與修正架構

一套成熟流程可以長這樣：

```text
Generate Output
  ↓
Hard Validation
  ├─ Fail → Repair
  └─ Pass
       ↓
External Test / Evidence Check
  ├─ Fail → Classify Failure
  │          ├─ Transient → Retry
  │          ├─ Parameter → Parameterized Retry
  │          ├─ Method → Fallback
  │          ├─ Output → Critic / Repair
  │          ├─ Plan → Replan
  │          ├─ Risk → Human Review
  │          └─ Unsupported → Stop
  └─ Pass
       ↓
Quality Verifier
  ├─ Fail → Bounded Revision
  └─ Pass → Accept
```

如果失敗具有可重用價值：

```text
Verified Failure Analysis
  ↓
Create Scoped Lesson
  ↓
Approve Memory Write
  ↓
Reflexion Memory
```

這裡的重點是：

- 驗證先於宣告完成
- 修復方式由失敗類型決定
- 每個 Loop 都有上限
- 長期記憶只保存被驗證的教訓
- 不支援的任務可以正式停止

---

## 一個完整範例：Research Agent 如何處理錯誤

任務：

> 比較三家產品的企業方案價格。

## 第一次執行

Agent 找到三個第三方評測網站，產生價格表。

## Verifier 檢查

```text
Status: FAIL

Reason:
Two prices are not supported by official sources.

Failure Type:
Evidence Failure
```

## Critic 提供修正方向

```text
Use official pricing pages, billing documentation,
or official announcements.
Mark unavailable values explicitly.
```

## Fallback

其中一家官方 Pricing Page 無法存取。

系統切換到：

```text
Official Documentation
  ↓
Official Product Announcement
```

## Replanning

仍找不到企業方案價格。

剩餘計畫修改為：

```text
1. Preserve verified public prices
2. Mark enterprise pricing as Contact Sales
3. Compare available contract conditions
4. Do not infer hidden prices
```

## Verifier 再次檢查

```text
Official-source coverage: PASS
Unsupported claims: 0
Missing values explicitly marked: PASS
```

## Reflexion

將經驗寫成有限範圍規則：

```text
Context:
Enterprise pricing research

Lesson:
Do not infer unpublished enterprise prices.

Procedure:
Use official pricing, documentation, or announcements.
If unavailable, label Contact Sales or Unavailable.

Validation:
Approved by source verifier
```

這套流程同時使用：

- Verifier
- Critic
- Fallback
- Replanning
- Reflexion

但沒有盲目 Retry，也沒有用「再想一次」冒充查證。

---

## 什麼時候使用哪一種模式？

| 任務情況 | 建議模式 |
|---|---|
| 暫時性網路或服務錯誤 | Retry |
| 同一步驟可以透過參數改善 | Parameterized Retry |
| 主方法失效但有備援方案 | Fallback |
| 文字結構或格式需要改善 | Self-Refine |
| 需要診斷品質與問題 | Critic |
| 有明確規格或完成門檻 | Verifier |
| 產物可以真正執行與測試 | Generate-and-Test |
| 初始假設或剩餘路線失效 | Replanning |
| 相似錯誤會在未來重複出現 | Reflexion |
| 高風險、模糊或不可逆操作 | Human Review |
| 任務不支援或資料不存在 | Stop / Pending / Partial |

---

## 常見反模式

## 反模式一：把 Retry 當萬用修復

任何錯誤都再試三次。

## 反模式二：模型自己生成、自己評論、自己驗收

同一套偏誤貫穿所有階段。

## 反模式三：Verifier 沒有明確規格

只要求：

> Check whether the answer is good.

## 反模式四：Critic 永遠能找到問題

修正循環沒有接受門檻和最大輪數。

## 反模式五：Generate-and-Test 只跑一個弱測試

目標測試通過，其他功能卻被破壞。

## 反模式六：Agent 可以修改驗收標準

失敗後直接刪除 Test 或放寬 Constraint。

## 反模式七：Replanning 每次都推翻全部工作

已完成且有效的結果被重做。

## 反模式八：所有失敗都寫入 Memory

偶發錯誤變成永久規則。

## 反模式九：Human Review 沒有足夠資訊

人類只能盲目按 Approve。

## 反模式十：沒有正式失敗狀態

系統永遠相信再試一次就會成功。

---

## 驗證與修正的 Production Checklist

## 驗證

- 是否有明確 Completion Criteria？
- 是否優先使用 deterministic checks？
- 是否執行真實工具或環境測試？
- Verifier 是否能輸出 Fail？
- 是否保存失敗證據？
- 是否監控 False Positive / Negative？

## 修復

- 是否先分類 Failure Type？
- Retry 是否只處理 Retryable Error？
- 是否區分 Retry、Fallback 和 Replan？
- 每種循環是否有上限？
- 是否有 No-improvement Detection？
- 是否能輸出 Partial、Pending 或 Unsupported？

## Reflexion

- Lesson 是否有適用範圍？
- 是否保存根因與修復證據？
- 是否經過驗證後才寫入？
- 是否有版本、時間與過期規則？
- 是否能撤銷或覆蓋錯誤記憶？

## Human Review

- 審批者是否看得到影響與證據？
- 操作是否在批准前保持暫停？
- 批准後是否重新驗證狀態？
- 是否有審批期限與 Audit Log？
- 是否避免 Self-approval？

---

## 本篇結論

Agent 可靠性不是來自它願意多想幾次。

而是來自一套能夠：

- 發現錯誤
- 取得證據
- 分類失敗
- 選擇正確修復方式
- 限制修正次數
- 在無法完成時安全停止

的驗證與恢復系統。

本篇介紹的模式分別解決不同問題：

- **Retry**：同一動作處理暫時性失敗
- **Parameterized Retry**：調整參數後重試同一步驟
- **Fallback**：切換另一種方法、工具或來源
- **Self-Refine**：改善當前輸出的結構與品質
- **Critic**：診斷問題並提供可執行 Feedback
- **Verifier**：依規格與證據做 Pass / Fail 判定
- **Generate-and-Test**：在真實或隔離環境中執行與測試
- **Replanning**：當假設或路線失效時修改剩餘計畫
- **Reflexion**：將經過驗證的失敗轉成未來經驗
- **Human Review**：保護高風險、模糊與不可逆操作

成熟系統不會只使用一種。

更常見的組合是：

```text
Generate
  ↓
Hard Validation
  ↓
External Test
  ↓
Verifier
  ↓
Retry / Fallback / Repair / Replan / Human Review
  ↓
Accept or Stop
```

最後應該記住：

> **驗證不是問模型「你確定嗎？」；驗證是要求系統提供能被觀察、重現與拒絕的證據。**

下一篇，我們會進入第五個架構維度：

> 工作應該由一個 Agent 完成，還是交給多個 Agent 分工？

Part 6 將完整比較 Single Agent、Role-based Single Agent、Supervisor–Worker、Planner–Executor–Critic、Debate、Voting、Blackboard、Peer-to-Peer 與 Swarm。
