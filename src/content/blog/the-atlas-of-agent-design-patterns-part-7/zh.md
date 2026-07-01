---
title: "Agent 設計模式圖鑑 Part 7｜Agent Memory 全解：Working、Episodic、Semantic 與 Procedural Memory"
description: "完整拆解 Stateless、Working Memory、Short-term State、Episodic Memory、Semantic Memory、Procedural Memory、User Memory、Shared Memory 與 External Knowledge Store，並釐清 Memory、State、Context 與 RAG 的差別。"
date: 2026-07-01T00:24:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 7
---

一個 Agent 正在處理長任務。

它已經：

- 搜尋過三個來源
- 排除兩個錯誤方向
- 完成一半步驟
- 得知使用者不接受第三方資料
- 發現某個 API 需要額外權限
- 記錄了一次值得避免的失敗

接著，Context Window 被壓縮，或 Session 被重啟。

Agent 再次醒來後，重新搜尋相同頁面、重複呼叫相同工具、忽略使用者限制，最後又犯了相同錯誤。

這不是單純的模型能力問題。

更可能是系統沒有正確區分：

- Context
- State
- Working Memory
- Long-term Memory
- RAG
- External Knowledge Store

Agent Memory 不是把所有對話永久保存，也不是接一個向量資料庫就宣告「具有長期記憶」。

真正的 Memory Design 必須回答：

```text
什麼資訊值得記住？
應該保存多久？
誰可以讀取？
誰可以寫入？
什麼情況下更新？
衝突時相信哪一筆？
什麼時候應該遺忘？
```

這一篇會完整比較：

- Stateless
- Working Memory
- Short-term State
- Episodic Memory
- Semantic Memory
- Procedural Memory
- User Memory
- Shared Memory
- External Knowledge Store

並解釋一套 Production Agent 如何建立可追蹤、可更新、可撤銷、可過期的記憶系統。

---

## Memory、State、Context 與 RAG 各自回答不同問題

這四個概念經常被混在一起。

但它們回答的是不同問題。

## Context

Context 是：

> 模型這一次推理或生成時，實際看得到什麼。

可能包含：

- System Instructions
- User Query
- Retrieved Chunks
- Tool Outputs
- Current Notes
- Conversation History
- Selected Memory Items

Context 有容量限制。

資訊不在 Context 裡，模型就無法直接使用。

## State

State 是：

> 工作流目前走到哪裡。

例如：

- Current Node
- Completed Steps
- Retry Count
- Pending Approval
- Worker Status
- Current Plan Version
- Remaining Budget

State 主要服務流程控制，而不是知識檢索。

## Memory

Memory 是：

> 系統為了之後的步驟或未來任務，保存哪些可重用資訊。

例如：

- 本次任務的中間結論
- 過去發生的事件
- 穩定知識
- 做事規則
- 使用者偏好
- 多 Agent 共用的中間結果

Memory 可以是短期，也可以跨 Session。

## RAG

RAG 是：

> 系統如何從外部知識來源檢索資料，放進當前 Context。

典型流程：

```text
Query
  ↓
Retrieve
  ↓
Select Chunks
  ↓
Insert into Context
  ↓
Generate
```

RAG 不代表 Agent「記得」那些文件。

它只是在需要時重新取回外部資料。

## 一句話區分

```text
Context：模型現在看得到什麼
State：流程現在走到哪裡
Memory：系統為之後保留什麼
RAG：系統現在從外部取回什麼
```

![Figure 7-2 — Context, State, Memory, and RAG](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-2-context-state-memory-rag.png)

> **Figure 7-2｜Context, State, Memory, and RAG**  
> Context 是當前模型輸入；State 保存流程進度；Memory 保存可重用資訊；RAG 則從外部 Knowledge Store 取回資料，再放入 Context。

---

## 一、Stateless：每次都重新開始

Stateless 系統不保存跨請求資訊。

```text
Request
  ↓
Model
  ↓
Response
  ↓
End
```

下一個 Request 不知道上一個 Request 發生了什麼，除非呼叫端再次提供。

## Stateless 適合什麼？

- 翻譯
- 改寫
- 單次摘要
- 簡單分類
- 固定格式轉換
- 無需跨步驟追蹤的任務
- 高隱私、低保存需求的場景

## 優點

- 實作簡單
- 隱私風險較低
- 不會被舊記憶污染
- 結果較容易重現
- 不需要記憶治理

## 限制

- 重複工作
- 無法保存偏好
- 長任務容易失去進度
- 無法利用過去經驗
- 每次都要重新載入 Context

Stateless 並不落後。

如果任務不需要 Memory，Stateless 往往是更安全的預設。

---

## 二、Working Memory：目前任務正在使用什麼

Working Memory 是當前任務的短期工作區。

它可能保存：

- 中間結論
- 目前子目標
- 已查看來源
- 未解決問題
- 工具輸出摘要
- 臨時變數
- 草稿
- 當前假設

例如，Research Agent 的 Working Memory：

```text
Goal:
Compare three frameworks

Verified:
- Framework A supports persistence
- Framework B requires external storage

Missing:
- Framework C observability details

Rejected:
- Third-party pricing claim
```

## Working Memory 和 Context Window 的差別

Context Window 是模型目前實際收到的內容。

Working Memory 是系統保存的任務工作資料。

兩者不是同一件事。

系統可以從 Working Memory 中挑選部分資料放進 Context：

```text
Working Memory Store
  ↓
Select Relevant Items
  ↓
Context Builder
  ↓
Model Context
```

Working Memory 可能比單次 Context 更大，也可能以結構化形式保存。

## Working Memory 應該保存多久？

通常到：

- 任務完成
- 任務取消
- 任務逾期
- Session 結束
- Retention TTL 到期

它不是天然永久記憶。

## 常見風險

### 工作區無限增長

所有 Tool Output 都被保留。

### 舊中間結論沒有失效

新證據出現後，舊結論仍被檢索。

### 未驗證內容與已驗證內容混在一起

草稿被當成事實。

### Context Builder 選錯資料

真正重要資訊沒被放入 Context。

---

## 三、Short-term State：工作流進度不是記憶內容

Short-term State 保存工作流進度。

例如：

```text
Current State:
VERIFYING

Completed Steps:
- PLAN
- RESEARCH

Retry Count:
1

Pending:
- Human Approval

Next Node:
WRITE
```

## State 常見欄位

- Workflow ID
- Current State
- Step Status
- Retry Count
- Attempt Count
- Parent Task
- Worker Status
- Approval Status
- Remaining Budget
- Last Error
- Next Node
- Updated At

## State 和 Working Memory 的差別

Working Memory 回答：

> 目前任務知道什麼、正在處理什麼？

State 回答：

> 目前流程走到哪裡、下一步能走去哪裡？

例如：

```text
Working Memory:
已找到兩份官方文件

State:
目前位於 VERIFY
```

把兩者混在一起，會讓系統難以判斷：

- 這是資料，還是流程控制欄位？
- 哪些內容可以摘要？
- 哪些欄位必須精確保存？
- 哪些內容可以過期？

State 通常需要更強的精確性、版本控制與原子更新。

---

## 四、Episodic Memory：過去發生了什麼

Episodic Memory 保存過去事件。

例如：

```text
Task:
Retrieve a complete job description

Event:
LinkedIn page returned partial content

Action:
Used public job API

Result:
Full description retrieved

Lesson Candidate:
Try the public API after detecting partial page content
```

Episodic Memory 比一般聊天紀錄更有結構。

它通常包含：

- Context
- Goal
- Action
- Observation
- Outcome
- Error
- Timestamp
- Environment
- Relevant Source
- Confidence

## 適合什麼？

- 故障排查
- 客服歷史
- 長期任務
- 使用者互動紀錄
- 相似案例檢索
- Reflexion
- Agent 行動回放

## Episodic Memory 的價值

### 找相似案例

新問題出現時，檢索過去相似情境。

### 避免重複失敗

知道哪些方法已經失敗過。

### 提供可審計歷史

可以追蹤 Agent 之前做過什麼。

### 支援個人化

知道使用者過去接受或拒絕什麼方案。

## 主要風險

### 相似不代表相同

過去案例可能只是在表面上相似。

### 過時

工具、版本、法規或環境可能已變。

### 隱私

事件紀錄可能包含敏感資訊。

### 錯誤歸因

Agent 可能錯誤判斷成功原因。

---

## 五、Semantic Memory：長期保存穩定知識

Semantic Memory 保存較穩定、可重用的知識。

例如：

- 公司名稱與產品
- 組織定義
- 領域術語
- 產品規格
- 使用者授權範圍
- 系統規則
- 已驗證事實

它回答的是：

> 系統長期知道什麼？

## Semantic Memory 不應該只是無來源文字

一筆成熟的 Semantic Memory 至少需要：

- Fact
- Source
- Source Type
- Effective Date
- Version
- Confidence
- Validation Status
- Scope
- Expiry
- Last Checked At

例如：

```text
Fact:
Enterprise plan supports SSO

Source:
Official product documentation

Version:
2026-06

Scope:
Enterprise plan only

Validation Status:
Verified
```

## Semantic Memory 和 RAG 的關係

Semantic Memory 可以建立在：

- Database
- Knowledge Graph
- Vector Store
- Key-value Store
- Structured Profile
- Document Store

RAG 是檢索方法。

Semantic Memory 是資訊用途與生命週期。

一個 Semantic Memory Store 可以被 RAG 檢索，但兩者不是同義詞。

## 主要風險

- 過期事實
- 來源不明
- 不同版本混用
- 推測被寫成事實
- 區域或方案 Scope 遺失
- 新資訊沒有覆蓋舊資訊

---

## 六、Procedural Memory：Agent 應該怎麼做

Procedural Memory 保存做事規則。

例如：

```text
If the stored job description is empty:
1. Open the source URL
2. Retrieve the complete text
3. Verify that responsibilities and requirements exist
4. If the full text is unavailable, mark Pending
5. Do not score from the job title alone
```

它回答的是：

> 系統遇到某種情境時，應該採取什麼程序？

## Procedural Memory 可以包含

- SOP
- Tool Usage Rules
- Escalation Policy
- Fallback Sequence
- Validation Checklist
- Handoff Contract
- Safety Rule
- Retry Policy
- Output Format

## Procedural Memory 和 Prompt 的差別

Prompt 是某次呼叫的指示。

Procedural Memory 是系統可持續取回、更新與治理的程序知識。

成熟系統可能：

```text
Retrieve Applicable Procedures
  ↓
Check Version and Scope
  ↓
Insert Selected Rules into Context
  ↓
Execute
```

## Procedural Memory 的風險

### 過期規則

API、產品或政策已改變。

### 規則衝突

兩條程序對相同情境給出不同動作。

### 錯誤教訓永久化

一次偶發失敗被寫成全局規則。

### Scope 遺失

原本只適用某個專案，後來套用到全部任務。

因此，Procedural Memory 應該具備：

- Trigger
- Preconditions
- Steps
- Exceptions
- Scope
- Version
- Owner
- Approval Status
- Expiry
- Superseded By

---

## 七、User Memory：偏好、限制與長期設定

User Memory 保存與特定使用者有關的長期資訊。

例如：

- Preferred Language
- Writing Style
- File Format
- Accessibility Needs
- Notification Preference
- Stable Workflow Rules
- Explicitly Saved Preferences

## 適合保存的內容

- 使用者主動要求記住的設定
- 長期穩定的工作偏好
- 對未來任務有明確幫助的限制
- 可以被使用者查看、更新與刪除的資料

## 不應隨便保存的內容

- 一次性閒聊
- 短期情緒
- 未確認的推測
- 過度私密資訊
- 敏感屬性
- 從第三方內容推論出的個人資訊
- 使用者沒有合理預期會被保存的內容

## User Memory 必須具備的能力

- Explicit Consent
- View
- Edit
- Delete
- Scope Control
- Retention Policy
- Sensitive-data Handling
- Auditability

User Memory 的價值不是「記越多越貼心」。

而是：

> 在使用者可理解、可控制的前提下，保存真正能改善未來互動的資訊。

---

## 八、Shared Memory：多 Agent 如何共享資訊

Shared Memory 讓多個 Agent 使用共同工作區。

```text
Research Agent
       ↕
Shared Memory
       ↕
Analysis Agent
       ↕
Writing Agent
```

Shared Memory 可能保存：

- Task Goal
- Plan
- Verified Facts
- Open Questions
- Worker Results
- Source References
- Conflict Flags
- Final Decisions
- Shared Procedures

## Shared Memory 和 Blackboard 的關係

Blackboard 是一種 Shared Memory 架構。

多個 Agent 透過中央工作區協作，而不是互相傳送全部對話。

## Shared Memory 的最大風險：污染會擴散

如果 Research Agent 寫入錯誤資訊：

```text
Product A costs $10
```

Analysis Agent、Writer Agent 和 Verifier 都可能沿用。

因此，Shared Memory 至少應區分：

- Proposed
- Verified
- Rejected
- Superseded
- Expired

## 每筆 Shared Memory 需要

- Entry ID
- Author
- Source
- Created At
- Version
- Validation Status
- Confidence
- Scope
- Access Policy
- Expiry

## 權限設計

不是所有 Agent 都應該能：

- 修改 Verified Fact
- 刪除他人結果
- 覆蓋 Procedure
- 讀取敏感 User Memory
- 寫入 Long-term Memory

可以分成：

```text
Read
Propose
Validate
Approve
Supersede
Delete
```

---

## 九、External Knowledge Store：外部知識不是 Agent 自己的記憶

External Knowledge Store 保存：

- 文件
- 政策
- Manual
- Wiki
- Database
- Product Catalog
- Code Repository
- Knowledge Graph
- Web Data

Agent 通常透過：

- Keyword Search
- Vector Search
- SQL
- Graph Query
- API
- RAG

來取回資料。

## 為什麼要和 Memory 分開？

External Knowledge 通常：

- 由外部來源管理
- 有自己的更新流程
- 可能屬於多個使用者
- 不應被 Agent 隨意改寫
- 需要保留原始來源
- 可能比 Agent Memory 更完整

Memory 則通常保存：

- Task-specific Summary
- Learned Procedure
- User Preference
- Episode
- Verified Derived Fact

## 一個常見錯誤

把 Retrieval Chunk 寫入 Memory，再把它當成永久事實。

這會遺失：

- 原始文件版本
- 更新時間
- 段落上下文
- 權限
- Source of Truth

更好的方式是保存：

```text
Reference:
Document ID + Version + Section

Derived Memory:
Scoped summary with source reference
```

---

## Agent 記憶分層

Agent Memory 可以按照生命週期與用途分層。

## Layer 1：Immediate Context

模型目前可見的輸入。

## Layer 2：Working Memory

當前任務的中間資訊。

## Layer 3：Short-term State

工作流進度與控制欄位。

## Layer 4：Long-term Memory

- Episodic
- Semantic
- Procedural
- User

## Layer 5：Shared Memory

跨 Agent 共用的任務資訊。

## Layer 6：External Knowledge

由外部系統管理、按需檢索的資料。

![Figure 7-1 — Agent Memory Layers](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-1-agent-memory-layers.png)

> **Figure 7-1｜Agent Memory Layers**  
> 從 Immediate Context、Working Memory、Short-term State，到 Episodic、Semantic、Procedural、User 與 Shared Memory，再到外部 Knowledge Store，各層有不同用途、生命週期與治理要求。

---

## 記憶不是只做檢索：完整生命週期

Memory System 的完整流程不是：

```text
Save Everything
  ↓
Vector Search
```

而是：

```text
Observe
  ↓
Decide Whether to Write
  ↓
Normalize
  ↓
Validate
  ↓
Store
  ↓
Retrieve
  ↓
Re-rank
  ↓
Apply
  ↓
Revalidate
  ↓
Update / Supersede / Forget
```

## 1. Write Decision

先決定是否值得保存。

問題包括：

- 未來是否可能重用？
- 是否已經存在？
- 是否包含敏感資料？
- 是否有可靠來源？
- 是否只是暫時性資訊？
- 是否已取得使用者同意？

## 2. Normalize

將內容轉成結構化格式。

例如：

```text
Type:
Procedural

Trigger:
Full job description missing

Action:
Fetch source URL

Fallback:
Mark Pending

Scope:
Job scoring workflow
```

## 3. Validate

在寫入前檢查：

- Source
- Accuracy
- Scope
- Consent
- Conflict
- Duplicate
- Policy

## 4. Store

選擇適當儲存位置：

- Relational Database
- Key-value Store
- Vector Store
- Document Store
- Graph Database
- Event Log

## 5. Retrieve

根據：

- Query
- Task
- User
- Scope
- Time
- Memory Type
- Permission

取得候選記憶。

## 6. Re-rank

相似度不等於適用性。

需要同時評估：

- Relevance
- Recency
- Authority
- Scope Match
- Validation Status
- Confidence

## 7. Apply

將選中的記憶放入：

- Context
- Plan
- Tool Policy
- User Profile
- Shared State

## 8. Revalidate

舊記憶在新環境中仍可能不適用。

## 9. Update / Supersede / Forget

記憶應該能：

- 更新
- 合併
- 降低信心
- 被新版本取代
- 過期
- 刪除

![Figure 7-3 — Memory Write, Retrieve, Update, and Forget Loop](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-3-memory-lifecycle-loop.png)

> **Figure 7-3｜Memory Write, Retrieve, Update, and Forget Loop**  
> Memory 在寫入前先經過價值、來源、Scope、Consent 與衝突檢查；檢索後還要 Re-rank 與重新驗證，最後才能更新、取代或遺忘。

---

## Memory Retrieval：相似度不是唯一標準

向量相似度常被當成記憶檢索的核心。

但一筆語義相似的記憶，可能：

- 已過期
- 適用於另一個專案
- 尚未驗證
- 來自低信任來源
- 與當前政策衝突
- 涉及另一位使用者

因此，Memory Retrieval 最好使用混合分數：

```text
Final Score =
Semantic Relevance
+ Scope Match
+ Recency
+ Authority
+ Validation Status
+ User / Tenant Match
- Conflict Penalty
- Expiry Penalty
```

## Retrieval Filters

檢索前應先過濾：

- Tenant
- User
- Project
- Memory Type
- Permission
- Validation Status
- Expiry
- Effective Date

## Retrieval Budget

不要把所有相似記憶放進 Context。

可設定：

- Max Memories
- Max Tokens
- Per-type Limit
- Recency Window
- Minimum Confidence
- Diversity Constraint

---

## 記憶衝突：兩筆都像是真的，怎麼辦？

常見衝突：

```text
Memory A:
Use API v1 for billing

Memory B:
Use API v2 for billing
```

或：

```text
User Preference A:
Use concise responses

User Preference B:
Provide detailed explanations
```

系統不能只選 Embedding 分數高的那筆。

## 衝突類型

### Temporal Conflict

新舊版本不同。

### Scope Conflict

不同專案、地區、方案或使用者。

### Source Conflict

官方來源與第三方來源不一致。

### Procedural Conflict

兩條 SOP 對同一情境給出不同步驟。

### User Preference Conflict

不同時間的偏好互相矛盾。

## 衝突處理原則

1. 先檢查 Scope
2. 再比較 Effective Date
3. 比較 Source Authority
4. 比較 Validation Status
5. 檢查是否已被 Superseded
6. 無法解決時標記 Conflict
7. 高影響規則交給 Human Review

## 不要直接覆蓋舊記憶

更好的版本模式：

```text
Memory v1
Status: Superseded

Memory v2
Status: Active
Supersedes: v1
```

保留歷史，才能：

- Audit
- Rollback
- 理解行為變化
- 調查錯誤

![Figure 7-4 — Memory Conflict and Version Governance](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-4-memory-conflict-version-governance.png)

> **Figure 7-4｜Memory Conflict and Version Governance**  
> 新記憶寫入前先檢查 Scope、時間、來源與版本；衝突可被 Resolve、Supersede、Merge 或送交 Human Review，不能直接用新內容覆蓋舊內容。

---

## 單 Agent Memory 與 Shared Memory 架構

## 單 Agent

```text
User Request
  ↓
Agent Runtime
  ↕
Working Memory
  ↕
Long-term Memory
  ↓
Response
```

優點：

- 權限簡單
- 責任清楚
- 衝突較少

## Multi-Agent Shared Memory

```text
Research Agent
Analysis Agent
Writing Agent
Verifier Agent
       ↕
Shared Memory Layer
```

Shared Memory Layer 需要：

- Task-scoped Working Memory
- Verified Fact Store
- Shared Procedure Store
- User / Tenant Isolation
- Version Control
- Access Policy
- Audit Log

## Local Memory 和 Shared Memory 應分開

每個 Agent 可以保留自己的 Local Working Memory。

只有需要協作的內容才進 Shared Memory。

例如：

```text
Local:
Raw notes
Temporary hypotheses
Tool logs

Shared:
Verified facts
Structured results
Open questions
Accepted decisions
```

這能減少：

- 噪音
- 敏感資訊擴散
- 重複內容
- Context 膨脹

![Figure 7-5 — Single-Agent and Shared-Memory Architectures](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-5-single-agent-shared-memory-architectures.png)

> **Figure 7-5｜Single-Agent and Shared-Memory Architectures**  
> 單 Agent 可直接使用自己的 Working 與 Long-term Memory；Multi-Agent 則應區分 Local Memory 與 Shared Memory，只共享經過驗證、具有 Scope 與權限控制的資訊。

---

## 哪些東西不應該存進記憶？

## 1. 每一段原始對話

大部分內容不值得永久保存。

## 2. 未驗證推測

```text
The user probably prefers...
```

推測不應變成事實。

## 3. 暫時性錯誤

一次 Timeout 不代表永久程序規則。

## 4. 無來源事實

不知道從哪裡來，就難以更新與驗證。

## 5. 敏感資料

除非具備明確必要性、合法基礎、權限與安全控制。

## 6. 可以重新檢索的完整外部文件

保存引用與索引通常比複製整份內容更合理。

## 7. 已過期狀態

完成任務後的 Retry Count 通常不該成為長期記憶。

## 8. 無法撤銷的模型結論

所有高影響記憶都應該能查看、更新、撤回或被取代。

---

## 九種記憶與資訊層完整比較

| 類型 | 保存內容 | 典型生命週期 | 是否跨 Session | 主要用途 | 主要風險 |
|---|---|---|---:|---|---|
| Stateless | 不保存 | 單次 Request | 否 | 簡單任務、低風險 | 重複工作 |
| Context | 當前模型輸入 | 單次推理 | 否 | 讓模型現在可見 | 容量限制 |
| Working Memory | 中間結論、子目標 | 當前任務 | 可選 | 任務工作區 | 無限增長 |
| Short-term State | 流程進度、Retry | 工作流期間 | 可 | 控制流程 | 狀態不一致 |
| Episodic Memory | 過去事件與結果 | 中～長期 | 是 | 案例與經驗 | 過時、錯誤歸因 |
| Semantic Memory | 穩定事實與知識 | 長期 | 是 | 可重用知識 | 版本與來源問題 |
| Procedural Memory | SOP、規則、程序 | 長期 | 是 | 指導行為 | 規則衝突 |
| User Memory | 偏好與長期限制 | 由使用者控制 | 是 | 個人化 | 隱私與誤記 |
| Shared Memory | 多 Agent 共用資訊 | 任務或長期 | 可 | 協作 | 污染與權限 |
| External Knowledge Store | 文件、DB、Wiki | 由來源管理 | 是 | 按需檢索 | 權限、版本、召回 |

---

## Memory、RAG、Context、State 比較表

| 比較項目 | Context | State | Memory | RAG |
|---|---|---|---|---|
| 核心問題 | 模型現在看什麼？ | 流程走到哪裡？ | 系統保留什麼？ | 外部取回什麼？ |
| 主要內容 | Prompt、Query、Chunks | Node、Status、Retry | 事件、知識、規則、偏好 | 文件與資料片段 |
| 生命週期 | 一次呼叫或 Context Window | 工作流期間 | 任務內或跨 Session | 每次查詢 |
| 是否直接給模型 | 是 | 通常選擇性 | 經檢索後 | 是 |
| 是否需要來源 | 建議 | 不一定 | 長期記憶需要 | 必須 |
| 是否需要版本 | Context 本身較少 | 需要 | 需要 | 外部來源需要 |
| 主要風險 | Context Overload | 狀態錯亂 | 污染、過期、隱私 | 召回錯誤、來源過期 |

---

## 哪些資訊該存、保存多久、何時更新？

| 資訊 | 建議位置 | 保存時間 | 更新條件 | 遺忘條件 |
|---|---|---|---|---|
| 當前 User Query | Context | 單次呼叫 | 新 Query | 呼叫結束 |
| 中間研究結論 | Working Memory | 任務期間 | 新證據出現 | 任務完成或 TTL |
| Current State | State Store | 工作流期間 | 每次狀態轉移 | Workflow 結束 |
| 過去任務事件 | Episodic Memory | 依需求 | 新結果或更正 | 過期、低價值 |
| 已驗證產品事實 | Semantic Memory | 中長期 | 官方來源更新 | 被取代或失效 |
| SOP | Procedural Memory | 長期 | 流程或政策變更 | 被新版本取代 |
| 使用者偏好 | User Memory | 使用者控制 | 使用者明確修改 | 使用者刪除 |
| Worker 結果 | Shared Memory | 任務期間 | Worker 更新 | 任務結束或歸檔 |
| 外部文件 | Knowledge Store | 來源決定 | 文件版本更新 | 來源刪除或 Retention |

---

## Production Memory Architecture

一套成熟架構可以拆成以下元件。

## Context Builder

負責選擇：

- Current Query
- Required State
- Relevant Working Memory
- Relevant Long-term Memory
- Retrieved External Knowledge
- Applicable Procedures

## Memory Router

判斷內容應該寫入：

- Working
- Episodic
- Semantic
- Procedural
- User
- Shared
- None

## Memory Validator

檢查：

- Source
- Scope
- Consent
- Duplicate
- Conflict
- Sensitive Data
- Validation Status

## Memory Store

依類型使用不同 Storage。

不必把所有記憶塞進同一個 Vector Database。

## Retrieval Layer

支援：

- Metadata Filter
- Semantic Search
- SQL
- Graph Query
- Recency
- Authority
- Permission

## Governance Layer

控制：

- Version
- Expiry
- Supersede
- Delete
- Access
- Audit
- Retention
- Human Approval

## Observability

追蹤：

- Memory Write Rate
- Retrieval Hit Rate
- Useful Memory Rate
- Stale Memory Rate
- Conflict Rate
- False-memory Incidents
- Token Cost
- Privacy Deletion Success

---

## Memory 的常見反模式

## 反模式一：保存所有對話

資料量快速增長，真正重要內容更難找到。

## 反模式二：向量資料庫就是 Long-term Memory

只有相似度，沒有 Scope、版本、權限與更新治理。

## 反模式三：未驗證內容直接寫入

Agent 的猜測成為永久事實。

## 反模式四：舊記憶直接覆蓋

無法 Audit、Rollback 或理解變更。

## 反模式五：不同使用者記憶混用

User 或 Tenant 隔離失敗。

## 反模式六：沒有遺忘機制

過時規則持續影響未來任務。

## 反模式七：把 RAG 文件複製成 Memory

來源版本與 Context 遺失。

## 反模式八：把 State 當自然語言摘要

Retry Count、Current Node 等欄位失去精確性。

## 反模式九：Shared Memory 所有人都能改

已驗證資訊被任意覆蓋。

## 反模式十：檢索到就直接相信

沒有 Scope、Recency 和 Validation Check。

---

## 一個完整範例：職缺評分 Agent 的記憶設計

任務：

> 根據完整 JD 評估職缺是否值得投遞。

## Context

本次模型呼叫可見：

- 使用者 CV 摘要
- 當前 JD
- 評分 Rubric
- Relevant Procedures

## State

```text
Current Row:
253

JD Status:
Complete

Scoring Status:
In Progress

Retry Count:
0
```

## Working Memory

```text
Required skills found:
- Product Strategy
- AI / ML
- Stakeholder Management

Open question:
Visa sponsorship unclear
```

## Episodic Memory

```text
Previous event:
A LinkedIn page returned partial content.

Successful fallback:
Used the public job API.
```

## Semantic Memory

```text
Scoring threshold:
Apply only when total score ≥ 80
```

這筆資訊必須有來源與版本。

## Procedural Memory

```text
If the stored JD is empty:
Fetch the source URL.

If complete text remains unavailable:
Mark Pending.

Never score from the title alone.
```

## User Memory

```text
Preferred output:
Traditional Chinese

Application threshold:
80
```

前提是使用者明確要求保存。

## Shared Memory

多個 Worker 共用：

- JD Completeness
- Extracted Requirements
- Visa Evidence
- Final Score
- Validation Status

## External Knowledge Store

- Original Job Page
- Company Career Site
- Public Job API
- Uploaded CV
- Scoring Standard

這個案例裡，真正可靠的系統不是「把所有內容記住」。

而是讓每一類資訊放進正確位置，並有明確的：

- Scope
- Source
- Lifetime
- Permission
- Update Rule

---

## Production Memory Checklist

## 邊界

- 是否清楚區分 Context、State、Memory 與 RAG？
- 是否區分 Working 與 Long-term Memory？
- 是否區分 Local 與 Shared Memory？
- 是否知道 Source of Truth 在哪裡？

## 寫入

- 是否先判斷內容值得保存？
- 是否有來源與 Scope？
- 是否經過驗證？
- 是否處理敏感資料與 Consent？
- 是否偵測重複與衝突？

## 檢索

- 是否先做 User、Tenant、Project Filter？
- 是否考慮 Recency、Authority 與 Validation？
- 是否限制檢索數量與 Token？
- 是否重新檢查新情境適用性？

## 更新與遺忘

- 是否有 Version？
- 是否支援 Supersede？
- 是否有 Expiry？
- 是否能刪除與撤回？
- 是否保存 Audit History？

## Shared Memory

- 誰可以 Propose？
- 誰可以 Validate？
- 誰可以 Approve？
- 誰可以 Supersede？
- 是否防止未驗證資訊擴散？

## 觀測

- 是否追蹤錯誤記憶事件？
- 是否知道哪些記憶真的被使用？
- 是否知道檢索後是否改善結果？
- 是否能完成使用者刪除要求？

---

## 本篇結論

Agent Memory 不只是保存對話，也不等於接上一個 Vector Database。

不同類型解決不同問題：

- **Stateless**：每次重新開始
- **Working Memory**：保存當前任務的中間資訊
- **Short-term State**：保存工作流進度
- **Episodic Memory**：記錄過去發生的事件
- **Semantic Memory**：保存已驗證的長期知識
- **Procedural Memory**：保存做事規則
- **User Memory**：保存使用者明確授權的偏好與限制
- **Shared Memory**：讓多個 Agent 共用任務資訊
- **External Knowledge Store**：保存由外部來源管理的知識

成熟的 Memory System 必須能回答：

```text
為什麼要記？
誰寫入？
來源是什麼？
適用範圍在哪裡？
保存多久？
衝突時相信誰？
什麼時候更新？
什麼時候遺忘？
```

真正有用的記憶，是在正確時間、取回正確範圍與版本、且具有足夠信任的記憶。

> **在正確時間，取回正確範圍、正確版本、具有足夠信任的資訊。**

下一篇會把前七篇的所有積木組裝起來。

Part 8 將實際拆解：

- Production RAG
- Deep Research Agent
- Coding Agent
- Browser / Computer-use Agent
- 高風險企業自動化
- 長期監控型 Agent

並說明 Router、Planner、DAG、State Machine、Verifier、Memory、Policy、Budget 與 Human Approval 如何組成一套真正可運作的 Production Architecture。
