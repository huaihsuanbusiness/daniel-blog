---
title: "LLM Application Engineering and Governance for PMs Part 2 － From Prompt to Output Contracts: Why JSON Schemas, Validators, and Retries Are the First Ticket to Enterprise LLM Adoption"
description: "- You have already written prompts and started to notice that “looks right to me” and “the system can rely on it” are two very different standards
- You are building classification, extraction, summar"
categories: ["ai"]
tags: []
date: 2026-04-05T16:26:00
series: "LLM Application Engineering and Governance for PMs Series"
seriesOrder: 2
---

Who this is for:

- You have already written prompts and started to notice that “looks right to me” and “the system can rely on it” are two very different standards
- You are building classification, extraction, summarisation, intake, ROI estimation, or triage flows that feed into downstream processes
- You are a PM, engineer, AI PM, or PMO practitioner trying to drag a PoC one step closer to production

If the previous article drew the map, this one digs into one of the most underestimated roads on it.

## Let me state the unglamorous bit plainly

The first ticket to enterprise adoption is rarely how clever the model sounds.  
It is whether the output can be **consumed reliably downstream**.

That is not a dramatic line. It is just the line that decides whether the project moves or stalls.

A lot of PoCs do not fail because the answer is not articulate enough. They fail because of things like:

- the JSON looks plausible but does not parse
- the fields are present but the enum values drift
- the structure is valid but the semantics are contradictory
- retries quietly inflate cost
- the team ends up copy-pasting results by hand, which means the automation is basically decorative

Your notes compress this rather neatly into one idea: the prompt has to become a specification. I think that is exactly the right framing. Once you reach this point, the job is no longer to make the model sound more like an answer. The job is to turn the output into a **verifiable, repairable, governable interface**.

## Why “please answer in JSON” is nowhere near enough

The first instinct is usually something like this:

> Please return JSON with title, department, and risk_level.

That is better than free-form text. It is still not much of a contract.

If you actually need a system to consume the output, the model may still:

- invent an extra field you never asked for
- return `medium` instead of `Med`
- send a number back as `"12 hours"`
- flatten an array into a comma-separated string
- wrap the payload in explanatory prose
- fill missing values by guessing instead of using null

Inside a chat interface, those mistakes often look small. Inside an application, they are exactly the sort of pebble that jams the gears.

So the real question is not whether the model can “do JSON”. The real question is whether you have defined a contract tightly enough that the system can trust the output.

## The way I think about that contract: four gates

If I had to compress the whole topic into one practical frame, I would treat enterprise-ready output handling as four gates.

### Gate 1: the schema

This is the outermost gate, and the easiest to explain.

You define:

- which fields exist
- which are required
- which types they use
- what the valid enum values are
- whether additional properties are allowed
- numeric limits
- array requirements

This is the bit that most resembles a proper spec.

OpenAI’s Structured Outputs feature is essentially this idea formalised: the model is asked to produce output that conforms to a supplied JSON Schema, rather than merely outputting something JSON-shaped. That distinction matters. JSON mode gives you a nudge towards valid syntax. A schema gives you a contract.

### Gate 2: the validator

A schema is useful. It is not sufficient.

Some failures sit above the schema layer:

- `estimated_time_saved_hours_per_week = 9999`
- `department = "Operations"` when your system only allows `Ops`
- `risk_level = Low` even though the text clearly describes sensitive data and automated outreach
- the user says the process saves 20 hours a week and 3 hours a month in the same input
- the output includes an email address, phone number, or ID that should not leave the boundary

That is where a validator comes in.

At this point you are not only checking **structure**. You are also checking:

- whether the payload parses
- whether required keys are present
- whether keys are missing or extra
- whether enums are valid
- whether numeric ranges are plausible
- whether business rules conflict
- whether PII has leaked into the output

I really like one sentence from your notes:

> I want the system not to blow up even when the input is messy.  
>

That is the validator mindset in one line.

### Gate 3: retry

A lot of people know they need retries. Far fewer implement them sensibly.

The common anti-pattern is a sort of ritualistic loop: if the output is wrong, call the model again. If it is still wrong, call it again. The result is an application that looks diligent and bills like a leaking pipe.

I prefer **bounded retries** with a very specific repair goal for each attempt.

For example:

- Retry #1: point out the schema violation and ask for valid JSON only
- Retry #2: tighten the instruction further, allow only strict JSON, and force conservative defaults

After that, stop. Fall back.

Because the purpose of retry is to **repair format**, not to let the model repeatedly hope that maturity will emerge by accident.

### Gate 4: fallback

This gate is easy to neglect and wildly important in production.

If the structure is still broken, the data is insufficient, the risk is too high, the PII handling is incomplete, or the fields conflict, the system needs a graceful way out.

That may mean:

- returning a conservative default JSON object
- setting `confidence = Low`
- listing the missing information explicitly
- routing the case to human review
- refusing to update the downstream system and only producing a draft

The value here is not elegance. It is collision avoidance.

## A very practical example: use-case intake is perfect for this

Your notes use “use case intake + ROI estimation” as the Day 3 and Day 4 exercise. That is a very smart choice because it lives right in the zone where LLMs are most frequently overestimated.

On the surface, it sounds like a straightforward extraction task:

- use_case_title
- department
- estimated_time_saved_hours_per_week
- risk_level
- next_steps

In practice, these flows break in very ordinary ways:

- the title is vague
- department labels vary
- the time-saved estimate is inconsistent
- the risk level requires actual rules rather than vibes
- next_steps drift into airy consultancy prose

If you let the model answer freely, it may produce something that reads like a competent note. If you want that output to feed a dashboard, a roadmap, or a weekly review, you need a contract.

That is why this example is so useful. It exposes the difference between “the prompt sounds good” and “the system is operationally usable”.

## Why format compliance deserves its own metric

Teams doing PoCs often focus on two questions:

- does the answer look right
- do users like it

Both matter. Neither is enough.

Your notes call out **format compliance rate**, and I think that is a very sensible metric to isolate.

Because it answers a more primitive question:

**is the output stable enough to be relied on by the workflow at all?**

If semantic accuracy is decent but format compliance is 70%, you probably should not connect the system directly to anything important yet. On the other hand, once the structure is stable, the validators are mature, and the fallback path is clear, you have a far safer foundation for semi-automated use, even if semantic performance is still being improved.

That is why stable formatting is not a side issue. It is part of the foundation for adoption.

## Structured Outputs help a lot. They are not the whole story.

A boundary is worth making explicit here, otherwise this turns into tool worship.

Structured Outputs are genuinely useful. They are not a miracle.

They help with problems like:

- missing required keys
- drifting enum values
- invalid structure
- JSON parse failures

They do not solve things like:

- whether the business logic makes sense
- whether the numbers contradict each other
- whether the risk classification follows your company’s policy
- whether PII should have been masked
- whether the output should be reviewed by a human before anything changes downstream

So I would not describe Structured Outputs as a replacement for validators. I would describe them as the thing that finally lets your validators stop sweeping broken syntax off the floor.

## When you do not need to make this so rigid

A counterexample matters here, otherwise the piece becomes engineering maximalism.

Not every task requires schema + validator + retry + fallback in full.

### Usually not worth the full stack:

- summaries that are only read by humans
- one-off internal brainstorming
- early discovery work
- flows that are nowhere near a downstream system
- low-volume tasks that will definitely be reviewed manually anyway

If you are writing an executive briefing draft that will be rewritten by a person regardless, you may not need a formal JSON contract first.

This layer becomes worth it when:

- the output is reused repeatedly
- it feeds a system
- it is measured
- it creates cost or risk
- you genuinely want the model to act as a component rather than merely a helper

Without those conditions, stopping at the prompt layer is often the more mature choice.

## The judgement I want to leave you with

So if you asked me:

**When have you truly moved beyond prompting and into enterprise-grade LLM delivery?**

My answer would be this:

**the moment you stop asking only “how do I make the answer better?” and start asking “how do I make this output reliably consumable, verifiable, repairable, and recoverable?”**

That is when prompting turns into output contract design.

And the backbone of that contract is usually the same four-part structure:

- schema
- validator
- retry
- fallback

At that point you are no longer merely asking the model to behave well. You are defining how the surrounding system will catch, repair, constrain, and absorb its behaviour.

## What the next article will cover

The next piece moves one layer up into:

- tool calling
- deterministic tools
- retrieval
- RAG
- citations

In other words, why many tasks do not improve because the model is “smarter”, but because the system learns when to look things up, when to call a tool, and when to stop improvising.
