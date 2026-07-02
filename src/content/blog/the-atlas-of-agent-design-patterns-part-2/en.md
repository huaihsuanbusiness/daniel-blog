---
title: "The Atlas of Agent Design Patterns Part 2 | Agent Execution Paths: Direct Calls, Pipelines, Routers, State Machines, and DAGs"
description: "A practical guide to the execution structures behind production agent systems, including direct calls, fixed pipelines, routers, state machines, DAGs, event-driven triggers, human approval, and behavior trees."
date: 2026-06-19T01:00:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 2
---

Part 1 introduced six practical design dimensions for agent systems. This article goes deeper into the first:

> How does a task move from its starting condition to a terminal outcome?

This sounds like a flowchart question. In production, it is also a reliability question.

An execution path determines:

- which nodes may run
- which nodes must run
- which branches may be skipped
- where state is persisted
- what happens after failure
- which work may run concurrently
- where human approval is required
- when the system is complete, failed, cancelled, or still waiting

Many systems become unnecessarily expensive because every request launches the full workflow. Others become impossible to debug because the model may jump anywhere at any time. A third group looks controlled on a diagram but has no defined recovery path once a tool times out or an approval never arrives.

Direct calls, pipelines, routers, state machines, and directed acyclic graphs solve different parts of this problem. They are not a ladder from primitive to advanced, and they are not mutually exclusive.

## Execution structure is not node-level intelligence

An execution structure describes the allowed movement of work through the system.

Node-level decision logic describes how one node chooses an action.

For example, a state machine may control the overall process while a research node uses bounded ReAct:

```text
START
 -> PLAN
 -> RESEARCH
 -> bounded ReAct chooses queries and tools
 -> VERIFY
 -> COMPLETE
```

A fixed pipeline may also contain a planning node:

```text
Normalize
 -> Plan
 -> Plan-and-Execute creates subtasks
 -> Retrieve
 -> Generate
 -> Validate
```

Calling something a "ReAct agent" therefore says little about its outer execution structure. ReAct may operate inside a direct tool-use step, a pipeline stage, a state-machine state, or one branch of a larger graph.

![Figure 2-1 — Execution Skeletons vs Node-Level Decisions](/images/the-atlas-of-agent-design-patterns-part-2/execution-skeletons-vs-node-decisions.png)

> **Figure 2-1｜Execution Skeletons vs Node-Level Decisions**  
> Outer execution structure and node-level decision logic are two separate layers that combine freely. Pipeline, Router and State Machine are outer structures; Fixed Rules and Bounded ReAct are node-level decisions.

## Five core execution structures

The five structures in the title answer different questions:

| Structure | Primary question |
|---|---|
| Direct | Can one bounded operation produce the result? |
| Pipeline | Are the required steps known in advance? |
| Router | Do different requests need different paths? |
| State machine | Must execution move through explicit states and conditional transitions? |
| DAG | Do tasks have directional dependencies that can branch and later join? |

Two related ideas sit around these structures:

- **Event-driven execution** determines what triggers work and how events move between services.
- **Human-in-the-loop** inserts a controlled pause, review, edit, or approval point.

They can wrap or appear inside any of the five core structures.

![Figure 2-2 — Five Execution Path Patterns at a Glance](/images/the-atlas-of-agent-design-patterns-part-2/five-patterns-comparison.png)

> **Figure 2-2｜Five Execution Path Patterns at a Glance**  
> Direct, Pipeline, Router, State Machine and DAG answer different questions. A common mistake is to force the whole system under a single label.

## Direct: use one bounded operation when one is enough

A direct path is the smallest useful execution structure:

```text
Input -> Model or Function -> Output
```

The key property is not "no tools ever". A direct path may include deterministic validation, preprocessing, post-processing, or one predetermined tool call. What it does not contain is an adaptive multi-step loop that decides, after each observation, what to do next.

### Good uses

- translation
- rewriting
- summarisation
- fixed-field extraction
- classification
- format conversion
- answering from information already supplied
- a known calculation through one predetermined function

### Why direct paths are valuable

They minimise moving parts. Latency, cost, and failure attribution are easier to understand. A direct path is often easier to evaluate because the contract between input and output is narrow.

A direct path may still use:

- input validation
- an output schema
- content or policy checks
- a timeout
- a token limit
- a fallback model
- deterministic post-processing

Direct does not mean careless. It means the system does not invent an orchestration problem where none exists.

### Common failure

A simple transformation is expanded into Planner -> Writer -> Critic -> Refiner because the team wants the feature to look "agentic". The result may cost four times as much without producing a reliably better output.

The first architecture question should therefore be:

> Can a single bounded operation solve this with the information and tools already determined?

When the answer is yes, Direct is usually the strongest baseline.

## Pipeline: predictable work in a predetermined sequence

A pipeline divides work into known stages:

```text
Rewrite -> Retrieve -> Rerank -> Generate -> Verify
```

The defining property is that the main sequence is predetermined by the application. Individual stages may use models, rules, databases, or tools, but the system is not freely redesigning the overall route during each run.

### Good uses

- retrieval-augmented generation
- document parsing and indexing
- extract-transform-load processing
- fixed review and formatting flows
- media processing
- classification followed by a known write operation
- batch processing with stable contracts

### Why pipelines work well in production

Each stage can have an explicit contract:

| Stage | Example contract |
|---|---|
| Rewrite | Preserve intent and return one normalised query |
| Retrieve | Return ranked source candidates with provenance |
| Rerank | Return a stable top set with scores |
| Generate | Use only supplied evidence |
| Verify | Return pass, fail, or review-required with reasons |

This makes it easier to measure latency, cost, error rate, and quality at the stage where the problem occurs.

### Pipelines are not always perfectly linear

A production pipeline may contain optional stages, guarded branches, or bounded retries. Once conditional movement, waiting, resumability, and several possible terminal outcomes become central, the system is better described as a stateful workflow or state machine.

The useful distinction is not whether the diagram has one branch. It is whether the overall control logic remains a predetermined processing sequence or is organised around explicit states and transitions.

### Common failures

- every request runs every stage
- several stages silently rewrite the same intent
- all stages use the largest model
- stage contracts are implicit
- only the final answer is logged
- a stage failure has no fallback or typed error path

A pipeline becomes trustworthy when each stage is observable and replaceable, not merely when arrows connect several boxes.

## Router: choose the path before paying for it

A router selects one or more downstream paths:

```text
Request
 -> Router
 -> Direct response
 -> Document retrieval
 -> SQL or analytics
 -> Calculator
 -> Bounded agent workflow
 -> Clarification or unsupported
```

The router's job is not necessarily to solve the request. Its job is to select the appropriate capability, data source, risk profile, or cost envelope.

### Routing signals

A router may consider:

- task type
- required source of truth
- user permission
- data sensitivity
- expected latency
- cost budget
- risk level
- required tool
- language or tenant
- whether several intents are present

### Router implementations

#### Deterministic router

Rules handle cases with crisp boundaries:

```text
approved arithmetic expression -> calculator
authorised account lookup -> SQL
question about indexed documents -> RAG
```

This is inexpensive and explainable.

#### Model-based classifier

A classifier or LLM assigns a route when language varies too much for simple rules. This improves coverage, but introduces uncertainty and version-sensitive behaviour.

#### Semantic router

Embeddings compare a request with route descriptions or examples. This is useful when boundaries are semantic, but close scores need an abstention rule.

#### Hybrid router

Hard safety and permission rules run first. A model handles the unresolved middle. The system then applies confidence thresholds and fallbacks.

This is often the most practical arrangement.

### A production router needs an escape path

A router should not be forced to choose a supported path for every input. It needs explicit outcomes such as:

- `unknown`
- `ambiguous`
- `unsupported`
- `need_clarification`
- `human_review`

It also needs an operational override when automated routing is wrong. That override should be logged, permission-controlled, and visible in traces.

### Multi-intent requests are not single-label classification

A request such as:

> Find last month's order decline, explain the likely causes, and draft an email.

contains data access, analysis, and writing. A router may first select a decomposition workflow rather than pretending that one label describes the whole task.

### What to log

- router input
- selected route
- routing policy version
- confidence or decision basis
- rejected alternatives
- fallback route
- permission and risk checks
- operator override, if any

![Figure 2-2A — Router Deep Dive: Criteria, Types, Risks, and Production Notes](/images/the-atlas-of-agent-design-patterns-part-2/router-deep-dive.png)

> **Figure 2-2A｜Router Deep Dive: Criteria, Types, Risks, and Production Notes**  
> Routing signals, implementation types (deterministic, model-based, semantic, hybrid), common risks, and the log and override discipline that production routers must keep.

## State machine: make progress and legal transitions explicit

A state machine represents a finite set of states and the transitions allowed between them:

```text
START
 -> RETRIEVE
 -> VERIFY_EVIDENCE
 -> enough evidence -> DRAFT
 -> insufficient and retries remain -> REWRITE_QUERY
 -> retry limit reached -> FAILED
 -> WAITING_FOR_APPROVAL
 -> approved -> EXECUTE
 -> rejected -> CANCELLED
 -> COMPLETED
```

The structure answers:

- where the system is now
- what transitions are legal
- which condition selects each transition
- what data must be persisted
- which states are terminal

Workflow engines such as AWS Step Functions expose explicit task and flow states, including choices, waits, maps, and parallel branches. They also distinguish retry behaviour from catch or fallback transitions. The broader lesson is architectural rather than vendor-specific: failure and waiting should be modelled, not left as comments beside a happy-path arrow.

### Core elements

#### State

A named phase of execution, such as:

- `PLANNING`
- `RETRIEVING`
- `VERIFYING`
- `WAITING_FOR_APPROVAL`
- `EXECUTING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

#### Transition

A permitted movement between states.

#### Guard or condition

A test that selects a transition:

- evidence is sufficient
- retry count is below the limit
- user approved
- budget remains
- policy check passed
- tool failed with a retryable error

#### Terminal state

A state that ends the current run. Production systems often need more than `success` and `failure`, for example `cancelled`, `partial`, `expired`, or `needs_manual_resolution`.

### Why state machines help

- bounded retries are explicit
- pause and resume are natural
- progress can be persisted
- approval states can be audited
- illegal transitions can be rejected
- recovery can resume from a checkpoint
- completion criteria are visible

### What a state machine does not guarantee

Drawing states does not automatically provide durability, exactly-once effects, or recovery. Those depend on the runtime, persistence layer, task design, and idempotency strategy.

A state machine may also support parallel branches, depending on the engine. This does not turn every state machine into a DAG, and it does not remove the value of modelling dependency-heavy parallel work as a DAG inside one state.

### Common failures

- every implementation detail becomes a state
- two guards can fire without a defined priority
- retryable and permanent failures are not distinguished
- there is no terminal state
- the state is stored only in model context
- approval resumes by rerunning earlier side effects
- a rejected action falls into the same path as a technical error

![Figure 2-3 — State Machine: Control, Recovery, Persistence, and Human Approval](/images/the-atlas-of-agent-design-patterns-part-2/state-machine.png)

> **Figure 2-3｜State Machine: Control, Recovery, Persistence, and Human Approval**  
> Four core elements: state, transition, guard, and terminal state. Persistence, pause and resume, bounded retry, multiple terminal outcomes, and audit all need to be modelled explicitly.

## DAG: express dependencies without cycles

A directed acyclic graph is a set of tasks connected by directional dependencies with no cycle in the graph:

```text
 -> Research A -
Problem -> Split -> Research B --> Synthesis -> Verify
 -> Research C -
```

The key property is dependency, not parallelism. Independent branches can run concurrently when the execution engine and resource limits allow it. Dependent nodes must wait for their prerequisites.

Apache Airflow describes a DAG as tasks organised by dependencies and relationships that determine how they should run. The graph itself defines execution order and dependency, while the work inside each task remains separate.

### Good uses

- multi-source research
- independent market or competitor analysis
- batch document processing
- test suites with shared prerequisites
- map-reduce style workloads
- fan-out tool calls followed by synthesis
- data and model evaluation pipelines

### A DAG is not automatically multi-agent

One process can execute every DAG node. One agent can launch several tools. Conversely, several agents can work sequentially in a state machine.

DAG describes task dependency. Multi-agent describes responsibility and communication.

### Acyclic does not mean "no retries"

A task may be retried by the execution engine without creating a graph cycle. The same node is attempted again under a retry policy.

What a DAG does not naturally represent inside one run is a semantic loop such as:

```text
Verify failed -> return to Research -> generate new branches -> verify again
```

That loop needs an outer state machine, a new DAG run, or another cyclic control structure.

### Parallelism needs limits

Fan-out can make a workflow slower or less reliable when all branches compete for the same bottleneck:

- API rate limits
- database connection pools
- model concurrency quotas
- browser capacity
- memory
- token or cost budgets

Use bounded concurrency, backpressure, per-resource limits, and cancellation rules. "Can run in parallel" is not the same as "should all start now".

### Join logic is part of the design

A synthesis node must define:

- whether all branches are required
- whether partial results are acceptable
- how timeouts are handled
- how duplicates are removed
- how conflicting evidence is resolved
- how provenance is preserved
- whether one failed branch cancels the run

![Figure 2-4 — DAG: Decompose, Run in Parallel, and Aggregate](/images/the-atlas-of-agent-design-patterns-part-2/dag.png)

> **Figure 2-4｜DAG: Decompose, Run in Parallel, and Aggregate**  
> Dependency-driven, cycle-free task graph. Parallel execution is bounded by resources, and join logic is part of the design itself.

## Pipeline, state machine, and DAG are different abstractions

| Question | Pipeline | State machine | DAG |
|---|---|---|---|
| Main abstraction | Processing stages | States and legal transitions | Tasks and directional dependencies |
| Typical movement | Predetermined sequence | Conditional, possibly cyclic | Dependency-ordered, acyclic within a run |
| Branching | Possible but usually limited | Central capability | Natural |
| Loops and replanning | Usually external or bounded | Natural | Requires an outer controller or a new run |
| Parallel work | Possible | Engine-dependent | Natural where dependencies allow |
| Pause and approval | Possible but awkward without state | Natural with persisted state | Usually handled by the execution platform or an outer workflow |
| Best fit | Stable transformation chain | Long-running, recoverable, conditional process | Fan-out, dependency-heavy, parallelisable work |
| Common risk | Rigid or wasteful stages | State explosion | Concurrency and join complexity |

These structures compose cleanly:

```text
Event
 -> Router
 -> State machine
 -> RESEARCH state launches a DAG
 -> VERIFY state evaluates the merge
 -> APPROVAL state waits for a person
 -> Output pipeline formats and publishes
```

The strongest architecture description names the layers instead of forcing the whole system into one label.

## Event-driven execution: define what starts the work

Event-driven architecture is primarily about triggers and message flow, not one specific workflow topology.

An event may come from:

- a webhook
- a new email
- a file upload
- a database change
- a scheduled time
- a price threshold
- a GitHub issue
- an external service callback

That event may trigger a direct handler, a pipeline, a state machine, or a DAG.

The CloudEvents specification exists because event producers and consumers benefit from a common event description. At minimum, production events need stable identity, source, type, and enough context to trace or reject them safely.

### Delivery realities

Distributed event systems often deliver at least once. A consumer may therefore see the same event more than once. Side-effecting handlers need idempotency so a retry does not send the same email, charge the same payment, or create the same record twice.

AWS's guidance on idempotent APIs captures the principle well: the desired effect should happen once even when a request is repeated as part of recovery.

Also plan for:

- out-of-order events
- late events
- poison messages
- dead-letter handling
- schema evolution
- correlation and trace IDs
- backpressure
- replay

Event-driven does not mean fire-and-forget. It means the lifecycle is distributed across messages and consumers, which makes observability more important.

## Human-in-the-loop: insert a governed control point

Human-in-the-loop is not a separate reasoning method or task topology. It is a control point that pauses execution for review, editing, clarification, or approval.

```text
Prepare action
 -> Persist state
 -> Human review
 -> approve -> resume
 -> edit -> resume with changes
 -> reject -> cancel or replan
 -> timeout -> expire or escalate
```

Good approval design shows the reviewer:

- the proposed action
- the evidence and source data
- the expected impact
- the risk
- whether the action is reversible
- the fields they may edit
- the consequence of approving or rejecting

A durable workflow must save enough state to resume without repeating earlier side effects. LangGraph's interrupt model is one example of pausing a graph, persisting state, and resuming later, but the underlying requirement is framework-independent.

Use human control for:

- irreversible or high-impact actions
- permission escalation
- public publication
- financial transfers
- destructive data operations
- production changes
- conflicting evidence
- policy exceptions
- cases where a person owns the final decision

Do not use a decorative Approve button that hides what will actually happen.

## Behavior trees: a related hierarchical control structure

Behavior trees organise switching logic as a hierarchy of reusable control and action nodes. They are widely used in games and robotics and can also describe reactive agent behaviour.

Common node types include:

- **Sequence:** run children in order until one fails
- **Fallback or Selector:** try children until one succeeds
- **Condition:** test whether a branch is applicable
- **Action:** perform work
- **Decorator:** modify a child's execution policy

Example:

```text
Fallback
 -> Return cached result if valid
 -> Sequence
 -> Retrieve
 -> Verify
 -> Generate
 -> Ask a human
```

Behavior trees are attractive when behaviours must be modular, hierarchical, and reactive. For many text-centric business workflows, a state machine remains easier for a mixed engineering and operations team to inspect. The right choice depends on the behaviour model, not on which diagram looks more sophisticated.

## Program generation is an execution technique, not a path topology

An agent may generate SQL, Python, shell commands, API calls, a DSL, or a workflow definition, then validate and execute that artefact:

```text
Request -> Generate program -> Validate -> Execute -> Inspect result
```

This can be highly reliable when the generated artefact has a real parser, policy checker, sandbox, or test environment.

It is useful to call this a **program-generating agent** or **code-as-action pattern**. It should not be treated as a sixth peer topology beside Pipeline or DAG. The generated program still executes through one of the structures described above.

Required controls include:

- sandboxing
- least privilege
- command or API allowlists
- read-only database policies where appropriate
- secret isolation
- time and resource limits
- output limits
- test or verification steps

## How to choose the execution structure

The following questions are deliberately stackable. They are not a claim that every system has one exclusive label.

### 1. Is work triggered by an external event?

Use an event-driven trigger and envelope. Then choose the workflow that processes the event.

### 2. Does the process contain high-impact or irreversible actions?

Insert human review or another policy gate at the relevant point. This is a control layer, not the entire workflow.

### 3. Can one bounded operation solve the task?

Start with Direct.

### 4. Do different requests require different capabilities or sources of truth?

Place a Router before the downstream paths.

### 5. Are the required stages known and stable?

Use a Pipeline as the baseline.

### 6. Does execution need persistent states, conditional transitions, pause and resume, bounded recovery, or several terminal outcomes?

Use a State Machine or durable stateful workflow.

### 7. Can the task be expressed as directional dependencies with independent branches and joins?

Use a DAG inside the relevant pipeline or state.

A practical selection flow for the primary skeleton is:

```text
Can one bounded operation solve it?
 yes -> Direct
 no -> Do request types need different paths?
 yes -> Router, then select the downstream structure
 no -> Do you need explicit persisted states, loops, waits, or approvals?
 yes -> State Machine
 no -> Do dependencies benefit from fan-out and join?
 yes -> DAG
 no -> Pipeline
```

This flow selects a useful starting skeleton. Event triggers, human gates, retries, verification, and tool policies still apply across it.

![Figure 2-5 — How a Router Sends Different Questions to Different Execution Paths](/images/the-atlas-of-agent-design-patterns-part-2/router-overview.png)

> **Figure 2-5｜How a Router Sends Different Questions to Different Execution Paths**  
> Match the request to an execution path: Direct, RAG, SQL, Calculator, Bounded Agent, or Clarify/Unsupported.

## Common execution-path anti-patterns

### Every request runs the most expensive workflow

Simple requests pay the latency and error surface of planning, retrieval, critique, and multiple agents.

### The LLM controls every branch

There is no allowlist, step limit, state constraint, budget, stop condition, or deterministic safety gate.

### The router must always guess

There is no abstention, clarification, unsupported, or human-review route.

### Retry means repeat the same side effect

A timed-out payment, email, deployment, or database write is retried without an idempotency key or outcome check.

### The state machine has no terminal states

The workflow circles among retry, verify, and replan because completion and exhaustion were never defined.

### The DAG fans out without a resource budget

Dozens of workers saturate APIs, model quotas, browser slots, and databases.

### Human approval contains no review context

The reviewer sees Approve and Reject but cannot inspect evidence, impact, or the exact action.

### "Programmatic agent" bypasses the execution boundary

Generated code is executed directly without parsing, permissions, sandboxing, or tests.

## Production controls that belong around every structure

| Control | Purpose |
|---|---|
| Trace and correlation ID | Reconstruct the end-to-end run |
| Persisted state | Resume safely after interruption |
| Typed errors | Separate retryable, permanent, policy, and user errors |
| Timeout and cancellation | Stop abandoned or stuck work |
| Bounded retry with backoff | Recover from transient failures without looping forever |
| Idempotency | Prevent repeated side effects |
| Fallback | Change method or resource after an appropriate failure |
| Budget guard | Limit model, tool, and concurrency cost |
| Tool and permission policy | Restrict available actions and data |
| Terminal outcomes | Define completed, failed, cancelled, expired, and partial |
| Audit log | Record who or what made each decision |
| Human control | Protect high-impact operations |
| Observability | Measure latency, errors, cost, route quality, and retries |

The point of an execution path is not to produce a prettier diagram. It is to make the system answerable:

- Where is this run now?
- Why did it take this route?
- What has already happened?
- Which operation failed?
- Is a retry safe?
- Who owns the next decision?
- What outcome ends the run?

## Conclusion

The five core structures solve distinct problems:

- **Direct** minimises orchestration when one bounded operation is sufficient.
- **Pipeline** makes a known processing sequence explicit and measurable.
- **Router** sends different requests to different capabilities and sources of truth.
- **State machine** governs persisted progress, legal transitions, waiting, recovery, and terminal outcomes.
- **DAG** expresses directional dependencies, fan-out, and joins without cycles inside one run.

Event-driven triggers and human approval operate across those structures. Behavior trees provide another hierarchical control model. Program generation is an execution technique that still needs one of the underlying workflow structures.

A mature system rarely has one label. A more useful description is:

```text
Cloud event
 -> permission-aware router
 -> durable state machine
 -> research DAG with bounded concurrency
 -> evidence verification
 -> human approval for publication
 -> deterministic output pipeline
```

Execution is not better because it is freer. It is better when the fixed parts, dynamic parts, recovery paths, and human boundaries are deliberate.

Part 3 moves to the next dimension:

> How does an agent decide what to do next?

It compares ReAct, Plan-and-Execute, adaptive planning, hierarchical planning, and the production hybrid that places flexible local execution inside a controlled outer workflow.

## References

- [AWS Step Functions, *Learn about state machines in Step Functions*](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-statemachines.html)
- [AWS Step Functions, *Handling errors in Step Functions workflows*](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [Apache Airflow, *DAGs*](https://airflow.apache.org/docs/apache-airflow/3.0.3/core-concepts/dags.html)
- [CloudEvents, *A specification for describing event data in a common way*](https://cloudevents.io/)
- [AWS Builders' Library, *Making retries safe with idempotent APIs*](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [Colledanchise and Ögren, *Behavior Trees in Robotics and AI: An Introduction*](https://arxiv.org/abs/1709.00084)
- [LangGraph Documentation, *Interrupts and human-in-the-loop workflows*](https://langchain-ai.github.io/langgraph/concepts/breakpoints/)

