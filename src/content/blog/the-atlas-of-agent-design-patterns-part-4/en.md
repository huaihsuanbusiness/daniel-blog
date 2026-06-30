---
title: "The Atlas of Agent Design Patterns Part 4 ｜ From a Single Thought to Searching the Whole Solution Space: CoT, ToT, GoT and LATS"
description: "A complete comparison of Single-path Reasoning, Chain of Thought, Self-consistency, Generate-and-Rank, Beam Search, Tree of Thoughts, Graph of Thoughts, MCTS, LATS, Case-based Reasoning and Neuro-symbolic Reasoning."
date: 2026-06-30T20:05:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 4
---

The previous articles answered three different questions:

- how does a task move from start to finish?
- how does the Agent decide its next step?
- how do Planner, ReAct and Adaptive Planning cooperate?

This article enters the third dimension:

> When a problem has many possible solutions, how should the Agent explore?

Some tasks barely need any exploration.

For example:

- translate a sentence
- turn data into a fixed JSON shape
- answer a precise question from a single document
- call a calculator for a numeric value
- look up one known data field

Other tasks do not have a single obvious path:

- a software bug can have several root causes
- a system can be designed in several different architectures
- a research report can be built around several analytical frames
- a Browser Agent can take several operation routes
- a complex plan can be sequenced in several different ways
- a maths problem can be solved through several derivations

If the Agent commits to a single route at the very beginning and pushes all the way through, one early misjudgement can poison everything that comes after.

So the system can choose to:

1. generate several candidates
2. evaluate their quality
3. keep the more promising directions
4. drop the unreasonable branches
5. return to an earlier node when needed
6. merge information from different paths
7. adjust the search direction based on environment feedback
8. pick a final result before the budget runs out

That is the capability arc from Single-path Reasoning up to Self-consistency, Generate-and-Rank, Tree of Thoughts, Graph of Thoughts and LATS.

---

## Reasoning, planning and search are not the same thing

These three concepts often appear together, but they solve different problems.

## Reasoning: how do you get to the next conclusion?

Reasoning is about:

> Given what is known so far, what can be derived?

For example:

```text
All Enterprise plans support SSO
Plan X is an Enterprise plan

Therefore:
Plan X supports SSO
```

That is a derivation from information to conclusion.

## Planning: to reach a goal, what steps must be taken?

Planning is about:

> Which steps does the task need, and in what order?

For example:

```text
1. Find official pricing
2. Compare core features
3. Check deployment limits
4. Analyse the target audience
5. Write the recommendation
```

Plan-and-Execute, Adaptive Planning and HTN live mainly at this layer.

## Search: when several paths exist, which one should be explored?

Search is about:

> When there are several candidate solutions, which should be expanded, which should be dropped, and which should be kept?

For example:

```text
Fix A
Fix B
Fix C
  ↓
Evaluate and test
  ↓
Pick the most promising one
```

A single Agent can do all of these together:

- use a Planner to break the task into steps
- use ReAct to operate tools
- use Tree Search to explore several alternatives
- use a Verifier to judge which path passes

So planning and search are not a choice between one or the other.

The Planner decides which pieces of work exist; Search decides, when a problem has several possible solutions, which one is worth continuing.

---

## 1. Single-path Reasoning: walk a single line all the way

Single-path is the simplest form of reasoning.

```text
Problem
  ↓
Intermediate Step 1
  ↓
Intermediate Step 2
  ↓
Intermediate Step 3
  ↓
Answer
```

The system only keeps one main path.

Each step builds on the result of the previous one. It does not explore alternatives in parallel.

## When Single-path fits

- the question is simple
- the answer is clear
- the cost of error is low
- latency requirements are tight
- reliable external verification comes afterwards
- there is little value in exploring other candidates

For example, the Agent generates a piece of SQL and hands it to the database to execute.

Even if the generation only walks one path, as long as downstream you have:

- Read-only Policy
- SQL Parser
- Execution Test
- Result Validation

Single-path can still be very reliable.

## The limits of Single-path

### Early errors propagate all the way down

If the first intermediate judgement is wrong, every step after it may be built on a wrong premise.

### It does not actively compare alternatives

The first plausible-looking answer is not necessarily the best answer.

### It can be locked in by generation order

Once the model picks one direction, later content tends to keep walking in that direction instead of reopening other possibilities.

---

## 2. Chain of Thought: make one line more complete

Chain of Thought, abbreviated CoT, asks the model to generate a sequence of intermediate reasoning steps before producing the final answer.

```text
Problem
  ↓
Intermediate Reasoning
  ↓
Intermediate Reasoning
  ↓
Answer
```

The core of CoT is still one path.

It can make the reasoning more complete, but by itself it does not mean the system has:

- multi-candidate exploration
- candidate comparison
- branch pruning
- backtracking
- a search controller
- environment feedback

So:

> **CoT is an expanded chain of reasoning. It is not a search tree.**

## What CoT fits

- multi-step maths problems
- conditional reasoning
- logical structuring
- complex problem decomposition
- analysis that needs intermediate structure

## The limits of CoT

Steps that look thorough are not necessarily correct.

A longer chain of reasoning is not the same as higher quality.

In a Production system, instead of saving long stretches of free-form reasoning, it is better to save structured information that can be verified:

- which tool was used
- which rule was chosen
- which sources were read
- which conditions passed
- which conditions failed
- why the system switched to a Fallback
- what the Verifier decided

What the system actually needs is an auditable Decision Record, not the entire internal monologue dumped into the audit log.

---

## 3. Self-consistency: run several paths and vote on the answer

Single-path produces one path.

Self-consistency runs several independent generations on the same question:

```text
Path A → Answer 42
Path B → Answer 42
Path C → Answer 39
Path D → Answer 42
Path E → Answer 41
```

Then it picks the most consistent answer:

```text
Final Answer → 42
```

The core intuition is:

> If several different reasoning paths land on the same answer, that answer is more likely to be reliable.

## The basic flow of Self-consistency

```text
Problem
  ↓
Sample Multiple Paths
  ↓
Extract Final Answers
  ↓
Normalize Equivalent Answers
  ↓
Vote
  ↓
Final Answer
```

## Tasks that fit Self-consistency

- the answer is reasonably clear
- answers are easy to standardise
- they can be compared through voting
- several reasoning routes may lead to the same conclusion

For example:

- maths problems
- multiple choice
- short-answer reasoning
- classification
- fixed-scale scoring

## Tasks that do not fit

- open-ended writing
- architecture design
- several answers can all be reasonable
- hard to tell whether two answers are equivalent
- a small number of high-quality answers may beat many mediocre ones

## Majority is not truth

Suppose all five paths rely on the same wrong source. They can very consistently get the same wrong answer.

Self-consistency mainly reduces incidental instability in generation. It does not replace:

- fact checking
- tool execution
- source verification
- real testing

## What does Production Self-consistency need?

| Component | What it does |
|---|---|
| Sampling Count | How many paths to generate |
| Diversity Policy | Avoid candidates being too similar |
| Answer Normalization | Unify answer formats |
| Semantic Grouping | Merge semantically identical answers |
| Agreement Threshold | Minimum agreement required |
| Tie-breaking Rule | Handle tied votes |
| Abstain Condition | Refuse to answer when agreement is too low |
| Budget Limit | Control generation cost |

For example:

```text
Agreement ≥ 70%
  → Accept

Agreement < 70%
  → Send to Verifier
```

---

## Multi-candidate, multi-path search and Multi-Agent are three different things

This is one of the most important conceptual boundaries in this article.

Producing five answers does not mean the system uses five Agents.

A single Agent can also:

- generate five candidates
- build a search tree
- score the candidates
- backtrack and re-explore

In the other direction, multiple Agents can completely fail to explore different solutions and only run fixed pieces of work.

| Situation | Multi-candidate | Multi-path search | Multi-Agent |
|---|---:|---:|---:|
| Same model generates five answers | Yes | Not necessarily | No |
| Same Agent runs Tree Search | Yes | Yes | No |
| Three Workers each read a different document | Multiple outputs | Not necessarily | Yes |
| Three Agents propose different plans, then a Judge picks one | Yes | Yes | Yes |
| Supervisor dispatches fixed tasks to Workers | Not necessarily | Not necessarily | Yes |

Multi-Agent describes:

> How many independent roles or execution units cooperate.

Multi-path search describes:

> Whether the system explores several candidate solutions.

The two dimensions can overlap, but they are not the same thing.

![Figure 4-1 — Line, Tree, and Graph Reasoning Structures](/images/the-atlas-of-agent-design-patterns-part-4/line-tree-graph-reasoning-structures.png)

> **Figure 4-1 ｜ Line, Tree, and Graph Reasoning Structures**  
> A Line keeps one path. A Tree allows branching, pruning and backtracking. A Graph lets different paths merge again and reuse intermediate results. Multiple paths by themselves do not equal Multi-Agent.---

## 4. Generate-and-Rank: propose candidates, then rank them by criteria

Self-consistency mainly looks at which answer appears most often.

Generate-and-Rank first produces several candidates, then ranks them against quality criteria.

```text
Problem
  ↓
Generate Candidates
  ├─ Candidate A
  ├─ Candidate B
  ├─ Candidate C
  └─ Candidate D
  ↓
Evaluate
  ↓
Rank
  ↓
Select
```

## Tasks that fit Generate-and-Rank

- architecture design
- copy selection
- query rewriting
- code repair
- SQL generation
- tool selection
- plan generation
- RAG answer candidates
- UI or product option comparison

## Self-consistency vs Generate-and-Rank

| Comparison axis | Self-consistency | Generate-and-Rank |
|---|---|---|
| Core method | Voting | Scoring and ranking |
| Output type | Clear answer | Several reasonable alternatives |
| Does it need a Ranker? | Not necessarily | Yes |
| Can it pick a few strong candidates? | Hard | Yes |
| Main risk | Majority shares the same mistake | Ranker makes a bad judgement |

## What can a Ranker do?

### Rule-based Ranker

Drop candidates by hard rules:

- is the JSON valid?
- does it include citations?
- is the SQL read-only?
- does it have the required fields?
- is it over budget?

### Model-based Ranker

Have the model compare candidates against a rubric.

### External Evaluator

Validate against the real environment:

- unit tests
- SQL execution
- compiler
- browser result
- retrieval metrics
- rule engine
- simulator

### Hybrid Ranker

Use hard rules to drop the unfit ones first, then let the model compare what remains.

That is usually more reliable than asking the model to "pick the best one" directly.

![Figure 4-2 — Generate-and-Rank](/images/the-atlas-of-agent-design-patterns-part-4/generate-and-rank.png)

> **Figure 4-2 ｜ Generate-and-Rank**  
> The Candidate Generator produces several candidates, which then pass through Hard Validation, External Evaluation and Ranking before the system picks the best one. The point is not just generating more candidates; it is having reliable evaluation criteria.

---

## What core components does a search system need?

Once the system stops comparing only at the final answer and starts expanding and dropping candidates in the middle, it has moved close to a real Search System.

A multi-path search system usually has five core components.

## 1. Candidate Generator

Produces:

- multiple answers
- multiple next-step actions
- multiple sub-plans
- multiple code-patch candidates
- multiple queries
- multiple intermediate reasoning states

## 2. State Representation

Describes where each path is.

For example:

```text
Completed:
- Found official pricing
- Found deployment documentation

Missing:
- Enterprise limits
- Regional availability
```

If the State is just a long blob of unstructured text, it becomes hard for the system to tell where two candidates actually differ.

## 3. Evaluator

Evaluates the candidates on:

- correctness
- completeness
- executability
- cost
- risk
- source quality
- constraint satisfaction
- distance from the goal

## 4. Search Controller

Decides:

- which candidate to expand next
- how many candidates to keep
- when to prune
- when to backtrack
- whether to merge branches
- whether to keep going deeper

## 5. Stopping Rule

Decides when to stop:

- a solution that passes every test has been found
- the minimum quality threshold is met
- search time is exhausted
- Token Budget is exhausted
- the maximum node count has been explored
- the best score has not improved for a long time
- every remaining candidate is infeasible

Without a reliable Evaluator, a multi-path system is just generating more text.

Without a Stopping Rule, the search tree will keep growing until the Token bill starts doing photosynthesis.

---

## 5. Beam Search: keep the top K candidates at every layer

Fully expanding every branch is usually too expensive.

Beam Search works like this:

> At every layer, generate several candidates, then keep only the top K by score.

Assume Beam Width is 2:

```text
                    Start
              ┌──────┼──────┐
             A       B       C
             8       7       3
              ↓
           Keep A and B
          ┌──┴──┐  ┌──┴──┐
         A1    A2 B1     B2
          6     9  8      4
              ↓
          Keep A2 and B1
```

## Core parameters

### Beam Width

How many candidates to keep at every layer.

A smaller K means:

- lower cost
- narrower search scope
- higher chance of dropping an early-low-score, later-high-value candidate

A larger K means:

- broader exploration
- higher cost
- gradually close to full Tree Search

### Scoring Function

How candidates are scored.

### Maximum Depth

How deep the search can go.

### Termination Condition

When the search stops.

## Where Beam Search sits

Beam Search can be seen as:

> A constrained search between Generate-and-Rank and a full Tree Search.

Generate-and-Rank usually ranks only after the full candidate set is generated.

Beam Search evaluates and drops candidates at every layer.

## Main risks

### Local high score is not final best

A candidate may look mediocre early and turn out to lead to the best answer later.

Beam Search may cut it too early.

### Lack of candidate diversity

The top K may just be different phrasings of the same solution.

You can add:

- Semantic Deduplication
- Diversity Penalty
- Category Quota
- Novelty Score---

## 6. Tree of Thoughts: branching, evaluating, pruning, and backtracking

Tree of Thoughts, abbreviated ToT, represents the problem-solving process as a tree.

```text
                     Start
                ┌─────┼─────┐
              Thought A   Thought B   Thought C
               ┌──┴──┐      │        ┌──┴──┐
              A1    A2      B1       C1    C2
```

Each Thought is not a single Token. It is a meaningful intermediate state, for example:

- a sub-goal
- a partial solution
- a candidate plan
- a maths intermediate result
- a code change direction
- a set of completed operations

## The basic flow of ToT

```text
Current State
  ↓
Generate Candidate Thoughts
  ↓
Evaluate Candidates
  ↓
Select Promising Branches
  ↓
Expand
  ↓
Backtrack if Necessary
```

## CoT vs ToT

| Capability | Chain of Thought | Tree of Thoughts |
|---|---:|---:|
| Intermediate reasoning steps | Yes | Yes |
| Keep multiple paths in parallel | No | Yes |
| Evaluate intermediate states | Usually no | Yes |
| Prune | No | Yes |
| Backtrack | No | Yes |
| Search controller | None | Yes |
| Candidate state management | None | Yes |

CoT is a chain.

ToT is a search system made of:

- Candidate Generator
- State Representation
- Evaluator
- Search Controller
- Stopping Rule

## What tasks fit ToT?

- early choices affect later steps
- several intermediate options exist
- partial solutions can be evaluated
- backtracking is needed
- the search space can be bounded
- the cost of a single-path failure is high

For example:

- puzzles
- combinatorial maths problems
- programming
- scheduling
- complex decision-making
- article structure planning
- multi-step solution design

## How big should a Thought be?

A Thought that is too small:

```text
Every Token is its own node
```

The search space explodes immediately.

A Thought that is too large:

```text
The entire final answer is one node
```

The system collapses back into Generate-and-Rank.

A good Thought should:

- be independently evaluable
- matter for the next decision
- not make the tree too deep
- be storable and comparable

For a Coding Agent, a candidate Thought could be:

- change API retry logic
- fix the database transaction
- add input schema validation

Not "every line of code is its own node".

## How does ToT evaluate candidates?

### Value Score

Give each candidate a score directly.

### Pairwise Comparison

Compare two candidates and pick the better one.

### Classification

Bucket each candidate as:

- Promising
- Uncertain
- Impossible

### External Testing

Use the real environment:

- compile the program
- run unit tests
- check constraints
- execute the SQL
- inspect the browser state

External testing is usually more reliable than the model evaluating itself.

## Main risks of ToT

### The search tree balloons

If each node generates 5 candidates and depth is 6:

```text
5⁶ = 15,625 leaf nodes
```

So the system has to cap:

- Branching Factor
- Maximum Depth
- Beam Width
- Total Node Count
- Token Budget
- Tool Budget

### The model is both player and referee

The same model generating and evaluating its own answers can amplify the same bias.

### States are hard to deduplicate

Different text may refer to the same actual state.

It needs:

- State Canonicalization
- Semantic Deduplication
- Duplicate Branch Detection

![Figure 4-3 — Tree Search: Branching, Pruning, and Backtracking](/images/the-atlas-of-agent-design-patterns-part-4/tree-search-pruning-backtracking.png)

> **Figure 4-3 ｜ Tree Search: Branching, Pruning, and Backtracking**  
> The search tree generates candidate branches from the Root; the Evaluator scores intermediate states; low-value branches get Pruned, failed paths get Backtracked, and only the solutions that pass verification survive.

---

## 7. Graph of Thoughts: thoughts not only fork, they can also merge

Tree of Thoughts usually assumes each node has one main parent.

Some problems are not pure trees.

For example, a competitive analysis may have three research paths:

```text
Pricing Analysis
Feature Analysis
Customer Analysis
```

The final product positioning conclusion needs to integrate all three paths together.

Graph of Thoughts, abbreviated GoT, allows:

- a node to depend on several upstream nodes
- different lines of thought to merge again
- intermediate results to be reused
- several candidates to be aggregated
- a result to be re-transformed or refined

```text
Pricing ─────┐
             ├→ Positioning Analysis
Features ────┤
             │
Customers ───┘
```

## Tree vs Graph

| Comparison axis | Tree of Thoughts | Graph of Thoughts |
|---|---|---|
| Node parent | Usually one | Can be several |
| Branch merging | Less natural | Core capability |
| Reuse of intermediate results | Weaker | Strong |
| Main structure | Hierarchical tree | Directed graph |
| Fits tasks that | Look for one better path | Integrate complementary paths |
| Management difficulty | High | Higher |

## Common GoT operations

### Generate

Produce several candidates from a node.

### Aggregate

Combine several nodes into a new result.

### Refine

Improve an existing node based on feedback.

### Reduce

Compress several long results into a shorter representation.

### Transform

Convert information into another format or analysis angle.

## Tasks that fit GoT

- multi-source research
- cross-document integration
- competitive analysis
- requirements analysis
- multi-stakeholder synthesis
- long-form reports
- multi-stage content generation
- work that needs to reuse intermediate results

## Main risks of GoT

### Dependencies are more complex

The system has to know:

- which node depends on which results
- when upstream content changes, which nodes become invalid
- which data has already been aggregated
- which branches conflict

### Merging can dilute important information

An Aggregator may squash a few but important points.

### Intermediate data is easy to duplicate

Several branches may quote the same source, so the result looks like multiple pieces of evidence but is really the same source wrapped several times.

### Cycles need to be bounded

If nodes can modify each other, the system has to set:

- Cycle Limit
- Versioning
- Convergence Rule
- Update Policy---

## 8. MCTS and LATS: turn Agent actions into a search problem

Tree of Thoughts mainly handles intermediate Thoughts.

A real Agent does not only reason inside text. It also:

- calls tools
- modifies code
- runs tests
- operates a browser
- queries databases
- observes environment state

At that point, what is being searched is no longer just "ideas", but:

> A sequence of actions that can actually be executed in the environment.

## The four core phases of MCTS

Monte Carlo Tree Search can usually be summarised into four looping phases.

### 1. Selection

Starting from the Root, pick a path that is worth continuing.

The system usually balances:

- branches that are known to perform well
- branches that have not been explored enough

### 2. Expansion

Add one or more candidate actions under the chosen node.

### 3. Simulation or Evaluation

Simulate, execute, or evaluate the likely result of this branch.

In an LLM Agent, this step does not have to be a full random simulation. It can also be:

- the model's Value Estimate
- a tool execution
- a test result
- an environment Observation
- a Verifier Score

### 4. Backpropagation

Propagate the resulting score back up along the path and update the upstream value estimates.

```text
Selection
  ↓
Expansion
  ↓
Simulation / Evaluation
  ↓
Backpropagation
  ↓
Next Search Iteration
```

## What does LATS add?

Language Agent Tree Search, abbreviated LATS, puts the language Agent's abilities into the tree search structure.

A search node may carry:

```text
Environment State
+ Action History
+ Observation
+ Reflection
+ Value Estimate
```

The basic flow can be understood as:

```text
Current State
  ↓
Generate Candidate Actions
  ↓
Select an Action
  ↓
Act in Environment
  ↓
Observe Result
  ↓
Evaluate and Reflect
  ↓
Update Search Tree
  ↓
Expand or Backtrack
```

## ToT vs LATS

| Comparison axis | Tree of Thoughts | LATS |
|---|---|---|
| Main search target | Thought | Action and Environment State |
| Does it need tools? | Not necessarily | Usually yes |
| Does it rely on external feedback? | Optional | Core capability |
| Node content | Intermediate reasoning state | Actions, observations, reflection, value |
| Fits scenarios | Problem solving and option exploration | Coding, browser, interactive environments |
| Evaluation method | Model or rules | Environment feedback + model evaluation |

## A Coding Agent example

Goal:

> Fix an integration test failure.

Candidate directions:

```text
A. Modify input validation
B. Modify the database query
C. Adjust the authentication setting
```

Explore branch A:

```text
Apply Patch
  ↓
Run Tests
  ↓
3 Tests Still Fail
```

Explore branch C:

```text
Apply Patch
  ↓
Run Tests
  ↓
Target Tests Pass
```

The actual test results become the search feedback.

That is more reliable than asking the model to judge "which plan sounds more reasonable".

## A Browser Agent example

The goal is to complete an operation on a website.

Candidate actions:

- click the search box
- open the filter
- go back to the previous page
- modify the URL
- scroll to find a button

After every action, the Agent gets a new screen or DOM State, then judges whether it has moved closer to the goal.

## Main limits of LATS

### Real execution cost is high

Each branch may require:

- an API call
- running tests
- building a Sandbox
- operating a browser
- saving and restoring state

### Some actions are irreversible

You cannot, just to explore five paths, actually:

- send five emails
- create five payments
- delete data five times
- modify Production five times

Irreversible actions must stay inside:

- Sandbox
- Mock Environment
- Temporary Branch
- Test Database
- Human Approval Gate

### The Value Function can be gamed

If a Coding Agent's only objective is "make the tests pass", it may just delete the tests.

So the score cannot only reward short-term success. It also has to account for:

- whether constraints are respected
- whether side effects were introduced
- whether the code is maintainable
- whether other functionality is broken
- whether the cost is within budget
- whether the full test suite still passes

![Figure 4-4 — MCTS and LATS Search Loop](/images/the-atlas-of-agent-design-patterns-part-4/mcts-lats-search-loop.png)

> **Figure 4-4 ｜ MCTS and LATS Search Loop**  
> The Search Controller does Selection and Expansion. The Agent acts in the Sandbox Environment, gathers Observation, Test Result, Reflection and Value, and Backpropagates them into the search tree.

---

## 9. Case-based Reasoning: start from similar past cases

Not every problem has to be searched from scratch.

The basic flow of Case-based Reasoning is:

```text
New Problem
  ↓
Retrieve Similar Cases
  ↓
Compare Conditions
  ↓
Adapt Previous Solution
  ↓
Verify in Current Context
```

## How is a case different from general knowledge?

General knowledge:

```text
API 401 usually relates to authentication.
```

A case:

```text
In Project X, the 401 was caused by a wrong Token Audience.
After fixing the OAuth Configuration, the service recovered.
```

A case usually contains:

- the problem situation
- the action taken at the time
- the execution result
- the failure reason
- the applicable conditions
- the lesson learned afterwards

## Tasks that fit

- customer service
- fault diagnosis
- IT Operations
- code bug fixing
- repair work
- legal case research
- enterprise SOPs
- recurring business problems

## Main risks

### Surface similarity, different conditions

The same error message does not always mean the same root cause.

### Old cases may be out of date

Product versions, APIs, regulations and organisational processes may have changed.

### Direct copy without adaptation

The correct flow is:

```text
Retrieve
  ↓
Compare Conditions
  ↓
Adapt
  ↓
Verify
```

Not "find the most similar case and apply it as is".

---

## 10. Neuro-symbolic Reasoning: let the LLM cooperate with rules and Solvers

The LLM is good at:

- understanding natural language
- handling fuzzy descriptions
- generating candidates
- summarising unstructured information
- explaining results

A symbolic system is good at:

- precise rules
- mathematical computation
- logical constraints
- reproducible execution
- consistency checking
- path search

A Neuro-symbolic system combines the two:

```text
Natural-language Problem
  ↓
LLM Parses Requirements
  ↓
Structured Representation
  ↓
Rule Engine / Solver / Program
  ↓
Verified Result
  ↓
LLM Explains Result
```

## Common combinations

- LLM + SQL
- LLM + Python
- LLM + Constraint Solver
- LLM + Rule Engine
- LLM + Knowledge Graph
- LLM + Planning Engine

## Example: meeting scheduling

The user asks:

> Schedule a meeting for five people. Each person can only attend within specific time windows, and the meeting room cannot be double-booked.

The LLM can:

1. parse the people, the time windows and the constraints
2. convert the constraints into structured Constraints
3. hand them to a Solver
4. turn the result back into natural language

That is usually more reliable than asking the model to guess a schedule in plain text.

## The biggest risk

The Solver can run the rules precisely.

But if the LLM translates the constraints incorrectly at the start, the Solver will simply:

> Precisely solve the wrong problem.

So every layer has to verify:

- whether the natural language was parsed correctly
- whether the constraints are complete
- whether the Solver succeeded
- whether the final explanation matches the Solver result---

## The Evaluator is the real foundation of a search system

The most overestimated part of a multi-path system is the Candidate Generator.

The actually hard part is usually:

> How does the system know which candidate is better?

If the Generator is strong but the Evaluator is weak, the good answer may have already been generated and the system still drops it.

The Evaluator has four layers.

## Layer 1: hard format and rules

- is the JSON valid?
- do the required fields exist?
- is the SQL read-only?
- is it over budget?
- does it use allowed tools?

## Layer 2: executable tests

- does the program compile?
- do the tests pass?
- is the query runnable?
- does the API return the expected result?
- are the constraints satisfied?

## Layer 3: factual and source verification

- is the claim supported by a source?
- do the citations match?
- is the information out of date?
- is a required condition missing?

## Layer 4: preference and quality ranking

- readability
- maintainability
- completeness
- style
- business fit

A reasonable order is:

```text
Hard Validation
  ↓
External Tests
  ↓
Factual Verification
  ↓
Preference Ranking
```

Do not let a piece of code with beautiful prose but failing tests win on style.

---

## Diversity also needs to be designed

Generating ten candidates does not mean the system has actually explored ten directions.

For example:

```text
Plan A: use Redis cache
Plan B: add a Redis cache layer
Plan C: route caching through Redis
```

These three candidates are just restating the same plan.

## Ways to increase real diversity

### Use different evaluation angles

- Performance
- Security
- Cost
- Maintainability
- User Experience

### Use different constraints

- Lowest Cost
- Lowest Latency
- Simplest Implementation
- Highest Reliability
- Minimum Change

### Use different solution categories

- Rule-based
- Retrieval-based
- Database-based
- Event-driven
- Agent-based

### Semantic Deduplication

Merge candidates that are essentially the same.

### Category Quota

Require that at least:

- one lowest-cost plan survives
- one highest-reliability plan survives
- one smallest-change plan survives
- one long-term architecture plan survives

This is usually more controllable than simply raising the Temperature.

---

## Which tasks are worth paying the multi-path search cost for?

Multi-path methods should not be the default.

You can first ask the following questions.

## 1. Does the problem really have several important candidates?

If the answer is obvious, Single-path may already be enough.

## 2. Will early choices affect later steps?

If picking the wrong first step kills the whole path, Tree Search brings more value.

## 3. Can intermediate states be evaluated?

If even partial solutions cannot be scored, the search controller does not know which path to keep.

## 4. Can the final result be verified externally?

For example:

- Unit tests
- Compiler
- Database
- Browser State
- Rule Engine
- Citation Check

The more reliable the external signal, the more valuable the search.

## 5. Is the exploration action safe?

Irreversible operations do not suit free exploration.

## 6. Is the extra quality worth the extra cost?

Search usually shows diminishing returns:

- the first few candidates may quickly raise quality
- further exploration keeps adding cost
- the quality improvement flattens out

![Figure 4-5 — Search Cost and Answer Quality](/images/the-atlas-of-agent-design-patterns-part-4/search-cost-answer-quality.png)

> **Figure 4-5 ｜ Search Cost and Answer Quality**  
> Moving from Single-path to Generate-and-Rank, Beam Search and Tree Search may lift quality, but cost also keeps climbing, and the later stages usually hit Diminishing Returns.

---

## How to control search cost?

Suppose each node produces 4 candidates and the search depth is 5.

A full expansion may produce:

```text
4⁵ = 1,024 leaf nodes
```

That does not even include:

- candidate generation cost
- evaluation cost
- tool call cost
- Context storage
- State Persistence
- deduplication
- backtracking
- final integration

A Production system usually sets:

| Limit | What it does |
|---|---|
| Max Candidates | Caps total candidates |
| Max Branching Factor | Caps children per node |
| Max Depth | Caps search depth |
| Beam Width | Caps how many survive per layer |
| Max Tool Calls | Caps tool usage |
| Max Tokens | Controls model cost |
| Max Wall Time | Caps total runtime |
| Early Stop | Stops as soon as a qualifying solution is found |
| No-improvement Limit | Stops after several rounds without improvement |
| Cost-aware Score | Adds cost into the score |

The best candidate is not always the one with the highest quality score.

A Production system may pick:

```text
Quality: 92
Cost: 5
```

Instead of:

```text
Quality: 93
Cost: 50
```

One extra point is rarely worth ten times the cost.

---

## Full comparison of search strategies

| Mode | Candidate count | Mid-search evaluation | Pruning | Backtracking | Branch merging | External feedback | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|
| Single-path | 1 | Low | No | No | No | Optional | Low |
| Self-consistency | Multiple full answers | Usually no | No | No | Vote-based aggregation | Usually no | Medium–High |
| Generate-and-Rank | Multiple full candidates | Final evaluation | Can drop | Usually no | Usually picks one | Optional | Medium–High |
| Beam Search | K per layer | Yes | Yes | Limited | Usually no | Optional | High |
| Tree of Thoughts | Multi-branch | Yes | Yes | Yes | Usually picks a path | Optional | High |
| Graph of Thoughts | Graph-shaped candidates | Yes | Yes | Designed in | Yes | Optional | Very high |
| MCTS / LATS | Action search tree | Yes | Yes | Yes | Usually picks a path | Yes | Very high |
| Case-based Reasoning | Similar cases | Case filtering | Can drop | Not necessarily | Can integrate | Verifies current context | Medium |
| Neuro-symbolic | Structured candidates | Rules or Solver | Yes | Depends on system | Depends on system | Precise execution results | Medium–High |

---

## Does it need a Ranker, backtracking and high cost?

| Mode | Needs a Ranker? | Can backtrack? | Needs external tools? | Relative cost |
|---|---:|---:|---:|---:|
| Single-path | No | No | No | Low |
| Self-consistency | Needs an aggregator | No | No | Medium |
| Generate-and-Rank | Yes | No | Optional | Medium |
| Beam Search | Yes | Limited | Optional | High |
| Tree of Thoughts | Yes | Yes | Optional | High |
| Graph of Thoughts | Yes | Designed in | Optional | Very high |
| LATS | Yes | Yes | Usually required | Very high |
| Case-based Reasoning | Needs case similarity | Not necessarily | Usually needs retrieval | Medium |
| Neuro-symbolic | Needs rules or a Solver | Depends on system | Yes | Medium–High |

---

## Task type vs strategy selection

| Task characteristic | Suggested approach |
|---|---|
| Simple and externally verifiable | Single-path + Verifier |
| Clear answer, but single generation is unstable | Self-consistency |
| Several complete options need to be compared | Generate-and-Rank |
| Each stage has many candidates | Beam Search |
| Need branching, pruning and backtracking | Tree of Thoughts |
| Multiple paths need to be merged | Graph of Thoughts |
| Need to act in an environment and get feedback | MCTS / LATS |
| Large pool of reusable past cases | Case-based Reasoning |
| Hard rules or mathematical constraints exist | Neuro-symbolic Reasoning |

---

## Common anti-patterns

## Anti-pattern 1: use Tree of Thoughts for everything

Building a search tree for a simple task only adds cost and latency.

## Anti-pattern 2: generate many candidates with no reliable Evaluator

That is not search. It is piling up drafts.

## Anti-pattern 3: treat multiple generations as Multi-Agent

Multiple Samples are not the same as multiple Agents.

## Anti-pattern 4: the model generates, scores and signs off all by itself

The same bias may run through every stage.

## Anti-pattern 5: voting as fact verification

A majority can still share the same wrong source.

## Anti-pattern 6: no semantic deduplication

The search tree fills up with nodes that mean the same thing but are phrased differently.

## Anti-pattern 7: no State Canonicalization

Two paths have already reached the same state but the system still treats them as different branches.

## Anti-pattern 8: only look at quality, ignore cost

The search cost goes up tenfold while the quality barely moves.

## Anti-pattern 9: free exploration over irreversible actions

You cannot really send five emails just to compare strategies.

## Anti-pattern 10: search with no stopping condition

As long as the Agent can still generate new candidates, it keeps exploring.

---

## A complete example: how a Coding Agent searches for a fix

The task:

> Fix an API integration test failure.

The error:

```text
Expected 200
Received 401
```

## Step 1: build the current state

```text
Known:
- Endpoint exists
- Request reached the server
- Test token was generated

Unknown:
- Token validity
- Audience
- Scope
- Header format
```

## Step 2: generate candidate root causes

```text
A. Token expired
B. Wrong audience
C. Missing scope
D. Authorization header malformed
```

## Step 3: initial ranking

Based on configuration and error logs:

```text
B: 8.2
C: 7.8
A: 5.1
D: 4.9
```

## Step 4: expand the candidate branches

Explore B:

```text
Inspect token claims
  ↓
Audience does not match API configuration
```

Explore C:

```text
Inspect scope
  ↓
Required scope is already present
```

## Step 5: apply the fix and run external tests

```text
Fix Audience Configuration
  ↓
Run Target Integration Test
  ↓
Pass
```

## Step 6: widen the verification

```text
Run Authentication Test Suite
  ↓
Pass

Run Lint
  ↓
Pass

Run Build
  ↓
Pass
```

## Step 7: stop the search

A solution that meets every completion condition has been found, so the lower-scoring branches are not expanded further.

This flow uses:

- Candidate Generation
- Generate-and-Rank
- Tree Expansion
- Environment Feedback
- Generate-and-Test
- Early Stopping

What actually makes it reliable is not that the Agent thought about many paths.

It is that:

> Every important path has been checked against the real environment.

---

## Conclusion of this article

The way an Agent explores solutions ranges from a single line all the way to a full search system.

- **Single-path Reasoning**: keep only one main path
- **Chain of Thought**: let a single path carry more intermediate steps
- **Self-consistency**: generate many times and aggregate by agreement
- **Generate-and-Rank**: produce several candidates, then rank them by criteria
- **Beam Search**: keep the top K candidates at every layer
- **Tree of Thoughts**: branch, evaluate, prune and backtrack
- **Graph of Thoughts**: let different paths merge and reuse intermediate results
- **MCTS / LATS**: combine Agent actions, environment feedback and tree search
- **Case-based Reasoning**: start from similar past cases
- **Neuro-symbolic Reasoning**: let the LLM cooperate with rules, programs and Solvers

A more complex search does not automatically mean a better result.

Multi-path methods are only worth the cost when all of the following hold:

1. the problem really has several important candidates
2. early choices affect later steps
3. intermediate states can be evaluated
4. search cost is bounded
5. the final result can be verified externally
6. exploration does not create irreversible side effects

The most important question is not:

> How many lines of thought can the Agent generate?

It is:

> How does it know which path is worth continuing, and when should it stop?

The next article enters the fourth dimension:

> How does the Agent notice that it has made a mistake?

Part 5 will fully compare Retry, Fallback, Self-Refine, Critic, Verifier, Generate-and-Test, Replanning and Reflexion, and explain why real verification cannot rely on the model saying "I double-checked it".