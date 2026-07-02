---
title: "The Atlas of Agent Design Patterns Part 9 | How to Choose an Agent Architecture"
description: "A rigorous decision process for choosing the smallest agent architecture that satisfies task dynamics, evidence, risk, authority, recovery, memory, cost, and operational requirements."
date: 2026-07-01T13:58:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 9
---


The previous eight parts introduced the main building blocks:

- Direct, Pipeline, Router, State Machine, DAG, and event-driven workflows
- fixed decisions, bounded ReAct, Plan-and-Execute, adaptive replanning, and HTN
- single-path reasoning, sampling, ranking, trees, graphs, MCTS, and LATS
- retry, fallback, repair, verification, Generate-and-Test, and Reflexion
- single-agent and multi-agent organisation
- state, memory, external knowledge, and production controls

Knowing those names is not architecture.

Architecture is the decision process that turns a requirement into:

- an execution path
- a permission boundary
- an acceptance contract
- a recovery policy
- a state model
- an operational envelope
- a named owner

The goal is not to choose the most capable-looking pattern.

It is:

> Choose the smallest system that can satisfy the contract with sufficient evidence, control, and recoverability.

## Architecture selection is a constrained decision

A pattern should be added only when it resolves a real requirement.

Bad selection logic sounds like:

```text
The task is difficult
  -> add planning
  -> add tree search
  -> add multiple agents
  -> add long-term memory
```

A production decision should instead ask:

```text
What must be true for the task to count as complete?
What can change during execution?
Which actions have side effects?
Which evidence can verify success?
Which state must persist?
Which failures can be recovered?
What limits and authorities apply?
```

The architecture is the set of mechanisms required to answer those questions, not a collection of fashionable labels.

## Gate 0: define the contract before choosing a pattern

Before asking whether an agent is needed, define the job.

### Desired outcome

State the result in observable terms.

Weak:

```text
Research the market and produce a useful answer
```

Stronger:

```text
Compare three named products across eight required fields.
Use approved sources.
Mark missing information explicitly.
Disclose conflicts.
Produce a recommendation tied to the evaluation criteria.
```

### Acceptance evidence

Identify what can prove the result.

Examples:

- schema validation
- executable test
- source and citation support
- post-condition
- rule or solver
- authorised human judgement
- transaction record

A task with no credible acceptance signal is a poor candidate for high autonomy.

### Prohibited outcomes

Examples:

- unsupported claims
- unauthorised data access
- silent test modification
- duplicate payment
- external publication without approval
- permanent memory write from unverified content

### Terminal outcomes

Define more than success and failure:

- completed
- partial
- blocked
- pending
- unsupported
- inconclusive
- cancelled
- expired
- requires human action

### Operating envelope

Define:

- latency
- monetary cost
- model and tool calls
- retries and replans
- concurrency
- data residency
- availability
- retention
- human-response time

Selection begins with a contract, not a framework homepage.

## Gate 1: does the task need agentic adaptation?

An agent is not the default route.

### Use Direct when

- one bounded operation is enough
- all necessary information is in the input
- no dynamic tool selection is required
- the output can be checked directly
- risk is low or externally controlled

Direct may still include input validation, output schema, policy, and logging.

### Use a Pipeline when

- the steps are known
- order is stable
- each stage has a contract
- failures have predefined handling
- no observation requires a new strategy

```text
Upload
  -> Parse
  -> Validate
  -> Transform
  -> Store
```

### Add a Router when

- different requests require different paths
- data sources differ
- costs or risk classes differ
- some tasks should go to a person
- some requests are unsupported

A router must support:

- unknown
- ambiguous
- clarification required
- unsupported
- denied

### Add bounded agentic adaptation when

- the next useful action depends on a tool result
- the route cannot be enumerated reasonably
- the environment is partially observable
- local exploration is necessary
- the system may need to choose among approved tools

### Add durable state when

- the task may pause or resume
- approval is asynchronous
- execution is long-running
- retries and replans span process boundaries
- partial completion matters
- recovery after interruption is required

The key distinction is not "simple versus intelligent".

It is:

> Can the next useful action be determined safely before the current observation exists?

![Figure 9-1｜Do You Need Agentic Adaptation? Decision Tree](/images/the-atlas-of-agent-design-patterns-part-9/agent-need-decision-tree.png)

## Gate 2: map requirements into inspectable properties

Do not jump from a user story to an architecture label.

### Task dynamics

- single-step or multi-step
- fixed or observation-dependent
- branching
- loops
- dependencies
- parallelism
- event or schedule trigger
- pause and resume
- long-running duration

### Data and trust

- source of truth
- freshness
- version
- sensitivity
- tenant and user scope
- external or internal
- structured or unstructured
- untrusted-content boundary
- retrieval or live access

### Tools and side effects

- read or write
- reversible or irreversible
- idempotent or non-idempotent
- deterministic or probabilistic
- permission level
- sandbox availability
- rate limit
- failure taxonomy
- reconciliation support

### Verification

- objective test available
- source support available
- post-condition available
- human judgement required
- false-positive cost
- false-negative cost
- partial completion allowed
- abstention allowed

### Operations

- latency ceiling
- cost ceiling
- throughput
- availability target
- observability
- reproducibility
- audit
- retention
- incident response
- kill switch

### Responsibility

- request owner
- system owner
- final completer
- approver
- data owner
- incident owner
- separation-of-duties requirement

These properties become architecture inputs.

## Select the execution structure first

Execution structure answers:

> How does work move through the system?

The options are composable, not mutually exclusive badges.

### Direct

Use for one bounded operation.

### Pipeline

Use for a stable sequence.

### Router

Use when different inputs need different paths.

### State Machine

Use when legal transitions, loops, waiting, recovery, or terminal states matter.

### DAG

Use when dependency-constrained tasks can run in parallel and later join.

A DAG does not provide a recovery loop by itself. An outer workflow may launch a new DAG after replanning.

### Event-driven workflow

Use when work begins from events, schedules, queues, or asynchronous changes.

A long-running monitor may combine:

```text
Event Trigger
  -> State Machine
  -> Fixed Pipeline
  -> Notification Gate
```

The question is not which one name describes the whole product. The question is which structures control each part.

## Add decision and planning only where needed

Decision strategy answers:

> How is the next action chosen inside the execution structure?

### Fixed decision logic

Use when the route and fallback are known.

### Bounded ReAct

Use when the next local action depends on the latest observation.

Required controls:

- step objective
- allowed tools
- maximum actions
- duplicate detection
- budget
- completion criteria
- escalation
- structured observations

### Plan-and-Execute

Use when:

- the task has several explicit deliverables
- omissions are costly
- dependencies matter
- progress must be visible
- delegation or budgeting matters

A plan must define executable step contracts, not restate the task.

### Adaptive replanning

Add it only when the remaining plan can become invalid.

Require:

- replan trigger
- plan version
- plan diff
- preserved completed work
- invalidated steps
- replan limit
- verifier approval

### HTN

Use when the domain has reusable, governed decomposition methods and primitive actions.

HTN is not simply a long checklist. It relies on domain tasks, methods, constraints, and operators.

Planning is a capability inside an architecture. It is not evidence that the architecture will work.

## Add multi-path search only when evaluation can guide it

Search answers:

> Should the system preserve and compare alternative candidates?

### Keep a single path when

- one candidate is usually enough
- external verification is strong
- latency matters
- the cost of the first choice is low

### Use self-consistency when

- there is one normalisable answer
- sample variance is a meaningful error source
- agreement can be computed
- factual verification still occurs separately

### Use Generate-and-Rank when

- several complete alternatives are useful
- a reliable evaluator can compare them
- invalid candidates are removed before preference ranking

### Use Beam Search when

- partial candidates develop by layers
- only a bounded frontier is affordable
- intermediate states can be scored

### Use Tree of Thoughts or another tree search when

- early choices strongly affect later outcomes
- intermediate states are meaningful
- pruning and backtracking are useful
- the evaluator is credible

### Use Graph of Thoughts when

- intermediate results must merge
- results must be reused
- dependency, invalidation, and provenance can be managed

### Use MCTS-style search or LATS when

- actions interact with an environment
- repeated visits and value updates are useful
- execution is sandboxed or reversible
- environment feedback reflects the real goal

Do not purchase a search tree before buying an evaluator. Otherwise the system grows branches without knowing where fruit lives.

## Define verification and recovery before increasing autonomy

Verification answers:

> What evidence can accept or reject the result?

Recovery answers:

> What is the smallest justified response to failure?

### Match evidence to the claim

| Claim | Preferred evidence |
|---|---|
| Output is structurally valid | Schema or parser |
| Code behaves correctly | Test, execution, build |
| SQL is permitted and valid | Parser, read-only policy, execution |
| RAG answer is supported | Claim-to-source verification |
| Browser task succeeded | Functional post-condition |
| Transaction completed once | Transaction record and reconciliation |
| Open-ended output is acceptable | Rubric and authorised judgement |

### Match recovery to the failure

| Failure | Primary response |
|---|---|
| Transient and safe to repeat | Retry |
| Input parameter is wrong | Parameter repair |
| Current implementation is unavailable | Fallback |
| Current artefact is wrong | Repair or Generate-and-Test |
| Evidence is missing | Retrieve, clarify, or abstain |
| Remaining plan is invalid | Replan |
| Policy denies the action | Deny or request approval |
| Capability or data does not exist | Stop or return unsupported |

A verifier must be able to fail, abstain, and return inconclusive. A recovery controller must be able to stop.

## Add multiple agents only for a real responsibility boundary

Organisation answers:

> Which independently addressable execution entities own the work?

### Default: one agent or one workflow

A single orchestration can still contain:

- planner stage
- executor stage
- critic stage
- verifier stage
- deterministic tools

Role names do not automatically create multiple agents.

### Supervisor and workers

Useful when:

- subtasks are naturally separable
- bounded parallelism helps
- workers need different tools or context
- a supervisor can assign and verify work
- one final owner integrates the result

### Debate and voting

These are decision protocols, not universal multi-agent upgrades.

Use debate when agents must challenge and update one another.

Use voting when independently produced choices can be aggregated.

Neither replaces external evidence.

### Blackboard

Use when several agents coordinate through typed shared problem state.

The blackboard needs:

- schema
- read and write permissions
- versioning
- conflict handling
- provenance
- scheduling
- final owner

### Peer-to-peer or swarm-style coordination

Use only when central coordination is genuinely inappropriate and the system defines:

- local rules
- task claiming
- convergence
- duplicate suppression
- global budget
- stop condition
- kill switch
- final accountability

Multi-agent is justified by responsibility and communication needs, not by the desire to show more avatars.

## Define state, memory, and external knowledge separately

### Workflow state

Exact control information:

- current step
- status
- attempts
- approvals
- plan version
- terminal outcome

### Working memory

Task-local intermediate information assembled for current reasoning.

### Episodic memory

Past events and outcomes that may help future tasks.

### Semantic memory

Governed stable knowledge.

### Procedural memory

Reusable methods, SOPs, tool rules, and acceptance procedures.

### User-scoped memory

User-authorised preferences or facts, with access, correction, deletion, and expiry.

### Shared memory

A coordination scope, not a cognitive type.

### External knowledge

A source of truth that may be retrieved when needed.

Do not create long-term memory when:

- the task is one-off
- the data is sensitive
- information expires quickly
- the source of truth can be queried
- consent is absent
- deletion cannot propagate

Memory selection must define source, scope, version, status, expiry, and write authority.

## Architecture selection gates and capability modules

A practical selection sequence is:

```text
1. Define contract and risk
2. Select the simplest execution structure
3. Add adaptive local decision only where observation requires it
4. Add planning only where global decomposition provides value
5. Add search only where evaluation can guide it
6. Add multiple agents only where responsibility boundaries justify coordination
7. Add memory only where future value exceeds governance cost
8. Apply identity, policy, budget, evaluation, observability, and human control
```

This is not a requirement to fill every category.

The output may legitimately be:

```text
Fixed RAG Pipeline
+ one bounded query-rewrite node
+ citation verifier
+ no multi-agent
+ no long-term memory
```

![Figure 9-2｜Architecture Selection Gates and Capability Module Sequence](/images/the-atlas-of-agent-design-patterns-part-9/architecture-selection-sequence.png)

## Replace the autonomy ladder with an autonomy budget

"Autonomy" is not one scalar property.

A system may be autonomous in query rewriting but completely restricted in data access and side effects.

Define autonomy across six dimensions.

### Action scope

- one transformation
- several approved tools
- arbitrary tool sequence
- cross-system operation

### Authority

- propose
- draft
- execute reversible action
- execute irreversible action
- delegate authority

### Duration

- one call
- one bounded session
- resumable task
- continuous monitor

### Reversibility

- no side effect
- reversible side effect
- compensatable side effect
- irreversible action

### Environment uncertainty

- fixed input
- stable API
- dynamic documents
- changing interface
- open environment

### External verifiability

- deterministic
- executable
- evidence-based
- rubric-based
- weak or delayed feedback

Higher impact does not always require less reasoning autonomy. It requires stronger constraints on authority, side effects, evidence, and approval.

A coding agent may explore freely inside a disposable branch while having no permission to merge.

A research agent may search widely within approved sources while having no permission to publish.

![Figure 9-3｜Six-Dimensional Autonomy Budget Matrix](/images/the-atlas-of-agent-design-patterns-part-9/autonomy-budget-matrix.png)

## Compare architectures with measured evidence, not universal scores

There is no universal table in which:

- Direct always has lower quality
- Multi-Agent always costs more by the same amount
- Adaptive Planning always reduces controllability
- RAG always has medium latency

Those properties depend on the implementation and task.

### Define required thresholds first

Examples:

- claim support at least 98%
- task success at least 90%
- critical policy violations equal 0
- p95 latency below 8 seconds
- average cost below a defined ceiling
- duplicate side effects equal 0
- human escalation below an acceptable rate

### Evaluate candidate architectures

For each candidate, measure:

- task success
- false pass and false fail
- evidence coverage
- policy violations
- latency distribution
- cost distribution
- retry and replan rate
- human-review load
- failure recovery
- operator effort

### Eliminate non-viable options

Any architecture that fails a hard safety or quality threshold is removed, even if it is cheaper.

### Choose among viable options

Use Pareto reasoning:

> Prefer an option when no alternative is both cheaper and better on all required dimensions.

Architecture A may be faster; Architecture B may be cheaper; Architecture C may recover better. The final choice depends on the contract and risk appetite.

### Re-evaluate after changes

Model, prompt, tools, data, policies, and environment drift.

Release evaluation should include:

- representative tasks
- regressions
- adversarial cases
- permission tests
- failure paths
- recovery paths
- cost and latency
- canary or shadow deployment

NIST's AI RMF and GenAI profile frame risk management across design, development, deployment, use, and evaluation. That is a lifecycle, not one launch-day scorecard.

![Figure 9-4｜Comparing Architectures with Measured Evidence](/images/the-atlas-of-agent-design-patterns-part-9/measured-evidence-comparison.png)

## The Agent Architecture Canvas

A complete design review should answer sixteen fields.

### 1. Goal and user value

What outcome matters?

### 2. Acceptance evidence

What proves completion?

### 3. Users, owners, and authority

Who requests, operates, approves, and owns the result?

### 4. Inputs, sources, and trust boundaries

Where does data come from, and which content is untrusted?

### 5. Tools and side effects

What can read, write, send, publish, pay, delete, or delegate?

### 6. Execution structure

Direct, Pipeline, Router, State Machine, DAG, bounded loop, or event-driven workflow.

### 7. Decision and planning

Fixed logic, bounded ReAct, Plan-and-Execute, adaptive replanning, or HTN.

### 8. Candidate search

Single path, sampling, ranking, tree, graph, or environment search.

### 9. Verification

Schema, test, evidence, post-condition, policy, rubric, or human judgement.

### 10. Recovery

Retry, parameter repair, fallback, repair, replan, escalation, and stop.

### 11. Organisation and final owner

One workflow, multiple agents, communication protocol, aggregator, and completer.

### 12. State and memory

What is exact, temporary, persistent, shared, versioned, or external?

### 13. Identity, policy, and risk

Permissions, data scope, sandbox, approval, and irreversible-action rules.

### 14. Budget, timeout, and terminal states

Limits, cancellation, expiry, partial outcomes, and safe stops.

### 15. Observability and evaluation

Trace, metrics, audit, replay, regression suite, and release gate.

### 16. Incident and rollback plan

How can the system be suspended, credentials revoked, memory corrected, and side effects reconciled?

Each field should record:

- decision
- rationale
- limit
- evidence
- owner
- unresolved risk

![Figure 9-5｜Agent Architecture Canvas (16 Fields)](/images/the-atlas-of-agent-design-patterns-part-9/agent-architecture-canvas.png)

## Go, Pilot, or No-Go

Release state should be evidence-based.

### Go

Appropriate when:

- acceptance criteria are explicit
- representative evaluations pass
- critical policy violations are zero
- permissions are least-privilege
- failure and recovery paths were tested
- state can resume safely
- observability and incident response are ready
- high-impact actions have durable approval and reconciliation
- remaining risks are accepted by the owner

### Pilot

Appropriate when:

- the core path works
- scope, users, data, and tools are restricted
- human monitoring remains active
- a fast kill switch exists
- some non-critical failure modes still need evidence
- rollback is simple
- the pilot has a defined exit decision and date

### No-Go

Required when:

- no credible verifier exists
- the system can produce irreversible harm without approval
- unauthorised data can reach the model
- side effects lack idempotency or reconciliation
- the task cannot persist or recover required state
- no budget or stop condition exists
- memory governance is undefined
- incident owners and kill switches are absent
- evaluation fails a hard threshold

"No-Go" is not a failed review. It is a working safety mechanism.

## Complete example: a blog Ask AI system

Requirement:

> Users ask questions about blog articles. The system answers from the site's articles with citations. It may rewrite a query when retrieval is weak, but it may not browse the open web or retry indefinitely.

### Contract

- answer only from the authorised blog corpus
- every material claim has a citation
- unsupported questions return insufficient evidence
- no open-web search
- no cross-tenant data
- bounded latency and retrieval cost

### Execution structure

```text
Admission and Router
  -> Fixed RAG Pipeline
  -> Claim-to-Evidence Verifier
  -> Answer / Clarify / Abstain
```

### Adaptive capability

One bounded rewrite decision:

```text
Low retrieval coverage
  -> rewrite once
  -> retrieve again
  -> stop
```

No general ReAct loop is needed.

### Search

- hybrid retrieval
- reranking
- source diversity
- no tree search
- no multi-agent debate

### Verification

- ACL
- citation coverage
- claim support
- document version
- answerability
- unsupported-claim count

### State

- original query
- rewritten query
- selected document IDs and versions
- citation map
- verifier result
- retry count
- terminal outcome

### Memory

No unrestricted long-term user or episodic memory is required.

### Policy

- blog corpus only
- retrieved content is untrusted data
- no external web access
- no unsupported claims
- no permanent memory write from a query

### Budget and stop

- maximum retrieval attempts: 2
- maximum rewrite: 1
- bounded context and answer tokens
- latency ceiling
- terminal insufficient-evidence state

### Organisation

One workflow is enough. Multiple agents would add hand-off and shared-state cost without solving a requirement.

### Release evidence

Evaluate:

- answer correctness
- citation support
- answerability classification
- permission isolation
- latency
- cost
- adversarial prompt-injection content
- insufficient-evidence behaviour

The resulting architecture is not "a full autonomous agent".

It is:

```text
Controlled RAG Pipeline
+ one bounded adaptive node
+ independent evidence verification
```

That is not a downgrade. It is architectural restraint doing useful work.

## Common anti-patterns

### Framework-first selection

A framework name appears before the task contract.

### Pattern shopping

Every named pattern is added because it exists.

### Agent as a binary label

The team argues whether the whole product is "an agent" instead of placing adaptive capability at specific nodes.

### Universal autonomy ranking

A pattern receives one fixed autonomy score independent of tools, permissions, and side effects.

### Universal cost-quality matrix

Illustrative estimates are treated as facts without benchmark data.

### Multi-agent inflation

Role labels are mistaken for independent agents.

### Search without an evaluator

More candidates are generated without a trustworthy selection signal.

### Memory without governance

Everything enters one vector store with no scope, status, expiry, or deletion.

### Human approval theatre

The reviewer sees an Approve button but not the exact action, evidence, impact, or expiry.

### Demo success becomes production readiness

One happy path replaces evaluation of failures, permissions, recovery, and incidents.

### Observability replaces evaluation

Every wrong decision has a beautiful trace.

### Evaluation replaces ownership

A high benchmark score is treated as authorisation to operate.

### No final owner

Several components produce work, but none owns completion.

## Architecture review checklist

### Contract

- [ ] Desired outcome is observable
- [ ] Acceptance evidence is defined
- [ ] Prohibited outcomes are defined
- [ ] Partial and unsupported outcomes are allowed
- [ ] Latency and cost envelopes are explicit

### Execution

- [ ] The simplest viable execution structure was considered
- [ ] Adaptive nodes are identified individually
- [ ] Every loop has a limit
- [ ] Pause, resume, and recovery are defined
- [ ] Terminal states are explicit

### Tools and authority

- [ ] Read and write capabilities are separated
- [ ] Least privilege is enforced outside the prompt
- [ ] Side effects define idempotency and reconciliation
- [ ] Untrusted content cannot change policy
- [ ] Irreversible actions require appropriate authority

### Verification and recovery

- [ ] The verifier can fail or abstain
- [ ] Objective signals are used where available
- [ ] Acceptance artefacts are protected
- [ ] Retry, repair, fallback, and replan are distinct
- [ ] Duplicate and no-progress conditions stop the loop

### State and memory

- [ ] Workflow state and memory are separated
- [ ] Every persistent record has source, scope, version, status, and expiry
- [ ] User and tenant isolation is tested
- [ ] Unverified content cannot write durable memory
- [ ] Update, supersede, delete, and audit are supported

### Operations

- [ ] Global and per-component budgets exist
- [ ] Timeouts and cancellation are defined
- [ ] Trace, metrics, and audit are available
- [ ] Offline and regression evaluation exists
- [ ] Incident response, kill switch, and rollback are ready

### Responsibility

- [ ] Final owner is named
- [ ] Approver authority is defined
- [ ] Separation of duties is applied where required
- [ ] Approval expires and state is revalidated
- [ ] Go, Pilot, or No-Go evidence is recorded

## Final principles

1. Start from the contract, not the framework.
2. Use the simplest execution structure that can satisfy the task.
3. Place autonomy only where observations genuinely change the next action.
4. Define verification before increasing autonomy.
5. Add search only when a reliable evaluator exists.
6. Add multiple agents only for real responsibility and communication boundaries.
7. Store memory only when future value exceeds governance cost.
8. Treat authority, side effects, and reversibility separately from reasoning capability.
9. Compare architectures with measured evidence and hard thresholds.
10. Make formal failure, abstention, and No-Go first-class outcomes.

## Conclusion

Choosing an agent architecture is not a taxonomy quiz.

It is a sequence of evidence-bearing decisions:

```text
Contract
  -> Simplest Execution Structure
  -> Necessary Adaptive Capability
  -> Verification and Recovery
  -> State and Memory
  -> Policy and Authority
  -> Budget and Stops
  -> Evaluation and Ownership
```

The best architecture is not the one with the most autonomy.

It is the one that, with the least necessary complexity, can complete the task, prove the result, limit its authority, recover safely, and stop under accountable control.

Part 10 moves from architecture selection to implementation:

> How should these patterns map onto modern frameworks without letting framework abstractions replace system design?

## References

- [Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
- [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629)
- [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601)
- [Zhou et al., *Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models*](https://arxiv.org/abs/2310.04406)
- [Wu et al., *AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation*](https://arxiv.org/abs/2308.08155)
- [NIST, *Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile*](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- [OWASP, *Agentic AI Threats and Mitigations*](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/)
- [LangGraph Documentation, *Persistence*](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [LangGraph Documentation, *Interrupts*](https://langchain-ai.github.io/langgraph/concepts/breakpoints/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

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
