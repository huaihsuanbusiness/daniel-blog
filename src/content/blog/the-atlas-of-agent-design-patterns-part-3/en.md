---
title: "The Atlas of Agent Design Patterns Part 3 ｜ ReAct, Plan-and-Execute and Adaptive Planning: How Agents Decide What to Do Next"
description: "A complete comparison of Fixed Workflow, ReAct, Plan-and-Execute, Adaptive Planning, Hierarchical Planning and HTN, plus how production agents combine Planner, Executor, Verifier, State Machine and Policy Guardrails."
date: 2026-06-30T19:20:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 3
---

In the previous article we walked through the execution skeletons of an Agent:

- Direct
- Pipeline
- Router
- State Machine
- DAG
- Event-driven
- Human-in-the-loop

Those patterns decide:

- which nodes a task passes through
- which nodes are allowed to branch
- which work can run in parallel
- where the task returns to after a failure
- how state is persisted
- when the flow formally ends

But even after the execution path is drawn, the system still has to answer another question:

> What should the Agent do next?

For example, once a research Agent enters the `RESEARCH` state, the next step could be:

- search the web
- rewrite the query keywords
- open the official documentation
- query an internal database
- compare several sources
- ask the user for missing context
- judge that the material is already enough
- stop the research and move on to writing the answer

These choices cannot all be hard-coded at development time.

The Agent has to pick the next action based on:

- the user's goal
- the current state
- the work already completed
- the results returned by the tool
- the remaining budget
- the permission and risk constraints

This is exactly the problem Fixed Workflow, ReAct, Plan-and-Execute, Adaptive Planning, Hierarchical Planning and HTN are trying to solve.

They are not different species of complete Agents. They are different decision and planning strategies.

---

## Execution paths and decision strategies are not the same thing

Take a simplified State Machine:

```text
START
  ↓
PLAN
  ↓
RESEARCH
  ↓
VERIFY
  ↓
ANSWER
  ↓
END
```

This diagram only tells us which states the system passes through.

But once it enters `RESEARCH`, the system can still pick among several decision strategies.

## Fixed logic

```text
Search
  ↓
Open Top Results
  ↓
Extract Facts
  ↓
Return
```

The next step is decided by the program.

## ReAct

```text
Observe Current State
  ↓
Decide Next Action
  ↓
Use Tool
  ↓
Inspect Observation
  ↓
Decide Again
```

The next step depends on the latest tool result.

## Plan-and-Execute

```text
Research Goal
  ↓
Create Subplan
  ↓
Execute Step 1
  ↓
Execute Step 2
  ↓
Return Structured Result
```

The system builds a local plan first, then executes it step by step.

So inside the same State Machine, one node can use a fixed flow, while another uses ReAct or Plan-and-Execute.

The reverse is also true: a Plan-and-Execute Agent can be put inside a Pipeline, a State Machine or a DAG.

| Question | The matching dimension |
|---|---|
| Which nodes does the task pass through? | Execution path |
| What does the Agent do next? | Decision and planning |
| Does it explore multiple candidates? | Reasoning and search |
| How does it recover from mistakes? | Verification and recovery |

Separating these questions keeps an Agent architecture from collapsing into a single soup of names.

![Figure 3-1 — One Execution Skeleton, Three Decision Strategies](/images/the-atlas-of-agent-design-patterns-part-3/skeleton-with-three-decision-strategies.png)

> **Figure 3-1 ｜ One Execution Skeleton, Three Decision Strategies**  
> The same `RESEARCH` state can use Fixed Workflow, ReAct or Plan-and-Execute. The execution skeleton controls the overall route; the decision strategy controls the behaviour inside each node.

---

## 1. Fixed Workflow: the next step is already decided

Before we discuss ReAct, start with the most controllable approach.

Fixed Workflow means the next step is defined by the program or the flow, not chosen freely by the model.

```text
Classify
  ↓
Retrieve
  ↓
Generate
  ↓
Verify
```

Once `Retrieve` finishes, the next step is `Generate`.

The model does not suddenly decide to search the web, spawn a sub-task, or redesign the entire flow.

## Tasks that fit Fixed Workflow

- the steps are stable
- the task boundaries are clear
- every request needs the same steps
- the output format is fixed
- cost and latency must be highly predictable
- autonomous decisions add little value

For example:

```text
Upload File
  ↓
Parse
  ↓
Chunk
  ↓
Embed
  ↓
Index
```

This kind of ingestion pipeline usually does not need the Agent to decide its own next step.

## Strengths

- easy to test
- easy to reproduce
- cost is stable
- the permission boundary is clear
- it rarely falls into infinite loops
- the responsibility of each node is easy to define

## Limits

When the external environment is uncertain, a fixed flow may not be flexible enough.

For example, if a data source becomes unreadable and the system has not pre-designed a fallback, it has no way to know whether it should:

- rewrite the query
- switch sources
- request login
- mark the data as unavailable
- stop the task

Fixed Workflow is not a step backwards.

Many mature Agent systems still keep a fixed flow on the outside, and only hand the few nodes that cannot be hard-coded over to the Agent.

---

## 2. ReAct: read the result, then decide the next step

ReAct can be understood as an interleaved loop of Reasoning and Acting.

In a real system, the more useful description is:

```text
Read Goal and Current State
  ↓
Decide Next Action
  ↓
Call Tool
  ↓
Normalize Observation
  ↓
Update Progress
  ↓
Decide Again
```

It does not have to write out a full plan first.

After every action, it re-judges the next step based on the new observation.

## A ReAct example: look up a company's latest pricing

First action:

```text
Action:
Search the official pricing page
```

Observation:

```text
The pricing page only shows annual plans.
```

Second action:

```text
Action:
Search the official billing documentation
```

Observation:

```text
Monthly billing is available only for selected plans.
```

Third action:

```text
Action:
Open the official billing FAQ
```

The Agent does not need to know every search step before it starts.

It adjusts the direction based on each tool result.

## What tasks does ReAct fit?

### Tool results are unpredictable

For example:

- Search
- Browser
- API
- Database
- File System
- Computer-use

### The task path is hard to hard-code

For example:

- Debug
- web research
- hunting for complete documentation
- operating unfamiliar interfaces
- cross-source verification

### The next step depends heavily on the previous result

For example:

```text
API returns 401
  ↓
Inspect authentication

API returns 404
  ↓
Inspect endpoint

API returns empty data
  ↓
Inspect query parameters
```

Different observations lead to different actions.

## Strengths of ReAct

### High adaptability

The Agent can adjust its strategy based on the real environment.

### Good for exploration

It does not have to enumerate every possible branch in advance.

### Tool results can correct the model's judgement

The model does not have to rely only on its internal knowledge; it can update its state from external data.

### Local failures are easy to reroute around

When one source fails, the Agent can switch to another without redoing the whole task.---

## Why does ReAct easily loop in circles?

ReAct's main problem is rarely a lack of action ability. It is a lack of global control.

A typical failure looks like:

```text
Search Query A
  ↓
Results insufficient
  ↓
Search Query B
  ↓
Results insufficient
  ↓
Search Query A again
  ↓
Open a previous result
  ↓
Search Query B again
```

The Agent looks busy, but no real progress is being made.

## Reason 1: no definition of progress

The Agent only knows "keep searching", but does not know what counts as enough data.

## Reason 2: observations are not structured

Tool results are long blobs of text, and the Agent struggles to track:

- which sources have already been checked
- which questions are still unresolved
- which pieces of information conflict
- which queries have already failed
- which actions are being repeated

## Reason 3: no duplicate-action check

The system does not detect:

- the same query
- the same URL
- the same tool call
- the same parameters
- the same failure reason

## Reason 4: stop conditions are too vague

For example:

> Keep searching until enough information is found.

"Enough" is not turned into a verifiable condition.

## Reason 5: tool selection is too free

The Agent can call a dozen tools, but has no:

- Tool Allowlist
- Tool Cost
- Tool Priority
- Permission Boundary
- Maximum Calls

Eventually every tool gets poked once, and the task still has not moved.

---

## What guardrails does Production ReAct need?

ReAct should not be an unbounded free loop.

At minimum it needs:

| Guardrail | What it does |
|---|---|
| Maximum Steps | Caps the number of actions |
| Tool Allowlist | Limits which tools can be used |
| Per-tool Limit | Caps the number of calls to a single tool |
| Budget Guard | Caps Token, time and API cost |
| Duplicate Detection | Blocks repeated queries and operations |
| Stop Conditions | Defines when the task is complete |
| Progress State | Records completed and outstanding items |
| Failure Escalation | Switches to a fallback or human handling after repeated failures |
| Tool Result Schema | Structures the observation |
| Audit Trace | Persists action, result and decision records |

A more stable ReAct loop looks like:

```text
Goal + Current State
  ↓
Check Budget and Policy
  ↓
Select Allowed Action
  ↓
Execute Tool
  ↓
Normalize Observation
  ↓
Update Progress
  ↓
Stop Condition?
  ├─ Yes → Complete
  └─ No → Select Next Action
```

The point is not to let the Agent reinvent the world on every step. It is to let it adjust inside boundaries.

![Figure 3-2 — Production ReAct Loop](/images/the-atlas-of-agent-design-patterns-part-3/react-production-loop.png)

> **Figure 3-2 ｜ Production ReAct Loop**  
> Production ReAct is more than an Action/Observation loop. It also needs a Budget Guard, Tool Policy, Max Steps, Duplicate Detection, Progress State and an explicit stop condition.

---

## 3. Plan-and-Execute: read the full map first, then start walking

Plan-and-Execute runs at a different rhythm.

It does not call a tool right away. It first breaks the goal into a sequence of steps.

```text
Goal
  ↓
Create Plan
  ↓
Execute Step 1
  ↓
Execute Step 2
  ↓
Execute Step 3
  ↓
Synthesize Result
```

For example, the task is:

> Compare three Agent frameworks and recommend the one that fits a Production RAG setup.

The Planner might first build:

```text
1. Define evaluation criteria
2. Collect official architecture information
3. Compare workflow control
4. Compare persistence and observability
5. Compare multi-agent support
6. Evaluate Production risks
7. Produce recommendation
```

The Executor then handles each step in order.

## What tasks does Plan-and-Execute fit?

- the task is long
- the deliverable is clear
- items are easy to miss
- multiple sources of data are needed
- sub-tasks have ordering dependencies
- progress needs to be tracked
- the work has to be split across multiple Workers

Common scenarios include:

- Deep Research
- market analysis
- long-form reports
- project planning
- large code refactors
- multi-document review
- cross-system data consolidation

## Strengths of Plan-and-Execute

### Better global view

Before acting, the system confirms which parts the task actually contains.

### Less likely to be dragged off by the first result

ReAct may see the first interesting source and keep digging.

The Planner keeps reminding the system that other sub-questions are still unresolved.

### Progress is easy to track

The system can clearly know:

- which steps are already complete
- which step is currently running
- which steps are blocked
- which results are not yet integrated

### Good for parallel division of work

The Planner can place independent steps into a DAG and hand them to multiple Workers to run at the same time.

---

## Why does Plan-and-Execute run all the way off course?

The weakness of Plan-and-Execute concentrates in the initial plan.

If the Planner misunderstands the task, the Executor can be extremely efficient at finishing the wrong plan.

For example, the user asks:

> Evaluate whether a job listing is a fit for me.

The Planner builds:

```text
1. Read the job title
2. Infer likely responsibilities
3. Compare inferred requirements with the CV
4. Produce a score
```

The problem is:

- it never read the full job description
- it guessed the content from the title
- every later step is built on the wrong input

The final report may look structurally complete and professionally written, and still be untrustworthy.

## Common failure 1: the plan is too abstract

```text
1. Research the topic
2. Analyze the findings
3. Write the answer
```

This is not an executable plan. It is the task rephrased.

## Common failure 2: the plan is too granular

The Planner lists dozens of micro-steps; execution cost and state management quickly explode.

## Common failure 3: no dependency tracking

Some steps have to wait for upstream data, but the Planner launches them in parallel anyway.

## Common failure 4: no completion criteria

"Research the competitors" is not an acceptable step.

A better version is:

```text
Collect official pricing, core features, target users,
and deployment model for every selected competitor.
```

## Common failure 5: the plan never gets updated after creation

External conditions have changed, but the Agent keeps executing the original plan.

---

## What should a good plan contain?

An executable plan is more than a list of steps.

Each step should ideally include:

| Field | What it means |
|---|---|
| Step ID | Unique identifier |
| Objective | What this step is meant to achieve |
| Inputs | Which pieces of data it needs |
| Allowed Tools | Which tools it may use |
| Dependencies | Which previous steps it depends on |
| Expected Output | What it should produce |
| Completion Criteria | How to judge it is done |
| Failure Policy | Retry, Fallback, Pending or Stop |
| Cost Budget | Token, time and tool limits |
| Status | Pending, Running, Completed or Failed |

For example:

```text
Step ID:
S3

Objective:
Collect official pricing information

Inputs:
Company names and official domains

Allowed Tools:
Web Search, Browser

Dependencies:
S1 evaluation criteria completed

Expected Output:
Structured pricing table with source and access date

Completion Criteria:
Pricing found for every company,
or unavailable items explicitly marked

Failure Policy:
Try official pricing page,
then official documentation,
then official announcements,
otherwise mark Unavailable
```

This is a plan the Executor can run and the Verifier can accept.

![Figure 3-3 — From Goal to an Executable Plan](/images/the-atlas-of-agent-design-patterns-part-3/executable-plan-contract.png)

> **Figure 3-3 ｜ From Goal to an Executable Plan**  
> The Planner does more than list steps. It turns a fuzzy goal into an execution contract that carries Inputs, Tools, Dependencies, Expected Output, Completion Criteria, Failure Policy and Budget.---

## 4. Adaptive Planning: the plan is not scripture

Adaptive Planning updates the remaining plan during execution.

```text
Create Plan
  ↓
Execute Step
  ↓
Inspect Result
  ↓
Plan Still Valid?
  ├─ Yes → Continue
  └─ No → Revise Remaining Plan
```

It combines Plan-and-Execute's global view with ReAct's on-site adaptability.

## When is a replan needed?

### A premise turns out to be wrong

For example:

- you assumed the official API was available
- in fact the API has been retired
- the remaining plan has to switch sources

### New information changes the direction of the task

For example:

- mid-research you discover the product has been discontinued
- the original feature comparison no longer makes sense
- the task should become a migration comparison instead

### A step cannot be completed

For example:

- the page requires login
- the document does not exist
- the permission is not enough
- the tool does not support the operation

### The budget runs short

The original plan needed ten large model calls, but the remaining budget only allows three.

### Verification fails

The Verifier finds:

- incomplete citations
- unreliable sources
- conclusions without evidence
- required fields are missing

At this point the answer may not be enough to just rewrite the output; the system may have to go back and fill in more research.

## Replanning is not starting over

Mature Adaptive Planning usually only modifies the remaining steps.

For example:

```text
Completed:
1. Define comparison criteria
2. Identify candidate frameworks

Blocked:
3. Collect pricing from official pricing pages
```

After the update:

```text
Preserved:
1. Define comparison criteria
2. Identify candidate frameworks

Revised:
3A. Search official documentation
3B. Search official announcements
3C. Mark unavailable pricing explicitly
4. Continue architecture comparison
```

Work that is already complete and still valid does not need to be thrown away.

## Replan triggers should be explicit

Do not let the Agent redesign the entire plan after every step.

Reasonable triggers:

- Critical assumption failed
- Required data unavailable
- Verifier rejected output
- Dependency changed
- Budget threshold reached
- User goal changed
- Two consecutive step failures
- New high-priority risk discovered

## Risks of Adaptive Planning

### Excessive replanning

The Agent spends most of its time revising the plan and very little actually executing work.

### Plan drift

Every replan shifts the goal slightly, until the work has wandered away from the original requirement.

### Completed work gets re-executed

The Planner does not read State, so it reschedules steps that are already done.

### Replanning becomes a way to avoid failure

After a step fails the Agent keeps swapping plans, instead of admitting the data is not available.

Adaptive Planning therefore needs:

- Immutable User Goal
- Completed Step Registry
- Replan Reason
- Plan Version
- Maximum Replans
- Plan Diff
- Verifier Approval for Major Changes

![Figure 3-4 — Adaptive Planning and Plan Versioning](/images/the-atlas-of-agent-design-patterns-part-3/adaptive-planning-with-versions.png)

> **Figure 3-4 ｜ Adaptive Planning and Plan Versioning**  
> After Plan v1 fails partway through, the Agent keeps the completed results, records the Replan Trigger and Plan Diff, and produces Plan v2 that only modifies the remaining steps.

---

## 5. Hierarchical Planning: a long task is not a flat checklist

Once the task grows long, putting every step on one flat layer quickly falls apart.

Hierarchical Planning breaks a large goal into subgoals, and then breaks each subgoal into executable tasks.

```text
Main Goal
├── Subgoal A
│   ├── Task A1
│   ├── Task A2
│   └── Task A3
├── Subgoal B
│   ├── Task B1
│   └── Task B2
└── Subgoal C
    ├── Task C1
    └── Task C2
```

For example:

```text
Produce Market Analysis
├── Analyze Market
│   ├── Estimate market size
│   └── Identify growth drivers
├── Analyze Competitors
│   ├── Collect pricing
│   ├── Compare features
│   └── Review positioning
└── Produce Recommendation
    ├── Summarize findings
    ├── Identify risks
    └── Recommend strategy
```

## Why Hierarchical Planning is valuable

### Lower complexity

The upper layer only has to track whether each subgoal is finished; it does not have to follow every tool call.

### Easy to assign Workers

Each subgoal can be handed to a different specialised Agent.

### Easy to retry locally

If competitor analysis fails, the system does not have to redo the market sizing.

### Easier to control Context

Each Worker only receives the information relevant to its task.

## Risks of Hierarchical Planning

### Subgoals duplicate work

Two Workers may end up querying the same data.

### Information gets lost between layers

The intent of the upper Planner gets simplified or distorted after several hand-offs.

### Hard to integrate

Even if every sub-task is complete, the main goal may still not be complete.

For example:

- the formats differ
- the assumptions differ
- the dates differ
- the conclusions contradict each other

Hierarchical Planning therefore usually needs:

- explicit Input / Output Contracts
- Shared Fact Registry
- Source Tracking
- Dependency Management
- Final Synthesis
- Cross-task Verification

---

## 6. HTN: decompose with predefined methods

HTN stands for Hierarchical Task Network.

It also breaks a large task into smaller tasks, but it differs from a free-form Planner in one important way:

> HTN normally uses decomposition methods predefined by humans.

For example, for the task "process a customer refund", the system can define:

```text
Process Refund
├── Verify Order
├── Check Refund Eligibility
├── Calculate Refund Amount
├── Request Approval if Required
├── Execute Refund
└── Notify Customer
```

This is not a plan the model invents on the spot. It is a procedure the company has already approved.

## The basic elements of HTN

### Compound Task

A large task that needs to be decomposed.

For example:

```text
Process Customer Refund
```

### Method

The way to decompose the large task.

For example:

```text
If order is within 30 days:
Use Standard Refund Method

If order is older than 30 days:
Use Exception Review Method
```

### Primitive Task

The smallest task that can be executed directly.

For example:

- Query order database
- Calculate refund
- Create approval request
- Send confirmation email

## What scenarios fit HTN?

- enterprise SOPs
- customer service flows
- logistics
- finance approval
- IT Operations
- compliance
- tasks with a known processing method
- flows that require high consistency

## Strengths of HTN

- more controllable than free Planning
- the decomposition method is auditable
- easy to fit enterprise rules
- execution results stay consistent
- good for permission and compliance management
- sub-flows can be reused

## Limits of HTN

- a method library has to be built by hand
- weaker against unknown tasks
- high maintenance cost for the rule set
- if a method goes stale, the system can keep making the same wrong decision
- when several Methods apply at once, a selection strategy is needed

## How HTN differs from Plan-and-Execute

| Dimension | Plan-and-Execute | HTN |
|---|---|---|
| Source of the plan | Generated dynamically by the model | Predefined Method |
| Flexibility | High | Medium |
| Controllability | Medium | High |
| Consistency | Medium | High |
| Unknown tasks | Better fit | Weaker fit |
| Enterprise SOP | Possible | Very suitable |
| Main risk | Plan hallucination | Outdated rules |HTN can be combined with an LLM:

```text
LLM:
Understand natural-language requests and pick the HTN task

HTN Engine:
Decompose and execute using the approved Method

LLM:
Handle the nodes that need language understanding
```

This structure lets the LLM handle fuzzy understanding, and lets HTN handle reliable procedure.

---

## 7. Goal-driven Agent: the goal is clear, the path is not

A Goal-driven Agent is given only the final goal. The Agent keeps picking the action that is most likely to move it closer to that goal.

```text
Goal
  ↓
Observe Current State
  ↓
Choose Action
  ↓
Measure Progress
  ↓
Repeat
```

For example:

> Make this repository pass the full test suite.

The Agent can choose on its own to:

- inspect the repository
- run the tests
- read the errors
- modify the code
- run the tests again
- run the linter
- check the build

Goal-driven has a lot of flexibility, but it needs a measurable completion condition.

A good goal:

```text
All target tests pass
Full test suite passes
Lint passes
Build succeeds
No unrelated files changed
```

A vague goal:

```text
Improve the repository
```

The latter has almost no stopping criterion.

## What does a Goal-driven Agent need?

- Measurable Objective
- Current State
- Progress Metric
- Allowed Actions
- Failure Boundary
- Resource Budget
- Completion Verifier
- Maximum Iterations

Without these constraints, Goal-driven tends to become "I could always improve a little more".

---

## 8. Policy-based Decision: just because it can be done does not mean it should

When the Agent decides the next step, it should not only consider:

> Which action is most likely to complete the task?

It should also consider:

- permissions
- risk
- cost
- privacy
- compliance
- reversibility
- user settings

Policy-based Decision runs a check before the action:

```text
Proposed Action
  ↓
Policy Check
  ├─ Allowed → Execute
  ├─ Requires Approval → Pause
  └─ Denied → Reject or Use Fallback
```

## Common policies

### Tool Policy

Which tools can be used?

### Permission Policy

Which data can be read or written?

### Cost Policy

How much model and tool cost is allowed for this task?

### Risk Policy

Which operations need human approval?

### Data Policy

Which data is not allowed to be sent to an external model?

### Environment Policy

Which operations can only run inside a Sandbox?

## Why should policies not only live in the prompt?

The prompt is a behavioural hint, not a reliable enforcement mechanism.

Important restrictions should be enforced by the program or the infrastructure, for example:

- SQL Read-only Connection
- File-system Sandbox
- API Scope
- Tool Allowlist
- Spending Limit
- Approval Gate
- Network Restriction

Do not let the Agent decide for itself whether it should follow its own safety rules.

---

## A full comparison of ReAct, Plan-and-Execute and Adaptive Planning

| Comparison axis | ReAct | Plan-and-Execute | Adaptive Planning |
|---|---|---|---|
| Core rhythm | Decide after acting | Plan first, then execute | Plan first, then update during execution |
| Global view | Weaker | Strong | Strong |
| On-site adaptation | Very strong | Weaker | Strong |
| Plan created first | Not necessarily | Yes | Yes |
| Plan modified during execution | Usually no formal plan | Rarely | Yes |
| Fit for | Search, Debug, Browser | Reports, research, long tasks | Long tasks with an unstable environment |
| Cost predictability | Lower | Medium to high | Medium |
| Main risk | Looping, short-sightedness | A wrong plan executed end-to-end | Over-replanning, goal drift |
| Required guardrails | Max Steps, Tool Policy | Plan Schema, Completion Criteria | Plan Version, Replan Trigger |
| Best use | Local Executor | Upper-layer Planner | Long-running Production tasks |

---

## The most practical hybrid: Planner + ReAct Executor + Verifier

Mature systems rarely choose pure ReAct or pure Plan-and-Execute.

The more common combination is:

```text
User Goal
  ↓
Planner
  ↓
Structured Plan
  ↓
State Machine selects current step
  ↓
ReAct Executor
  ↓
Verifier
  ├─ Pass → Next Step or Final Answer
  ├─ Repair → Return to Executor
  └─ Replan → Return to Planner
```

## What the Planner is responsible for

- understanding the full goal
- breaking it into sub-tasks
- defining dependencies
- setting completion criteria
- allocating the Budget
- choosing the execution order

## What the ReAct Executor is responsible for

- using tools within a single step
- adjusting the action based on the observation
- trying limited local fallbacks
- updating step status
- returning a structured result

## What the Verifier is responsible for

- judging whether a step is actually complete
- checking the output format
- validating sources
- deciding whether a local repair is needed
- deciding whether an overall replan is needed

## What the State Machine is responsible for

- restricting allowed state transitions
- persisting progress
- limiting retries
- controlling human approval
- defining the terminal state

## What the Policy Layer is responsible for

- limiting tools
- limiting data access
- limiting cost
- intercepting high-risk actions
- requiring human approval

This combination can be read as:

> The Planner owns the global picture, ReAct handles the on-site call, the Verifier accepts the result, the State Machine manages the traffic, and the Policy Layer guards the boundary.

![Figure 3-5 — Production Planning Architecture](/images/the-atlas-of-agent-design-patterns-part-3/production-planning-architecture.png)

> **Figure 3-5 ｜ Production Planning Architecture**  
> The Planner, Plan Store, State Machine, ReAct Executor and Verifier form the main workflow. The Budget Guard, Tool Policy, State Persistence, Audit Trace and Human Approval form the outer layer of governance.

---

## Which decision strategy fits which task?

| Task characteristic | Suggested approach |
|---|---|
| The steps are fully fixed | Fixed Workflow |
| Only one tool needs to be picked | Router / Tool Selection |
| The next step depends on the tool result | ReAct |
| The task is long and easy to miss items | Plan-and-Execute |
| The plan may change because of external results | Adaptive Planning |
| The task can be split into multiple subgoal layers | Hierarchical Planning |
| A mature enterprise SOP already exists | HTN |
| The goal can be verified objectively but the route is unknown | Goal-driven Agent |
| The operation touches permissions, cost or risk | Policy-based Decision |

---

## Common anti-patterns in decision and planning

## Anti-pattern 1: planning every task first

Forcing a five-step plan onto a simple translation just adds latency.

## Anti-pattern 2: treating the plan as fact

The steps the Planner produces can still be wrong.

The plan needs to be verified, not worshipped.

## Anti-pattern 3: ReAct with no stop condition

The Agent keeps searching, opening pages and rewriting queries, but there is no criterion for "enough data".

## Anti-pattern 4: dumping every tool result into Context

Without structured State, the Agent forgets which work is already done.

## Anti-pattern 5: replanning without versions

New plans overwrite old plans, so there is no record of what changed and why.

## Anti-pattern 6: sub-tasks without completion criteria

The Executor returns a blob of text, and the system marks the step complete.

## Anti-pattern 7: inconsistent plan granularity

Some steps take a minute, others take hours, so scheduling and acceptance become impossible.

## Anti-pattern 8: safety rules only in the Prompt

The Agent "should not" run a high-risk operation, but the tool layer has no real restriction.

## Anti-pattern 9: ReAct and the Planner duplicating work

The Planner already scheduled three sources to search; the Executor then designs the whole research strategy again.

## Anti-pattern 10: replanning forever instead of admitting failure

When the data does not exist, the permission is missing or the tool does not support it, the correct answer can be:

- Pending
- Unavailable
- Unsupported
- Requires Human Action

Not every problem can be solved by thinking one more round.

---

## What should Production Planning record?

| Data | Why it matters |
|---|---|
| Original Goal | Prevents task drift |
| Current Plan Version | Tracks the latest plan |
| Plan Diff | Records each modification |
| Step Status | Tracks progress |
| Step Dependencies | Controls execution order |
| Tool Calls | Tracks actual actions |
| Observations | Persists tool results |
| Completion Criteria | Validates each step |
| Retry Count | Limits local retries |
| Replan Count | Limits replanning |
| Remaining Budget | Controls cost |
| Failure Reason | Picks Repair, Fallback or Stop |
| Verifier Result | Decides whether to pass |
| Terminal State | Completed, Failed, Partial or Pending |

Without these records, a long task is just a long conversation, not a manageable system.

---

## A complete example: how a research Agent decides the next step

The task:

> Compare three Agent frameworks and recommend the one that fits a Production RAG architecture.

## Step 1: Router

Recognise that this is not a simple Q&A and needs the Research Workflow.

## Step 2: Planner

Build the plan:

```text
1. Define evaluation criteria
2. Identify candidate frameworks
3. Collect official architecture information
4. Compare persistence and state management
5. Compare observability and testing
6. Compare multi-agent capabilities
7. Evaluate risks
8. Produce recommendation
```

## Step 3: Executor

When running "Collect official architecture information", the Executor uses ReAct:

```text
Search official documentation
  ↓
Open architecture page
  ↓
Information incomplete
  ↓
Search persistence documentation
  ↓
Open official repository
  ↓
Extract structured findings
```

## Step 4: Verifier

Check:

- whether every claim comes from an official source
- whether every evaluation field is covered
- whether missing data is flagged
- whether different versions of information have been mixed

## Step 5: Adaptive Replan

Discover that one of the frameworks does not publicly disclose a particular field.

Update the remaining plan:

```text
Replace unavailable field with:
- Publicly documented capabilities
- Explicitly marked unknowns
- No inferred claims
```

## Step 6: Synthesis

Integrate all the results and produce the recommendation.

This system is not pure ReAct, and not pure Plan-and-Execute.

It uses:

- Router
- Structured Planning
- ReAct Execution
- Verification
- Adaptive Replanning
- State Management
- Budget Guard
- Tool Policy

That is what comes closer to a Production Agent.

---

## Conclusion of this article

The way an Agent decides its next step ranges from highly fixed to highly autonomous.

- **Fixed Workflow**: the next step is decided by the program
- **ReAct**: pick actions step by step based on tool results
- **Plan-and-Execute**: build a global plan first, then execute it step by step
- **Adaptive Planning**: update the remaining plan during execution as new information comes in
- **Hierarchical Planning**: decompose a large goal into multiple subgoal layers
- **HTN**: decompose a task using pre-approved methods
- **Goal-driven Agent**: keep choosing actions based on the goal and progress
- **Policy-based Decision**: decide inside boundaries of permission, risk and cost

No single method is best for everything.

Simple tasks do not need a Planner. Fixed flows do not need free ReAct. High-risk SOPs should not be invented on the fly by the model.

Production systems more often use:

```text
Router
  ↓
Planner
  ↓
Structured Plan
  ↓
State Machine
  ↓
ReAct Executor
  ↓
Verifier
  ↓
Continue / Repair / Replan
```

What really matters is not giving the Agent the most freedom, but:

> allowing autonomy where flexibility is needed, and building constraints where reliability is needed.

The next article enters the third dimension:

> When a question has many possible solutions, how should the Agent search?

Part 4 will fully compare Single-path Reasoning, Self-consistency, Generate-and-Rank, Beam Search, Tree of Thoughts, Graph of Thoughts, MCTS and LATS.