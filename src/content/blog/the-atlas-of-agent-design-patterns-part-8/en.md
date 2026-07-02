---
title: "The Atlas of Agent Design Patterns Part 8 | Production Agent Architectures in Practice"
description: "A production-focused guide to assembling routing, durable orchestration, tools, verification, state, memory, policy, evaluation, observability, budgets, and human control into RAG, deep-research, coding, browser, enterprise-automation, and monitoring systems."
date: 2026-07-01T13:44:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 8
---


The first seven parts separated agent design into six practical dimensions:

1. execution path
2. decision and planning
3. reasoning and search
4. verification and recovery
5. agent organisation
6. state and memory

Production design begins when those dimensions are assembled around a real task, real permissions, real failure modes, and an accountable terminal outcome.

A production agent is not simply:

```text
Prompt
  -> Model
  -> Tools
  -> Answer
```

A more honest description is:

```text
Admission
  -> Orchestration
  -> Execution
  -> Acceptance

Cross-cutting:
Identity · Policy · State · Memory · Budget · Observability · Human Control
```

The objective is not maximum autonomy. It is bounded autonomy inside a system that can answer:

- Who requested this action?
- Is the request permitted?
- Which path did the task take?
- What state has already changed?
- Which evidence supports the result?
- Which checks passed or failed?
- Is another attempt safe?
- Who owns the final decision?
- What terminal state ends the run?

This article presents six production recipes:

1. production RAG
2. deep-research agent
3. coding agent
4. browser or computer-use agent
5. high-risk enterprise automation
6. long-running monitor

They are not universal blueprints. Each is a reference composition that must be adjusted to the task, data, risk, latency, and operational environment.

## Production readiness is a risk-relative claim

"Production-ready" should never mean "contains many enterprise-looking boxes".

A low-risk internal summariser and a payment automation do not need the same controls. The required evidence should scale with:

- reversibility
- financial or legal impact
- data sensitivity
- permission scope
- duration
- number of side effects
- uncertainty in the environment
- cost of a false positive
- cost of a false negative

A design is ready only when its controls match its risk.

## Four runtime stages and three cross-cutting planes

The previous draft described seven layers. That framing was useful as an inventory, but it mixed sequential stages with concerns that surround the whole run.

A clearer reference model uses four runtime stages and three cross-cutting planes.

### Runtime stage 1: admission and routing

This stage decides:

- whether the request is supported
- whether it needs an agent at all
- which source of truth is required
- whether tools are needed
- whether the user may access the data
- which risk class applies
- whether clarification or human handling is required

Possible outcomes include:

- direct response
- fixed pipeline
- RAG
- SQL or deterministic tool
- bounded agent workflow
- human review
- clarification
- unsupported

A router must be allowed to abstain. Forced routing converts uncertainty into confident misclassification.

### Runtime stage 2: orchestration

Orchestration owns movement through the task:

- workflow or state machine
- plan and plan version
- task dependencies
- queues
- retries and fallbacks
- pause and resume
- approval states
- deadlines
- terminal outcomes

The orchestrator does not need to decide every local action. It may call a bounded ReAct executor, launch a DAG, or run a deterministic pipeline inside one state.

### Runtime stage 3: execution

Execution performs work through:

- language models
- retrieval
- databases
- APIs
- code sandboxes
- browsers
- files
- external services
- specialised workers

Every executable capability should have a contract:

- allowed inputs
- permissions
- timeout
- cost
- side-effect class
- idempotency behaviour
- structured output
- error taxonomy

### Runtime stage 4: acceptance and completion

This stage determines whether the result may be accepted.

It may use:

- schema validation
- executable tests
- source and citation checks
- policy checks
- post-condition verification
- model-based rubric evaluation
- authorised human approval

Possible outcomes should include more than pass and fail:

- completed
- failed
- partial
- blocked
- cancelled
- pending
- unsupported
- inconclusive
- requires human action

### Cross-cutting plane 1: identity, policy, and risk

This plane constrains every runtime stage:

- authentication
- authorisation
- data access
- tool allowlists
- delegation rights
- secret isolation
- sandboxing
- risk classification
- approval requirements
- irreversible-action gates

Important controls must exist in application or infrastructure enforcement, not only in natural-language instructions.

### Cross-cutting plane 2: state, memory, and evidence

This plane preserves what the run needs:

- workflow state
- step status
- plan version
- working memory
- evidence store
- user-scoped memory
- procedural memory
- shared state
- tool results
- approval record

State, memory, and evidence should remain distinct even when they share physical storage.

### Cross-cutting plane 3: operations, evaluation, and accountability

This plane makes the system operable:

- traces
- metrics
- logs
- audit records
- replay
- alerts
- cost accounting
- offline evaluation
- regression suites
- release gates
- incident response
- kill switches

Observability explains what happened in live runs. Evaluation measures whether a system version is good enough before and after release. A per-run verifier decides whether one candidate satisfies one contract. These are related, but not interchangeable.

![Figure 8-1｜Four Runtime Stages and Three Cross-cutting Planes](/images/the-atlas-of-agent-design-patterns-part-8/production-reference-architecture.png)

## Start with the non-agent baseline

Before selecting any recipe, ask whether one bounded operation or a fixed pipeline is sufficient.

```text
Input
  -> Validate
  -> Model or Function
  -> Validate Output
  -> Result
```

Good baseline tasks include:

- translation
- rewriting
- summarisation
- fixed-field extraction
- classification
- format conversion
- answering from supplied content
- a known calculation
- a stable retrieval pipeline with no adaptive branching

A direct path may still include:

- input validation
- output schema
- policy checks
- token limits
- fallback model
- basic logging
- deterministic post-processing

The principle is simple:

> Use the smallest architecture that can satisfy the contract reliably.

An agent theme park is an expensive way to discover that a function would have worked.

## Recipe 1: production RAG

The original RAG architecture combines a parametric generator with retrieved non-parametric knowledge. In production, the difficult part is not adding a vector index. It is controlling source selection, access, context assembly, evidence, and failure.

A fixed RAG pipeline may remain entirely non-agentic:

```text
Query
  -> Retrieve
  -> Rerank
  -> Build Context
  -> Generate
  -> Verify
```

Agentic behaviour earns its place only when the path must adapt, for example:

- source selection depends on the request
- retrieval must continue after inspecting gaps
- the system must decide whether to clarify
- several tools or corpora may be needed
- evidence conflicts require another research step

### Production flow

```text
Request
  -> Identity and Query Admission
  -> Source Router
  -> Query Normalisation or Rewrite
  -> Permission-aware Retrieval
  -> Deduplicate and Rerank
  -> Context Builder
  -> Generate with Citation IDs
  -> Claim-to-Evidence Verification
  -> Answer, Clarify, Retry, or Abstain
```

### Enforce access before model exposure

An ACL filter placed only after unrestricted retrieval is too late if unauthorised content has already reached logs, caches, rerankers, or model context.

Use defence in depth:

1. authorise the user and tenant
2. restrict the searchable corpus
3. apply metadata filters during retrieval
4. remove unauthorised candidates before reranking
5. recheck selected context before generation
6. audit denied access attempts

### Query rewrite is a controlled transformation

A rewrite node should preserve:

- user intent
- security scope
- entities
- time range
- language
- source constraints

It must not silently broaden a private query into a wider corpus.

### Context builder responsibilities

The context builder should manage:

- token budget
- source diversity
- duplicate passages
- document version
- chunk adjacency
- citation identifiers
- permissions
- recency
- conflicting evidence
- prompt-injection boundaries

Retrieved content is untrusted data. Instructions found inside a document or webpage must not automatically override the system or tool policy.

### Verification

A citation-bearing answer still requires checks:

- Does each material claim have evidence?
- Does the cited passage support the claim?
- Is the source permitted?
- Are versions and dates compatible?
- Were important limitations omitted?
- Is the answer complete enough for the contract?
- Should the system abstain?

### Failure policy

| Failure | Primary response |
|---|---|
| No permitted source found | Clarify, switch approved corpus, or abstain |
| Low retrieval coverage | Rewrite or run a deeper retrieval profile |
| Citation mismatch | Repair or reject the answer |
| Conflicting sources | Surface the conflict or request review |
| Stale source | Prefer a valid newer source or label the limitation |
| Unauthorised content | Remove, record, and investigate |
| Context budget exceeded | Compress, prioritise, or split the task |
| Prompt injection in source | Treat as data, exclude instructions, log the incident |

### Production state

Persist only what is needed to reproduce and diagnose the run:

- original query
- rewritten query
- corpus and policy version
- retrieved document IDs and versions
- reranker scores
- selected evidence
- citation map
- verifier result
- retry count
- terminal outcome

![Figure 8-2｜Production RAG Pipeline](/images/the-atlas-of-agent-design-patterns-part-8/production-rag-pipeline.png)

## Recipe 2: deep-research agent

A deep-research task is not simply "search more". It must transform an open question into traceable claims and a synthesis whose gaps are visible.

A typical architecture is:

```text
Research Goal
  -> Admission and Source Policy
  -> Planner
  -> Versioned Research Plan
  -> Dependency-aware Task Graph
  -> Bounded Research Workers
  -> Evidence Store
  -> Synthesis
  -> Coverage and Conflict Verifier
  -> Complete, Repair, or Replan
```

### The planner produces research contracts

A useful subtask includes:

- question
- objective
- dependency
- allowed sources
- required evidence
- output schema
- completion criteria
- budget
- deadline
- failure policy

"Research the market" is not a contract.

### DAG is optional, not ceremonial

Use a DAG when subtasks have genuine directional dependencies and independent branches.

Parallel branches might cover:

- product capability
- pricing
- security
- deployment
- customer evidence
- regulation

Do not parallelise merely because worker cards look impressive. Parallel tasks can saturate rate limits, duplicate searches, and create an expensive join problem.

### Evidence store, not paragraph warehouse

Each evidence unit should preserve:

- claim or field
- source
- source type
- publication date
- access date
- document version
- supporting extract
- scope
- worker
- validation status
- source lineage

Source lineage matters because five secondary articles citing one original report do not represent five independent sources.

### Synthesis must preserve disagreement

The synthesiser should not flatten conflicting evidence into one smooth paragraph.

It should record:

- agreement
- conflict
- unresolved gap
- time or version difference
- inference
- confidence
- consequence for the recommendation

### Replanning boundary

Use local repair when one source or query failed but the subtask remains valid.

Use replanning when:

- the decomposition is incomplete
- a premise is false
- several dependencies change
- the deliverable changes
- the evidence contract cannot be satisfied

A verifier failure should not automatically restart all research. Valid evidence should be preserved.

### Stop conditions

- required questions covered
- minimum evidence quality met
- material conflicts disclosed
- citation coverage passed
- no critical gap remains
- budget reached
- no-improvement limit reached
- human deadline reached

"One more source might exist" is not a completion policy.

![Figure 8-3｜Deep Research Agent Architecture](/images/the-atlas-of-agent-design-patterns-part-8/deep-research-agent-architecture.png)

## Recipe 3: coding agent

A production coding agent is an executable software-change workflow, not a code-completion prompt.

It must be able to:

- understand the repository
- constrain the change
- edit in isolation
- execute tests
- read structured failures
- repair within limits
- inspect the final diff
- reproduce the result
- stop safely

### Reference flow

```text
Task
  -> Repository and Environment Snapshot
  -> Scope and Acceptance Contract
  -> Inspect Code, Tests, and History
  -> Plan or Direct Repair
  -> Generate Patch
  -> Static Validation
  -> Sandbox Execution
  -> Target Test
  -> Related and Regression Tests
  -> Lint, Type Check, and Build
  -> Security and Change-scope Review
  -> Evidence Bundle
  -> Approval or Delivery
```

### Snapshot first

Record:

- repository URL or identity
- branch
- commit SHA
- dirty state
- runtime version
- dependency lock
- environment variables by reference, never raw secrets
- test environment
- relevant service versions

A patch without a reproducible base is a rumour wearing a diff.

### Inspect before editing

The agent should examine:

- failing test
- call path
- nearby implementation
- configuration
- similar code
- repository conventions
- recent relevant changes
- error logs

A stack trace may identify where the symptom appears, not where the defect originates.

### Layered validation

The exact test suite depends on the repository, but the acceptance chain should normally include:

1. target test
2. related test group
3. relevant regression suite
4. lint and formatting checks
5. type checking
6. build or package check
7. security checks where applicable
8. diff and scope review
9. reproducibility check

Do not claim that every repository must always run an enormous global suite. Define the required suite in the task contract and explain any unrun checks.

### Protect the verifier

The agent must not gain a pass by:

- deleting a test
- skipping a test
- weakening an assertion
- changing an expected result without authorisation
- editing protected fixtures
- hiding the error
- modifying unrelated files

Track test-file changes separately and require review when acceptance artefacts change.

### Sandboxing and permissions

Code execution should use:

- isolated workspace
- least-privilege credentials
- controlled network access
- resource limits
- timeouts
- output limits
- secret isolation
- disposable environment where feasible

### Delivery evidence

A deliverable should include:

- base commit
- changed files
- explanation of the root cause
- commands run
- exit codes
- tests passed and not run
- lint and build results
- remaining risks
- reproducible installation or placement steps

Benchmarks such as SWE-bench emphasise that real repository repair requires coordinated changes and executable evaluation, not merely plausible code generation.

![Figure 8-4｜Coding Agent Reference Flow](/images/the-atlas-of-agent-design-patterns-part-8/coding-agent-reference-flow.png)

## Recipe 4: browser and computer-use agent

A browser agent operates in a partially observable, changing environment.

Clicking a button is not success. The system must observe a post-condition.

### Reference loop

```text
Goal and Current State
  -> Observe Interface
  -> Parse Trusted and Untrusted Content
  -> Build Structured Browser State
  -> Check Policy
  -> Select Allowed Action
  -> Duplicate and Risk Check
  -> Execute
  -> Observe New State
  -> Verify Progress or Completion
```

### Structured browser state

Record:

- current URL and origin
- page title
- selected account or tenant
- visible controls
- active element
- form values
- navigation history
- last action
- last observation
- download status
- session status
- screenshot or DOM reference
- retry count
- transaction identifier where relevant

### Action classes

Low-risk examples:

- navigate
- scroll
- inspect
- search
- select
- type into a draft field
- download a permitted file

Higher-risk examples:

- submit
- send
- purchase
- delete
- publish
- change permissions
- upload sensitive data
- accept legal terms

High-risk actions should pass through a preview, policy check, and approval gate.

### Prompt injection and untrusted interfaces

Web content may contain instructions intended to manipulate the agent.

Treat page text, email content, documents, and retrieved instructions as untrusted input. The action policy should come from the trusted application boundary, not from the page.

### Post-condition verification

After an action, check the actual effect:

- confirmation message
- expected URL
- server response
- created record
- transaction ID
- downloaded file and checksum
- changed form status
- before-and-after state

A lost response after a write creates an ambiguous side effect. Reconcile the outcome before repeating the action.

### Recovery

- wait and re-observe
- close or handle a modal
- return to a known safe state
- reload
- re-authenticate
- use an alternative approved route
- ask the user
- hand over to a person
- stop

Realistic web benchmarks such as WebArena show why long-horizon browser tasks require functional post-condition evaluation rather than action-count optimism.

![Figure 8-5｜Browser / Computer-Use Agent Reference Loop](/images/the-atlas-of-agent-design-patterns-part-8/browser-agent-reference-loop.png)

## Recipe 5: high-risk enterprise automation

High-risk automation should not give a language model direct authority over a business transaction.

The safer pattern is:

```text
Request or Event
  -> Authenticate
  -> Authorise
  -> Agent Prepares Structured Proposal
  -> Deterministic Validation
  -> Risk Classification
  -> Approval Decision
  -> Transaction Service Executes
  -> Post-condition Verification
  -> Reconciliation and Audit
```

### The agent prepares a proposal

For a payment, the proposal may include:

- payee
- amount
- currency
- invoice
- account
- business reason
- requested execution time
- risk flags
- expected effect
- reversibility
- idempotency key

The agent may assemble evidence and explain the request. It should not silently become the transaction authority.

### Deterministic validation

Validate:

- schema
- amount range
- account ownership
- vendor status
- duplicate invoice
- permission
- policy
- business rule
- sanctions or compliance checks where applicable
- transaction limits
- required approvals

### Durable approval

An approval request should show:

- exact proposed action
- evidence
- before state
- expected after state
- risk
- reversibility
- alternatives
- expiry
- who may approve

When execution resumes, revalidate state. Approval for yesterday's account balance should not automatically authorise today's changed transaction.

### Transaction boundary

Use a deterministic service for the actual side effect.

Require:

- idempotency
- reconciliation
- transaction identifier
- least privilege
- rollback or compensating action where possible
- immutable audit record
- separation of duties for high-impact operations

### Security and governance

NIST's AI Risk Management Framework and current OWASP guidance both reinforce the need to manage risk across the lifecycle rather than treating model behaviour as the sole control boundary.

![Figure 8-6｜High-Risk Enterprise Automation Pattern](/images/the-atlas-of-agent-design-patterns-part-8/high-risk-enterprise-pattern.png)

## Recipe 6: long-running monitor

A long-running monitor repeatedly checks a condition and notifies only when a meaningful change occurs.

Examples:

- price threshold
- weather risk
- service outage
- new filing
- policy change
- job posting
- inventory return
- security event

### Reference flow

```text
Schedule or Event
  -> Load Cursor and Baseline
  -> Fetch Current Source
  -> Validate Source Health
  -> Normalise Observation
  -> Compare with Baseline
  -> Condition Met?
       no -> Update Health State and Stop Quietly
       yes -> Verify Change
            -> Deduplicate and Apply Cooldown
            -> Notify or Escalate
            -> Update Cursor and Alert History
```

### Persistent state

Store:

- source
- cursor
- baseline
- last successful check
- last attempted check
- last change
- last notification
- alert signature
- cooldown
- retry count
- health status
- policy version

### Event contract

A common event envelope such as CloudEvents can standardise identity, type, source, time, and correlation across event producers and consumers.

### No-change behaviour

When the condition is not met:

```text
Do not notify
```

Silence is part of the product contract, not a missing feature.

### Health monitoring

A monitor can fail silently while continuing to schedule runs.

Track:

- missed run
- stale last-success time
- repeated empty responses
- source schema change
- authentication expiry
- dead-letter messages
- clock or scheduler drift
- alert-delivery failure

### Notification policy

- severity
- recipient
- channel
- quiet hours
- cooldown
- acknowledgement
- escalation
- maximum reminders
- deduplication

### Stop and retention

Long-running systems need:

- expiry
- cancellation
- kill switch
- retention policy
- history compaction
- source-removal handling
- ownership transfer
- human escalation

## Per-run verifier, evaluation suite, and observability

These three mechanisms are often collapsed into "evaluation", but they operate at different scopes.

### Per-run verifier

Question:

> Did this run satisfy its contract?

Examples:

- citations support claims
- target tests passed
- transaction post-condition holds
- browser task reached the goal

### Evaluation suite

Question:

> Is this system version good enough to release or continue operating?

It may include:

- curated task set
- regression cases
- adversarial inputs
- permission tests
- prompt-injection tests
- failure and recovery scenarios
- cost and latency thresholds
- human-scored quality
- canary or shadow evaluation

### Observability

Question:

> What happened in live operation, and where is the system degrading?

Use traces, metrics, and logs. OpenTelemetry provides vendor-neutral conventions for telemetry and distributed tracing, but the application still needs domain-specific attributes.

Agent spans may include:

- request and trace ID
- route
- state transition
- model and prompt version
- tool
- policy decision
- evidence IDs
- retry or replan
- approval
- cost
- terminal outcome

A trace explains a run. It does not prove that the architecture is good. An evaluation score measures performance. It does not explain one production incident.

## Shared control contracts

Every recipe needs the following controls, although the values differ.

### Budget

Budgets can limit:

- model calls
- tool calls
- search queries
- browser actions
- test runs
- worker count
- wall time
- tokens
- monetary cost
- retries
- replans
- approval reminders

Use a global task budget plus per-component allocations.

### Timeout and cancellation

Define timeouts for:

- model call
- tool
- worker
- approval
- state
- workflow
- external source

Define what follows timeout:

- retry
- reconcile
- fallback
- partial result
- reassign
- human review
- terminal failure

### Idempotency and reconciliation

Any side-effecting operation should define:

- request identity
- duplicate detection
- outcome lookup
- safe repeat behaviour
- ambiguous-result handling
- compensating action

### Terminal outcomes

At minimum:

- completed
- failed
- partial
- pending
- blocked
- cancelled
- expired
- unsupported
- inconclusive
- requires human action

A system without a formal safe stop has only an expensive hope loop.

## Security boundaries for agentic systems

Agent security is not one prompt.

### Treat external content as untrusted

This includes:

- web pages
- documents
- email
- tool output
- retrieved memory
- user-uploaded files
- other agents' messages

Separate data from instructions and preserve source boundaries.

### Minimise agency

Give each executor:

- only the tools it needs
- the smallest data scope
- short-lived credentials
- resource limits
- explicit side-effect classes
- bounded delegation
- no hidden route to a more privileged tool

### Validate model output before execution

A model proposal that becomes SQL, code, an API call, or a transaction should pass through a typed parser, policy engine, and execution boundary.

### Protect memory and state

Untrusted content should not be able to write permanent memory, change policies, or rewrite the goal without validation.

### Prepare for incident response

Record enough to:

- suspend the workflow
- revoke credentials
- identify affected tasks
- replay safely
- correct memory
- notify owners
- preserve evidence

## Comparison of the six recipes

| Recipe | Primary uncertainty | Main execution structure | Strongest verification signal | Essential persistent data |
|---|---|---|---|---|
| Production RAG | Which evidence answers the query? | Pipeline with optional adaptive retrieval | Claim-to-source support and ACL | Query, source versions, citation map |
| Deep research | Which subquestions and sources close the evidence gaps? | Planner + task graph + outer state machine | Coverage, provenance, and conflict checks | Plan, evidence units, source lineage |
| Coding agent | Which repository change satisfies executable acceptance? | Stateful Generate-and-Test workflow | Tests, build, diff, reproducibility | Snapshot, patch, commands, results |
| Browser agent | Which safe action reaches the interface goal? | Bounded action loop + state machine | Functional post-condition | Browser state and action history |
| High-risk automation | May a proposed side effect proceed? | Proposal workflow + deterministic transaction service | Policy, approval, and reconciliation | Proposal, approvals, transaction ID |
| Long-running monitor | Has a meaningful change occurred? | Event or scheduled stateful workflow | Change verification and deduplication | Baseline, cursor, health, alert history |

These are starting points, not universal ratings. Cost and latency depend on implementation, scale, data, and the quality standard.

## Assembly order

Do not start by choosing a framework.

### 1. Define the contract

- desired outcome
- accepted evidence
- prohibited outcomes
- terminal states
- latency and cost envelope

### 2. Decide whether an agent is required

Use Direct or a fixed Pipeline when possible.

### 3. Map data and tools

- source of truth
- permissions
- side effects
- freshness
- availability
- trust boundary

### 4. Separate fixed and adaptive work

Hard-code stable logic. Add autonomy only where observations genuinely change the next useful action.

### 5. Choose the execution structure

- Pipeline
- Router
- State Machine
- DAG
- bounded action loop
- event-driven workflow

### 6. Define verification before generation

- schema
- evidence
- test
- post-condition
- policy
- human decision

### 7. Define state and memory

- what must be exact
- what may be summarised
- what persists
- what expires
- who may read or write

### 8. Apply identity and policy

- authorisation
- tool access
- data scope
- approval
- risk
- sandbox

### 9. Add budgets and stops

- calls
- time
- money
- retries
- replans
- concurrency
- terminal outcomes

### 10. Instrument and evaluate

- trace
- metrics
- audit
- replay
- offline evaluation
- security tests
- release gate
- rollback

Once these questions are answered, a framework becomes an implementation choice rather than an architecture substitute.

## Common anti-patterns

### Every request enters the most autonomous path

Simple work pays maximum latency, cost, and failure surface.

### Policy is written only in the prompt

The runtime still exposes the forbidden capability.

### Unauthorised data is filtered only after model exposure

The leak has already happened.

### The orchestrator stores progress in conversation prose

Precise state becomes lossy and difficult to resume.

### The verifier asks only another model whether the answer is correct

No executable or evidential signal exists.

### Runtime tracing is mistaken for evaluation

The team can see every wrong answer beautifully.

### Evaluation is performed only before launch

Model, prompt, tools, sources, and environment drift after release.

### Human approval shows no evidence or exact action

Approval becomes ceremonial button pressing.

### Side effects have no idempotency or reconciliation

Timeouts become duplicate writes.

### The coding agent changes tests to manufacture a pass

The acceptance mechanism has become part of the attack surface.

### Browser success means "the click happened"

No post-condition proves the task completed.

### Monitoring alerts on every run

The system produces notification fog instead of useful signal.

### Memory stores everything

Sensitive, stale, and unverified information becomes future context.

### There is no supported terminal failure

Every failure is converted into another attempt.

## Conclusion

Production agent architecture is the discipline of assembling autonomy around controls.

A mature system usually contains:

```text
Identity and Admission
  -> Router
  -> Durable Orchestration
  -> Bounded Execution
  -> Independent Acceptance

Surrounded by:
Policy · State · Memory · Evidence · Budget · Evaluation · Observability · Human Control
```

The six recipes emphasise different constraints:

- **Production RAG** controls evidence and access.
- **Deep research** controls decomposition, provenance, and coverage.
- **Coding agents** control executable changes and reproducibility.
- **Browser agents** control action in an uncertain interface.
- **High-risk automation** controls authority and side effects.
- **Long-running monitors** control time, change, silence, and health.

What earns a system the right to operate is not the number of agents or tools. It is whether the system can prove what it did, constrain what it may do, recover without duplicating harm, and stop with an accountable result.

Part 9 turns the series into a decision process:

> Given a real task, how should you choose the smallest architecture that satisfies its evidence, risk, and operational requirements?

## References

- [Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
- [Jimenez et al., *SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*](https://arxiv.org/abs/2310.06770)
- [Zhou et al., *WebArena: A Realistic Web Environment for Building Autonomous Agents*](https://arxiv.org/abs/2307.13854)
- [LangGraph Documentation, *Persistence*](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [LangGraph Documentation, *Interrupts*](https://langchain-ai.github.io/langgraph/concepts/breakpoints/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [CloudEvents, *A specification for describing event data in a common way*](https://cloudevents.io/)
- [NIST, *Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile*](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- [OWASP, *Top 10 for Large Language Model Applications*](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

## Series

| Part | Topic |
|---:|---|
| 1 | Beyond ReAct: A Six-Dimensional Map of LLM Agent Architectures |
| 2 | Agent Execution Paths: Direct Calls, Pipelines, Routers, State Machines, and DAGs |
| 3 | ReAct, Plan-and-Execute, Adaptive Planning, and HTN |
| 4 | From Single-Path Reasoning to Trees, Graphs, MCTS, and LATS |
| 5 | Verification, Recovery, and Self-Correction |
| 6 | Multi-Agent Architectures |
| 7 | Agent Memory |
| 8 | Production Agent Architectures in Practice |
| 9 | How to Choose an Agent Architecture |
| 10 | Implementing Agent Patterns with Modern Frameworks |
