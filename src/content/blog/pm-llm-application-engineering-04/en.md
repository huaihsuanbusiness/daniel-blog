---
title: "LLM Application Engineering and Governance for PMs Part 4 – Agents Are Not Magic: When to Use Multi-Step Workflows, and When to Stop at Guardrails, KPIs, and Governance"
description: "Once tool calling and RAG begin to work, nearly every team develops the same instinct."
categories: ["ai"]
tags: []
date: 2026-04-05T16:28:00
series: "LLM Application Engineering and Governance for PMs"
seriesOrder: 4
---

Once tool calling and RAG begin to work, nearly every team develops the same instinct.

If the model can already look things up, call tools, and turn results into a coherent response, should the next step be an agent? Should it plan its own steps, hand work across stages, update systems, and drive a workflow end to end?

That instinct is understandable.

It is also the point where many systems become slower, costlier, harder to reason about, and far more difficult to govern.

This is not an argument against agents. Good agent systems can absolutely outperform brittle rule-based automations when tasks involve ambiguity, multiple steps, and coordination across tools. The problem is that the real threshold is rarely whether you can wire up a loop. The threshold is whether you know when an agent is actually warranted, where autonomy should stop, and how the system will be governed once it touches production.

That is why this piece starts from a less glamorous but more useful position:

**agents are not magic. In many situations, the thing you need is not more autonomy but clearer guardrails, evaluation, KPIs, and operating governance.**

## First correction: an agent is not an AI personality that “figures everything out”

OpenAI’s agent guide is refreshingly pragmatic on this point. Agents are not described as mystical autonomous entities. They are workflows in which a model reasons through a task, calls tools, and may continue in a loop until an exit condition is reached. Anthropic’s guidance lands in a similar place: the most successful agent implementations are often built from simple, composable patterns rather than elaborate frameworks.

That framing matters because it keeps the discussion grounded.

If I had to decompose an agent into the smallest useful parts, I would use the structure already present in your own notes:

- planner,
- executor,
- tools,
- memory or state,
- guardrails,
- fallback. fileciteturn22file3

That decomposition is practical because it reminds us that an agent is never “just a better prompt”. It is several operational layers working together.

## When an agent is actually worth building

My own threshold is fairly conservative.

I only seriously consider an agent when a task satisfies all three of the following conditions.

### 1. The work is genuinely multi-step and conditionally dependent

For example:

- retrieve usage metrics,
- calculate ROI,
- compare against anomaly thresholds,
- write a summary for operations,
- decide whether to escalate or hand off.

A rigid workflow engine can handle some of that, but once dependencies and exceptions accumulate, the value of an agentic loop becomes more credible.

### 2. The task involves ambiguity rather than a single deterministic transformation

If the job is “extract these fields into JSON”, you do not need an agent. Part 2’s schema, validator, and retry discipline is enough.

If the job is simply “look up the policy and answer”, retrieval is often enough.

Agents become useful when the task requires judgement across steps, not just more steps.

### 3. The business value is high enough to justify the added operational burden

OpenAI’s guide puts it plainly: first meet your accuracy target, then optimise for cost and latency. In PM language, that means you should only buy more complexity for use cases where the value warrants it.

So the question is not whether you can build an agent. It is whether the use case deserves the cost, delay, and governance overhead that comes with one.

## When you should not use an agent

This is usually the more important question.

Your notes already point to the right concerns: stability, cost, latency, controllability, and auditability. fileciteturn22file3 I would group them into four common scenarios.

### 1. The task is solved in one step

If the system is doing extraction, classification, summarisation, or format conversion, an agent often adds more loop overhead than value.

### 2. The task boundaries are still unclear

Many teams reach for agents before they have even clarified the use case, the owner, or the failure conditions. At that point autonomy does not solve ambiguity. It automates ambiguity.

### 3. The action risk is high and the safeguards are thin

Refunds, payments, record changes, outbound emails, and customer-facing decisions should not be delegated to an agent until whitelist logic, validators, approval gates, and data controls are in place.

### 4. What you actually lack is governance, not autonomy

A large number of pilots do not fail because the model is weak. They fail because no one can answer practical questions such as:

- what happens when this fails,
- who is accountable,
- what data it is allowed to touch,
- what actions must never be automated,
- how it will be monitored,
- how incidents will be replayed and investigated.

OpenAI’s 2026 governed agents cookbook captures this tension extremely well. It argues that organisations are no longer stuck on whether to experiment with AI, but on whether they can deploy it safely and prove that it is controlled. Its most useful line is arguably the simplest one: **governance drives delivery**.

That point is worth dwelling on. Governance is often treated as a brake. In enterprise settings it is frequently the opposite. Clear guardrails and explicit accountability are what allow systems to move from pilot to production at all.

## The heart of an agent is not planning. It is control.

Planning is the part people tend to romanticise. Teams love talking about whether the model can break work into steps, revise a plan, and reason about next actions.

Those capabilities matter, of course. But in production they are rarely the thing that decides whether the system survives.

The thing that decides that is usually guardrails.

OpenAI’s cookbook puts this simply: guardrails exist to ensure agents behave safely, consistently, and within intended boundaries.

The guardrails I care about most are these five.

### 1. Action whitelists

Define what tools or actions the agent is allowed to use. Anything outside that list should be impossible by design.

### 2. Parameter and output validators

A valid-looking tool call is not necessarily a safe one. A valid-looking JSON response is not necessarily something you should trust downstream. Validators turn plausibility into enforceable checks.

### 3. PII and sensitive-data controls

Your notes were right to make email, phone, and ID masking a first-class guardrail. fileciteturn22file3 In many real deployments the most serious issue is not a slightly wrong answer. It is an agent touching the wrong data or exposing information that should never have left a controlled context.

### 4. Bounded retries

A failure may justify one retry, perhaps two. It should not create an endless loop that burns budget, time, and trust.

### 5. Replayable logs

If an agent fails and you cannot replay the path it took, you do not have a production system. You have a black box with a good demo.

## Multi-agent is not inherently more mature

One of the more persistent myths in agent discourse is that multi-agent systems are somehow more advanced by default.

OpenAI’s guidance is much more sober: maximise a single agent’s capabilities first. Multiple agents can give you cleaner separation, but they also introduce more complexity and overhead.

I think that is the right default.

Multi-agent starts to make sense when:

- there are many tools and the domains are genuinely distinct,
- a manager versus specialist pattern fits the workflow,
- a single agent has already become unreliable because tool overlap and instruction complexity are too high.

Otherwise, one well-bounded agent with clear prompt templates and policy variables is often the healthier design.

## Without evals, there is no real governance

When teams talk about governance, they often jump straight to legal review, policy documentation, or risk registers. Those matter, but governance is flimsy without evaluation.

OpenAI’s evaluation guidance makes the key point plainly: generative AI is variable and non-deterministic, so traditional software testing methods are insufficient. Evals are how you measure accuracy, performance, and reliability in the face of that variability.

That is especially important for PMs.

In conventional software, correctness is often a binary condition. In LLM systems, many failure modes are subtler:

- the format is compliant, but the answer is useless;
- the answer is mostly right, but the citations do not support it;
- the tool chosen was correct, but the arguments were wrong;
- the answer quality is fine, but latency kills adoption;
- the model performs adequately, but the total cost makes rollout irrational.

So evals are not just “model tests”. They are the means by which the whole system is made measurable.

Your own notes already contain the right PM-grade metrics to support that layer:

- format compliance rate,
- task success or accuracy,
- latency,
- cost,
- adoption,
- risk incidents. fileciteturn22file0

Those are far more useful than waving around benchmark scores, because they are the metrics that actually determine whether a workflow should ship.

## KPIs are not reporting theatre. They are preconditions for shipping

If I had to explain an LLM or agent initiative to a C-level audience, I would split KPI design into four layers.

### 1. Quality

- task success rate,
- accuracy,
- citation correctness,
- abstention correctness.

### 2. Structural reliability

- format compliance,
- tool-call validity,
- retry rate,
- fallback rate.

### 3. Operational health

- P50 and P95 latency,
- cost per run and monthly cost,
- adoption, return usage, and coverage.

### 4. Risk

- PII incidents,
- unsafe action attempts,
- manual escalation rate,
- user-reported failure severity.

This is valuable because it stops “the model is smart” from becoming the only success criterion.

A system may be 80% accurate and still be unsuitable for production if the format drifts constantly, retries spike, latency is poor, or the economics are weak.

## Governance lands in event schemas, reporting pipelines, and responsibility maps

One of the strongest parts of your notes is the Day 7 material, precisely because it handles the unglamorous side of shipping:

- event schema,
- ETL,
- BI dashboards,
- RACI,
- RAID log. fileciteturn22file4

That matters because governance is not just a policy document or a safety slide. It eventually becomes operational infrastructure:

- what gets logged on every run,
- which steps fail most often,
- which market has the weakest adoption,
- which use case is most expensive,
- which incidents trigger escalation,
- who is accountable and who merely needs visibility.

That is also why NIST’s AI RMF and its generative AI profile are worth reading. Not because they tell you how to prompt, but because they frame trustworthiness and risk management at the organisational level rather than at the model-call level.

I think of this as a different kind of scaffolding.

Not scaffolding that slows teams down, but scaffolding that lets them move beyond pilots without pretending that confidence is the same thing as control.

## A practical PM operating model

If you are taking an AI productivity initiative from proof of concept to production, this is the order I would use.

1. **Decide whether this is truly an agent problem.**  
   In many cases structured outputs plus tools are enough.

2. **Define action and data boundaries first.**  
   Draw the whitelist before building the “universal assistant”.

3. **Write down the failure modes.**  
   Missing information, tool failure, PII exposure, wrong tool selection, runaway loops. Each one needs a fallback.

4. **Run evals before talking about scale.**  
   No baseline metrics, no rollout conversation.

5. **Design the event schema and dashboard early.**  
   Logging is not something to add once the system is mature. It is how the system becomes governable.

6. **Assign responsibility.**  
   Someone owns accuracy. Someone owns policy. Someone owns the human handoff process. These are not the same role.

That operating model is usually worth more than saying “we built an agent”.

## Final point: the most mature PM is not the one who automates everything

If the earlier parts of this series were about:

- prompt engineering not being the whole story,
- schemas acting as output contracts,
- tool calling and retrieval reconnecting models to the real world,

then Part 4 is really about the final judgement call:

**the most mature PM is not the one who turns every workflow into an agent first. It is the one who knows what should be automated, what needs guardrails, what should remain human, and what needs governance before scale.**

Agents are not magic.

But when they are used for the right class of problem, bounded by clear guardrails, evaluated with meaningful KPIs, and supported by real operational governance, they stop being impressive demos and start becoming systems an organisation can actually live with.
