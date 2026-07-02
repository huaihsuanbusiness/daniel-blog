---
title: "The Atlas of Agent Design Patterns Part 10 | Implementing Agent Patterns Without Framework Lock-In"
description: "A framework-aware but architecture-first guide to Native Code, LangChain and LangGraph, LlamaIndex Workflows, CrewAI, OpenAI Agents SDK, AutoGen, Semantic Kernel, and Microsoft Agent Framework."
date: 2026-07-02T09:00:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 10
bonus: true
last_reviewed: "2026-07-01"
---


> **Review baseline: July 1, 2026**
>
> This article intentionally discusses named frameworks. APIs, package names, deployment services, support status, and migration guidance can change. Recheck official documentation and pin tested versions before implementation.

The first nine parts focused on architecture patterns rather than products.

That separation matters:

- ReAct is not owned by one SDK.
- A state machine is not a feature checklist.
- Multi-agent is not a collection of personas.
- Memory is not a vector database.
- Human approval is not a callback.
- A checkpoint is not a business transaction.
- A trace is not an audit record.

Frameworks can reduce repeated engineering. They can also hide the architecture until the team can no longer explain what the system does without naming package classes.

The correct order is:

```text
Domain Contract
  -> Architecture and Control Pattern
  -> Framework or Runtime
  -> Infrastructure and Operations
```

Not:

```text
Framework
  -> Whatever the tutorial makes easy
```

This article compares the main implementation paths available in 2026 and shows how to keep domain state, tool contracts, verification, policy, and side effects outside framework-specific gravity wells.

## The framework question arrives after the architecture decision

A framework is useful when it provides an abstraction or runtime that the system genuinely needs.

Examples:

- durable state and resume
- an agent loop
- graph or event orchestration
- tool schemas
- handoffs
- streaming
- tracing
- human interruption
- multi-agent messaging
- provider integrations

A framework does not decide:

- which data the user may access
- whether an action is legally authorised
- what counts as completion
- whether a retry is safe
- which evidence supports a claim
- whether a side effect happened exactly once
- who owns the final result

Those are application and governance decisions.

## A four-layer implementation model

The previous version used three layers: patterns, frameworks, and infrastructure.

That model missed one layer that should be above all of them: the domain contract.

### Layer 1: domain and acceptance contracts

This layer defines:

- user goal
- domain state
- accepted evidence
- prohibited outcomes
- tool and side-effect contracts
- permissions
- terminal outcomes
- final owner

Examples:

```text
A research answer is complete only when every material claim has approved evidence.

A code repair is complete only when the required tests, build, and diff checks pass.

A payment is executable only after deterministic validation and authorised approval.
```

Framework types should not define these contracts.

### Layer 2: architecture and control patterns

This layer defines how the system behaves:

- Direct
- Pipeline
- Router
- State Machine
- DAG
- bounded ReAct
- Plan-and-Execute
- adaptive replanning
- Generate-and-Test
- Supervisor–Worker
- Verifier
- Human Approval
- Working Memory

A framework may implement several of these patterns. No single framework name explains which ones are present.

### Layer 3: framework, SDK, or workflow runtime

This layer supplies implementation primitives:

- Native Code or an existing workflow engine
- LangChain agents
- LangGraph
- LlamaIndex Workflows and AgentWorkflow
- CrewAI
- OpenAI Agents SDK
- AutoGen
- Semantic Kernel
- Microsoft Agent Framework

These products are not identical categories. Some provide a high-level agent loop. Some provide low-level orchestration. Some centre on data and retrieval. Some centre on teams. Some are migration paths inside a larger platform ecosystem.

### Layer 4: infrastructure and operations

This layer supplies:

- databases
- queues
- object storage
- sandboxes
- secret management
- policy enforcement
- deployment
- telemetry backends
- business audit
- backups
- incident response
- disaster recovery

A checkpointer API does not automatically provide tenant isolation, retention policy, backup recovery, or transactional side-effect safety.

![Figure 10-1｜Four-Layer Implementation Model: Domain, Architecture, Framework, Infrastructure](/images/the-atlas-of-agent-design-patterns-part-10/four-layer-implementation-model.png)

## Define framework-neutral contracts first

Framework portability does not come from wrapping every call in one generic interface.

It comes from owning the semantics that matter.

### Domain state

Define state in application terms:

```python
from enum import StrEnum
from pydantic import BaseModel, Field


class RunStatus(StrEnum):
    ADMITTED = "admitted"
    RETRIEVING = "retrieving"
    VERIFYING = "verifying"
    WAITING_FOR_APPROVAL = "waiting_for_approval"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


class ResearchState(BaseModel):
    task_id: str
    tenant_id: str
    original_query: str
    rewritten_query: str | None = None
    source_ids: list[str] = Field(default_factory=list)
    retry_count: int = 0
    plan_version: int = 1
    status: RunStatus = RunStatus.ADMITTED
```

The framework may serialise this state, but the business meaning belongs to the application.

### Tool port

```python
from typing import Protocol


class RetrieverPort(Protocol):
    async def retrieve(
        self,
        query: str,
        tenant_id: str,
        limit: int,
    ) -> list["SourceRecord"]:
        ...
```

Framework adapters can expose this port as:

- a LangGraph node dependency
- a LlamaIndex step dependency
- an OpenAI Agents SDK function tool
- a CrewAI tool
- an AutoGen tool
- a Microsoft Agent Framework function

### Verification result

```python
class VerificationResult(BaseModel):
    status: str
    failed_checks: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    required_action: str | None = None
```

Do not let every runtime invent a different meaning for `PASS`.

### Side-effect command

A side effect should be an explicit command:

```python
class SendEmailCommand(BaseModel):
    command_id: str
    recipient: str
    subject: str
    body_ref: str
    approved_by: str | None = None
```

The command boundary can enforce:

- idempotency
- permission
- approval
- validation
- audit
- reconciliation

Do not bury the write inside a conversational persona.

### Trace context

At minimum preserve:

- trace ID
- task ID
- user and tenant
- parent span
- model version
- prompt version
- framework version
- policy version
- state-schema version

Framework tracing may enrich this context. It should not own the identity model.

## Native Code and existing workflow engines

"Native Code" means ordinary application code, not an absence of architecture.

It may use:

- functions
- typed state
- database rows
- queues
- background workers
- retry libraries
- schedulers
- an existing workflow engine
- OpenTelemetry
- policy middleware

### Choose this path when

- the flow is small and explicit
- existing orchestration already satisfies durability
- business rules dominate model behaviour
- no open-ended agent loop is needed
- the team needs maximum control over state and side effects
- introducing a new runtime would duplicate existing capabilities

### Benefits

- low abstraction leakage
- direct tests
- explicit state transitions
- easier migration
- fewer framework-specific event types
- precise side-effect boundaries

### Responsibilities you still own

- persistence
- resume
- concurrency
- cancellation
- human approval
- streaming
- tool loop
- trace instrumentation
- state migrations
- deployment and scaling

The decision should not use an arbitrary number of steps or lines of code.

Use this test instead:

> Does a new runtime remove meaningful, repeated engineering without weakening control or duplicating infrastructure?

## LangChain agents and LangGraph

Current LangChain documentation positions LangChain agents as a higher-level agent abstraction and LangGraph as the low-level orchestration framework and runtime underneath advanced stateful workflows.

### LangChain agents

A suitable starting point when the requirement is primarily:

- a standard tool-using loop
- model and tool integration
- a prebuilt agent abstraction
- rapid implementation without designing every graph edge

Use it when the prebuilt loop matches the contract.

Move lower only when you need more explicit control.

### LangGraph

LangGraph is designed for long-running, stateful orchestration with:

- explicit nodes and edges
- durable execution
- persistence
- streaming
- human-in-the-loop interrupts
- deterministic and agentic steps in one graph

A useful mental model is:

```text
Application State
  -> Node
  -> State Update
  -> Conditional Transition
  -> Checkpoint
```

### Important persistence semantics

LangGraph checkpoints graph state. That does not make arbitrary side effects transactional.

Official interrupt guidance explicitly warns that side effects before an interrupt should be idempotent because a node may replay on resume.

Therefore:

- checkpoint before or after a write is not enough
- side effects need command identity
- resume must reconcile external state
- approval must be revalidated
- state schema needs migration planning

### Choose LangGraph when

- state transitions are central
- pause and resume are required
- approval interrupts are required
- deterministic and agentic nodes must coexist
- repair and replan loops are explicit
- graph-level control is worth the lower abstraction level

### Main risks

- graph spaghetti
- framework state leaking into domain state
- treating checkpoint replay as exactly-once execution
- assuming trace equals audit
- adding a graph where a fixed pipeline was enough

## LlamaIndex Workflows and AgentWorkflow

LlamaIndex remains strongly oriented toward data, documents, indices, retrievers, query engines, and RAG.

Workflows add an event and step model. AgentWorkflow adds single-agent and multi-agent orchestration inside the same ecosystem.

### Mental models

Workflow:

```text
Event
  -> Step
  -> New Event
  -> Another Step
```

AgentWorkflow:

```text
Agent
  -> Tool or Handoff
  -> Workflow State
  -> Structured Result
```

### Choose this path when

- retrieval and document abstractions are central
- the system already uses LlamaIndex
- data events drive the workflow
- agent steps need close access to retrievers and query engines
- structured output and evidence objects are first-class concerns

### Important boundary

A data framework is not the source-of-truth policy.

You still need to define:

- tenant filtering
- document permissions
- source lineage
- citation mapping
- version handling
- prompt-injection boundaries
- deletion propagation
- acceptance verification

### Migration lesson

LlamaIndex's older QueryPipeline documentation now points users toward Workflows for orchestration.

This is a useful reminder:

> Even within one ecosystem, preferred abstractions change. Keep the domain workflow independent of framework event classes.

## CrewAI: Crews and Flows solve different problems

CrewAI exposes two important abstractions.

### Crews

Crews are useful for:

- role-based collaboration
- bounded specialised tasks
- sequential or hierarchical processes
- rapid multi-agent experiments

### Flows

Flows are useful for:

- start, listen, and route control
- explicit state
- persistence and resume
- event-driven execution
- embedding a Crew inside a controlled workflow

### Recommended composition

```text
Flow controls the business process
  -> deterministic step
  -> bounded Crew for an open-ended subtask
  -> verifier
  -> continue or stop
```

Not:

```text
Every function
  -> another persona
  -> another conversation
```

### Choose CrewAI when

- role collaboration is the primary hypothesis
- the team needs to prototype that hypothesis quickly
- a Flow can maintain the outer control boundary
- worker output contracts and a final owner are explicit

### Main risks

- persona inflation
- hidden side effects inside tools
- unclear final ownership
- treating role labels as independent responsibility
- using expected-output prose instead of an executable acceptance contract

## OpenAI Agents SDK

The OpenAI Agents SDK provides a lightweight agent runtime with a small set of primitives, including:

- agents and runners
- function tools
- agents as tools
- handoffs
- guardrails
- sessions
- human-in-the-loop
- tracing

The SDK uses the Responses API by default for OpenAI models while owning the orchestration loop around turns, tools, guardrails, handoffs, and sessions.

### Choose it when

- a compact tool-using agent loop is sufficient
- manager and handoff patterns are clear
- built-in tracing is useful
- OpenAI models or hosted capabilities are already part of the stack
- a large graph runtime is unnecessary

### Guardrail scope matters

Guardrails are not a universal policy engine.

Current SDK documentation notes that handoffs follow a different path from ordinary function tools, and tool guardrails do not automatically apply to the handoff call itself.

Therefore:

- map every enforcement point
- keep business authorisation outside model instructions
- validate tool inputs at the execution boundary
- do not assume one guardrail covers all runtime paths

### Sessions are not a business workflow database

Sessions can support conversational context. A resumable regulated business process still needs:

- durable domain state
- state versioning
- approval records
- transaction reconciliation
- audit
- migration and incident handling

### Tracing is not audit

Built-in tracing records agent runs, tool calls, handoffs, guardrails, and custom events.

An audit record additionally requires:

- business meaning
- actor identity
- immutable retention
- legal and compliance fields
- evidence of approval
- side-effect outcome

Sensitive trace content also needs deliberate handling.

## AutoGen, Semantic Kernel, and Microsoft Agent Framework

Microsoft's framework landscape changed materially.

Official Microsoft documentation describes Microsoft Agent Framework as the direct successor to both AutoGen and Semantic Kernel, and currently labels it public preview.

That does not make existing systems obsolete overnight.

### AutoGen

AutoGen still provides:

- AgentChat
- Teams
- Swarm and other team presets
- Core
- event-driven messaging
- distributed runtime concepts
- code execution extensions

Choose it when:

- an existing AutoGen system is working
- research or multi-agent experimentation is central
- AgentChat or Core fits the existing architecture
- migration cost outweighs immediate benefit

For a new Microsoft-centred production system, perform an explicit comparison with Microsoft Agent Framework.

### Semantic Kernel

Semantic Kernel remains relevant for existing applications and integrations.

Use it when:

- the existing codebase depends on it
- current capabilities satisfy the contract
- migration creates no demonstrated value
- platform support and lifecycle fit the organisation

Do not rewrite a stable system solely because a successor exists.

### Microsoft Agent Framework

Microsoft Agent Framework combines:

- agent abstractions
- graph-based workflows
- session state
- type-safe routing
- checkpointing
- middleware
- telemetry
- human-in-the-loop
- MCP and provider integrations
- Python and .NET support

Choose it for evaluation when:

- the organisation is Microsoft or Azure centred
- graph workflows and agents need one ecosystem
- Python and .NET interoperability matters
- the team accepts preview risk

### Preview rule

A preview framework in a critical path needs:

- pinned versions
- adapter boundaries
- migration tests
- a pilot
- rollback
- checkpoint compatibility tests
- owner acceptance of support and change risk

![Figure 10-2｜Framework Fit by Pattern: Abstraction, Natural Fit, Verification Questions](/images/the-atlas-of-agent-design-patterns-part-10/framework-fit-by-pattern.png)

## Map one architecture onto several runtimes

Consider this requirement:

> Build a resumable blog research workflow. Route answerable questions directly. Otherwise retrieve approved articles. If evidence is weak, rewrite once. Publish only after citation verification. Otherwise abstain.

The architecture is:

```text
Admission and Router
  -> Retrieval Pipeline
  -> Bounded Rewrite
  -> Citation Verifier
  -> Complete or Abstain
```

### Native Code or existing workflow engine

Use:

- typed state
- database persistence
- explicit transition function
- retry counter
- queue or workflow job
- independent verifier

### LangChain agent

Use the prebuilt tool loop only for the bounded adaptive node.

Keep routing, retry limits, and final verification in application code.

### LangGraph

Use:

- explicit application state
- route node
- retrieval node
- rewrite node
- verifier node
- conditional edges
- checkpointer
- interrupt if approval is required

### LlamaIndex Workflows

Use:

- request event
- retrieval step
- evidence event
- rewrite event
- verification event
- Context or store
- LlamaIndex retriever and reranker

### CrewAI

Use a Flow for the outer process.

Use a Crew only if a bounded research subtask genuinely benefits from role collaboration.

### OpenAI Agents SDK

Use:

- application or router agent
- retrieval function tool or MCP
- bounded run control
- output and tool validation
- session where appropriate
- built-in tracing

Keep the rewrite count and citation contract in application state.

### AutoGen

Use AgentChat or Core only if their team or event model solves a real requirement.

A single-agent retrieval workflow does not need a team.

### Microsoft Agent Framework

Use:

- explicit workflow
- agent node only where adaptation is needed
- session state
- checkpointing
- middleware
- telemetry
- preview-risk controls

The architecture remains the same. Only the implementation vocabulary changes.

![Figure 10-3｜Same Architecture Across Multiple Runtimes](/images/the-atlas-of-agent-design-patterns-part-10/architecture-across-runtimes.png)

## Checkpoint, session, memory, transaction, and audit are different

These terms are commonly collapsed.

### Checkpoint

A saved execution state used for resume or replay.

### Session

A continuity boundary for conversational or agent-run context.

### Memory

Information intended to influence future reasoning or tasks.

### Transaction

A business operation with atomicity, consistency, idempotency, reconciliation, or compensation requirements.

### Audit record

An accountable record of who did what, under which authority, using which evidence, with what result.

A checkpoint can say:

```text
The workflow reached SEND_PAYMENT
```

It does not prove:

```text
The payment executed exactly once
```

A session can preserve messages. It does not prove that the state is safe to resume after a policy change.

### Safe side-effect pattern

```text
Workflow State
  -> Create Typed Command
  -> Validate Policy and Approval
  -> Execute with Command ID
  -> Persist External Result
  -> Reconcile
  -> Advance Workflow State
```

On resume:

```text
Look up Command ID
  -> Already completed?
       yes -> reuse result
       no  -> determine whether safe to execute
```

![Figure 10-4｜Checkpoint, Session, Memory, Transaction, and Audit: Boundaries and Safe Side-Effect Pattern](/images/the-atlas-of-agent-design-patterns-part-10/side-effect-and-transaction-contracts.png)

## Multi-agent implementation requires contracts, not avatars

Different runtimes can create several agents easily.

The hard part remains:

- task assignment
- context transfer
- output schema
- shared-state permission
- conflict resolution
- termination
- aggregation
- final ownership
- budget
- observability

### Supervisor–Worker contract

Supervisor input:

- goal
- task graph
- worker capability registry
- budget
- acceptance criteria

Worker output:

- status
- result
- evidence
- unresolved items
- cost
- side effects
- provenance

Aggregator output:

- merged result
- conflicts
- missing work
- acceptance status

### Handoff contract

A handoff should specify:

- reason
- target capability
- context subset
- permissions
- expected result
- return path
- stop condition

Broadcasting the entire conversation is not a neutral default.

### Framework mapping

- CrewAI expresses roles, tasks, crews, and flows.
- AutoGen AgentChat expresses teams and speaker or handoff patterns.
- AutoGen Core expresses event-driven actors.
- OpenAI Agents SDK expresses manager, agents-as-tools, and handoffs.
- LangGraph can model agents as graph nodes.
- LlamaIndex AgentWorkflow supports agent handoffs and agent-as-tool patterns.
- Microsoft Agent Framework combines agents and explicit workflows.

No runtime removes the need for a final owner.

## Decide between native orchestration and a framework

Do not use a fixed "three to five steps" rule.

### Prefer native code or the existing workflow platform when

- current primitives express the flow clearly
- durability is already solved
- the agentic portion is small
- the team can test and operate the workflow directly
- a new runtime would duplicate queue, state, or approval infrastructure
- framework-specific types would dominate the domain model

### Prefer a framework when

- it removes meaningful repeated engineering
- its state and resume semantics match the contract
- the agent loop is a real requirement
- human interruption is difficult to implement correctly
- graph, event, or team primitives improve clarity
- the runtime is observable and testable
- migration and lifecycle risks are acceptable

### Reject a framework when

- its abstraction obscures side effects
- its persistence cannot meet state requirements
- policy enforcement depends on prompts
- the team cannot test replay and resume
- the support status is incompatible with risk
- migration requires rewriting domain logic

![Figure 10-5｜Native Orchestration vs Framework Decision](/images/the-atlas-of-agent-design-patterns-part-10/native-vs-framework-decision.png)

## Choose frameworks by fit, not universal strength scores

A comparison table should not label one framework "very strong" in a capability without a shared benchmark.

Use qualitative fit questions.

| Option | Primary abstraction | Natural fit | Questions to verify |
|---|---|---|---|
| Native or existing workflow engine | Functions, jobs, state, queues | Small or business-dominant workflows | What must be built or operated manually? |
| LangChain agents | High-level agent loop | Standard tool-using agents | Does the prebuilt loop match the contract? |
| LangGraph | State, nodes, edges, checkpoints | Long-running stateful orchestration | Are replay and side effects safe? |
| LlamaIndex Workflows | Events, steps, context, data abstractions | RAG and data-centric workflows | Can domain contracts stay outside event types? |
| CrewAI | Crews, tasks, processes, flows | Role collaboration inside controlled flows | Is each role a real responsibility boundary? |
| OpenAI Agents SDK | Agent, runner, tool, handoff, guardrail | Lightweight tool and handoff runtime | Which paths are covered by guardrails and state? |
| AutoGen | AgentChat teams and event-driven Core | Existing systems, research, multi-agent experiments | What is the migration and lifecycle plan? |
| Semantic Kernel | Kernel, plugins, agents, enterprise integrations | Existing Microsoft applications | Is migration actually justified? |
| Microsoft Agent Framework | Agents plus graph workflows | New Microsoft-centred evaluation | Can preview change risk be accepted? |

The answer may be a mixed stack:

```text
Existing Workflow Engine
  + LangGraph for one complex stateful subflow
  + LlamaIndex retriever
  + OpenTelemetry
  + independent policy and audit
```

Framework purity is not an architecture requirement.

## Build framework-resilient code

### Keep domain models outside adapters

Do not expose framework Event, Message, RunContext, or Agent types across the domain boundary.

### Keep tool ports narrow

The application should depend on capabilities:

- retrieve evidence
- execute query
- run tests
- send approved message
- write validated record

Not on a framework's tool decorator.

### Keep verification independent

The verifier should accept domain artefacts and evidence, not framework transcripts.

### Keep policy outside prompts

Use:

- typed validation
- authorisation service
- tool gateway
- network and credential boundaries
- approval service
- deterministic transaction service

### Keep observability portable

Use application trace IDs and OpenTelemetry-compatible semantics where practical.

Framework traces can be linked as child spans or diagnostic artefacts.

### Keep event schemas versioned

Persisted events and checkpoints may outlive a framework version.

Store:

- schema version
- framework version
- migration version
- producer
- timestamp
- correlation ID

### Maintain a migration seam

For each framework dependency, record:

- why it exists
- what contract it fulfils
- what data it persists
- how to replace it
- how to export state
- how to replay tests
- who owns the migration

![Figure 10-6｜Framework-Resilient Production Architecture and Migration Seam](/images/the-atlas-of-agent-design-patterns-part-10/framework-resilient-architecture.png)

## Test framework semantics, not only business output

A workflow can produce the correct final answer and still be unsafe to operate.

### Unit tests

- domain state transitions
- tool validation
- verifier rules
- policy
- idempotency keys

### Contract tests

- framework adapter input and output
- provider replacement
- tool schemas
- event translation
- trace propagation

### Workflow tests

- normal path
- retry
- fallback
- repair
- replan
- pause and resume
- cancellation
- terminal states

### Replay and side-effect tests

- node replay
- duplicate command
- lost response
- resume after approval
- state migration
- partial checkpoint
- worker crash

### Security tests

- prompt injection
- tool escalation
- cross-tenant access
- secret exposure
- unsafe handoff
- memory poisoning
- unauthorised side effect

### Evaluation

- task success
- evidence support
- false pass and false fail
- latency
- cost
- human-review load
- recovery rate

### Upgrade tests

Before changing framework version:

- run golden set
- read release and migration notes
- load old checkpoints
- resume active workflows
- compare traces
- test rollback
- verify adapter compatibility

## Common implementation anti-patterns

### Framework-first architecture

The runtime is chosen before the contract.

### Framework type leakage

Domain logic depends on framework events and messages.

### Agent for every function

Deterministic steps are converted into conversational actors.

### Hidden side effects

Writes occur inside opaque tools or personas.

### Checkpoint equals transaction

Replay duplicates external operations.

### Session equals durable workflow

Conversation continuity is mistaken for resumable business state.

### Guardrail equals policy engine

One SDK hook is assumed to cover every execution path.

### Trace equals audit

Diagnostic telemetry is mistaken for accountable business evidence.

### Multi-agent by persona

Role names replace actual responsibility boundaries.

### Preview framework in an unprotected critical path

No adapter, pilot, rollback, or compatibility test exists.

### Tutorial code becomes production code

Authentication, tenancy, budgets, failure paths, security, and operations are absent.

### No exit strategy

The system cannot export state or replace the runtime.

## Production checklist

### Architecture

- [ ] Domain contract exists before framework selection
- [ ] Adaptive nodes are identified individually
- [ ] State, memory, session, and transaction are separated
- [ ] Side effects have explicit command boundaries
- [ ] Final owner is named

### Framework fit

- [ ] Required semantics are documented
- [ ] Official support status is recorded
- [ ] Tested versions are pinned
- [ ] Persistence and replay behaviour are tested
- [ ] Framework types do not dominate domain models
- [ ] A migration path exists

### Reliability

- [ ] Retry, repair, fallback, and replan are separate
- [ ] Every loop has a limit
- [ ] Checkpoint resume does not duplicate side effects
- [ ] Approval expires and state is revalidated
- [ ] Terminal outcomes include partial and unsupported

### Security

- [ ] Tool permissions are enforced outside prompts
- [ ] Untrusted content cannot change policy
- [ ] Cross-tenant access is tested
- [ ] Secrets are excluded or redacted from traces
- [ ] High-impact actions require appropriate authority
- [ ] Kill switch and incident response exist

### Testing and operations

- [ ] Adapter contract tests exist
- [ ] Failure and replay paths are tested
- [ ] Old checkpoints are included in upgrade tests
- [ ] Evaluation covers quality, cost, and latency
- [ ] Trace and business audit are separate
- [ ] Rollback has been rehearsed

## Final selection guidance

Use the following questions, not a universal leaderboard.

### Is an agent loop needed?

If no, use ordinary code, a pipeline, or the existing workflow engine.

### Is durable stateful orchestration the core problem?

Evaluate LangGraph, an existing workflow platform, or Microsoft Agent Framework if its preview status is acceptable.

### Is data and retrieval the core problem?

Evaluate LlamaIndex Workflows, possibly inside a broader orchestrator.

### Is role collaboration the main hypothesis?

Evaluate CrewAI, AutoGen, LlamaIndex AgentWorkflow, OpenAI Agents SDK handoffs, LangGraph nodes, or Microsoft Agent Framework against the same worker contracts.

### Is a lightweight tool and handoff runtime enough?

Evaluate OpenAI Agents SDK or a high-level LangChain agent.

### Is this an existing AutoGen or Semantic Kernel estate?

Compare staying, adapting, and migrating. "Successor exists" is not a sufficient business case.

### Is the system high risk?

Prefer the runtime whose semantics the team can prove through tests, replay, policy enforcement, incident response, and support commitments.

## Conclusion

Frameworks are leverage, not architecture.

A sound implementation owns:

```text
Domain State
+ Tool and Side-effect Contracts
+ Verification
+ Policy and Authority
+ Terminal Outcomes
+ Evaluation
+ Operational Ownership
```

The framework may supply:

```text
Agent Loop
+ Graph or Event Runtime
+ Checkpointing
+ Handoffs
+ Streaming
+ Tracing
+ Integrations
```

Infrastructure supplies:

```text
Persistence
+ Queue
+ Sandbox
+ Secrets
+ Deployment
+ Audit
+ Monitoring
+ Incident Response
```

The best framework is not the one with the longest feature list.

It is the one whose semantics match the architecture, whose lifecycle risk fits the task, and whose removal would not require rewriting the meaning of the system.

## References

- [LangChain Documentation, *LangChain overview*](https://docs.langchain.com/oss/python/langchain/overview)
- [LangGraph Documentation, *LangGraph overview*](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph Documentation, *Persistence*](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph Documentation, *Interrupts*](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [LlamaIndex Documentation, *Workflows*](https://docs.llamaindex.ai/en/stable/understanding/workflows/)
- [LlamaIndex Documentation, *AgentWorkflow and structured output*](https://docs.llamaindex.ai/en/latest/understanding/agent/structured_output/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [OpenAI, *Agents SDK*](https://openai.github.io/openai-agents-python/)
- [OpenAI Agents SDK, *Guardrails*](https://openai.github.io/openai-agents-python/guardrails/)
- [OpenAI Agents SDK, *Tracing*](https://openai.github.io/openai-agents-python/tracing/)
- [AutoGen Documentation](https://microsoft.github.io/autogen/stable/)
- [Microsoft, *Microsoft Agent Framework overview*](https://learn.microsoft.com/en-us/agent-framework/overview/)
- [Microsoft, *Agent Framework migration guides*](https://learn.microsoft.com/en-us/agent-framework/migration-guide/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

