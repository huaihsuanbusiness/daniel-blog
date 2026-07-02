---
title: "The Atlas of Agent Design Patterns Part 3 | ReAct, Plan-and-Execute, Adaptive Planning, and HTN"
description: "A production-focused guide to fixed decision logic, bounded ReAct, explicit plans, adaptive replanning, hierarchical decomposition, HTN, plan verification, and the architecture that combines Planner, Executor, Verifier, State Machine, and policy controls."
date: 2026-06-20T17:00:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 3
---

Part 2 examined the outer execution structures of an agent system:

- Direct
- Pipeline
- Router
- State Machine
- DAG

Those structures describe how work may move through the system. They do not fully determine what happens inside one node.

Suppose a state machine enters `RESEARCH`. The node may still need to decide whether to:

- search the official documentation
- query an internal source
- rewrite a failed query
- inspect an API response
- ask the user for missing information
- stop because the evidence is sufficient
- escalate because the task cannot be completed safely

This is the decision-and-planning layer.

The central question is:

> How much of the next action should be predetermined, planned in advance, revised during execution, or selected from a formal procedure?

This article compares five useful approaches:

1. fixed decision logic
2. bounded ReAct
3. Plan-and-Execute
4. adaptive planning and replanning
5. hierarchical decomposition, including formal HTN planning

It also separates two concerns that are often mixed into the same list:

- **Goals** define the desired outcome.
- **Policies** constrain which actions are permitted.

Goals and policies shape every strategy. They are not peer planning algorithms.

## Execution structure and decision strategy are different layers

A state machine may define the outer route:

```text
START
  -> PLAN
  -> RESEARCH
  -> VERIFY
  -> ANSWER
  -> END
```

Inside `RESEARCH`, the system may use one of several decision strategies.

### Fixed logic

```text
Search official source
  -> Extract required fields
  -> Return structured result
```

The application decides the next step.

### Bounded ReAct

```text
Read goal and current state
  -> Select an allowed action
  -> Execute tool
  -> Inspect normalised observation
  -> Update progress
  -> Select again or stop
```

The next action depends on the latest observation, but only within explicit limits.

### Plan-and-Execute

```text
Create a structured plan
  -> Select the current step
  -> Execute the step
  -> Record the result
  -> Continue, repair, or replan
```

The system establishes a global plan before performing the individual steps.

These strategies can live inside the same outer workflow. A state machine can call a planner, launch a bounded ReAct executor for one step, and invoke a verifier before allowing the next transition.

![Figure 3-1 — One Execution Skeleton with Three Decision Strategies](/images/the-atlas-of-agent-design-patterns-part-3/skeleton-with-three-decision-strategies.png)

> **Figure 3-1｜One Execution Skeleton with Three Decision Strategies**  
> A single RESEARCH node inside an outer state machine can switch between fixed logic, bounded ReAct, and Plan-and-Execute depending on what the step requires.

## A more precise map of the planning layer

| Concern | Primary question | Typical mechanism |
|---|---|---|
| Fixed decision logic | Is the next step already known? | Rules, application code, fixed workflow |
| Reactive action selection | Does the next action depend on the latest observation? | Bounded ReAct or another closed-loop policy |
| Explicit planning | Should the task be decomposed before execution? | Plan-and-Execute |
| Replanning | Has new evidence invalidated the remaining plan? | Triggered adaptive planning |
| Hierarchical decomposition | Does the goal contain several levels of subgoals? | Hierarchical planner |
| Formal procedural decomposition | Is there a reusable domain model of valid decompositions? | HTN planner |
| Plan validation | Is the proposed plan feasible and acceptable? | Verifier, simulator, solver, policy checks |
| Governance | Which actions are allowed and how much may they cost? | Policy layer, budget, approval, audit |

This map is intentionally layered. It avoids treating every named mechanism as a complete agent architecture.

## Fixed decision logic: keep deterministic work deterministic

Fixed decision logic means that the application already knows the next step.

```text
Classify
  -> Retrieve
  -> Generate
  -> Verify
```

The model may perform work inside a step, but it does not freely redesign the sequence.

### Good uses

- document ingestion
- fixed extraction and transformation
- stable RAG stages
- known approval procedures
- deterministic validation
- compliance-sensitive operations with established rules
- tasks where every request requires the same sequence

### Strengths

- predictable cost and latency
- straightforward tests
- clear permissions
- reproducible execution
- simple failure attribution
- low risk of loops

### Limitation

A fixed flow cannot react to an unmodelled situation unless the application already contains a branch for it.

If an official page disappears, the system must have a defined response:

- switch to another approved source
- mark the field unavailable
- ask for credentials
- stop with a typed failure
- escalate for human handling

Fixed logic is not an immature design. It is often the correct outer boundary for a production agent. Autonomy should be introduced only where predetermined rules are genuinely insufficient.

## ReAct: choose the next action from the latest observation

The original ReAct method interleaves reasoning traces with task-specific actions and observations. In engineering terms, the useful idea is a closed loop:

```text
Current goal and state
  -> Choose action
  -> Act in an environment
  -> Receive observation
  -> Update the next decision
```

The method does not require one particular workflow engine or node boundary. In production, teams often place a ReAct-style loop inside a bounded executor node so that local flexibility does not control the entire application.

### Good uses

- web and documentation research
- debugging
- browser interaction
- API exploration
- file-system investigation
- operating an unfamiliar interface
- tasks where the next useful action cannot be known before seeing the result

### Example

The goal is to confirm a product's current billing rules.

```text
Action:
Open the official pricing page

Observation:
Only annual prices are visible

Action:
Open the official billing documentation

Observation:
Monthly billing is available only for selected plans

Action:
Check the official FAQ for plan-level exceptions
```

The value comes from adapting to observations instead of following a prewritten list of URLs.

### ReAct is local adaptation, not global reliability

A raw action-observation loop does not automatically provide:

- a measurable definition of progress
- a reliable completion condition
- permission enforcement
- cost control
- duplicate-action detection
- durable state
- recovery after interruption
- evidence quality
- acceptance of the final result

Those belong to the production architecture around the loop.

## Why ReAct loops without making progress

A typical failure trajectory looks active but repeats the same state:

```text
Search query A
  -> insufficient evidence
Search query B
  -> insufficient evidence
Search query A again
  -> open a previously rejected page
Search query B again
```

Common causes include:

### No progress model

The executor knows that it should continue, but not which requirements remain unresolved.

### Unstructured observations

Long tool outputs are appended to context without extracting:

- source identity
- relevant facts
- unresolved questions
- conflicts
- failure reason
- suggested next action

### No duplicate detection

The runtime does not detect repeated:

- queries
- URLs
- tool calls
- parameters
- error conditions
- equivalent actions expressed in different words

### Vague completion criteria

"Keep researching until enough information is found" is not testable.

A stronger condition is:

```text
Complete when:
- every required comparison field is filled or marked unavailable
- every factual claim has an approved source
- all material conflicts are recorded
- no critical verifier failure remains
```

### Excessive tool freedom

A large tool catalogue without permissions, costs, priorities, or call limits creates exploration noise rather than capability.

## A production ReAct loop needs explicit contracts

A bounded executor should receive:

- the current step objective
- allowed tools
- available inputs
- completion criteria
- prohibited actions
- remaining budget
- maximum actions
- current progress state
- escalation policy

Each tool should return a structured observation rather than an arbitrary text blob.

Example:

```json
{
  "tool": "official_docs_search",
  "status": "success",
  "source": "https://example.com/docs",
  "facts": [
    {"field": "monthly_billing", "value": "selected_plans_only"}
  ],
  "unresolved": ["which plans support monthly billing"],
  "retryable": false
}
```

The loop should evaluate three outcomes after each observation:

1. **complete**: the step contract is satisfied
2. **continue**: another allowed action is justified
3. **escalate**: the executor cannot finish within its authority or budget

![Figure 3-2 — Production ReAct Loop with Explicit Step Contract](/images/the-atlas-of-agent-design-patterns-part-3/react-production-loop.png)

> **Figure 3-2｜Production ReAct Loop with Explicit Step Contract**  
> A bounded executor must receive step objective, allowed tools, completion criteria, budget, and escalation policy. After every observation it judges complete, continue, or escalate.

## Plan-and-Execute: establish the global structure before acting

Plan-and-Execute is best treated as an engineering pattern family, not one canonical algorithm with one universal implementation.

Its defining rhythm is:

```text
Goal
  -> Produce an explicit plan
  -> Execute plan steps
  -> Integrate the results
```

Related research separates planning or reasoning from tool observations in different ways. Plan-and-Solve prompting decomposes a problem before solving its subtasks. ReWOO separates a planner-like reasoning stage from workers that obtain tool evidence and a solver that combines the results. These works are related, but they should not be presented as one identical architecture.

### Good uses

- long-form research
- multi-document review
- migration planning
- large code changes
- market analysis
- project work with many requirements
- tasks with ordering or dependency constraints
- tasks that must expose progress

### Strengths

#### Global coverage

The planner can enumerate all required dimensions before execution begins.

#### Trackable progress

The system can distinguish:

- pending
- ready
- running
- blocked
- completed
- failed
- skipped

#### Clear delegation

Independent steps may be assigned to different tools, workers, or DAG branches.

#### Better integration planning

The expected output of each step can be designed to support the final synthesis.

### Central weakness

A polished plan may still be infeasible, incomplete, or based on a false premise.

If a planner guesses instead of reading the real input, the executor may efficiently complete the wrong task. Plan generation therefore does not replace source acquisition, constraint checking, or verification.

## A plan must be executable, not ceremonial

This is not an executable plan:

```text
1. Research the topic
2. Analyse the information
3. Write the answer
```

It merely restates the task.

A production step should include a contract such as:

| Field | Purpose |
|---|---|
| Step ID | Stable identifier |
| Objective | Outcome this step must achieve |
| Inputs | Required state and artefacts |
| Dependencies | Steps that must finish first |
| Allowed tools | Capabilities available to the executor |
| Expected output | Structured result to produce |
| Completion criteria | Observable acceptance condition |
| Failure policy | Retry, fallback, block, replan, or stop |
| Budget | Time, tokens, calls, or money |
| Status | Current lifecycle state |
| Provenance requirements | Evidence that must accompany the result |

Example:

```text
Step ID:
S3

Objective:
Collect official pricing information for every candidate

Dependencies:
S1 evaluation criteria completed
S2 candidate list approved

Allowed tools:
Official web search
Browser

Expected output:
Structured pricing table with source URL and access date

Completion criteria:
Every candidate has a documented price
or an explicit unavailable / undisclosed status

Failure policy:
Try official pricing page
then official documentation
then official announcement
otherwise mark unavailable

Budget:
6 tool calls
8 minutes
```

This gives the executor a bounded assignment and the verifier an acceptance contract.

![Figure 3-3 — Executable Plan Contract](/images/the-atlas-of-agent-design-patterns-part-3/executable-plan-contract.png)

> **Figure 3-3｜Executable Plan Contract**  
> A plan step cannot be just a task name. It must carry objective, dependencies, allowed tools, expected output, completion criteria, failure policy, and budget.

## Plan validation: a plan is a proposal, not proof

Language models can produce plausible-looking plans that violate preconditions, omit required effects, or invent actions unavailable in the environment.

Validation strength should match the task.

### Natural-language review

Useful for low-risk work where the main concern is missing requirements or weak sequencing.

### Deterministic checks

Validate:

- required fields
- dependency references
- cycle-free step dependencies
- permitted tools
- budget totals
- known preconditions
- output schema

### Simulation or dry run

Test the plan against a model of the environment before performing irreversible actions.

### External planner or solver

When the domain has formal actions, preconditions, effects, and constraints, a classical planner or solver may provide stronger guarantees than free-form generation. LLM+P, for example, converts a natural-language problem into a planning representation and delegates plan search to a classical planner.

The lesson is not that every business workflow needs PDDL. It is that fluent generation is not the same as plan validity.

## Adaptive planning: change the remaining plan when reality changes

A static plan assumes that its premises remain valid. An adaptive planner inspects execution feedback and revises the remaining work when a material assumption fails.

```text
Create plan
  -> Execute one step
  -> Inspect result
  -> Is the remaining plan still valid?
       yes -> continue
       no  -> repair locally or create a revised plan
```

Adaptive planning should not mean "rewrite the whole plan after every step". It needs explicit triggers and bounded authority.

### Valid replan triggers

- a critical premise is false
- required data is unavailable
- a dependency changed
- the user's goal or constraint changed
- a verifier rejected the result
- a tool or capability is unavailable
- the remaining budget cannot support the plan
- repeated local repair failed
- a new high-priority risk was discovered

### Local repair versus global replan

Not every failure requires replanning.

Use **local repair** when:

- the objective remains valid
- only one step implementation failed
- an approved fallback can satisfy the same contract
- dependencies and later steps remain unchanged

Use **replanning** when:

- a premise affecting several steps changed
- the original decomposition is no longer valid
- the deliverable or constraint changed
- later dependencies must be rewritten
- a new approval or policy boundary appears

### Preserve valid completed work

A revised plan should not silently discard work that remains correct.

Example:

```text
Plan v1

Completed:
S1 Define evaluation criteria
S2 Select candidate frameworks

Blocked:
S3 Collect official pricing
```

A replan may produce:

```text
Plan v2

Preserved:
S1 Define evaluation criteria
S2 Select candidate frameworks

Revised:
S3A Search official documentation
S3B Search official announcements
S3C Mark undisclosed pricing explicitly

Unchanged:
S4 Compare architecture
S5 Produce recommendation
```

### Versioning requirements

Record:

- immutable original goal
- current plan version
- previous plan version
- replan trigger
- plan diff
- preserved steps
- invalidated steps
- new dependencies
- replan count
- verifier decision
- actor or model that approved the change

Adaptive planning research such as AdaPlanner demonstrates feedback-driven refinement. Production governance adds explicit plan versions, limits, and auditability so that replanning itself does not become an uncontrolled loop.

![Figure 3-4 — Adaptive Planning with Versions](/images/the-atlas-of-agent-design-patterns-part-3/adaptive-planning-with-versions.png)

> **Figure 3-4｜Adaptive Planning with Versions**  
> Replanning is triggered by explicit signals. A revised plan preserves valid completed work and records the plan diff, replan count, and preserved steps.

## Hierarchical planning: decompose goals at several levels

A flat plan becomes difficult to manage when a goal contains several independent areas of work.

Hierarchical planning separates levels:

```text
Main goal
  -> Subgoal A
       -> Task A1
       -> Task A2
  -> Subgoal B
       -> Task B1
       -> Task B2
  -> Subgoal C
       -> Task C1
```

Example:

```text
Produce market recommendation
  -> Analyse market
       -> estimate size
       -> identify growth drivers
  -> Analyse competitors
       -> collect pricing
       -> compare features
       -> review positioning
  -> Produce recommendation
       -> synthesise findings
       -> identify risks
       -> recommend action
```

### Benefits

- the upper level tracks outcomes rather than tool calls
- subgoals can be delegated
- local failures can be isolated
- context can be scoped to the worker
- independent branches can become DAG nodes

### Risks

- duplicated work across subgoals
- inconsistent assumptions
- loss of intent during hand-offs
- incompatible output formats
- completion of every subtask without completion of the parent goal

Hierarchical decomposition therefore needs:

- parent and child completion contracts
- shared facts and terminology
- source provenance
- dependency management
- integration ownership
- cross-subgoal verification

## HTN: formal decomposition with domain methods

Hierarchical Task Network planning is a formal planning approach. It refines compound tasks into lower-level task networks until executable primitive tasks remain.

Core concepts include:

### Compound task

A task that requires decomposition.

```text
Process customer refund
```

### Method

A domain-specific decomposition that may apply when its conditions hold.

```text
Standard refund method:
  verify order
  check eligibility
  calculate amount
  execute refund
  notify customer
```

### Primitive task

An action that the execution system can perform directly.

```text
Query order database
Create approval request
Issue refund
Send confirmation
```

The important distinction is not simply "humans wrote the plan". HTN planning relies on domain knowledge encoded as tasks, methods, constraints, and operators. That domain model is often authored and governed by experts, but methods may also be generated or learned and then validated.

### When HTN is useful

- established operational procedures
- logistics and fulfilment
- customer service processes
- IT operations
- regulated approvals
- reusable domain-specific decompositions
- environments where allowed procedures matter more than open-ended creativity

### Strengths

- auditable decomposition
- reusable methods
- strong fit with domain rules
- controllable search space
- consistent execution structure

### Limits

- the domain model is expensive to build and maintain
- unmodelled tasks remain difficult
- stale methods reproduce stale behaviour
- several applicable methods require selection
- formal correctness still depends on the accuracy of the domain model

### HTN and LLMs can be combined

A practical arrangement is:

```text
LLM:
Interpret the natural-language request
  -> map it to a known task and extract parameters

HTN planner:
Select applicable methods
  -> decompose into primitive tasks

Execution system:
Run permitted primitive tasks

LLM:
Handle language-heavy steps and explain results
```

The LLM handles ambiguity. The HTN model constrains procedure.

## Goals and policies are cross-cutting, not peer strategies

The previous categories describe how decisions or plans are produced. Goals and policies operate across all of them.

### Goal

A goal defines the desired state or acceptance condition.

A strong goal is measurable:

```text
All target tests pass
Full test suite passes
Lint passes
Build succeeds
No unrelated files changed
```

A weak goal is open-ended:

```text
Improve the repository
```

Fixed logic, ReAct, Plan-and-Execute, adaptive planning, and HTN all need goals.

### Policy

A policy defines which proposed actions may proceed.

```text
Proposed action
  -> Policy check
       -> allowed -> execute
       -> approval required -> pause
       -> denied -> reject or use fallback
```

Policies may cover:

- tools
- permissions
- data access
- cost
- risk
- privacy
- network access
- reversibility
- human approval

Important policy enforcement should live in application or infrastructure controls, not only in a prompt.

Examples:

- read-only database credentials
- scoped API tokens
- network restrictions
- sandboxed file access
- tool allowlists
- spending limits
- approval gates

The agent should not be the sole authority deciding whether its own safety rule applies.

## Comparing the main decision strategies

| Dimension | Fixed logic | Bounded ReAct | Plan-and-Execute | Adaptive planning | HTN |
|---|---|---|---|---|---|
| Main rhythm | Follow predetermined rules | Decide after observations | Plan first, then execute | Plan, execute, and revise when triggered | Refine tasks through domain methods |
| Global view | Encoded by developers | Usually limited | Stronger | Stronger and updateable | Encoded in the task-method model |
| Local adaptation | Low unless branches exist | High within limits | Executor-dependent | High when repair or replan is allowed | Limited to available methods and execution feedback |
| Predictability | High | Lower | Medium | Medium to lower | High within the modelled domain |
| Main risk | Brittleness | Looping and local myopia | Wrong plan executed efficiently | Replanning drift and cost | Stale or incomplete domain model |
| Best fit | Stable tasks | Uncertain tool interaction | Long multi-requirement tasks | Long tasks in changing environments | Established reusable procedures |
| Required controls | Tests and typed failures | Limits, progress, policy, stop criteria | Plan schema and plan validation | Versioning, triggers, diff, replan limit | Method governance and domain validation |

These are defaults, not universal scores. A tightly bounded ReAct executor may be more predictable than a weakly specified static plan.

## The production hybrid: Planner, bounded Executor, Verifier, and Replanner

A robust architecture often combines the methods:

```text
User goal
  -> Planner
  -> Versioned plan store
  -> State machine selects ready step
  -> Bounded executor
       -> uses fixed logic or ReAct as appropriate
  -> Verifier
       -> pass
       -> local repair
       -> replan
       -> fail or escalate
```

### Planner responsibilities

- understand the complete goal
- create subgoals and steps
- define dependencies
- assign budgets
- define outputs and completion criteria
- identify approval and policy boundaries

### Executor responsibilities

- execute one step contract
- use only allowed tools
- adapt locally to observations
- normalise results
- update progress
- report blockers rather than silently changing the goal

### Verifier responsibilities

- check the step contract
- validate evidence and output schema
- detect missing requirements
- distinguish local repair from global replan
- approve or reject completion

### Replanner responsibilities

- respond only to valid triggers
- preserve valid completed work
- update the remaining dependencies
- produce a plan diff
- respect the replan limit

### State machine responsibilities

- persist progress
- control legal transitions
- manage retries and waiting
- enforce terminal states
- coordinate approval

### Policy layer responsibilities

- authorise tools and data
- limit cost and time
- intercept high-impact actions
- require human approval
- create an audit trail

![Figure 3-5 — Production Planning Architecture](/images/the-atlas-of-agent-design-patterns-part-3/production-planning-architecture.png)

> **Figure 3-5｜Production Planning Architecture**  
> The Planner produces a versioned plan, the state machine selects the ready step, a bounded executor runs it, the Verifier accepts or rejects, and the Replanner rewrites remaining work only when a real trigger fires.

## How to choose a strategy

Start with the least flexible mechanism that can reliably complete the task.

### Use fixed logic when

- the next step is known
- the environment is stable
- the same contract applies to every request
- predictability matters more than adaptation

### Add bounded ReAct when

- the next useful action depends on the latest tool result
- the environment is difficult to enumerate
- local exploration is necessary
- completion can still be verified

### Add Plan-and-Execute when

- the task has many requirements
- omissions are costly
- progress must be visible
- dependencies or delegation matter

### Add adaptive replanning when

- premises may change during execution
- a static plan can become invalid
- local repair is sometimes insufficient
- the system can identify material replan triggers

### Use hierarchical decomposition when

- a flat plan is too large
- subgoals have distinct owners or contexts
- parent and child completion can be defined

### Use HTN when

- the domain has reusable, governed procedures
- valid decomposition methods can be modelled
- consistency and auditability are central

### Use an external planner or solver when

- preconditions and effects are formal
- feasibility matters more than fluent explanation
- constraints are too important to leave to free-form generation
- a valid or optimal plan is required

## Common anti-patterns

### Planning every task

A translation or fixed extraction does not need a five-step plan.

### Treating the plan as ground truth

A generated plan is a hypothesis about how to complete the work.

### ReAct without a step contract

The executor explores tools without knowing what output it must produce.

### Replanning after every observation

The system spends more time rewriting plans than executing them.

### Global replan for a local failure

One unavailable endpoint causes the entire plan to be discarded.

### Replanning without versions

The previous plan disappears, making drift and repeated work invisible.

### Hierarchy without integration ownership

Every subgoal is complete, but no one owns the final outcome.

### Calling every goal-directed loop a separate architecture

Every useful agent pursues some goal. The differentiator is how action selection, planning, verification, and control are implemented.

### Safety rules only in prompts

The model is asked not to use a capability that the runtime still exposes without restriction.

### Planner and executor duplicate the same work

The planner specifies a research strategy; the executor ignores it and redesigns the task from the beginning.

### Refusing to admit an unsatisfied task

The correct terminal result may be:

- unavailable
- unsupported
- blocked
- partial
- requires human action

Another planning round cannot create missing evidence or permissions.

## What production planning should record

| Record | Why it matters |
|---|---|
| Original goal | Prevents drift |
| Goal version | Records authorised goal changes |
| Current plan version | Identifies the active plan |
| Plan diff | Explains what changed |
| Replan trigger | Justifies the revision |
| Step contract | Defines execution and acceptance |
| Step dependency | Controls readiness |
| Step status | Tracks progress |
| Tool calls and observations | Records actual execution |
| Evidence and provenance | Supports verification |
| Retry count | Bounds local repair |
| Replan count | Bounds global revision |
| Remaining budget | Controls cost |
| Policy decision | Records permission and risk checks |
| Verifier result | Accepts or rejects completion |
| Terminal outcome | Completed, partial, blocked, failed, or cancelled |

Without these records, a long task is a long conversation rather than a manageable process.

## Complete example: researching agent frameworks

The goal is:

> Compare three agent frameworks and recommend one for a production RAG system.

### Router

Select the research workflow instead of direct question answering.

### Planner

Create:

```text
S1 Define evaluation criteria
S2 Confirm candidate frameworks
S3 Collect official architecture information
S4 Compare state and persistence
S5 Compare observability and testing
S6 Compare tool and multi-agent support
S7 Evaluate risks and operational fit
S8 Produce recommendation
```

Each step receives a contract, budget, and completion criteria.

### Executor

For `S3`, a bounded ReAct executor may:

```text
Open official architecture documentation
  -> required field missing
Open official persistence documentation
  -> record capability and version
Inspect official repository
  -> extract structured evidence
Stop when all fields are documented or explicitly unknown
```

### Verifier

Check:

- every material claim uses an official source
- every comparison field is covered
- missing information is marked unknown
- version dates are not mixed
- the recommendation follows the criteria

### Adaptive replan

One framework does not publish pricing or a required technical detail.

The replanner changes only the remaining work:

```text
Replace inferred field with:
- publicly documented capabilities
- explicitly marked unknowns
- no unsupported estimate
```

### Synthesis

Integrate the verified results and produce the recommendation.

This is not pure ReAct and not pure Plan-and-Execute. It is a governed composition of routing, planning, bounded action selection, verification, state management, and triggered replanning.

## Conclusion

The planning layer is easier to understand when its mechanisms are separated:

- **Fixed decision logic** keeps known work deterministic.
- **Bounded ReAct** adapts the next local action to the latest observation.
- **Plan-and-Execute** creates an explicit global structure before execution.
- **Adaptive planning** revises remaining work after a material trigger.
- **Hierarchical planning** organises large goals into several levels.
- **HTN** uses a formal domain model to refine compound tasks into executable tasks.
- **Plan verification** determines whether a plausible plan is actually acceptable.
- **Goals and policies** define outcomes and boundaries across every strategy.

The production objective is not maximum planning freedom. It is deliberate placement of flexibility:

```text
fixed outer control
  + explicit plan where global coverage matters
  + bounded local adaptation where observations matter
  + verification before acceptance
  + versioned replanning only when reality invalidates the plan
```

Part 4 moves from planning to search:

> When several candidate solutions are possible, how should an agent explore, compare, prune, and select them?

## References

- [Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629)
- [Xu et al., *ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models*](https://arxiv.org/abs/2305.18323)
- [Wang et al., *Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models*](https://arxiv.org/abs/2305.04091)
- [Sun et al., *AdaPlanner: Adaptive Planning from Feedback with Language Models*](https://arxiv.org/abs/2305.16653)
- [Liu et al., *LLM+P: Empowering Large Language Models with Optimal Planning Proficiency*](https://arxiv.org/abs/2304.11477)
- [Huang et al., *Language Models as Zero-Shot Planners: Extracting Actionable Knowledge for Embodied Agents*](https://arxiv.org/abs/2201.07207)
- [Valmeekam et al., *Large Language Models Still Can't Plan: A Benchmark for LLMs on Planning and Reasoning about Change*](https://arxiv.org/abs/2206.10498)
- [Au et al., *SHOP2: An HTN Planning System*](https://arxiv.org/abs/1106.4869)
- [Höller et al., *On Hierarchical Task Networks*](https://arxiv.org/abs/1606.06900)

