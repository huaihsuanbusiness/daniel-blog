---
title: "LLM Application Engineering and Governance for PMs Part 1 － Beyond Prompt Engineering: What PMs Are Actually Doing When They Put LLMs into Products and Workflows"
description: "- You already use ChatGPT, but you’re now trying to wire LLMs into a product, an internal workflow, or some form of automation
- You keep hearing prompt engineering, RAG, tool calling, agents, and it "
categories: ["ai"]
tags: []
date: 2026-04-05T16:25:00
series: "LLM Application Engineering and Governance for PMs"
seriesOrder: 1
---

Who this is for:

- You already use ChatGPT, but you’re now trying to wire LLMs into a product, an internal workflow, or some form of automation
- You keep hearing prompt engineering, RAG, tool calling, agents, and it all sounds like one giant stew
- You’re a PM, an ex-engineer, an AI PM, or working in PMO, and you’re trying to work out where these things actually begin and end

If this topic is new to you, start here. This piece is not about a single technique. It is about drawing the map.

## The one sentence I want to pin the whole article to

A lot of teams think they’re doing AI when, in practice, they’re just polishing prompts inside a chat window.

That still has value. Prompt engineering matters. Without decent prompts, plenty of ideas do not even survive the PoC stage. The trouble begins when you want to connect the model to product surfaces, company data, permissions, costs, and real operational responsibility. At that point, you are no longer just doing prompt engineering.

You are doing something broader:

**LLM application engineering and governance.**

In other words, you are no longer only writing instructions. You are designing a system that can be consumed, observed, repaired, audited, and governed.

## I used to think a better prompt would get me most of the way there

That is the natural starting point.

- clarify the prompt
- add a couple of examples
- tighten the format
- tell the model to say “I don’t know” when it does not know

All of that is sensible, and often useful. The role / task / constraints / output format / examples pattern in your notes is a genuinely practical way to get early tasks under control. For classification, extraction, or summarisation, it is already much better than tossing vague instructions at a model and hoping for the best.

But once I started wiring these systems into real workflows, the boundary became obvious. Some problems are prompt problems. Others simply are not.

Anthropic says this quite plainly in its prompt engineering documentation: **not every failing eval is best solved through prompt engineering.** In some cases, latency or cost are better addressed through model selection rather than prompt changes. That is a quietly important point. It means the official docs are already telling you that prompting is not the universal wrench.

OpenAI’s documentation structure points in the same direction. Prompt engineering, structured outputs, function calling, tools, and evals are presented as separate capabilities. They are related, but they are not interchangeable.

That is why I now treat prompt engineering as the first layer, not the whole building.

## The way I’d split the building: five layers of responsibility

If you asked me what PMs are actually doing when they put LLMs into products and workflows, I’d frame it as five layers.

### Layer 1: the interaction layer

This is the part most people recognise as prompt engineering.

Here you are working on:

- role
- task
- constraints
- output format
- examples
- few-shot patterns
- delimiters
- rubrics
- self-check instructions

This layer works well for:

- one-off summarisation
- lightweight classification
- copy rewriting
- low-risk extraction
- early PoCs where you are still trying to understand the shape of the problem

If your task is “classify this support request into Billing, Bug, or Feature Request” or “pull the email and deadline out of this messy message”, prompt engineering may well be enough, at least at first.

But the limitations show up quickly:

- a response that looks sensible may still be impossible for downstream systems to consume
- a response that is usually formatted well may still drift
- a response that is structurally fine may still be logically wrong
- none of that touches permissions, cost, auditing, or replayability

### Layer 2: the output-contract layer

This is where you move from “humans can read it” to “systems can trust it”.

You no longer say only, “please answer in JSON”. You start defining:

- a schema
- required fields
- enums
- types
- additional property rules
- validators
- retries
- fallbacks

You are, in effect, turning a prompt into an **output contract**.

That shift is bigger than it sounds. Once the output needs to flow into CRM, ticketing, reporting, BI, or any other downstream system, free-form text becomes charming and dangerous in roughly equal measure.

Your note that “fixed JSON is the first ticket to enterprise adoption” is, frankly, dead right. The reason is not that it sounds more engineering-heavy. The reason is that it turns model output from “something resembling an answer” into “a verifiable data object”.

This is also why OpenAI broke Structured Outputs out into a distinct capability. JSON mode and schema-constrained output are not the same thing. One gives you output that looks a bit more like JSON. The other gives you a real contract.

### Layer 3: the tool layer

At this point the model is no longer only generating answers. It is deciding **when to call tools**.

That may mean:

- calculating ROI
- fetching usage metrics
- calling an internal API
- creating a ticket
- updating a CRM record
- performing web search
- using file search

Now the problem is no longer “is the prompt clear enough?” The problem becomes:

- which tools are allowed
- which ones are not
- how arguments are validated
- how results are logged
- who actually executes the tool
- what happens if the call fails

This is why your notes distinguish tool spec, tool_call, and tool_result. That is not pedantry. It is the point at which the responsibilities become clean enough to reason about: **the model decides and fills arguments; deterministic tools do the actual work.** Calling all of this “prompt engineering” undersells it. You are now orchestrating an application.

### Layer 4: the grounding layer

When people hit hallucinations, the first instinct is often to add more prompt instructions.

Sometimes that helps. Often it does not.

If the task depends on company policy, internal SOPs, product docs, legal documents, or pricing information, the issue is usually not that the prompt is too weak. The issue is that the model does not have the right context in the first place.

That is when you move into RAG:

- chunking
- embeddings
- vector search
- top-k retrieval
- reranking
- citations
- confidence handling

You are no longer asking the model to become cleverer in the abstract. You are asking it to **retrieve the right material first** and only then answer.

This layer is what pulls the model back from sounding plausible and forces it to sit down in front of evidence.

### Layer 5: workflow and governance

Climb one level further and you are into agents, state, memory, guardrails, fallback, evaluation, KPIs, event schemas, dashboards, RACI, and RAID logs.

At that point, you are not merely “using an LLM”.

You are designing:

- multi-step workflows
- observability
- permission boundaries
- risk handling
- cost and latency trade-offs
- impact reporting that an executive can actually understand

This is also the layer most likely to get turned into glittery slides full of arrows and glowing boxes.

The hard bit, though, is not “can we get an agent to run?” The hard bit is:

- when not to use an agent at all
- which tasks are really one-step tasks
- which actions are too risky to automate
- what fallback looks like when guardrails are incomplete
- how to measure format compliance, accuracy, latency, cost, and risk incidents

Without this layer, plenty of LLM projects end up looking impressive in a demo and brittle in reality.

## Why a “better prompt” is often not enough

Because it usually solves only first-layer problems.

Real failures often happen somewhere else.

### 1. The issue is not the answer. It is that the system cannot consume it.

This is probably the most common failure mode, and one of the most underestimated.

The output looks “basically fine” to a person. The engineer looking at the logs wants to close the laptop. One field is missing, an enum drifted, a number came back as a string, and the whole workflow jams.

### 2. The model is not the right place to do the calculation

A classic example is an ROI assistant.

If you let the model do the maths itself, the first result may look completely convincing. It may even sound more polished than the real thing. Then you keep the logs and notice what is going wrong:

- identical inputs do not always produce identical calculations
- formulas drift
- assumptions move around
- rounding rules change

That is harmless in a slide deck. It is not harmless in a system.

### 3. The problem is not intelligence. It is access to the right data.

If the answer should come from internal policy, company docs, or a knowledge base, hallucination is often not a matter of the model being “too creative”. It is a matter of asking it to sit a closed-book exam that should have been open-book.

### 4. The issue is not capability. It is the lack of boundaries.

The more a system can call tools and perform multi-step tasks, the more it needs whitelists, validators, PII masking, bounded retries, fallback rules, and logging.

Without that, an agent can start to resemble an extremely motivated intern who somehow found the corporate card.

## So when is prompt engineering enough?

Quite often, actually.

I’d go further: many teams jump too quickly into RAG and agents when the task really only needs a disciplined prompt.

### Usually enough:

- low-risk, single-step tasks
- outputs read by humans rather than ingested by systems
- cases where manual review is expected anyway
- early-stage usefulness validation
- tasks that do not depend on external real-time data or proprietary internal knowledge

Typical examples include:

- meeting summaries
- first-pass classification
- rough extraction
- draft generation
- early research synthesis

If you jump straight to agents here, the build may be technically possible and operationally wasteful.

## When can you no longer pretend this is just a prompt problem?

I look for three signals.

### Signal 1: the output must be machine-consumable

The moment the output is meant to be consumed by a downstream system rather than simply read by a person, prompting alone is no longer enough. You need a contract.

### Signal 2: the answer depends on external data or real actions

If the system has to look things up, perform calculations, update records, or call APIs, you are no longer in pure prompt territory. You need tools or retrieval.

### Signal 3: you are now responsible for cost, risk, and governance

The moment the conversation turns into “can this go live?”, “who reads the logs if it fails?”, “how do we mask PII?”, “what is the monthly cost?”, or “how do we measure success?”, you are no longer talking about prompting in isolation. You are doing AI system design.

## The judgement I want to leave you with

So if you ask me:

**What counts as really putting an LLM into a product or workflow?**

My answer is not “using an agent” or “adding RAG”.

My answer is this:

**the work stops being just prompt engineering once you become responsible for output contracts, tool boundaries, grounded knowledge access, failure recovery, cost, observability, and governance.**

Prompts matter. They are the first layer.
What makes the system shippable is whether you build the layers above it.

That is why I prefer the name **LLM application engineering and governance**. It is more accurate, and a fair bit more honest.

## When not to make the problem sound bigger than it is

One last boundary, because otherwise this starts to sound like engineering maximalism.

Not every AI feature needs to be framed as a systems project.

If you are only:

- building a useful summarisation prompt for the team
- creating an internal brainstorming assistant
- running a temporary PoC
- still exploring the use case before you have even aligned on users

then please do not rush to present yourself as building an agents platform.

Sometimes the mature move is not drawing the diagram larger. It is knowing when to stop at layer one, and when it is worth climbing to layer two or three.

That judgement is product work in its own right.

## What the next piece will cover

The next article zooms into the second layer, the one most teams underestimate even though it is often the first thing that makes an LLM feature genuinely deployable:

**the move from prompting to output contracts.**

In other words: why JSON schemas, validators, retries, and fallbacks are not engineer fussiness, but the first real ticket to enterprise adoption.
