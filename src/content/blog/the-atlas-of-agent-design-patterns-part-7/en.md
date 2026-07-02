---
title: "The Atlas of Agent Design Patterns Part 7 | Context, State, Memory, and RAG"
description: "A production-focused guide to working, episodic, semantic, procedural, user, and shared memory; the boundary between memory and RAG; memory write and retrieval policies; conflict resolution; forgetting; and production memory architecture."
date: 2026-06-27T09:00:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 7
---


An agent is halfway through a long task.

It has already:

- searched three official sources
- rejected two misleading pages
- completed four of seven steps
- learned that the user does not accept third-party pricing
- discovered that one API requires additional permission
- recorded a failure that should not be repeated

Then the context window is compressed, the process restarts, or another worker resumes the task.

The system searches the same pages again, repeats the rejected action, forgets the user's constraint, and contradicts its earlier conclusion.

This is not only a model-capability problem. It is usually an information-architecture problem.

The system has failed to distinguish:

- **context**: what the model can see now
- **workflow state**: where execution is now
- **working memory**: what the active task is using
- **long-term memory**: what may be reused across steps or runs
- **external knowledge**: information managed by another source
- **RAG**: a way to retrieve external or stored information into the current context

A vector database does not automatically create memory. Saving every conversation does not create useful memory either. Both can create an attic full of unlabeled boxes.

A production memory design must answer:

```text
What is worth keeping?
Which type of information is it?
Who owns it?
Who may read or modify it?
What evidence supports it?
How long is it valid?
What happens when it conflicts with newer information?
When should it be deleted, expired, or superseded?
```

This article builds a practical memory model around three separate axes:

1. **function**: what kind of information is being retained
2. **scope and ownership**: who the information applies to
3. **lifecycle**: how the information is written, retrieved, updated, and forgotten

That separation removes one of the most common classification errors in agent design.

## Memory taxonomies need more than one axis

Lists such as the following are common:

- working memory
- episodic memory
- semantic memory
- procedural memory
- user memory
- shared memory
- external memory

The problem is that these labels do not all describe the same property.

### Axis 1: information function

This axis describes what the information represents.

- **Working memory**: temporary task material
- **Episodic memory**: past events, actions, and outcomes
- **Semantic memory**: reusable facts and concepts
- **Procedural memory**: reusable knowledge about how to act

### Axis 2: scope and ownership

This axis describes whom the information belongs to or who may use it.

- **Agent-local**
- **Task-local**
- **User-scoped**
- **Team-shared**
- **Tenant or organisation-scoped**
- **Public or external**

A user-scoped item may be semantic:

```text
The user prefers Traditional Chinese.
```

It may also be episodic:

```text
The user rejected third-party pricing in the previous task.
```

Shared memory may contain working notes, verified facts, or procedures. "Shared" does not identify the content type.

### Axis 3: lifecycle and source of truth

This axis describes where the information comes from and how long it should live.

- immediate model context
- active-task storage
- cross-session memory
- externally managed source
- immutable event log
- versioned knowledge store
- expiring cache

The same fact may move through several lifecycle stages:

```text
Tool result
  -> current context
  -> working-memory candidate
  -> verified semantic-memory entry
  -> superseded after a source update
```

The labels are composable. They should not be forced into one vertical ladder.

![Figure 7-1｜Memory Taxonomy Across Three Independent Axes](/images/the-atlas-of-agent-design-patterns-part-7/three-axis-memory-map.png)

## Context, state, memory, external knowledge, and RAG

These concepts are related, but they answer different questions.

### Context

Context is the input that the model can use in the current inference or reasoning step.

It may contain:

- system instructions
- the current user request
- selected conversation history
- workflow state summaries
- retrieved documents
- tool results
- selected memory entries
- applicable procedures

Context is assembled. It is not automatically the complete history of the system.

If information is not represented in the model's current input or accessible through an action, the model cannot directly use it for that step.

### Workflow state

Workflow state records execution control.

Typical fields include:

```text
workflow_id
current_node
step_status
retry_count
plan_version
pending_approval
worker_assignment
remaining_budget
last_error
terminal_status
```

State answers:

> Where is the run, what has happened, and which transition is legal next?

These fields often require precise, atomic updates. Summarising `retry_count: 2` into prose and later reconstructing it from a conversation is a tiny administrative tragedy waiting to happen.

### Working memory

Working memory is the active task's temporary information workspace.

It may contain:

- intermediate findings
- current hypotheses
- resolved and unresolved requirements
- source summaries
- rejected candidates
- temporary calculations
- draft artefacts
- local decisions

Working memory answers:

> What does the active task currently know, and what is it still working on?

Only a selected portion of it needs to enter the model context for each step.

### Long-term memory

Long-term memory retains reusable information beyond one immediate step and sometimes beyond one run.

It may contain:

- past episodes
- verified facts
- validated procedures
- user-approved preferences
- durable organisational conventions

"Long-term" does not mean "forever". Every durable memory still needs a retention and invalidation policy.

### External knowledge

External knowledge is managed by a source outside the agent's own memory lifecycle.

Examples:

- official documentation
- product catalogue
- policy repository
- code repository
- database
- wiki
- document archive
- knowledge graph
- web source

The external system remains the source of truth.

### RAG

Retrieval-augmented generation combines retrieval from a non-parametric source with generation. In an application architecture, the practical flow is:

```text
Query
  -> retrieve candidates
  -> filter and rerank
  -> place selected evidence into context
  -> generate or decide
```

RAG is a retrieval-and-context-construction mechanism. It is not synonymous with memory.

A memory store may use retrieval. An external document collection may use retrieval. The same retriever can search both, but their governance and source-of-truth rules remain different.

### The concise distinction

```text
Context:
what the model can use now

State:
where execution is now

Working memory:
what the active task is using and maintaining

Long-term memory:
what the system retains for later reuse

External knowledge:
what another source manages

RAG:
how selected information is retrieved into context
```

![Figure 7-2｜Context, State, Memory, External Knowledge, and RAG](/images/the-atlas-of-agent-design-patterns-part-7/context-state-memory-rag.png)

## Stateless is a legitimate design

A stateless system retains no application memory across requests.

```text
Request
  -> bounded processing
  -> response
  -> discard task data
```

This is often the correct choice for:

- translation
- one-pass rewriting
- classification
- fixed extraction
- format conversion
- sensitive tasks with no persistence need
- operations where the caller supplies all required state

Benefits include:

- simpler behaviour
- lower privacy and retention risk
- easier reproduction
- no stale-memory contamination
- fewer deletion obligations
- less storage and retrieval cost

Stateless does not mean the runtime has no logs or operational records. It means those records are not reused as agent memory without a separate purpose and policy.

The default should not be "remember everything". The default should be:

> Do not persist information unless future value justifies the governance cost.

## Working memory: the active task workspace

Working memory supports the task currently in progress.

Example:

```text
Goal:
Compare three orchestration frameworks

Verified:
- Framework A supports durable checkpoints
- Framework B requires external persistence

Unresolved:
- Framework C observability model

Rejected:
- Third-party pricing claim

Next:
Read Framework C official tracing documentation
```

### Working memory is not the context window

A context window is the model input for one step.

Working memory may be:

- larger than one model context
- structured
- stored outside the model
- selectively injected
- shared with the workflow runtime
- retained across process restarts for the same task

A context builder chooses what enters the next call:

```text
Current request
+ exact workflow fields
+ relevant working-memory items
+ selected long-term memory
+ retrieved external evidence
+ applicable procedure
```

### Working memory needs trust states

Do not mix all entries into one bag.

Useful statuses include:

- proposed
- observed
- verified
- rejected
- superseded
- unresolved

A draft hypothesis should not be retrieved as though it were an accepted fact.

### Typical retention

Working memory usually lasts until:

- the task completes
- the task is cancelled
- the task expires
- the task is archived
- a retention limit is reached

Some working artefacts may later be promoted into another memory type, but promotion should be deliberate.

## State is not merely another kind of prose memory

State may be persisted in the same database as task memory, but its semantics are different.

Compare:

```text
Working memory:
Two official sources support the claim.

Workflow state:
current_node = VERIFY
retry_count = 1
approval_status = PENDING
```

Working memory can often be summarised or compressed.

Control state may require:

- exact values
- transactional updates
- concurrency control
- checkpointing
- idempotency
- legal-transition validation

Treating state as an unstructured conversation summary creates failures such as:

- retry counters resetting
- completed steps running again
- approval status being lost
- two workers claiming the same task
- an old plan version becoming active

The storage technology may be shared. The contracts should not be.

## Episodic memory: records of events and outcomes

Episodic memory represents what happened in a particular situation.

A useful episode may contain:

```text
Goal:
Retrieve a complete job description

Situation:
Stored description was empty

Action:
Fetched the source URL

Observation:
The page exposed partial content only

Fallback:
Used the public job-posting endpoint

Outcome:
Complete description retrieved

Environment:
Source version and access date

Evidence:
Request trace and retrieved document

Reflection candidate:
Use the public endpoint after partial-page detection
```

### What episodes are useful for

- diagnosing repeated failures
- retrieving similar cases
- replaying an action history
- supporting long-running work
- personalising future interactions
- evaluating which strategies worked
- creating evidence-backed reflection candidates

Generative Agents used a memory stream of experiences, reflection, and retrieval to inform planning. Reflexion stores verbal feedback from prior trials in an episodic memory buffer. These are examples of experience being reused, not proof that every event deserves permanent storage.

### Main risks

#### Surface similarity

Two episodes may look alike while differing in a critical constraint.

#### Misattribution

The system may record the action that preceded success without identifying the real cause.

#### Staleness

APIs, products, permissions, and environments change.

#### Privacy

Episodes may contain user data, tool outputs, or sensitive operational details.

#### Volume

Raw event history can overwhelm retrieval.

Episodes should preserve evidence and context while remaining compact enough to retrieve and inspect.

## Semantic memory: reusable facts and concepts

Semantic memory stores reusable declarative knowledge.

Examples:

- a product capability
- an organisational definition
- a tenant configuration
- an approved domain term
- a stable user setting
- a verified relationship between entities

A production semantic-memory record should look more like a versioned claim than a loose sentence.

```text
Claim:
Enterprise plan supports SSO

Source:
Official product documentation

Source version:
2026-06

Effective scope:
Enterprise plan, global region

Validation:
Verified

Valid from:
2026-06-01

Last checked:
2026-07-01
```

### Facts need provenance and time

A fact without a source or effective period is difficult to:

- verify
- update
- supersede
- audit
- restrict by scope

A model-generated inference should not be written as a sourced fact.

Possible statuses include:

- proposed
- verified
- disputed
- superseded
- expired
- revoked

### Semantic memory and RAG

Semantic memory describes the role and lifecycle of information.

RAG describes how information is retrieved for a model.

A semantic-memory store may be queried through:

- metadata filters
- SQL
- vector search
- graph traversal
- keyword search

An official document store may use the same retrieval techniques without becoming agent memory.

## Procedural memory: reusable knowledge about how to act

Procedural memory stores reusable behaviour or task procedures.

Examples:

- a validated SOP
- a tool-selection rule
- an escalation sequence
- a fallback policy
- a verification checklist
- a hand-off contract
- a safe retry procedure
- an approved output schema

Example:

```text
Procedure:
Retrieve a complete job description

Trigger:
Stored JD is empty or partial

Preconditions:
Source URL exists
User has access to the listing

Steps:
1. Open the source URL
2. Detect whether the complete responsibilities and requirements are present
3. Use the approved public endpoint when the page is partial
4. Mark Pending if the complete JD remains unavailable
5. Never score from the title alone

Scope:
Job-scoring workflow

Owner:
Recruiting-automation team

Version:
3.2

Validation:
Approved
```

### Procedure versus prompt

A prompt is one delivery mechanism for instructions.

Procedural memory is the governed knowledge that may be selected, versioned, tested, and inserted into a prompt or tool policy.

The application should not blindly retrieve every procedure that is semantically similar. It must check:

- trigger
- preconditions
- scope
- version
- permissions
- conflicts
- expiry
- approval status

### Voyager and reusable skills

Voyager demonstrated an executable skill library that stores and retrieves code-based behaviours in an embodied environment. It is a useful example of reusable procedural capability, but production procedures may be natural-language SOPs, workflow definitions, code, policies, or tool schemas.

### Main risks

- outdated procedure
- conflicting rules
- accidental lesson promoted to a global rule
- lost scope
- unsafe procedure retrieved for the wrong user or environment
- procedure changed without review

High-impact procedures need owners, tests, versions, and rollback.

## User memory is a scope, not a fifth cognitive content type

User memory contains information scoped to a user.

That information may be:

- semantic: a stable preference
- episodic: a previous accepted decision
- procedural: a user-specific workflow rule
- task-working: a preference relevant only to the active request

Examples that may be useful when explicitly saved:

- preferred language
- preferred output format
- accessibility requirement
- stable notification setting
- user-approved workflow rule
- a persistent restriction that changes future execution

Information that should not be casually saved includes:

- guesses about personality
- one-off emotions
- sensitive attributes inferred from unrelated content
- transient conversation details
- third-party personal data
- information the user did not reasonably expect to persist

A user-memory design should support:

- clear purpose
- understandable consent or user action
- view
- correction
- deletion
- scope
- retention
- access control
- auditability

The design goal is not to maximise emotional familiarity. It is to retain information that predictably improves future work under user control.

## Shared memory is a coordination scope

Shared memory allows several agents or services to coordinate through common information.

It may contain:

- task goal
- current plan
- verified facts
- open questions
- worker assignments
- structured results
- conflict flags
- accepted decisions
- shared procedures

"Shared" describes access and coordination. The underlying entries still have content types and trust states.

### Blackboard is one shared-memory architecture

In a blackboard architecture, multiple knowledge sources or workers read and contribute to a shared problem-solving space. A controller or scheduling mechanism may decide which contribution runs next.

A production blackboard needs more than a shared text field:

- typed entries
- author
- source
- version
- validation status
- write permissions
- conflict rules
- subscriptions or task triggers
- audit log
- retention

### Local and shared memory should be separated

Agent-local working memory may contain:

- raw notes
- temporary hypotheses
- tool logs
- private scratch artefacts

Shared memory should contain only information needed for coordination:

- structured results
- verified facts
- open questions
- accepted decisions
- task status

This reduces noise, privacy spread, and accidental reuse.

### Shared-memory permissions

Useful operations include:

- read
- propose
- validate
- approve
- supersede
- revoke
- delete

Not every worker should be able to overwrite a verified fact or promote an item into long-term memory.

## External knowledge should keep its own source identity

External knowledge stores include:

- documents
- databases
- wikis
- policies
- manuals
- code repositories
- catalogues
- knowledge graphs
- web pages

They are usually managed by another system and have their own update and permission model.

A common mistake is:

```text
Retrieve one paragraph
  -> summarise it
  -> store the summary as a permanent fact
  -> lose the source and version
```

A better record preserves the link:

```text
Derived memory:
Scoped summary

Derived from:
document_id
document_version
section
retrieval time
access policy
```

Where possible, retain a reference to the source of truth rather than copying the entire source into memory.

RAG retrieval can then fetch:

- the original external evidence
- derived memory
- both, with different trust and freshness rules

## Memory is a lifecycle, not a database

A complete memory system includes at least:

```text
Observe
  -> Decide whether to write
  -> Classify type and scope
  -> Normalise
  -> Validate
  -> Store
  -> Retrieve candidates
  -> Filter and rerank
  -> Assemble context
  -> Use
  -> Evaluate usefulness
  -> Update, supersede, expire, or delete
```

### 1. Observe

Capture a candidate from:

- user input
- tool result
- workflow event
- accepted output
- verifier result
- human decision
- reflection

Observation is not automatic approval.

### 2. Write decision

Ask:

- Will this be useful again?
- Is the information already stored?
- Is it temporary state?
- Does it contain sensitive data?
- Is there a source?
- Is the user or policy allowed to persist it?
- Could the original source be re-retrieved instead?

The correct write target may be `none`.

### 3. Classify

Assign:

- content type
- owner and scope
- retention class
- sensitivity
- trust state
- source-of-truth relationship

### 4. Normalise

Convert the candidate into a structured record.

### 5. Validate

Check:

- evidence
- accuracy
- scope
- consent or authority
- duplication
- conflict
- policy
- retention
- write permission

### 6. Store

Choose storage by access pattern and contract:

- relational database
- document store
- key-value store
- vector index
- graph database
- event log
- object storage

One memory record may use several physical indexes. A vector index is usually an access path, not the whole record of truth.

### 7. Retrieve

Retrieve candidates using:

- task and query
- type
- user or tenant
- project
- time
- permissions
- status
- source
- semantic relevance
- exact identifiers

### 8. Filter and rerank

Semantic similarity is only one signal.

Useful features include:

- applicability
- scope match
- recency
- source authority
- validation status
- confidence
- contradiction
- user or tenant match
- cost of use

Do not pretend that one universal weighted formula works for every memory type. A hard permission mismatch should filter an item out, not merely subtract three points.

### 9. Assemble context

The context builder decides:

- which exact state fields are required
- which working-memory items are relevant
- which long-term memories apply
- which external evidence is needed
- how much token budget each category receives

### 10. Use and evaluate

Track whether retrieved memory:

- changed the decision
- improved task success
- prevented repeated work
- caused an error
- was ignored
- was stale or irrelevant

### 11. Update, supersede, expire, or delete

Memory must support correction and forgetting.

![Figure 7-3｜Memory Is a Lifecycle, Not a Database](/images/the-atlas-of-agent-design-patterns-part-7/memory-lifecycle-loop.png)

## Retrieval: applicability before similarity

A semantically similar item may still be unusable because it:

- belongs to another user
- applies to another product version
- is expired
- is unverified
- conflicts with current policy
- is superseded
- requires permission the current agent lacks

A robust retrieval pipeline is:

```text
Permission and scope filter
  -> lifecycle-status filter
  -> candidate retrieval
  -> semantic and lexical relevance
  -> recency and authority reranking
  -> contradiction check
  -> context-budget selection
```

### Hard filters

Examples:

- tenant
- user
- project
- region
- memory type
- access policy
- active status
- effective date
- expiry
- sensitivity class

### Ranking signals

Examples:

- semantic relevance
- exact-key match
- source authority
- recency
- prior usefulness
- confidence
- task compatibility
- novelty

### Retrieval budget

Limit:

- number of memories
- tokens
- entries per type
- age range
- minimum confidence
- duplicate content
- number of conflicting candidates

LongMemEval highlights that long-term memory performance involves more than raw recall. Systems must handle information extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention.

A memory system that retrieves a stale preference confidently has not succeeded merely because it found something.

## Conflict and version governance

Memory conflicts are normal.

Examples:

```text
Procedure v1:
Use billing API v1

Procedure v2:
Use billing API v2
```

```text
Preference recorded in May:
Use concise answers

Preference recorded in July:
Use detailed explanations for technical topics
```

### Conflict types

- **temporal**: old and new versions differ
- **scope**: different users, regions, projects, plans, or environments
- **source**: official and secondary sources disagree
- **procedural**: two rules prescribe different actions
- **identity**: two records may refer to the same or different entity
- **preference**: user choices differ by time or task
- **derived-fact**: conclusions were computed from different evidence

### Resolution order

A useful sequence is:

1. verify entity and scope
2. compare effective time
3. inspect source authority and provenance
4. compare validation status
5. check supersession links
6. determine whether both can coexist under different conditions
7. mark unresolved conflict
8. escalate high-impact ambiguity

### Do not overwrite history silently

Use a version model:

```text
Memory v1
status: superseded

Memory v2
status: active
supersedes: v1
reason: official API migration
```

Version history supports:

- audit
- rollback
- debugging
- behaviour-change analysis
- source refresh

### Invalidation should propagate

If a semantic fact changes, downstream items derived from it may also need review.

```text
External document updated
  -> semantic claim superseded
  -> cached summary invalidated
  -> dependent procedure flagged
  -> affected shared decision reverified
```

This is why provenance is a graph, even when the user interface looks like a table.

![Figure 7-4｜Conflict, Supersession, and Invalidation Propagation](/images/the-atlas-of-agent-design-patterns-part-7/memory-conflict-supersession.png)

## Forgetting is a feature

A memory system without forgetting becomes less reliable over time.

Reasons to forget or retire an entry include:

- task completed
- retention period ended
- user deletion
- source revoked
- policy changed
- item superseded
- confidence fell below threshold
- memory was never useful
- privacy or security requirement
- duplicate consolidation
- incorrect inference

"Forget" may mean:

- remove from active retrieval
- expire
- archive
- revoke
- tombstone
- delete physical data
- delete derived indexes
- preserve only a required audit record

Deletion must cover secondary artefacts:

- vector indexes
- caches
- summaries
- replicas
- derived profiles
- shared copies

Otherwise the system forgets ceremonially while the data continues living a rich afterlife in six indexes.

## Production memory architecture

A production architecture separates control, storage, retrieval, and governance.

### Context builder

Builds the model input from:

- current request
- exact workflow state
- selected working memory
- applicable long-term memory
- retrieved external evidence
- procedures
- policy instructions

### Memory router

Decides whether a candidate should go to:

- no storage
- working memory
- episodic memory
- semantic memory
- procedural memory
- user-scoped memory
- shared memory

### Write validator

Checks:

- source
- scope
- duplication
- conflict
- sensitivity
- authority
- retention
- write permission
- user control

### Typed stores

Different memory contracts may use different storage and indexes.

For example:

- workflow state in a transactional store
- episodes in an event or document store
- semantic claims in a relational or graph model
- procedures in a versioned registry
- user preferences in a scoped profile store
- large source documents in object storage
- vector indexes as retrieval accelerators

### Retrieval layer

Supports:

- metadata filters
- exact lookup
- semantic search
- keyword search
- SQL
- graph traversal
- time-aware retrieval
- authority and version reranking

### Shared-memory gateway

Controls which local results become visible to other agents.

It enforces:

- task scope
- typed hand-offs
- trust state
- read and write permissions
- conflict flags
- final-owner decisions

### Governance layer

Controls:

- version
- supersession
- expiry
- deletion
- access
- audit
- retention
- approval
- source refresh
- legal or policy requirements defined by the organisation

### Observability

Track:

- write-candidate rate
- accepted-write rate
- retrieval hit rate
- useful-memory rate
- stale-memory rate
- conflict rate
- privacy-deletion completion
- memory-caused error rate
- retrieval latency
- context token cost
- abstention quality

![Figure 7-5｜Production Memory Architecture](/images/the-atlas-of-agent-design-patterns-part-7/production-memory-architecture.png)

## Evaluating memory systems

A memory demo often asks:

> Can the system recall one fact from a previous conversation?

Production evaluation needs more.

### Recall

Did the system retrieve the needed item?

### Precision

Did it avoid retrieving irrelevant or prohibited items?

### Temporal correctness

Did it use the version valid for the current time?

### Update handling

Did a newer fact supersede the old one?

### Scope correctness

Did the item apply to the correct user, tenant, project, and region?

### Abstention

Did the system admit that no reliable memory was available?

### Privacy and access

Did it prevent cross-user or unauthorised retrieval?

### Usefulness

Did the memory improve the downstream outcome?

### Harm

Did stale or incorrect memory cause a worse decision?

Evaluation sets should include:

- conflicting updates
- similar but inapplicable episodes
- revoked user preferences
- expired procedures
- cross-tenant traps
- unsupported questions
- deletion requests
- source-version changes

Long context alone is not a substitute for these behaviours. MemGPT, LongMem, MemoryBank, and related systems explore different mechanisms for extending or managing memory, while benchmarks such as LongMemEval make the update, temporal, and abstention problems visible.

## What should not be stored

### Every raw conversation

Most content has no future value.

### Unverified guesses

```text
The user probably prefers...
```

A guess should not become a profile fact.

### Every transient failure

One timeout should not create a permanent procedure.

### Sourceless claims

Without provenance, correction becomes guesswork.

### Whole external documents by default

Store references and indexes unless duplication has a clear purpose.

### Sensitive information without a defined need

Persistence should be purposeful and controlled.

### Finished workflow counters as long-term knowledge

`retry_count = 2` usually expires with the run.

### Raw model reasoning as an audit substitute

Store decisions, actions, evidence, and outcomes rather than unrestricted private reasoning text.

### Irrevocable conclusions

High-impact memory must be correctable, supersedable, or removable.

## Complete example: memory design for a job-scoring agent

The task is:

> Score whether a job is worth applying for, but only after reading the complete job description.

### Context

For the current model call:

- current job description
- CV summary
- scoring rubric
- applicable procedure
- exact row identifier
- relevant user constraints

### Workflow state

```text
row_id: 253
jd_status: COMPLETE
scoring_status: IN_PROGRESS
retry_count: 0
current_node: SCORE
```

### Working memory

```text
Required capabilities found:
- product strategy
- AI / ML
- stakeholder management

Potential gap:
- local-language requirement

Unresolved:
- visa sponsorship
```

### Episodic memory

A past event records:

```text
Situation:
LinkedIn page contained partial JD

Action:
Fetched approved public endpoint

Outcome:
Complete JD obtained

Evidence:
request trace and source identifier
```

This episode may be retrieved when a similar partial-page failure occurs.

### Procedural memory

```text
Trigger:
Stored JD is empty or partial

Procedure:
1. Fetch the source URL
2. Verify responsibilities and requirements are present
3. Use the approved public endpoint when needed
4. Mark Pending if full text remains unavailable
5. Never score from title alone
```

### User-scoped memory

```text
Preference:
Only roles scoring 80 or above should be considered

Source:
Explicit user instruction

Scope:
Job-scoring workflow
```

### Semantic memory

```text
Claim:
The scoring threshold is 80

Scope:
Current workflow version

Validation:
Approved

Version:
2.1
```

This could also remain purely procedural or configuration data. The important point is that the source and scope are explicit.

### External knowledge

- the current job listing
- company careers page
- public job-posting endpoint
- visa-policy source

These remain external sources and should be re-retrieved or versioned.

### Shared memory

When several workers are involved, share only:

- complete JD
- verified extracted requirements
- unresolved questions
- final score components
- source references

Do not share every browser log and draft hypothesis.

### Forgetting

After task completion:

- working notes expire
- exact workflow counters are removed
- the accepted score and source references may be retained under policy
- invalid drafts are not promoted
- outdated listing content follows retention rules

The value comes from remembering the right contract and evidence, not from remembering the most text.

## Common anti-patterns

### A vector store is treated as the entire memory system

Similarity is available, but version, ownership, trust, and deletion are missing.

### Content types and ownership scopes are mixed

"User", "shared", and "episodic" are presented as mutually exclusive categories.

### State is stored as prose

Exact workflow control becomes lossy.

### Every retrieval result is trusted

No applicability, permission, status, or source check occurs.

### Memory writes happen before verification

A model inference becomes a durable fact.

### Old memory is overwritten

No provenance or rollback remains.

### External documents are copied into memory without references

The source of truth disappears.

### Shared memory has universal write access

One worker can overwrite accepted information.

### Retrieval is optimised only for recall

The system becomes excellent at finding the wrong user's old preference.

### No deletion propagation exists

The visible record is deleted, but embeddings and caches remain.

### Memory success is measured only by anecdotal recall

No tests cover updates, conflicts, scope, abstention, or harm.

## Production checklist

### Classification

- Are function, ownership, and lifecycle separate axes?
- Is workflow state separate from working memory?
- Are user and shared memory treated as scopes?
- Is external knowledge separated from derived memory?

### Writing

- Is there a write decision?
- Can the answer be `do not store`?
- Are source, scope, authority, and retention recorded?
- Are guesses prevented from becoming verified facts?
- Are user controls enforced?

### Retrieval

- Do hard permission and scope filters run first?
- Is similarity only one ranking signal?
- Are expiry, supersession, and conflict checked?
- Is context budget allocated by type?
- Can the system abstain?

### Updating and forgetting

- Are versions linked?
- Can records be superseded or revoked?
- Does invalidation propagate to derived artefacts?
- Are deletion requests applied to indexes and caches?
- Are expiry and retention jobs observable?

### Shared memory

- Is local scratch work separated from shared state?
- Are writes typed and permissioned?
- Is there a final owner?
- Are proposed and verified items distinct?
- Are conflicts explicit?

### Evaluation

- Are recall and precision both measured?
- Are temporal updates tested?
- Are cross-user and cross-tenant failures tested?
- Is downstream usefulness measured?
- Are memory-caused errors tracked?

## Conclusion

Agent memory becomes clearer when three axes are separated:

- **function**: working, episodic, semantic, procedural
- **scope**: local, task, user, shared, organisation
- **lifecycle**: context, active task, cross-session, external source, expired or superseded

Context, state, memory, external knowledge, and RAG then occupy distinct roles:

```text
Context:
assembled input for the current model step

State:
precise execution control

Memory:
retained information with a reuse lifecycle

External knowledge:
source-managed information

RAG:
retrieval into the current context
```

A production memory system is not a storage product with an embedding endpoint. It is a governed loop:

```text
select what deserves memory
  -> classify type and ownership
  -> validate source and authority
  -> store with version and retention
  -> retrieve with scope and permission
  -> evaluate usefulness
  -> update, supersede, or forget
```

The most important design question is not:

> How much can the agent remember?

It is:

> Which information should influence a future decision, under what conditions, and how can that influence be corrected or removed?

Part 8 moves from individual patterns to complete production architectures:

> How do routing, planning, tools, verification, memory, human approval, budgets, and observability fit together in one controlled system?

## References

- [Sumers et al., *Cognitive Architectures for Language Agents*](https://arxiv.org/abs/2309.02427)
- [Park et al., *Generative Agents: Interactive Simulacra of Human Behavior*](https://arxiv.org/abs/2304.03442)
- [Packer et al., *MemGPT: Towards LLMs as Operating Systems*](https://arxiv.org/abs/2310.08560)
- [Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
- [Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366)
- [Wang et al., *Voyager: An Open-Ended Embodied Agent with Large Language Models*](https://arxiv.org/abs/2305.16291)
- [Zhong et al., *MemoryBank: Enhancing Large Language Models with Long-Term Memory*](https://arxiv.org/abs/2305.10250)
- [Wu et al., *LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory*](https://arxiv.org/abs/2410.10813)

