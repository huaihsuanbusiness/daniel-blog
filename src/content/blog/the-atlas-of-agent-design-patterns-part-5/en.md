---
title: "The Atlas of Agent Design Patterns Part 5 ｜ Agent Verification and Recovery: Retry, Critic, Verifier, Reflexion and Generate-and-Test"
description: "A complete comparison of Retry, Parameterized Retry, Fallback, Self-Refine, Critic, Verifier, Generate-and-Test, Replanning, Reflexion and Human Review, and how to build a Production recovery mechanism that does not loop forever."
date: 2026-06-30T20:18:00
lang: en
categories: ["AI"]
series: "The Atlas of Agent Design Patterns"
seriesOrder: 5
---

Imagine a Coding Agent gets the task:

> Fix the integration test on the login API.

It changes the code, then replies:

> Fix complete. I double-checked it. It should be working now.

That sentence sounds confident.

But it may not have actually:

- run the test
- checked the Build
- verified the other login flows
- confirmed that the failing test was not deleted
- checked whether unrelated files were modified
- compared the original requirement to see whether the task was really done

It only re-read the code it had just generated, and then offered another subjective judgement.

This is one of the most dangerous false-green-lights in an Agent system:

> **Mistaking "the model says it has checked" for actual verification.**

An Agent being able to generate an answer does not mean it knows whether the answer is correct.

An Agent being able to point at a problem does not mean it can reliably judge whether the problem has been solved.

When a task fails, the system still has to decide:

- is this a transient error, so Retry?
- is the parameter wrong, so Parameterized Retry?
- is the main method unavailable, so Fallback?
- is the output quality too low, so Self-Refine?
- does it need a Critic to suggest changes?
- does a Verifier have to make a Pass / Fail decision?
- should the system actually run a test?
- is the answer wrong, or is the whole route wrong?
- should the failure experience be written into Memory?
- which high-risk nodes have to be handed to a human?

This article handles the fourth architectural dimension:

> **How does an Agent detect errors, choose the right repair path, and stop reliably inside a bounded cost?**

---

## Why "thinking again" is not verification

The weakest self-check loop usually looks like:

```text
Generate Answer
  ↓
Think Again
  ↓
Looks Good
  ↓
Accept
```

The problem is that the second judgement still uses:

- the same model
- the same Context
- the same set of wrong premises
- the same missing external information
- the same vague definition of success

If the first error came from wrong data, the model thinking again is just rearranging sentences on top of wrong data.

If the first error came from a wrong understanding of the request, the second pass may just state the misunderstanding more completely.

If the code was never executed the first time, reading it a second time still does not prove it works.

So the reliability of verification mostly depends on:

1. **whether the acceptance standard is explicit**
2. **whether the verification signal is independent**
3. **whether it can reach the real environment**
4. **whether it can supply reproducible evidence**
5. **whether it can refuse, instead of always saying Pass**

## From subjective check to external evidence

You can roughly split common verification methods into a few layers:

```text
Re-read the output
  ↓
Self-Refine
  ↓
Critic Review
  ↓
Rule / Schema Verifier
  ↓
External Test or Execution
  ↓
Human Review for judgement and irreversible risk
```

This is not an absolute ranking.

For example:

- JSON Schema is usually more reliable than a human eyeballing the format
- a Unit Test is usually more reliable than an LLM comment on whether the code works
- Human Review can be more valuable for business risk and ambiguous context
- humans can also be fatigued, mistake-prone, or blindly approving

The real question is not:

> Which verification method is the highest level?

It is:

> **Does this failure have evidence that can be observed objectively?**

![Figure 5-1 — Verification Reliability Ladder](/images/the-atlas-of-agent-design-patterns-part-5/verification-reliability-ladder.png)

> **Figure 5-1 ｜ Verification Reliability Ladder**  
> From re-reading, Self-Refine, Critic, Verifier, all the way to External Test and Human Review, the verification signal gets more independent and more observable. But different tasks need different kinds of evidence.

---

## 1. Retry: do the same action once more

Retry is the simplest form of recovery.

```text
Action
  ↓
Failure
  ↓
Wait
  ↓
Retry Same Action
```

It fits:

- API Timeout
- transient network errors
- Rate Limit
- short-lived service unavailability
- occasional parsing errors
- temporary resource locks

Retry carries one important assumption:

> **The same action, executed again a moment later, has a reasonable chance of succeeding.**

For example:

```text
HTTP 503
  ↓
Wait 2 seconds
  ↓
Retry
```

If the error is transient service pressure, Retry may work.

But if the error is:

```text
HTTP 401
```

Sending the same Token, the same Header, the same Endpoint ten more times will usually just get ten more 401s.

## Retry must have an upper bound

A Production Retry at least needs:

- Maximum Attempts
- Timeout
- Backoff
- Jitter
- Retryable Error List
- Non-retryable Error List
- Terminal Failure
- Observability

For example:

```text
Attempt 1
  ↓ Fail: 503
Wait 1s

Attempt 2
  ↓ Fail: 503
Wait 2s

Attempt 3
  ↓ Fail: 503
Stop and Fallback
```

Do not write:

```text
Try until success
```

That sentence is the common enemy of Tokens, API costs and on-call engineers.

## Which errors usually should not be retried?

- permission denied
- invalid schema
- required field missing
- target does not exist
- user request is outside the supported scope
- explicit policy rejection
- an irreversible action already succeeded but its response was lost
- a deterministic code error triggered by the same input

Retry must do Error Classification first.

---

## 2. Parameterized Retry: not the same call

Parameterized Retry still tries to finish the same step, but it adjusts the execution parameters.

For example:

```text
Search Query A
  ↓ No useful result
Search Query B
```

Or:

```text
Parse with strict schema
  ↓ Failed
Parse with repaired input and explicit schema guidance
```

Common adjustments include:

- rewriting the Query
- adjusting the Timeout
- narrowing the data range
- reducing the Batch Size
- switching the output format
- adding required Context
- modifying Tool Parameters
- falling back to a more conservative model setting

## Retry vs Parameterized Retry

| Axis | Retry | Parameterized Retry |
|---|---|---|
| Goal | Same | Same |
| Method | Same | Basically the same method |
| Parameters | Unchanged | Adjusted |
| Fits | Transient failure | Input or parameter was not ideal |
| Main risk | Repeating the same error | Endlessly trying different parameters |

Parameterized Retry is not random tweaking.

The system should record:

- which parameter was modified
- the reason for the change
- the previous failure signal
- whether the result actually improved
- which combinations have already been tried

Otherwise the Agent can keep swapping skins between different wordings and form a Parameter Carousel.

---

## 3. Fallback: switch to a backup path

Fallback no longer insists on the original method.

It switches to a different:

- model
- tool
- API
- data source
- algorithm
- execution mode
- human handling path

```text
Primary Method
  ↓
Success?
  ├─ Yes → Continue
  └─ No → Fallback Method
             ↓
          Continue or Fail
```

For example:

```text
Primary:
Official API

Fallback 1:
Official Web Page

Fallback 2:
Cached Data

Fallback 3:
Human Review
```

## Retry vs Fallback

Retry is:

> Knock on the same door again.

Fallback is:

> Use a different door. Maybe even a different building.

## Fallback is not automatically equivalent

The primary model and the backup model may differ on:

- quality
- Context Window
- supported tools
- safety policy
- latency and cost

The primary data source and the Cache may differ on:

- freshness
- field completeness
- missing recent updates

So Fallback results should be tagged with:

- which backup path was used
- whether quality was downgraded
- data timestamp
- missing fields
- whether a follow-up lookup is needed

## Common Fallback anti-patterns

### Hiding the primary path's failure

The system replying successfully does not mean the main service is healthy.

### The backup path was never tested

It is never used in normal times, and the day it has to fire, it turns out the Fallback is broken too.

### Weaker safety controls

The primary path has full permission checks. The backup path silently bypasses policy.

### Infinite Fallback Chain

```text
A → B → C → D → A
```

The result is a circular disaster sightseeing bus.

---

## How do Retry, Fallback and Replanning actually differ?

All three keep going after a failure, but the scope of change is different.

## Retry

```text
Same step
+ Same method
+ Same parameters
```

## Parameterized Retry

```text
Same step
+ Same kind of method
+ Adjusted parameters
```

## Fallback

```text
Same step
+ A different method or service
```

## Replanning

```text
Re-examine the goal and the remaining route
+ Modify later steps or dependencies
```

For example, the task is to get the full job description.

### Retry

Request the same URL again.

### Parameterized Retry

Add Headers, extend Timeout, or switch to a different page parameter.

### Fallback

Switch to the company's Career Page or a public Job API.

### Replanning

After discovering that the full body cannot be retrieved, modify the remaining plan:

```text
Stop auto-scoring
Mark Pending
Ask the human to fill in the JD
Do not infer from the title alone
```

![Figure 5-4 — Retry, Fallback, or Replan?](/images/the-atlas-of-agent-design-patterns-part-5/retry-fallback-replan-routing.png)

> **Figure 5-4 ｜ Retry, Fallback, or Replan?**  
> First judge whether the failure is transient, whether the parameters can be tuned, and whether an equivalent backup method exists. Only enter Replanning when a premise, a dependency, or the remaining route has failed.---

## 4. Self-Refine: the model reviews and rewrites its own draft

The basic flow of Self-Refine is:

```text
Generate
  ↓
Review Own Output
  ↓
Produce Feedback
  ↓
Revise
```

It helps improve:

- wording
- structure
- completeness
- formatting
- clarity
- missing items

For example, a first draft of a product comparison is missing the risk section.

Self-Refine can point out:

```text
The comparison includes features and pricing,
but does not discuss deployment risk.
```

Then it adds the missing content.

## Strengths of Self-Refine

- simple to implement
- does not always need a separate model
- good for text quality improvement
- can use an explicit Rubric
- better than skipping review entirely

## Limits of Self-Refine

### The same blind spot can keep surviving

If the model does not know a fact, it will not suddenly know it just because it reflected on itself.

### Easy to mistake rewriting for repair

The sentences get prettier, but the core error is still there.

### Easy to produce a false sense of fix

The model says:

> All issues have been fixed.

But it does not provide any verifiable evidence of the change.

### It can keep making things worse

Multiple rounds of Self-Refine can:

- delete correct details
- add unnecessary content
- shift the original requirement
- make uncertain information sound more certain

## What should Production Self-Refine look like?

Do not use:

```text
Please improve the answer.
```

Provide an explicit Rubric:

```text
Check only:
1. Missing required sections
2. Unsupported factual claims
3. Output schema
4. Contradictions
5. Word limit
```

And require:

```text
Issues Found
Proposed Changes
Revised Output
Unresolved Issues
```

Self-Refine is a copy-editor's tool, not an external fact verifier.

---

## 5. Critic: point at where the problem is

A Critic's job is not to issue the final Pass / Fail. It is to provide directional diagnosis.

```text
Generator
  ↓
Draft
  ↓
Critic
  ↓
Feedback
  ↓
Generator Revises
```

A Critic can check:

- reasoning gaps
- missing evidence
- overlooked requirements
- semantic contradictions
- risk
- maintainability
- reader comprehension friction
- alternative options

## Self-Refine vs Critic

Self-Refine usually happens inside the same execution unit:

```text
Generate → Review Self → Revise
```

A Critic is an explicitly separated role or step:

```text
Generator → Critic → Generator
```

The underlying model can be the same, but ideally at least:

- a different Prompt
- a different Context
- an explicit Rubric
- a different responsibility
- an independent output format

## What should a good Critic output?

```text
Issue:
The recommendation is not supported by official sources.

Evidence:
The answer cites only third-party summaries.

Severity:
High

Required Fix:
Retrieve official documentation or mark the claim as unverified.
```

Rather than:

```text
The answer could be improved.
```

The first form translates into an executable repair much more easily.

## Main risks of a Critic

### The Critic can also be wrong

It can demand the removal of correct content, or treat style preference as an error.

### Over-criticism

Without a stopping threshold, the Critic can always find another point to improve.

### The Critic shares the same bias as the Generator

Both may silently agree to overlook the same problem.

### The feedback is not actionable

Plenty of comments, but no clear fix path.

So a Critic needs:

- Scope
- Rubric
- Severity
- Evidence
- Required Action
- Maximum Review Rounds

---

## 6. Verifier: Pass or Fail against a specification

The biggest difference between a Verifier and a Critic is:

> **A Critic provides diagnosis. A Verifier makes the acceptance call.**

The typical flow is:

```text
Output
  ↓
Verifier
  ↓
Pass?
  ├─ Yes → Accept
  └─ No → Reject / Repair / Replan
```

A Verifier should rely on explicit criteria, for example:

- JSON Schema
- Required Fields
- Unit Tests
- SQL Read-only Policy
- Citation Coverage
- Source Match
- Permission Rules
- Completion Criteria
- Business Constraints

## A Verifier should not only reply "looks right"

A good Verifier Output includes:

```text
Status: FAIL

Failed Checks:
- Missing citation for Claim 3
- Output exceeds 500 words
- Required field "risk_level" is absent

Evidence:
- Claim 3 has no source reference
- Word count: 684

Next Action:
Repair output without changing verified sections
```

## Deterministic Verifier

Fits:

- schema
- format
- fields
- numeric values
- permissions
- compile
- test
- explicit rules

The strength is reproducibility.

## Model-based Verifier

Fits:

- semantic completeness
- summary faithfulness
- argument quality
- whether the user's question is actually answered
- style and readability

But it needs:

- an explicit Rubric
- calibration data
- a consistent scoring format
- False Positive / Negative monitoring
- regular re-evaluation

## Hybrid Verifier

A reasonable order is usually:

```text
Schema and Rule Checks
  ↓
External Execution
  ↓
Evidence Verification
  ↓
Model-based Quality Review
```

Check the objective conditions first, then evaluate subjective quality.

Do not let a piece of text cross a failing Unit Test because it was persuasive.---

## How are the responsibilities of Generator, Critic and Verifier separated?

These three roles often get conflated.

## Generator

Responsible for:

- producing candidate output
- revising based on Feedback
- never issuing its own certificate of completion

## Critic

Responsible for:

- pointing at problems
- stating severity
- suggesting fix directions
- not necessarily holding the final veto

## Verifier

Responsible for:

- acceptance against completion conditions
- giving a Pass / Fail decision
- providing failure evidence
- choosing Repair, Replan, Escalate or Stop

![Figure 5-2 — Generator, Critic, and Verifier](/images/the-atlas-of-agent-design-patterns-part-5/generator-critic-verifier.png)

> **Figure 5-2 ｜ Generator, Critic, and Verifier**  
> The Generator produces and revises content. The Critic diagnoses problems and provides Feedback. The Verifier issues a Pass / Fail decision based on the specification and evidence. Separating these three responsibilities is the only way to avoid a model setting its own test, grading its own work, and awarding itself a full mark.

---

## 7. Generate-and-Test: only the real execution counts

The core of Generate-and-Test is not "generate a few more candidates and pick one".

That is Generate-and-Rank.

The Generate-and-Test flow is:

```text
Generate Artifact
  ↓
Execute Test
  ↓
Pass?
  ├─ Yes → Accept
  └─ No → Inspect Failure
             ↓
          Revise Artifact
             ↓
          Execute Test Again
```

It fits any executable, observable artefact:

- code
- SQL
- API Request
- Shell Command
- Data Transformation
- Workflow Definition
- Constraint Solution
- Browser Action Sequence

## A Coding Agent example

Task:

> Fix the API returning 401.

Round one:

```text
Generate Patch
  ↓
Run Target Test
  ↓
Fail: Expected 200, received 401
```

Agent reads the failure signal:

```text
Token audience does not match the API configuration.
```

Round two:

```text
Revise Authentication Configuration
  ↓
Run Target Test
  ↓
Pass
```

But it is not yet time to declare success.

It still needs:

```text
Run Authentication Test Suite
  ↓
Run Full Test Suite
  ↓
Run Lint
  ↓
Run Build
  ↓
Check Unrelated Changes
```

## The tests themselves may be flawed

Generate-and-Test is not magic.

If the tests are too weak, the Agent can:

- pass a wrong implementation
- fix only one case
- break other functionality
- delete or skip tests
- modify the Expected Result so the error seems to disappear

So you have to defend against Reward Hacking:

- tests cannot be deleted by the Agent at will
- critical tests should be protected
- the full relevant test suite must be run
- check whether test files were modified
- add static analysis and Build
- compare the change scope
- require external Verifier acceptance when needed

## Test Results must be structured

```text
Command:
pytest tests/auth

Exit Code:
1

Passed:
18

Failed:
2

Failure Signatures:
- token audience mismatch
- expired fixture

Files Changed:
- src/auth/config.py
```

That is far easier for the Agent to repair reliably than dumping the whole Terminal Log back into Context.

![Figure 5-3 — Generate-and-Test Coding Loop](/images/the-atlas-of-agent-design-patterns-part-5/generate-and-test-coding-loop.png)

> **Figure 5-3 ｜ Generate-and-Test Coding Loop**  
> The Agent generates a Patch in a Sandbox, runs the target test, reads the structured failure signal, revises, and re-tests. After it passes, it still needs to run the full test suite, Lint, Build and a change-scope review.

---

## 8. Replanning: the wrong thing may not be the answer, but the whole route

Sometimes fixing the current output is pointless.

Because the actual error is:

- understanding of the problem
- initial assumption
- data source
- task decomposition
- step dependencies
- execution order
- success criteria

For example, a Research Agent's original plan is:

```text
1. Search news
2. Compile product prices
3. Make a recommendation
```

During execution it discovers:

- the news articles quote outdated prices
- the official pricing page differs by region
- the user actually wants the enterprise plan
- the original research route cannot answer the question

At this point, only Self-Refining the final article still does cosmetic work on top of the wrong data.

Replanning should rewrite the remaining plan:

```text
1. Keep the confirmed product list
2. Switch to official regional pricing
3. Add enterprise plan restrictions
4. Mark unverifiable prices
5. Produce the recommendation again
```

## When should you Replan?

- a critical assumption failed
- required data is not available
- the goal was misunderstood
- multiple steps fail in a row
- the Verifier finds a structural gap
- dependencies changed
- the budget cannot finish the original plan
- the user updated the requirement

## Replanning is not a universal Retry

If the data really does not exist, Replan also should not keep switching methods forever.

Reasonable results may be:

- Unavailable
- Pending
- Unsupported
- Partial Result
- Human Action Required

---

## 9. Reflexion: turn a failure into future experience

Reflexion does not only fix the current output. It turns the failure into experience that can be used in the future.

```text
Attempt
  ↓
Failure
  ↓
Analyze What Happened
  ↓
Extract Lesson
  ↓
Store in Memory
  ↓
Retrieve in Future Attempt
```

For example:

```text
Failure:
Scored a job using only the title.

Lesson:
Never score a role without the full job description.

Procedure:
If the stored JD is empty, fetch the source URL.
If the full text is still unavailable, mark Pending.
```

The next time it meets a similar task, the system first retrieves this Procedural Memory.

## Reflexion vs Self-Refine

Self-Refine:

> Improve the current output.

Reflexion:

> Change how the system behaves when it sees a similar task in the future.

## What should Reflexion actually store?

Fit for storage:

- the failure situation
- the root cause
- the effective fix
- the conditions of applicability
- the conditions of non-applicability
- source and time
- confidence
- verification result

It should not just store:

```text
Be more careful next time.
```

The operational value of that sentence is roughly that of a sticky note on the side of the monitor.

## Main risks of Reflexion

### Wrong lessons

The Agent can derive a wrong rule from one accidental failure.

### Over-generalisation

```text
The official API failed once
→ never use the official API again
```

### Memory pollution

Unverified reflections get written into long-term memory and keep influencing tasks afterwards.

### Outdated rules

The API, product and workflow have been updated, but the old lesson still gets retrieved.

### Conflicting memories

Two tasks produce opposite rules.

So Reflexion Memory needs:

- Evidence
- Scope
- Confidence
- Version
- Created At
- Expiry
- Validation Status
- Superseded By
- Human Approval for high-impact procedures

![Figure 5-5 — Reflexion Memory Loop](/images/the-atlas-of-agent-design-patterns-part-5/reflexion-memory-loop.png)

> **Figure 5-5 ｜ Reflexion Memory Loop**  
> A failure is analysed into a Lesson that carries situation, root cause, fix, and applicable scope. Only lessons that pass verification get written into Memory, and they are retrieved and re-verified when a similar task comes up.

---

## 10. Human Review: the last line of defence for high-risk nodes

Some operations should not run fully automatically, even when the model is very confident.

For example:

- sending external Email
- executing payments
- deleting data
- changing Production
- approving loans
- publishing legal or medical advice
- privilege escalation
- large-scale customer outreach
- accepting irreversible contracts
- writing into high-value master data

The value of Human Review is not only "humans may be smarter".

What matters more is:

- accountability
- business judgement
- risk acceptance
- exception handling
- final authorisation

## What does a human actually need to see?

A screen with only `Approve` and `Reject` buttons is usually not enough.

The approval screen should at least show:

- what the Agent is about to do
- why it is doing it that way
- which sources it used
- which checks have already passed
- which risks still exist
- the scope of the operation
- whether it can be undone
- a preview and diff
- alternative options
- what happens after the timeout

## Human Review can also fail

- blind approval
- approval fatigue
- information overload
- missing important Context
- wrong permission role
- unable to track what changed
- Agent state shifted during the wait

So human approval also needs:

- Clear Decision Context
- Expiry
- Revalidation Before Execution
- Approver Identity
- Audit Log
- Segregation of Duties
- No Self-approval
- Safe Resume State

Human Review is a safety control, not a bin for dumping every uncertainty onto people.---

## Full comparison of Self-Refine, Critic, Verifier and Reflexion

| Mode | Core task | Scope of impact | Issues Pass / Fail? | Depends on external evidence? | Affects future tasks? | Main risk |
|---|---|---|---:|---:|---:|---|
| Self-Refine | Find issues and rewrite own draft | Current output | Usually no | Usually no | No | Same blind spot, making things worse |
| Critic | Diagnose problems and provide Feedback | Current output or plan | Usually no | Optional | No | Wrong critique, over-criticism |
| Verifier | Acceptance against the specification | Current step or output | Yes | Should rely on it heavily | No | Incomplete rules, false positives / negatives |
| Reflexion | Convert failure into experience | Future similar tasks | No | Should be verified first | Yes | Wrong memory, over-generalisation, expiry |

---

## Reliability comparison of verification methods

| Method | Independence | Reproducibility | Fits to check | Not suited to handle alone |
|---|---:|---:|---|---|
| Re-reading | Low | Low | Obvious omissions, wording | Facts, execution results |
| Self-Refine | Low | Low to medium | Structure, format, completeness | Shared blind spots |
| Critic | Medium | Medium | Quality, risk, argument gaps | Strict Pass / Fail |
| Model Verifier | Medium | Medium | Semantic completeness, faithfulness | Precise execution results |
| Rule / Schema Check | High | High | Format, fields, policy | Open-ended quality |
| External Test | High | High | Programs, SQL, tool behaviour | Ambiguous business judgement |
| Source Verification | High | Medium to high | Facts and Citations | Creative tasks without sources |
| Human Review | Depends on the workflow | Medium | High risk, ambiguous judgement, authorisation | Mass-repeated objective checks |

A reliable system usually uses more than one layer.

For example, a Coding Agent:

```text
Static Validation
  ↓
Target Test
  ↓
Related Test Suite
  ↓
Full Test Suite
  ↓
Lint
  ↓
Build
  ↓
Change Review
```

---

## Failure types and repair strategy table

| Failure type | Typical signal | Preferred strategy | Should not do |
|---|---|---|---|
| Transient infrastructure error | Timeout, 503, Rate Limit | Retry + Backoff | Immediate infinite Retry |
| Bad parameters | Empty Query result, oversized Batch | Parameterized Retry | Random parameter changes without logging |
| Primary service unavailable | API Down, Model Outage | Fallback | Pretend quality is identical |
| Output format wrong | Schema Fail, missing fields | Repair / Self-Refine | Redo the entire research |
| Content quality too low | Missing pieces, contradictions, weak arguments | Critic + Revise | Just ask "think again" |
| Explicit specification not met | Policy, Rule, Required Field | Verifier → Reject / Repair | Let the Generator declare its own Pass |
| Executable artefact failed | Test, Build, SQL Error | Generate-and-Test | Trust model eyeballing |
| Critical assumption wrong | Invalid data source, misunderstood goal | Replanning | Keep editing the final text |
| Repeated failure | Similar task fails repeatedly | Reflexion + Validated Memory | Store vague or unverified lessons |
| High-risk or irreversible operation | Payment, Delete, Publish | Human Review | Auto-explore multiple real operation paths |
| Unsupported or data does not exist | Unsupported, Unavailable | Stop / Pending / Partial | Infinite Replan |

---

## How to build a recovery mechanism that does not loop forever?

Once verification and repair modes are combined, it is easy to form loops:

```text
Generate
  ↓
Critic
  ↓
Revise
  ↓
Verifier
  ↓
Fail
  ↓
Revise Again
```

Without a boundary, the Agent can always fix it one more time.

## 1. Classify the failure first

Every failure must be categorised, for example:

- Transient
- Invalid Input
- Quality Failure
- Policy Failure
- Tool Failure
- Missing Data
- Plan Failure
- Unsupported
- Human Decision Required

Different failures should not all be sent back into the same Retry Loop.

## 2. Set an upper bound for each kind of loop

For example:

| Loop | Upper bound |
|---|---:|
| Network Retry | 3 |
| Schema Repair | 2 |
| Critic Revision | 2 |
| Generate-and-Test | 4 |
| Replanning | 2 |
| Human Approval Reminder | 1 |

## 3. Require observable progress each round

For example:

- failing test count goes down
- missing fields decrease
- Citation Coverage improves
- unresolved issues decrease
- new effective sources are added
- the Verifier score goes up

If two rounds show no progress:

```text
No-improvement Limit Reached
  ↓
Fallback / Replan / Stop
```

## 4. Detect repeated actions and repeated errors

Record:

- Action Signature
- Input Hash
- Error Signature
- Output Hash
- Tool Parameters
- Plan Version

If the same input produces the same failure, it should not be dressed up as a new attempt.

## 5. Use an incremental escalation strategy

```text
Retry
  ↓
Parameterized Retry
  ↓
Fallback
  ↓
Repair
  ↓
Replan
  ↓
Human Review or Stop
```

Not every failure should jump straight into the most expensive process.

## 6. Set a total Budget

In addition to the upper bound on each loop, there must be whole-task limits:

- Max Tokens
- Max Tool Calls
- Max Wall Time
- Max Cost
- Max Model Calls
- Max State Transitions

## 7. Define terminal states

At minimum:

- Completed
- Failed
- Partial
- Pending
- Unsupported
- Cancelled
- Requires Human Action

"Not fully successful" does not mean the system has to keep trying.

## 8. Persist the repair history

Each round records:

- Attempt Number
- Failure Type
- Evidence
- Strategy Used
- Changes Made
- Result
- Cost
- Next Decision

This prevents the Agent from forgetting what it has already tried.

---

## Production verification and recovery architecture

A mature flow can look like this:

```text
Generate Output
  ↓
Hard Validation
  ├─ Fail → Repair
  └─ Pass
       ↓
External Test / Evidence Check
  ├─ Fail → Classify Failure
  │          ├─ Transient → Retry
  │          ├─ Parameter → Parameterized Retry
  │          ├─ Method → Fallback
  │          ├─ Output → Critic / Repair
  │          ├─ Plan → Replan
  │          ├─ Risk → Human Review
  │          └─ Unsupported → Stop
  └─ Pass
       ↓
Quality Verifier
  ├─ Fail → Bounded Revision
  └─ Pass → Accept
```

If the failure has reusable value:

```text
Verified Failure Analysis
  ↓
Create Scoped Lesson
  ↓
Approve Memory Write
  ↓
Reflexion Memory
```

The points that matter here are:

- verification comes before declaring success
- the repair method is decided by the failure type
- every Loop has an upper bound
- long-term memory only stores verified lessons
- unsupported tasks can be officially stopped

---

## A complete example: how a Research Agent handles errors

Task:

> Compare the enterprise pricing of three products.

## First run

The Agent finds three third-party review sites and produces a price table.

## Verifier check

```text
Status: FAIL

Reason:
Two prices are not supported by official sources.

Failure Type:
Evidence Failure
```

## Critic gives a fix direction

```text
Use official pricing pages, billing documentation,
or official announcements.
Mark unavailable values explicitly.
```

## Fallback

The official Pricing Page of one of them is unreachable.

The system switches to:

```text
Official Documentation
  ↓
Official Product Announcement
```

## Replanning

Enterprise pricing still cannot be found.

The remaining plan is rewritten:

```text
1. Preserve verified public prices
2. Mark enterprise pricing as Contact Sales
3. Compare available contract conditions
4. Do not infer hidden prices
```

## Verifier checks again

```text
Official-source coverage: PASS
Unsupported claims: 0
Missing values explicitly marked: PASS
```

## Reflexion

The experience is written as a bounded rule:

```text
Context:
Enterprise pricing research

Lesson:
Do not infer unpublished enterprise prices.

Procedure:
Use official pricing, documentation, or announcements.
If unavailable, label Contact Sales or Unavailable.

Validation:
Approved by source verifier
```

This flow uses:

- Verifier
- Critic
- Fallback
- Replanning
- Reflexion

But there is no blind Retry, and there is no "think again" pretending to be verification.

---

## When should you use which pattern?

| Situation | Suggested pattern |
|---|---|
| Transient network or service error | Retry |
| Same step can be improved by parameters | Parameterized Retry |
| Primary method failed but a backup exists | Fallback |
| Text structure or formatting needs improvement | Self-Refine |
| Need to diagnose quality and problems | Critic |
| Explicit specification or completion threshold exists | Verifier |
| Artefact can actually be executed and tested | Generate-and-Test |
| Initial assumption or remaining route has failed | Replanning |
| Similar errors will repeat in future tasks | Reflexion |
| High-risk, ambiguous or irreversible operation | Human Review |
| Task unsupported or data does not exist | Stop / Pending / Partial |

---

## Common anti-patterns

## Anti-pattern 1: Retry as the universal fix

Retry any error three times.

## Anti-pattern 2: the model generates, comments and signs off all by itself

The same bias runs through every stage.

## Anti-pattern 3: Verifier without an explicit specification

Just ask:

> Check whether the answer is good.

## Anti-pattern 4: Critic can always find a problem

The repair loop has no acceptance threshold and no maximum round count.

## Anti-pattern 5: Generate-and-Test only runs one weak test

The target test passes while other functionality is broken.

## Anti-pattern 6: the Agent can modify the acceptance criteria

It deletes the Test or relaxes the Constraint after failure.

## Anti-pattern 7: Replanning always overthrows the existing work

Already-completed, valid results get redone.

## Anti-pattern 8: every failure gets written into Memory

An accidental error becomes a permanent rule.

## Anti-pattern 9: Human Review without enough information

Humans can only blindly press Approve.

## Anti-pattern 10: no formal failure state

The system always believes one more try will succeed.

---

## Production checklist for verification and recovery

## Verification

- Are the Completion Criteria explicit?
- Do you prioritise deterministic checks?
- Do you actually run real tools or environment tests?
- Can the Verifier output Fail?
- Is failure evidence preserved?
- Do you monitor False Positive / Negative?

## Repair

- Do you classify Failure Type first?
- Does Retry only handle Retryable Error?
- Do you distinguish Retry, Fallback and Replan?
- Does every kind of loop have an upper bound?
- Is there No-improvement Detection?
- Can the system output Partial, Pending or Unsupported?

## Reflexion

- Does the Lesson have an applicable scope?
- Are the root cause and repair evidence preserved?
- Is the lesson written only after verification?
- Are version, time and expiry rules present?
- Can wrong memories be revoked or overridden?

## Human Review

- Can the approver see the impact and evidence?
- Does the operation stay paused until approved?
- Is the state re-validated after approval?
- Are there approval deadlines and Audit Log?
- Is Self-approval avoided?

---

## Conclusion of this article

An Agent's reliability does not come from its willingness to think a few more times.

It comes from a verification and recovery system that can:

- detect errors
- gather evidence
- classify failures
- pick the right repair method
- cap the number of repair attempts
- stop safely when the task cannot be completed

The patterns in this article solve different problems:

- **Retry**: same action handles transient failure
- **Parameterized Retry**: adjust parameters and retry the same step
- **Fallback**: switch to another method, tool or source
- **Self-Refine**: improve the structure and quality of the current output
- **Critic**: diagnose the problem and provide actionable Feedback
- **Verifier**: Pass / Fail decision based on the specification and evidence
- **Generate-and-Test**: execute and test in a real or isolated environment
- **Replanning**: rewrite the remaining plan when the assumption or route fails
- **Reflexion**: convert verified failures into future experience
- **Human Review**: protect high-risk, ambiguous and irreversible operations

A mature system rarely uses only one of these.

The more common combination is:

```text
Generate
  ↓
Hard Validation
  ↓
External Test
  ↓
Verifier
  ↓
Retry / Fallback / Repair / Replan / Human Review
  ↓
Accept or Stop
```

The thing worth keeping in mind is:

> **Verification is not asking the model "are you sure?". Verification is requiring the system to produce evidence that can be observed, reproduced and refused.**

The next article enters the fifth architectural dimension:

> Should the work be done by a single Agent, or split across multiple Agents?

Part 6 will fully compare Single Agent, Role-based Single Agent, Supervisor–Worker, Planner–Executor–Critic, Debate, Voting, Blackboard, Peer-to-Peer and Swarm.