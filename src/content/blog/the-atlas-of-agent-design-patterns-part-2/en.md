---
title: "The Atlas of Agent Design Patterns Part 2 ｜ Agent Execution Paths Explained: Direct, Pipeline, Router, State Machine and DAG"
description: "The first dimension of LLM agent execution paths: a design-oriented walk through Direct, Pipeline, Router, State Machine and DAG, including their limits, common combinations and production anti-patterns."
date: 2026-06-30T15:25:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 2
---

In the previous article we split common agent design patterns into six dimensions:

1. Execution paths
2. Decision and planning
3. Reasoning and search
4. Verification and recovery
5. Agent organisation
6. State and memory

This article enters the first dimension:

> How does a task actually move from start to finish?

It looks like a flowchart question, but in practice it decides whether an agent system can be understood, tested, recovered and controlled.

Some systems run the same retrieval, reranking, planning and verification for every query. Some let the model freely decide every step, so the same question walks a different route each time. Others draw a beautiful flowchart but, when things break, have no idea which node to return to.

These problems are not always because the model is not smart enough.

The more common cause is:

> The execution path was never designed clearly in the first place.

Direct, Pipeline, Router, State Machine and DAG are five common execution skeletons.

They do not directly answer "how does the model reason". They decide:

- Which nodes a task passes through
- Which steps must always run
- Which paths can be skipped
- Where branching is allowed
- Which work can run in parallel
- Where to return after a failure
- When the task is officially complete
- Which state must be persisted

---

## Execution path is not reasoning style

This is the most important conceptual boundary in Part 2.

These two groups of names do not belong to the same dimension:

| Execution path | In-node decision style |
|---|---|
| Direct | ReAct |
| Pipeline | Planning |
| Router | Tool Selection |
| State Machine | Adaptive Planning |
| DAG | Generate-and-Test |

Execution path describes:

> Which nodes the system has, and how data flows between them.

In-node decision describes:

> How an agent decides the next action inside a single node.

For example, a system can use a State Machine to control the overall flow:

```text
START
 ↓
PLAN
 ↓
RESEARCH
 ↓
VERIFY
 ↓
END
```

But inside the `RESEARCH` state, the agent can use ReAct:

```text
Observe
 ↓
Decide
 ↓
Act
 ↓
Observe Again
```

Similarly, a fixed Pipeline can contain a Planning node; a path selected by a Router may itself launch another State Machine.

So when someone says "this is a ReAct agent", we still do not know whether the overall flow is a Pipeline, a State Machine, or a free Agent Loop.

![Execution Skeletons vs Node-Level Decisions](/images/the-atlas-of-agent-design-patterns-part-2/execution-skeletons-vs-node-decisions.png)

> **Figure 2-1｜Execution Skeletons vs Node-Level Decisions**
> The top tier compares Pipeline, Router and State Machine; the bottom tier compares ReAct, Planning and Tool Selection & Calling. Outer skeleton and inner intelligence do not conflict.

---

## 1. Direct: some problems do not need an agent

Direct is the simplest execution path:

```text
Input
 ↓
LLM
 ↓
Output
```

The model receives the input and produces the output directly.

No:

- multi-step workflow
- dynamic routing
- state persistence
- tool loop
- multi-agent coordination

## Tasks suited to Direct

- Translation
- Rewriting
- Summarisation
- Format conversion
- Simple classification
- Fixed-field extraction
- Answering questions from provided content
- Short copy generation

For example:

> Rewrite the following content in formal business tone.

If all the information needed is already in the input, there is usually no reason to launch a Planner, Retriever or Multi-Agent.

## Strengths of Direct

### Fast

Usually only one primary model call.

### Cheap

No extra retrieval, tool execution or multi-round verification.

### Easy to test

Input and output have a simple relationship, so a fixed test set is easy to build.

### Easy to observe

When something goes wrong, you do not need to find the bug across a dozen nodes.

## Limits of Direct

Direct does not mean "the model cannot reason" or "no tools at all".

The real limits are:

- no adaptive tool loop
- no persistent multi-step workflow
- cannot fetch missing external information by itself
- not suited to tasks that require long-lived state

If the model does not know an external fact, Direct will not magically know it just because the response is longer.

## Common anti-patterns of Direct

### Adding steps just to look like an agent

A task that originally needed one call gets reshaped into:

```text
Planner
 ↓
Writer
 ↓
Critic
 ↓
Refiner
```

Cost multiplies, but quality does not improve reliably.

### Using a free agent on a fixed-format task

If the task is only "convert this data to a fixed JSON", you should prefer:

- Schema
- Validation
- Deterministic Processing

rather than letting an Agent explore freely.

## Production notes

Direct can still be combined with:

- Input Validation
- Output Schema
- Timeout
- Token Limit
- Content Policy
- Basic Verifier
- Fallback Model

The point of Direct is not "do nothing about quality". It is "do not build an entire airport for an ordinary door".

---

## 2. Pipeline: a fixed-order controllable flow

Pipeline splits a task into fixed steps:

```text
A → B → C → D
```

Take RAG as an example:

```text
Query Rewrite
 ↓
Retrieve
 ↓
Rerank
 ↓
Generate
 ↓
Verify
```

Every request usually walks the same order through the nodes.

## Core traits of Pipeline

- Execution order predefined
- Each node has a fixed responsibility
- The previous node's output is the next node's input
- The model usually cannot freely change the main flow
- Each step can be tested in isolation

## Tasks suited to Pipeline

- RAG
- Document processing
- ETL
- Batch data cleaning
- Content generation and formatting
- Document ingestion
- Fixed review flows
- Image or audio processing chains

For example, a document Q&A system can run:

```text
Normalize Query
 ↓
Retrieve Documents
 ↓
Rerank Chunks
 ↓
Generate Answer
 ↓
Attach Citations
```

## Strengths of Pipeline

### Predictable

It is clear which nodes every request passes through.

### Easy to debug

When the answer is wrong, you can check each step:

- Did Rewrite corrupt the question?
- Did Retrieval miss the right content?
- Did Reranker sort incorrectly?
- Did the Generator misunderstand the source?
- Does the Citation actually correspond to the Claim?

### Easy to evaluate offline

| Node | Evaluable metric |
|---|---|
| Retrieval | Recall, Hit Rate |
| Reranking | NDCG, MRR |
| Generation | Faithfulness, Completeness |
| Citation | Citation Correctness |
| End-to-end | Answer Accuracy |

### Cost is easier to estimate

When the flow is fixed, the number of model and tool calls usually has a clear upper bound.

## Limits of Pipeline

### Every question may walk the same path

Even simple questions may go through full Rewrite, Retrieval, Reranking and Verification.

### Rigid against unknown situations

When a node fails, if no fallback is predefined, the whole chain may simply abort.

### Easy to form hidden coupling

Later nodes become more and more dependent on the special format of earlier nodes. Modifying one node can pull the whole chain.

## Common anti-patterns of Pipeline

### Using the most expensive model on every node

Classification, extraction, rewriting and verification do not always need a large model.

### Overlapping node responsibilities

Rewrite, Planner and Retriever all rewriting the query makes it hard to track where the original intent was changed.

### No node-level trace

Only the final answer is saved, not intermediate inputs and outputs. When something breaks, the system becomes a black box of smoke.

## Production notes

A mature Pipeline usually needs:

- Independent schema per node
- Trace ID
- Node-level latency
- Node-level token and cost
- Intermediate result persistence
- Timeout
- Error Type
- Fallback Policy
- Conditions for skippable nodes

A Pipeline itself is not necessarily an agent, but it can contain agentic nodes.

---

## 3. Router: do not let every question walk the same path

Router first judges the question type, then selects an execution path.

```text
 ┌→ Direct
 ├→ RAG
User Query → Router ├→ SQL
 ├→ Calculator
 └→ Agent Workflow
```

Router is one of the most useful components in a production AI system.

It does not necessarily answer the question itself. It decides:

> Who should handle this question?

![How a Router Sends Different Questions to Different Execution Paths](/images/the-atlas-of-agent-design-patterns-part-2/router-overview.png)

> **Figure 2-2｜How a Router Sends Different Questions to Different Execution Paths**
> A User Query goes through the Router and is split into Direct, RAG, SQL, Calculator or Agent Workflow, while being governed by Policy, Cost, Risk and Permission.

## What can a Router split on?

### Question type

- Knowledge Q&A
- Calculation
- Database query
- Writing
- Search
- Coding task

### Data source

- Document library
- SQL Database
- Web
- CRM
- API
- User-uploaded file

### User permission

- Regular user
- Administrator
- Finance staff
- Internal employee
- External customer

### Risk level

- Low risk, auto answer
- Medium risk, add verification
- High risk, require human approval

### Cost and latency

- Fast Mode
- Safe Mode
- Deep Research
- Agentic Mode

## Types of Router

### Rule-based Router

Uses fixed rules:

```text
Contains explicit calculation → Calculator
Asks about order data → SQL
Asks about document content → RAG
```

Strengths: cheap, stable, explainable.

Weakness: when rules grow, they tangle like charging cables behind a drawer.

### Classifier Router

Uses a classification model or LLM to judge intent.

Suited to tasks with high natural language variation.

### Hybrid Router

Handles obvious cases with rules first, then uses the model for ambiguous cases.

This is usually more stable than fully relying on the model.

### Semantic Router

Selects paths based on the semantic similarity between the Query Embedding and the route descriptions.

It is suited to routing whose boundaries are semantic in nature, but still has to handle:

- close similarity scores
- no clear path found
- multi-intent questions
- permission limits

![Router Deep Dive: Criteria, Types, Risks, and Production Notes](/images/the-atlas-of-agent-design-patterns-part-2/router-deep-dive.png)

> **Figure 2-2A｜Router Deep Dive: Criteria, Types, Risks, and Production Notes**
> This additional deep-dive figure summarises the router's decision criteria, four implementation methods, main risks, the Unknown path and production monitoring fields.

## Strengths of Router

- Simple questions take the fast path
- Complex questions trigger expensive flows
- Different data and permissions can be isolated
- Different paths can use different models
- Cost and latency tiers can be built
- Reduces unnecessary agent action

## Main risks of Router

### Routing errors

Once sent to the wrong path, even the strongest downstream system may not recover.

For example:

- Should query SQL, but sent to RAG
- Should answer directly, but launched Deep Research
- Should require human review, but ran automatically

### Missing the Unknown path

Router should not be forced to pick one of the existing paths.

A mature Router should allow:

- Unknown
- Ambiguous
- Unsupported
- Need Clarification
- Human Review

### Multi-intent questions

For example:

> Check last month's order count, analyse why it dropped, then write it as an email.

This contains at the same time:

- SQL
- Analysis
- Writing

A single route label is not enough; the question must be decomposed first.

## Production notes

A Router should at least record:

- Router Input
- Chosen Route
- Confidence
- Alternative Candidates
- Routing Reason
- Fallback Route
- Latency
- Cost
- Final Outcome

---

## 4. State Machine: keep the agent inside explicit states

A State Machine breaks the system into a set of states and the transitions allowed between them.

```text
START
 ↓
RETRIEVE
 ↓
Enough Data?
 ├─ Yes → ANSWER → END
 └─ No → REWRITE QUERY → RETRIEVE
```

Unlike Pipeline, a State Machine can:

- Branch based on conditions
- Return to a previous state
- Run a bounded retry
- Enter Pending
- Wait for an external event
- Stop at human approval
- Resume from an interrupted point

![State Machine: Control, Recovery, Persistence, and Human Approval](/images/the-atlas-of-agent-design-patterns-part-2/state-machine.png)

> **Figure 2-3｜State Machine: Control, Recovery, Persistence, and Human Approval**
> A research-oriented agent consists of PLAN, RESEARCH, VERIFY, WRITE and other states, with Retry Limit, FAILED, WAITING FOR APPROVAL and END added.

## Basic components of a State Machine

### State

Where the system currently sits.

For example:

- START
- PLANNING
- RESEARCHING
- VERIFYING
- WAITING_FOR_APPROVAL
- COMPLETED
- FAILED

### Transition

How the system moves from one state to another.

For example:

```text
VERIFYING → COMPLETED
VERIFYING → RETRYING
VERIFYING → HUMAN_REVIEW
```

### Condition

What triggers a transition.

For example:

- Citation Check Passed
- Retry Count < 2
- User Approved
- Data Is Complete
- Tool Call Failed
- Budget Exceeded

### Terminal state

Where the task officially ends.

For example:

- COMPLETED
- FAILED
- CANCELLED
- PARTIAL
- PENDING

Without an explicit Terminal State, the agent may keep believing it can try once more.

## Situations suited to State Machine

- Production agent
- Browser agent
- Coding agent
- Approval flow
- Document processing queue
- Long-running task
- Interruption recovery
- Bounded retry
- A flow with explicit success and failure conditions

## Strengths of State Machine

### Controllable flow

The agent cannot jump arbitrarily from any state to any state.

### Easy to limit retries

```text
retry_count >= 2
 ↓
FAILED
```

### Easy to persist progress

States and transitions can be persisted to a database.

### Suited to Human-in-the-loop

```text
READY_TO_SEND
 ↓
WAITING_FOR_APPROVAL
 ↓
APPROVED
 ↓
SENT
```

### Easy to build audit log

Every state change can leave behind:

- Time
- Reason
- Executor
- Tool result
- Cost
- Failure reason

## Limits of State Machine

### State explosion

If every detail becomes a State, the flowchart quickly becomes a hybrid of a metro map and a neural synapse.

### Conflicting conditions

The same state may match multiple transitions at once; priorities must be defined.

### Too rigid for highly unknown tasks

When the next step is almost impossible to enumerate in advance, the State Machine should wrap a local agent rather than replace it.

## State Machine and ReAct

They fit together naturally:

```text
State Machine:
controls the current RESEARCH state

ReAct:
decides within RESEARCH whether to search, open a page or rewrite the query
```

State Machine provides the boundary; ReAct provides local flexibility.

---

## 5. DAG: run parallelisable work in parallel

DAG stands for Directed Acyclic Graph.

It allows a task to split into multiple branches, run in parallel and then merge:

```text
 ┌→ Research A ─┐
Problem → Decompose
 ├→ Research B ─┼→ Synthesis
 ├→ Research C ─┤
 └→ Research N ─┘
 ↓
 Verify
 ↓
 Output
```

"Acyclic" means the data flow does not loop back along the DAG itself to an earlier node.

![DAG: Decompose, Run in Parallel, and Aggregate](/images/the-atlas-of-agent-design-patterns-part-2/dag.png)

> **Figure 2-4｜DAG: Decompose, Run in Parallel, and Aggregate**
> A problem is decomposed into multiple parallel research branches. After all required branches finish, it moves into Synthesis, Verify and Output.

## Tasks suited to DAG

- Deep research
- Multi-source data gathering
- Batch document processing
- Multi-market comparison
- Parallel test execution
- Multi-model independent analysis
- MapReduce-style work
- Large numbers of independent subtasks

## Core value of DAG

### Parallelism

If Research A, B, C are independent, you do not need to wait for one to finish before starting the next.

### Explicit dependencies

Synthesis must wait for the required branches to complete.

### Suited to large task decomposition

The Planner can split a task into multiple nodes, then hand them to an execution engine to schedule concurrency and dependencies.

## Limits of DAG

### Not suited to direct loops

If you need:

```text
Verify Failed
 ↓
Return to Research
```

this is no longer a pure DAG.

An outer State Machine can re-launch a DAG Run.

### Parallelism is not always faster

If all workers simultaneously contend for:

- the same API
- the same database
- the same model quota
- the same browser session

parallelism can actually cause:

- Rate Limit
- Connection Exhaustion
- Queue Congestion
- Token spikes
- Sudden cost surge

### Merging results can be hard

Multiple branches may:

- duplicate content
- conflict in conclusion
- use different formats
- use different versions
- use different names for the same concept

Synthesis therefore usually needs:

- Deduplication
- Conflict handling
- Source ordering
- Format unification
- Completeness check

## DAG and Multi-Agent

DAG does not necessarily mean Multi-Agent.

A script can also run multiple ordinary functions in parallel; a single agent can also call multiple tools in parallel.

Conversely, Multi-Agent does not necessarily use DAG. Multiple agents may hand off in sequence, or run inside a State Machine.

DAG describes dependencies, not the number of agents.

---

## How do Pipeline, State Machine and DAG differ?

| Comparison | Pipeline | State Machine | DAG |
|---|---|---|---|
| Main structure | Linear steps | States and conditional transitions | Directed dependency graph |
| Fixed order | Usually | Not necessarily | Depends on dependency |
| Conditional branching | Limited | Very strong | Supported |
| Loops | Usually no | Supported | Not supported |
| Retry | Simple | Very suited | Usually controlled by outer layer |
| Parallel | Limited | Possible | Very suited |
| Interruption recovery | Medium | Very suited | Depends on execution engine |
| Typical use | Fixed flow | Long task and recovery | Parallel subtasks |
| Common risk | Too rigid | State explosion | Aggregation and dependency complexity |

A transport metaphor helps:

- Pipeline is a train with fixed station order
- Router is a transit hub
- State Machine is a road network with traffic lights and U-turn rules
- DAG is multiple branch lines transporting at the same time and merging in a central warehouse

They can also be combined:

```text
Router
 ↓
State Machine
 ↓
Inside the RESEARCH state, run a DAG
 ↓
VERIFY
 ↓
Pipeline formats the output
```

---

## 6. Event-driven: it does not start because someone asked

The previous five paths usually start with a user input.

An event-driven system is triggered by events:

```text
New Email Arrives
 ↓
Classify
 ↓
Extract Attachment
 ↓
Store
 ↓
Notify
```

Common events include:

- An email arrives
- A new Issue appears on GitHub
- A new file is uploaded
- A database field is updated
- A Webhook arrives
- A scheduled time is reached
- A price crosses a threshold
- An external service returns a result

## Strengths of Event-driven

- Suited to long-running automation
- No need for a user to trigger it manually
- Easy to integrate with enterprise systems
- Suited to Queue and Worker
- Large flows can be split into asynchronous tasks

## Main risks of Event-driven

### Duplicate events

The same Webhook may be delivered multiple times.

So you need:

- Idempotency Key
- Event ID
- Deduplication
- Processed State

### Event order out of sync

Event B may arrive before Event A.

The system cannot rely on receive order alone.

### Poison message

An event that always fails processing may keep returning to the Queue.

You need:

- Retry Limit
- Dead-letter Queue
- Error Classification
- Manual Inspection

### Cannot reconstruct the full path

After events are scattered across multiple services, without a Trace ID it is hard to know which systems a task has been through.

---

## 7. Human-in-the-loop: some paths must stop

Human-in-the-loop is not an independent reasoning style. It is an execution control mode:

```text
Generate Draft
 ↓
Human Review
 ↓
Approved?
 ├─ Yes → Send
 └─ No → Revise
```

Situations that suit a human node:

- Send an email
- Execute a payment
- Delete data
- Publish public content
- Modify Production
- High-stakes legal and medical judgement
- Permission elevation
- Irreversible operation
- Conflicting data sources
- Model confidence too low

## What should humans review?

Do not just show an Approve button.

Provide:

- What the Agent is about to do
- Which data it used
- What the risk is
- Expected impact
- Whether it is reversible
- Which fields can be edited

## Where to resume after approval?

The State must be persisted.

Otherwise, after approval, re-running the whole flow may cause:

- Duplicate sending
- Duplicate writes
- Duplicate payments
- Duplicate task creation

Human-in-the-loop is not a patch for insufficient intelligence. It is part of the risk boundary.

---

## 8. Behavior Tree: organise behaviour with hierarchical nodes

Behavior Tree is common in games, robotics and control systems. It can also be used to orchestrate Agent behaviour.

Common nodes include:

### Sequence

Run all child nodes in order. If any one fails, the whole Sequence fails.

### Selector

Try child nodes in order. If any one succeeds, stop.

### Condition

Check whether a condition holds.

### Action

Perform an actual operation.

For example:

```text
Selector
├── Condition: Cached Answer Available
│ └── Return Cached Answer
├── Sequence
│ ├── Retrieve
│ ├── Verify
│ └── Generate
└── Ask Human
```

Behavior Tree puts more emphasis on reusable, hierarchical behaviour modules than State Machine does.

---

## 9. Programmatic Agent: produce an executable artefact first, then run it

A Programmatic Agent does not only produce a natural-language answer. It first produces an executable artefact:

- Python
- SQL
- Shell Command
- API Request
- DSL
- Workflow Definition
- Query Plan

The system then executes and verifies:

```text
User Request
 ↓
Generate Program
 ↓
Validate
 ↓
Execute
 ↓
Inspect Result
```

For example:

> Calculate the monthly churn rate.

The Agent can:

1. Generate SQL
2. Check whether it is read-only
3. Execute SQL
4. Verify the result
5. Organise it into a table

This is usually more reliable than letting the model guess a number.

But it also needs:

- Sandbox
- Permission Control
- Resource Limits
- SQL Read-only Policy
- Command Allowlist
- Execution Timeout
- Secret Isolation

---

## Five core execution paths compared

![Five Execution Path Patterns at a Glance](/images/the-atlas-of-agent-design-patterns-part-2/five-patterns-comparison.png)

> **Figure 2-5｜Five Execution Path Patterns at a Glance**
> Compares Direct, Pipeline, Router, State Machine and DAG by applicable scenario, strengths, limits, typical complexity and example; also includes a corrected selection flow.

| Pattern | Path structure | Dynamic branching | Loop | Parallelism | Controllability | Typical use |
|---|---|---:|---:|---:|---:|---|
| Direct | Single input/output | No | No | No | Very high | Translation, summarisation, rewriting |
| Pipeline | Fixed order | Few | Usually no | Limited | Very high | RAG, document processing |
| Router | First split | Yes | Depends on downstream | Possible | High | Multi-tool, multi-mode |
| State Machine | States and conditions | Very strong | Yes | Possible | Very high | Production agent |
| DAG | Directed dependency graph | Yes | No | Very strong | High | Deep research, batch |

---

## How to choose an execution path?

Ask in order:

## 1. Can one call finish the task, and is all the information already provided?

If yes:

> Prefer Direct.

## 2. Do different requests need different tools or data paths?

If yes:

> Use Router.

## 3. Do you need explicit State, retry, pause/resume or human approval?

If yes:

> Use State Machine.

## 4. Can subtasks run independently in parallel and then merge?

If yes:

> Use DAG.

## 5. If none of the above, is the flow fixed and stable?

If yes:

> Use Pipeline.

This is not an absolute classification, but it is closer to production design than "use an agent for every task".

---

## Common anti-patterns

## Anti-pattern 1: every question runs the full flow

Simple questions also trigger Planner, Retriever, Critic and Multi-Agent.

The result is:

- Slower
- More expensive
- More error nodes
- Harder to observe

## Anti-pattern 2: hand every branch to the LLM

The model can freely call any tool, but has:

- No Tool Allowlist
- No Max Steps
- No Budget
- No State Constraint
- No Stop Condition

This is not autonomy. It is loss of boundary.

## Anti-pattern 3: Pipeline has no Fallback

One source fails, the whole chain aborts directly.

## Anti-pattern 4: State Machine has no Terminal State

The task spins forever between RETRY, REPLAN and VERIFY.

## Anti-pattern 5: DAG over-parallelises

Dozens of Workers start at once, hitting:

- API Rate Limit
- Database Connection Limit
- Queue Backlog
- Token spikes

## Anti-pattern 6: Router has no Unknown

No matter how ambiguous, it is forced to pick a path.

## Anti-pattern 7: human approval is just decoration

The approver cannot see operation content, data sources or impact scope, and can only press Approve blindly.

---

## What should a production execution path provide?

| Capability | Role |
|---|---|
| Trace ID | String the whole task together |
| State Persistence | Save progress |
| Timeout | Prevent infinite waiting |
| Retry Limit | Prevent infinite retry |
| Idempotency | Prevent duplicate execution |
| Fallback | Switch when the main path fails |
| Budget Guard | Limit cost |
| Tool Allowlist | Restrict usable tools |
| Terminal States | Define complete, failed and cancelled |
| Audit Log | Record who did what |
| Human Approval | Protect high-risk operations |
| Observability | Track latency, error and cost |

The value of an execution path is not just a prettier flowchart.

It lets the system answer:

- Where is it now?
- Why did it take this path?
- Which node failed?
- How many retries already?
- Is it still worth continuing?
- Is the task complete?
- Which operations actually executed?

---

## Conclusion

Direct, Pipeline, Router, State Machine and DAG solve different flow problems respectively.

- **Direct**: simple tasks that one call can finish
- **Pipeline**: fixed and predictable processing flow
- **Router**: let different requests walk different paths
- **State Machine**: conditional transitions, retry, recovery, persistence and approval
- **DAG**: parallelisable decomposition and merging
- **Event-driven**: automation triggered by external events
- **Human-in-the-loop**: high-risk and irreversible operations
- **Behavior Tree**: hierarchical, reusable behaviour
- **Programmatic Agent**: produce and execute verifiable programs

Mature systems rarely use only one.

The more common combination is:

```text
Event
 ↓
Router
 ↓
State Machine
 ↓
Inside some State, run a Pipeline or DAG
 ↓
Human Approval
 ↓
Terminal State
```

More freedom in execution paths is not always better.

What really matters is:

> Which parts should be fixed, which need branching, which work can run in parallel, and which nodes must stop for verification.

The next article enters the second dimension:

> How does the Agent decide the next step?

Part 3 will fully compare ReAct, Plan-and-Execute, Adaptive Planning, Hierarchical Planning and HTN, and explain why mature systems usually let the Planner handle the whole picture, ReAct handle the on-site call, and the Verifier decide whether to re-plan.