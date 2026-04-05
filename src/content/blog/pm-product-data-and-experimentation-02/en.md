---
title: "PM Product Data and Experimentation 02 － Metric Trees Are Not Enough: Why PMs Should Understand Metric Dictionaries, Governance, and the Semantic Layer"
description: "When PMs start building real data fluency, one of the first “advanced” tools they tend to learn is the metric tree."
categories: ["pm"]
tags: []
date: 2026-04-05T16:01:00
series: "PM Product Data and Experimentation Series"
seriesOrder: 2
---

When PMs start building real data fluency, one of the first “advanced” tools they tend to learn is the metric tree.

That makes sense.

A metric tree is intuitive. You start with the top-level goal, break it into drivers, and keep going until you reach levers a team can actually change. It is useful for root-cause analysis, and it is very good at forcing a team to stop speaking in vague generalities. Both Mixpanel and Count describe metric trees in roughly this way: a structure that connects a high-level goal to the input metrics that drive it.

So this is not an article arguing that metric trees are useless.

Quite the opposite. I think they are genuinely useful.

But they often solve only half the problem.

A metric tree can tell you that `Weekly Successful Bookings` breaks down into demand, supply, and funnel conversion. It can also tell you that a drop in `Payment Success Rate` might be explained by payment errors, inventory mismatch, or a risky fraud-control step.

What it does not automatically solve is a more ordinary, more annoying question:

> If everyone says conversion, retention, or active user, why do different people end up with different numbers?

That problem is not a lack of analytical skill. It is a lack of definitional discipline.

In other words, you may already have the map, but you still do not have the dictionary. Everyone appears to be discussing the same node, while each person quietly means something different by it.

That is the division of responsibility this article is about.

**A metric tree explains what drives the result. A metric dictionary explains what the result actually is. A semantic layer makes sure different tools, people, and reports can genuinely retrieve the same answer.**

Without the latter two, a metric tree can easily become a very elegant-looking tree whose nodes are all drifting underneath the surface.

## Metric trees solve action and decomposition. They do not solve governance

Let’s be fair to metric trees first.

Their biggest strength is that they break a business outcome into drivers a team can act on. Count makes this point explicitly when describing metric trees: each node can carry both a business definition and a formula, and the real value is not merely the diagram but the shared conversation required to build it.

That conversation matters a lot.

Because in many companies, the scarcest thing is not dashboards. It is a shared understanding of which teams own which parts of a top-line result once you decompose it.

Take a booking product again. You could break `Weekly Successful Bookings` down like this:

| Layer | Metric |
|---|---|
| North Star | Weekly Successful Bookings |
| L1 | Qualified Visitors, Inventory Match Rate, Payment Success Rate |
| L2 | Search Sessions, View Rate, Start Booking Rate, Active Properties |
| L3 | Search result availability, inventory sync success, payment error rate, pricing transparency signals |

That tree is genuinely useful.

When the North Star drops, you do not need to start with a theological debate. You can first check whether the issue is demand, supply, or transaction quality.

But even a beautifully drawn tree still does not solve any of the following:

- does `Qualified Visitors` exclude internal traffic?
- is the denominator of `Start Booking Rate` people who viewed a listing, or people who landed on a listing page?
- is `Payment Success Rate` measured at order level or attempt level?
- does “weekly” mean UTC, Taiwan time, or local market time?
- are refunded orders backfilled into history?
- do you exclude duplicate events, late events, or bot traffic?

If these details are not pinned down, the metric tree is simply helping everyone visualise ambiguity more elegantly.

## A metric dictionary is not admin work for the data team. It is the legal text of data-driven decision-making

I really like the line in your data course materials: **every number should survive courtroom questioning.**

That is exactly right.

A mature metric should not have only a name. It should at least be able to answer how it is calculated, where it comes from, when it updates, which cases are excluded, and who owns its maintenance. Your metric dictionary materials make the same point quite directly: naming and definitions should be standardised so that a metric means one thing rather than several.

I think of a metric dictionary as the **definition layer** of the metric system. At minimum, it should contain the following:

| Field | What it needs to answer |
|---|---|
| Metric name | What is this number called? |
| Business definition | What business meaning does it represent? |
| Formula | What are the numerator, denominator, and aggregation logic? |
| Grain | Is it user, session, order, or property level? |
| Time window | Is it daily, weekly, monthly, and in which timezone? |
| Deduplication rule | How are repeated events handled? |
| Filters | Are test accounts, employees, or bots excluded? |
| Source | Which table or event does it come from? |
| Refresh cadence | Real-time, daily, backfilled? |
| Owner | Who is allowed to change it, and who explains it? |
| Known caveats | Late events, refunds, identity stitching, and so on |

None of these fields are glamorous, but they are what make a number discussable.

### The tiniest difference in “conversion” can create a very large mess

The most common disaster is not a broken SQL query. It is when everyone is “only slightly different”.

For example, `Start Booking Rate` could plausibly mean any of these:

1. `booking_start / listing_view`
2. `unique_users_started_booking / unique_users_viewed_listing`
3. `sessions_with_booking_start / sessions_with_search_result`

All three could be called start booking rate.

None of them are ridiculous.

But they answer very different questions.

The first is event conversion. The second is closer to a user-level behaviour rate. The third mixes session definitions with a much more upstream exposure condition.

If those three versions all exist in the same company, and people say only “start booking rate” in meetings, that is not analysis. It is a large-scale homonym accident.

So my usual line is this: **the metric tree tells you where to look, while the metric dictionary tells you whether everyone is looking at the same thing.**

## Metric governance is not a BI side quest. It is part of product governance

At this point many people try to hand the problem to the data team.

“Fine, so BI can maintain the dictionary.”

That is a valid division of labour. It is not a valid division of responsibility.

Because metric definition is never just a data problem. It is also a product problem, an operations problem, and often a finance problem.

For instance, should `Successful Booking` include orders cancelled within 24 hours?

That is not a question an analyst should decide alone.

If you include them, the metric is closer to immediate transaction conversion. If you exclude them, it becomes a more conservative, quality-oriented completed-order metric. Neither is universally wrong, but each one pushes product decisions in a different direction.

That is governance.

Governance is not just writing the definition down in Confluence. It also includes:

- who is allowed to change a definition
- which roles need to approve the change
- how the change is announced
- how the old version is sunset
- which dashboards must be updated
- whether historical data should be backfilled

If those mechanisms do not exist, the data team ends up as the busiest translation desk in the company, explaining in every meeting why yesterday’s 12.4% has become today’s 11.7%.

That is not usually because the data team is weak. It is usually because the organisation is not treating metrics as governed product assets.

## The semantic layer is what actually pushes definitions into every query and every tool

At this point some teams think: fine, if we write a good dictionary, is that not enough?

Not quite.

Because however well the document is written, if everyone still rewrites SQL by hand, creates BI calculated fields locally, and adds their own case statements in notebooks, the definition will split again in practice.

That is the problem the semantic layer is meant to solve.

Looker has long positioned its semantic model at the core of the BI workflow, and Google Cloud has described the goal in very direct terms: **define metrics once and use them everywhere**, so that governance, security, and trust can travel with them. dbt’s recent semantic layer documentation makes a very similar case. Metric definitions should be pulled back into the modelling layer so multiple business units and downstream tools can consume the same logic.

This matters for PMs more than it may seem.

A semantic layer is not merely another reporting tool, and it is not just a fancier phrase for metadata.

What it really does is turn business definitions into executable query logic, then route different consumers through that same logic.

LookML is a classic example. In Looker, dimensions, measures, and joins are defined in the model, so business users work with business terms instead of each person rebuilding the bottom-layer SQL on their own.

That might sound like an engineering detail, but it changes the PM’s working environment quite directly.

Once a semantic layer exists, conversations shift towards things like:

- Is the business definition of this metric correct?
- Should this dimension be available for self-serve analysis?
- Which consumers will be affected if we change this definition?

Instead of the far more repetitive questions:

- can I borrow your SQL?
- why does your dashboard show fewer paid users than mine?
- did you filter out one more state than I did?

## It helps to think of these as different responsibilities rather than one blurry blob

This is the split I prefer:

| Layer | What it answers | What happens if you do not have it |
|---|---|---|
| Metric Tree | What drives the result? | You see outcomes but do not know where to act |
| Metric Dictionary | What exactly is this metric? | Same name, different meanings, endless arguments |
| Semantic Layer | How do all tools get the same answer? | Lovely documentation, fragmented implementation |

This distinction matters because many teams do not suffer from the total absence of all three. They suffer because the three are casually conflated.

Someone draws a metric tree and assumes the definitions are now settled. Someone else writes a glossary page and assumes self-serve analysis will naturally follow. Another team buys a semantic layer tool and discovers that the event naming and business logic were never cleaned up underneath.

That does not mean the tools are useless. It means the responsibilities were never cut cleanly enough.

## When you should build the dictionary first and not rush into a semantic layer

Here is the deliberately unexciting answer.

Not every team should implement a semantic layer immediately.

If your current reality looks like one of the cases below, I would slow down.

### 1. You have one analyst and one BI tool

At that stage, the biggest pain is often not cross-tool inconsistency. It is that the core metrics are not yet stable. Writing the first twenty important metric definitions properly is usually a better investment than rushing into a platform.

### 2. Tracking is still messy

If event names are inconsistent, user identity jumps around, and late events have no agreed handling rules, then implementing a semantic layer is like laying wooden flooring before the concrete underneath has set. It may look more sophisticated, but it will still wobble when you walk on it.

### 3. Metric ownership is unclear

If anyone can casually edit a metric definition, and there is no change log or approval flow, a semantic layer will simply accelerate the spread of confusion.

The sequence I prefer is:

1. draw the metric tree so you know what problem you are decomposing
2. write the core metric dictionary so numbers can actually be discussed
3. then decide whether the semantic layer is worth using to push those definitions into the system

That order is slower, but it is much less likely to automate chaos at scale.

## A minimal implementation in a booking product might look like this

If you are the PM for a booking product, I would begin with eight to twelve core metrics rather than trying to cover the whole company at once.

For example:

### Step 1: build the tree

Break `Weekly Successful Bookings` into:

- Qualified Visitors
- Inventory Match Rate
- View Rate
- Start Booking Rate
- Payment Success Rate
- Cancellation Rate
- Refund Rate

### Step 2: write the dictionary

For `Payment Success Rate`, do not stop at the name. Write it at roughly this level:

- Definition: number of orders with successful payment / number of orders that started payment
- Grain: order level
- Timezone: Asia/Taipei
- Deduplication: multiple payment attempts on the same order count only once as the final success
- Exclusions: internal traffic, test accounts
- Backfill rule: refunds do not change this metric, but they do affect Refund Rate
- Owner: Payments PM + Analytics

### Step 3: only then move into the semantic layer

Once these definitions are stable, put the dimensions, measures, joins, and access controls into the model properly, so BI, SQL, self-serve analysis, and even AI agents consume the same business semantics.

The benefit is not just “consistent numbers”.

The bigger advantage is that when a number jumps suddenly, you know which layer to suspect first.

- if the business truly changed, inspect the metric tree
- if the definition drifted, inspect the metric dictionary
- if tools disagree, inspect the semantic layer

That kind of separation makes debugging much faster.

## A final thought

Metric trees matter, but they are not magic.

They help you decompose business goals into actionable structure, and that is hugely valuable. They do not, however, solve how a metric is defined, nor how the same definition is reused consistently across the company.

So if your team is already seeing symptoms such as:

- the same metric name producing different numbers
- dashboards disagreeing with one another
- every analysis request requiring custom SQL
- a PM asking a simple question and waiting in a queue for translation

then the problem is usually not that you are insufficiently data-driven. It is that the metric system is missing the layers in the middle.

What you need is not merely a bigger dashboard, nor just a more detailed metric tree.

You need to complete all three layers:

- use the **metric tree** to build the causal map
- use the **metric dictionary** to pin down the definitions
- use the **semantic layer** to make those definitions live inside the system

Once you do that, the team has a much better chance of moving from “everyone is good at looking at numbers” to “everyone is finally looking at the same number”.

The next article naturally drops to the event layer.

Because once definitions and governance are in place, the next question is whether the events behind those numbers were instrumented, named, and validated correctly in the first place. That is where the tracking plan conversation begins.
