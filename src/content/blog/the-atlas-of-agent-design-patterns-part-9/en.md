---
title: "The Atlas of Agent Design Patterns Part 9 ｜ How to Choose an Agent Architecture: Decision Trees, Evaluation Matrices and Anti-Patterns"
description: "Starting from whether an Agent is needed at all, walking through a six-dimension selection flow, evaluation matrices, Production practicality ranking, common anti-patterns and an architecture review Checklist, turning Agent vocabulary into actionable architecture decisions."
date: 2026-07-01T13:58:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 9
---

# The Atlas of Agent Design Patterns Part 9 ｜ How to Choose an Agent Architecture: Decision Trees, Evaluation Matrices and Anti-Patterns

## How to Choose an Agent Architecture: Decision Trees, Evaluation Matrices, and Anti-Patterns

The previous eight articles walked through Direct, Pipeline, Router, State Machine, DAG, ReAct, Planning, Tree Search, Verifier, Multi-Agent and Memory.

Knowing the vocabulary only means you own a box of building blocks.

The harder part:

> Faced with a real requirement, which blocks do you pick up, which do you refuse, and how do you prove the resulting architecture is worth taking into Production?

The main job of Part 9 is to take the reader from "knowing the vocabulary" to "being able to make the architecture decision".

Four things get done in this article:

1. Decide whether the task actually needs an Agent
2. Walk through the six selection dimensions
3. Evaluate options against cost, latency, reliability and observability
4. Use the Architecture Canvas, anti-pattern table and review Checklist to finish the formal review

---

# 1. First question: does this task actually need an Agent?

Many teams start by asking:

- ReAct or Plan-and-Execute?
- Do we need Multi-Agent?
- Do we need Long-term Memory?
- Do we need Tree of Thoughts?

The earlier question should be:

> Can this task be handled by Direct, Pipeline or Router alone?

Agent is not the default answer.

Agent earns its place only when the fixed logic cannot reasonably handle:

- The next step depends on a mid-flight Observation
- A Tool Result changes the route that follows
- The task path cannot be fully enumerated up front
- The task requires persistent State
- The task needs dynamic Planning
- The task needs bounded autonomy to handle unknown situations

## Direct

For:

- A single model call
- No external tools
- No persistent State needed
- Low risk
- The input already carries enough information

Examples: translation, rewriting, summarisation, classification, format conversion.

## Pipeline

For:

- Fixed order
- Each step predictable
- Independently testable
- No dynamic tool choice

Example:

```text
Upload
  ↓
Parse
  ↓
Validate
  ↓
Store
```

## Router

For:

- Different requests need different paths
- Different data sources
- Different cost tiers
- Different risks and tools

Example:

```text
User Request
  ↓
Router
  ├→ Direct
  ├→ RAG
  ├→ SQL
  ├→ Calculator
  ├→ Agent Workflow
  └→ Human Review
```

## Agentic Workflow

For:

- Next step depends on Observation
- Multiple rounds of tool interaction
- Bounded autonomy required
- Retry, Fallback or Replanning required

## Stateful Agent

When the task carries these needs, a State Machine or persistent State usually becomes necessary:

- Pause / Resume
- Human Approval
- Retry Limit
- Replanning
- Long-running execution
- Checkpoint recovery
- Terminal states like Pending / Partial / Blocked

![Figure 9-1 — Do You Need an Agent?](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-1-do-you-need-an-agent.png)

> **Figure 9-1 ｜ Do You Need an Agent?**
> Start with Direct, Pipeline and Router. Only when the next step depends on Observation, a tool response or persistent State should you upgrade to Agentic Workflow or Stateful Agent.

---

# 2. Turn requirements into inspectable system properties

Do not jump straight from requirement to Framework.

Translate requirements into five categories of system properties first.

## Task properties

- Single-step or multi-step?
- Fixed or dynamic?
- Any branching?
- Any loops needed?
- Any parallelism needed?
- Pause / Resume needed?
- Human approval needed?

## Data properties

- Is the data already in the input?
- RAG needed?
- Live web needed?
- SQL needed?
- Sensitive data involved?
- Versioned or time-sensitive?

## Tool properties

- How many tools?
- Are tools reversible?
- Do they write?
- Any high-risk operations?
- Sandbox needed?
- Permission differences?

## Quality properties

- Is there a clear correct answer?
- Can Completion Criteria be defined?
- Can it be tested externally?
- Does it need Citation?
- Is Partial allowed?
- Does it need Human Judgment?

## Operations properties

- Latency ceiling
- Cost ceiling
- Observability
- Reproducibility
- Compliance requirements
- Audit
- Availability
- Error Budget

---

# 3. The six-dimension architecture selection flow

A single name does not describe an Agent architecture well.

Pick across six dimensions.

## Dimension 1: Execution Path

Answers:

> How does the task move from start to finish?

| Pattern | Suitable scenario | Main strength | Main risk |
|---|---|---|---|
| Direct | Single step, low risk | Simplest, lowest cost | Limited capability |
| Pipeline | Fixed flow | Controllable, testable | Poor fit for dynamic branching |
| Router | Multiple request types | Cost and path split | Misrouting |
| State Machine | Long tasks, recovery, approval | Clear states | Higher design cost |
| DAG | Parallel sub-tasks | Higher throughput | Dependency management |
| Event-driven | Monitoring, async | Suits events and schedules | Distributed state complexity |

Selection questions:

```text
Is the flow fixed?
Is there branching?
Are loops needed?
Is persistent State needed?
Is parallelism needed?
Is it triggered by an event?
```

## Dimension 2: Decision and Planning

Answers:

> How is the next step decided?

### Fixed Decision

For tasks whose path can be pre-defined, where cost and risk need to be tightly controlled.

### ReAct

For Browser, Debug, Search and API Exploration where the next step depends on a tool result.

Requires:

- Max Steps
- Tool Allowlist
- Duplicate Detection
- Stop Condition

### Plan-and-Execute

For:

- Long tasks
- Multiple sub-goals
- Easy to miss items
- Need to estimate Budget first

### Adaptive Planning

For:

- Initial plan may fail
- External data unstable
- Tools may become unavailable
- Remaining steps need revising

Requires:

- Plan Version
- Replan Trigger
- Maximum Replans
- Completed Step Registry

### HTN

For tasks with existing SOPs, enterprise processes and controlled decomposition methods.

## Dimension 3: Reasoning and Search

Answers:

> How many candidate paths should the system explore?

| Pattern | When to use | Required precondition |
|---|---|---|
| Single-path | Simple questions, cost-sensitive | Strong Verifier |
| Self-consistency | Clear answers, votable | Answers can be normalised |
| Generate-and-Rank | Multiple complete solutions | Reliable Ranker |
| Beam Search | A few candidates per layer | Intermediate states can be scored |
| Tree of Thoughts | Pruning and backtracking needed | Evaluator is trusted |
| Graph of Thoughts | Paths need merging | State management is mature |
| MCTS / LATS | Action and feedback in an environment | Sandbox and external Observation |

Do not use complex Search without a reliable Evaluator.

## Dimension 4: Verification and Recovery

Answers:

> How does the system know it is wrong, and how does it fix it?

| Failure type | Suggested pattern |
|---|---|
| Transient error | Retry |
| Suboptimal parameter | Parameterized Retry |
| Primary method unavailable | Fallback |
| Format or local quality issue | Self-Refine |
| Diagnosis needed | Critic |
| Pass / Fail needed | Verifier |
| Executable artefact | Generate-and-Test |
| Initial plan failed | Replanning |
| Want to avoid repeating the same mistake | Reflexion |
| High risk or irreversible | Human Review |

## Dimension 5: Agent Organisation

Answers:

> Who does the work?

### Single Agent

The default option.

### Role-based Single Agent

Responsibilities split, but no real independent execution.

### Supervisor–Worker

Sub-tasks are clearly separable, parallel-friendly, and need central governance.

### Planner–Executor–Critic

Planning, execution and diagnosis split across roles.

### Debate / Voting

Multiple viewpoints, adversarial analysis, or fixed-candidate aggregation.

### Blackboard

Multiple Agents share intermediate results.

### Peer-to-Peer / Swarm

Only for highly decentralised setups with a mature Control Plane.

## Dimension 6: State and Memory

Answers:

> What gets stored, and for how long?

| Type | Use |
|---|---|
| Stateless | Single-shot task |
| Working Memory | Current task intermediate information |
| Short-term State | Workflow progress |
| Episodic Memory | Past events and outcomes |
| Semantic Memory | Stable knowledge |
| Procedural Memory | SOPs and rules |
| User Memory | User-authorised preferences |
| Shared Memory | Multi-Agent shared information |
| External Knowledge Store | External Source of Truth |

![Figure 9-2 — Six-Dimensional Architecture Selection Workflow](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-2-six-dimensional-architecture-selection-workflow.png)

> **Figure 9-2 ｜ Six-Dimensional Architecture Selection Workflow**
> Starting from task properties, choose Execution Path, Decision, Search, Verification, Organisation and Memory in order. Finish by applying Policy, Budget, Observability and Human Approval.

---

# 4. The full selection matrix

| Task property | Execution Path | Decision / Planning | Search | Verification | Organisation | State / Memory |
|---|---|---|---|---|---|---|
| One-off text task | Direct | Fixed | Single-path | Schema / Basic Check | Single Agent | Stateless |
| Fixed document handling | Pipeline | Fixed | Single-path | Schema / Rule | Single Agent | Short-term State |
| Multi-type question answering | Router | Fixed / Router | Single-path | Route Check | Single Agent | Query State |
| Document QA | RAG Pipeline | Fixed / Query Rewrite | Retrieval + Rerank | Citation / Faithfulness | Single Agent | Query State + External Knowledge |
| Dynamic Browser task | State Machine | ReAct | Single-path / Limited Search | Post-condition | Single Agent | Browser State + Action History |
| Coding fix | State Machine | Plan-and-Execute | Generate-and-Test | Tests / Build / Diff | Single Agent or Role-based | Repo Snapshot + Attempt State |
| Deep Research | State Machine + DAG | Adaptive Planning | Generate-and-Rank | Source Coverage / Citation | Supervisor–Worker | Evidence Store + Working Memory |
| Multi-viewpoint evaluation | Pipeline / State Machine | Fixed | Debate / Voting | Judge + External Verifier | Multi-Agent | Shared State |
| High-risk enterprise operation | State Machine | Fixed Policy Flow | Usually no Search | Rule + Human Approval | Single Agent / Role-based | Approval State + Audit Log |
| Long-term monitoring | Event-driven | Fixed / Limited Agentic | Single-path | Change Verification | Single Agent | Baseline + Alert History |
| Highly decentralised collaboration | Event-driven / P2P | Local Planning | Distributed Search | Global Verifier | Peer-to-Peer / Swarm | Shared Memory + Control Plane |

---

# 5. When to pick ReAct, Planning or Adaptive Planning?

## ReAct

When:

- Each step needs Observation
- The next Tool cannot be predicted
- The task path is short to medium
- Local decisions matter more than global plans

Avoid when:

- The task is very long
- High-risk fixed flow
- Clear dependencies and a complete deliverable exist

## Plan-and-Execute

When:

- Multiple explicit sub-goals
- Easy to miss items
- Sub-task order matters
- Need to estimate Budget first

## Adaptive Planning

When:

- External data may not exist
- Tools may fail
- Original assumptions may be wrong
- Remaining plan needs revising

---

# 6. When is multi-path search worth it?

Multi-path search is only worth it when all of these hold:

- Multiple meaningful candidates exist
- Early choice affects what follows
- Intermediate results can be evaluated
- Budget is sufficient
- A reliable Evaluator exists
- The search actions can be executed safely

| Situation | Recommendation |
|---|---|
| Multiple generations, votable | Self-consistency |
| Multiple complete solutions to compare | Generate-and-Rank |
| Keep a few candidates per layer | Beam Search |
| Need pruning and backtracking | Tree of Thoughts |
| Need to merge paths | Graph of Thoughts |
| Action and feedback in an environment | LATS |

---

# 7. When does Multi-Agent earn its place?

Multi-Agent fits when:

- Sub-tasks naturally separate
- Can run in parallel
- Different Agents need different tools or permissions
- Independent viewpoints are needed
- A single Context is too large
- Central governance or a shared workspace is needed

Multi-Agent does not fit when:

- The task heavily depends on one shared Context
- A single Agent can finish it
- There is no Aggregator
- There is no Final Owner
- Shared-state governance is missing
- Handoff cost exceeds execution cost

Minimum viable order:

```text
Single Agent
  ↓
Role-based Single Agent
  ↓
Supervisor–Worker
  ↓
Blackboard / Debate
  ↓
Peer-to-Peer / Swarm
```

This is not a maturity ladder. It is the rising order of coordination cost.

---

# 8. How to pick the verification mechanism

| Task | Priority verification |
|---|---|
| JSON / Schema | Deterministic Validation |
| SQL | Parser + Read-only Policy + Execution |
| RAG | Citation + Faithfulness |
| Coding | Tests + Lint + Build |
| Browser | Post-condition |
| Research | Source Coverage + Conflict Check |
| High-risk operation | Policy + Human Approval + Audit |
| Open-ended text | Rubric + Critic + Human Sampling |

Principles:

- Use rules where possible, not only the LLM
- Execute, not only eyeball
- Check sources, not only vote
- High risk needs ownership and authorisation
- A Verifier must be able to output Fail

---

# 9. How to pick Memory

## Working Memory

For long tasks, intermediate information and Context compression.

## Short-term State

For State Transition, Retry, Approval, Pause / Resume.

## Episodic Memory

For similar cases, past events and action replay.

## Semantic Memory

For governable stable knowledge.

## Procedural Memory

For SOPs, tool rules and acceptance procedures.

## User Memory

Only preferences that the user has explicitly authorised, that are long-term stable, and that the user can view and delete.

## Not using Long-term Memory

When the task is one-off, the data is sensitive, the information expires easily, or it can be re-retrieved from the Source of Truth.

---

# 10. Autonomy versus controllability

| Pattern | Autonomy | Controllability |
|---|---:|---:|
| Direct | Very low | Very high |
| Fixed Pipeline | Low | Very high |
| Router | Low–Medium | High |
| Agentic Workflow | Medium | Medium–High |
| Plan-and-Execute | Medium–High | Medium |
| Adaptive Agent | High | Medium–Low |
| Long-running Autonomous Agent | Very high | Low |

The Production sweet spot usually is:

> Bounded autonomy plus a clear Workflow, Policy, Verifier and Human Approval.

![Figure 9-3 — Agent Autonomy and System Control Matrix](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-3-agent-autonomy-system-control-matrix.png)

> **Figure 9-3 ｜ Agent Autonomy and System Control Matrix**
> Higher autonomy usually means more flexibility, but predictability drops. Agentic Workflow often sits in the practical balance zone, while Multi-Agent is not a fixed autonomy level.

---

# 11. Cost, latency, reliability and observability

## Cost

- Model Calls
- Token
- Tool Calls
- Search API
- Browser
- Sandbox
- Human Review

## Latency

- Model latency
- Tool latency
- Worker wait
- Human approval
- Retry

## Reliability

- Success Rate
- Partial Rate
- Retry Rate
- Verifier Pass Rate
- Post-condition Success

## Observability

- Trace
- State Transition
- Tool Call
- Prompt / Model Version
- Cost
- Failure Reason
- Audit

---

# 12. Cost versus quality matrix

| Architecture | Potential quality | Runtime cost | Latency | Operational risk | Best fit |
|---|---:|---:|---:|---:|---|
| Direct | Low–Medium | Low | Low | Low | One-off tasks |
| Pipeline | Medium | Low–Medium | Low | Low | Fixed flows |
| RAG | Medium–High | Medium | Low–Medium | Medium | Source-backed QA |
| Agentic Workflow | High | Medium–High | Medium–High | Medium–High | Dynamic multi-step |
| Multi-Agent | Depends on design | High | High | High | Naturally separable work |
| Long-running Autonomous | Unstable | Very high | Very high | Very high | A few special scenarios |

Principles:

> Among the options that meet the quality threshold, choose the one with the lowest cost, latency and operational risk.

![Figure 9-4 — Cost vs Quality Matrix](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-4-cost-vs-quality-matrix.png)

> **Figure 9-4 ｜ Cost vs Quality Matrix**
> More complex architecture does not guarantee higher quality. Production selection should set the quality threshold first, then choose the option with the lowest cost, latency and operational risk.

---

# 13. Production practicality ranking

The ranking here is not about capability strength. It is the order in which most Production projects should prioritise and consider.

| Tier | Pattern | Production practicality | Recommendation |
|---|---|---:|---|
| A | Direct, Pipeline, Router, State Machine, Verifier | Very high | Master first |
| A | RAG, ACL, Citation, Budget, Trace | Very high | Common core capability |
| B | DAG, Plan-and-Execute, Generate-and-Test | High | Use per task |
| B | Working Memory, Procedural Memory | High | Long tasks and governance |
| C | Supervisor–Worker, Debate, Blackboard | Medium | Only when naturally separable |
| C | Self-consistency, Generate-and-Rank, Beam Search | Medium | Only with a real Evaluator |
| D | Tree of Thoughts, Graph of Thoughts, LATS | Low–Medium | High-value special scenarios |
| D | Peer-to-Peer, Swarm | Low | Only with mature Control Plane |
| D | Long-running Autonomous Agent | Low | High operational cost and risk |

---

# 14. Ten Agent anti-patterns and fixes

| Anti-pattern | Problem | Fix | Acceptance criterion |
|---|---|---|---|
| Framework-first | Pick the tool before the need is clear | Complete the Architecture Canvas first | Pattern choice has a reason |
| Pattern Shopping | Add every new Pattern | Each Pattern must correspond to a real need | No unused components |
| Multi-Agent Inflation | Role names pretending to be independent Agents | Start with Role-based Single Agent | Independent responsibility counts as Agent |
| Search Without Evaluator | Searching more without knowing what is better | Build the Evaluator first | Intermediate states can be scored |
| Memory Without Governance | Everything goes into a Vector Store | Add Source, Scope, Version, Expiry | Memory can be updated and deleted |
| Human-in-the-loop Theater | Only an Approve button | Show evidence, risk, impact | Approver can make a real judgement |
| Autonomy as KPI | Treating autonomy as maturity | Set the minimum necessary autonomy | Autonomy has explicit payoff |
| Retry as Recovery | Retrying every error | Classify Failure first | Retry only handles transient errors |
| Demo Success as Production Readiness | One success goes live | Test the Failure Path | Normal, failure, high-risk all verified |
| No Final Owner | Multiple Agents, no one in charge | Name a Final Owner | Only one formal completer |

---

# 15. Agent Architecture Canvas

A complete Canvas should carry fifteen fields.

1. User Goal
2. Success Criteria
3. Inputs and Data
4. Tools and Actions
5. Execution Path
6. Decision and Planning
7. Search Strategy
8. Verification and Recovery
9. Agent Organisation
10. State and Memory
11. Policy and Safety
12. Budget and Limits
13. Observability
14. Terminal States
15. Final Owner

Each field must answer:

- What is the decision?
- Why is it needed?
- What limits apply?
- How is it accepted?

![Figure 9-5 — Agent Architecture Canvas](/images/the-atlas-of-agent-design-patterns-part-9/figure-9-5-agent-architecture-canvas.png)

> **Figure 9-5 ｜ Agent Architecture Canvas**
> Through fifteen fields, requirement, tools, flow, Planning, Search, Verification, Organisation, Memory, Policy, Budget, Observability and Final Owner live on one architecture canvas.

---

# 16. Full case: from requirement to architecture

Requirement:

> Build a Blog Ask AI. Users can ask about article content. The system answers from the site's own articles with sources. It can rewrite Queries when needed, but cannot freely browse the web and cannot retry indefinitely.

## Step 1: Does it need an Agent?

Most of the flow is a fixed RAG Pipeline.

Only Query Rewrite, Retrieval Retry and Clarification need bounded Agentic capability.

Conclusion:

```text
Not a full Agent
but an Agentic RAG Workflow
```

## Step 2: Execution Path

```text
Router
  ↓
RAG Pipeline
  ↓
Citation Verifier
```

## Step 3: Decision

- Fixed Flow
- Bounded Query Rewrite
- Maximum 1 Retry

## Step 4: Search

- Hybrid Retrieval
- Reranker
- Source Diversity
- No Tree Search needed

## Step 5: Verification

- Citation Coverage
- Claim Support
- Permission Check
- Answerability

Failure outcomes:

- Retry
- Clarify
- Abstain

## Step 6: Organisation

Single Agent is enough.

No Multi-Agent needed.

## Step 7: State and Memory

Needed:

- Original Query
- Rewritten Query
- Retrieved IDs
- Citation Map
- Retry Count

Not needed:

- Episodic Memory
- User Memory
- Shared Memory

## Step 8: Policy

- Only site articles allowed
- No unauthorised content quoting
- No open Web Search
- No unsourced fact generation

## Step 9: Budget

- Max Retrieval Calls: 2
- Max Rewrite: 1
- Max Answer Tokens
- Max Latency
- No Infinite Retry

## Step 10: Terminal States

- Completed
- Clarification Required
- Unsupported
- Insufficient Evidence
- Failed

## Final architecture description

```text
User Goal:
Answer questions from blog content with citations

Execution Path:
Router → RAG Pipeline → Citation Verifier

Decision:
Fixed flow with one bounded Query Rewrite

Search:
Hybrid Retrieval + Rerank

Verification:
Citation Coverage
Claim Support
Permission Check

Organisation:
Single Agent

State:
Original Query
Rewritten Query
Retrieved IDs
Citation Map
Retry Count

Memory:
No unrestricted long-term memory

Policy:
Blog corpus only
No unsupported claims
No open Web access

Budget:
2 retrieval calls
1 rewrite
bounded latency and tokens

Terminal States:
Completed
Clarification Required
Unsupported
Insufficient Evidence
Failed

Final Owner:
RAG Orchestrator
```

---

# 17. Architecture review Checklist

## Need review

- [ ] The task genuinely needs Agentic capability
- [ ] Direct, Pipeline or RAG alone is confirmed insufficient
- [ ] Agent autonomy has measurable payoff
- [ ] No Agent was added just because it is fashionable

## Workflow review

- [ ] Execution Path is clearly defined
- [ ] Every State has an entry and an exit
- [ ] Every Loop has an upper bound
- [ ] Retry, Repair and Replan are separated
- [ ] Terminal States are defined
- [ ] Pause / Resume behaviour is defined
- [ ] How to resume after Human Approval is defined

## Tool and permission review

- [ ] Minimum permissions used
- [ ] Read / Write tools are separated
- [ ] High-risk tools have an Approval Gate
- [ ] Secrets are isolated
- [ ] Sandbox is in place
- [ ] Tool Allowlist is not written only in the Prompt
- [ ] Irreversible operations have Idempotency or Compensation

## Verification review

- [ ] Completion Criteria are explicit
- [ ] Verifier can output Fail
- [ ] Deterministic checks are preferred
- [ ] Executable artefacts have real tests
- [ ] RAG has Citation / Faithfulness check
- [ ] Browser has Post-condition
- [ ] High-risk operations have post-execution verification
- [ ] Tests and acceptance conditions cannot be modified by the Agent at will
- [ ] Partial / Unsupported / Pending are supported

## State and Memory review

- [ ] State and Memory are separated
- [ ] Working Memory has a TTL
- [ ] Long-term Memory has a Source
- [ ] Memory has Scope, Version, Expiry
- [ ] Unverified content cannot be written directly
- [ ] User / Tenant Isolation is complete
- [ ] Shared Memory has Read / Write permissions
- [ ] Supersede, Delete and Audit are supported
- [ ] Data that can be retrieved from the Source of Truth is not duplicated for permanent storage

## Cost and reliability review

- [ ] Global Budget is defined
- [ ] Per-step Budget is defined
- [ ] Max Steps is defined
- [ ] Retry Limit is defined
- [ ] Replan Limit is defined
- [ ] Tool Call Limit is defined
- [ ] Timeout is defined
- [ ] No-progress Detection is in place
- [ ] Kill Switch exists
- [ ] Safe Mode or fallback path exists

## Observability review

- [ ] Each task has a Trace ID
- [ ] State Transitions are observable
- [ ] Tool Calls are traceable
- [ ] Model Version is saved
- [ ] Prompt Version is saved
- [ ] Cost and Latency are measurable
- [ ] Failure Reason can be queried
- [ ] High-risk operations have an Audit Log
- [ ] Replay can be done safely

## Human responsibility review

- [ ] Final Owner is named
- [ ] Approver is named
- [ ] Self-approval is avoided
- [ ] Human Review shows evidence and risk
- [ ] Approval has an Expiry
- [ ] State is reverified before execution
- [ ] Rejection, timeout and cancellation all have handling paths

## Go-Live decision

- [ ] Go
- [ ] Pilot
- [ ] No-Go
- [ ] Required Remediation is recorded
- [ ] Review Owner is named
- [ ] Review Date is recorded

---

# 18. Go, Pilot, No-Go

## Go

- Completion Criteria are explicit
- Main flow is verifiable
- Permissions minimised
- Failure Path has been tested
- Trace is complete
- High-risk operations have Approval

## Pilot

- Core flow runs
- Human monitoring still required
- Some Failure Modes not fully tested
- Limited users, data and scope
- Fast Kill Switch available

## No-Go

- No reliable Verifier
- High-risk tools without Approval
- No persistent State
- No cost ceiling
- No Terminal State
- Memory governance unclear
- No Audit
- Failure could cause irreversible damage

---

# 19. Final selection principles

1. Pick the simplest viable architecture first
2. Place autonomy only at the nodes that genuinely need it
3. Design the Verifier before designing the Agent
4. The higher the risk, the lower the autonomy
5. Memory must be governable
6. Multi-Agent must have a Final Owner
7. Cost and Latency are architecture requirements
8. Formal failure is a capability
9. Every Loop needs an exit
10. Production Readiness comes from controllability

---

# Conclusion of this article

Choosing an Agent architecture is not picking the most fashionable term.

It is answering:

```text
How does the task move?
How is the next step decided?
How many candidates does the search explore?
How are failures verified and recovered?
Who does the work?
How are State and Memory stored?
```

Then close with four Production constraints:

```text
Policy
Budget
Observability
Human Responsibility
```

The whole series can be wrapped in one sentence:

> **The best Agent architecture is the one that, with the lowest necessary complexity, reliably finishes the task.**

---

# The Atlas of Agent Design Patterns — Series Index

| Part | Topic |
|---:|---|
| 1 | LLM Agents are not only ReAct: six dimensions for reading Agent architecture |
| 2 | Agent execution paths in full: Direct, Pipeline, Router, State Machine and DAG |
| 3 | ReAct, Plan-and-Execute and Adaptive Planning |
| 4 | From one line of thought to searching the whole solution space: CoT, ToT, GoT and LATS |
| 5 | Agent verification and self-correction |
| 6 | Multi-Agent architecture in full |
| 7 | Agent Memory in full |
| 8 | Production Agent architecture in practice |
| 9 | How to choose an Agent architecture |
| Bonus | Implementing design patterns with modern Agent Frameworks |

---

# Figure-to-section mapping

| Figure | Formal title | Suggested filename | Section |
|---|---|---|---|
| Figure 9-1 | Do You Need an Agent? | `figure-9-1-do-you-need-an-agent.png` | Does this task actually need an Agent |
| Figure 9-2 | Six-Dimensional Architecture Selection Workflow | `figure-9-2-six-dimensional-architecture-selection-workflow.png` | Six-dimension selection flow |
| Figure 9-3 | Agent Autonomy and System Control Matrix | `figure-9-3-agent-autonomy-system-control-matrix.png` | Autonomy and controllability |
| Figure 9-4 | Cost vs Quality Matrix | `figure-9-4-cost-vs-quality-matrix.png` | Cost, quality and risk |
| Figure 9-5 | Agent Architecture Canvas | `figure-9-5-agent-architecture-canvas.png` | Final architecture design canvas |
