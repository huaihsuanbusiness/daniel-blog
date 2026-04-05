---
title: "PM Product Data and Experimentation 06 － Retention, Cohorts, and Segmentation: Knowing Who Stays Matters More Than Watching the Average"
description: "A product can look healthier than it really is simply because averages are excellent at cosmetics."
categories: ["pm"]
tags: []
date: 2026-04-05T16:05:00
series: "PM Product Data and Experimentation Series"
seriesOrder: 6
---

A product can look healthier than it really is simply because averages are excellent at cosmetics.

Overall D7 retention has not collapsed.  
Average conversion still looks respectable.  
A few dashboard lines are even pointing upwards.

If that is all you look at, it is dangerously easy to conclude that the product is probably fine.

Real life is usually messier.

New users may be getting worse while older users keep the average afloat.  
One high-quality acquisition source may be improving while other channels quietly deteriorate.  
A small group of heavy users may be masking the fact that a much larger group is slipping away.

That is why PMs tend to discover quite quickly that **retention, cohorts, and segmentation are not three separate bits of analytics jargon. They are a combined way of dismantling the illusion created by the average.**

I think of them like this:

- **Retention** asks whether people came back, and whether they came back consistently enough to matter
- **Cohorts** ask which batch of people came back
- **Segmentation** asks which kinds of people came back, and which kinds did not

If you only look at retention and ignore cohorts and segmentation, you often get an answer that looks objective but is far too blunt to guide product decisions well.

## Retention is not “did they open the app again?” It is “did they return to value?”

A great many teams fall into the same trap at the start of retention work. They define the return event too loosely.

For example:

- any event at all
- app opened
- page viewed

Those definitions are not always useless, but they are often too soft. Soft enough that what you end up measuring is surface activity rather than continuing value.

Mixpanel describes retention as doing one event and then coming back to do another. GA4’s cohort exploration similarly starts from inclusion criteria and return criteria. Different wording, same lesson:

> the core of retention analysis is not whether somebody touched the product again, but what you are willing to count as a meaningful return.

For a booking product, the return event might be:

- another search
- another listing view
- another booking start
- a second successful booking

Those are not interchangeable definitions. They answer different product questions.

If you are studying early retention after activation, `search_performed` or `view_listing` might be sensible.  
If you are studying commercial value, a second successful booking is usually closer to the point.

So I rarely start by asking, “what is your D7 retention?” I would rather ask:

**what behaviour counts as retained in your model, and how close is that behaviour to real product value?**

## D1, D7, and D30 are useful lenses, but they are not the answer

D1, D7, and D30 matter because they give teams a shared language. But they are still only slices of time, not the insight itself.

For some high-frequency products, D1 and D7 are central.  
For lower-frequency, higher-consideration products, D30 or even D60 may be more revealing.  
For content or community products, tools such as GA4 also surface stickiness ratios like DAU/WAU/MAU to help describe engagement, but stickiness is not a substitute for cohort retention.

I find it more useful to think about them this way:

- **D1** often tells you about initial experience and first value
- **D7** often tells you whether an early return habit is forming
- **D30** is closer to medium-term stability

Which one matters most should follow the cadence of your product, not the fashion of product Twitter.

## Cohorts are about separating one batch from another

The real value of cohort analysis is not that the table looks sophisticated. It is that it separates users who arrived at different times or under different conditions.

That matters because many product problems are not total-population problems. They belong to one batch, one release, or one source.

Imagine you review overall D7 retention every week and it sits at roughly 18%.

That single number could describe two completely different worlds.

### World A: every new batch behaves roughly the same

That suggests the product is broadly stable, even if there is still plenty to improve.

### World B: newer cohorts are getting worse while older ones keep the average afloat

In that world, the product is already leaking. The tank just has not emptied yet.

Cohort analysis lets you separate those worlds.

GA4’s cohort exploration groups users based on inclusion and return criteria, then shows subsequent activity by daily, weekly, or monthly cohort granularity. The important reminder here is that **a cohort is not just a chart type. It is a way of looking at changes across batches over time.**

### What PMs should actually look for

I usually start with three questions.

1. **Are recent cohorts getting better or worse?**  
   This tells me whether recent product or acquisition changes are improving the starting experience.

2. **What is the shape of the decay?**  
   Some products lose most people on day one. Others hold on until day seven and then loosen. Those are not the same problem.

3. **Did the cohort shape change after a release or growth push?**  
   An average may move only slightly, but a cohort curve changing shape is often a much stronger signal.

## Segmentation is not slicing for sport. It is how you locate the real difference.

Once cohorts tell you *which batch* is behaving differently, segmentation helps answer another question:

> within that batch, which kinds of users are staying, and which are leaving?

Amplitude describes segmentation in very practical terms: use user segments to analyse how different groups behave in the product. Mixpanel defines cohorts as groups of users who share certain properties or event sequences. Different language again, but the same underlying discipline:

**stop pretending every user is the same kind of user.**

For PMs, the segments I use most often are usually just three categories.

### 1. Source segments: channel, campaign, acquisition source

This category is excellent for a classic question:

**is this a value problem, or a traffic-quality problem?**

If a new paid channel is bringing in a lot of registrations, activation may look reasonable at the top of the funnel. But if D7 retention is markedly worse, the problem may not be onboarding at all. It may be that the promise and the audience do not match.

### 2. Identity or trait segments: country, device, plan, persona

These segments are often useful for questions such as:

- whether certain countries are retained less because supply is thin
- whether one device type has a clearly worse flow
- whether free and paid users return in different patterns

### 3. Behavioural segments: whether users performed a key action

This is often the segment category that gets closest to the real product question.

For example:

- do users who viewed at least five listings have better D7 retention
- do users who save something on day one come back more reliably
- are users who complete a first booking within 24 hours more likely to place another booking within 30 days

At that point, segmentation is no longer just descriptive. It starts helping you identify plausible aha proxies and leading indicators.

## Averages send PMs in the wrong direction surprisingly often

Here is a judgement fork I see all the time.

Suppose overall D7 retention drops from 18% to 16% in a given month.

If you only look at the average, you might jump straight to “retention is worse, we should fix activation”.

But once you break it down, there are at least three very different stories.

### Story 1: every segment dropped together

That looks more like a genuine product-value or experience problem.

### Story 2: only one newly scaled channel dropped sharply

That points more towards traffic quality than product experience.

### Story 3: high-intent users stayed stable, but you simply acquired more low-intent users

In that case, the overall average got worse without the core experience necessarily degrading. The acquisition mix changed.

Those stories require different responses.  
The first may justify product fixes or onboarding work.  
The second may require message, landing-page, or targeting changes.  
The third may require a better definition of success mix rather than a hurried interface tweak.

That is why I often put it this way:

**retention is not just a table. It is a reading framework that helps separate product problems from traffic problems.**

## When not to keep slicing segments thinner and thinner

Segmentation has its own failure mode. Once teams realise it is useful, some of them cannot stop slicing.

That is risky too.

### Do not keep slicing when the sample is tiny

If a segment only contains a very small number of users, the movement may just be noise. The more thinly you slice, the easier it becomes to chase ghosts.

### Do not keep slicing when no action follows

If you segment users into seventeen colours, twelve regions, and eight sign-up windows, but none of those cuts would change product or operating decisions, you are doing data tourism.

### Do not forget the identity model

GA4 explicitly notes that cohort exploration is based on device data and does not use User-ID when creating cohorts. That is a useful reminder that **identity boundaries in the tool directly affect how trustworthy your cohort and segment views are**.

If cross-device identity is weak, some retention and cohort outputs deserve a discount before they deserve your confidence.

## A practical reading order for PMs

If you want a practical sequence rather than a textbook one, I would suggest this.

### Step 1: define the return event

Decide whether you are measuring a return to product presence or a return to value. Get this wrong and the whole analysis leans the wrong way.

### Step 2: choose the right time scale

High-frequency products may start with D1 and D7. Lower-frequency products may need weekly retention, monthly retention, or repeat purchase logic.

### Step 3: look at cohorts before the average

Check whether recent batches are improving or worsening before you settle on the headline number.

### Step 4: segment only along 2 or 3 dimensions that could change action

I usually start with source, key behaviour, and either device or country. Not everything at once.

### Step 5: translate the pattern into a product judgement

You eventually need to come back to a sentence like this:

> is this more likely to be a value problem, a traffic-quality problem, or an identity and data-definition problem?

Without that step, retention analysis often ends as an interesting chart rather than a useful decision.

## How retention analysis usually fails

### Failure 1: counting any event as retention

That usually measures loose activity rather than sustained value.

### Failure 2: looking only at the average and never at cohorts

You discover too late that newer users have already deteriorated.

### Failure 3: looking at cohorts but never segmenting

You know one batch worsened, but not which users within it changed.

### Failure 4: slicing too many segments with no decision logic

You end up seeing everything and deciding nothing.

### Failure 5: ignoring identity, latency, or definition drift

At that point you may believe you are looking at a product problem when you are really looking at the edge of the data model.

## What PMs should actually take away from this

If I had to compress the piece into one line, it would be this:

**retention tells you whether anyone came back, cohorts tell you which batch came back, and segmentation tells you which kinds of users came back. You need all three if you want to make judgements instead of soothing yourself with an average.**

Once you get to that point, you are no longer just reading a retention chart. You are starting to read retention as product signal:

- is this an activation problem or an acquisition-mix problem
- is value not being formed, or is it formed but not strong enough to bring people back
- is one user group leaking, or is the whole base loosening

That leads neatly into the next article.

Because once you can read retention differences properly, the next question is almost unavoidable:

> how do I turn those insights into experiments I can trust, rather than stories I tell after staring at charts?

The next piece moves into A/B testing, and why PMs need to understand exposure, sample ratio mismatch, guardrails, and validity instead of stopping at hypotheses and p-values.
