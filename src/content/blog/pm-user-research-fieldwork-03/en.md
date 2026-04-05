---
title: "PM User Research and Fieldwork 03 － Not Every Research Session Is an Interview: User Interviews, Usability Tests, Field Studies, and Diary Studies Serve Different Jobs"
description: "Method piece / method-selection piece"
categories: ["pm"]
tags: []
date: 2026-04-05T16:16:00
series: "PM User Research and Fieldwork Series"
seriesOrder: 3
---

## Article type

Method piece / method-selection piece

## The one thing this piece is trying to say

A surprising number of PMs do not fail because they avoid research. They fail because they call too many very different methods “interviews”.

That is how you end up spending an hour discussing someone’s working life when what you really needed to know was why a task flow breaks down. Or bringing someone into a meeting room to “test” a workflow that only makes sense in a live workplace. Or running a single interview when the real question is how a behaviour repeats over days or weeks.

**Choosing the wrong method is not merely inefficient. It gives you evidence that looks insightful while answering the wrong question.**

So this piece is not meant to be a tidy glossary. It is meant to give PMs a firmer grip on the job boundaries of four methods they will run into again and again:

- user interviews
- usability tests
- field studies
- diary studies

You do not need the heaviest method every time. You do need to know what kind of evidence is actually missing.

## Start with the most useful question: what are you trying to learn?

I find it helpful to split research questions into four broad shapes.

### 1. You want to understand how users frame the problem

That usually points towards a **user interview**.

You care about things like:

- how they describe the job they are trying to get done
- how they talk about goals, concerns, trade-offs, and alternatives
- how they understand the category
- which parts of the journey feel risky, frustrating, or uncertain

The point here is not whether they clicked the right button. It is how they interpret the world around the problem.

### 2. You want to know whether a design or workflow is actually usable

That usually points towards a **usability test**.

You care about things like:

- can the participant complete the task
- where do they hesitate
- where do they misread something
- where do they backtrack
- where does wording, structure, or interaction design create failure

This is not the moment for a broad conversation about beliefs and aspirations. It is the moment to observe whether a concrete task succeeds or falls apart.

### 3. You want to understand how real-world conditions shape behaviour

That usually points towards a **field study**.

You care about things like:

- what environment the work happens in
- which people, tools, constraints, and interruptions surround it
- how users actually stitch the work together in practice
- which frictions do not live inside the interface at all
- which workarounds are invisible in a staged session

The value here is context, not merely interface performance.

### 4. You want to know how something repeats over time

That usually points towards a **diary study**.

You care about things like:

- how the same issue recurs across days or weeks
- how emotions, decisions, and workarounds shift from one instance to the next
- how small high-frequency frictions accumulate over time
- whether a pain point appears only at certain moments, places, or stages in a broader journey

That is not something a single session will show very clearly, because what you are missing is longitudinal evidence.

## What these methods are actually for

### User interviews: for language, meaning, and mental models, not for judging flow usability

Interviews are most useful when you are still trying to understand:

- how users frame the job
- how they describe the problem
- what they currently do instead
- how they rank value, risk, and switching cost

If you are working on activation, value proposition, jobs to be done, switching, or purchase anxiety, interviews are often a strong choice.

What they are not especially good at is answering questions such as:

- is this new interface genuinely easy to use
- can people find a feature in the flow
- will this form field cause confusion or error

People are generally far better at explaining themselves than predicting themselves. And once a prototype appears on the table, the session can drift into commentary rather than evidence.

A more pointed way to say it is this:

**user interviews help you understand how users think, not substitute for how they behave.**

### Usability tests: for observing task failure, not for broad life stories

The centre of gravity in usability testing is the task.

You set up a realistic scenario, give the participant a relevant goal, and observe:

- whether they complete it
- where they stall
- where they choose the wrong path
- where they need extra interpretation
- where they believe they have succeeded when they have not

It is a strong fit for questions like:

- which step in onboarding creates the most misunderstanding
- where pricing or policy details derail booking
- how paywall language makes people hesitate
- whether filters are discoverable and comprehensible

It is not the best fit for questions like:

- how users generally think about this market
- why they have not switched tools over six months
- what organisational constraints shape their work

If you force those questions into a usability session, the evidence usually comes back too thin. The method is task-led by design.

### Field studies: for understanding work in the real world, not for maximising session control

The biggest advantage of a field study is that it pulls you out of the meeting room.

You get to see the workplace, the home setting, the physical paperwork, the shared device, the interruptions, the handoffs, the side conversations, and the constraints people do not always think to mention.

That is where you start noticing things with unusually high product value:

- workarounds are often more informative than complaints
- the switch between tools may matter more than the task inside your tool
- the “product problem” may only be one small segment of a much larger workflow
- what looks like a UX issue may actually be permissions, procurement, billing, shift handover, family sharing, or paper-based process

If your product lives in B2B, frontline operations, healthcare, finance, travel, education, or internal tooling, field studies can be especially revealing.

That said, they are not a magical upgrade. They are harder to organise, more expensive to run, and easier to over-romanticise. Seeing a lot is not the same as knowing what matters most.

### Diary studies: for repeated, fragmentary, long-horizon behaviour, not as a lazy replacement for observation

Diary studies are often described too casually, as if they were simply “asking participants to write things down”.

The hard part is not the tool. It is the design.

A diary study is genuinely useful when:

- the same kind of event happens repeatedly but briefly
- you need to understand behaviour across settings, times, or emotional states
- a one-off interview would suffer badly from recall bias
- you cannot feasibly be present every time the behaviour occurs

For example:

- how someone narrows a shortlist of hotels across several search sessions
- how information gets lost across multiple team handoffs in a week
- how users move between phone, desktop, paper, and messages over time
- how a support issue gradually becomes a reason to churn

The strength of diary studies is that they reveal patterns that a single session cannot.

But they are also very easy to do badly. Loose prompts, participant burden, poor cadence, or badly chosen incentives can all leave you with thin, distorted, or performative data.

## What PMs often confuse is not the names, but the evidence type

A practical way to compress the difference is this:

- **interviews** show you how users talk about the work
- **usability tests** show you how they attempt the work
- **field studies** show you the context in which the work sits
- **diary studies** show you how the work unfolds over time

All four perspectives matter. None is a clean replacement for another.

You cannot use “they explained it clearly in the interview” as a substitute for “they can actually do it in practice”.
You also cannot use “they managed it once on the prototype” as a substitute for “they will do this in a noisy office, on a commute, with other tools and other people involved”.

## So how should a PM choose?

I would begin with three questions.

### First: are you missing language, behaviour, context, or time?

If you are missing:

- language and framing, start with interviews
- task behaviour and usability, start with usability testing
- situational context and workflow, start with field research
- repetition and longitudinal change, start with diary methods

A lot of poor method choice comes from skipping this step.

### Second: is the problem inside the product or outside it?

If your issue is concentrated inside the interface, such as:

- an unclear CTA
- messy entitlement copy
- an overly complicated onboarding flow
- filters that are hard to find or interpret

then usability testing is often enough.

But if the problem clearly extends beyond the product, such as:

- decisions requiring input from others
- data moving between multiple tools
- work being constantly interrupted
- physical, organisational, or domestic conditions shaping the outcome

then interviews or field studies usually matter more.

### Third: are you trying to understand a moment or a trajectory?

If you care about a single screen, one flow, or one task, a diary study is usually excessive.

But if you want to understand things like:

- how people return repeatedly over a week
- how a pain point accumulates rather than appearing all at once
- how reminders land differently at different moments
- how behaviour changes between weekdays and weekends, or mobile and desktop

then a diary study starts to earn its keep.

## A few common misuses

### Misuse 1: treating usability testing as market research

Teams sometimes bring a prototype into a session and ask:

- do you like this product
- would you pay for it
- how do you usually think about this kind of service

That tends to leave both sides disappointed. The task evidence is too shallow, and the motivational evidence is too shallow as well.

### Misuse 2: treating interviews as bug triage

If the problem already looks like a fairly specific flow failure, a usability test, data review, or direct fix is often more useful than a broad interview round.

### Misuse 3: treating field studies as premium interviews

Going on site is not useful merely because the backdrop feels more authentic. The value comes from observation, artefacts, interruptions, handoffs, and workarounds. Without those, an on-site interview is often just a more expensive interview.

### Misuse 4: treating diary studies as cheap long-term research

A diary study is not a budget version of ethnography. It still requires careful design, participant discipline, thoughtful prompts, and sensible engagement mechanics. If you do it lazily, you tend to get back a pile of watery fragments.

## How I would connect this back to the PM workflow

These methods should not live in a separate universe from your analytics, funnel work, and segmentation. They should work with them.

A healthier flow usually looks something like this:

1. use analytics or support signals to find the hotspot
2. decide whether the missing layer is meaning, usability, context, or time
3. choose the method accordingly instead of automatically saying “let’s run interviews”
4. translate findings back into:
   - sharper tracking
   - better segmentation
   - cleaner hypotheses
   - more realistic JTBD and pain framing

When the method is well chosen, the research does not merely sound interesting. It changes decisions.

## Where this piece stops

If this piece has done its job, the next time you design a research round you should be slightly less likely to cram everything into the same type of session.

The next piece moves to an even more operational problem, and one that is very easy to get wrong:

**recruitment is not about rounding up five people. It is about finding the right participants, screening them properly, and avoiding the wrong ones.**
