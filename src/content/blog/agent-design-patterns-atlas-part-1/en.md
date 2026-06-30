---
title: "Agent Design Patterns Atlas Part 1 ｜ Beyond ReAct — A Six-Dimensional Map of LLM Agent Architectures"
description: "Map the common LLM agent design patterns into six dimensions: execution path, decision and planning, reasoning and search, verification and recovery, agent organisation, state and memory. After reading, you do not need to memorise every name like ReAct, Plan-and-Execute, ToT or Reflexion — you need to know how to ask, when you meet a new framework, which layer it actually changes."
categories: ["ai"]
tags: ["ai", "agent", "design-patterns", "architecture", "llm"]
date: 2026-06-30T01:56:00
featured: false
series: "Agent 設計模式圖鑑"
seriesOrder: 1
---

When people talk about LLM agents, the first question is often:

> Should the agent use ReAct, or Plan-and-Execute?

The question is not wrong. It is just too narrow.

Because in a complete agent system, ReAct may only decide the next action based on tool results; a state machine controls the overall flow; a verifier checks whether the result passes; memory persists state and experience; a supervisor distributes work across several workers.

These solve problems at different layers of the stack.

If you line all those terms up in one comparison table and ask which is "the best one", you usually get a conclusion that looks complete and yet cannot be put into production.

That is the most common barrier when people try to understand agent architecture: there are a lot of names, but the axes of classification have not been separated first.

This article draws a map. It puts the common agent design patterns into six dimensions:

1. how the task flows from start to end
2. how the agent decides the next action
3. how the agent searches across multiple candidate solutions
4. how the agent detects mistakes and recovers
5. how the work is divided — one agent or several roles
6. how state, knowledge and experience are preserved

After reading this, you do not need to memorise every name. More importantly, when you meet a new agent framework, paper or product name, you can judge which layer it actually changes.

---

## Why does one agent system have so many names?

Consider a simplified research agent:

```text
user asks a question
 ↓
Router classifies the query type
 ↓
Planner breaks down the research task
 ↓
Research Worker searches and reads sources
 ↓
Verifier checks sources and conclusions
 ↓
re-plan if evidence is insufficient
 ↓
Writer composes the final answer
```

That single system can include:

- **Router** for routing by query type
- **Plan-and-Execute** to break the task into steps before acting
- **ReAct** so a worker decides the next tool based on what it just observed
- **State Machine** to track which phase the task is in
- **Verifier** to inspect sources, format or answer quality
- **Supervisor–Worker** to dispatch several specialised roles
- **Working Memory** to hold current findings and progress
- **Bounded Retry** to cap how many times a step may retry before failing

These patterns do not conflict. They are more like the different systems on a car:

| Vehicle question | Matched concept |
| --- | --- |
| how the body is classified | SUV, saloon, estate |
| which powertrain is used | petrol, electric, hybrid |
| how gears change | manual, automatic |
| how power reaches the road | front-wheel drive, rear-wheel drive, four-wheel drive |
| what driver assistance is fitted | adaptive cruise, lane centring, auto parking |

Ask "which is better, an SUV or a hybrid?" and you cannot answer. They are not on the same axis.

Agent architecture is the same. ReAct describes the cadence of decision; a state machine describes flow control; Multi-Agent describes how work is divided; memory describes how information is preserved.

Only after the axes are separated do comparisons become meaningful.

---

![Figure 1-1｜Six Dimensions of Agent Architecture](/images/agent-design-patterns-atlas-part-1/01-six-dimensions-overview.png)

> **Figure 1-1｜Six Dimensions of Agent Architecture**
> A complete agent system can combine patterns from all six dimensions simultaneously. These are not mutually exclusive choices — they are design layers that work together.

---

# The six dimensions

This article uses the following six dimensions to organise the common agent patterns.

This is not the only academic classification possible; it is a working model biased towards engineering design, product judgement and system selection.

| Dimension | Question it answers | Common patterns |
| --- | --- | --- |
| Execution path | How does the task move from start to end? | Direct, Pipeline, Router, State Machine, DAG |
| Decision and planning | How does the agent decide the next action? | ReAct, Plan-and-Execute, Adaptive Planning |
| Reasoning and search | How does the agent explore multiple candidate solutions? | Single-path, Self-consistency, Generate-and-Rank, Tree of Thoughts, Graph of Thoughts, LATS |
| Verification and recovery | How does the agent know it is wrong, and what then? | Retry, Fallback, Critic, Verifier, Generate-and-Test, Reflexion |
| Agent organisation | One agent does the whole job, or several roles cooperate? | Single Agent, Supervisor–Worker, Debate, Blackboard, Swarm |
| State and memory | What does the agent remember, and for how long? | Working Memory, Short-term State, Episodic Memory, Semantic Memory, Procedural Memory, User Memory, Shared Memory |

A system can pick one or several patterns inside each dimension.

For example:

```text
Execution path        : State Machine
Decision              : Plan-and-Execute + ReAct
Reasoning             : Single-path
Verification          : Verifier + Bounded Retry
Organisation          : Single Agent
Memory                : Working Memory + Procedural Memory
```

This description says more about the architecture than "this is a ReAct agent".

---

# Dimension 1 — How does the task move?

The first dimension is **execution path** — the skeleton of the whole flow.

It does not care how the model thinks. It asks:

> Which nodes does the task pass through? Under what conditions does the path switch? Where does a failure return to?

## Direct

The simplest form:

```text
Input
 ↓
LLM
 ↓
Output
```

Suitable for:

- translation
- rewriting
- simple summarisation
- format conversion
- one-shot classification

Many problems do not need an agent at all.

If the input–output pair has no tools, state, branching or multi-step persistence, calling the model directly is usually faster, cheaper and easier to test.

## Pipeline

A pipeline splits the task into fixed steps:

```text
Rewrite
 ↓
Retrieve
 ↓
Rerank
 ↓
Generate
 ↓
Verify
```

Each step has a clear responsibility. This fits work where the flow is reasonably stable.

Production RAG often uses this skeleton for practical reasons:

- it is easy to record the input and output of every stage
- failures are easy to locate
- retrieval, reranking and generation can be evaluated independently
- cost and latency are relatively predictable

The trade-off is also clear. A request usually walks through every preset node, even when some steps are unnecessary for the current query.

## Router

A router first decides which path a query should take:

```text
 ┌→ Direct Answer
user query → Router ├→ RAG Search
 ├→ SQL
 ├→ Calculator
 └→ Agent Workflow
```

A router can dispatch on:

- question type
- user permissions
- tools required
- cost budget
- risk level
- latency requirements
- query profile

Its value is usually not "answering better". It is preventing every query from spinning up the heaviest complete workflow.

## State Machine

A state machine records explicitly which state the system is currently in:

```text
START
 ↓
RETRIEVE
 ↓
enough data?
 ├─ yes → ANSWER
 └─ no  → REWRITE QUERY
 ↓
 RETRIEVE
```

It fits systems that need:

- a hard retry limit
- resumption after interruption
- human approval gates
- failure routing
- long-task progress preservation
- explicit stop conditions

ReAct decides *what the next action should be*. A state machine decides *which actions are permitted in which state*.

One handles the local judgement; the other sets the traffic rules.

## DAG

A DAG is a directed acyclic graph.

It fits running several independent pieces of work in parallel:

```text
 ┌→ Research A ─┐
problem → Decompose ├→ Research B ─┼→ Synthesis
 └→ Research C ─┘
```

Deep research, batch data analysis and multi-source comparison often use a DAG.

A DAG allows parallelism but, in principle, contains no cycles. A state machine can return the flow to a previous state.

This difference shapes retry, recovery and orchestration directly.

---

![Figure 1-2｜Direct, Pipeline, Router, State Machine, and DAG](/images/agent-design-patterns-atlas-part-1/02-execution-structures.png)

> **Figure 1-2｜Direct, Pipeline, Router, State Machine, and DAG**
> Five common execution skeletons side by side. Direct is a single input–output pass. Pipeline is a fixed sequence. Router dispatches by query type. State Machine transitions by explicit state. DAG parallelises independent work before merging results.

---

# Dimension 2 — How is the next step decided?

The second dimension is **decision and planning**.

This is the layer where ReAct and Plan-and-Execute actually live.

## ReAct

ReAct can be reduced to a loop:

```text
Reason
 ↓
Act
 ↓
Observe
 ↓
Reason again
```

A search agent might:

1. search a first set of keywords
2. find the results too coarse
3. rewrite the query
4. open one of the sources
5. see the data is out of date
6. switch to the official documentation
7. compose the answer

The next action depends on the previous observation.

The pattern fits:

- web search
- debugging
- browser operations
- API exploration
- tasks where tool results are genuinely unpredictable

ReAct's problem is usually not a lack of flexibility; it is too much of it.

Without a maximum step count, tool allowlist, budget limit and stop condition, the agent can search again and again, reread the same pages, or keep switching tactics without making progress.

## Plan-and-Execute

Plan-and-Execute builds the full or high-level plan first:

```text
goal
 ↓
build the plan
 ↓
execute step 1
 ↓
execute step 2
 ↓
execute step 3
 ↓
integrate the result
```

It fits:

- long-form research
- multi-stage reports
- project planning
- tasks with a clear deliverable
- analytical work where items are easy to miss

Its strength is global visibility.

The agent confirms which sub-problems exist before doing anything, so the first search result is less likely to drag the whole task off target.

The risk sits in the initial plan. If the premise is wrong, the rest can be executed cleanly and still go the wrong direction.

## Adaptive Planning

Adaptive Planning adds re-planning on top of Plan-and-Execute:

```text
build the plan
 ↓
execute one step
 ↓
check the result
 ↓
does the plan need changing?
 ├─ no  → continue
 └─ yes → update the remaining steps
```

For example:

```text
original plan:
1. fetch the full JD from the job page
2. analyse the skill requirements
3. do the match scoring
```

After the first step fails, the system can switch to:

```text
updated:
1. try the company career page
2. try a public job API
3. if no full body is available, mark Pending
4. do not infer content from the job title alone
```

The point is not "try once more". The remaining plan has actually changed.

## The most common hybrid architecture

In practice, choosing only ReAct or only Plan-and-Execute is rare.

A more common structure looks like:

```text
Planner builds the high-level plan
 ↓
Executor handles one sub-task
 ↓
inside the sub-task, use ReAct
 ↓
Verifier checks the result
 ↓
re-plan when needed
```

Read it as:

- Planner manages the global structure
- ReAct handles the local moment
- Verifier accepts or rejects the result
- State Machine limits the flow

---

![Figure 1-3｜Planner, ReAct Executor, Verifier, and Replanner](/images/agent-design-patterns-atlas-part-1/03-planner-react-executor.png)

> **Figure 1-3｜Planner, ReAct Executor, Verifier, and Replanner**
> The Planner produces a high-level plan. The Executor runs ReAct inside each sub-task. The Verifier checks whether the result passes. On failure, the Replanner modifies the remaining plan and feeds it back to the Planner.

---

# Dimension 3 — How are multiple solutions explored?

Some tasks only need one reasonable path. Others present a large space of candidate solutions.

The third dimension asks:

> Does the agent walk one path to the end, or explore several paths simultaneously?

## Single-path reasoning

Produce one main line of reasoning.

Fast and cheap. It fits most everyday tasks.

The weakness is that an early wrong judgement tends to drag the rest of the output off course.

## Self-consistency

Generate several independent answers to the same question, then pick the most consistent result.

It fits:

- reasoning tasks with a definite answer
- classification
- fixed scoring
- tasks where the result can be voted on

Majority agreement only reduces accidental noise. It does not guarantee factual correctness. If every candidate reads the same wrong source, voting does not turn the error into the truth.

## Generate-and-Rank

Generate several candidates first, then use a ranker or scoring rule to pick the best:

```text
question
 ↓
produce plan A, B, C
 ↓
score by cost, risk, quality
 ↓
pick the best candidate
```

It fits:

- architecture selection
- copy variants
- code options
- any question that admits several acceptable answers

## Tree of Thoughts

Tree of Thoughts allows the reasoning line to branch:

```text
 start
 ┌────┼────┐
 path A path B path C
 │ │
 A1/A2 B1/B2
```

The system can evaluate branches, prune the weaker ones, and return to an earlier node to try a different direction.

## Graph of Thoughts

Graph of Thoughts allows different branches to merge again.

This is useful for multi-source research: different paths can find complementary data, and the system needs to integrate the intermediate results rather than keeping only the best single branch.

## LATS / Tree Search

These methods treat the agent's actions as a search space and iterate:

- propose candidate actions
- execute or simulate them
- evaluate the result
- keep the better branches
- backtrack and continue exploring

It fits environments where success and failure can be judged objectively — for example, code tests, browser tasks, games or verifiable structured tasks.

The cost is direct: more model calls, more tool runs, more state management, and a more expensive evaluation function.

---

![Figure 1-4｜Line, Tree, and Graph Search Structures](/images/agent-design-patterns-atlas-part-1/04-search-structures.png)

> **Figure 1-4｜Line, Tree, and Graph Search Structures**
> Line follows one path. Tree allows branching, pruning and backtracking. Graph allows branches to merge again and reuse intermediate results.

---

# Dimension 4 — How are mistakes recovered from?

Being able to take many actions does not mean the agent knows whether its result is right.

The fourth dimension covers verification, failure recovery, and how to keep the same mistake from happening twice.

## Retry

Retry fits transient errors:

- API timeout
- network interruption
- rate limit
- a page that briefly fails to load
- an occasional model output that breaks the format

If the root cause has not changed, running the same action again usually reproduces the same failure.

Therefore, Retry should have:

- backoff
- a hard retry limit
- a timeout
- an escalation path

## Fallback

A fallback switches to a backup path:

```text
primary action
 ↓
success?
 ├─ yes → continue
 └─ no  → fallback option → continue
```

The goal is usually availability. The fallback path does not guarantee the same quality as the primary path.

## Critic

A critic points out problems:

- argument gaps
- format errors
- missing requirements
- hidden risks
- mismatches between conclusion and evidence

A critic is closer to a review note. It provides qualitative feedback but may not produce a strict pass/fail judgement.

## Verifier

A verifier checks output against rules, schema, evidence or policy:

- does the JSON match the schema
- is the SQL read-only
- does each claim have a matching citation
- are all required fields populated
- does the result comply with the stated policy

The difference between critic and verifier can be simplified:

- Critic: *where could this be improved?*
- Verifier: *does this meet the threshold?*

## Generate-and-Test

Generate-and-Test is not about generating several candidates and picking the winner.

Its typical flow is:

```text
generate
 ↓
run test
 ↓
pass?
 ├─ yes → accept
 └─ no  → inspect failure
 ↓
 revise
 ↓
 run test again
```

It fits:

- code generation
- SQL validation
- data transformation
- executable workflows
- API requests
- builds and deployments

What matters is not the model saying "this looks right", but whether the result passes the test in a real environment.

## Reflexion

Reflexion persists failure experience for future runs:

```text
attempt
 ↓
failure
 ↓
reflect
 ↓
update strategy / memory
 ↓
future attempt
```

For example:

```text
failure note:
the score was derived only from the job title; the full JD was never retrieved.

procedural rule:
if the full body is missing, mark Pending — do not infer from the title.
```

This already crosses into the memory dimension. The correction affects future runs, not just the current answer.

---

![Figure 1-5｜Six Common Verification and Recovery Patterns](/images/agent-design-patterns-atlas-part-1/05-verification-paths.png)

> **Figure 1-5｜Six Common Verification and Recovery Patterns**
> Retry, Fallback, Critic, Verifier, Generate-and-Test, and Reflexion. Critic and Verifier mainly detect and judge problems; they do not execute recovery directly.

---

# Dimension 5 — Who does the work?

A single agent can carry the whole task, or the work can be split across several roles.

## Single Agent

One agent is responsible for:

- planning
- tool use
- execution
- checking
- answering

This is the simplest, cheapest form, and the easiest to debug.

Many tasks do not need multiple agents. Once state, tool boundaries, verification and stop conditions are designed clearly, a single agent is often enough.

## Role-based Single Agent

The same model switches roles across stages:

```text
Planner
 ↓
Writer
 ↓
Critic
```

It looks like several roles, but the underlying system can still be one model, one context window and one execution loop.

## Supervisor–Worker

The supervisor is responsible for:

- breaking the task down
- dispatching workers
- tracking progress
- collecting results
- aggregating the final output

Each worker owns a specific sub-task.

```text
 Supervisor
 ┌──────┼──────┐
 Research Coding Reviewer
 \ | /
 return results
 ↓
 Supervisor aggregates
 ↓
 response
```

The important rule:

> Workers should not skip the supervisor and send their results directly to the final response.

The supervisor — or an explicit aggregator — must own the integration.

## Debate

Several agents propose different positions, and a moderator or judge evaluates them:

```text
Agent A
Agent B
Agent N
 ↓
moderator / judge
 ↓
final answer
```

It fits:

- finding blind spots
- comparing competing perspectives
- high-stakes decisions
- ambiguous questions

A majority vote does not replace external verification.

## Blackboard

Several agents share a working area:

```text
shared blackboard
├── known facts
├── todo items
├── intermediate results
├── risks
└── candidate answers
```

Agents do not need to pass the full conversation between each other. They read and write to shared state.

## Swarm

A swarm lets many lightweight agents self-coordinate with little central control.

This is flexible, but also harder to manage:

- duplicated work
- infinite hand-off
- unclear accountability
- cost control
- result conflicts
- stop conditions

The biggest risk in multi-agent systems is rarely that a single worker is not clever enough. It is that every worker does a little, and no one owns the final delivery.

---

![Figure 1-6｜Five Common Agent Organisation Patterns](/images/agent-design-patterns-atlas-part-1/06-organisation-patterns.png)

> **Figure 1-6｜Five Common Agent Organisation Patterns**
> Single Agent, Supervisor–Worker, Debate, Blackboard and Swarm are five common organisational patterns. They are not a maturity ladder.

---

# Dimension 6 — What does the agent remember?

The final dimension is memory.

Memory, context, state and RAG are often mixed up. They hold different content and serve different purposes.

## Working Memory

Holds the data the current task is using:

- the user query
- documents already read
- tool returns
- intermediate conclusions
- steps not yet completed

It usually lives only as long as the current task or session.

## Short-term State

Holds the workflow's progress:

- which state the system is in
- which steps are done
- how many retries have happened
- which workers have not returned yet
- what the next node is

Context stresses what the model currently sees. State stresses where the system currently is.

## Episodic Memory

Holds events from past runs:

```text
last time we read this site, the main page needed JavaScript.
after switching to the public API we got the data successfully.
```

It behaves like accumulated task experience.

## Semantic Memory

Holds relatively stable facts and knowledge:

- company data
- product specifications
- domain knowledge
- long-term user settings
- system definitions

This kind of data needs source, version, update timestamp and trust level.

## Procedural Memory

Holds the rules for doing things:

```text
column H already has a full JD
→ use column H directly

column H is empty
→ read the URL in column E

cannot find the full body
→ mark Pending
→ do not infer from the job title
```

Procedural memory decides how the agent should act, not just which facts it knows.

## User Memory

Holds user preferences and long-term constraints:

- preferred answer language
- document format requirements
- testing standards
- delivery method
- fixed working rules

This kind of memory needs much more careful handling for privacy, update and deletion.

## Shared Memory

Lets several agents share:

- task progress
- intermediate artefacts
- verified facts
- pending questions
- tool results

Shared memory can cut duplicated work. It can also propagate one agent's error to the entire system.

More memory is not always better.

Without the following governance, memory easily becomes an unindexed warehouse:

- source
- timestamp
- version
- trust level
- update condition
- conflict handling
- forgetting mechanism

---

![Figure 1-7｜Context, State, Memory, and RAG](/images/agent-design-patterns-atlas-part-1/07-context-state-memory-rag.png)

> **Figure 1-7｜Context, State, Memory, and RAG**
> Context is what the model currently sees. State is the workflow's current progress. Memory preserves information across steps or sessions. RAG retrieves content from an external knowledge base.

---

# Workflow, Agent and Agentic Workflow — what is the difference?

These three terms do not share a single agreed boundary across all teams. This article uses a working engineering definition.

## Workflow

A workflow's main flow is decided in advance by the developer:

```text
A → B → C → D
```

The model can take part in some nodes, but cannot freely change the main flow.

## Agent

An agent can choose the next action on its own, based on goal, state, tool results and environment feedback:

```text
Observe
 ↓
Decide
 ↓
Act
 ↓
Observe again
```

Autonomy is higher. Budget, permission and stop conditions become more important.

## Agentic Workflow

Agentic Workflow sits between the two.

The overall flow is still controlled by the workflow, but some nodes allow the agent to decide autonomously.

For example:

```text
fixed flow:
Router → Research → Verify → Answer

inside the Research node:
the agent searches, rewrites the query and picks sources on its own
```

This is usually the practical compromise that production systems settle on.

| Item | Workflow | Agentic Workflow | Autonomous Agent |
| --- | --- | --- | --- |
| main flow | predefined | roughly fixed | decided dynamically |
| local autonomous decision | few | some | many |
| controllability | high | high to medium | medium to low |
| cost predictability | high | medium to high | low |
| debug difficulty | low | medium | high |
| production fit | very high | very high | depends on the task |

Converting every job into a fully autonomous agent does not automatically improve quality.

Autonomy should be placed at nodes where the decision rule is hard to write in advance *and* the result can still be verified — not sprinkled evenly across the whole pipeline.

---

# Agent autonomy and system control are two different axes

Common systems line up along the autonomy axis:

- Direct
- Fixed Pipeline
- Router
- Agentic Workflow
- Plan-and-Execute
- Adaptive Agent
- Long-running Autonomous Agent

But they should not be drawn as a simple maturity ladder.

The reason:

> Higher autonomy usually means more flexibility, but system control and predictability often decline.

A more accurate framing uses a two-dimensional matrix:

- X axis: Agent Autonomy
- Y axis: System Control and Predictability

The positions look like this:

| Pattern | Autonomy | Control and Predictability |
| --- | --- | --- |
| Direct | very low | very high |
| Fixed Pipeline | low | very high |
| Router | low to medium | high |
| Plan-and-Execute | medium | medium |
| Agentic Workflow | medium to high | medium to high |
| Adaptive Agent | high | medium to low |
| Long-running Autonomous Agent | very high | low |

Agentic Workflow usually sits in the most practical balance zone:

- it keeps necessary flexibility
- it maintains a clear overall flow
- it is easy to add budget limits, verifiers and human approval gates
- it is easier to debug than a fully autonomous agent

## Multi-Agent should not be placed on this ladder

Multi-Agent describes an organisational choice, not a fixed autonomy level.

A multi-agent system can be:

- highly scripted
- moderately agentic
- highly autonomous

So it should not be placed between Adaptive Agent and Long-running Autonomous Agent as a "higher" level of autonomy.

---

![Figure 1-8｜Agent Autonomy and System Control](/images/agent-design-patterns-atlas-part-1/08-autonomy-controllability-spectrum.png)

> **Figure 1-8｜Agent Autonomy and System Control**
> A two-dimensional matrix: X axis is Agent Autonomy, Y axis is System Control and Predictability. Multi-Agent is an organisational choice; it can exist at multiple autonomy levels and does not belong on this matrix.

---

# How should a complete agent be described?

Take a production RAG system as an example. Saying "we use ReAct" is still not enough.

A fuller description looks like this:

| Dimension | Architecture choice |
| --- | --- |
| execution path | Router + Stateful Workflow |
| decision and planning | fixed flow for simple queries; Plan-and-Execute for complex queries |
| tool execution | bounded ReAct inside the retrieval node |
| reasoning and exploration | multi-query retrieval + Generate-and-Rank |
| verification and recovery | Citation Verifier + Faithfulness Check + Bounded Retry |
| agent organisation | Single Agent; call specialist tools when needed |
| state and memory | Working State + Procedural Memory |
| governance | Budget Guard + Tool Allowlist + Timeout |

This description already answers:

- which parts of the flow are fixed
- which nodes allow autonomous decision
- how errors are noticed
- the maximum retry count
- which tools the agent may call
- where state is preserved
- how cost is controlled

This is the kind of description that can actually be debated in an architecture review.

---

# The six-dimension cheat sheet

| Dimension | Representative patterns | Solves | Common risks |
| --- | --- | --- | --- |
| execution path | Pipeline, Router, State Machine, DAG | controlling the overall task flow | rigid flow, branch explosion, state confusion |
| decision and planning | ReAct, Plan-and-Execute, Adaptive Planning | deciding the next action | loops, stale plans, unbounded re-planning |
| reasoning and search | Self-consistency, ToT, GoT, LATS | searching across candidate solutions | high cost, unreliable scorer |
| verification and recovery | Retry, Verifier, Generate-and-Test, Reflexion | catching errors and recovering | false green, repeated failure, memory pollution |
| agent organisation | Single, Supervisor, Debate, Blackboard, Swarm | dividing and coordinating work | duplicated work, hand-off loss, unclear ownership |
| state and memory | Working, Episodic, Semantic, Procedural | preserving progress, knowledge and experience | staleness, conflict, retrieval errors, privacy issues |

---

# Six questions to ask about a new agent name

New names appear regularly in the agent space.

Some are new research methods, others are old patterns in a new combination, and others are mostly product packaging.

There is no need to memorise them first. Ask:

1. **Does it change how the task's execution path flows?**
2. **Does it change how the next decision is made?**
3. **Does it explore several candidate solutions at once?**
4. **How does it verify results and recover from mistakes?**
5. **Does it introduce a new agent role or collaboration pattern?**
6. **What state, knowledge or failure experience does it persist?**

If none of the six questions can be answered, that name may not yet amount to a clear architectural method.

If they can be answered, the name belongs on the existing map rather than forming its own isolated island.

---

**Before you jump to comparing patterns, put the task into the six dimensions first:**

```text
how does the flow move?
how is the next step decided?
how are candidate solutions searched?
how is the result verified?
who does the work?
how are state and experience preserved?
```

Six questions in, and the architecture usually emerges on its own.

---

# Conclusion

ReAct and Plan-and-Execute are both important patterns, but they only cover one of the six dimensions: how the next step is decided.

A complete agent still has to cover the other five:

- how the task moves through the flow
- how candidates are explored when multiple paths exist
- how errors are detected and recovery triggered
- whether one agent or several roles split the work
- how state, knowledge and failure experience are preserved

So when you select an agent architecture, do not start with "which pattern is best".

Place the task inside the six dimensions and answer one layer at a time:

```text
how does the flow move?
how is the next step decided?
how are candidate solutions searched?
how is the result verified?
who does the work?
how are state and experience preserved?
```

Once those six questions are answered, the architecture usually appears on its own.

The next article starts with the first dimension:

> **How does an agent's task actually move?**

We will compare Direct, Pipeline, Router, State Machine, DAG, Event-driven and Human-in-the-loop in full, and explain when the task does not need an agent at all.

---

# Agent Design Patterns Atlas — series index

| Part | Topic |
| ---: | --- |
| 1 | Beyond ReAct: a six-dimensional map of LLM agent architectures |
| 2 | Execution paths in full: Direct, Pipeline, Router, State Machine and DAG |
| 3 | ReAct, Plan-and-Execute and Adaptive Planning |
| 4 | From a single path to searching the full solution space: CoT, ToT, GoT and LATS |
| 5 | Verification and self-correction in agents |
| 6 | Multi-agent architecture in full |
| 7 | Agent memory in full |
| 8 | Production agent architecture in practice |
| 9 | How to choose an agent architecture |
| Bonus | Implementing the patterns with modern agent frameworks |

---

# Figure index

| Figure | Title | File |
| --- | --- | --- |
| Figure 1-1 | Six Dimensions of Agent Architecture | `01-six-dimensions-overview.png` |
| Figure 1-2 | Direct, Pipeline, Router, State Machine, and DAG | `02-execution-structures.png` |
| Figure 1-3 | Planner, ReAct Executor, Verifier, and Replanner | `03-planner-react-executor.png` |
| Figure 1-4 | Line, Tree, and Graph Search Structures | `04-search-structures.png` |
| Figure 1-5 | Six Common Verification and Recovery Patterns | `05-verification-paths.png` |
| Figure 1-6 | Five Common Agent Organisation Patterns | `06-organisation-patterns.png` |
| Figure 1-7 | Context, State, Memory, and RAG | `07-context-state-memory-rag.png` |
| Figure 1-8 | Agent Autonomy and System Control | `08-autonomy-controllability-spectrum.png` |