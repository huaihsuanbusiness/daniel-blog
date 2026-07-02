---
title: "Agent 設計模式圖鑑 Part 5｜驗證、恢復與自我修正"
description: "從 Retry、參數修復、Fallback、Self-Refine、Critic、Verifier、Generate-and-Test、Replanning、Reflexion、Human Review 到 Idempotency，完整拆解不會無限循環的 Production Agent 恢復架構。"
date: 2026-06-24T01:00:00
lang: zh
categories: ["AI"]
series: "Agent 設計模式圖鑑"
seriesOrder: 5
---

想像一個 Coding Agent 接到任務：

> 修復登入 API 的整合測試。

它修改程式碼後回覆：

> 已修復。我重新檢查過，現在應該可以正常運作。

這句話不是證據。

Agent 可能沒有：

- 執行原本失敗的 Test
- 執行相關 Test Suite
- 檢查 Build
- 確認 Test 沒有被弱化或刪除
- 檢查無關檔案是否被修改
- 對照原始 Acceptance Criteria

它可能只是重新閱讀自己的輸出，再做一次主觀判斷。

這是 Agent 系統最危險的假綠燈之一：

> 模型說自己驗證過，不等於系統產生了可驗證的證據。

Generation、Diagnosis、Acceptance、Recovery 與 Learning 是不同責任。

任務失敗後，系統必須判斷：

- 錯誤是否暫時性
- 相同操作是否能安全重做
- 同一 Step 是否可以修復
- 是否應切換實作方法
- 剩餘 Plan 是否已失效
- 是否需要人員授權
- 是否應該停止
- 失敗經驗是否值得影響未來嘗試

這一篇會建立一套 Production Model，在不製造無限修復 Loop 的情況下回答這些問題。

## 五個必須分開的責任

可靠的 Recovery Architecture 應拆成五個 Concern。

### Detection

什麼可觀測 Signal 表示系統出錯？

例如：

- Schema Failure
- Non-zero Exit Code
- Failed Test
- Missing Citation
- Stale Data
- Policy Rejection
- Unresolved Requirement
- User Rejection

### Diagnosis

失敗原因是什麼，影響範圍多大？

例如：

- Transient Infrastructure Fault
- Invalid Parameter
- Weak Output
- Wrong Data Source
- Incorrect Plan
- Insufficient Permission
- Unsupported Task

### Acceptance

Result 是否滿足明確 Contract？

Acceptance 應由 Verifier、Rule Engine、Test System、Policy Gate 或有權限的人員決定，而不是由產生 Result 的 Generator 自己決定。

### Recovery

最小且合理的修改是什麼？

- Retry
- 修改 Parameter
- 使用 Fallback
- Repair Artefact
- Replan
- Escalate
- Stop

### Learning

經過驗證的 Failure Analysis 是否應影響未來嘗試？

它可以是短期 Reflection、Episodic Memory，或經過獨立治理後升級成 Long-term Lesson。

把這些責任拆開，可以避免同一個模型自己出題、自己作答、自己改標準，再自己發滿分證書。

## Verification 必須從 Acceptance Contract 開始

「夠好」沒有被定義時，Verifier 不可能可靠。

Contract 可以包含：

- Required Field
- Output Schema
- Fact Source Requirement
- Policy Constraint
- Expected Side Effect
- Executable Test
- Latency 或 Cost Limit
- Prohibited Change
- Terminal Outcome
- Human Approval Requirement

Coding Task 的例子：

```text
Acceptance Contract:
- Target Test 通過
- 相關 Authentication Tests 通過
- Full Relevant Suite 通過
- Lint 通過
- Build 成功
- Protected Tests 未被修改
- 無關檔案未被修改
```

Research Task 的例子：

```text
Acceptance Contract:
- 每個重要 Claim 都有允許的 Source
- 每個 Comparison Field 都有資料或明確標為 unavailable
- 記錄 Publication Date 與 Product Version
- 揭露互相衝突的 Evidence
- 不把 Unsupported Estimate 寫成 Fact
```

Verification Method 必須對應要驗證的 Claim。

| 問題 | 強訊號 |
|---|---|
| Format 是否有效？ | Schema 或 Parser |
| Program 是否正確運作？ | Test 或 Execution |
| Database Action 是否被允許？ | Policy 與 Permission Check |
| Factual Claim 是否有支持？ | Source 與 Citation Verification |
| Output 是否完整？ | Contract-based Verifier |
| Business Decision 是否可接受？ | 有權限的人員判斷 |
| Action 是否能安全重做？ | Idempotency 與 Reconciliation |

不存在通用的 Verification Ladder。檢查 JSON 時，人類不會自動勝過 Schema；檢查 Code 時，Model Critic 也不會自動勝過 Compiler。

<!-- Figure 5-1 insertion point -->

![Figure 5-1 — Match the Verification Signal to the Claim](/images/the-atlas-of-agent-design-patterns-part-5/verification-reliability-ladder.png)

> **Figure 5-1｜Match the Verification Signal to the Claim**  
> 不同問題需要不同證據。結構、執行、語意、政策各由合適的工具負責；不存在一套通用 Ladder 能取代所有驗證。

## Self-review 有用，但不是獨立 Verification

Self-review 可能發現：

- 缺少 Section
- Terminology 不一致
- Structure 不順
- 明顯 Contradiction
- Formatting 問題
- 違反提供的 Rubric

但以下情況通常較弱：

- 缺少知識
- 共享錯誤 Premise
- Source 不存在
- Artefact 從未執行
- Environment Model 錯誤
- Acceptance Standard 模糊

同一 Model、Context 與 Assumption 可能重現同一錯誤。

不同 Task 上，自我批評研究結果並不完全一致。Self-Refine 顯示 Iterative Self-feedback 能改善多種輸出；但其他 Planning 研究發現，Model-based Self-verification 可能產生 False Positive，並明顯不如 Sound External Verifier。

因此 Production Rule 是：

> 使用 Self-review 改善 Candidate；只要存在更強的 Observable Evidence，就不要把它當成 Proof。

## Recovery 前必須先分類 Failure

把所有 Failure 都丟回同一個 Retry Loop，是架構錯誤。

可使用以下 Taxonomy：

| Failure Class | 常見 Signal |
|---|---|
| Transient | Timeout、429、502、Temporary Lock |
| Ambiguous Side Effect | Write Request 後回應遺失 |
| Invalid Input | Missing Field、Malformed Request |
| Parameter Mismatch | Query 太廣、Batch 太大 |
| Method Failure | Primary API 或 Model 不可用 |
| Artefact Failure | Test、Build、Parser 或 Execution 失敗 |
| Evidence Failure | Unsupported 或 Stale Claim |
| Quality Failure | 不完整、不清楚、矛盾 |
| Plan Failure | Assumption、Dependency 或 Goal Interpretation 錯誤 |
| Policy Failure | Action 被拒絕或需要 Approval |
| Unsupported | Data、Capability 或 Authority 不存在 |

Classification 應保存：

- Failure Code
- Evidence
- Retryability
- Side-effect Status
- Affected Scope
- Recommended Next Action
- Confidence
- 無合理 Recovery 時的 Terminal Status

## Retry：只有同一 Action 稍後可能成功時才重做

Retry 代表：

```text
Same Step
+ Same Method
+ Same Parameters
```

適合：

- Temporary Service Unavailability
- Connection Reset
- Rate Limit
- Short-lived Lock
- Retryable Server Fault

Production Retry Policy 需要：

- Retryable 與 Non-retryable Error Class
- Maximum Attempts
- Timeout
- Exponential 或 Bounded Backoff
- Jitter
- Cancellation
- Trace 與 Metrics
- Terminal Outcome

例如：

```text
Attempt 1 -> 503
Wait with Jitter

Attempt 2 -> 503
Wait Longer

Attempt 3 -> 503
Stop Retry
Route to Fallback or Failure
```

### Side Effect 周圍的 Retry 很危險

假設 Payment Request Timeout，付款可能已成功，只是 Response 遺失。

盲目重送可能造成 Double Charge。

安全選項包括：

- 使用 Idempotency Key
- 查詢 Operation Status
- 依 Request Identifier Reconcile
- 使用 At-most-once Workflow Step
- 結果不可判斷時交由 Manual Resolution

Idempotency 代表重複傳送同一意圖，不會產生額外 Side Effect。它是 System Contract，不是 Prompt Instruction。

### 不要 Retry Permanent Failure

例如：

- Invalid Credential
- Policy Denial
- Unsupported Operation
- Missing Required Data
- 相同 Input 必然產生的 Failure
- Permission Denied
- Validation Error
- 已確認 Side Effect 完成但 Acknowledgement 遺失

## Parameter Repair：保留 Step，修改有依據的 Input

Parameter Repair 改變執行細節，但 Objective 與主要 Method 不變。

例如：

```text
Search Query 太窄
 -> 加入允許的 Synonym

Batch 太大
 -> 降低 Batch Size

Parser Input Malformed
 -> 修復 Input 後重新執行相同 Parser
```

有時也稱為 Parameterized Retry，但關鍵是它並非同一個 Request。

每次修改都應保存：

- Previous Input
- Changed Parameter
- Failure Signal
- Hypothesis
- Expected Improvement
- Result
- Tried Combination

隨機修改 Prompt、Timeout 與 Temperature，只會形成 Parameter Carousel，不是 Recovery Policy。

## Fallback：用另一個 Implementation 滿足相同 Contract

Fallback 改變 Method、Service、Model、Tool 或 Source，同時嘗試滿足同一 Step Contract。

```text
Primary Method
 -> Unavailable
Fallback Method
 -> Verify Capability and Result
```

例如：

- Official API 改用 Official Documentation
- Primary Model 改用 Approved Backup Model
- Live Source 改用有標記的 Cached Data
- Automatic Extraction 改為 Human Review
- Unavailable Tool 改為 Deterministic Alternative

### Fallback 不一定等價

Backup 可能在以下方面不同：

- Freshness
- Capability
- Context Limit
- Permission
- Security Control
- Latency
- Price
- Output Quality
- Supported Field

Fallback Output 應攜帶：

- Fallback Path
- Capability Difference
- Data Timestamp
- Missing Field
- Confidence
- Quality-degradation Flag
- Follow-up Requirement

Fallback 必須通過相同 Safety 與 Acceptance Check，不能繞過 Primary Path 的 Policy。

## Recovery Scope：Retry、Repair、Fallback、Replan 或 Stop

這些 Mechanism 改變的範圍不同。

| Mechanism | 修改內容 |
|---|---|
| Retry | 除了時間外不變 |
| Parameter Repair | Input 或 Execution Parameter |
| Fallback | Current Step 的 Implementation |
| Artefact Repair | Current Output 或 Executable Artefact |
| Replan | Remaining Step、Dependency 或 Assumption |
| Stop | 不存在合理 Recovery Path |
| Escalate | Authority 轉移給另一個 Actor |

實務 Routing：

```text
Failure 是否 Transient 且能安全重做？
 -> Retry

有依據的 Parameter Change 能否完成相同 Step？
 -> Parameter Repair

Approved Alternative 能否滿足相同 Contract？
 -> Fallback

Artefact 錯誤，但 Objective 與 Route 仍正確？
 -> Repair

Premise、Dependency 或 Goal Interpretation 失效？
 -> Replan

Required Data、Capability 或 Permission 不存在？
 -> Stop、Partial、Pending、Unsupported 或 Human Action
```

這不是固定升級階梯。Policy Failure 不應先做三次 Retry 才進 Approval；Missing Data 也不應進入無限 Cosmetic Revision。

<!-- Figure 5-4 insertion point -->

![Figure 5-4 — Failure Classification and Recovery Routing](/images/the-atlas-of-agent-design-patterns-part-5/retry-fallback-replan-routing.png)

> **Figure 5-4｜Failure Classification and Recovery Routing**  
> 失敗要先分類再動作。Transient 走 Retry、Side Effect 走 Idempotency Check、Method 走 Fallback、Premise 走 Replan、Unsupported 直接 Stop。每條路徑都有自己的 Loop Limit 與 Terminal State。

## Self-Refine：以 Iterative Feedback 改善 Current Output

Self-Refine 使用 Iterative Loop，讓 LLM 先產生 Output，再對 Output 產生 Feedback，最後根據 Feedback Refine。原始方法可以由同一 Model 同時負責 Generator、Feedback Provider 與 Refiner。

```text
Generate
 -> Produce Feedback
 -> Refine
 -> Repeat within Limit
```

### 適合情境

- Structure
- Clarity
- Style
- Rubric-based Completeness
- Formatting
- 明顯 Contradiction
- Missing Requested Section

### 限制

Self-Refine 無法保證：

- Fact 為真
- Code 可執行
- Source 存在
- Policy 允許 Action
- Environment State 已改變
- Plan 可行

它也可能：

- 移除正確細節
- 新增 Claim
- 偏離 User Request
- 對未解決問題使用更有信心的語氣

### Production Contract

Feedback 應結構化：

```text
Issues Found
Evidence for Each Issue
Required Change
Protected Content That Must Not Change
Unresolved Issues
Revised Output
```

並設定：

- Review Scope
- Rubric
- Maximum Rounds
- No-improvement Rule
- Protected Verified Content
- Revision 後的 Verifier

Self-Refine 是 Editing 與 Candidate Improvement Method，不是 External Fact Checker。

## Critic：診斷並提出 Repair Direction

Critic 檢查 Candidate，產生可執行 Diagnosis。

```text
Generator
 -> Candidate
 -> Critic
 -> Findings
 -> Generator Repairs
```

好的 Critic Output：

```text
Issue:
Recommendation 缺少官方 Evidence

Severity:
High

Evidence:
只引用第三方摘要

Required Repair:
取得 Approved Source，否則標為 Unverified

Scope:
Only Claims 2 and 4
```

Critic 不一定負責最終 Acceptance Decision。

### Critic 與 CRITIC

「Critic」是通用 Role；CRITIC 是特定 Research Framework，它使用 External Tool 評估 Output 的某些面向，再根據 Tool Feedback 修改 Output。

Tool-interactive Critique 比純 Introspection 更強，因為它可以使用 Search、Execution 或其他 Observable Signal。

### Critic 風險

- Wrong Critique
- 把 Style Preference 當成 Error
- Endless Improvement
- 與 Generator 共享 Bias
- Feedback 不可執行
- Repair 傷害 Verified Content

Control 包括：

- Defined Scope
- Explicit Rubric
- Severity
- Evidence
- Required Action
- Protected Section
- Review-round Limit
- Separate Verifier

## Verifier：根據 Specification 做 Acceptance Decision

Verifier 回答：

> 這個 Candidate 是否滿足 Acceptance Contract？

```text
Candidate
 -> Checks
 -> PASS / FAIL / REVIEW / INCONCLUSIVE
```

有效 Verifier Report：

```text
Status: FAIL

Failed Checks:
- Claim 3 沒有 Approved Source
- Required Field risk_level 缺失
- Target Test Failed

Evidence:
- Citation Map 沒有 Claim 3 Source
- Schema Validator 回傳 Missing Property
- Test Exit Code 為 1

Next Action:
只修復 Failed Check，保留 Verified Section
```

### Deterministic Verifier

適合：

- Schema
- Field
- Syntax
- Calculation
- Permission
- Policy
- Compilation
- Test
- Explicit Invariant

### Evidence Verifier

適合：

- Source Authority
- Claim-to-citation Support
- Version 與 Date
- Missing Evidence
- Conflicting Source

### Model-based Verifier

可用於：

- Semantic Completeness
- Faithfulness
- 是否回答 User Question
- Argument Quality
- Readability

需要：

- Explicit Rubric
- Calibration Set
- Stable Output Schema
- False-pass 與 False-fail Monitoring
- Abstention 或 `inconclusive`
- Periodic Re-evaluation

同一 Context 與 Assumption 下，Model Verifier 可能與 Generator 高度相關。

### Hybrid Verifier

合理順序：

```text
Hard Rules and Schema
 -> Executable Tests
 -> Evidence Verification
 -> Model-based Quality Judgement
 -> Authorised Human Decision When Necessary
```

Objective Failure 不應被有說服力的文字推翻。

<!-- Figure 5-2 insertion point -->

![Figure 5-2 — Generator, Critic, Verifier, and Recovery Controller](/images/the-atlas-of-agent-design-patterns-part-5/generator-critic-verifier.png)

> **Figure 5-2｜Generator, Critic, Verifier, and Recovery Controller**  
> 生產、診斷、驗收、修復路由是四種不同責任。把它們混在同一個 Prompt，會讓模型自己出題、自己作答、自己發滿分證書。

## Generator、Critic、Verifier 與 Recovery Controller

這些 Role 不應混成一個 Prompt。

### Generator

- 產生或 Repair Candidate
- 遵循 Current Step Contract
- 不負責自行認證完成

### Critic

- 診斷 Defect
- 提供 Severity 與 Evidence
- 提出 Repair Direction
- 不自動掌握 Acceptance Veto

### Verifier

- 執行 Acceptance Check
- 回傳 Pass、Fail、Review 或 Inconclusive
- 保存 Failure Evidence
- 不偷偷修改 Contract

### Recovery Controller

- 分類 Failure
- 選擇 Retry、Repair、Fallback、Replan、Escalate 或 Stop
- 執行 Budget 與 Loop Limit
- 保存 Repair History

拆分方式可以是不同 Model、Tool、Prompt、Context 或 Service。核心是 Responsibility 與 Observable Hand-off 必須分離。

## Generate-and-Test：執行 Artefact 並使用真實結果

當 Candidate 可執行或會產生可觀測 Effect 時，可使用 Generate-and-Test。

```text
Generate Artefact
 -> Run in Controlled Environment
 -> Collect Structured Result
 -> Pass?
 yes -> Run Broader Acceptance Suite
 no -> Repair within Bounds
```

例如：

- Code
- SQL
- API Request
- Shell Command
- Data Transformation
- Workflow Definition
- Constraint Solution
- Browser Action Sequence

### Coding Example

```text
Generate Patch
 -> Run Target Test
 -> Fail: Token Audience Mismatch
 -> Repair Configuration
 -> Rerun Target Test
 -> Pass
```

Target Test 通過還不是 Final Certificate。

繼續執行：

```text
Related Tests
 -> Full Relevant Suite
 -> Static Analysis
 -> Lint
 -> Build
 -> Security Checks
 -> Change-scope Review
```

### 保護 Acceptance Mechanism

Agent 可能利用 Weak Test：

- 刪除 Failing Test
- Skip Test
- 修改 Expected Value
- Special-case Fixture
- 破壞其他 Behaviour
- 繞過 Policy Gate

Control 包括：

- Protected Test File
- Immutable Acceptance Criteria
- Test-change Review
- Broader Regression Suite
- Diff Inspection
- Independent Test Runner
- Clean Environment
- Protected Branch 或 Sandbox
- Verifier Acceptance

### 結構化 Failure Signal

不要回傳完整 Terminal Transcript：

```json
{
 "command": "pytest tests/auth",
 "exit_code": 1,
 "passed": 18,
 "failed": 2,
 "failure_signatures": [
 "token audience mismatch",
 "expired fixture"
 ],
 "files_changed": [
 "src/auth/config.py"
 ]
}
```

Structured Signal 讓 Repair 更精確，也更容易偵測重複 Failure。

<!-- Figure 5-3 insertion point -->

![Figure 5-3 — Production Generate-and-Test Loop](/images/the-atlas-of-agent-design-patterns-part-5/generate-and-test-coding-loop.png)

> **Figure 5-3｜Production Generate-and-Test Loop**  
> Generator 產出 Candidate，Critic 給 Diagnosis，Repair 改寫後由 Verifier 對 Acceptance Contract 驗收。每一輪都要留下可觀測的 Evidence，並在 PASS、Max Attempts、Budget Exhausted 或 Controller 叫停時結束 Loop。

## Replanning：Route 錯誤時修改 Remaining Plan

如果 Current Artefact 錯誤，但 Objective 與 Overall Route 仍正確，應使用 Repair。

以下情況才適合 Replanning：

- Critical Assumption 失效
- Goal 被誤解
- Selected Data Source 無法回答問題
- Dependency 改變
- 多個 Downstream Step 失效
- Acceptance Contract 經授權後改變
- Remaining Budget 無法執行 Plan
- 重複 Local Repair 暴露 Structural Problem

Replan 應：

- 保存 Valid Completed Work
- 標記 Invalidated Step
- 記錄 Trigger
- 產生 Plan Diff
- 更新 Dependency
- 遵守 Replan Limit
- 通過 Plan Validation

Replanning 不能成為 Universal Escape Hatch。Data 不存在時，合理結果可以是：

- unavailable
- partial
- pending
- unsupported
- requires human action

## Reflexion：使用跨 Attempt 的 Verbal Feedback

Reflexion 是一個特定 Framework：Agent 根據 Task Feedback 產生 Verbal Reflection，把 Reflection 保存到 Episodic Memory Buffer，在後續 Trial 使用，不需要更新 Model Weight。

簡化的原始流程：

```text
Attempt
 -> Receive Feedback
 -> Verbal Reflection
 -> Store in Episodic Buffer
 -> Use in Later Attempt
```

它不等於自動建立永久的 Organisation Rule。

### Reflexion 與 Self-Refine

Self-Refine：

> 改善 Current Candidate。

Reflexion：

> 使用 Feedback 形成 Reflection，影響後續 Trial。

### Production Memory Promotion 是額外治理層

Production System 可以選擇把重複且已驗證的 Experience 轉成 Durable Lesson。這是 Episodic Reflection Loop 以外的 Extension。

Lesson Candidate 應包含：

- Situation
- Observed Failure
- Evidence
- Root-cause Hypothesis
- Successful Repair
- Applicability Condition
- Non-applicability Condition
- Confidence
- Source and Time
- Validation Status

升級到 Long-term Memory 前：

- 驗證 Failure Analysis
- 檢查 Lesson 是否能 Generalise
- 限制 Scope
- 解決 Conflict
- 指定 Owner 與 Expiry
- 高影響 Procedure 需要 Approval

Lifecycle：

```text
Reflection Candidate
 -> Evidence Review
 -> Repeated or Confirmed?
 no -> Keep Short-lived or Discard
 yes -> Approve Scoped Lesson
 -> Versioned Long-term Memory
 -> Revalidate on Retrieval
```

這可以避免一次 Accidental Failure 變成永久 Rule。

<!-- Figure 5-5 insertion point -->

![Figure 5-5 — Reflexion and Governed Lesson Promotion](/images/the-atlas-of-agent-design-patterns-part-5/reflexion-memory-loop.png)

> **Figure 5-5｜Reflexion and Governed Lesson Promotion**  
> Episodic Reflection 影響下次 Attempt；長期 Lesson 必須通過獨立治理與驗證才能升級。一次失敗不自動變成永久 Rule。

## Human Review：Authorisation 與 Judgement，不是通用 Verifier

有些 Decision 不應完全自動化：

- Payment
- Destructive Data Change
- Production Deployment
- External Publication
- Privilege Escalation
- Legal 或 Medical Judgement
- High-value Contract
- Policy Exception

Human Review 提供：

- Accountability
- Risk Acceptance
- Business Context
- Exception Handling
- Final Authorisation

Reviewer 需要看到：

- Proposed Action
- Evidence
- 已通過的 Check
- Unresolved Risk
- Impact
- Reversibility
- Diff 或 Preview
- Alternative
- Timeout Behaviour
- Actor Identity 與 Permission

Human Review 也會因 Fatigue、Blind Approval、Information Overload 或 Stale State 而失敗。

安全 Approval Step 需要：

- Expiry
- State Persistence
- Execution 前 Revalidation
- Separation of Duties
- No Self-approval
- Audit Trail
- Safe Resume

Human Review 是 Governed Decision Point，不是所有不確定性的垃圾桶。

## Bounded Recovery Controller

Recovery Controller 防止系統因為「還可以再改一次」而無限循環。

### 每種 Strategy 都有 Limit

範例：

| Loop | Example Maximum |
|---|---:|
| Transient Retry | 3 |
| Parameter Repair | 2 |
| Output Repair | 2 |
| Critic Revision | 2 |
| Generate-and-Test Repair | 4 |
| Replanning | 2 |

這些不是通用 Default。正確限制取決於 Cost、Risk 與 Expected Improvement。

### 可觀測 Progress

每一輪 Repair 應改善 Objective Signal：

- Failing Test 下降
- Missing Field 減少
- Evidence Coverage 提高
- Unresolved Issue 減少
- 新增 Valid Source
- Verifier Result 改善
- Policy Violation 減少

如果多輪得到相同 Failure Signature，Controller 應 Stop 或切換 Strategy。

### Duplicate Detection

記錄：

- Action Signature
- Input Hash
- Output Hash
- Error Signature
- Tool Parameter
- Plan Version
- Environment Version

換句話說的 Attempt，如果 Effective Input 與 Failure 相同，仍然是 Duplicate。

### Global Budget

限制：

- Model Call
- Tool Call
- Token
- Elapsed Time
- Monetary Cost
- State Transition
- Human Reminder

### Terminal Outcome

至少包含：

- completed
- failed
- partial
- pending
- unsupported
- cancelled
- requires human action
- inconclusive

安全停止是一個成功的 Control Decision，不代表 Architecture 失敗。

## Production Verification and Recovery Architecture

成熟架構可以是：

```text
Candidate
 -> Hard Validation
 -> External Test or Evidence Check
 -> Verifier
 -> Pass -> Accept
 -> Fail -> Classify Failure
 -> Review -> Human Decision
 -> Inconclusive -> Gather Evidence or Stop
```

Failure Routing：

```text
Transient -> Safe Retry
Parameter -> Parameter Repair
Method -> Fallback
Artefact -> Bounded Repair or Generate-and-Test
Evidence -> Retrieve Approved Evidence
Plan -> Replan
Policy -> Deny or Request Approval
Unsupported -> Terminal Stop
```

Cross-cutting Control：

- Acceptance Contract
- Idempotency
- State Persistence
- Repair History
- Duplicate Detection
- Budget
- Immutable Requirements
- Policy
- Audit Trace
- Human Approval

只有在 Failure Analysis 已驗證後，才考慮保存 Reflection 或升級 Durable Lesson。

## 完整範例：研究未公開 Pricing

Task：

> 比較三個產品的 Enterprise Pricing。

### First Candidate

Agent 根據第三方 Review Site 產生 Price Table。

### Evidence Verifier

```text
Status: FAIL

Failed Checks:
- 兩個 Price 缺少 Official Support
- 一個 Price 屬於舊 Product Version

Failure Class:
Evidence Failure
```

### Critic

```text
Required Repair:
使用 Official Pricing Page、Billing Documentation
或 Official Announcement。
未公開的 Enterprise Pricing 必須明確標示。
```

### Fallback

其中一個 Official Pricing Page 不可用。

系統依序嘗試：

```text
Official Documentation
 -> Official Product Announcement
 -> Labelled Unavailable
```

Fallback Result 包含 Source Date 與 Missing-field Status。

### Replan

該產品沒有公開 Enterprise Pricing。

Remaining Plan 修改為：

```text
保存 Verified Public Pricing
將 Enterprise Pricing 標為 Contact Sales
比較已公開 Contract Conditions
不得推測 Hidden Price
```

### Verifier

```text
Official-source Coverage: PASS
Unsupported Claims: 0
Missing Values Labelled: PASS
Version Dates Recorded: PASS
```

### Reflection

Short-lived Reflection：

```text
Enterprise Pricing 未公開時，
不得推測 Numerical Price。
使用 Official Source 並標示 Contact Sales。
```

只有經過重複驗證與 Governance Review，才應升級成 Durable Organisation Lesson。

## 如何選擇 Mechanism

| Situation | Primary Mechanism |
|---|---|
| Transient 且能安全重做 | Retry |
| Same Step 需要有依據的 Parameter Change | Parameter Repair |
| Primary Implementation 不可用 | Fallback |
| Current Text 需要 Bounded Revision | Self-Refine |
| Candidate 需要可執行 Diagnosis | Critic |
| Specification 需要 Acceptance Decision | Verifier |
| Artefact 可在 Controlled Environment 執行 | Generate-and-Test |
| Remaining Route 或 Premise 失效 | Replanning |
| Feedback 應影響 Later Trial | Reflexion |
| High-impact Action 需要 Authorisation | Human Review |
| Data 或 Capability 不存在 | Stop、Partial、Pending 或 Unsupported |

## 常見反模式

### 所有 Error 都 Retry

Permanent 與 Policy Failure 不會在第三次嘗試後變成 Transient。

### 沒有 Idempotency 就 Retry Write

Lost Response 變成 Duplicate Side Effect。

### Generator 自己認證完成

同一 Component 同時 Generate、Judge 與 Accept。

### Critic 沒有 Scope

每一次 Revision 都創造另一個可改善項目。

### Verifier 沒有 Contract

「看看是否正確」不是 Acceptance Test。

### Model Judgement 推翻 Failed Execution

有說服力的解釋不能把 Failed Test 變成 Pass。

### Weak Test 被當成 Ground Truth

Agent 修改 Test 或利用 Coverage 缺口。

### Local Defect 觸發 Replanning

一個 Schema Error 讓整份 Research Plan 被重建。

### 每次 Reflection 都成為 Permanent Memory

一次 Accident 變成 Global Rule。

### Human Review 缺少 Decision Context

Approver 只有兩個 Button，沒有 Evidence。

### 沒有 Terminal Failure

系統假設一定還有下一次。

## Production Checklist

### Verification

- Acceptance Contract 是否明確？
- Verifier 是否支援 Fail 與 Inconclusive？
- 是否優先使用 Deterministic 與 Environment Check？
- Evidence 是否保存？
- 是否監控 False Pass 與 False Fail？
- Requirement 是否受到保護，不能由 Agent 自行修改？

### Recovery

- Action 前是否先分類 Failure？
- Retry 是否只處理 Retryable 且 Safe Operation？
- 是否定義 Idempotency 與 Reconciliation？
- Retry、Repair、Fallback 與 Replan 是否分開？
- 每個 Loop 是否有 Limit？
- 是否偵測 No Improvement？
- Workflow 是否能以 Partial 或 Unsupported 結束？

### Reflexion 與 Memory

- Reflection 是否綁定 Observable Feedback？
- Original Episodic Reflection 是否與 Durable Lesson Promotion 分離？
- 是否保存 Scope、Evidence、Confidence、Version 與 Expiry？
- Lesson 是否可以 Revoke 或 Supersede？
- High-impact Lesson 是否經過 Review？

### Human Review

- Reviewer 是否能看到 Evidence 與 Impact？
- Workflow 是否 Durable Pause？
- Execution 前是否 Revalidate State？
- 是否保存 Approver Identity、Expiry 與 Audit？
- 需要 Separation of Duties 時是否禁止 Self-approval？

## 結論

Agent 願意多想幾次，不會自動帶來可靠性。

可靠性來自一套能夠：

- 定義 Success
- 偵測 Observable Failure
- 診斷 Affected Scope
- 選擇最小合理 Recovery
- 保護 Side Effect
- 驗證 Repaired Result
- 沒有合理 Recovery 時停止
- 只保存已驗證 Experience

的系統。

不同 Mechanism 解決不同問題：

- **Retry** 重做安全且暫時性失敗的 Operation。
- **Parameter Repair** 修改同一 Step 的合理 Input。
- **Fallback** 使用相同 Contract 的其他 Implementation。
- **Self-Refine** 透過 Feedback 改善 Current Candidate。
- **Critic** 診斷 Defect 並提出 Repair。
- **Verifier** 根據 Specification 接受或拒絕。
- **Generate-and-Test** 執行 Artefact 並觀測結果。
- **Replanning** 修改 Remaining Route。
- **Reflexion** 使用跨 Attempt 的 Verbal Feedback。
- **Memory Promotion** 治理 Verified Lesson 是否持久化。
- **Human Review** 提供 Judgement 與 Authorisation。
- **Stop** 在 Evidence、Capability、Permission 或 Budget 耗盡時給出正確結果。

Production Pattern 是：

```text
Explicit Contract
 + Observable Evidence
 + Failure Classification
 + Bounded Recovery
 + Independent Acceptance
 + Safe Terminal States
```

Part 6 將從 Verification 進入 Organisation：

> 工作應由一個 Agent 負責，還是拆給數個 Specialized Agent？

## 參考資料

- [Madaan et al., *Self-Refine: Iterative Refinement with Self-Feedback*](https://arxiv.org/abs/2303.17651)
- [Gou et al., *CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing*](https://arxiv.org/abs/2305.11738)
- [Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366)
- [Valmeekam et al., *Can Large Language Models Really Improve by Self-critiquing Their Own Plans?*](https://arxiv.org/abs/2310.08118)
- [AWS Builders' Library, *Timeouts, retries, and backoff with jitter*](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS Builders' Library, *Making retries safe with idempotent APIs*](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-apIs/)
- [AWS Well-Architected Framework, *Make mutating operations idempotent*](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html)

