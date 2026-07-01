---
title: "The Atlas of Agent Design Patterns Part 4 | From Single-Path Reasoning to Trees, Graphs, MCTS, and LATS"
description: "A production-focused guide to single-path reasoning, Chain-of-Thought, self-consistency, Generate-and-Rank, beam search, Tree of Thoughts, Graph of Thoughts, MCTS, LATS, evaluator design, diversity, stopping rules, and search budgets."
date: 2026-06-30T20:05:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 4
---


Part 3 examined how an agent decides what to do next:

- follow fixed logic
- react to the latest observation
- create an explicit plan
- revise the remaining plan
- decompose a goal hierarchically

This article addresses a different problem:

> When several candidate solutions or action sequences exist, how should the system explore them, compare them, and decide when to stop?

Some tasks need almost no search:

- translate a sentence
- extract fixed fields
- call a known calculator
- answer from one authoritative record
- transform data into a defined schema

Other tasks contain meaningful alternatives:

- a bug has several plausible root causes
- an architecture has several defensible designs
- a browser task has several action sequences
- a plan contains competing decompositions
- a mathematical problem admits several derivations
- a report can be organised around different analytical frames

Committing to the first plausible path is cheap. It is also fragile when early choices strongly affect the outcome.

A search-capable system may:

1. generate several candidate states or actions
2. evaluate candidates
3. preserve promising branches
4. prune weak or invalid branches
5. backtrack when a branch fails
6. merge complementary intermediate results
7. use external feedback to update its search
8. stop when quality, risk, and budget conditions are satisfied

The difficult part is not producing more text. It is maintaining a trustworthy search process.

## Reasoning, planning, search, and evaluation are different layers

These terms often appear together, but they answer different questions.

### Reasoning

Reasoning derives a conclusion from the information currently available.

```text
All enterprise plans support SSO
Plan X is an enterprise plan
Therefore, Plan X supports SSO
```

### Planning

Planning selects tasks or actions that may lead from the current state to a goal.

```text
Collect official evidence
  -> compare capabilities
  -> verify constraints
  -> produce recommendation
```

### Search

Search manages alternatives:

- which state to expand
- which candidate to keep
- which branch to prune
- whether to backtrack
- whether to merge results
- when to stop

### Evaluation

Evaluation estimates whether a state, action, or completed solution is valid, useful, safe, or preferable.

A single system may use all four:

```text
Planner defines the work
  -> Search controller explores alternatives
  -> Executor performs actions
  -> Evaluator scores results
  -> Verifier accepts the final outcome
```

The labels are not interchangeable. A planner may produce one plan without searching alternatives. A search controller may explore several candidate plans. A verifier may reject all of them.

## The five components of a search system

Before comparing named methods, it helps to describe the machinery they need.

### Candidate generator

Produces possible:

- answers
- intermediate states
- next actions
- plans
- code patches
- queries
- decompositions

### State representation

Records what each candidate means.

A useful state may include:

```text
Goal progress
Known facts
Unresolved requirements
Actions already taken
Evidence and provenance
Cost used
Policy status
Environment state
```

If the state is only an unstructured conversation transcript, equivalent branches become difficult to detect and compare.

### Evaluator

Scores or classifies a candidate using some combination of:

- hard constraints
- executable tests
- factual evidence
- progress toward the goal
- risk
- cost
- preference
- maintainability
- policy compliance

### Search controller

Decides:

- which candidate to expand next
- how many children to generate
- which branches survive
- when to prune
- when to backtrack
- whether to merge
- how exploration and exploitation are balanced

### Stopping rule

Ends search when:

- an accepted solution is found
- quality exceeds a threshold
- no feasible candidates remain
- the budget is exhausted
- the maximum depth or node count is reached
- improvement has stalled
- an irreversible action requires approval
- the task is blocked or unsupported

Without an evaluator, multiple paths are only multiple drafts. Without a stopping rule, the search space becomes a very expensive shrubbery.

![Figure 4-1 — Anatomy of a Multi-Path Search System](/images/the-atlas-of-agent-design-patterns-part-4/line-tree-graph-reasoning-structures.png)

> **Figure 4-1 ｜ Anatomy of a Multi-Path Search System**  
> The loop starts from a Problem or Current State, then runs through a Candidate Generator, a Search Frontier, an Evaluator and a Stopping Rule, with Backtrack and Merge woven in along the way, and finally returns an Accepted Solution or marks the task as Blocked. Each step in a search depends on the result of the previous one; it is not a flat chain.


## Single-path reasoning and Chain-of-Thought

A single-path system preserves one main trajectory:

```text
Problem
  -> Intermediate state
  -> Intermediate state
  -> Answer
```

This is often the correct baseline.

### When one path is enough

- the task is simple
- latency matters
- the environment gives a strong external verifier
- exploring alternatives adds little value
- the cost of a wrong first choice is low

For example, a system may generate one SQL query and then rely on:

- a read-only connection
- a parser
- execution
- result checks
- query limits

Reliability comes from the verifier and execution boundary, not from generating five SQL queries.

### Chain-of-Thought is not a search tree

Chain-of-Thought prompting encourages a model to produce intermediate reasoning steps before an answer. The original method demonstrated that such prompting can improve performance on multi-step reasoning tasks.

Its basic shape remains a chain:

```text
Prompt
  -> intermediate reasoning
  -> intermediate reasoning
  -> answer
```

By itself, Chain-of-Thought does not provide:

- multiple persistent candidates
- a search frontier
- branch scoring
- pruning
- backtracking
- state merging
- environment feedback

Therefore:

> Chain-of-Thought may make one path more explicit, but it does not by itself create a multi-path search system.

In production, auditability should focus on structured, observable artefacts:

- actions taken
- tools used
- evidence consulted
- conditions checked
- state transitions
- verifier results
- accepted and rejected candidates

A system does not need to expose or store unrestricted private reasoning text to be traceable.

## Self-consistency: sample several paths and aggregate the answer

Self-consistency is a decoding strategy for Chain-of-Thought-style reasoning. Instead of taking one greedy path, it samples a diverse set of reasoning paths and selects the most consistent final answer.

```text
Path A -> 42
Path B -> 42
Path C -> 39
Path D -> 42
Path E -> 41

Aggregate -> 42
```

### Best fit

Self-consistency works best when:

- the task has a relatively well-defined answer
- equivalent answers can be normalised
- different paths may reach the same result
- sampling variance is a meaningful source of error

Typical examples include:

- arithmetic reasoning
- multiple choice
- short-answer reasoning
- classification
- fixed-scale decisions

### What it does not do

Self-consistency normally compares completed answers. It does not maintain a frontier of intermediate states or deliberately expand one branch instead of another.

It is therefore better described as:

> sample-and-aggregate, not tree search.

### Agreement is not evidence

Several paths may share:

- the same false premise
- the same outdated source
- the same model bias
- the same prompt-induced shortcut

Agreement can reduce incidental decoding variance. It does not replace factual verification, tests, or source checks.

### Production controls

- sample count
- sampling diversity
- answer normalisation
- semantic grouping
- agreement threshold
- tie handling
- abstention
- cost budget
- verifier fallback

Example:

```text
Agreement >= threshold
  -> verify and accept

Agreement below threshold
  -> abstain, collect evidence, or use another evaluator
```

## Generate-and-Rank: generate complete candidates, then score them

Generate-and-Rank is a general engineering pattern rather than one single canonical algorithm.

```text
Problem
  -> Candidate generator
       -> A
       -> B
       -> C
       -> D
  -> hard validation
  -> external evaluation
  -> ranking
  -> select, combine, or abstain
```

It fits cases where several complete alternatives may all be reasonable:

- architecture options
- query rewrites
- code patches
- SQL candidates
- plans
- product decisions
- answer drafts
- tool choices

### Self-consistency versus Generate-and-Rank

| Dimension | Self-consistency | Generate-and-Rank |
|---|---|---|
| Aggregation basis | Agreement among answers | Explicit evaluation criteria |
| Best fit | One normalisable answer | Several plausible alternatives |
| Intermediate search | No | Usually no |
| Evaluator | Answer aggregator | Ranker or external test |
| Main risk | Shared error wins the vote | Weak ranker selects the wrong candidate |

### Layer the evaluator

A strong ranking pipeline should reject invalid candidates before comparing preferences.

Recommended order:

```text
Hard constraints
  -> executable tests
  -> evidence verification
  -> quality and preference ranking
```

Examples:

#### Hard constraints

- valid schema
- required fields present
- permitted tools only
- read-only SQL
- budget respected

#### Executable tests

- code compiles
- unit tests pass
- SQL executes
- browser state matches the goal
- constraints are satisfiable

#### Evidence verification

- claims have sources
- citations support the claim
- dates and versions are compatible
- required evidence is not missing

#### Preference ranking

- maintainability
- readability
- strategic fit
- user preference
- long-term cost

A candidate that fails a hard test should not win because it sounds polished.

![Figure 4-2 — Generate-and-Rank](/images/the-atlas-of-agent-design-patterns-part-4/generate-and-rank.png)

> **Figure 4-2 ｜ Generate-and-Rank**  
> The Candidate Generator produces several candidates, which then pass through Hard Validation, External Evaluation and Ranking before the system picks the best one. The point is not just generating more candidates; it is having reliable evaluation criteria.


## Beam search: keep a bounded frontier

Beam search is an approximate search strategy that keeps only the top `K` partial candidates at each expansion layer.

```text
Start
  -> A (8), B (7), C (3)
  -> keep A and B

Expand A and B
  -> A1 (6), A2 (9), B1 (8), B2 (4)
  -> keep A2 and B1
```

### Core controls

- beam width
- branching factor
- scoring function
- maximum depth
- diversity policy
- termination condition

### Why it is useful

Full expansion grows exponentially. Beam search limits the active frontier.

### Why it is risky

Beam search is not complete in general. A branch that looks weak early may lead to the best final solution, but once pruned it is normally gone.

Standard beam search also does not provide general backtracking. It advances layer by layer with a bounded frontier. If the system restores a previously pruned branch, it has added another mechanism beyond ordinary beam search.

### Diversity matters

A top-`K` frontier may contain five paraphrases of one idea.

Useful controls include:

- semantic deduplication
- diversity penalty
- category quotas
- novelty score
- state canonicalisation

Diverse Beam Search is one example of explicitly optimising diversity rather than keeping near-duplicate sequences.

## Tree of Thoughts: search over meaningful intermediate states

Tree of Thoughts generalises beyond a single Chain-of-Thought path by treating coherent intermediate units as search states.

A thought might be:

- a partial mathematical solution
- a candidate subgoal
- a code-repair direction
- a partial plan
- a set of completed actions
- an article structure

The central loop is:

```text
Represent current state
  -> generate candidate thoughts
  -> evaluate candidates
  -> select states to expand
  -> prune weak states
  -> continue, backtrack, or stop
```

The original framework demonstrated deliberate exploration using methods such as breadth-first and depth-first search with state evaluation.

### What makes ToT different from CoT

| Capability | Chain-of-Thought | Tree of Thoughts |
|---|---:|---:|
| Intermediate units | Yes | Yes |
| Persistent alternatives | No | Yes |
| Intermediate evaluation | Not inherent | Core |
| Search controller | No | Yes |
| Pruning | No | Yes |
| Backtracking | No | Supported by the chosen search |
| State management | Minimal | Required |

### Thought granularity

A thought must be large enough to evaluate and small enough to expand.

Too small:

```text
Every token becomes a node
```

The search explodes.

Too large:

```text
The entire final answer becomes one node
```

The method collapses back into Generate-and-Rank.

A useful thought:

- changes the next decision
- has a meaningful state representation
- can be evaluated independently
- can be compared or deduplicated
- does not make the tree unnecessarily deep

### Evaluation options

- scalar value estimate
- pairwise comparison
- promising / uncertain / impossible classification
- deterministic constraints
- external tests
- environment feedback

The strongest available signal should be used. A compiler is usually a better code evaluator than a model's stylistic confidence.

### Search controls

- branching factor
- maximum depth
- maximum nodes
- beam width
- duplicate-state detection
- no-improvement limit
- time and tool budget
- accepted-solution threshold

![Figure 4-3 — Tree Search: Branching, Pruning, and Backtracking](/images/the-atlas-of-agent-design-patterns-part-4/tree-search-pruning-backtracking.png)

> **Figure 4-3 ｜ Tree Search: Branching, Pruning, and Backtracking**  
> The search tree generates candidate branches from the Root; the Evaluator scores intermediate states; low-value branches get Pruned, failed paths get Backtracked, and only the solutions that pass verification survive.


## Graph of Thoughts: combine, transform, and reuse intermediate results

Tree structures normally give each node one parent. Some tasks require a richer dependency structure.

Graph of Thoughts models intermediate information as graph vertices and dependencies as edges. Its operations may include:

- generation
- aggregation
- refinement
- reduction
- transformation
- feedback

Example:

```text
Pricing analysis --------\
Feature analysis ----------> Positioning synthesis
Customer evidence --------/
```

A downstream thought may depend on several upstream thoughts. Intermediate results can be reused instead of copied into separate branches.

### GoT is more than "a tree that merges at the end"

The important capability is an arbitrary dependency graph over thought units.

Possible uses include:

- combining complementary analyses
- refining a result using feedback
- distilling several states into one
- reusing one intermediate result in several downstream tasks
- iteratively improving a state

### Production requirements

A graph-shaped reasoning process needs:

- node identity
- dependency tracking
- versioning
- invalidation rules
- provenance
- merge semantics
- conflict handling
- deduplication
- iteration or cycle limits
- convergence criteria

If upstream evidence changes, downstream nodes derived from it may need to be invalidated and recomputed.

### Main risk

The graph can become harder to understand than the problem it represents. GoT is valuable when combining and reusing intermediate states is central, not merely because a graph appears more sophisticated than a tree.

## MCTS: balance exploration and exploitation in a search tree

Monte Carlo Tree Search builds a tree through repeated iterations. The conventional loop contains four phases:

1. **Selection:** choose a promising path while balancing known value and underexplored branches.
2. **Expansion:** add one or more children.
3. **Simulation or evaluation:** estimate the outcome from the expanded state.
4. **Backpropagation:** propagate the result through visited ancestors.

```text
Selection
  -> Expansion
  -> Simulation / Evaluation
  -> Backpropagation
  -> next iteration
```

Classical MCTS often uses rollouts. Modern variants may use learned policies, value estimates, domain heuristics, or real environment results.

MCTS is not merely "Tree of Thoughts with scores". It maintains statistics across repeated visits and uses a tree policy to decide where the next search effort should go.

## LATS: tree search over language-agent actions and environment states

Language Agent Tree Search integrates language-model reasoning and action generation with Monte Carlo Tree Search, language-model value functions, self-reflection, and external environment feedback.

A node may contain:

```text
Environment state
Action history
Observation
Reflection
Value estimate
Visit statistics
```

A simplified iteration is:

```text
Select a tree state
  -> generate candidate actions
  -> execute or simulate an action
  -> observe the environment
  -> evaluate and reflect
  -> update tree statistics
  -> expand, revisit, or backtrack
```

### ToT versus LATS

| Dimension | Tree of Thoughts | LATS |
|---|---|---|
| Main state | Intermediate thought | Agent and environment state |
| Actions in environment | Optional | Central |
| External feedback | Optional | Core |
| Search statistics | Depends on controller | MCTS-style |
| Typical tasks | Deliberate problem solving | Coding, web interaction, interactive QA |
| Main cost | Model evaluation | Model plus environment execution and state management |

### Why environment feedback matters

For code repair:

```text
Candidate patch
  -> run tests
  -> observe failures
  -> update branch value
```

For browser interaction:

```text
Candidate click
  -> receive new DOM or screen
  -> measure progress
  -> update search state
```

This is stronger than asking the model which action "sounds best", provided that the environment signal actually reflects the desired outcome.

### Safety boundary

Search over actions is safe only when exploration is reversible or isolated.

Use:

- sandbox
- temporary branch
- test database
- mock service
- dry run
- reversible transaction
- approval gate

Do not explore by sending five real payments, deleting five copies of production data, or publishing five competing messages.

### Reward hacking and weak value functions

If the score is "make tests pass", a system may delete the tests.

The evaluator must also consider:

- unchanged requirements
- policy compliance
- side effects
- maintainability
- full regression suite
- security
- cost
- user intent

![Figure 4-4 — MCTS and LATS Search Loop](/images/the-atlas-of-agent-design-patterns-part-4/mcts-lats-search-loop.png)

> **Figure 4-4 ｜ MCTS and LATS Search Loop**  
> The Search Controller does Selection and Expansion. The Agent acts in the Sandbox Environment, gathers Observation, Test Result, Reflection and Value, and Backpropagates them into the search tree.


## Case-based reasoning and neuro-symbolic methods are adjacent components

The earlier list becomes clearer when these two ideas are placed outside the main search-topology ladder.

### Case-based reasoning supplies experience and candidate priors

Classical case-based reasoning is often described through:

- retrieve a similar case
- reuse or adapt its solution
- revise the proposed solution
- retain the new experience when appropriate

A case may contain:

- context
- action
- outcome
- failure
- applicability conditions
- lesson

Case retrieval can initialise or bias a search. It does not by itself imply a beam, tree, graph, or MCTS controller.

Risks include:

- surface similarity hiding different conditions
- obsolete cases
- copying without adaptation
- polluted case memory
- similarity metrics that ignore critical constraints

Every retrieved case should be checked against the current environment.

### Neuro-symbolic components strengthen representation and evaluation

Neuro-symbolic systems combine neural components with symbolic structures or procedures.

An agent workflow might use:

```text
Natural-language request
  -> LLM extracts variables and constraints
  -> solver or rule engine computes a valid result
  -> verifier checks the mapping and output
  -> LLM explains the result
```

This can strengthen:

- constraint satisfaction
- mathematical calculation
- planning
- rule enforcement
- consistency checking
- executable validation

Neuro-symbolic is not one search topology. A solver may be used as:

- candidate generator
- evaluator
- verifier
- planner
- constraint filter

The critical failure mode is translation error: a solver can precisely solve the wrong formalisation.

## The evaluator is the centre of the system

Candidate generation receives most of the attention because it is visible. Evaluation usually determines whether search actually improves quality.

A production evaluator should be layered.

### Layer 1: hard validity

- schema
- required fields
- permissions
- allowed tools
- syntactic validity
- budget
- invariant checks

### Layer 2: environment execution

- tests
- compiler
- database
- browser state
- simulator
- solver
- rule engine

### Layer 3: evidence and factual support

- source authority
- citation support
- date and version
- missing evidence
- conflict detection

### Layer 4: preference

- readability
- maintainability
- user preference
- strategic fit
- cost-quality trade-off

The order matters. Preference should not rescue an invalid or unsupported candidate.

### Avoid one model acting as sole generator, judge, and final approver

Using the same model everywhere can correlate errors.

Possible mitigations:

- deterministic checks
- environment feedback
- independent evaluator
- rubric-based pairwise comparison
- calibrated abstention
- human review for high-impact decisions
- disagreement analysis
- source-grounded verification

## Diversity and state canonicalisation must be designed

Ten generated candidates may represent one actual idea.

```text
Use Redis caching
Add a Redis cache layer
Route caching through Redis
```

These are not three meaningfully different strategies.

Useful controls:

- generate by distinct objective
- generate by distinct constraint
- require solution categories
- semantic deduplication
- canonical state keys
- category quotas
- novelty thresholds
- preserve one high-risk/high-upside candidate
- preserve one low-cost candidate

Diversity should be evaluated in the problem state, not only in wording.

## Search budgets and stopping rules

If each node creates four children and depth is five, full expansion may create:

```text
4^5 = 1,024 leaf nodes
```

Real cost also includes:

- generation
- evaluation
- tools
- state persistence
- deduplication
- backtracking
- environment reset
- final synthesis

Production limits may include:

| Limit | Purpose |
|---|---|
| Maximum candidates | Cap the total frontier |
| Maximum branching factor | Cap children per state |
| Maximum depth | Bound search horizon |
| Beam width | Bound active candidates per layer |
| Maximum nodes | Cap tree or graph size |
| Maximum tool calls | Bound environment interaction |
| Token budget | Bound model cost |
| Wall-clock limit | Bound latency |
| No-improvement limit | Stop stalled search |
| Accepted-solution threshold | Stop after a qualifying result |
| Cost-aware score | Penalise expensive candidates |
| Irreversible-action gate | Stop before unsafe execution |

The highest raw score is not always the best production choice.

```text
Candidate A:
quality 92
cost 5

Candidate B:
quality 93
cost 50
```

One extra quality point may not justify ten times the cost.

## Choosing a search strategy

Start with the cheapest mechanism that addresses the actual uncertainty.

| Task condition | Starting approach |
|---|---|
| One path is sufficient and externally verifiable | Single path plus verifier |
| One normalisable answer is unstable across samples | Self-consistency |
| Several complete alternatives need comparison | Generate-and-Rank |
| Partial candidates develop in layers | Beam search |
| Early choices matter and backtracking is useful | Tree of Thoughts or another tree search |
| Intermediate results must merge or be reused | Graph of Thoughts |
| Search acts in an environment with feedback | MCTS-style action search or LATS |
| Similar validated cases are available | Case retrieval as a prior |
| Formal constraints or exact procedures exist | Solver, rule engine, or neuro-symbolic component |

Before paying for multi-path search, ask:

1. Are there genuinely different candidates?
2. Can intermediate states be represented?
3. Can candidates be evaluated reliably?
4. Does an early choice affect later outcomes?
5. Is exploration safe and reversible?
6. Is the quality gain worth the cost?
7. Is there a clear stopping rule?

If the answer to evaluation is no, generating more branches usually magnifies uncertainty rather than resolving it.

![Figure 4-5 — Search Cost and Answer Quality](/images/the-atlas-of-agent-design-patterns-part-4/search-cost-answer-quality.png)

> **Figure 4-5 ｜ Search Cost and Answer Quality**  
> Moving from Single-path to Generate-and-Rank, Beam Search and Tree Search may lift quality, but cost also keeps climbing, and the later stages usually hit Diminishing Returns.


## Common anti-patterns

### Tree search for every task

A simple, verifiable transformation does not need a search frontier.

### Many candidates without a reliable evaluator

This is draft accumulation, not search.

### Sampling confused with Multi-Agent

Several generations from one model are not several agents.

### Self-consistency used as fact checking

Agreement does not establish truth.

### Beam search described as complete or backtracking by default

Pruned states are normally lost.

### ToT reduced to a decorative tree diagram

Without state representation, evaluation, and control, the tree has no operational meaning.

### GoT used when no merge or reuse is required

A graph adds dependency cost without adding value.

### LATS over irreversible production actions

Search must occur in a sandbox, simulation, or controlled reversible environment.

### Model-only scoring

The generator and evaluator reproduce the same error.

### No semantic deduplication

The frontier fills with paraphrases.

### No stopping rule

The system searches until the infrastructure, budget, or reader loses the will to live.

## Complete example: search for a code repair

The task is:

> Fix an API integration test that expected `200` and received `401`.

### Represent the state

```text
Known:
- endpoint exists
- request reached the server
- a test token was generated

Unknown:
- token validity
- audience
- scope
- authorisation header format
```

### Generate distinct candidate causes

```text
A. expired token
B. wrong audience
C. missing scope
D. malformed authorisation header
```

### Apply hard and evidence-based ranking

Use configuration, logs, and token claims to rank which branches are worth testing first.

### Expand branch B

```text
Inspect token claims
  -> audience does not match API configuration
```

### Execute a reversible candidate fix

```text
Update test configuration
  -> run target integration test
  -> pass
```

### Verify broadly

```text
Run authentication test suite
  -> pass

Run lint
  -> pass

Run build
  -> pass

Check unrelated files
  -> unchanged
```

### Stop

The completion contract is satisfied, so lower-value branches are not expanded.

The reliable part is not that the model imagined four root causes. It is that the important candidate was tested against the real environment, and the search stopped after the full acceptance criteria passed.

## Conclusion

The main mechanisms occupy different positions in a search system:

- **Single-path reasoning** keeps one trajectory.
- **Chain-of-Thought** makes one trajectory more explicit.
- **Self-consistency** samples complete paths and aggregates answers.
- **Generate-and-Rank** evaluates several complete alternatives.
- **Beam search** keeps a bounded layer-wise frontier.
- **Tree of Thoughts** searches over evaluated intermediate thought states.
- **Graph of Thoughts** combines, transforms, and reuses intermediate states.
- **MCTS** allocates repeated search effort using tree statistics.
- **LATS** applies MCTS-style search to language-agent actions and environment feedback.
- **Case-based reasoning** supplies reusable experience and candidate priors.
- **Neuro-symbolic components** supply formal representation, constraints, computation, or verification.

More branches do not automatically produce more truth.

A production search system needs:

```text
meaningful candidates
  + explicit state
  + reliable evaluation
  + bounded search control
  + safe execution
  + a stopping rule
```

The decisive question is not how many thoughts the model can generate.

It is:

> Which signal justifies expanding this path, and which condition proves that search should stop?

Part 5 examines what happens after an output or action fails verification:

> How should an agent retry, fall back, repair, replan, or learn from failure without creating another uncontrolled loop?

## References

- [Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903)
- [Wang et al., *Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171)
- [Yao et al., *Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601)
- [Besta et al., *Graph of Thoughts: Solving Elaborate Problems with Large Language Models*](https://arxiv.org/abs/2308.09687)
- [Zhou et al., *Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language Models*](https://arxiv.org/abs/2310.04406)
- [Browne et al., *A Survey of Monte Carlo Tree Search Methods*](https://doi.org/10.1109/TCIAIG.2012.2186810)
- [Vijayakumar et al., *Diverse Beam Search: Decoding Diverse Solutions from Neural Sequence Models*](https://arxiv.org/abs/1610.02424)
- [Aamodt and Plaza, *Case-Based Reasoning: Foundational Issues, Methodological Variations, and System Approaches*](https://doi.org/10.3233/AIC-1994-7104)
- [Susskind et al., *Neuro-Symbolic AI: An Emerging Class of AI Workloads and their Characterization*](https://arxiv.org/abs/2109.06133)

## Series

| Part | Topic |
|---:|---|
| 1 | Beyond ReAct: A Six-Dimensional Map of LLM Agent Architectures |
| 2 | Agent Execution Paths: Direct Calls, Pipelines, Routers, State Machines, and DAGs |
| 3 | ReAct, Plan-and-Execute, Adaptive Planning, and HTN |
| 4 | From Single-Path Reasoning to Trees, Graphs, MCTS, and LATS |
| 5 | Verification, Recovery, and Self-Correction |
| 6 | Multi-Agent Architectures |
| 7 | Agent Memory |
| 8 | Production Agent Architectures |
| 9 | How to Choose an Agent Architecture |
| 10 | Implementing Agent Patterns with Modern Frameworks |
