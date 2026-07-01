---
title: "The Atlas of Agent Design Patterns Part 7 ｜ Agent Memory Explained: Working, Episodic, Semantic and Procedural Memory"
description: "A complete breakdown of Stateless, Working Memory, Short-term State, Episodic Memory, Semantic Memory, Procedural Memory, User Memory, Shared Memory and External Knowledge Store, plus how Memory, State, Context and RAG differ from each other."
date: 2026-07-01T00:24:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 7
---

An Agent is in the middle of a long task.

It has already:

- searched three sources
- ruled out two wrong directions
- finished half the steps
- learned that the user does not accept third-party data
- found that a certain API needs extra permission
- recorded a failure it should avoid

Then the Context Window gets compressed, or the Session is restarted.

When the Agent wakes up again, it re-searches the same pages, calls the same tools, ignores the user's restrictions, and makes the same mistake a second time.

That is not just a model capability problem.

More often it is because the system has not correctly distinguished between:

- Context
- State
- Working Memory
- Long-term Memory
- RAG
- External Knowledge Store

Agent Memory is not "save every conversation forever", and it is not "wire up a vector database and declare long-term memory".

A real Memory Design has to answer:

```text
What is worth remembering?
How long should it be kept?
Who can read it?
Who can write it?
When should it be updated?
Which entry do you trust when there is a conflict?
When should it be forgotten?
```

This article fully compares:

- Stateless
- Working Memory
- Short-term State
- Episodic Memory
- Semantic Memory
- Procedural Memory
- User Memory
- Shared Memory
- External Knowledge Store

and explains how a Production Agent builds a memory system that can be tracked, updated, revoked and expired.

---

## Memory, State, Context and RAG answer different questions

These four concepts are often mixed together.

But they answer different questions.

## Context

Context is:

> What the model can actually see during this generation or reasoning pass.

It can contain:

- System Instructions
- User Query
- Retrieved Chunks
- Tool Outputs
- Current Notes
- Conversation History
- Selected Memory Items

Context has a capacity limit.

If information is not in Context, the model cannot directly use it.

## State

State is:

> Where the workflow is right now.

For example:

- Current Node
- Completed Steps
- Retry Count
- Pending Approval
- Worker Status
- Current Plan Version
- Remaining Budget

State mainly serves flow control, not knowledge retrieval.

## Memory

Memory is:

> What reusable information the system keeps for later steps or future tasks.

For example:

- this task's intermediate conclusions
- past events
- stable knowledge
- rules of doing things
- user preferences
- intermediate results shared across Agents

Memory can be short-term or cross-Session.

## RAG

RAG is:

> How the system retrieves data from an external knowledge source and puts it into the current Context.

The typical flow is:

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

RAG does not mean the Agent "remembers" those documents.

It just re-pulls external data when it is needed.

## A one-line distinction

```text
Context: what the model sees now
State: where the flow is now
Memory: what the system keeps for later
RAG: what the system is pulling from outside now
```

![Figure 7-2 — Context, State, Memory, and RAG](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-2-context-state-memory-rag.png)

> **Figure 7-2 ｜ Context, State, Memory, and RAG**  
> Context is the current model input. State holds flow progress. Memory holds reusable information. RAG pulls data from an external Knowledge Store and puts it into Context.

---

## 1. Stateless: start from scratch every time

A Stateless system does not keep information across requests.

```text
Request
  ↓
Model
  ↓
Response
  ↓
End
```

The next Request does not know what happened in the last one, unless the caller provides it again.

## When does Stateless fit?

- translation
- rewriting
- single-pass summarisation
- simple classification
- fixed format conversion
- tasks that do not need cross-step tracking
- high-privacy, low-persistence scenarios

## Strengths

- simple to implement
- lower privacy risk
- not polluted by old memory
- results are easier to reproduce
- no memory governance needed

## Limits

- duplicate work
- cannot keep preferences
- long tasks lose progress easily
- cannot use past experience
- Context has to be reloaded every time

Stateless is not a step backwards.

If the task does not need Memory, Stateless is usually the safer default.

---

## 2. Working Memory: what the current task is using

Working Memory is the short-term working area of the current task.

It might hold:

- intermediate conclusions
- current subgoals
- already-viewed sources
- unresolved questions
- tool output summaries
- temporary variables
- drafts
- current hypotheses

For example, the Working Memory of a Research Agent:

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

## The difference between Working Memory and Context Window

The Context Window is the content the model actually receives right now.

Working Memory is the task work data the system keeps.

They are not the same thing.

The system can pick part of Working Memory and put it into Context:

```text
Working Memory Store
  ↓
Select Relevant Items
  ↓
Context Builder
  ↓
Model Context
```

Working Memory can be larger than a single Context, and it can be stored in structured form.

## How long should Working Memory be kept?

Usually until:

- the task is complete
- the task is cancelled
- the task expires
- the Session ends
- the Retention TTL is reached

It is not naturally permanent memory.

## Common risks

### The work area grows without bound

Every Tool Output is kept.

### Old intermediate conclusions are not invalidated

When new evidence arrives, the old conclusion is still retrieved.

### Unverified and verified content get mixed up

Drafts get treated as facts.

### Context Builder picks the wrong data

The actually important information never makes it into Context.

---

## 3. Short-term State: workflow progress is not memory content

Short-term State holds the progress of a workflow.

For example:

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

## Common State fields

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

## The difference between State and Working Memory

Working Memory answers:

> What does the current task know and what is it working on?

State answers:

> Where is the current flow and where can it go next?

For example:

```text
Working Memory:
Two official documents have been found

State:
Currently at VERIFY
```

Mixing them up makes the system hard to judge:

- is this data or a flow control field?
- which content can be summarised?
- which fields must be kept exactly?
- which content can expire?

State usually needs stronger precision, version control and atomic updates.

---

## 4. Episodic Memory: what happened before

Episodic Memory keeps records of past events.

For example:

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

Episodic Memory is more structured than ordinary chat logs.

It usually contains:

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

## When does it fit?

- fault diagnosis
- customer service history
- long-running tasks
- user interaction records
- similar case retrieval
- Reflexion
- Agent action replay

## Why Episodic Memory is valuable

### Find similar cases

When a new problem appears, look up similar past situations.

### Avoid repeating the same failure

Know which methods have already failed.

### Provide auditable history

Track what the Agent has done before.

### Support personalisation

Know which suggestions the user accepted or rejected in the past.

## Main risks

### Similar is not the same

Past cases may only be similar on the surface.

### Outdated

Tools, versions, regulations or environments may have changed.

### Privacy

Event records may contain sensitive information.

### Misattribution

The Agent may misjudge what actually caused the success.

---

## 5. Semantic Memory: long-term stable knowledge

Semantic Memory keeps stable, reusable knowledge.

For example:

- company names and products
- organisation definitions
- domain terminology
- product specifications
- user authorisation scope
- system rules
- verified facts

It answers:

> What does the system know long-term?

## Semantic Memory should not be just sourceless text

A mature Semantic Memory entry should at least have:

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

For example:

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

## The relationship between Semantic Memory and RAG

Semantic Memory can sit on top of:

- Database
- Knowledge Graph
- Vector Store
- Key-value Store
- Structured Profile
- Document Store

RAG is a retrieval method.

Semantic Memory is about the purpose and lifecycle of the information.

A Semantic Memory Store can be retrieved by RAG, but the two are not synonyms.

## Main risks

- expired facts
- unclear source
- mixed versions
- inference written as fact
- missing regional or plan Scope
- new information failing to replace old information---

## 6. Procedural Memory: how the Agent should act

Procedural Memory holds rules for doing things.

For example:

```text
If the stored job description is empty:
1. Open the source URL
2. Retrieve the complete text
3. Verify that responsibilities and requirements exist
4. If the full text is unavailable, mark Pending
5. Do not score from the job title alone
```

It answers:

> When the system meets a certain situation, what procedure should it follow?

## Procedural Memory can contain

- SOP
- Tool Usage Rules
- Escalation Policy
- Fallback Sequence
- Validation Checklist
- Handoff Contract
- Safety Rule
- Retry Policy
- Output Format

## The difference between Procedural Memory and Prompt

A Prompt is an instruction for one call.

Procedural Memory is the procedural knowledge the system can continuously retrieve, update and govern.

A mature system may look like:

```text
Retrieve Applicable Procedures
  ↓
Check Version and Scope
  ↓
Insert Selected Rules into Context
  ↓
Execute
```

## Risks of Procedural Memory

### Outdated rules

APIs, products or policies have changed.

### Rule conflicts

Two procedures give different actions for the same situation.

### Wrong lessons get permanent

One accidental failure gets written as a global rule.

### Lost Scope

A rule that only applied to one project now applies to every task.

So Procedural Memory should carry:

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

## 7. User Memory: preferences, limits and long-term settings

User Memory keeps long-term information about a specific user.

For example:

- Preferred Language
- Writing Style
- File Format
- Accessibility Needs
- Notification Preference
- Stable Workflow Rules
- Explicitly Saved Preferences

## What fits User Memory

- settings the user has actively asked to be remembered
- long-term stable working preferences
- restrictions that clearly help future tasks
- data the user can view, update and delete

## What should not be casually saved

- one-off chit-chat
- short-term mood
- unverified guesses
- overly private information
- sensitive attributes
- personal information inferred from third-party content
- content the user has no reasonable expectation of being saved

## User Memory must support

- Explicit Consent
- View
- Edit
- Delete
- Scope Control
- Retention Policy
- Sensitive-data Handling
- Auditability

The value of User Memory is not "remember more so the user feels more cared for".

It is:

> Under conditions the user can understand and control, save the information that will actually improve future interactions.

---

## 8. Shared Memory: how multiple Agents share information

Shared Memory lets multiple Agents use a common working area.

```text
Research Agent
       ↕
Shared Memory
       ↕
Analysis Agent
       ↕
Writing Agent
```

Shared Memory may hold:

- Task Goal
- Plan
- Verified Facts
- Open Questions
- Worker Results
- Source References
- Conflict Flags
- Final Decisions
- Shared Procedures

## The relationship between Shared Memory and Blackboard

Blackboard is one form of Shared Memory architecture.

Multiple Agents collaborate through a central working area instead of passing entire conversations between each other.

## The biggest risk of Shared Memory: pollution spreads

If the Research Agent writes wrong information:

```text
Product A costs $10
```

the Analysis Agent, Writer Agent and Verifier may all reuse it.

So Shared Memory should at least distinguish between:

- Proposed
- Verified
- Rejected
- Superseded
- Expired

## Each Shared Memory entry needs

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

## Permission design

Not every Agent should be allowed to:

- edit a Verified Fact
- delete someone else's result
- overwrite a Procedure
- read sensitive User Memory
- write to Long-term Memory

You can split into:

```text
Read
Propose
Validate
Approve
Supersede
Delete
```

---

## 9. External Knowledge Store: external knowledge is not the Agent's own memory

External Knowledge Store holds:

- documents
- policies
- manuals
- wikis
- databases
- product catalogues
- code repositories
- knowledge graphs
- web data

The Agent usually retrieves through:

- Keyword Search
- Vector Search
- SQL
- Graph Query
- API
- RAG

## Why separate it from Memory?

External Knowledge usually:

- is managed by an external source
- has its own update process
- may belong to multiple users
- should not be casually rewritten by the Agent
- needs to keep the original source
- may be more complete than the Agent's Memory

Memory usually holds:

- Task-specific Summary
- Learned Procedure
- User Preference
- Episode
- Verified Derived Fact

## A common mistake

Writing a Retrieval Chunk into Memory, then treating it as a permanent fact.

That loses:

- the original document version
- the update time
- the paragraph context
- permissions
- Source of Truth

A better pattern is to save:

```text
Reference:
Document ID + Version + Section

Derived Memory:
Scoped summary with source reference
```

---

## Agent memory layers

Agent Memory can be layered by lifecycle and purpose.

## Layer 1: Immediate Context

The input the model can currently see.

## Layer 2: Working Memory

The current task's intermediate information.

## Layer 3: Short-term State

Workflow progress and control fields.

## Layer 4: Long-term Memory

- Episodic
- Semantic
- Procedural
- User

## Layer 5: Shared Memory

Task information shared across Agents.

## Layer 6: External Knowledge

Data managed by external systems, retrieved on demand.

![Figure 7-1 — Agent Memory Layers](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-1-agent-memory-layers.png)

> **Figure 7-1 ｜ Agent Memory Layers**  
> From Immediate Context, Working Memory and Short-term State, through Episodic, Semantic, Procedural and User Memory, then Shared Memory, and finally the external Knowledge Store, each layer has different purposes, lifetimes and governance requirements.---

## Memory is not just retrieval: the full lifecycle

The complete flow of a Memory System is not:

```text
Save Everything
  ↓
Vector Search
```

It is:

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

First decide whether it is worth keeping.

The questions include:

- will it be reused in the future?
- does it already exist?
- does it contain sensitive data?
- does it have a reliable source?
- is it only temporary information?
- has user consent been obtained?

## 2. Normalize

Convert the content into a structured format.

For example:

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

Before writing, check:

- Source
- Accuracy
- Scope
- Consent
- Conflict
- Duplicate
- Policy

## 4. Store

Pick the right storage:

- Relational Database
- Key-value Store
- Vector Store
- Document Store
- Graph Database
- Event Log

## 5. Retrieve

Based on:

- Query
- Task
- User
- Scope
- Time
- Memory Type
- Permission

pull candidate memories.

## 6. Re-rank

Similarity is not applicability.

You also need to evaluate:

- Relevance
- Recency
- Authority
- Scope Match
- Validation Status
- Confidence

## 7. Apply

Put the chosen memory into:

- Context
- Plan
- Tool Policy
- User Profile
- Shared State

## 8. Revalidate

Old memory may no longer apply in a new environment.

## 9. Update / Supersede / Forget

Memory should be able to:

- be updated
- be merged
- have its confidence lowered
- be replaced by a newer version
- expire
- be deleted

![Figure 7-3 — Memory Write, Retrieve, Update, and Forget Loop](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-3-memory-lifecycle-loop.png)

> **Figure 7-3 ｜ Memory Write, Retrieve, Update, and Forget Loop**  
> Memory is checked on value, source, Scope, Consent and conflict before writing. After retrieval it still has to be Re-ranked and re-validated. Only then can it be Updated, Superseded or Forgotten.

---

## Memory Retrieval: similarity is not the only criterion

Vector similarity is often treated as the core of memory retrieval.

But a semantically similar memory may:

- already be expired
- apply to a different project
- not be verified yet
- come from a low-trust source
- conflict with current policy
- involve another user

So Memory Retrieval should ideally use a hybrid score:

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

Before retrieval you should filter:

- Tenant
- User
- Project
- Memory Type
- Permission
- Validation Status
- Expiry
- Effective Date

## Retrieval Budget

Do not dump every similar memory into Context.

You can set:

- Max Memories
- Max Tokens
- Per-type Limit
- Recency Window
- Minimum Confidence
- Diversity Constraint

---

## Memory conflicts: both look true, now what?

Common conflicts:

```text
Memory A:
Use API v1 for billing

Memory B:
Use API v2 for billing
```

Or:

```text
User Preference A:
Use concise responses

User Preference B:
Provide detailed explanations
```

The system cannot just pick the entry with the higher Embedding score.

## Conflict types

### Temporal Conflict

Old and new versions differ.

### Scope Conflict

Different projects, regions, plans or users.

### Source Conflict

Official source and third-party source disagree.

### Procedural Conflict

Two SOPs give different steps for the same situation.

### User Preference Conflict

Preferences from different times contradict each other.

## Conflict resolution principles

1. Check Scope first
2. Then compare Effective Date
3. Then compare Source Authority
4. Then compare Validation Status
5. Check whether it has already been Superseded
6. Mark as Conflict when it cannot be resolved
7. High-impact rules go to Human Review

## Do not overwrite old memory directly

A better version model:

```text
Memory v1
Status: Superseded

Memory v2
Status: Active
Supersedes: v1
```

Keeping history enables:

- Audit
- Rollback
- understanding behaviour change
- investigating errors

![Figure 7-4 — Memory Conflict and Version Governance](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-4-memory-conflict-version-governance.png)

> **Figure 7-4 ｜ Memory Conflict and Version Governance**  
> A new memory checks Scope, time, source and version before writing. Conflicts can be Resolved, Superseded, Merged or sent to Human Review. New content cannot simply overwrite old content.---

## Single-Agent memory and Shared-Memory architectures

## Single Agent

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

Strengths:

- simple permissions
- clear responsibility
- fewer conflicts

## Multi-Agent Shared Memory

```text
Research Agent
Analysis Agent
Writing Agent
Verifier Agent
       ↕
Shared Memory Layer
```

The Shared Memory Layer needs:

- Task-scoped Working Memory
- Verified Fact Store
- Shared Procedure Store
- User / Tenant Isolation
- Version Control
- Access Policy
- Audit Log

## Local Memory and Shared Memory should be separated

Every Agent can keep its own Local Working Memory.

Only content that needs to be coordinated goes into Shared Memory.

For example:

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

This reduces:

- noise
- sensitive information spread
- duplicate content
- Context bloat

![Figure 7-5 — Single-Agent and Shared-Memory Architectures](/images/the-atlas-of-agent-design-patterns-part-7/figure-7-5-single-agent-shared-memory-architectures.png)

> **Figure 7-5 ｜ Single-Agent and Shared-Memory Architectures**  
> A Single Agent can directly use its own Working and Long-term Memory. Multi-Agent setups should separate Local Memory from Shared Memory, and share only information that has been verified and carries Scope and access control.

---

## What should NOT be stored in memory?

## 1. Every raw conversation

Most of it is not worth keeping forever.

## 2. Unverified guesses

```text
The user probably prefers...
```

Guesses should not become facts.

## 3. Transient errors

A single Timeout does not become a permanent procedure rule.

## 4. Sourceless facts

If you do not know where it came from, it is hard to update and verify.

## 5. Sensitive data

Unless there is a clear necessity, a legal basis, permission and security controls.

## 6. Whole external documents that can be re-retrieved

Saving a reference and an index is usually more reasonable than copying the whole content.

## 7. Already-expired State

The Retry Count after a finished task usually should not become Long-term Memory.

## 8. Model conclusions that cannot be revoked

All high-impact memory should be viewable, updatable, retractable or replaceable.

---

## Full comparison of nine memory and information layers

| Type | What it stores | Typical lifetime | Cross-Session | Main purpose | Main risk |
|---|---|---|---:|---|---|
| Stateless | Nothing | Single Request | No | Simple tasks, low risk | Duplicate work |
| Context | Current model input | Single inference | No | Make the model see now | Capacity limit |
| Working Memory | Intermediate conclusions, subgoals | Current task | Optional | Task workspace | Unbounded growth |
| Short-term State | Workflow progress, Retry | Workflow duration | Sometimes | Control the flow | State inconsistency |
| Episodic Memory | Past events and outcomes | Medium to long term | Yes | Cases and experience | Outdated, misattribution |
| Semantic Memory | Stable facts and knowledge | Long term | Yes | Reusable knowledge | Version and source issues |
| Procedural Memory | SOP, rules, procedures | Long term | Yes | Guide behaviour | Rule conflicts |
| User Memory | Preferences and long-term limits | User-controlled | Yes | Personalisation | Privacy and misrecording |
| Shared Memory | Information shared across Agents | Task or long term | Sometimes | Collaboration | Pollution and permissions |
| External Knowledge Store | Documents, databases, wikis | Source-managed | Yes | On-demand retrieval | Permissions, version, recall |

---

## Comparison table of Memory, RAG, Context and State

| Comparison axis | Context | State | Memory | RAG |
|---|---|---|---|---|
| Core question | What does the model see now? | Where is the flow? | What does the system keep? | What does it pull from outside? |
| Main content | Prompt, Query, Chunks | Node, Status, Retry | Events, knowledge, rules, preferences | Documents and data fragments |
| Lifetime | One call or Context Window | Workflow duration | Within task or cross-Session | Per query |
| Goes directly to the model | Yes | Usually selective | After retrieval | Yes |
| Needs a source | Recommended | Not always | Long-term memory needs it | Required |
| Needs version | Context itself rarely | Yes | Yes | External source needs it |
| Main risk | Context Overload | State confusion | Pollution, expiry, privacy | Recall errors, source expiry |

---

## What to store, how long, and when to update?

| Information | Suggested location | Retention | Update condition | Forget condition |
|---|---|---|---|---|
| Current User Query | Context | Single call | New Query | Call ends |
| Intermediate research conclusion | Working Memory | Task duration | New evidence appears | Task completes or TTL |
| Current State | State Store | Workflow duration | Every state transition | Workflow ends |
| Past task events | Episodic Memory | As needed | New result or correction | Expired, low value |
| Verified product facts | Semantic Memory | Medium to long term | Official source update | Replaced or invalid |
| SOP | Procedural Memory | Long term | Process or policy change | Replaced by newer version |
| User preferences | User Memory | User-controlled | User explicitly modifies | User deletes |
| Worker results | Shared Memory | Task duration | Worker updates | Task ends or archives |
| External documents | Knowledge Store | Source decides | Document version update | Source deletes or Retention |

---

## Production Memory Architecture

A mature architecture can be split into these components.

## Context Builder

Responsible for choosing:

- Current Query
- Required State
- Relevant Working Memory
- Relevant Long-term Memory
- Retrieved External Knowledge
- Applicable Procedures

## Memory Router

Decides which layer the content should be written to:

- Working
- Episodic
- Semantic
- Procedural
- User
- Shared
- None

## Memory Validator

Checks:

- Source
- Scope
- Consent
- Duplicate
- Conflict
- Sensitive Data
- Validation Status

## Memory Store

Use different Storage by type.

Do not have to dump every memory into the same Vector Database.

## Retrieval Layer

Supports:

- Metadata Filter
- Semantic Search
- SQL
- Graph Query
- Recency
- Authority
- Permission

## Governance Layer

Controls:

- Version
- Expiry
- Supersede
- Delete
- Access
- Audit
- Retention
- Human Approval

## Observability

Tracks:

- Memory Write Rate
- Retrieval Hit Rate
- Useful Memory Rate
- Stale Memory Rate
- Conflict Rate
- False-memory Incidents
- Token Cost
- Privacy Deletion Success

---

## Common anti-patterns in memory

## Anti-pattern 1: save every conversation

The data volume grows fast, and the actually important content gets harder to find.

## Anti-pattern 2: vector database is Long-term Memory

Only similarity, no Scope, version, permissions or update governance.

## Anti-pattern 3: unverified content written in directly

The Agent's guess becomes a permanent fact.

## Anti-pattern 4: old memory overwritten directly

No Audit, no Rollback, no way to understand the change.

## Anti-pattern 5: memory of different users mixed together

User or Tenant isolation fails.

## Anti-pattern 6: no forgetting mechanism

Outdated rules keep affecting future tasks.

## Anti-pattern 7: copying RAG documents into Memory

Source version and Context are lost.

## Anti-pattern 8: treating State as a natural-language summary

Retry Count, Current Node and other fields lose their precision.

## Anti-pattern 9: every Shared Memory entry is editable by everyone

Verified information can be overwritten by anyone.

## Anti-pattern 10: trust everything retrieved

No Scope, Recency or Validation check.

---

## A complete example: memory design for a job-scoring Agent

Task:

> Score whether a job listing is worth applying for based on the complete JD.

## Context

Visible in this model call:

- user CV summary
- current JD
- scoring Rubric
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

This entry must carry source and version.

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

This assumes the user has explicitly asked to be remembered.

## Shared Memory

Shared across Workers:

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

In this example, a truly reliable system is not "remember everything".

It puts each kind of information in the right place, with clear:

- Scope
- Source
- Lifetime
- Permission
- Update Rule

---

## Production Memory Checklist

## Boundaries

- Are Context, State, Memory and RAG clearly distinguished?
- Are Working and Long-term Memory distinguished?
- Are Local and Shared Memory distinguished?
- Do you know where the Source of Truth lives?

## Write

- Do you first judge whether the content is worth keeping?
- Does it have source and Scope?
- Has it been validated?
- Are sensitive data and Consent handled?
- Are duplicates and conflicts detected?

## Retrieve

- Do you first apply User, Tenant and Project Filters?
- Do you consider Recency, Authority and Validation?
- Do you limit the retrieval count and Token budget?
- Do you re-check applicability in the new context?

## Update and Forget

- Is there a Version?
- Does it support Supersede?
- Is there an Expiry?
- Can it be deleted and revoked?
- Is the Audit History preserved?

## Shared Memory

- Who can Propose?
- Who can Validate?
- Who can Approve?
- Who can Supersede?
- Is unverified information prevented from spreading?

## Observability

- Are wrong-memory incidents tracked?
- Do you know which memories are actually used?
- Do you know whether retrieval improved the result?
- Can user deletion requests be fulfilled?

---

## Conclusion of this article

Agent Memory is not just saving conversations, and it is not the same as wiring up a Vector Database.

Different types solve different problems:

- **Stateless**: start from scratch every time
- **Working Memory**: hold the current task's intermediate information
- **Short-term State**: hold the workflow progress
- **Episodic Memory**: record past events
- **Semantic Memory**: hold verified long-term knowledge
- **Procedural Memory**: hold rules for doing things
- **User Memory**: hold preferences and limits the user has explicitly authorised
- **Shared Memory**: let multiple Agents share task information
- **External Knowledge Store**: hold knowledge managed by external sources

A mature Memory System must be able to answer:

```text
Why record it?
Who writes it?
Where does it come from?
What is its scope?
How long is it kept?
Who do you trust when there is a conflict?
When do you update it?
When do you forget it?
```

The really useful memory is the one that retrieves the right scope, the right version, and enough trust, at the right time.

> **At the right time, retrieve the right scope, the right version, with enough trust.**

The next article will assemble all the building blocks from the previous seven articles.

Part 8 will actually break down:

- Production RAG
- Deep Research Agent
- Coding Agent
- Browser / Computer-use Agent
- high-risk enterprise automation
- long-running monitoring Agents

and explain how Router, Planner, DAG, State Machine, Verifier, Memory, Policy, Budget and Human Approval combine into a real working Production Architecture.