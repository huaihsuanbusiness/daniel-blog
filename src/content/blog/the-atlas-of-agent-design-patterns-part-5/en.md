---
title: "The Atlas of Agent Design Patterns Part 5 | Verification, Recovery, and Self-Correction"
description: "A production-focused guide to retry, parameter repair, fallback, Self-Refine, critics, verifiers, Generate-and-Test, replanning, Reflexion, human approval, idempotency, and bounded recovery."
date: 2026-06-30T20:18:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 5
---


Imagine a coding agent receives this task:

> Fix the failing integration test for the login API.

It changes the code and reports:

> Fixed. I checked it again, and it should work now.

That sentence is not evidence.

The agent may not have:

- run the failing test
- run the related test suite
- checked the build
- verified that the test was not weakened or deleted
- inspected unrelated file changes
- compared the result with the original acceptance criteria

It may have only reread its own output and produced a second subjective judgement.

This is one of the most dangerous false-green signals in an agent system:

> A model saying that it verified an output is not the same as the system producing verifiable evidence.

Generation, diagnosis, acceptance, recovery, and learning are different responsibilities.

When a task fails, the system must decide:

- Is the failure transient?
- Is the action safe to repeat?
- Can the current step be repaired?
- Should the implementation change?
- Is the remaining plan invalid?
- Is human authorisation required?
- Should the system stop?
- Is the failure useful enough to inform a future attempt?

This article develops a production model for answering those questions without creating an infinite repair loop.

## Five separate responsibilities

A reliable recovery architecture separates five concerns.

### Detection

What observable signal indicates that something is wrong?

Examples include:

- schema failure
- non-zero exit code
- failed test
- missing citation
- stale data
- policy rejection
- unresolved requirement
- user rejection

### Diagnosis

What caused the failure, and what scope does it affect?

Examples include:

- transient infrastructure fault
- invalid parameter
- weak output
- wrong data source
- incorrect plan
- insufficient permission
- unsupported task

### Acceptance

Does the result satisfy an explicit contract?

Acceptance belongs to a verifier, rule engine, test system, policy gate, or authorised human, not to the generator that produced the result.

### Recovery

What is the smallest justified change?

- retry
- change parameters
- use a fallback
- repair the artefact
- replan
- escalate
- stop

### Learning

Should a verified failure analysis influence future attempts?

This may involve a short-lived reflection, episodic memory, or a separately governed long-term lesson.

Keeping these responsibilities separate prevents one model from writing the test, grading its own work, changing the requirements, and awarding itself a certificate.

## Verification starts with an acceptance contract

A verifier cannot be reliable when “good enough” has never been defined.

A contract may include:

- required fields
- output schema
- factual-source requirements
- policy constraints
- expected side effects
- executable tests
- latency or cost limits
- prohibited changes
- terminal outcomes
- human approval requirements

For a coding task:

```text
Acceptance contract:
- target test passes
- related authentication tests pass
- full relevant suite passes
- lint passes
- build succeeds
- protected tests are unchanged
- no unrelated files are modified
```

For a research task:

```text
Acceptance contract:
- every material claim has an approved source
- each comparison field is completed or marked unavailable
- publication date and product version are recorded
- conflicting evidence is disclosed
- unsupported estimates are not presented as facts
```

The verification method should match the claim being tested.

| Question | Strong signal |
|---|---|
| Is the format valid? | Schema or parser |
| Does the program behave correctly? | Test or execution |
| Is the database action permitted? | Policy and permission check |
| Is the factual claim supported? | Source and citation verification |
| Is the output complete? | Contract-based verifier |
| Is the business decision acceptable? | Authorised human judgement |
| Is the action safe to repeat? | Idempotency and reconciliation |

There is no universal verification ladder. A human is not automatically better than a schema for checking JSON, and a model critic is not better than a compiler for checking code.

<!-- Figure 5-1 insertion point -->

![Figure 5-1 — Match the Verification Signal to the Claim](/images/the-atlas-of-agent-design-patterns-part-5/verification-reliability-ladder.png)

> **Figure 5-1｜Match the Verification Signal to the Claim**  
> Different questions require different evidence. Structure, execution, semantics, and policy each belong to the right tool. No single ladder replaces every verification.

## Self-review is useful, but it is not independent verification

Self-review may catch:

- missing sections
- inconsistent terminology
- awkward structure
- obvious contradictions
- formatting problems
- violations of a supplied rubric

It is weaker when the original error comes from:

- missing knowledge
- a shared false premise
- an unavailable source
- an unexecuted artefact
- an incorrect environment model
- an ambiguous acceptance standard

The same model, context, and assumptions may reproduce the same mistake.

Research on self-critique is mixed across tasks. Self-Refine shows that iterative self-feedback can improve outputs in several settings. Other work on planning finds that model-based self-verification can produce false positives and perform substantially worse than sound external verification.

The production rule is:

> Use self-review to improve a candidate; do not treat it as proof when stronger observable evidence exists.

## Failure classification comes before recovery

Sending every failure into the same retry loop is an architectural error.

A useful taxonomy is:

| Failure class | Typical signal |
|---|---|
| Transient | timeout, 429, 502, temporary lock |
| Ambiguous side effect | response lost after a write request |
| Invalid input | missing field, malformed request |
| Parameter mismatch | query too broad, batch too large |
| Method failure | primary API or model unavailable |
| Artefact failure | test, build, parser, or execution failed |
| Evidence failure | unsupported or stale claim |
| Quality failure | incomplete, unclear, contradictory output |
| Plan failure | invalid assumption, dependency, or goal interpretation |
| Policy failure | action denied or approval required |
| Unsupported | data, capability, or authority does not exist |

Classification should record:

- failure code
- evidence
- retryability
- side-effect status
- affected scope
- recommended next action
- confidence
- terminal status if no recovery is justified

## Retry: repeat only when the same action may succeed later

Retry means:

```text
same step
+ same method
+ same parameters
```

It fits transient failures such as:

- temporary service unavailability
- connection reset
- rate limiting
- short-lived lock
- retryable server fault

A production retry policy needs:

- retryable and non-retryable error classes
- maximum attempts
- timeout
- exponential or bounded backoff
- jitter
- cancellation
- trace and metrics
- terminal outcome

Example:

```text
Attempt 1 -> 503
Wait with jitter

Attempt 2 -> 503
Wait longer

Attempt 3 -> 503
Stop retrying
Route to fallback or failure
```

### Retry is dangerous around side effects

Suppose a payment request times out. The payment may have succeeded even though the response was lost.

Repeating the request blindly may charge twice.

Safe options include:

- use an idempotency key
- query the operation status
- reconcile by request identifier
- use an at-most-once workflow step
- require manual resolution when the outcome is unknowable

Idempotency means repeated delivery of the same intended request does not create additional side effects. It is a system contract, not a prompt instruction.

### Do not retry permanent failures

Examples:

- invalid credentials
- policy denial
- unsupported operation
- missing required data
- deterministic failure from unchanged input
- permission denied
- validation error
- confirmed completed side effect with lost acknowledgement

## Parameter repair: keep the step, change a justified input

A parameter repair changes execution details while preserving the same objective and general method.

Examples:

```text
Search query too narrow
 -> expand approved synonyms

Batch too large
 -> reduce batch size

Parser input malformed
 -> repair the input and rerun the same parser
```

This is sometimes called parameterised retry, but the important distinction is that it is not the same request.

Every parameter change should record:

- previous input
- changed parameter
- failure signal
- hypothesis
- expected improvement
- result
- tried combinations

Randomly changing prompts, timeouts, and temperatures creates a parameter carousel, not a recovery policy.

## Fallback: preserve the contract through another implementation

Fallback changes the method, service, model, tool, or source while trying to satisfy the same step contract.

```text
Primary method
 -> unavailable
Fallback method
 -> verify capability and result
```

Examples:

- official API to official documentation
- primary model to approved backup model
- live source to labelled cached data
- automatic extraction to human review
- unavailable tool to a deterministic alternative

### A fallback is not automatically equivalent

A backup may differ in:

- freshness
- capability
- context limit
- permissions
- security controls
- latency
- price
- output quality
- supported fields

Fallback output should carry:

- fallback path
- capability difference
- data timestamp
- missing fields
- confidence
- quality-degradation flag
- follow-up requirement

The fallback must pass the same safety and acceptance checks. A backup path must never bypass the policy controls applied to the primary path.

## Recovery scope: retry, repair, fallback, replan, or stop

These mechanisms change different scopes.

| Mechanism | What changes |
|---|---|
| Retry | Nothing except time |
| Parameter repair | Inputs or execution parameters |
| Fallback | Implementation of the current step |
| Artefact repair | Current output or executable artefact |
| Replan | Remaining steps, dependencies, or assumptions |
| Stop | No justified path remains |
| Escalate | Authority moves to another actor |

A practical routing question is:

```text
Is the failure transient and safe to repeat?
 -> Retry

Can a justified parameter change satisfy the same step?
 -> Parameter Repair

Can an approved alternative satisfy the same contract?
 -> Fallback

Is the artefact wrong but the objective and route remain valid?
 -> Repair

Did a premise, dependency, or goal interpretation fail?
 -> Replan

Is required data, capability, or permission unavailable?
 -> Stop, Partial, Pending, Unsupported, or Human Action
```

The routing is not a fixed escalation staircase. A policy failure should not pass through three retries before reaching approval. Missing data should not trigger an endless sequence of cosmetic revisions.

<!-- Figure 5-4 insertion point -->

![Figure 5-4 — Failure Classification and Recovery Routing](/images/the-atlas-of-agent-design-patterns-part-5/retry-fallback-replan-routing.png)

> **Figure 5-4｜Failure Classification and Recovery Routing**  
> Classify the failure before acting. Transient routes to retry, ambiguous side effects to idempotency checks, unavailable methods to fallback, invalid premises to replan, and unsupported tasks straight to stop. Each path has its own loop limit and terminal state.

## Self-Refine: improve the current output with iterative feedback

Self-Refine uses an iterative loop in which an LLM generates output, produces feedback on that output, and refines it. The original method can use the same model as generator, feedback provider, and refiner.

```text
Generate
 -> Produce feedback
 -> Refine
 -> Repeat within a limit
```

### Good uses

- structure
- clarity
- style
- completeness against a rubric
- formatting
- explicit contradictions
- missing requested sections

### Limits

Self-Refine cannot guarantee that:

- a fact is true
- code runs
- a source exists
- a policy permits the action
- an environment state changed
- a plan is feasible

It may also:

- remove correct details
- introduce new claims
- drift from the user request
- produce increasingly confident wording around an unresolved issue

### Production contract

The feedback should be structured:

```text
Issues found
Evidence for each issue
Required change
Protected content that must not change
Unresolved issues
Revised output
```

Set:

- review scope
- rubric
- maximum rounds
- no-improvement rule
- protected verified content
- verifier after revision

Self-Refine is an editing and candidate-improvement method. It is not an external fact checker.

## Critic: diagnose and propose a repair direction

A critic examines a candidate and produces actionable diagnosis.

```text
Generator
 -> Candidate
 -> Critic
 -> Findings
 -> Generator repairs
```

A strong critic output includes:

```text
Issue:
Recommendation lacks official evidence

Severity:
High

Evidence:
Only third-party summaries are cited

Required repair:
Retrieve an approved source or mark the claim unverified

Scope:
Claims 2 and 4 only
```

A critic does not necessarily issue the final acceptance decision.

### Critic versus CRITIC

“Critic” is a generic role. CRITIC is a specific research framework that uses external tools to evaluate aspects of an output and then revises the output using that tool feedback.

Tool-interactive critique is stronger than unsupported introspection because the critique can use search, execution, or another observable signal.

### Critic risks

- wrong critique
- style preference presented as an error
- endless improvement requests
- shared bias with the generator
- non-actionable feedback
- repair that damages verified content

Controls include:

- defined scope
- explicit rubric
- severity
- evidence
- required action
- protected sections
- review-round limit
- separate verifier

## Verifier: decide acceptance against a specification

A verifier answers:

> Does this candidate satisfy the acceptance contract?

```text
Candidate
 -> Checks
 -> PASS / FAIL / REVIEW / INCONCLUSIVE
```

A useful verifier report includes:

```text
Status: FAIL

Failed checks:
- Claim 3 has no approved source
- Required field risk_level is missing
- Target test failed

Evidence:
- citation map contains no source for Claim 3
- schema validator returned missing-property
- test exit code was 1

Next action:
Repair only failed checks and preserve verified sections
```

### Deterministic verifier

Best for:

- schemas
- fields
- syntax
- calculations
- permissions
- policy
- compilation
- tests
- explicit invariants

### Evidence verifier

Best for:

- source authority
- claim-to-citation support
- version and date
- missing evidence
- conflicting sources

### Model-based verifier

Useful for:

- semantic completeness
- faithfulness
- whether the question was answered
- argument quality
- readability

It requires:

- explicit rubric
- calibration set
- stable output schema
- false-pass and false-fail monitoring
- abstention or `inconclusive`
- periodic re-evaluation

A model verifier may be correlated with the generator, particularly when both share the same context and assumptions.

### Hybrid verifier

A sensible order is:

```text
Hard rules and schema
 -> executable tests
 -> evidence verification
 -> model-based quality judgement
 -> authorised human decision where necessary
```

Objective failures should not be overruled by persuasive prose.

<!-- Figure 5-2 insertion point -->

![Figure 5-2 — Generator, Critic, Verifier, and Recovery Controller](/images/the-atlas-of-agent-design-patterns-part-5/generator-critic-verifier.png)

> **Figure 5-2｜Generator, Critic, Verifier, and Recovery Controller**  
> Production, diagnosis, acceptance, and repair routing are four different responsibilities. Mixing them into one prompt invites a model to set its own test, mark its own work, and award itself a perfect score.

## Generator, critic, verifier, and recovery controller

These roles should not collapse into one undifferentiated prompt.

### Generator

- produces or repairs the candidate
- follows the current step contract
- does not certify its own completion

### Critic

- diagnoses defects
- supplies severity and evidence
- proposes a repair direction
- does not automatically control acceptance

### Verifier

- runs the acceptance checks
- returns pass, fail, review, or inconclusive
- preserves failure evidence
- does not silently rewrite the contract

### Recovery controller

- classifies the failure
- selects retry, repair, fallback, replan, escalation, or stop
- enforces budgets and loop limits
- records the repair history

Separation may use different models, tools, prompts, contexts, or services. The essential property is separate responsibility and observable hand-offs.

## Generate-and-Test: execute the artefact and use the result

Generate-and-Test applies when the candidate is executable or produces observable effects.

```text
Generate artefact
 -> run in a controlled environment
 -> collect structured result
 -> pass?
 yes -> run broader acceptance suite
 no -> repair within bounds
```

Examples:

- code
- SQL
- API request
- shell command
- data transformation
- workflow definition
- constraint solution
- browser action sequence

### Coding example

```text
Generate patch
 -> run target test
 -> fail: token audience mismatch
 -> repair configuration
 -> rerun target test
 -> pass
```

A target test passing is not the final certificate.

Continue with:

```text
related tests
 -> full relevant suite
 -> static analysis
 -> lint
 -> build
 -> security checks
 -> change-scope review
```

### Protect the acceptance mechanism

An agent may game a weak test by:

- deleting the failing test
- skipping the test
- changing the expected value
- special-casing one fixture
- breaking unrelated behaviour
- bypassing the policy gate

Controls include:

- protected test files
- immutable acceptance criteria
- test-change review
- broader regression suite
- diff inspection
- independent test runner
- clean environment
- protected branch or sandbox
- verifier acceptance

### Structure the failure signal

Instead of returning an entire terminal transcript:

```json
{
 "command": "pytest tests/auth",
 "exit_code": 1,
 "passed": 18,
 "failed": 2,
 "failure_signatures": [
 "token audience mismatch",
 "expired fixture"
 ],
 "files_changed": [
 "src/auth/config.py"
 ]
}
```

Structured signals make repair more targeted and make repeated failure easier to detect.

<!-- Figure 5-3 insertion point -->

![Figure 5-3 — Production Generate-and-Test Loop](/images/the-atlas-of-agent-design-patterns-part-5/generate-and-test-coding-loop.png)

> **Figure 5-3｜Production Generate-and-Test Loop**  
> A generator produces a candidate, a critic supplies diagnosis, repair rewrites the candidate, and a verifier checks it against the acceptance contract. Each round must leave observable evidence. The loop exits on PASS, max attempts reached, budget exhausted, or controller-initiated stop.

## Replanning: change the remaining route when the route is wrong

Repair is appropriate when the current artefact is wrong but the objective and overall route remain valid.

Replanning is appropriate when:

- a critical assumption failed
- the goal was misunderstood
- the selected data source cannot answer the question
- dependencies changed
- several downstream steps became invalid
- the acceptance contract changed with authorisation
- the remaining budget cannot execute the plan
- repeated local repair exposed a structural problem

A replan should:

- preserve valid completed work
- identify invalidated steps
- record the trigger
- produce a plan diff
- update dependencies
- respect the replan limit
- pass plan validation

Replanning must not become a universal escape hatch. When the data does not exist, a legitimate result may be:

- unavailable
- partial
- pending
- unsupported
- requires human action

## Reflexion: use verbal feedback across attempts

Reflexion is a specific framework in which an agent reflects verbally on task feedback and stores reflective text in an episodic memory buffer to improve subsequent trials, without updating model weights.

A simplified original-style loop is:

```text
Attempt
 -> receive feedback
 -> verbal reflection
 -> store reflection in episodic buffer
 -> use it in a later attempt
```

This is not the same as automatically creating a permanent organisational rule.

### Reflexion versus Self-Refine

Self-Refine:

> Improve the current candidate.

Reflexion:

> Use reflection from feedback to influence a subsequent trial.

### Production memory promotion is an additional governance layer

A production system may choose to convert repeated, verified experience into a durable lesson. That is an extension beyond the basic episodic reflection loop.

A lesson candidate should include:

- situation
- observed failure
- evidence
- root-cause hypothesis
- successful repair
- applicability conditions
- non-applicability conditions
- confidence
- source and time
- validation status

Before promotion to long-term memory:

- verify the failure analysis
- check whether the lesson generalises
- scope it narrowly
- resolve conflicts
- assign owner and expiry
- require approval for high-impact procedures

Possible lifecycle:

```text
Reflection candidate
 -> evidence review
 -> repeated or confirmed?
 no -> keep short-lived or discard
 yes -> approve scoped lesson
 -> versioned long-term memory
 -> revalidate on retrieval
```

This prevents one accidental failure from becoming a permanent rule.

<!-- Figure 5-5 insertion point -->

![Figure 5-5 — Reflexion and Governed Lesson Promotion](/images/the-atlas-of-agent-design-patterns-part-5/reflexion-memory-loop.png)

> **Figure 5-5｜Reflexion and Governed Lesson Promotion**  
> Episodic reflection helps the next attempt; a long-term lesson must clear separate governance and validation before promotion. One failure does not automatically become a permanent rule.

## Human review: authorisation and judgement, not a universal verifier

Some decisions should not be fully automatic:

- payment
- destructive data change
- production deployment
- external publication
- privilege escalation
- legal or medical judgement
- high-value contract
- policy exception

Human review provides:

- accountability
- risk acceptance
- business context
- exception handling
- final authorisation

The reviewer needs:

- proposed action
- evidence
- checks already passed
- unresolved risks
- impact
- reversibility
- diff or preview
- alternatives
- timeout behaviour
- actor identity and permissions

Human review can also fail through fatigue, blind approval, information overload, or stale workflow state.

A safe approval step needs:

- expiry
- state persistence
- revalidation before execution
- separation of duties
- no self-approval
- audit trail
- safe resume behaviour

Human review is a governed decision point, not a bin for every uncertainty.

## Bounded recovery controller

A recovery controller prevents the system from looping because “one more improvement” is always possible.

### Per-strategy limits

Example policy:

| Loop | Example maximum |
|---|---:|
| Transient retry | 3 |
| Parameter repair | 2 |
| Output repair | 2 |
| Critic revision | 2 |
| Generate-and-Test repair | 4 |
| Replanning | 2 |

These are examples, not universal defaults. The correct limits depend on cost, risk, and expected improvement.

### Observable progress

A repair round should improve an objective signal:

- fewer failing tests
- fewer missing fields
- higher evidence coverage
- fewer unresolved issues
- new valid source
- improved verifier result
- reduced policy violations

If repeated rounds produce the same failure signature, the controller should stop or change strategy.

### Duplicate detection

Record:

- action signature
- input hash
- output hash
- error signature
- tool parameters
- plan version
- environment version

A paraphrased attempt with the same effective input and same failure is still a duplicate.

### Global budget

Limit:

- model calls
- tool calls
- tokens
- elapsed time
- monetary cost
- state transitions
- human reminders

### Terminal outcomes

At minimum:

- completed
- failed
- partial
- pending
- unsupported
- cancelled
- requires human action
- inconclusive

Stopping safely is a successful control decision, not an admission that the architecture failed.

## Production verification and recovery architecture

A mature architecture may look like:

```text
Candidate
 -> hard validation
 -> external test or evidence check
 -> verifier
 -> pass -> accept
 -> fail -> classify failure
 -> review -> human decision
 -> inconclusive -> gather evidence or stop
```

Failure routing:

```text
Transient -> safe retry
Parameter -> parameter repair
Method -> fallback
Artefact -> bounded repair or Generate-and-Test
Evidence -> retrieve approved evidence
Plan -> replan
Policy -> deny or request approval
Unsupported -> terminal stop
```

Cross-cutting controls:

- acceptance contract
- idempotency
- state persistence
- repair history
- duplicate detection
- budget
- immutable requirements
- policy
- audit trace
- human approval

Only after verified failure analysis should the system consider storing a reflection or promoting a durable lesson.

## Complete example: research with unsupported pricing

The task is:

> Compare enterprise pricing for three products.

### First candidate

The agent creates a table from third-party review sites.

### Evidence verifier

```text
Status: FAIL

Failed checks:
- two prices lack official support
- one price is from an outdated product version

Failure class:
Evidence Failure
```

### Critic

```text
Required repair:
Use official pricing pages, billing documentation,
or official announcements.
Mark unavailable enterprise pricing explicitly.
```

### Fallback

One official pricing page is unavailable.

The system tries:

```text
official documentation
 -> official product announcement
 -> labelled unavailable
```

The fallback result carries source date and missing-field status.

### Replan

The product does not publish enterprise pricing.

The remaining plan changes:

```text
preserve verified public pricing
mark enterprise pricing as Contact Sales
compare documented contract conditions
do not infer a hidden price
```

### Verifier

```text
Official-source coverage: PASS
Unsupported claims: 0
Missing values labelled: PASS
Version dates recorded: PASS
```

### Reflection

A short-lived reflection records:

```text
When enterprise pricing is undisclosed,
do not infer a numerical price.
Use official sources and label Contact Sales.
```

Only after repeated validation and governance review should this become a durable organisational lesson.

## Choosing the correct mechanism

| Situation | Primary mechanism |
|---|---|
| Transient, safe-to-repeat failure | Retry |
| Same step needs a justified parameter change | Parameter repair |
| Primary implementation unavailable | Fallback |
| Current text needs bounded revision | Self-Refine |
| A candidate needs actionable diagnosis | Critic |
| A specification needs an acceptance decision | Verifier |
| Artefact can be executed in a controlled environment | Generate-and-Test |
| Remaining route or premise is invalid | Replanning |
| Feedback should influence a later trial | Reflexion |
| High-impact action needs authorisation | Human review |
| Data or capability does not exist | Stop, partial, pending, or unsupported |

## Common anti-patterns

### Retry every error

Permanent and policy failures do not become transient after three attempts.

### Retry a write without idempotency

A lost response becomes a duplicate side effect.

### Generator certifies its own work

The same component produces, judges, and accepts.

### Critic without scope

Every revision creates another possible improvement.

### Verifier without a contract

“Check whether this looks correct” is not an acceptance test.

### Model judgement overrides failed execution

A persuasive explanation cannot convert a failing test into a pass.

### Weak tests are treated as ground truth

The agent modifies the tests or exploits missing coverage.

### Replanning for a local defect

A one-line schema error causes the entire research plan to be rebuilt.

### Every reflection becomes permanent memory

One accident becomes a global rule.

### Human review without decision context

The approver receives two buttons and no evidence.

### No terminal failure

The system assumes another round must exist.

## Production checklist

### Verification

- Is the acceptance contract explicit?
- Does the verifier support fail and inconclusive?
- Are deterministic and environment checks used first?
- Is evidence preserved?
- Are false passes and false failures monitored?
- Are requirements protected from modification?

### Recovery

- Is the failure classified before action?
- Is retry limited to retryable and safe operations?
- Are idempotency and reconciliation defined?
- Are retry, repair, fallback, and replan distinct?
- Does every loop have a limit?
- Is no-improvement detected?
- Can the workflow stop with partial or unsupported status?

### Reflexion and memory

- Is the reflection tied to observed feedback?
- Is original episodic reflection separated from durable lesson promotion?
- Are scope, evidence, confidence, version, and expiry recorded?
- Can lessons be revoked or superseded?
- Are high-impact lessons reviewed?

### Human review

- Can the reviewer inspect evidence and impact?
- Is the workflow paused durably?
- Is state revalidated before execution?
- Are approver identity, expiry, and audit recorded?
- Is self-approval prohibited where separation of duties matters?

## Conclusion

An agent is not reliable because it is willing to think again.

Reliability comes from a system that can:

- define success
- detect observable failure
- diagnose the affected scope
- choose the smallest justified recovery
- protect side effects
- verify the repaired result
- stop when recovery is not justified
- preserve only validated experience

The main mechanisms solve different problems:

- **Retry** repeats a safe, transient operation.
- **Parameter repair** changes a justified input to the same step.
- **Fallback** uses another implementation of the same contract.
- **Self-Refine** improves the current candidate through feedback.
- **Critic** diagnoses defects and proposes repair.
- **Verifier** accepts or rejects against a specification.
- **Generate-and-Test** executes an artefact and observes the result.
- **Replanning** changes the remaining route.
- **Reflexion** uses verbal feedback across attempts.
- **Memory promotion** governs whether a verified lesson should persist.
- **Human review** provides judgement and authorisation.
- **Stop** is the correct result when evidence, capability, permission, or budget is exhausted.

The production pattern is:

```text
explicit contract
 + observable evidence
 + failure classification
 + bounded recovery
 + independent acceptance
 + safe terminal states
```

Part 6 moves from verification to organisation:

> Should one agent own the work, or should responsibility be divided among several specialised agents?

## References

- [Madaan et al., *Self-Refine: Iterative Refinement with Self-Feedback*](https://arxiv.org/abs/2303.17651)
- [Gou et al., *CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing*](https://arxiv.org/abs/2305.11738)
- [Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366)
- [Valmeekam et al., *Can Large Language Models Really Improve by Self-critiquing Their Own Plans?*](https://arxiv.org/abs/2310.08118)
- [AWS Builders' Library, *Timeouts, retries, and backoff with jitter*](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS Builders' Library, *Making retries safe with idempotent APIs*](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-apis/)
- [AWS Well-Architected Framework, *Make mutating operations idempotent*](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html)

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
