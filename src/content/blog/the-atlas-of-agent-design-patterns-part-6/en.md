---
title: "The Atlas of Agent Design Patterns Part 6 | Multi-Agent Organisation, Coordination, and Control"
description: "A production-focused guide to single agents, role-based workflows, supervisor-worker systems, planner-executor-critic splits, debate, voting, blackboards, peer-to-peer coordination, swarm-style systems, handoff contracts, shared state, final ownership, and control planes."
date: 2026-07-01T00:04:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 6
---


The previous articles covered:

- how a task moves through an execution structure
- how an agent chooses its next action
- how a system searches among candidate solutions
- how outputs are verified and failures are repaired

This article examines the organisation dimension:

> Should one execution entity own the task, or should responsibility be divided among several addressable agents?

Multi-agent diagrams are seductive. A slide can show a planner, researcher, analyst, coder, critic, reviewer, memory agent, and supervisor, each with its own polished card and glowing arrow.

The diagram may look like a digital company. The runtime may be a committee meeting trapped in a token furnace.

Every additional agent can introduce:

- another model call or session
- another context boundary
- another handoff
- another version of task state
- another permission surface
- another place for duplicated work
- another latency dependency
- another failure mode
- another ambiguity about who owns completion

The central design question is not:

> How many agent roles can we create?

It is:

> Which responsibilities genuinely need separate execution boundaries, and how will work, state, authority, evidence, and final ownership move between them?

## Multi-agent is an organisational property, not a reasoning method

Multi-agent describes how addressable execution entities divide responsibility and coordinate.

It does not directly determine whether the system uses:

- ReAct
- Plan-and-Execute
- Tree of Thoughts
- Generate-and-Test
- Retry
- a verifier
- long-term memory

A supervisor-worker system may use a state machine as its outer workflow, bounded ReAct inside a research worker, a DAG for parallel subtasks, and a verifier before final acceptance.

```text
Execution structure: State machine
Decision strategy: Plan-and-Execute
Local execution: Bounded ReAct
Organisation: Supervisor-worker
Shared state: Typed task ledger
Verification: Evidence verifier
```

These are different design dimensions.

## What counts as an agent instance?

Model count is a poor definition.

Several agents may share the same foundation model. One workflow may call several different models without creating several agents.

For this article, an **agent instance** is an addressable execution entity with a meaningful subset of the following:

- its own role or objective
- its own state or working history
- its own tool and data permissions
- its own task lifecycle and status
- a communication identity
- the ability to receive a contract and return a result
- an explicit owner or authority boundary

Independence is not binary. Two agents may share a model and memory store while retaining separate task ownership and permissions. Conversely, four role prompts executed sequentially by one controller may still be one role-based workflow.

### One model can power several agents

```text
Agent A: research role, browser permission, task A
Agent B: analysis role, database permission, task B
Agent C: reviewer role, no write permission, task C

Shared base model
Different identities, states, permissions, and task lifecycles
```

### Several prompts do not automatically create several agents

```text
Planner prompt
 -> writer prompt
 -> critic prompt
 -> finaliser prompt

One controller
One shared state
Predetermined sequence
```

This may be excellent role separation, but role labels alone do not establish a multi-agent system.

### Multiple candidates do not imply multiple agents

- one model samples five answers
- one agent runs tree search
- one workflow invokes several LLM nodes
- one model switches system prompts

All may produce multiple outputs without multiple addressable agents.

<!-- Figure 6-1 insertion point -->

![Figure 6-1 — One Model, Multiple Roles, or Multiple Agents](/images/the-atlas-of-agent-design-patterns-part-6/single-vs-multi-agent-instance.png)

> **Figure 6-1｜One Model, Multiple Roles, or Multiple Agents**  
> Model count, role count, and agent-instance count are three different properties. One model can power many agents. Many role prompts do not necessarily form many agents. Multi-agent describes addressable execution entities with their own lifecycle, not the number of models.

## Five layers that should not be flattened into one taxonomy

The old habit of placing Supervisor, Debate, Blackboard, and Swarm in one list hides that they solve different problems.

| Layer | Question | Examples |
|---|---|---|
| Execution entity | How many addressable workers exist? | Single agent, multiple agents |
| Responsibility split | Who performs which type of work? | Supervisor-worker, planner-executor-critic |
| Communication topology | How do messages move? | Centralised, hierarchical, peer-to-peer |
| Coordination medium | Where is shared intermediate state kept? | Blackboard, task ledger, message bus |
| Collective decision protocol | How are competing results resolved? | Debate, voting, judge, verifier |

A production system often combines one choice from several layers:

```text
Multiple agent instances
 + supervisor-worker responsibility split
 + centralised messaging
 + typed blackboard
 + verifier-based final acceptance
```

This layered description is more precise than calling the whole design a "debate architecture" or a "swarm".

## Start with one agent unless separation solves a real problem

A single agent can still:

- plan
- use tools
- maintain structured state
- call a verifier
- retry within limits
- pause for human approval
- work through a long state machine

```text
User request
 -> Single Agent
 -> plan
 -> use tools
 -> update state
 -> verify
 -> return result
```

### Strengths

- one primary context
- clear responsibility
- fewer handoffs
- lower coordination cost
- simpler tracing
- easier stop conditions
- less state synchronisation

### Limits

- context may become too large
- one executor may need too many tools
- skill and permission boundaries are difficult to isolate
- independent subtasks cannot truly run concurrently
- one mistaken assumption can contaminate the entire run
- local detail may disappear in long tasks

### Prefer one agent when

- one task owner is natural
- the work fits one context and state model
- parallel execution is not valuable
- permissions do not need isolation
- the handoff cost exceeds the benefit of separation
- the same evaluator can check the complete result

The production default should be:

> Begin with the smallest organisational structure that can satisfy the task contract.

## Role-based single workflow: separation without independent agents

A role-based workflow gives different stages different responsibilities:

```text
Planner role
 -> Writer role
 -> Critic role
 -> Finaliser role
```

It may use:

- one model or several models
- one shared workflow state
- one central controller
- predetermined transitions
- no independently addressable worker lifecycle

### Benefits

- more focused prompts
- explicit responsibility per stage
- easier flow control
- lower overhead than a conversational agent network
- predictable handoffs

### Risks

- roles differ only in name
- shared blind spots survive every stage
- the critic receives the generator's assumptions as truth
- the system falsely reports independent agreement
- all roles inherit the same excessive permissions

Role-based workflows are valuable. They should simply be described honestly.

## When multiple agents are justified

Adding agents is useful when separation creates an operational benefit that cannot be obtained as cheaply with one workflow.

### Natural task decomposition

Subtasks have distinct objectives and can return structured results.

### Parallel work

Independent subtasks can run concurrently within resource limits.

### Skill isolation

Different workers need materially different prompts, tools, models, or context.

### Permission isolation

A reviewer should not have write permission. A database worker may need read-only credentials. A deployment worker may require approval.

### Fault containment

One worker can fail without invalidating all other work.

### Information locality

Different workers own different data sources or environments.

### Genuine viewpoint diversity

Independent evidence, models, assumptions, or roles may expose blind spots.

Do not add agents merely because the framework makes `agents = []` easy to write.

## Supervisor-worker: central delegation with explicit contracts

A supervisor-worker design uses a central coordinator to assign and integrate work.

```text
 Supervisor
 / | \
 Researcher Analyst Tester
 \ | /
 Structured worker results
 -> Aggregator
 -> Verifier
 -> Final owner
```

The supervisor may be an LLM agent, deterministic service, workflow engine, or hybrid controller.

### Supervisor responsibilities

- interpret the global goal
- decompose work
- decide which tasks are ready
- select workers by capability, permission, cost, and load
- issue task contracts
- track deadlines and status
- detect duplication and worker failure
- aggregate or route results
- enforce budget and stop conditions

### Worker responsibilities

- accept or reject the task contract
- execute one bounded objective
- use only permitted tools and data
- preserve provenance
- return a structured result
- report blockers and partial completion
- avoid silently redefining the task

### Worker contract

A worker should receive:

```text
Task ID
Objective
Inputs
Dependencies
Allowed tools
Expected output schema
Completion criteria
Budget
Deadline
Failure policy
Return address
```

### Structured worker result

```json
{
 "task_id": "pricing-framework-a",
 "status": "partial",
 "facts": [],
 "sources": [],
 "unresolved": ["enterprise price not published"],
 "cost": {"tool_calls": 4},
 "return_to": "supervisor-1"
}
```

### Aggregation is a separate responsibility

Workers may produce final-ready sections, but the system still needs a designated component that:

- normalises formats
- deduplicates findings
- resolves or exposes conflicts
- checks version consistency
- preserves source links
- determines whether missing work is acceptable

That component may be the supervisor, a dedicated aggregator, or a finaliser.

### Main risks

- supervisor bottleneck
- supervisor context overload
- overlapping assignments
- incompatible worker outputs
- straggler workers
- central point of failure
- workers waiting for unnecessary approval
- supervisor inventing conclusions not present in worker evidence

### Production controls

- worker capability registry
- concurrency limit
- deadline and heartbeat
- reassignment policy
- partial-result policy
- typed result schema
- final acceptance gate
- supervisor failover where required

<!-- Figure 6-2 insertion point -->

![Figure 6-2 — Supervisor-Worker with Contract and Aggregation](/images/the-atlas-of-agent-design-patterns-part-6/supervisor-worker-contract.png)

> **Figure 6-2｜Supervisor-Worker with Contract and Aggregation**  
> A supervisor issues a task contract; workers execute within their allowed tools and permissions and return a structured result. Aggregator, verifier, and final owner remain separate responsibilities and must not be absorbed into the supervisor. Otherwise bottleneck, context overload, and self-grading converge on the same component.

## Planner-executor-critic-verifier is a responsibility split, not necessarily multi-agent

The pattern separates cognitive and control responsibilities:

### Planner

- interprets the goal
- decomposes steps
- defines dependencies
- sets completion criteria
- assigns budgets

### Executor

- performs the current step
- uses tools
- records evidence
- reports status and blockers

### Critic

- diagnoses omissions, risk, or weak reasoning
- supplies evidence and repair direction
- does not certify completion

### Verifier

- evaluates the explicit acceptance contract
- returns pass, fail, review, or inconclusive
- decides whether repair or replanning is required

### Final owner

- publishes or returns the formal result
- owns the terminal state
- cannot bypass failed acceptance checks

This design can be implemented as:

- one model with role-specific prompts
- several addressable agents
- deterministic planner plus model executor
- model critic plus external test verifier

The name describes responsibility separation, not agent count.

### A production flow

```text
Goal
 -> Planner
 -> Versioned plan and step contracts
 -> Executor
 -> Critic findings
 -> Bounded repair
 -> Verifier
 -> pass -> Final owner
 -> repair -> Executor
 -> replan -> Planner
 -> review -> Human approver
 -> stop -> Terminal outcome
```

### Common failure

The critic becomes the verifier and always discovers another stylistic improvement. The repair loop never reaches a contract-based terminal decision.

<!-- Figure 6-3 insertion point -->

![Figure 6-3 — Planner, Executor, Critic, Verifier, and Final Owner](/images/the-atlas-of-agent-design-patterns-part-6/planner-executor-critic-verifier.png)

> **Figure 6-3｜Planner, Executor, Critic, Verifier, and Final Owner**  
> Planning, execution, diagnosis, acceptance, and publication are five different responsibilities. Pressing them into one prompt turns the critic into another generator, and the repair loop never reaches a contract-based terminal decision.

## Debate and voting are collective decision protocols

Debate and voting answer how competing candidates are compared. They do not by themselves specify task ownership, messaging infrastructure, memory, or execution topology.

## Debate: interactive challenge between positions

A real debate requires interaction.

```text
Agent A proposes claim A
 <-> Agent B challenges evidence
 <-> Agent A responds
 <-> Agent B exposes remaining disagreement
 -> Judge or verifier
```

Independent proposals sent directly to a judge are an ensemble or panel, not necessarily a debate.

### Potential value

- exposes unstated assumptions
- forces evidence to be defended
- presents counterarguments
- helps a judge inspect disagreement
- may improve performance on some tasks and protocols

Multi-agent debate research has reported gains in selected reasoning and oversight settings. Later work also shows that results depend on task, judge, agent strength, diversity, and protocol, and that voting can account for much of the apparent gain in some settings.

### Risks

- persuasion beats truth
- confident agents dominate
- agents converge through social pressure
- all agents share the same false premise
- the judge prefers writing style or model identity
- debate cost exceeds the value of the disagreement
- private reasoning narratives are treated as evidence

### Production controls

- assign genuinely different evidence or assumptions
- keep the acceptance rubric fixed
- blind model or role identity where practical
- require citations or executable evidence
- limit rounds
- preserve unresolved disagreement
- calibrate the judge
- allow `inconclusive`

## Voting: aggregate independent choices

Voting combines candidate selections:

```text
Candidate A: 3 votes
Candidate B: 2 votes
Candidate C: 0 votes
```

Possible rules include:

- majority
- plurality
- ranked choice
- weighted vote
- threshold approval
- veto for safety or policy

### Voting works best when

- the candidate set is fixed
- votes can be produced independently
- voters have meaningful diversity
- the aggregation rule matches the decision
- a wrong majority can still be caught by verification

### Voting is not factual verification

Five agents can share the same outdated source or prompt bias.

A majority result should still pass:

- hard constraints
- evidence checks
- policy checks
- external tests where available

## Blackboard: coordinate through shared structured state

The blackboard pattern predates LLM agents. Knowledge sources collaborate by reading and writing a shared problem-solving workspace under some control policy.

For an LLM-based system, a blackboard can hold:

- original goal
- task ledger
- proposed facts
- verified facts
- open questions
- evidence
- candidate solutions
- conflicts
- decisions
- worker status

```text
Research agent <-> Shared blackboard <-> Analysis agent
 ^
 |
 Reviewer agent
```

### Blackboard is not a conversation dump

Do not store every prompt, completion, and tool transcript as equally trusted shared memory.

Use typed entries:

```text
Proposed
Verified
Rejected
Superseded
Expired
```

Each item should carry:

- entry ID
- type
- author
- source
- timestamp
- version
- validation state
- confidence where meaningful
- read and write policy
- expiry
- dependency links

### Main risks

- one wrong fact contaminates all workers
- concurrent writes conflict
- stale entries remain active
- permissions are too broad
- the board grows without bound
- downstream nodes do not invalidate after an upstream correction

### Production controls

- schema per entry type
- optimistic locking or transactions
- provenance
- conflict-resolution policy
- write permissions
- validation gate
- retention policy
- immutable audit log
- downstream invalidation

<!-- Figure 6-4 insertion point -->

![Figure 6-4 — Blackboard Coordination with Typed Entries](/images/the-atlas-of-agent-design-patterns-part-6/blackboard-typed-entries.png)

> **Figure 6-4｜Blackboard Coordination with Typed Entries**  
> A blackboard is not a conversation dump. Each entry needs a type (Proposed, Verified, Rejected, Superseded, Expired), source, author, version, validation state, and read/write policy. Without these fields, one unverified fact can contaminate the whole worker network.

## Peer-to-peer coordination: direct handoffs without one central supervisor

In a peer-to-peer topology, agents communicate directly.

```text
Agent A <-> Agent B
 ^ |
 | v
Agent D <-> Agent C
```

It can help when:

- resources are distributed
- task topology changes dynamically
- a central coordinator would be a bottleneck
- agents need local negotiation or handoff

### Risks

- circular delegation
- message storms
- inconsistent task state
- responsibility drift
- indirect permission escalation
- no terminal owner
- duplicate task claims

### Required controls

- message schema
- task and correlation ID
- sender and recipient identity
- hop count
- time to live
- deduplication key
- task owner
- capability registry
- delegation permission
- terminal owner
- cycle detection

## Swarm-style systems: define the term before using it

"Swarm" is an overloaded label.

In this article, a swarm-style system means:

> Many relatively lightweight agents coordinate through local information, task-claiming rules, and limited peer interactions, without a fixed central planner controlling every action.

Some software frameworks use the word "swarm" for ordinary agent handoffs. Others use it for decentralised local-rule coordination. The name is therefore not an architecture specification.

A usable design must still define:

- who creates tasks
- how work is claimed
- how duplicate claims are prevented
- what state is global
- what state is local
- how convergence is measured
- who or what declares completion
- how cost is capped
- how the system is stopped

### Potential strengths

- no single coordination bottleneck
- local fault tolerance
- dynamic allocation
- redundant exploration
- scalable handling of many small tasks

### Risks

- emergent behaviour that is merely unpredictable
- duplicate work
- unbounded message and model cost
- weak global consistency
- hard-to-reproduce outcomes
- unclear accountability
- no natural stop condition

### Production controls

- task leases or locks
- maximum active agents
- message TTL and hop limits
- global cost budget
- local action budget
- convergence metric
- no-progress detection
- kill switch
- human override
- full message and ownership trace

A pile of small circles is not a swarm protocol. It is clip art until the coordination rules are specified.

## Communication topology changes operational risk

| Topology | Main strength | Main risk |
|---|---|---|
| Centralised | Clear control and final ownership | Bottleneck and single point of failure |
| Hierarchical | Scales central control across teams | Information loss and latency across layers |
| Blackboard | Reuses shared intermediate state | Pollution, conflict, and permission complexity |
| Peer-to-peer | Flexible direct collaboration | Message cycles and responsibility drift |
| Swarm-style | Local autonomy and dynamic allocation | Convergence, cost, and accountability |

A system may combine topologies. Workers may report to a supervisor while reading verified facts from a blackboard. A team supervisor may coordinate locally inside a hierarchy.

<!-- Figure 6-5 insertion point -->

![Figure 6-5 — Communication Topology and Operational Risk](/images/the-atlas-of-agent-design-patterns-part-6/communication-topology-risks.png)

> **Figure 6-5｜Communication Topology and Operational Risk**  
> Topology is not decoration; it directly determines operational risk. Centralised systems suffer bottlenecks, hierarchical systems suffer latency, blackboards suffer pollution, peer-to-peer systems suffer cycles, and swarm-style systems suffer convergence and cost issues. Production systems often mix topologies, but each layer's responsibility must be defined before the mix is allowed.

## Structured handoff contracts are the connective tissue

Do not hand work over with:

```text
Please continue the task.
```

A handoff contract should contain:

```text
Task ID
Parent task
Objective
Inputs
Known facts
Open questions
Allowed tools
Data and permission scope
Expected output schema
Completion criteria
Budget
Deadline
Failure policy
Return address
```

A handoff result should contain:

```text
Status
Completed requirements
Evidence
Unresolved items
Conflicts
Cost used
Side effects
Next recommended action
```

### Why contracts matter

- preserve the original goal
- reduce context transfer
- standardise aggregation
- make ownership explicit
- support retries and reassignment
- make partial completion visible
- prevent permission leakage

### Context should be scoped, not copied wholesale

Send the minimum information needed for the worker's contract:

- stable goal summary
- relevant verified facts
- permitted sources
- constraints
- expected output

Do not automatically copy every internal conversation into every agent.

## Shared state needs trust, version, and ownership

Shared state should answer:

- Which goal version is active?
- Which tasks are ready, running, blocked, or complete?
- Which facts are verified?
- Which entries are proposals?
- Which agent owns each task?
- Which source supports each result?
- Which result has been superseded?

A useful shared-state model includes:

```text
Goal store
Task ledger
Assignment registry
Evidence store
Decision log
Conflict register
Final artefact registry
```

### Do not confuse shared state with long-term memory

Shared workflow state exists to coordinate the current run. Long-term memory persists selected information across runs.

The retention, permissions, and validation rules should differ.

## Final ownership and acceptance must be explicit

"Everyone owns the result" usually means no one owns it.

A production system should designate:

- **task owner**: accountable for the current task
- **aggregator**: combines worker results
- **verifier**: applies the acceptance contract
- **final owner**: publishes or returns the formal output
- **human approver**: authorises high-impact action where required

One component may perform several roles, but the responsibilities must remain explicit.

### Verifier is not always the final owner

The verifier may say that a result passes. A separate finaliser may format and publish it. A human may still own legal or business authorisation.

### Only one state should be formal final

Prevent:

- competing final answers
- silent overwrites
- unverified drafts being published
- workers bypassing aggregation
- disagreement disappearing without a decision record

## The production multi-agent control plane

Agents alone are not the production architecture. A control plane coordinates them.

### Agent registry

- agent ID
- role
- capabilities
- allowed tools
- data permissions
- model and version
- cost tier
- current load
- health status

### Task ledger

- task ID
- parent task
- owner
- dependencies
- status
- deadline
- budget
- attempts
- final outcome

### Message layer

- schema
- sender and recipient
- correlation ID
- delivery state
- ordering where required
- deduplication
- retry policy
- TTL
- dead-letter handling

### Shared-state layer

- goal
- plan
- verified facts
- worker results
- conflicts
- decisions
- final artefacts

### Policy layer

- tool access
- data access
- delegation rights
- indirect permission checks
- cost limits
- risk gates
- human approval

### Observability

- agent and task trace
- message count
- tool calls
- token and money cost
- worker latency
- handoff failures
- duplicate work
- state conflicts
- final outcome

### Kill switch

Stop or pause the system when:

- cost limit is exceeded
- a message storm occurs
- a delegation cycle is detected
- no measurable progress occurs
- a security boundary is crossed
- state cannot be reconciled
- a human cancels the run

## Cost and latency are coordination problems

Multi-agent cost includes more than model inference:

- prompt repetition
- context packaging
- worker startup
- message transport
- state persistence
- aggregation
- conflict resolution
- waiting for stragglers
- judge and verifier calls
- retries and reassignment

### Common latency patterns

#### Straggler

The final result waits for the slowest required worker.

#### Sequential handoff

A design advertised as parallel runs one role after another.

#### Review bottleneck

Every output waits for one critic or verifier.

#### Context serialisation

Large intermediate artefacts are repeatedly copied and summarised.

### Controls

- maximum agents
- maximum worker calls
- bounded concurrency
- per-worker and global budgets
- shared retrieval cache
- deduplication
- deadline
- early cancellation
- partial aggregation
- model selection by task difficulty
- cancellation propagation

## Main failure modes

### Duplicate work

Two workers claim the same task.

Controls: unique task ID, lease, assignment registry, deduplication.

### Responsibility gap

Every agent assumes another agent owns the requirement.

Controls: task owner, return address, completion contract, final owner.

### Handoff loss

Constraints, evidence, or scope disappear during transfer.

Controls: structured contract, immutable goal reference, required fields.

### Conflicting results

Workers use different versions or reach opposite conclusions.

Controls: provenance, conflict register, aggregator, verifier, human review.

### Infinite delegation

A delegates to B, B to C, and C back to A.

Controls: delegation graph, hop limit, cycle detection, maximum depth.

### Shared-state pollution

An unverified proposal becomes a fact for every agent.

Controls: trust states, validation gate, write permissions, versioning.

### Worker silence

A worker fails while the system waits forever.

Controls: deadline, heartbeat, timeout, reassignment, partial policy.

### Judge bias

The judge favours style, model identity, or majority confidence.

Controls: rubric, blind evaluation, calibration, external evidence.

### Permission laundering

An agent obtains a restricted effect indirectly through another agent.

Controls: end-to-end authorisation on the action, not only sender identity.

### No final owner

Several outputs exist, but no component can formally complete the task.

Controls: final owner, terminal state, acceptance record.

## Choosing an organisational design

Start with the simplest structure that satisfies the actual separation need.

| Need | Starting design |
|---|---|
| One context and one owner are enough | Single agent |
| Role focus without independent workers | Role-based workflow |
| Clear subtasks with central governance | Supervisor-worker |
| Separate planning, execution, diagnosis, and acceptance | Responsibility split, single or multi-agent |
| Interactive challenge of competing claims | Debate protocol |
| Aggregate independent fixed choices | Voting protocol |
| Reuse shared intermediate results | Blackboard coordination |
| Direct dynamic handoffs | Peer-to-peer topology |
| Many small tasks with local-rule allocation | Explicitly defined swarm-style protocol |

Before adding an agent, ask:

1. What independent responsibility will it own?
2. Does it need separate state, permissions, tools, or lifecycle?
3. What contract will it receive?
4. What structured result will it return?
5. Who aggregates and verifies its output?
6. What happens if it is late, wrong, duplicated, or silent?
7. Is the expected quality or latency gain larger than the coordination cost?

## When not to use multi-agent

Avoid it when:

- the task has no natural division
- all subtasks need the same large context
- one agent already meets the acceptance contract
- no aggregation or verification mechanism exists
- permission boundaries cannot be enforced
- the latency budget is tight
- communication is more expensive than the work
- one accountable decision-maker is required
- the system cannot observe or stop the interaction network

## Complete example: multi-source framework research

The task is:

> Compare three agent frameworks and recommend one for a production RAG system.

### Step 1: task admission

The controller checks:

- scope
- sources allowed
- time and tool budget
- whether independent subtasks justify parallel workers

### Step 2: supervisor creates contracts

```text
Task A: official architecture and execution model
Task B: persistence and state management
Task C: observability, testing, and evaluation
Task D: deployment and operational complexity
```

Every contract includes the same evaluation rubric, but a different objective.

### Step 3: workers execute

Workers return:

- structured findings
- official sources
- version dates
- unresolved fields
- cost and status

### Step 4: blackboard stores typed entries

```text
Proposed facts
Verified facts
Open questions
Conflicts
Missing evidence
```

### Step 5: critic diagnoses gaps

- missing dimensions
- third-party evidence where official evidence is required
- mixed framework versions
- unsupported inference

### Step 6: aggregator combines results

- normalises schema
- deduplicates facts
- preserves disagreement
- identifies missing evidence

### Step 7: verifier applies the contract

- official-source coverage
- required fields
- explicit unknowns
- recommendation supported by evidence

### Step 8: final owner publishes one result

The system records the final artefact and the acceptance decision.

This architecture may use supervisor-worker, blackboard coordination, critic, verifier, and final ownership. It does not need debate, peer-to-peer messaging, or a swarm.

The value comes from clear responsibility and evidence flow, not from agent count.

## Production checklist

### Need and identity

- Does each agent own a distinct responsibility?
- Is the agent operationally addressable?
- Are state, authority, and lifecycle boundaries clear?
- Would a role-based workflow be enough?

### Contracts and ownership

- Does every task have an owner?
- Is the handoff contract structured?
- Is the return address explicit?
- Is there one formal final owner?

### Communication

- Are messages typed?
- Are correlation ID, TTL, deduplication, and hop limits defined?
- Can cycles and message storms be detected?
- Is dead-letter handling available?

### Shared state

- Are proposed and verified entries separated?
- Are source, author, version, and validation status stored?
- Are concurrent writes controlled?
- Can stale downstream results be invalidated?

### Permission and safety

- Are tool and data permissions per agent?
- Are delegated actions reauthorised end to end?
- Do high-impact actions require approval?
- Can a worker modify the acceptance criteria?

### Cost and stopping

- Are global and per-agent budgets defined?
- Is concurrency bounded?
- Are deadlines and cancellation propagated?
- Is no-progress detection available?
- Is there a kill switch?

### Verification

- Are worker outputs aggregated before publication?
- Is disagreement preserved until resolved?
- Does the verifier use observable evidence?
- Can the run end as partial, blocked, or inconclusive?

## Conclusion

Multi-agent architecture is not the art of placing more role cards on a canvas.

It is the engineering of:

- execution identity
- responsibility boundaries
- communication topology
- shared state
- collective decision protocols
- authority
- final ownership
- operational control

The main mechanisms solve different problems:

- **Single agent** keeps ownership and state together.
- **Role-based workflow** separates responsibilities without necessarily creating independent agents.
- **Supervisor-worker** centralises task assignment and integration.
- **Planner-executor-critic-verifier** separates cognitive and acceptance responsibilities and may be implemented with one or several agents.
- **Debate** adds interactive challenge between competing positions.
- **Voting** aggregates independent choices.
- **Blackboard** coordinates through typed shared state.
- **Peer-to-peer** enables direct handoff without one central supervisor.
- **Swarm-style coordination** distributes many small decisions through explicitly defined local rules.

A production system should be able to answer:

```text
Who owns each task?
What may each agent do?
What state does each agent trust?
How are messages identified and bounded?
Who resolves conflicts?
Who verifies the result?
Who owns the final output?
What stops the system?
```

Without those answers, multi-agent design merely replaces one black box with a flock of smaller black boxes and a spaghetti nest of arrows.

Part 7 moves to the final dimension in the map:

> How are context, workflow state, working memory, long-term memory, and RAG different?

## References

- [Wu et al., *AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation*](https://arxiv.org/abs/2308.08155)
- [Li et al., *CAMEL: Communicative Agents for Mind Exploration of Large Scale Language Model Society*](https://arxiv.org/abs/2303.17760)
- [Hong et al., *MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework*](https://arxiv.org/abs/2308.00352)
- [Qian et al., *ChatDev: Communicative Agents for Software Development*](https://arxiv.org/abs/2307.07924)
- [Du et al., *Improving Factuality and Reasoning in Language Models through Multiagent Debate*](https://arxiv.org/abs/2305.14325)
- [Choi et al., *Debate or Vote: Which Yields Better Decisions in Multi-Agent Large Language Models?*](https://arxiv.org/abs/2508.17536)
- [Wu et al., *Can LLM Agents Really Debate? A Controlled Study of Multi-Agent Debate in Logical Reasoning*](https://arxiv.org/abs/2511.07784)
- [Nii, *The Blackboard Model of Problem Solving and the Evolution of Blackboard Architectures*](https://doi.org/10.1609/aimag.v7i2.537)
- [Guo et al., *Large Language Model based Multi-Agents: A Survey of Progress and Challenges*](https://arxiv.org/abs/2402.01680)

## Series

| Part | Topic |
|---:|---|
| 1 | Beyond ReAct: A Six-Dimensional Map of LLM Agent Architectures |
| 2 | Agent Execution Paths: Direct Calls, Pipelines, Routers, State Machines, and DAGs |
| 3 | ReAct, Plan-and-Execute, Adaptive Planning, and HTN |
| 4 | From Single-Path Reasoning to Trees, Graphs, MCTS, and LATS |
| 5 | Verification, Recovery, and Self-Correction |
| 6 | Multi-Agent Organisation, Coordination, and Control |
| 7 | Agent Memory |
| 8 | Production Agent Architectures |
| 9 | How to Choose an Agent Architecture |
| 10 | Implementing Agent Patterns with Modern Frameworks |
