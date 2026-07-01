---
title: "The Atlas of Agent Design Patterns Part 1 | Beyond ReAct: A Six-Dimensional Map of LLM Agent Architectures"
description: "A practical engineering map for analysing LLM agent architectures across execution path, decision and planning, reasoning and search, verification and recovery, agent organisation, and state and memory."
date: 2026-07-01T22:36:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 1
---

When teams discuss LLM agents, the first question is often:

> Should we use ReAct or Plan-and-Execute?

The question is reasonable, but it compares only one part of the system: **how the next action is chosen**.

A production agent may use ReAct inside a tool-execution node, a state machine to control the overall flow, a verifier to accept or reject results, memory to preserve progress, and a supervisor to coordinate specialised workers. These mechanisms do not compete for the same job. They operate at different architectural layers.

That distinction matters. If every agent-related term is placed in one comparison table, the result may look comprehensive while remaining impossible to implement. A useful architecture review must first separate the questions being answered.

This article introduces six practical design lenses:

1. **Execution path**: how the task moves from start to finish
2. **Decision and planning**: how the next action is selected
3. **Reasoning and search**: how candidate solutions are explored
4. **Verification and recovery**: how errors are detected and handled
5. **Agent organisation**: how responsibility is divided
6. **State and memory**: what information is preserved, where, and for how long

These six dimensions are a **working engineering model**, not a universal academic taxonomy. They are intentionally optimised for system design, product decisions, implementation reviews, and production operations.

## One system can contain many patterns

Consider a research agent:

```text
User request
 -> Router classifies the request
 -> Planner decomposes the research task
 -> Research worker searches and reads sources
 -> Verifier checks evidence and conclusions
 -> Replanner changes the remaining plan when evidence is insufficient
 -> Writer produces the final answer
```

The same system may contain all of the following:

- a **router** to select the path
- **Plan-and-Execute** to create a high-level plan
- **ReAct** within a worker that chooses tools from observations
- a **state machine** to control allowed transitions
- a **verifier** to check evidence, schema, or policy
- **Supervisor-Worker** coordination across specialised roles
- **working memory** to hold current findings
- **bounded retry** to cap repeated failures

Asking whether Router is “better” than ReAct is like asking whether a gearbox is better than a navigation system. They solve different problems.

![Figure 1-1 — Six Dimensions of Agent Architecture](/images/the-atlas-of-agent-design-patterns-part-1/01-six-dimensions-overview.png)

> **Figure 1-1｜Six Dimensions of Agent Architecture**  
> A single view of the six dimensions: execution path, decision and planning, reasoning and search, verification and recovery, agent organisation, and state and memory.

## The six-dimensional map

| Dimension | Question | Representative patterns |
|---|---|---|
| Execution path | How does the task move from start to finish? | Direct, Pipeline, Router, State Machine, DAG |
| Decision and planning | How is the next action selected? | ReAct, Plan-and-Execute, Adaptive Planning |
| Reasoning and search | How are multiple candidates explored? | Single-path, Self-consistency, Generate-and-Rank, Tree of Thoughts, Graph of Thoughts, LATS |
| Verification and recovery | How are errors detected, contained, and corrected? | Retry, Fallback, Critic, Verifier, Generate-and-Test, Reflexion |
| Agent organisation | Who owns each part of the work? | Single Agent, Supervisor-Worker, Debate, Blackboard, Swarm |
| State and memory | What information is retained, by whom, and for how long? | Working State, Episodic, Semantic, Procedural, User, Shared Memory |

An architecture can select several mechanisms within the same dimension. For example:

```text
Execution path State machine
Decision Plan-and-Execute + bounded ReAct
Reasoning Single-path by default; Generate-and-Rank for selected tasks
Verification Deterministic checks + citation verifier + bounded retry
Organisation Single agent with specialist tools
State and memory Working state + governed procedural memory
Governance Budget guard + tool allowlist + timeout + approval gates
```

This description is far more useful than “we built a ReAct agent”.

## Dimension 1: How does the task move through the system?

Execution path is the system’s control skeleton. It asks:

> Which nodes may run, in what order, under which conditions, and where does the system go after failure?

### Direct

A direct call is a single input-to-output operation:

```text
Input -> Model -> Output
```

It is often the best design for translation, rewriting, extraction, simple classification, and other one-shot transformations. If the task has no meaningful tool use, persistent state, branching, or multi-step recovery, an agent adds cost without adding capability.

### Pipeline

A pipeline uses a predetermined sequence:

```text
Rewrite -> Retrieve -> Rerank -> Generate -> Verify
```

Pipelines are attractive in production because each stage has a clear contract. Inputs, outputs, latency, cost, and failure rates can be measured independently. The trade-off is rigidity: every request may pass through steps it does not need.

### Router

A router selects one path from several alternatives:

```text
User request -> Router -> Direct answer
 -> RAG search
 -> SQL
 -> Calculator
 -> Agent workflow
```

Routing may depend on intent, permissions, risk, required tools, cost budget, latency target, or data sensitivity. Its value is often operational rather than cognitive: it prevents simple requests from launching the most expensive workflow.

### State machine

A state machine makes the current state and permitted transitions explicit:

```text
START -> RETRIEVE -> ENOUGH_EVIDENCE?
 yes -> ANSWER -> END
 no -> REWRITE_QUERY -> RETRIEVE
```

This is useful when a system needs resumability, approval gates, bounded retries, failure routing, or explicit stop conditions.

ReAct may choose the best local action. A state machine determines which actions are legal in the current state. One provides local judgement; the other provides traffic rules.

### Directed acyclic graph (DAG)

A DAG represents dependencies without cycles. Independent branches can run in parallel and merge later:

```text
Problem -> Decompose -> Research A --\
 -> Research B ----> Synthesis
 -> Research C --/
```

DAGs fit batch analysis, multi-source research, and workloads with parallelisable subproblems. Because a DAG is acyclic by definition, repeated correction loops need another mechanism, such as a surrounding state machine or a new graph run.

![Figure 1-2 — Direct, Pipeline, Router, State Machine, and DAG](/images/the-atlas-of-agent-design-patterns-part-1/02-execution-structures.png)

> **Figure 1-2｜Direct, Pipeline, Router, State Machine, and DAG**  
> Five execution path patterns, ranging from a single call through to parallel sub-task graphs.

## Dimension 2: How is the next action selected?

This is the layer where ReAct, Plan-and-Execute, and adaptive planning belong.

### ReAct

ReAct interleaves reasoning traces with actions and observations:

```text
Reason -> Act -> Observe -> Reason again
```

A search worker may query one source, inspect the result, discover that it is outdated, reformulate the query, and switch to official documentation. The next action depends on the latest observation.

ReAct is useful when tool results are difficult to predict in advance, such as web research, debugging, browser interaction, and API exploration. Its main production risk is unbounded flexibility. A reliable implementation needs a maximum step count, a tool allowlist, cost and time budgets, loop detection, and explicit completion criteria.

The original [ReAct method](https://arxiv.org/abs/2210.03629) interleaves reasoning traces with task-specific actions. It does not require a particular workflow boundary. In production, teams often **bound ReAct inside one workflow node** so that local tool use remains flexible while the surrounding process stays controlled. That boundary is an engineering choice, not part of the method’s definition.

### Plan-and-Execute

Plan-and-Execute establishes a high-level plan before executing its steps:

```text
Goal -> Build plan -> Execute steps -> Integrate result
```

It fits long-form research, multi-stage reports, and tasks where missing one requirement is costly. Planning improves global coverage, but a flawed initial premise can propagate through a perfectly executed plan.

### Adaptive planning

Adaptive planning revises the remaining plan after new evidence arrives:

```text
Build plan -> Execute one step -> Check result
 -> keep plan
 -> revise remaining steps
```

This is more than retrying. Retry repeats an action under roughly the same plan. Replanning changes what the system intends to do next.

### A common production hybrid

A practical design often combines the mechanisms:

```text
Planner creates a high-level plan
 -> Executor handles one subtask with bounded ReAct
 -> Verifier checks completion and quality
 -> Replanner changes the remaining plan when necessary
 -> State machine controls transitions and limits
```

![Figure 1-3 — Planner, ReAct Executor, Verifier, and Replanner](/images/the-atlas-of-agent-design-patterns-part-1/03-planner-react-executor.png)

> **Figure 1-3｜Planner, ReAct Executor, Verifier, and Replanner**  
> A high-level Planner hands work to a Bounded ReAct Executor, with a Verifier checking results and a Replanner adjusting the remaining plan.

## Dimension 3: How are candidate solutions explored?

Decision patterns choose the next action. Search patterns determine whether the system follows one candidate or explores several.

### Single-path reasoning

The system produces one main path. This is fast and inexpensive, and it is sufficient for most routine work. Its weakness is error propagation: an early mistake may distort everything downstream.

### Self-consistency

The original [self-consistency method](https://arxiv.org/abs/2203.11171) samples diverse reasoning paths and selects the most consistent answer. It can reduce decoding variance on tasks with a well-defined result, but agreement is not evidence by itself. Several candidates may repeat the same false premise.

### Generate-and-Rank

The system generates alternatives and scores them against explicit criteria:

```text
Generate A, B, C -> Score cost, risk, and quality -> Select or combine
```

The ranker is part of the architecture. If its criteria are vague or correlated with style rather than correctness, producing more candidates only creates a larger pile of confidently ranked errors.

### Tree of Thoughts

[Tree of Thoughts](https://arxiv.org/abs/2305.10601) represents intermediate problem-solving states as branches. The system can expand promising nodes, evaluate them, prune weak branches, and backtrack. It is most useful when partial solutions can be judged before a complete answer exists.

### Graph of Thoughts

[Graph of Thoughts](https://arxiv.org/abs/2308.09687) is more general than “a tree whose branches merge at the end”. Thoughts may depend on multiple predecessors, be transformed or aggregated, and participate in graph structures with richer dependencies and feedback. The useful mental model is that intermediate results may be recombined and reused, without assuming that every GoT system has the same topology.

### LATS and search over actions

[Language Agent Tree Search (LATS)](https://arxiv.org/abs/2310.04406) combines tree search with language-model actions, value estimates, self-reflection, and external feedback. More broadly, search-over-action methods propose actions, execute or simulate them, evaluate outcomes, preserve promising branches, and continue exploring. They are most useful when outcomes can be scored reliably, such as code tests, games, browser tasks with explicit goals, or other verifiable environments.

Search is not free. It increases model calls, tool executions, state volume, latency, and dependence on the evaluator.

![Figure 1-4 — Line, Tree, and Graph Search Structures](/images/the-atlas-of-agent-design-patterns-part-1/04-search-structures.png)

> **Figure 1-4｜Line, Tree, and Graph Search Structures**  
> From single-path reasoning through Self-consistency, Generate-and-Rank, Tree of Thoughts, Graph of Thoughts and LATS, the search structure becomes richer at every step.

## Dimension 4: How are errors detected and handled?

Action-taking and answer-checking are separate capabilities. A system that can call many tools may still have no reliable way to recognise failure.

### Retry

Retry repeats an operation after a transient failure such as a timeout, rate limit, or temporary format error. It needs backoff, a hard limit, a timeout, and an escalation path. Repeating an unchanged action after a deterministic failure usually reproduces the same failure.

### Fallback

Fallback changes the method or resource: a backup model, alternative API, cached result, or degraded mode. It improves availability, but the fallback may provide lower quality or weaker guarantees.

### Critic

A critic produces qualitative feedback, such as missing requirements, weak arguments, unsupported claims, or hidden risks. It is useful for revision, but it may not provide an enforceable pass/fail result.

### Verifier

A verifier checks output against a defined contract: schema, tests, evidence, policy, permissions, or numerical invariants. A good verifier has observable criteria and a clear decision boundary.

A convenient distinction is:

- **Critic:** What should be improved?
- **Verifier:** Does this satisfy the acceptance criteria?

### Generate-and-Test

Generate-and-Test runs the output in an external or deterministic test environment:

```text
Generate -> Run test -> Pass?
 yes -> Accept
 no -> Inspect failure -> Revise -> Test again
```

It is especially valuable for code, SQL, data transformations, API calls, builds, and deployments. The model’s confidence is not the test result.

### Reflexion

The original [Reflexion method](https://arxiv.org/abs/2303.11366) uses verbal feedback and an episodic memory buffer so that later attempts can benefit from earlier failures. A production system may extend this by validating lessons, attaching provenance, versioning rules, expiring stale guidance, and promoting only reliable lessons into procedural memory.

That production extension should not be confused with the original research method. Writing every self-critique into permanent memory is dangerous: an incorrect lesson can poison future runs.

![Figure 1-5 — Verification and Recovery Patterns](/images/the-atlas-of-agent-design-patterns-part-1/05-verification-paths.png)

> **Figure 1-5｜Verification and Recovery Patterns**  
> Retry, Fallback, Critic, Verifier and Generate-and-Test each carry different cost, scope, and responsibility boundaries.

## Dimension 5: How is responsibility organised?

Agent organisation defines responsibility, communication, and integration. More agents do not automatically produce a better system.

### Single Agent

One agent plans, uses tools, executes, checks, and responds. It is inexpensive and easy to debug. For many tasks, a well-bounded single agent with clear state and verification is enough.

### Supervisor-Worker

A supervisor decomposes the task, delegates work, tracks progress, and aggregates results. Workers should return structured results to the supervisor or a dedicated aggregator. If workers write directly to the final answer without an integration owner, contradictions and missing requirements become difficult to control.

### Debate

In a true debate pattern, agents respond to one another’s claims over one or more rounds before a moderator, judge, or synthesis step resolves the disagreement. Independent proposals followed by a judge are better described as **panel-and-judge**. Either structure can reveal blind spots, but internal agreement is not external verification. The judge may share the same bias or lack the evidence needed to distinguish a persuasive error from a correct answer.

### Blackboard

Agents communicate through shared structured state rather than passing an entire conversation. This can reduce context duplication and support asynchronous work, but it requires schemas, write permissions, provenance, and conflict handling.

### Swarm

A swarm uses peer-to-peer or locally coordinated interactions rather than a fixed central supervisor. It may suit dynamic or distributed environments, but it introduces duplicated work, cyclic hand-offs, unclear accountability, and weak stop conditions. A system with a permanent central coordinator is usually better described as supervisor-led, even if workers communicate laterally.

Multi-agent is an organisational choice, not a maturity level. A single-agent design can be highly autonomous; a multi-agent workflow can be tightly controlled.

![Figure 1-6 — Agent Organisation Patterns](/images/the-atlas-of-agent-design-patterns-part-1/06-organisation-patterns.png)

> **Figure 1-6｜Agent Organisation Patterns**  
> Responsibility and integration boundaries across Single Agent, Supervisor-Worker, Debate, Blackboard and Swarm.

## Dimension 6: What information is retained?

Context, state, memory, and RAG are related but not interchangeable.

### Context

Context is what the model can currently see: instructions, conversation, retrieved chunks, tool results, and scratch data inside the active context window.

### Workflow state

State records where the system is: current node, completed steps, retry count, pending approvals, worker status, and next transition. Context concerns model visibility; state concerns execution progress.

### Working memory

Working memory supports the active task with intermediate findings, current subgoals, temporary summaries, and unresolved questions. It may be stored outside the model context and selectively injected when needed.

### Long-term memory by content type

- **Episodic memory**: events and outcomes from previous runs
- **Semantic memory**: relatively stable facts and concepts
- **Procedural memory**: validated rules about how to perform a task

These are content categories. They should not be mixed with ownership or deployment scope.

### Memory by scope and ownership

- **User memory**: preferences and durable user-specific constraints
- **Shared memory**: information available to several agents or processes
- **Organisation memory**: governed knowledge and procedures shared across a wider system

Scope determines who may read or write the memory. It also changes privacy, access control, deletion, and conflict-resolution requirements.

### RAG

[Retrieval-augmented generation (RAG)](https://arxiv.org/abs/2005.11401) retrieves external knowledge on demand and conditions generation on the retrieved material. In an agent system, the source should retain its own provenance, permissions, and update lifecycle. Retrieval may supply context, but a retrieved document does not automatically become agent memory.

Every persistent memory system needs governance: provenance, timestamp, version, confidence, permissions, conflict handling, update rules, and forgetting or deletion.

![Figure 1-7 — Context, State, Memory, and RAG](/images/the-atlas-of-agent-design-patterns-part-1/07-context-state-memory-rag.png)

> **Figure 1-7｜Context, State, Memory, and RAG**  
> Context, State, Memory and RAG each cover a different scope; long-term memory further splits by content type and ownership.

## Workflow, agentic workflow, and autonomous agent

These terms do not have one universally accepted boundary. The following definitions are practical engineering conventions.

| Property | Workflow | Agentic workflow | Autonomous agent |
|---|---|---|---|
| Main path | Predetermined | Mostly controlled | Chosen dynamically |
| Local autonomy | Low | Selective | High |
| Predictability | High | Medium to high | Lower |
| Debugging difficulty | Low | Medium | High |
| Cost predictability | High | Medium | Lower |
| Typical production fit | Excellent | Often the best compromise | Use when the task justifies it |

An agentic workflow keeps the main process controlled while granting autonomy inside selected nodes. For example, the workflow may fix the order `Route -> Research -> Verify -> Answer`, while the Research node independently chooses queries and tools.

Selective autonomy is often a strong production compromise: keep the main path controlled, and grant discretion only where rules are genuinely difficult to predefine and outcomes can still be verified.

## Autonomy and system control are separate concerns

More autonomy can increase adaptability, but it often reduces predictability. The relationship is not a simple maturity ladder.

Autonomy and control are best treated as independent axes, not as a numbered maturity ladder. Exact placement depends on implementation. A deterministic router may be highly controlled; a learned router with broad tool access may be less predictable. Plan-and-Execute can be tightly bounded or nearly autonomous.

![Figure 1-8 — Agent Autonomy and System Control](/images/the-atlas-of-agent-design-patterns-part-1/08-autonomy-controllability-spectrum.png)

> **Figure 1-8｜Agent Autonomy and System Control**  
> Autonomy and controllability are independent axes; an Agentic Workflow usually sits in the practical compromise band between them.

## How to describe a complete architecture

Instead of saying “we use ReAct”, describe the system through explicit choices:

| Concern | Example choice |
|---|---|
| Execution path | Router plus stateful workflow |
| Planning | Fixed path for simple requests; Plan-and-Execute for complex requests |
| Tool execution | Bounded ReAct inside selected nodes |
| Candidate exploration | Multi-query retrieval plus Generate-and-Rank where justified |
| Verification | Deterministic schema checks, citation checks, and bounded retry |
| Organisation | Single agent with specialist tools; supervisor only when decomposition requires it |
| State and memory | Durable workflow state plus governed procedural memory |
| Governance | Tool allowlist, budget guard, timeout, approval gates, audit trail |

This gives an architecture review something concrete to debate:

- Which paths are fixed?
- Where may the model choose actions?
- What evidence is required for acceptance?
- What is the retry and replan limit?
- Which tools and data may be accessed?
- Where is state persisted?
- How are cost, latency, and risk bounded?

## Six questions for evaluating a new agent pattern

When a new paper, framework, or product name appears, ask:

1. Does it change the execution path?
2. Does it change how the next action is selected?
3. Does it explore several candidates or trajectories?
4. How does it verify results and recover from failure?
5. Does it introduce a new ownership or collaboration pattern?
6. What state, knowledge, or experience does it persist?

Then ask four operational questions that cut across all six dimensions:

- What are the budget and stop conditions?
- What is observable and testable?
- Where are permissions and human approval enforced?
- Who owns the final outcome when components disagree?

If a new name cannot answer any of these questions, it may be packaging rather than a distinct architecture.

## Conclusion

ReAct is useful, but it is not an entire agent architecture. It primarily describes an interaction pattern between reasoning, action, and observation. A complete system must also define its flow, search strategy, verification, ownership, information boundaries, and operational controls.

The six dimensions provide a reusable map:

```text
How does the task move?
How is the next action selected?
How are alternatives explored?
How is the result verified and recovered?
Who owns each part of the work?
What information is retained, and under whose control?
```

Once those questions are answered, architecture names become easier to compare and much harder to misuse.

## Primary references

- [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629)
- [Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171)
- [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601)
- [Besta et al., *Graph of Thoughts: Solving Elaborate Problems with Large Language Models*](https://arxiv.org/abs/2308.09687)
- [Zhou et al., *Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models*](https://arxiv.org/abs/2310.04406)
- [Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366)
- [Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401)
