---
title: "The Atlas of Agent Design Patterns Part 8 ｜ Production Agent Architectures in Practice: RAG, Deep Research, Coding and Browser Agents"
description: "Assembling Router, Pipeline, State Machine, DAG, Planner, ReAct, Verifier, Memory, Policy, Budget and Human Approval into working Production architectures for RAG, Deep Research, Coding, Browser use, enterprise automation, and long-term monitoring."
date: 2026-07-01T13:44:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 8
---

The previous seven articles split the Agent system into six dimensions:

1. Execution path
2. Decision and planning
3. Reasoning and exploration
4. Validation and correction
5. Agent organisation
6. State and memory

Each dimension carries its own patterns:

- Direct
- Pipeline
- Router
- State Machine
- DAG
- ReAct
- Plan-and-Execute
- Adaptive Planning
- Tree Search
- Verifier
- Generate-and-Test
- Supervisor–Worker
- Working Memory
- Procedural Memory

In a Production system, no one ships a single "ReAct" loop and calls it done.

A mature Agent is almost always a composition of several patterns:

```text
Router
  ↓
State Machine
  ↓
Planner
  ↓
DAG or ReAct Executor
  ↓
Verifier
  ↓
Memory Update
  ↓
Final Response or Human Approval
```

This article does not introduce new patterns one by one.

Instead, the goal is:

> **To assemble the building blocks from the first seven articles into a Production Agent that can execute, verify, recover, observe and stop.**

---

## A "looks like it works" Agent, and why it still cannot ship

Consider this request:

> Compare three suppliers, pull current pricing and features, update the procurement database, and email the finance lead.

A free-form Agent might:

1. Search the supplier sites
2. Extract prices
3. Compare features
4. Open the internal database
5. Update the procurement record
6. Draft an email
7. Send the email

The path looks complete. Before it goes live, at least the following are still undefined:

- Is the user authorised to update the procurement record?
- Do the prices come from an official source?
- Are different regions or plans being mixed?
- Can the database update be rolled back?
- Does the email require human approval before sending?
- After how many failures should a tool stop retrying?
- Which steps have already completed?
- Which actions actually executed?
- If only half the task ran, is it Failed or Partial?
- Should the task stop once the cost ceiling is crossed?
- How is duplicate sending of the same email prevented?

Production Agent work is not about doing more things.

Each step needs a clear entry, permission, state, budget, evidence, stop condition and ownership boundary.

---

## The seven layers a Production Agent needs

A mature architecture usually decomposes into seven layers.

### 1. Entry and Routing

Decides:

- Does this request even need an Agent?
- Can it be answered directly?
- Does it need RAG?
- Does it need SQL, a calculator, or a specialised workflow?
- Does it need human handling?

### 2. Orchestration

Owns:

- Workflow
- State Machine
- Planner
- DAG
- Event Trigger
- Queue
- Human Approval Gate

It decides how the task moves forward.

### 3. Execution

Does the actual work:

- LLM
- Retrieval
- Search
- Browser
- Code Tools
- Database
- API
- Computer-use

### 4. Validation and Recovery

Owns:

- Schema Check
- Verifier
- Citation Check
- External Test
- Retry
- Fallback
- Replanning
- Human Review

### 5. State and Memory

Owns:

- Current State
- Working Memory
- Plan Version
- Tool Results
- Procedural Memory
- User Preferences
- Shared Memory

### 6. Policy and Safety

Owns:

- Identity
- Permission
- Tool Allowlist
- Data Access
- Budget
- Risk Classification
- Approval
- Sandbox
- Secret Isolation

### 7. Observability and Operations

Owns:

- Trace
- Audit Log
- Metrics
- Cost
- Latency
- Failure Reason
- Replay
- Alerting
- Kill Switch

![Figure 8-1 — Production Agent Reference Architecture](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-1-production-agent-reference-architecture.png)

> **Figure 8-1 ｜ Production Agent Reference Architecture**  
> The request passes through Identity, Policy and Router, then chooses Direct, RAG or Agent Workflow. The Orchestrator manages Planner, State Machine and Executor; Verifier, Memory, Budget, Human Approval and Observability form the Production control plane.

---

## Start with a baseline: when does a single-turn answer suffice?

Before the six Production recipes, keep one baseline in mind:

```text
Input
  ↓
LLM
  ↓
Output
```

### Tasks that fit this baseline

- Translation
- Rewriting
- Summarisation
- Format conversion
- Answering from supplied content
- Low-risk text generation
- Simple classification

You can add:

- Input Validation
- Output Schema
- Content Policy
- Token Limit
- Basic Logging

You do not need:

- Planner
- Multi-Agent
- Long-term Memory
- Tree Search
- Browser
- State Machine

The first principle of Production design:

> **If Direct works, do not build an Agent theme park first.**

---

## Router: choosing between Direct, RAG and Agent

The same product usually runs several execution paths at once.

```text
                    ┌→ Direct
                    ├→ RAG
User Request → Router
                    ├→ SQL / Calculator
                    ├→ Agent Workflow
                    └→ Human Review
```

### What can the Router decide on?

- Intent
- Required data source
- User role
- Permission
- Risk
- Expected latency
- Cost budget
- Whether tools are needed
- Whether persistent state is needed
- Whether human approval is needed

### A practical routing logic

#### Direct

For:

- All required information is already in the input
- A single call completes the task
- No external tool is needed
- Risk is low

#### RAG

For:

- The question requires external documents
- The answer must carry a source
- No long-running autonomy is needed
- The task is mostly retrieval and answering

#### Agent Workflow

For:

- Multi-step tool operations
- Path depends on intermediate results
- State must be persisted
- Planning, retry or recovery is needed

#### Human Review

For:

- High risk
- Irreversible
- Insufficient permission
- Conflicting data
- Policy requires human approval

### The Router must also be allowed to say it does not know

At minimum:

- Unknown
- Ambiguous
- Unsupported
- Need Clarification

Do not force every request into some automated path.

---

## Recipe one: Production RAG

The simplest RAG is:

```text
Query
  ↓
Retrieve
  ↓
Generate
```

Production RAG has to handle:

- Does the query need rewriting?
- Which source should be queried?
- Which documents is the user allowed to read?
- Did retrieval return the right content?
- Is a chunk expired?
- Does the citation support the claim?
- When data is insufficient, answer, clarify, or refuse?
- How are cost and latency controlled?

### A typical Production RAG flow

```text
User Query
  ↓
Query Router / Profile
  ↓
Normalize or Rewrite
  ↓
Retrieve
  ↓
Metadata and ACL Filter
  ↓
Rerank
  ↓
Context Builder
  ↓
Generate
  ↓
Citation and Faithfulness Verifier
  ↓
Answer or Retry / Abstain
```

### Core components

#### Query Router

Decides:

- Whether retrieval is needed
- Which corpus to use
- Whether to query SQL
- Whether to use the fast or deep mode

#### Retrieval

May include:

- Vector Search
- Keyword Search
- Hybrid Search
- Metadata Filter
- Graph Query
- SQL

#### Reranker

Reorders "semantically similar" into "actually useful for the answer".

#### Context Builder

Handles:

- Chunk deduplication
- Token budget
- Source diversity
- Metadata
- Context ordering
- Citation IDs

#### Generator

May only produce answers from the permitted Context.

#### Citation Verifier

Checks:

- Does the claim have a source
- Does the citation actually support the claim
- Are wrong passages being quoted
- Are versions being mixed
- Are important limits being dropped

### Production RAG state

Even when RAG does not need high autonomy, it can still persist:

- Original query
- Rewritten query
- Retrieved document IDs
- Reranker scores
- Selected context
- Citation mapping
- Retry count
- Failure reason
- Query profile

### Production RAG failure policy

| Failure | Handling |
|---|---|
| No documents found | Clarify, fallback corpus, or abstain |
| Low retrieval confidence | Rewrite query or run deep retrieval |
| Citation mismatch | Regenerate or reject |
| Unauthorized document | Remove and audit |
| Stale source | Prefer the newer version |
| Conflicting sources | Surface the conflict or escalate to human review |

![Figure 8-2 — Production RAG Architecture](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-2-production-rag-architecture.png)

> **Figure 8-2 ｜ Production RAG Architecture**  
> The query passes through Router, Rewrite, Hybrid Retrieval, ACL Filter, Reranker and Context Builder. The Generator produces a citation-bearing answer; the Verifier checks faithfulness, coverage and source permissions.

### When does Production RAG not need an Agent?

If the flow stays fixed:

```text
Retrieve → Rerank → Generate → Verify
```

It remains a controllable pipeline at heart.

Agentic nodes only earn their place when:

- The data source must be chosen dynamically
- The decision to rewrite the query depends on the result
- Multi-round follow-up retrieval is needed
- Tool routing is required
- Clarification is complex
- Retrieval must adapt mid-flow

Using an LLM and retrieval does not automatically make a system an Agent.

---

## Recipe two: Deep Research Agent

A Deep Research task is rarely "answer one simple question".

It needs:

- Decompose the research question
- Pull from multiple sources
- Run research in parallel
- Handle conflicts
- Track evidence
- Close gaps
- Produce a long synthesis report

### A typical architecture

```text
Research Goal
  ↓
Planner
  ↓
Research Plan
  ↓
DAG of Research Tasks
  ├→ Worker A
  ├→ Worker B
  ├→ Worker C
  └→ Worker N
        ↓
Evidence Store
        ↓
Synthesis
        ↓
Verifier
        ↓
Complete or Replan
```

### What the Planner should produce

Not:

```text
1. Research
2. Analyze
3. Write
```

But:

- Research question
- Subquestion
- Allowed sources
- Expected evidence
- Completion criteria
- Dependency
- Budget
- Deadline
- Failure policy

### Why a DAG

Subquestions can run in parallel.

For example:

```text
Pricing
Features
Deployment
Security
Customer Evidence
```

They converge into Synthesis once complete.

A DAG does not handle loops on its own.

When the Verifier finds evidence gaps, an outer State Machine can:

```text
VERIFY
  ↓ Fail
REPLAN
  ↓
Run New Research DAG
```

### Evidence Store

Deep Research should not keep only the worker's paragraph summaries.

Each piece of Evidence should carry:

- Claim
- Source
- Source type
- Publication date
- Access date
- Quote or extract
- Scope
- Confidence
- Worker
- Validation status

### Source policy

Define priorities in advance:

- Official sources
- Primary research
- Regulatory sources
- Reputable secondary sources
- Disallowed sources
- Freshness window

### Stop conditions for Deep Research

- Required questions covered
- Minimum source diversity
- No critical evidence gap
- Citation coverage passed
- Budget reached
- No-improvement limit
- Human deadline

![Figure 8-3 — Deep Research Agent Architecture](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-3-deep-research-agent-architecture.png)

> **Figure 8-3 ｜ Deep Research Agent Architecture**  
> The Planner decomposes the research goal into tasks with source policy and completion criteria, dispatches them in parallel through a DAG to Research Workers, and the Evidence Store keeps traceable evidence. Synthesis and Verifier then decide whether to complete or replan.

### Common Deep Research failures

#### A lot of search, very little evidence

The Agent reads a great deal of content but never forms a verifiable claim.

#### Workers duplicating effort

Multiple Workers search the same question.

#### Sources being double-counted

Five articles all cite the same original report.

#### Synthesis mixing conflicting versions

Prices, products or policies drawn from different points in time.

#### No completion condition

The Agent can always find "one more source".

---

## Recipe three: Coding Agent

What matters in a Coding Agent is the ability, in an isolated environment, to understand the repository, change code, run tests, read failures, make bounded fixes, and produce reproducible evidence.

### A typical architecture

```text
Task
  ↓
Repository Snapshot
  ↓
Planner
  ↓
Code Search and Inspection
  ↓
Generate Patch
  ↓
Sandbox Execution
  ↓
Target Tests
  ↓
Related Tests
  ↓
Full Test Suite
  ↓
Lint and Build
  ↓
Change-scope Verifier
  ↓
Human Approval
  ↓
Merge or Deliver
```

### Repository Snapshot

Before any change, record:

- Branch
- Commit SHA
- Dirty state
- Dependency version
- Test environment
- Runtime version

This makes the result reproducible and tells you exactly what the Agent modified.

### Planner

Defines:

- Suspected area
- Files to inspect
- Tests to run
- Allowed changes
- Completion criteria
- Rollback point

### Code Search

Understand first:

- Call graph
- Existing tests
- Data flow
- Configuration
- Similar implementation
- Error logs

Do not guess a patch from the error message alone.

### Generate-and-Test

```text
Generate Patch
  ↓
Static Validation
  ↓
Run Target Test
  ↓
Fail?
  ├─ Yes → Inspect Failure → Revise
  └─ No → Broader Validation
```

### Acceptance cannot stop at the target test

At minimum, expect:

- Target test
- Related test suite
- Full relevant suite
- Lint
- Type check
- Format check
- Build
- Security scan
- Diff review
- Reproducibility check

### Guard against reward hacking

The Agent must not:

- Delete a test
- Skip a test
- Loosen an assertion
- Modify the expected result
- Hide an error
- Only run commands that are easy to pass
- Touch unrelated files

### Human Approval

The following actions should normally require approval:

- Merge
- Push
- Deploy
- Database migration
- Dependency major upgrade
- Secret or permission change
- Production configuration change

![Figure 8-4 — Production Coding Agent](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-4-production-coding-agent.png)

> **Figure 8-4 ｜ Production Coding Agent**  
> The Coding Agent first pins the Repository Snapshot, then runs Planner, Code Search, Patch, Sandbox, layered tests, Lint, Build and a change-scope Verifier. Only after verification and approval can it Merge or Deliver.

### Coding Agent terminal states

- Completed
- Failed
- Partial
- Blocked
- Needs human review
- Cannot reproduce
- Unsupported environment

Not every bug can be fixed automatically inside the budget.

---

## Recipe four: Browser / Computer-use Agent

A Browser Agent needs to operate in a real interface:

- Look at the page
- Understand the state
- Choose an action
- Click
- Type
- Scroll
- Wait
- Verify the result

Compared to pure tool calling, it sits closer to an interactive Agent in an uncertain environment.

### A typical loop

```text
Goal
  ↓
Observe Page
  ↓
Update Browser State
  ↓
Select Allowed Action
  ↓
Execute
  ↓
Observe New State
  ↓
Success?
  ├─ Yes → Complete
  └─ No → Recover or Continue
```

### Why a State Machine is needed

Browser operations frequently include:

- Login required
- CAPTCHA
- Modal open
- Form partially filled
- Waiting for page
- Download started
- Approval pending
- Error
- Completed

If only free-form ReAct is used, the Agent may:

- Click repeatedly
- Navigate back unintentionally
- Lose filled form data
- Not know whether a download finished
- Hit the same button more than once

A State Machine constrains the path:

```text
LOGIN
  ↓
SEARCH
  ↓
SELECT ITEM
  ↓
FILL FORM
  ↓
REVIEW
  ↓
SUBMIT
  ↓
VERIFY
```

### Browser State should carry

- Current URL
- Page title
- Active element
- Visible controls
- Form values
- Navigation history
- Download status
- Last action
- Last observation
- Screenshot or DOM reference
- Retry count

### Allowed Action policy

Allowed:

- Click
- Type
- Scroll
- Select
- Download
- Upload
- Navigate
- Wait

Marked as higher risk separately:

- Submit
- Purchase
- Send
- Delete
- Publish
- Change permission

### Success Verifier

Do not rely on the fact that the button was clicked.

Check:

- Confirmation message
- New record exists
- Expected URL
- Download file exists
- Form status
- Server response
- Transaction ID

### Recovery

Common recovery moves:

- Wait and retry
- Re-observe page
- Close modal
- Return to safe state
- Reload
- Re-authenticate
- Ask user
- Human takeover

![Figure 8-5 — Browser and Computer-use Agent](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-5-browser-computer-use-agent.png)

> **Figure 8-5 ｜ Browser and Computer-use Agent**  
> The Browser Agent operates the interface through Observe, State Update, Policy Check, Action, New Observation and Success Verification. State Machine, duplicate-action detection, human takeover and the irreversible-action gate keep it from running away.

### Common Browser Agent risks

- UI redesigns
- Element recognition errors
- Session expiry
- Duplicate submission
- Hidden modals
- Network latency
- Incomplete downloads
- Content updated by other users
- Irreversible actions
- Sensitive data leakage

---

## Recipe five: High-risk enterprise automation

Enterprise automation should not start from:

```text
User Request
  ↓
Agent
  ↓
Execute
```

High-risk flows need:

- Identity
- Permission
- Policy
- Deterministic validation
- Risk classification
- Human approval
- Transaction control
- Post-condition verification
- Audit log
- Rollback

### A typical flow

```text
Request or Event
  ↓
Authenticate Identity
  ↓
Authorize Action
  ↓
Agent Prepares Proposal
  ↓
Deterministic Validation
  ↓
Risk Classification
  ↓
Approval Required?
  ├─ Yes → Human Review
  └─ No → Execute
              ↓
         Verify Post-condition
              ↓
         Audit and Complete
```

### The Agent prepares a proposal, not the execution

A payment example:

```text
Payee
Amount
Currency
Reason
Source Invoice
Account
Risk Flags
Expected Effect
Rollback Possibility
```

The Agent can compile the information and a recommendation.

Before any real action, hand off to:

- Policy engine
- Permission check
- Approval
- Transaction layer

### Deterministic validation

Can check:

- Required fields
- Amount limit
- Duplicate invoice
- Account status
- Vendor allowlist
- Currency
- Approval threshold
- Segregation of duties
- Compliance rule

### Human approval

Approvers must see:

- Proposed action
- Evidence
- Risk
- Policy results
- Expected impact
- Reversibility
- Difference from existing state

### Post-execution verification

An API returning 200 does not mean the work is done.

Confirm:

- Transaction ID
- Database state
- Ledger entry
- Target record
- Notification status
- Side effects
- Idempotency key

### Rollback and compensation

Some operations cannot be truly rolled back.

Compensation is then needed:

- Reverse transaction
- Cancel request
- Restore previous record
- Notify owner
- Open incident

![Figure 8-6 — High-Risk Enterprise Automation](/images/the-atlas-of-agent-design-patterns-part-8/figure-8-6-high-risk-enterprise-automation.png)

> **Figure 8-6 ｜ High-Risk Enterprise Automation**  
> The request goes through Identity, Authorization, Agent Proposal, Deterministic Validation and Risk Classification. High-risk or irreversible actions require Human Approval, followed by Post-condition Verification, Audit and Rollback or Compensation.

---

## Recipe six: Long-term monitoring Agent

A long-term monitoring Agent is not always "thinking".

It is closer to:

- A scheduled workflow
- An event-driven system
- A condition watcher
- A stateful monitor

Common tasks:

- Price monitoring
- System health monitoring
- Contract expiry monitoring
- News monitoring
- Data quality monitoring
- Job listing monitoring
- Security event monitoring
- Supply chain risk monitoring

### A typical flow

```text
Schedule or Event
  ↓
Load Previous State
  ↓
Collect Current Data
  ↓
Normalize
  ↓
Compare with Baseline
  ↓
Condition Met?
  ├─ No → Update State and Sleep
  └─ Yes → Verify
              ↓
           Deduplicate
              ↓
           Notify or Escalate
```

### Core components

#### Scheduler / Trigger

- Cron
- Queue
- Webhook
- Event stream
- Condition watch

#### Baseline state

Persisted:

- Last checked at
- Last value
- Last alert
- Known events
- Cooldown
- Cursor
- Source version

#### Change detection

Beyond "is there new data", the system has to decide:

- Whether it is meaningful
- Whether it crosses a threshold
- Whether it is only a format change
- Whether it has already been notified
- Whether it is an update of an earlier event

#### Deduplication

Needs:

- Event ID
- Content hash
- Source
- Time window
- Alert key

#### Notification policy

- Severity
- Recipient
- Channel
- Quiet hours
- Cooldown
- Escalation
- Acknowledgement

#### No-change behaviour

When the condition is not met:

```text
Do not notify
```

A long-term monitoring system should not email "nothing happened today" as digital air.

### Long-term monitoring risks

- Duplicate notifications
- Source failure
- Baseline drift
- Silent failure
- Scheduler interruption
- False positives
- False negatives
- Alert fatigue
- State expiry
- Unbounded history accumulation

### Required controls

- Health check
- Last-success timestamp
- Missed-run detection
- Retry limit
- Dead-letter queue
- Alert deduplication
- Cooldown
- State retention
- Human escalation
- Kill switch

---

## The six Production Agent recipes at a glance

The six recipes below exclude the Direct baseline.

| Recipe | Main task | Core patterns | Required verification | Required state / memory |
|---|---|---|---|---|
| Production RAG | Document QA | Router, Pipeline, Rerank | Citation, faithfulness, ACL | Query state, source mapping |
| Deep Research | Multi-source research | Planner, DAG, Verifier, Replan | Source coverage, conflict check | Plan, evidence store |
| Coding Agent | Modify executable artefacts | State Machine, Generate-and-Test | Tests, lint, build, diff | Repo snapshot, attempt state |
| Browser Agent | Operate UI | ReAct, State Machine, Policy | Page state, post-condition | Navigation state, action history |
| High-risk Automation | Run enterprise operations | Policy, Human Approval, Transaction | Deterministic rules, post-condition | Approval state, audit log |
| Long-term Monitor | Continuously watch conditions | Event-driven, Stateful workflow | Change verification, deduplication | Baseline, cursor, alert history |

---

## Which patterns does each recipe use?

| Pattern | RAG | Deep Research | Coding | Browser | High-risk | Monitoring |
|---|---:|---:|---:|---:|---:|---:|
| Router | High | Medium | Low | Low | Medium | Medium |
| Pipeline | High | Medium | Medium | Low | High | High |
| State Machine | Medium | High | High | High | High | High |
| DAG | Low | High | Medium | Low | Low | Medium |
| ReAct | Low–Medium | Medium | Medium | High | Low | Low |
| Planner | Low | High | High | Medium | Low–Medium | Low |
| Verifier | High | High | High | High | High | High |
| Generate-and-Test | Low | Low | Core | Low | Low | Low |
| Human Approval | Depends on data | Depends on risk | Merge / Deploy | Irreversible actions | Core | High-risk notifications |
| Working Memory | Medium | High | High | High | Medium | Low |
| Long-term Memory | Low–Medium | Medium | Procedural | Procedural | Rules-based | Baseline / history |

---

## Cost, latency, controllability and fit

| Architecture | Cost | Latency | Controllability | Observability | Failure recovery | Best fit |
|---|---:|---:|---:|---:|---:|---|
| Direct Baseline | Low | Low | High | High | Simple | One-off text tasks |
| Production RAG | Medium | Low–Medium | High | High | Medium–High | Source-backed document QA |
| Deep Research | High | High | Medium–High | Medium–High | High | Long-form multi-source research |
| Coding Agent | High | High | High | High | High | Testable coding tasks |
| Browser Agent | High | Medium–High | Medium | High | Medium–High | Dynamic UI operations |
| High-risk Automation | Medium–High | Medium–High | Very high | Very high | High | Irreversible enterprise actions |
| Long-term Monitor | Continuous | Async | High | Very high | High | Condition monitoring and alerting |

---

## Shared control one: Budget

An Agent's budget is not only tokens.

It can include:

- Model calls
- Tool calls
- Search queries
- Browser actions
- Test runs
- Worker count
- Wall time
- Monetary cost
- Replans
- Retries

### Layered budget

```text
Global Task Budget
├── Planner Budget
├── Retrieval Budget
├── Worker Budget
├── Tool Budget
└── Verification Budget
```

If only tokens are capped, the Agent can still burn cost through tools.

---

## Shared control two: Timeout

Different layers need different timeouts:

- Model call timeout
- Tool timeout
- Worker timeout
- State timeout
- Approval timeout
- Workflow timeout
- Monitoring source timeout

Behaviour after timeout must be explicit:

- Retry
- Fallback
- Reassign
- Partial
- Human review
- Fail

---

## Shared control three: Retry and Fallback

Not every failure should be retried.

| Failure | Strategy |
|---|---|
| Temporary network error | Retry |
| Query parameter issue | Parameterized retry |
| Primary service unavailable | Fallback |
| Output schema failure | Repair |
| Plan assumption failed | Replan |
| High-risk ambiguity | Human review |
| Unsupported task | Stop |

---

## Shared control four: Stop Condition

The Agent has to know when to formally stop.

### Successful stop

- Completion criteria passed
- Verifier passed
- Post-condition verified

### Safe stop

- Budget exhausted
- Retry limit reached
- Unsupported
- Permission denied
- Required data unavailable
- Human rejected
- Kill switch activated

### Terminal states

- Completed
- Failed
- Partial
- Pending
- Blocked
- Cancelled
- Requires human action

---

## Observability, Audit Log and Trace

A Production Agent must answer:

```text
Which path did this task take?
Why was this tool chosen?
Which data did it use?
Which step failed?
How many retries?
Who approved the action?
What did it cost?
Did the final result actually execute?
```

### Trace

Track the full path of a single task:

- Request ID
- Trace ID
- Parent / child span
- Route
- State transition
- Tool call
- Model call
- Verification
- Final outcome

### Metrics

- Success rate
- Partial rate
- Failure rate
- Latency
- Cost
- Token usage
- Tool error rate
- Retry rate
- Human approval rate
- Citation failure rate
- Duplicate action rate

### Audit Log

High-risk systems should keep:

- Actor
- Action
- Before state
- After state
- Evidence
- Policy decision
- Approver
- Timestamp
- Transaction ID

### Replay

Reproduce in a safe environment:

- Input
- Plan
- Tool results
- Model version
- Prompt version
- State
- Policy version

A Trace without version information is just a historical novel whose universe state cannot be recovered.

---

## Ten anti-patterns in Production Agent work

### 1. Every request goes through the Agent

Simple tasks get dragged through the full pipeline.

### 2. The Router has no Unknown

Ambiguous questions get force-routed anyway.

### 3. Tool permissions written only in the Prompt

The infrastructure does not actually constrain anything.

### 4. The Agent has no State

Long tasks rely on the conversation log to track progress.

### 5. The Verifier only asks the model "is this correct"

No external evidence.

### 6. Retry has no upper bound

Failures get amplified by repetition.

### 7. Human Approval is reduced to a single button

Approvers cannot see the impact or the evidence.

### 8. Trace only contains the final answer

Impossible to find where the failure happened.

### 9. Memory stores everything

Expired, wrong and sensitive data accumulate together.

### 10. No formal failure state

The system always believes the next iteration will succeed.

---

## The assembly order: from requirement to Production Agent

Do not pick a Framework first.

Answer the following in order:

### 1. Does the task actually need an Agent?

If Direct or Pipeline works, use the simpler option first.

### 2. What data and tools does the task need?

- Documents
- Database
- Web
- Browser
- Code
- API

### 3. Which steps are fixed, which need autonomy?

Restrict autonomy to the parts that genuinely cannot be hard-coded in advance.

### 4. How will it be verified?

- Schema
- Citation
- Test
- Rule
- Post-condition
- Human review

### 5. What State has to be persisted?

- Progress
- Plan
- Attempts
- Approvals
- Tool results

### 6. What Memory is required?

- Working
- Procedural
- User
- Shared
- None

### 7. Which actions carry risk?

- Read
- Write
- Delete
- Send
- Pay
- Publish
- Deploy

### 8. What are the budget and stop conditions?

- Cost
- Time
- Steps
- Retries
- Tool calls
- Terminal states

### 9. How will it be observed and held accountable?

- Trace
- Metrics
- Audit
- Replay
- Alert

Once these questions are answered, the Framework becomes an implementation choice, not an architectural answer.

---

## Conclusion of this article

A mature Agent is neither a single huge Prompt nor a model that can call every tool.

It is usually assembled from these building blocks:

```text
Identity and Policy
  ↓
Router
  ↓
Workflow / State Machine
  ↓
Planner or Fixed Pipeline
  ↓
Executor / Tools
  ↓
Verifier
  ↓
Memory and State Update
  ↓
Human Approval or Final Output
```

Different tasks call for different recipes:

- **Production RAG**: Router + Retrieval Pipeline + Citation Verifier
- **Deep Research**: Planner + DAG + Evidence Store + Replanning
- **Coding Agent**: Repository State + Generate-and-Test + Sandbox
- **Browser Agent**: ReAct + State Machine + Action Policy
- **High-risk Automation**: Policy + Deterministic Validation + Human Approval
- **Long-term Monitor**: Event-driven Workflow + Persistent State + Deduplication

What actually lets an Agent enter Production is not autonomy itself, but whether autonomy stays bounded, execution carries state, results come with evidence, failures have an exit, actions stay permissioned, cost stays capped, the system stays traceable, and high-risk actions stay owned by a human.

The next article is the final selection guide of the series.

Part 9 will reorganise the previous eight articles into:

- A decision tree for whether an Agent is needed
- A six-dimension architecture selection flow
- An autonomy-versus-controllability matrix
- A cost-versus-quality matrix
- An Agent Architecture Canvas
- A complete architecture review Checklist

So that the reader can move from "knowing which patterns exist" to "being able to make the architecture decision".

---

## The Atlas of Agent Design Patterns — Series Index

| Part | Topic |
|---:|---|
| 1 | LLM Agents are not only ReAct: six dimensions for reading Agent architecture |
| 2 | Agent execution paths in full: Direct, Pipeline, Router, State Machine and DAG |
| 3 | ReAct, Plan-and-Execute and Adaptive Planning |
| 4 | From one line of thought to searching the whole solution space: CoT, ToT, GoT and LATS |
| 5 | Agent verification and self-correction |
| 6 | Multi-Agent architecture in full |
| 7 | Agent Memory in full |
| 8 | Production Agent architecture in practice |
| 9 | How to choose an Agent architecture |
| Bonus | Implementing design patterns with modern Agent Frameworks |

---

## Figure-to-section mapping

| Figure | Formal title | Suggested filename | Section |
|---|---|---|---|
| Figure 8-1 | Production Agent Reference Architecture | `figure-8-1-production-agent-reference-architecture.png` | The seven layers a Production Agent needs |
| Figure 8-2 | Production RAG Architecture | `figure-8-2-production-rag-architecture.png` | Production RAG |
| Figure 8-3 | Deep Research Agent Architecture | `figure-8-3-deep-research-agent-architecture.png` | Deep Research Agent |
| Figure 8-4 | Production Coding Agent | `figure-8-4-production-coding-agent.png` | Coding Agent |
| Figure 8-5 | Browser and Computer-use Agent | `figure-8-5-browser-computer-use-agent.png` | Browser / Computer-use Agent |
| Figure 8-6 | High-Risk Enterprise Automation | `figure-8-6-high-risk-enterprise-automation.png` | High-risk enterprise automation |
