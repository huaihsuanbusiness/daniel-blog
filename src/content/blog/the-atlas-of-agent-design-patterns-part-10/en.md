---
title: "The Atlas of Agent Design Patterns Part 10 ｜ Implementing Agent Patterns with Modern Frameworks: From Concept to Code Architecture"
description: "Comparing Native Code, LangGraph, LlamaIndex Workflows, CrewAI, OpenAI Agents SDK, AutoGen and Microsoft Agent Framework, and explaining how State Machine, RAG Workflow, Multi-Agent, Computer-use and Production Control Plane should be put into production."
date: 2026-07-01T15:23:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 10
bonus: true
last_reviewed: "2026-06-30"
---

# The Atlas of Agent Design Patterns Part 10 ｜ Implementing Agent Patterns with Modern Frameworks: From Concept to Code Architecture

## Implementing Agent Patterns with Modern Frameworks

> **Last reviewed: 2026-06-30**
> This is the only article in the series that intentionally depends on named Frameworks. Framework APIs, product names, deployment services and maintenance status can all change; recheck the official documentation before implementing.

The first nine articles deliberately avoided leaning on a specific Framework.

The reason is straightforward:

- ReAct does not belong to a single company
- State Machine does not belong to a single SDK
- Supervisor–Worker is not a product feature
- Working Memory is not a kind of database

These are architecture patterns.

Frameworks are the tools that put patterns into code.

The question to settle first:

> **Once you know which pattern you are implementing, which Framework should you pick, when should you skip the Framework, and how do you keep the architecture from being locked to a single Framework?**

---

# One-line definition

> **An Agent Framework is a collection of software abstractions, Runtime and tooling that implements and executes an Agent Pattern. It is not the architecture decision itself.**

For example, once you have decided the system needs:

```text
Router
  ↓
State Machine
  ↓
RAG Retrieval
  ↓
Agentic Research Node
  ↓
Verifier
  ↓
Human Approval
```

Only then does the Framework question arrive:

- Do you write State and Transition yourself, or hand them to LangGraph?
- Should Retrieval and Document Pipeline be centred on LlamaIndex?
- Does Multi-Agent really need CrewAI, AutoGen or Microsoft Agent Framework?
- Are Agent Loop, Handoff, Guardrail and Trace a fit for the OpenAI Agents SDK?
- Could the entire flow simply be plain Python?

![Figure 10-1 — Patterns, Frameworks, and Infrastructure](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-1-patterns-frameworks-infrastructure.png)

> **Figure 10-1 ｜ Patterns, Frameworks, and Infrastructure**
> Pattern defines how the system is designed; Framework provides implementation abstractions and Runtime; Infrastructure handles Queue, Database, Sandbox, Observability, Deployment and Security. The three layers cannot be confused with one another.

---

# 1. Build the right three-layer model first

## Layer 1: Architecture Patterns

This layer contains:

- Direct
- Pipeline
- Router
- State Machine
- DAG
- ReAct
- Plan-and-Execute
- Generate-and-Test
- Supervisor–Worker
- Verifier
- Working Memory
- Human Approval

It answers:

> How should the system operate?

## Layer 2: Framework and Runtime

This layer includes:

- Native Python
- LangGraph
- LlamaIndex Workflows
- CrewAI
- OpenAI Agents SDK
- AutoGen
- Microsoft Agent Framework

It answers:

> Which abstraction, Runtime and API do we use to implement it?

## Layer 3: Infrastructure and Operations

This layer includes:

- PostgreSQL
- Redis
- Vector Database
- Queue
- Object Storage
- Sandbox
- Secret Manager
- Trace Backend
- Policy Engine
- Audit Log

It answers:

> How is the system persisted, deployed, isolated, observed and operated?

## Three common mistakes

### Treating Framework as Pattern

```text
Our architecture is LangGraph.
```

This sentence carries too little information. Inside LangGraph, you can implement Pipeline, State Machine, ReAct, Plan-and-Execute and Human-in-the-loop.

### Treating Framework as Infrastructure

A Framework exposing a Checkpoint API does not mean backups, Tenant Isolation, Production Queue and Disaster Recovery are in place.

### Treating Tool Integration as Safety

The ability to call a Tool does not imply minimum permissions, Approval, Idempotency or Post-condition Verification.

---

# 2. The implementation map for 2026

This article compares seven implementation paths:

1. Native Code
2. LangGraph
3. LlamaIndex Workflows
4. CrewAI
5. OpenAI Agents SDK
6. AutoGen
7. Microsoft Agent Framework

They are not the same kind of product. Some lean toward Stateful Orchestration, some toward Data / RAG, some toward a Lightweight Agent Loop, some toward Multi-Agent, some toward the Microsoft Enterprise Stack.

A simple feature-checklist table does not settle the choice.

---

# 3. Native Code: the most underestimated option

Native Code means implementing the system with ordinary programming constructs:

- Function
- Class
- Enum
- Queue
- Database
- State Table
- Retry Library
- Background Worker
- HTTP API

For example:

```python
from enum import Enum
from pydantic import BaseModel


class Status(str, Enum):
    PLAN = "plan"
    RETRIEVE = "retrieve"
    VERIFY = "verify"
    COMPLETE = "complete"
    FAILED = "failed"


class TaskState(BaseModel):
    task_id: str
    status: Status
    retry_count: int = 0
    plan_version: int = 1
    last_error: str | None = None
```

Then ordinary control flow:

```python
def run_task(state: TaskState) -> TaskState:
    if state.status == Status.PLAN:
        return plan(state)
    if state.status == Status.RETRIEVE:
        return retrieve(state)
    if state.status == Status.VERIFY:
        return verify(state)
    return state
```

## Where it fits

- The flow is small
- The states are few
- The team does not want a new Runtime
- Business rules dominate Agent behaviour
- Maximum controllability is needed
- One Queue plus Database is enough

## Strengths

- Lowest abstraction overhead
- Easy to debug
- Few dependencies
- Easy to unit test
- Low migration cost

## Costs

You have to handle these yourself:

- Checkpoint
- Resume
- Event Streaming
- Human Interruption
- Trace
- State Migration
- Tool Loop

## Decision rule

> If twenty to fifty lines of clear ordinary code finish the job, do not introduce a new Agent Runtime first.

---

# 4. LangGraph: low-level, explicit, Stateful Orchestration

LangGraph's core position is a low-level Agent Orchestration Runtime.

It fits:

- State Machine
- Graph Workflow
- Long-running Agent
- Durable Execution
- Human-in-the-loop
- Checkpoint / Resume
- Explicit control over Node and Edge
- Deterministic plus Agentic Hybrid

## Mental model

```text
State
  ↓
Node
  ↓
Edge
  ↓
New State
```

A simplified skeleton:

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(AppState)
builder.add_node("route", route_request)
builder.add_node("retrieve", retrieve_documents)
builder.add_node("agent", run_agent)
builder.add_node("verify", verify_result)

builder.add_edge(START, "route")
builder.add_conditional_edges("route", choose_path)
builder.add_edge("retrieve", "verify")
builder.add_edge("agent", "verify")
builder.add_edge("verify", END)

graph = builder.compile(checkpointer=checkpointer)
```

## Where it fits best

- Router
- State Machine
- DAG-like Graph
- Plan-and-Execute
- Adaptive Replanning
- Human Approval
- Retry / Repair / Replan
- Long-running Workflow

## Strengths

- State is a first-class citizen
- Clear Node and Edge boundaries
- Fixed nodes and Agentic nodes can coexist
- Suited to Pause / Resume

## Costs

- Lower-level abstraction
- A Graph is not the same as a correct architecture
- The team must understand the difference between Checkpoint and Side Effect
- A large Graph can turn into another kind of spaghetti, only this time the noodles glow

## Who should pick it?

- Engineering teams that want explicit flow control
- Teams that already know what their State Machine looks like
- Long tasks, approval and recovery
- Teams that do not want to be boxed in by higher-level Persona abstractions

---

# 5. LlamaIndex Workflows: Event Workflow for Data-centric and RAG-centric work

LlamaIndex's strengths are tied to data, indices, Retrieval, Query Engine and RAG.

Workflows offers an Event and Step execution model.

## Mental model

```text
Event
  ↓
Step
  ↓
New Event
  ↓
Another Step
```

A simplified skeleton:

```python
from llama_index.core.workflow import (
    Workflow,
    step,
    StartEvent,
    StopEvent,
    Event,
    Context,
)


class RetrievedEvent(Event):
    nodes: list


class RAGWorkflow(Workflow):

    @step
    async def retrieve(
        self,
        ctx: Context,
        ev: StartEvent,
    ) -> RetrievedEvent:
        nodes = await retriever.aretrieve(ev.query)
        return RetrievedEvent(nodes=nodes)

    @step
    async def answer(
        self,
        ctx: Context,
        ev: RetrievedEvent,
    ) -> StopEvent:
        answer = await synthesize(ev.nodes)
        return StopEvent(result=answer)
```

## Where it fits best

- RAG Pipeline
- Query Routing
- Retrieval Retry
- Document Processing
- Event-driven Research
- Agent Workflow over Data
- Structured Output
- MCP-connected Data Tools

## Strengths

- Close to Retriever, Index, Query Engine, Document and Node abstractions
- Event Model suits data flows
- A fixed Retrieval Flow can carry an Agent or Tool Node inside

## Costs

- Not every piece of business work should be turned into data
- Too many Events become hard to trace
- Domain Models that depend directly on Framework Events carry a higher migration cost

## Who should pick it?

- RAG developers
- Knowledge Assistants
- Document Workflows
- Teams already deeply invested in LlamaIndex data components

---

# 6. CrewAI: Crews for collaboration, Flows for control

CrewAI has two different mental models.

## Crews

For:

- Role-based Agents
- Researcher / Analyst / Writer
- Sequential or Hierarchical Process
- Specialised Tools
- Collaborative Tasks

## Flows

For:

- Event-driven Workflow
- State
- Router
- Conditional Branch
- Persistence
- Resume
- Embedding a Crew inside a fixed flow

## The right combination

```text
CrewAI Flow
  ↓
Deterministic Steps
  ↓
One Crew for an Open-ended Subtask
  ↓
Verifier
  ↓
Continue Workflow
```

Not:

```text
Every Step
  ↓
Create Another Agent
```

## Strengths

- Agent, Task, Crew, Process are easy to grasp
- Flow keeps control, and Crew can be added at specific nodes
- Quick way to test whether role separation earns its keep

## Costs

- Persona can hide engineering responsibility
- Easy path to Multi-Agent Inflation
- Side Effect, Tool Permission and Final Owner need extra review

## Who should pick it?

- Teams prototyping role collaboration quickly
- Content, research and analysis work
- Teams that want Flow to govern the whole while Crew handles bounded autonomy

---

# 7. OpenAI Agents SDK: an Agent Runtime with few primitives

The OpenAI Agents SDK keeps its core primitives small:

- Agent
- Runner
- Tool
- Handoff / Agent as Tool
- Guardrail
- Session
- Tracing
- Human-in-the-loop
- Sandbox Agent

## Mental model

```text
Agent
  ↓
Runner
  ↓
Tool Calls / Handoff
  ↓
Guardrails
  ↓
Final Output
```

A simplified skeleton:

```python
from agents import Agent, Runner, function_tool


@function_tool
def search_blog(query: str) -> str:
    return retrieve_from_blog(query)


agent = Agent(
    name="Blog Assistant",
    instructions="Answer only from approved blog sources.",
    tools=[search_blog],
)

result = Runner.run_sync(
    agent,
    "What is the difference between RAG and memory?",
)
```

## Where it fits best

- Tool-using Agent
- Manager plus Agents as Tools
- Handoff
- Guardrail
- Session-based Working Context
- Traced Agent Run
- Sandbox Coding / Document Tasks
- Voice / Realtime Agent

## Strengths

- Few primitives
- Agent Loop is provided
- Handoff and Manager patterns are both expressible
- Built-in Trace

## Costs

- Not a complete Business Workflow Engine
- Guardrail scope must be understood precisely
- Provider and Hosted Tool choices need lock-in evaluation

## Who should pick it?

- Teams that want a Tool-using Agent quickly
- Teams already on OpenAI Models and Hosted Tools
- Teams that need Handoff, Trace and Session
- Teams that do not need a complex Graph, but also do not want to write the Agent Loop themselves

---

# 8. AutoGen: still usable, but its position in 2026 must be understood

AutoGen currently still ships:

- AgentChat
- Core
- Extensions
- Studio
- Teams
- Swarm
- Code Executor
- Distributed Runtime

AgentChat suits high-level Single / Multi-Agent; Core is a lower-level Event-driven Runtime.

## Where it fits

- Existing AutoGen 0.4+ projects
- Multi-Agent Research
- Agent Team Prototype
- Event-driven Agent Runtime
- Distributed Multi-Agent Experiment
- Docker Code Execution

## An important shift in 2026

Microsoft has positioned Microsoft Agent Framework as the direct successor to AutoGen and Semantic Kernel.

For new projects, decide first:

- Is there an existing AutoGen codebase?
- Is compatibility with existing Components required?
- Is this research or a prototype?
- Is the team open to evaluating Microsoft Agent Framework?
- Can the team absorb migration and API changes?

This does not mean AutoGen stops being usable tomorrow. Its documentation is still stable and its ecosystem is still alive, but any new Microsoft-centric Production project should treat the difference between AutoGen and Microsoft Agent Framework as a formal architecture decision.

---

# 9. Microsoft Agent Framework: the successor line to AutoGen and Semantic Kernel

Microsoft Agent Framework delivers two main capability areas:

- Agents
- Graph-based Workflows

It also integrates:

- Session-based State
- Type-safe Routing
- Checkpointing
- Middleware
- Telemetry
- Human-in-the-loop
- MCP
- Multiple providers
- Python and .NET

## Where it fits best

- Microsoft / Azure ecosystem
- Graph Workflow
- Multi-Agent Orchestration
- Session State
- Human Approval
- Middleware Policy
- Enterprise Telemetry
- Python plus .NET teams

## Strengths

- Workflow and Agent coexist
- Clear direction for enterprise integration
- Useful for evaluating the future of AutoGen / Semantic Kernel

## Main risks

- Still Public Preview
- API, features and deployment model may change
- Being inside the Microsoft ecosystem does not equal being safe by default
- A stable existing system should not be rewritten just because a new framework appeared

![Figure 10-2 — Framework Fit by Architecture Pattern](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-2-framework-fit-by-pattern.png)

> **Figure 10-2 ｜ Framework Fit by Architecture Pattern**
> Different Frameworks emphasise different things: LangGraph leans toward Stateful Orchestration; LlamaIndex Workflows toward Data / RAG; CrewAI toward Crew plus Flow; OpenAI Agents SDK toward a Lightweight Agent Runtime; Microsoft Agent Framework toward Agent plus Graph Workflow inside the Microsoft ecosystem.

---

# 10. Which Frameworks fit a State Machine?

## First priority: Native Code

If the states are few and the flow is fixed, plain Enum, Database and Function are the cleanest choice.

## Strong control: LangGraph

For:

- Explicit Node / Edge
- Conditional Routing
- Pause / Resume
- Checkpoint
- Long-running Task

## Data-centric: LlamaIndex Workflows

For:

- Event-driven Retrieval
- Document Processing
- RAG State
- Data Agent

## High-level hybrid: CrewAI Flows

For:

- Start / Listen / Router
- State Persistence
- Embedding a Crew inside a Flow

## Microsoft stack: Microsoft Agent Framework Workflows

For:

- Graph Workflow
- Type-safe Routing
- Checkpointing
- Human-in-the-loop
- Python / .NET

## Do not stop at "supports State"

The questions that actually matter:

- Is the State Schema under your control?
- Can the State be versioned?
- Does Resume replay Side Effects?
- Is state re-verified after Human Approval?
- Can the Checkpoint be migrated?

---

# 11. Which Frameworks fit a RAG Workflow?

## LlamaIndex Workflows

One of the most natural options, because data, Retriever, Index and Workflow live in the same ecosystem.

## LangGraph

Suited to complex Agentic RAG:

- Query Router
- Rewrite
- Multi-source Retrieval
- Retry
- Verifier
- Human Review

## Native Code

If the flow is just:

```text
Retrieve → Rerank → Generate → Verify
```

A plain Pipeline is often enough.

## CrewAI

Let Flow manage the RAG Pipeline, and let Crew handle Research or Synthesis.

## OpenAI Agents SDK

Use File Search, MCP or Function Tool and let the Agent decide when to retrieve. Strict Citation Mapping still requires an outer data layer and a Verifier.

---

# 12. Which Frameworks fit Multi-Agent?

## CrewAI

The most direct option for high-level role collaboration.

## AutoGen

Suited to AgentChat Teams, Selector Group, Swarm and Multi-Agent Research.

## Microsoft Agent Framework

Suited to new Microsoft-centric Multi-Agent Workflows, but Public Preview applies.

## OpenAI Agents SDK

Suited to Manager plus Agents as Tools, Handoff and a small number of Agents with clear collaboration.

## LangGraph

Suited to defining Supervisor–Worker yourself, so Multi-Agent is just Nodes inside a Graph.

## What really decides

The question is not "can we set up multiple Agents", but:

- Who handles Task Assignment?
- How is Context passed?
- What is the Worker Output Contract?
- Who resolves Conflict?
- Who is the Final Owner?
- How does it stop?

![Figure 10-3 — Workflow-Centric Frameworks](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-3-workflow-centric-frameworks.png)

> **Figure 10-3 ｜ Workflow-Centric Frameworks**
> LangGraph centres on State, Node and Edge; LlamaIndex Workflows centres on Event, Step and Context; CrewAI Flows centres on Start, Listen, Router and State. All three can do Workflows, but their mental models differ.

![Figure 10-4 — Multi-Agent Runtime Choices](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-4-multi-agent-runtime-choices.png)

> **Figure 10-4 ｜ Multi-Agent Runtime Choices**
> CrewAI emphasises Crew, Role and Task; AutoGen emphasises AgentChat, Teams and Event-driven Core; Microsoft Agent Framework combines Agent with Graph Workflow; OpenAI Agents SDK expresses collaboration through Handoff, Agents as Tools and a small set of primitives.

---

# 13. Which Frameworks fit Computer-use?

Computer-use is not a complete architecture. It is a high-risk, Observation-driven Tool Runtime.

The complete system still needs:

```text
State Machine
  ↓
Observe
  ↓
Policy Check
  ↓
Action
  ↓
Post-condition Verification
  ↓
Recover / Human Takeover
```

## LangGraph

Suited to putting Browser State, Action History, Retry and Human Takeover inside a Graph.

## OpenAI Agents SDK

Suited to using Agent Loop, Built-in Tool, Sandbox, Trace and Human-in-the-loop.

## AutoGen

Suited to research or prototyping with Code Executor, Agent Team and a tool Runtime.

## Microsoft Agent Framework

Suited to integrating Agent plus Workflow inside the Microsoft Stack, but Computer-use Policy and UI State still need to be handled manually.

## CrewAI

A Browser Tool can be put inside an Agent, but high-risk Transitions should be controlled by Flow.

## Principle

> Do not skip State, Approval, Duplicate Detection and Post-condition just because the Framework ships a Browser Tool.

---

# 14. How does the same task map onto different Frameworks?

Task:

> Build a resumable in-site research Agent: first decide whether the question can be answered Directly; otherwise retrieve articles; if evidence is insufficient, rewrite the Query at most once; output after the Citation Verifier passes, otherwise Abstain.

## Architecture pattern

```text
Router
  ↓
RAG Pipeline
  ↓
Bounded Rewrite
  ↓
Citation Verifier
  ↓
Complete / Abstain
```

## Native Code

Use Enum State, Python Function, Database Row and an Explicit Retry Counter.

## LangGraph

Use StateGraph, Conditional Edge, Checkpointer and a Verifier Node.

## LlamaIndex Workflows

Use Query Event, Retrieved Event, Verification Event, Context and Retriever / Reranker.

## CrewAI

Use Flow for the whole, an optional Research Crew for deep research, and a Verifier Step at the end.

## OpenAI Agents SDK

Use a Router Agent or Python Route, Retrieval Function Tool / MCP, Guardrail, Session and Trace. Strict control of the Rewrite Count should live in outer Python State.

## Microsoft Agent Framework

Use an Explicit Workflow, Agent Node, Session State, Checkpoint, Middleware and Telemetry.

---

# 15. Full Framework comparison table

| Option | Core mental model | Best fit | Stateful Workflow | RAG | Multi-Agent | Human-in-the-loop | Abstraction level | Main risk |
|---|---|---|---:|---:|---:|---:|---:|---|
| Native Code | Function + State + DB | Small fixed flow | Build it yourself | Assemble yourself | Build it yourself | Build it yourself | Lowest | Re-inventing Runtime |
| LangGraph | State + Node + Edge | Stateful Hybrid Workflow | Strong | Strong | Customisable | Strong | Low–Medium | Graph complexity |
| LlamaIndex Workflows | Event + Step + Context | RAG / Data Workflow | Medium–Strong | Very strong | AgentWorkflow | Buildable | Medium | Data abstraction leakage |
| CrewAI | Crew + Task + Flow | Role Collaboration | Flow supports | Medium | Very strong | Supported | High | Multi-Agent Inflation |
| OpenAI Agents SDK | Agent + Runner + Tool | Lightweight Agent Runtime | Session / Outer State | Tool-based | Handoff / Manager | Supported | Medium | Provider / Guardrail scope |
| AutoGen | AgentChat + Core | Existing Multi-Agent / Research | Core supports | Tool assembly | Very strong | Supported | Medium–High | Ecosystem shift and migration |
| Microsoft Agent Framework | Agent + Graph Workflow | Microsoft Enterprise Stack | Very strong | Integrable | Strong | Strong | Medium | Public Preview churn |

---

# 16. When does Native Code beat a Framework?

Use Native Code when:

- There are only three to five steps
- There is no real Agent Loop
- Resume is not needed
- Human Interruption is not needed
- Dynamic Graph is not needed
- Multi-Agent is not needed
- The team already has a mature Queue / Workflow System
- The Framework State Model collides with the Domain Model

Use a Framework when:

- Checkpoint / Resume is needed
- Complex Conditional Routing is needed
- Agent Loop is needed
- Trace integration is needed
- Human-in-the-loop is needed
- A Multi-Agent Pattern has to be tested quickly
- The Framework clearly reduces repeated engineering

![Figure 10-5 — Native Code or Framework?](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-5-native-code-or-framework.png)

> **Figure 10-5 ｜ Native Code or Framework?**
> Small fixed flows should stay on plain code; bring in a Framework only when the payoff of Checkpoint, Resume, Dynamic Routing, Agent Loop, Human Interruption or Multi-Agent Runtime exceeds the abstraction cost.

---

# 17. Code architecture that lowers Framework lock-in

Choosing a Framework that never changes is not the point. That kind of Framework does not exist.

The point is:

> Let Domain Logic not depend on every Framework type.

## Recommended layering

```text
Application API
  ↓
Domain Workflow
  ↓
Ports / Interfaces
  ↓
Framework Adapter
  ↓
Model / Tool / Storage Provider
```

## Domain State should be defined by you

```python
class ResearchState(BaseModel):
    task_id: str
    query: str
    rewritten_query: str | None = None
    retrieved_source_ids: list[str] = []
    retry_count: int = 0
    status: str
```

## Tool Contract should be independent

```python
from typing import Protocol


class RetrieverPort(Protocol):
    async def retrieve(
        self,
        query: str,
        tenant_id: str,
    ) -> list["SourceRecord"]:
        ...
```

Then build:

- LlamaIndexRetrieverAdapter
- LangGraphNodeAdapter
- OpenAIFunctionToolAdapter
- CrewAIToolAdapter

## Verifier should be independent

```python
class VerificationResult(BaseModel):
    passed: bool
    reasons: list[str]
    required_action: str
```

Do not let each Framework invent its own Pass / Fail shape.

## Trace Context should work across Frameworks

At minimum, keep:

- trace_id
- task_id
- user_id / tenant_id
- parent_span_id
- model_version
- prompt_version
- framework_version

## Side Effects should sit at explicit boundaries

For example:

- Send Email
- Write Database
- Deploy
- Purchase
- Delete

Do not bury them inside opaque Agent Personas.

![Figure 10-6 — Framework-Resilient Production Architecture](/images/the-atlas-of-agent-design-patterns-part-10/figure-10-6-framework-resilient-production-architecture.png)

> **Figure 10-6 ｜ Framework-Resilient Production Architecture**
> Domain State, Tool Contract, Verifier and Policy live outside the Framework; LangGraph, LlamaIndex, CrewAI, OpenAI Agents SDK, AutoGen or Microsoft Agent Framework only serve as Adapter and Runtime, lowering the cost of migration.

---

# 18. Framework selection decision tree

```text
Can ordinary code express the workflow clearly?
├─ Yes → Native Code
└─ No
 ↓
Is the core problem stateful orchestration?
├─ Yes → LangGraph or Microsoft Agent Framework
└─ No
 ↓
Is the core problem RAG or data workflow?
├─ Yes → LlamaIndex Workflows
└─ No
 ↓
Is role-based collaboration the main value?
├─ Yes → CrewAI
└─ No
 ↓
Do you need a lightweight tool-using agent runtime?
├─ Yes → OpenAI Agents SDK
└─ No
 ↓
Do you have an existing AutoGen system or research need?
├─ Yes → AutoGen, with migration review
└─ No → Revisit architecture requirements
```

---

# 19. Common implementation anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Framework-first Architecture | Tool chosen before the need is clear | Complete the Architecture Canvas first |
| Framework Type Leakage | Domain depends on Event / Message types | Build an Adapter |
| Agent for Every Step | Every Function wrapped as an Agent | Keep fixed steps as Functions |
| Hidden Side Effects | Writes hidden inside a Persona Tool | Dedicated Node + Approval Gate |
| Checkpoint Equals Transaction | Replay causes duplicate operations | Idempotency + Compensation |
| Framework Trace Equals Audit | Trace cannot satisfy business audit | Independent Audit Log |
| Multi-Agent by Persona | Role names pretending to be independent responsibility | Inspect Context, State, Permission |
| Preview Framework in Critical Path | Change hits the core flow directly | Pin Version + Adapter + Pilot |
| No Exit Strategy | Cannot migrate | Externalise Domain State and Contract |
| Copying Tutorial Architecture | Tutorial example used as Production | Add Security, Reliability, Cost, Scale |

---

# 20. Production notes

## Version pinning

Save:

- Framework Version
- Model Version
- Prompt Version
- Tool Version
- State Schema Version

## State migration

Before changing the State Schema, answer:

- Can the old Checkpoint still be read?
- What happens to currently running Tasks?
- Is a Migration Job needed?
- Can we Rollback?

## Timeout

Set separately for:

- Model Timeout
- Tool Timeout
- Node Timeout
- Workflow Timeout
- Approval Timeout

## Budget

Cap:

- Model Calls
- Tool Calls
- Search Calls
- Agent Turns
- Workers
- Replans
- Wall Time

## Evaluation

At minimum, split into:

- Unit Test
- Workflow Test
- Golden Set
- Failure-path Test
- Security Test
- Cost Regression
- Latency Regression

## Observability

Track:

- Route
- State Transition
- Tool Call
- Token
- Cost
- Retry
- Handoff
- Verifier Result
- Terminal State

## Human Approval

Approval Payload should at least include:

- Proposed Action
- Evidence
- Risk
- Before / After
- Reversibility
- Expiry

---

# 21. One-page cheat sheet

| Need | Prefer | Do not start with |
|---|---|---|
| Small fixed flow | Native Code | Pulling in a full Agent Runtime |
| Stateful Agent | LangGraph | Hiding State inside Conversation |
| Data / RAG Workflow | LlamaIndex Workflows | Turning every Retrieval into an Agent |
| Role Collaboration | CrewAI | A Crew with no Final Owner |
| Lightweight Tool Agent | OpenAI Agents SDK | Treating it as a full Business Workflow Engine |
| Existing AutoGen | AutoGen + Migration Review | Copying 0.2-era examples |
| New Microsoft build | Microsoft Agent Framework evaluation | Ignoring Public Preview risk |
| Computer-use | State Machine + Tool Runtime | Relying only on a Browser Tool |
| High-risk action | Native Policy + Approval + Audit | Writing permissions into Prompt |
| Framework uncertainty | Ports and Adapters | Letting Domain depend on Framework types |

---

# Conclusion of this article

Framework value:

- Reduces repeated engineering
- Provides Runtime
- Provides Agent Loop
- Provides State, Trace or Handoff
- Speeds up specific pattern implementation

Framework risk:

- Abstraction hides the real flow
- Domain gets pinned to types
- API changes fast
- Tutorials mistaken for Production architecture
- Multi-Agent role inflation
- Checkpoint mistaken for Transaction

The right order is therefore:

```text
Requirement
  ↓
Architecture Pattern
  ↓
State and Tool Contract
  ↓
Verifier and Policy
  ↓
Framework Selection
  ↓
Infrastructure and Operations
```

Not:

```text
Framework
  ↓
Whatever the Framework Makes Easy
```

The whole ten-article series can be wrapped in one final sentence:

> **Pattern tells the system how it should run; Framework is just the way to write that decision as code.**

---

# The Atlas of Agent Design Patterns — Series Index

| Part | Topic |
|---:|---|
| 1 | The six-dimension Agent architecture map |
| 2 | Execution Path |
| 3 | Decision and Planning |
| 4 | Reasoning and Search |
| 5 | Verification and Recovery |
| 6 | Multi-Agent Organisation |
| 7 | State and Memory |
| 8 | Production Agent Recipes |
| 9 | Architecture Selection |
| 10 | Framework Implementation Bonus |

---

# Figure-to-section mapping

| Figure | Formal title | Suggested filename |
|---|---|---|
| Figure 10-1 | Patterns, Frameworks, and Infrastructure | `figure-10-1-patterns-frameworks-infrastructure.png` |
| Figure 10-2 | Framework Fit by Architecture Pattern | `figure-10-2-framework-fit-by-pattern.png` |
| Figure 10-3 | Workflow-Centric Frameworks | `figure-10-3-workflow-centric-frameworks.png` |
| Figure 10-4 | Multi-Agent Runtime Choices | `figure-10-4-multi-agent-runtime-choices.png` |
| Figure 10-5 | Native Code or Framework? | `figure-10-5-native-code-or-framework.png` |
| Figure 10-6 | Framework-Resilient Production Architecture | `figure-10-6-framework-resilient-production-architecture.png` |

---

# Official documentation and review baseline

This article cross-checked Framework positioning against the following official sources on 2026-06-30:

- [LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [LlamaIndex Workflows Documentation](https://docs.llamaindex.ai/en/stable/understanding/workflows/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [AutoGen Stable Documentation](https://microsoft.github.io/autogen/stable/)
- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)

Framework status and APIs may change after publication. Recheck the official documentation and Migration Guide before implementing.
