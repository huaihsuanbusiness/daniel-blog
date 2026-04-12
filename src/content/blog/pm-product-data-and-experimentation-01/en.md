---
title: "PM Product Data and Experimentation 01 － North Star Is Not Enough: How PMs Use HEART, Guardrails, and Counter-Metrics to Define Success"
description: "When PMs first get introduced to product metrics, they usually hear a powerful idea very early on: find your North Star Metric, and the whole team will start pulling in the same direction."
categories: ["pm"]
tags: []
date: 2026-04-05T16:00:00
series: "PM Product Data and Experimentation"
seriesOrder: 1
---

When PMs first get introduced to product metrics, they usually hear a powerful idea very early on: find your North Star Metric, and the whole team will start pulling in the same direction.

That idea is not wrong.

The trouble is that many teams stop there.

And the result is often painfully familiar. The number does go up, yet the product does not actually get better. Sometimes it gets worse, and the team still convinces itself that things are improving because the biggest number on the dashboard looks lovely.

That is exactly why I wanted to write this piece. The North Star matters, but it only answers where you broadly want to go. It does not answer whether you are moving in the right way.

If a team stares at only one North Star, it tends to walk into three kinds of fake progress.

The first is mistaking a short-term push for long-term value. The second is treating local optimisation as overall improvement. The third is confusing genuine user value with users simply being pushed further down a flow.

So the argument in this article is simple.

**A North Star is not a standalone metric. It is the starting point of a success system.**

I usually break that system into four layers:

1. **North Star**: what core value are you actually trying to scale?
2. **Input metrics**: which actionable inputs are driving it?
3. **HEART**: is this growth genuinely improving the user experience?
4. **Guardrails / counter-metrics**: are you quietly breaking something else in order to lift the main number?

The North Star gives focus. HEART provides correction. Guardrails keep you from driving off a cliff. If you miss any one of them, a product can look like it is growing while it is actually drifting off course.

## A North Star should answer where users truly get value, not simply what the company wants to see

A North Star is useful not because it sounds profound, and not because every company ought to have a heroic slogan disguised as a metric. It is useful because it tries to connect three languages: customer value, product behaviour, and business outcomes.

Amplitude’s North Star material makes this point quite clearly: the role of the North Star is to connect customer value, product work, and business results. Google’s original HEART work made a similar point from the user-centred side. Product measurement should not stop at traffic or raw activity. It should come back to key goals and user-centred outcomes.

The most common misunderstanding here is treating “the company cares about this number” as equivalent to “users are receiving value”.

Take a booking product. If the team uses `Weekly Successful Bookings` as its North Star, that is usually a reasonable choice. A successful booking often means the user really did find a place and complete the transaction, while the platform matched demand and supply in a commercially meaningful way. Your roadmap and supporting notes use exactly this example.

But even if the North Star itself is sensible, that does not mean it is enough on its own.

Successful orders can grow in many different ways. Some of those ways create value. Others merely shift friction further downstream or hide the cost somewhere else.

Here is a very practical example.

Suppose you make the payment flow more aggressive. You remove several confirmation steps. `Payment Success Rate` rises, and `Weekly Successful Bookings` rises with it. The team is delighted and calls the launch a win.

Then two weeks later you realise that:

- cancellation rate is up
- support tickets are climbing
- refund rate has increased
- negative reviews now mention that booking felt rushed or unclear

So did the product actually get better?

I would say no.

That looks much more like pulling conversion forward while dumping the cost onto support, operations, and user trust.

The North Star did not fail here. What failed was treating it as the only judge in the room.

## A useful North Star usually has two qualities

First, it should be **as close as possible to realised value**. In other words, it should reflect users actually getting the value, not merely doing something that resembles a step towards value.

Second, it should **break down into a handful of inputs the team can genuinely influence**. Amplitude also recommends connecting the North Star to a small set of actionable inputs, instead of leaving it floating in the sky by itself.

In a booking product, a more sensible breakdown usually looks like this:

| Layer | Metric | What it represents |
|---|---|---|
| North Star | Weekly Successful Bookings | Whether the product is actually creating completed booking value this week |
| Demand-side inputs | Qualified Visitors, Search Sessions | Whether enough relevant demand is entering the funnel |
| Supply-side inputs | Active Properties, Inventory Match Rate | Whether users can find suitable listings |
| Funnel inputs | View Rate, Start Booking Rate, Payment Success Rate | Where value leaks along the booking path |

That layer is still only an action map. It tells you where to look, but not whether the growth is healthy.

That is where HEART comes in.

## HEART is not a second North Star. It is the thing that stops you from building a product with pretty numbers and strange experiences

Google’s HEART framework is, at its core, a reminder that user experience should not be crushed into a single commercial number. HEART stands for Happiness, Engagement, Adoption, Retention, and Task Success. Combined with the Goals-Signals-Metrics process, it gives teams a more practical way to unpack the vague question of whether the product is actually getting better.

There is one misunderstanding here that is worth killing off.

**HEART is not about forcing five neat numbers onto a crowded dashboard.**

That usually just makes things noisier.

The real value of HEART is that it forces a more uncomfortable question:

> What part of the user experience is this growth actually improving?

That question is expensive in the best possible way.

Because many teams have never really answered it.

Take the same goal of increasing successful bookings. If you view the problem through HEART, you quickly see that different changes affect different parts of the experience.

- **Happiness**: do users feel the flow is clear, trustworthy, and fair?
- **Engagement**: are users willing to keep searching, saving, and comparing?
- **Adoption**: are new features such as price alerts, map filters, or saved lists actually being used?
- **Retention**: after a first successful booking, do users come back next time they need accommodation?
- **Task Success**: are users finding a bookable, suitable listing faster and more reliably?

At that point, you realise `Weekly Successful Bookings` bundles several very different kinds of improvement together.

Some changes help people find the right place more quickly. Some simply hurry them into payment. Some make it easier to place an order and regret it immediately afterwards.

The North Star might rise in all three scenarios, but HEART would look very different in each case.

That is why I prefer to think of HEART as an **experience stress test**, not as a KPI add-on pack.

It is not there to replace the North Star. It is there to ask whether the growth can actually stand up.

## Guardrails and counter-metrics are the layer product teams most often fake, and the layer most likely to save them

Plenty of teams know the words. Far fewer do the work.

The most common version looks like this:

- Primary metric: booking success rate
- Guardrail metrics: retention, support, refunds, crash rate

It sounds complete, but in practice it is just a row of nouns. The hard part has not been done.

Guardrail metrics do not matter because you listed them. They matter only if they can genuinely block a bad decision. Mixpanel describes guardrail metrics as secondary metrics observed alongside the primary one during experiments, specifically to detect unintended impact. Microsoft’s work on good metrics makes a related point: a useful metric system should be diagnosable and decomposable, especially around things like performance and reliability, rather than waiting until the top-line number collapses.

I tend to separate them like this:

- **Primary metric**: what the change is meant to improve
- **Guardrail metrics**: what the change must not damage
- **Counter-metrics**: what is most likely to get worse if the primary metric goes up

In practice, many teams lump guardrails and counter-metrics together, and that is perfectly fine. The important thing is not the label. It is whether you have included the **cost of growth** in your definition of success.

Still using the booking example, suppose the current goal is to improve `Start Booking Rate`. I would naturally watch these alongside it:

| Role | Metric | Why it matters |
|---|---|---|
| Primary | Start Booking Rate | Are more users willing to begin checkout? |
| Guardrail | Payment Error Rate | The change must not increase payment failures |
| Guardrail | Support Ticket Rate | The flow must not shift comprehension cost onto support |
| Counter-metric | Cancellation Rate | You do not want rushed decisions masquerading as growth |
| Counter-metric | Refund Rate | Surface-level order growth should not turn into after-sales cost |

There is a judgement call here that matters a great deal.

**A guardrail is not something you discuss after it worsens. It is something for which you define an unacceptable threshold in advance.**

Otherwise you get the most familiar meeting-room scene in product work: the primary metric is up 6%, a guardrail is down 3%, and everyone starts using different tones of voice to defend the result they already wanted.

That is not data-driven decision-making. That is simply arguing with charts.

## What works in practice is writing success as a four-layer stack

If you are building a metric system for a product right now, I would not start with “which KPIs should we list?” I would write success more like this.

### 1. Start with a North Star statement

Not just the number. Write the sentence that ties it back to user value.

> We use `Weekly Successful Bookings` as our North Star because it is the closest proxy for users successfully finding suitable accommodation and completing the transaction, while also capturing the marketplace outcome that matters to the business.

### 2. Then define three to five inputs

This is so the team knows which levers can actually move the North Star.

For example:

- Qualified Visitors
- Inventory Match Rate
- View Rate
- Start Booking Rate
- Payment Success Rate

### 3. Use HEART to test whether the experience is genuinely improving

Do not force all five dimensions in every case. Choose the ones that are most relevant to the current problem.

If this quarter you are working on activation and search experience, the more relevant HEART dimensions might be:

- Task Success: share of searches that reach a bookable result, median time from search to booking
- Happiness: perceived trust in pricing, clarity of information, post-search satisfaction
- Retention: 30-day return search rate after a first successful booking

### 4. Turn guardrails and counter-metrics into stop conditions

For example:

- stop the rollout if `Payment Error Rate` rises materially
- investigate traffic quality and information transparency if `Cancellation Rate` exceeds baseline by 10%
- if `Support Ticket Rate` rises, review flow and copy before scaling the change

Once you get this far, success is finally defined in a complete way.

Without it, many teams are simply finding a convenient number that helps the thing they already wanted to do get approved.

## When a single North Star should not dominate the entire discussion

This is not an anti-North-Star article. It is an anti-worship article.

In the following situations, I would not recommend compressing every discussion into one top-line number.

### 1. Before a multi-sided market has stabilised

In products such as booking, delivery, or matching marketplaces, a single North Star can easily hide one side’s health.

Bookings may be rising because the team is subsidising demand heavily, while host quality or supply-side experience quietly deteriorates. In that stage, you need to look at demand, supply, and transaction quality together, or you risk breaking the market balance.

### 2. Before the product has found a clear value behaviour

Some early products are still unsure what truly counts as value realised. In that stage, rushing to declare a North Star often means wrapping uncertainty in the language of certainty.

A more practical approach is to watch several candidate behaviours first and see which ones best predict retention or business outcomes, then converge from there.

### 3. When the team only owns a local slice of the journey

A company can have a company-level North Star, but a smaller product squad may not be able to use that same number to run daily decisions.

If your team only owns onboarding, yet is judged every day against total revenue, people usually end up speaking very loudly about things they cannot actually move.

A North Star needs to create focus, but it also needs to match the team’s scope of responsibility.

## How this approach usually fails

The most common failure modes I have seen are probably these four.

### 1. The North Star becomes the executive’s favourite financial result

For example, the team chooses Revenue as the only metric and expects every product decision to optimise it directly. That is not impossible, but most product teams do not have feedback loops short enough to learn from their own work that way.

### 2. HEART is treated as a checklist instead of a judgement tool

Teams force one metric into each bucket, and the dashboard ends up looking like a supermarket aisle. It seems complete, but no one can tell which two signals matter this quarter.

### 3. Guardrails are listed but threshold-free

This is the classic “busy without doing the work” version. The team names protective metrics, but when something goes wrong, everyone still argues, because no one ever defined what unacceptable looks like.

### 4. The metric system is used to justify the wrong strategy

A beautiful metric system cannot rescue a bad product call.

If the real problem is insufficient supply, and you keep optimising payment conversion, all you will do is scale a bad experience more efficiently.

## A final thought

The North Star matters, but it is more like a compass than a full navigation system.

It points you in a direction, but it does not automatically tell you whether the growth is healthy, whether the trade-off is too costly, or whether the experience is being eaten alive by your own optimisation.

So these days I ask teams less often, “What is your North Star?” and more often:

- How do you know this North Star really represents user value?
- Which inputs are meant to move it?
- Which HEART dimensions tell you the experience has not drifted?
- Can your guardrails actually block the wrong kind of success?

If a team can answer those four questions, the North Star stops being a slogan on the wall and starts becoming a decision system.

The next article picks up a different problem that is just as underrated.

Many teams do not fail because they lack a North Star, or even because they lack a metric tree. They fail because **the same words, such as conversion, retention, or active user, produce different numbers depending on who pulls them**.

That is when you realise that a metric structure is not enough by itself. You also need a metric dictionary, governance rules, and a semantic layer. Otherwise everyone thinks they are discussing the same number while each person is holding a different version of it.
