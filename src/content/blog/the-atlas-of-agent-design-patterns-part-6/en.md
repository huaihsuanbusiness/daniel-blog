---
title: "The Atlas of Agent Design Patterns Part 6 ｜ Multi-Agent Architectures: Supervisor, Debate, Blackboard and Swarm"
description: "A complete comparison of Single Agent, Role-based Single Agent, Supervisor–Worker, Planner–Executor–Critic, Debate, Voting, Blackboard, Peer-to-Peer and Swarm, plus how Production Multi-Agent systems handle communication, shared state, responsibility boundaries, cost and failure governance."
date: 2026-07-01T00:04:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 6
---

The previous articles covered:

- how a task moves from start to finish
- how the Agent decides its next step
- how several candidate solutions are searched
- how errors get verified and repaired

This article enters the fifth dimension:

> Should the work be done by one Agent, or split across several?

Multi-Agent systems make architecture diagrams look impressive.

The slide shows:

- a Planner Agent
- a Research Agent
- a Coding Agent
- a Critic Agent
- a Reviewer Agent
- a Supervisor Agent
- a Memory Agent

Every role has its own card, icon and arrow. The whole picture looks like a digital office.

But more roles do not automatically mean the system gets smarter.

More Agents also means:

- more model calls
- more Context hand-offs
- more state synchronisation
- more duplicate work
- more responsibility boundaries
- more failure points
- harder to reproduce results
- higher cost and latency

So the core question of Multi-Agent is not:

> How many Agents can we have?

It is:

> **Does the work really need to be split, and once it is split, how do we make sure every role knows what it should do, who it should hand results to, and when it should stop?**

---

## Multi-Agent is an organisational pattern, not a reasoning pattern

This is the most important conceptual boundary in this article.

Multi-Agent describes:

> How many independent roles or execution units there are, and how they collaborate.

It does not directly describe:

- whether the task uses ReAct
- whether Planning happens first
- whether multiple reasoning paths are explored
- whether Tree of Thoughts is used
- whether Retry or Verifier is involved
- whether Memory is preserved

A Multi-Agent system can simultaneously use:

```text
Execution path: State Machine
Decision strategy: Plan-and-Execute
Exploration: Single-path
Verification: Verifier + Generate-and-Test
Organisation: Supervisor–Worker
Memory: Shared Working Memory
```

Multi-Agent is just one of the dimensions.

## Multiple answers do not equal multiple Agents

None of the following is necessarily a Multi-Agent system:

- the same model generates five candidates
- a single Agent runs Tree Search
- a single Agent switches between Planner, Writer and Critic Prompts in sequence
- a Workflow contains several LLM Nodes

In the other direction, multiple Agents do not automatically explore different solutions.

For example:

- Agent A reads document one
- Agent B reads document two
- Agent C reads document three

They are simply doing parallel division of labour, not necessarily competing on different answers.

| Situation | Multi-candidate | Multi-path search | Multi-Agent |
|---|---:|---:|---:|
| Same model generates five answers | Yes | Not necessarily | No |
| Same Agent runs Tree Search | Yes | Yes | No |
| Same model switches between three role Prompts | Not necessarily | Not necessarily | Usually no |
| Three Workers each handle a different document | Multiple outputs | Not necessarily | Yes |
| Three Agents propose plans, then a Judge picks one | Yes | Yes | Yes |

---

## 1. Single Agent: first ask whether you really need more than one

A Single Agent uses one execution unit to finish the entire task:

```text
User Request
  ↓
Single Agent
  ├─ Plan
  ├─ Use Tools
  ├─ Update State
  ├─ Verify
  └─ Answer
```

That does not mean it can only handle simple tasks.

As long as the system has:

- clear tool boundaries
- structured State
- a Planner
- a Verifier
- a Budget Guard
- a Retry Limit
- Memory

one Agent can still handle quite long jobs.

## Strengths of Single Agent

### Consistent Context

No need to keep re-passing the task background between roles.

### Clear responsibility

There is only one primary executor. The "I thought the other Agent was handling it" problem rarely appears.

### Lower cost

No extra Prompts, hand-offs, synchronisation or aggregation across roles.

### Easier to debug

The whole Trace stays more concentrated.

### Easier to define a stopping condition

There is no need to wait for multiple Agents to confirm each other.

## Limits of Single Agent

- Context can get too large
- too many tools and responsibilities
- different skills are hard to isolate
- long tasks lose local detail
- independent work cannot truly run in parallel
- one error can pollute the entire task

## When should you prefer Single Agent?

- the task fits within one Context
- the tool count is small
- parallel work is not needed
- task responsibility does not need to be isolated
- hand-off cost is higher than the benefit of splitting
- one strong model is already enough

The Production default should be:

> **Start with a Single Agent, and only add Agents when the split actually solves a problem.**

---

## 2. Role-based Single Agent: one model, switching between several roles

A Role-based Single Agent uses different role Prompts at different stages:

```text
Planner Role
  ↓
Writer Role
  ↓
Critic Role
  ↓
Finalizer Role
```

On the surface it looks like four Agents.

But underneath it can still be:

- the same model
- the same execution program
- the same State
- sequential
- no truly independent Worker

## What is it actually worth?

### Responsibility separation

Each stage only focuses on its own job.

### More focused Prompts

The Planner does not also have to write the article. The Critic does not also have to operate the tools.

### Easier to control the flow

The role order is set by the Workflow.

### Lower cost than true Multi-Agent

There is no need to maintain multiple independent Agent Sessions.

## What is it not?

A Role-based Single Agent is not:

- multiple autonomous Agents
- real parallel execution
- independent Context
- independent Memory
- Peer-to-Peer collaboration

## Main risks

### The roles are just renamed

The Planner, Writer and Critic use nearly identical Prompts. Only the headers differ.

### Shared blind spots

The same model can repeat the same mistake across all roles.

### Context contamination

The Critic has already seen the Generator's full reasoning, so it more easily judges along the same assumptions.

### False independence

The system claims "three Agents agreed", but it was just the same model saying yes three times in a row.

![Figure 6-1 — One Model, Multiple Roles, or Multiple Agents?](/images/the-atlas-of-agent-design-patterns-part-6/one-model-multiple-roles-or-multiple-agents.png)

> **Figure 6-1 ｜ One Model, Multiple Roles, or Multiple Agents?**  
> The difference between Single Agent, Role-based Single Agent and true Multi-Agent is not only the role names. It is whether the system actually has independent responsibility, Context, State, execution and communication boundaries.

---

## 3. Supervisor–Worker: the most common Multi-Agent architecture

Supervisor–Worker is the most common and most controllable Multi-Agent pattern.

The Supervisor is responsible for:

- understanding the goal
- decomposing tasks
- dispatching Workers
- tracking progress
- handling failures
- aggregating results
- deciding whether the task is complete

Each Worker handles a specific sub-task:

```text
                  Supervisor
            ┌────────┼────────┐
        Research   Analysis   Writing
            \          |          /
              Return Results
                     ↓
            Supervisor Aggregates
                     ↓
                  Response
```

## Supervisor responsibilities

### Task Decomposition

Break the goal into sub-tasks that can run independently.

### Worker Selection

Pick the Worker based on skills, permissions, cost and current load.

### Contract Definition

For each Worker define:

- Input
- Objective
- Allowed Tools
- Expected Output
- Completion Criteria
- Budget
- Deadline

### Progress Tracking

Know which tasks are:

- Pending
- Running
- Completed
- Failed
- Blocked
- Cancelled

### Result Aggregation

Compare, deduplicate, resolve conflicts and produce the final output.

## Workers should not write the final answer directly

A common wrong flow:

```text
Supervisor
  ↓
Worker A / Worker B / Worker C
  ↓
Final Response
```

If Workers connect straight to Final Response, you get:

- different result formats
- duplicate content
- contradictions
- no overall conclusion
- no one accepting the result

The right flow is:

```text
Workers Return Results
  ↓
Supervisor or Aggregator
  ↓
Verifier
  ↓
Final Response
```

## Tasks that fit Supervisor–Worker

- multi-source research
- sub-tasks that need different skills
- work that can run in parallel
- large-volume document processing
- multi-market comparison
- Coding + Testing + Review
- enterprise workflows that need central governance

## Main risks

### Supervisor becomes the bottleneck

All work goes through the Supervisor, which can cause latency and Context pressure.

### Worker tasks overlap

Unclear division of labour causes multiple Workers to do the same work.

### Worker results cannot be aggregated

Different Workers use different formats, assumptions and versions.

### Supervisor over-intervenes

Workers have to report every step, and the coordination cost exceeds the work itself.

### Worker failure has no fallback

The Supervisor only knows how to wait. It does not know how to re-dispatch, Fallback or mark Partial.

![Figure 6-2 — Supervisor–Worker: Delegate, Return, Aggregate](/images/the-atlas-of-agent-design-patterns-part-6/supervisor-worker-delegate-return-aggregate.png)

> **Figure 6-2 ｜ Supervisor–Worker: Delegate, Return, Aggregate**  
> The Supervisor defines the work contract and dispatches tasks. Workers must return structured results. The Supervisor then aggregates, resolves conflicts, verifies and produces the final answer.---

## 4. Planner–Executor–Critic: split cognitive work by responsibility

Planner–Executor–Critic is a common division of roles.

## Planner

Responsible for:

- understanding the goal
- decomposing steps
- defining dependencies
- setting completion criteria
- arranging the execution order

## Executor

Responsible for:

- executing the current step
- using tools
- updating State
- reporting the result
- handling local failures

## Critic

Responsible for:

- finding problems
- checking for omissions
- assessing risk
- suggesting changes

The architecture is often written as:

```text
Planner
  ↓
Executor
  ↓
Critic
  ↓
Executor Revises
```

But a Production version usually also needs a Verifier:

```text
Planner
  ↓
Executor
  ↓
Critic
  ↓
Executor Revises
  ↓
Verifier
  ├─ Pass → Continue / Complete
  ├─ Repair → Executor
  └─ Replan → Planner
```

## A Critic should not also be the final Verifier

A Critic can say:

- where the risk is
- where the argument is weak
- where the answer needs to be expanded

A Verifier must decide based on the specification:

- Pass
- Fail
- Repair
- Replan
- Escalate

The two responsibilities are different.

## Tasks that fit this split

- long-form content generation
- complex research
- programming
- plan making
- multiple rounds of revision
- work with explicit acceptance criteria

## Main risks

### Planner and Executor re-plan

The Executor does not run the step. It redesigns the entire plan instead.

### The Critic can always find a new problem

No maximum Review Rounds, no acceptance threshold.

### Verifier only looks at the writing

The actual specification, tests and sources are never checked.

### Too much information between roles

Every role receives the full Context. The point of splitting is lost.

![Figure 6-3 — Planner–Executor–Critic with Verification](/images/the-atlas-of-agent-design-patterns-part-6/planner-executor-critic-verification.png)

> **Figure 6-3 ｜ Planner–Executor–Critic with Verification**  
> The Planner manages the global plan, the Executor runs the current step, the Critic provides diagnosis, and the Verifier decides based on completion conditions whether to Continue, Repair or Replan.

---

## 5. Debate: let different viewpoints attack each other

Debate has multiple Agents take different positions, then a Moderator or Judge integrates them.

```text
Agent A: Support
Agent B: Oppose
Agent C: Risk Review
        ↓
Moderator / Judge
        ↓
Final Decision
```

## What does Debate fit?

- multiple reasonable viewpoints
- high-risk decisions
- finding blind spots
- evaluating Trade-offs
- policy and strategy analysis
- architecture option comparison
- tasks where a counter-argument is required

## Why Debate is valuable

### Forces the system to put forward alternatives

It stops the first answer from becoming the only frame.

### Surfaces hidden assumptions

Different roles challenge each other's premises.

### Good for risk analysis

You can explicitly add a Red Team or Risk Agent.

## Risks of Debate

### Viewpoints are Prompt-engineered, not really diverse

Three Agents may just be repeating the same content in different tones.

### Persuasion beats correctness

The Judge may prefer the more fluent Agent.

### Infinite debate

Both sides keep restating their position.

### Majority agreement can still be wrong

If all Agents rely on the same wrong source, debate only makes the error more polished.

## What does Production Debate need?

- fixed round count
- explicit topic
- independent evidence requirement
- no repeated arguments
- Claim–Evidence format
- Judge Rubric
- External Verifier
- a final Abstain option

---

## 6. Voting: aggregate to choose the answer

Voting has multiple Agents select from the candidates.

Common methods:

- Majority Vote
- Weighted Vote
- Rank Aggregation
- Approval Voting
- Confidence-weighted Vote

```text
Candidate A
Candidate B
Candidate C
      ↓
Agent Votes
      ↓
Aggregate
      ↓
Selected Candidate
```

## What does Voting fit?

- there is an explicit candidate set
- answers are easy to normalise
- the evaluation standard is consistent
- you need to reduce single-Judge bias

## Voting is not verification

Five Agents voting for the same answer does not mean the answer is correct.

It only says:

> Among this set of candidates and this group of voters, this answer is the most supported.

Voting should be paired with:

- Ground Truth
- External Test
- Source Verification
- Constraint Check

## Risks of Weighted Voting

If the weight source is unreliable, the system is just multiplying bias by a coefficient.

You need to know:

- how the weights are calculated
- whether they are adjusted per task type
- whether past performance is still valid
- whether the Agents use the same data and model

---

## 7. Blackboard: shared workspace, not passing whole conversations around

A Blackboard architecture has multiple Agents read and write a shared workspace.

```text
                Shared Blackboard
        ┌──────────┼──────────┐
    Researcher   Analyst    Writer
        ↕            ↕          ↕
       Facts      Findings     Draft
```

A Blackboard can hold:

- Task Goal
- Known Facts
- Open Questions
- Subtasks
- Evidence
- Candidate Solutions
- Risks
- Decisions
- Draft Output
- Worker Status

## Strengths of Blackboard

### Reduces point-to-point messaging

Agents do not have to pass the full Context to every other Agent.

### Intermediate results can be reused

Multiple Workers can read verified facts.

### Good for asynchronous collaboration

Workers can update the shared state at different times.

### Easy to observe overall progress

The Blackboard becomes the shared view of the task.

## Risks of Blackboard

### Information pollution

One Agent writes a wrong fact, and every other Agent reuses it.

### Duplicates and conflicts

The same fact may appear in multiple versions.

### Data grows without bound

Everything is kept, and the Blackboard gradually turns into a digital storage room.

### Unclear permissions

Every Agent can modify every entry.

## What does Production Blackboard need?

- Typed Entries
- Source
- Author
- Created At
- Version
- Validation Status
- Confidence
- Read / Write Permission
- Conflict Resolution
- Expiry
- Immutable Audit Log

Best to categorise entries as:

```text
Proposed
Verified
Rejected
Superseded
```

instead of treating all content as equally trustworthy.

---

## 8. Peer-to-Peer: Agents collaborate directly

A Peer-to-Peer architecture has no single central Supervisor.

Agents can directly:

- send tasks
- request information
- hand over results
- transfer responsibility
- negotiate the next step

```text
Agent A ↔ Agent B
   ↕          ↕
Agent C ↔ Agent D
```

## What does it fit?

- highly distributed work
- different Agents holding different resources
- a central node is likely to become a bottleneck
- task topology changes dynamically
- multiple services collaborate autonomously

## Strengths of Peer-to-Peer

- no single Supervisor point
- if one Agent fails, others can still work
- flexible collaboration
- fits dynamic networks

## Main risks

### Responsibility drift

The task keeps moving between Agents and no one owns completion.

### Message explosion

Every Agent broadcasts to multiple Agents.

### Circular hand-offs

```text
A → B → C → A
```

### Inconsistent state

Different Agents have different views of task progress.

### Permission propagation

Agent A can use, indirectly through Agent B, tools that it would not have permission to use directly.

## Required controls

- Message Schema
- Correlation ID
- Task Owner
- Hop Limit
- TTL
- Deduplication
- Capability Registry
- Permission Propagation Rules
- Terminal Owner
- Conflict Resolution

---

## 9. Swarm: many lightweight Agents working in a distributed way

A Swarm usually contains many lightweight Agents that cooperate through local rules and a shared goal.

There may be no single central Planner.

Each Agent decides its next step based on:

- nearby messages
- current state
- local task
- simple cooperation rules

```text
Agent 1 ↔ Agent 2 ↔ Agent 3
   ↕          ↕          ↕
Agent 4 ↔ Agent 5 ↔ Agent 6
```

## What does Swarm fit?

- many small tasks that can be split
- dynamic environments
- redundancy and resilience
- exploration-style problems
- distributed resource scheduling
- cases where local decisions are enough to drive the overall goal

## Why Swarm is valuable

### Resilience

One Agent failing does not have to break the whole system.

### Scalability

You can add more lightweight Agents.

### Good for local information

Each Agent does not need to know the whole picture.

### Possible emergent behaviour

Simple rules can produce complex cooperation.

## Main risks of Swarm

### Emergent behaviour is not automatically good

Unpredictable is not the same as intelligent.

### Duplicate work

Multiple Agents can pick up the same task at the same time.

### Cost out of control

Many small calls add up to a large bill.

### No way to stop

There is no central node to judge completion.

### Very hard to debug

A single result may come from many local interactions.

### Unclear responsibility

After a failure it is hard to locate which Agent or message caused it.

## What does Production Swarm need?

- Global Goal
- Local Rules
- Task Claiming
- Lease / Lock
- Duplicate Prevention
- Global Budget
- Message TTL
- Maximum Hops
- Convergence Metric
- Stop Condition
- Kill Switch
- Observability
- Human Override

Do not mistake "lots of little circles on the diagram" for a digital bee colony magic ritual.

A Swarm without cooperation rules is just a group of strangers burning Tokens at the same time.

![Figure 6-4 — Debate, Voting, and Blackboard](/images/the-atlas-of-agent-design-patterns-part-6/debate-voting-blackboard.png)

> **Figure 6-4 ｜ Debate, Voting, and Blackboard**  
> Debate surfaces blind spots through viewpoint conflict. Voting aggregates candidates into a choice. Blackboard lets multiple Agents share intermediate state and verified information. The three solve different collaboration problems.

![Figure 6-5 — Peer-to-Peer and Swarm Coordination](/images/the-atlas-of-agent-design-patterns-part-6/peer-to-peer-swarm-coordination.png)

> **Figure 6-5 ｜ Peer-to-Peer and Swarm Coordination**  
> Peer-to-Peer lets Agents hand tasks to each other and negotiate directly. Swarm relies on local rules for large-scale distributed cooperation. Both need Task Owner, Hop Limit, Message TTL, Budget, Stop Condition and Kill Switch.---

## How does communication topology shape Multi-Agent?

Multi-Agent differs not only in role names. It also differs in how messages flow.

## Centralized

```text
Workers ↔ Supervisor
```

Strengths:

- clear control
- easy to observe
- clear responsibility

Risks:

- Supervisor becomes the bottleneck
- single point of failure
- Context overload

## Hierarchical

```text
Top Supervisor
├── Team Supervisor A
│   ├── Worker A1
│   └── Worker A2
└── Team Supervisor B
    ├── Worker B1
    └── Worker B2
```

Strengths:

- fits large tasks
- reduces pressure on any single Supervisor
- easy to govern by zone

Risks:

- information loss across layers
- added latency
- diluted responsibility

## Blackboard

```text
Agents ↔ Shared Workspace
```

Strengths:

- intermediate results can be reused
- asynchronous collaboration
- fewer point-to-point messages

Risks:

- information pollution
- version conflicts
- complex permissions

## Peer-to-Peer

```text
Agents ↔ Agents
```

Strengths:

- flexibility and resilience
- no single centre

Risks:

- message explosion
- circular hand-offs
- inconsistent state

## Swarm

```text
Many Local Interactions
→ Emergent Global Result
```

Strengths:

- large-scale distribution
- local autonomy
- high redundancy

Risks:

- hard to predict
- hard to stop
- hard to attribute failures

---

## Shared Memory is not dumping every Context into the same database

Multi-Agent systems often need shared state.

But Shared Memory should not mean:

> Every Agent's full conversation and tool result is preserved.

That causes:

- Context bloat
- sensitive data spread
- wrong information pollution
- retrieval quality drop
- duplicates
- no way to tell which version is latest

## What should Shared Memory actually hold?

- Task ID
- Original Goal
- Current Plan
- Verified Facts
- Open Questions
- Step Status
- Worker Assignment
- Structured Results
- Source References
- Conflict Flags
- Final Decisions

## Different data should have different trust states

```text
Proposed
  ↓
Verified
  ↓
Accepted

Rejected
Superseded
Expired
```

## Each shared item should at least have

- Author Agent
- Timestamp
- Source
- Version
- Confidence
- Validation Status
- Scope
- Expiry
- Access Policy

---

## How should Agents hand off to each other?

Do not just send a piece of natural language:

```text
Please continue the task.
```

Use a structured Handoff Contract.

For example:

```text
Task ID:
research-17

Objective:
Collect official pricing for Framework A

Inputs:
Official domain, evaluation rubric

Allowed Tools:
Search, Browser

Expected Output:
Pricing table with source and access date

Completion Criteria:
All public plans captured,
or missing values explicitly marked

Known Constraints:
Do not use third-party pricing claims

Current Status:
Pending

Deadline:
10 minutes

Return To:
Supervisor
```

## Core fields in a Handoff Contract

| Field | What it does |
|---|---|
| Task ID | Tracks the sub-task |
| Objective | Defines the goal |
| Inputs | Bounds the Context |
| Allowed Tools | Controls permissions |
| Expected Output | Standardises the format |
| Completion Criteria | Judges completion |
| Budget | Controls cost |
| Deadline | Prevents infinite waiting |
| Return To | Names where to send the result |
| Failure Policy | Defines Retry, Fallback or Partial |

A hand-off without a Contract is roughly equivalent to writing a sticky note with no address, throwing it into the wind, and hoping it lands on the right desk on time.

---

## In Multi-Agent, who owns the final answer?

This question has to be answered explicitly.

Possible owners include:

- Supervisor
- Aggregator
- Judge
- Verifier
- Finalizer
- Human Approver

But it cannot be:

> Everyone owns it.

If every Agent can write the final answer directly, you get:

- multiple versions
- overwrites
- conflicting conclusions
- no way to track responsibility
- no way to know which result has been verified

A Production system should designate:

```text
Single Final Owner
```

and define:

- which inputs can be accepted
- how conflicts are resolved
- whether a Verifier is required
- who has the right to formally complete the task
- which state represents Final

---

## Where does the cost of Multi-Agent come from?

Multi-Agent cost does not only come from model calls.

It also includes:

- Prompt repetition
- Context copying
- Worker startup
- message passing
- state synchronisation
- result aggregation
- conflict resolution
- duplicate retrieval
- waiting on the slow Worker
- Verifier and Judge
- Retry and Reassignment

Suppose a task needs:

- 1 Supervisor plan
- 4 Workers
- 3 tool calls per Worker
- 1 Critic
- 1 Verifier
- 1 Aggregator

It looks like only a handful of roles, but the actual run may already involve more than ten model and tool interactions.

## Common Multi-Agent latency issues

### Straggler

The whole task waits for the slowest Worker.

### Sequential Handoff

Roles run sequentially and cannot really run in parallel.

### Context Serialization

Many intermediate results need to be serialised and reloaded.

### Review Bottleneck

All results wait for the same Critic or Verifier.

## Cost control methods

- Max Agents
- Max Worker Calls
- Concurrency Limit
- Per-worker Budget
- Shared Retrieval Cache
- Deduplication
- Early Cancellation
- Timeout
- Partial Aggregation
- Cheap Model for Simple Workers
- Centralized Tool Results
- Stop Low-value Branches

---

## Main failure modes of Multi-Agent

## 1. Duplicate Work

Multiple Workers run the same task.

### Countermeasures

- Task Claiming
- Unique Task ID
- Shared Assignment Registry
- Deduplication

## 2. Responsibility Gap

Every Agent assumes someone else is handling it.

### Countermeasures

- Single Task Owner
- Completion Criteria
- Return To
- Terminal Owner

## 3. Handoff Loss

The hand-off loses requirements, sources or constraints.

### Countermeasures

- Structured Handoff Contract
- Source References
- Immutable Goal
- Required Fields

## 4. Conflicting Results

Different Agents give opposite conclusions.

### Countermeasures

- Conflict Flag
- Evidence Comparison
- Aggregator
- Verifier
- Human Review

## 5. Infinite Delegation

Agent A hands to B, B hands to C, C hands back to A.

### Countermeasures

- Hop Limit
- Delegation Graph
- Cycle Detection
- Maximum Depth

## 6. Shared Memory Pollution

Unverified information is used by every Agent.

### Countermeasures

- Proposed / Verified states
- Write Permission
- Source and Version
- Validation Gate

## 7. Worker Silence

A Worker times out or crashes, and the Supervisor waits forever.

### Countermeasures

- Deadline
- Heartbeat
- Timeout
- Reassignment
- Partial Result Policy

## 8. Judge Bias

The Judge prefers writing quality, certain models or roles.

### Countermeasures

- Rubric
- Blind Evaluation
- External Tests
- Calibration Set
- Multiple Judges only when justified

## 9. Cost Explosion

Roles and messages keep multiplying.

### Countermeasures

- Global Budget
- Per-agent Budget
- Max Messages
- Concurrency Limit
- Early Stop

## 10. No Final Owner

Many results come out, but no one formally closes the task.

### Countermeasures

- Final Owner
- Verifier
- Terminal State
- Audit Record---

## The Multi-Agent Production control plane

A mature Multi-Agent system needs a Control Plane on top of the Agents themselves.

## Agent Registry

Holds:

- Agent ID
- Role
- Capabilities
- Allowed Tools
- Permissions
- Model
- Cost Tier
- Current Load
- Health Status

## Task Registry

Holds:

- Task ID
- Parent Task
- Owner
- Status
- Dependencies
- Deadline
- Budget
- Attempt Count

## Message Bus

Handles:

- Message Schema
- Delivery
- Deduplication
- Ordering
- Retry
- TTL
- Dead-letter Queue

## Shared State

Holds:

- Goal
- Plan
- Verified Facts
- Worker Results
- Conflicts
- Decisions

## Policy Layer

Controls:

- Tool Access
- Data Access
- Delegation Rights
- Cost
- Risk
- Human Approval

## Observability

Tracks:

- Agent Trace
- Message Count
- Tool Calls
- Token Cost
- Latency
- Handoff Failures
- Duplicate Work
- Worker Timeout
- Final Outcome

## Kill Switch

Stops the system when:

- Cost Limit Exceeded
- Message Storm
- Delegation Cycle
- No Progress
- Security Violation
- Human Cancellation

---

## Full comparison of nine organisational patterns

| Pattern | Main structure | Truly independent Agents | Central control | Shared state | Parallel ability | Relative cost | Main risk |
|---|---|---:|---:|---:|---:|---:|---|
| Single Agent | One execution unit | 1 | High | Single State | Low | Low | Context overload |
| Role-based Single Agent | One model switching roles | Usually 1 | High | Shared | Low | Low to medium | False independence |
| Supervisor–Worker | Central dispatch and aggregation | Multiple | High | Optional | High | Medium to high | Supervisor bottleneck |
| Planner–Executor–Critic | Split by cognitive responsibility | Can be multiple | Medium to high | Usually yes | Medium | Medium to high | Role overlap |
| Debate | Multiple viewpoints + Judge | Multiple | Medium | Optional | Medium | High | Persuasion bias |
| Voting | Multiple voters | Multiple | Medium | Candidate set | High | Medium to high | Shared mistake across majority |
| Blackboard | Shared workspace | Multiple | Medium | Core capability | High | High | Memory pollution |
| Peer-to-Peer | Direct interconnection | Multiple | Low | Distributed or shared | High | High | Circular hand-off |
| Swarm | Many local cooperations | Multiple | Very low | Local / distributed | Very high | Very high | Hard to predict or stop |

---

## Task type vs organisational pattern

| Task characteristic | Suggested pattern |
|---|---|
| One Context can finish the task | Single Agent |
| Roles need separation but not true independence | Role-based Single Agent |
| Sub-tasks are clear and need central governance | Supervisor–Worker |
| Planning, execution and review need to be separated | Planner–Executor–Critic |
| Competing viewpoints and counter-arguments are needed | Debate |
| Fixed candidates fit an aggregated choice | Voting |
| Multiple Agents need shared intermediate results | Blackboard |
| A central node would become a bottleneck | Peer-to-Peer |
| Many small tasks with dynamic distributed cooperation | Swarm |

---

## When should you NOT use Multi-Agent?

## 1. The task has no natural division of labour

Just splitting roles for the look of it.

## 2. Sub-tasks depend heavily on the same Context

Splitting only forces you to keep re-synchronising.

## 3. One Agent is already stable enough

Adding roles only adds cost.

## 4. There is no aggregation or acceptance mechanism

Multiple outputs and no way to integrate them.

## 5. Tools and data cannot be safely isolated

More Agents only widens the risk surface.

## 6. There is no observability or stopping ability

You cannot see message flow, cost or task state.

## 7. The latency budget is tight

Multiple rounds of hand-off may not be acceptable.

## 8. The problem needs single-point accountability

High-risk approval, for example, should not be passed around between Agents that keep blaming each other.

---

## A complete example: a multi-source research report

Task:

> Compare three Agent frameworks and recommend the one that fits a Production RAG setup.

## Step 1: Supervisor creates sub-tasks

```text
Task A:
Collect official architecture information

Task B:
Evaluate persistence and state management

Task C:
Evaluate observability and testing

Task D:
Evaluate cost and operational complexity
```

## Step 2: Workers execute

Each Worker receives:

- the same Evaluation Rubric
- a different Objective
- Allowed Sources
- Expected Output Schema
- Completion Criteria
- Budget

## Step 3: Blackboard holds the intermediate results

```text
Verified Facts
Open Questions
Source Links
Conflicts
Missing Data
```

## Step 4: Critic checks

- whether required dimensions are missing
- whether the answer depends on third-party sources
- whether different versions have been mixed
- whether there are unflagged inferences

## Step 5: Supervisor aggregates

- deduplicates
- unifies format
- resolves conflicts
- fills gaps

## Step 6: Verifier accepts

- official-source coverage
- required fields
- unknowns explicitly marked
- whether the Recommendation has evidence

## Step 7: Final Owner outputs

A Supervisor or Finalizer produces the single formal answer.

This architecture uses:

- Supervisor–Worker
- Blackboard
- Critic
- Verifier
- Shared State
- Final Owner

But it does not need a Swarm, and it does not need Peer-to-Peer.

The value of the architecture comes from clear division of labour, not from how many roles it has.

---

## Production Multi-Agent checklist

## Do you really need multiple Agents?

- Are there naturally separable sub-tasks?
- Do you need parallel execution?
- Do you need skill or permission isolation?
- Is the gain from splitting bigger than the hand-off cost?
- Is one Agent already enough?

## Roles and responsibilities

- Does every Agent have a single clear responsibility?
- Is there a Final Owner?
- Is Return To defined?
- Are Completion Criteria defined?
- Have you avoided role overlap?

## Communication

- Is there a structured Message Schema?
- Is there a Correlation ID?
- Is there a Hop Limit and TTL?
- Can you detect cycles and duplicate messages?
- Is there a Dead-letter Queue?

## State and Memory

- Do you separate Proposed and Verified?
- Do you store Source, Author, Version?
- Do you restrict Read / Write Permission?
- Is there Conflict Resolution?
- Is there Expiry?

## Cost and stopping

- Is there a Global Budget?
- Is there a Per-agent Budget?
- Is there a Max Agents?
- Is there a Concurrency Limit?
- Is there No-progress Detection?
- Is there a Kill Switch?

## Verification and governance

- Are Worker results aggregated and verified?
- Is there a Tool Policy?
- Is there a Delegation Permission?
- Do high-risk operations require Human Approval?
- Can the full Agent Trace be reproduced?

---

## Conclusion of this article

The value of Multi-Agent does not come from putting more Agent cards on the diagram.

What it really solves is:

- task division of labour
- skill isolation
- permission isolation
- parallel execution
- competing viewpoints
- shared intermediate results
- distributed collaboration
- system resilience

The main patterns covered here are:

- **Single Agent**: one execution unit finishes the whole task
- **Role-based Single Agent**: the same model switches roles across stages
- **Supervisor–Worker**: central decomposition, dispatch, aggregation and acceptance
- **Planner–Executor–Critic**: split by cognitive responsibility
- **Debate**: surface blind spots through opposing positions
- **Voting**: aggregate candidates into a selection
- **Blackboard**: collaborate through a shared workspace
- **Peer-to-Peer**: Agents hand off and negotiate directly
- **Swarm**: many lightweight Agents cooperating through local rules

More Agents does not automatically mean higher quality.

A truly mature Multi-Agent system must be able to answer:

```text
Who owns what?
Who can use which tools?
Where do results go back to?
Are the shared data items verified?
Who decides when there is a conflict?
When is the task officially complete?
How does it stop when cost goes out of control?
```

If those questions have no answer, Multi-Agent only takes one black box apart into many smaller black boxes and strings them into a maze with arrows.

The next article enters the sixth architectural dimension:

> How are Context, State, Memory and RAG actually different in an Agent?

Part 7 will fully compare Working Memory, Episodic Memory, Semantic Memory, Procedural Memory, User Memory, Shared Memory, as well as memory write, retrieval, expiry, conflict and pollution governance.