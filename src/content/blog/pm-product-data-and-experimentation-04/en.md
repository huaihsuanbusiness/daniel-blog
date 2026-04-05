---
title: "PM Product Data and Experimentation 04 － SQL for PMs: Learn to Pull Evidence Before You Claim to Be Data-Driven"
description: "When PMs say they want to become more data-driven, the first instinct is often to ask for more dashboards."
categories: ["pm"]
tags: []
date: 2026-04-05T16:03:00
series: "PM Product Data and Experimentation Series"
seriesOrder: 4
---

When PMs say they want to become more data-driven, the first instinct is often to ask for more dashboards.

That instinct is understandable, and also slightly dangerous.

Understandable, because dashboards genuinely help teams align on the current state.  
Dangerous, because they make it very easy to confuse “I can see a chart” with “I can investigate a problem”.

Those are not the same thing.

Dashboards are excellent at answering questions that were anticipated in advance.  
What is the conversion rate this week? Which channel is bringing more traffic? Is retention worse than last month?

But real PM work tends to be messier than that.

You end up dealing with questions like:

- Why did `Booking Started` drop particularly sharply for new iOS users?
- Why is search volume flat in one country while `Inventory Match Rate` has suddenly worsened?
- Why does the experiment look neutral overall, but better for first-time users?
- Why are completed payments steady while cancellation rate climbs two days later?

Very few of those questions are sitting in a ready-made dashboard waiting to be clicked.

That is why I do not think PMs should learn SQL in order to impersonate analysts, or to collect syntax like trading cards. I think they should learn it for a much plainer reason:

**PM-level SQL is not about showing off. It is about being able to pull evidence up for yourself before the conversation drifts into guesswork.**

You do not need deep window functions on day one. You do not need to start with warehouse architecture. But if you cannot do the basic retrieval work yourself, a large share of product questions gets stuck at “something feels off” without turning into anything decision-worthy.

## Why PMs cannot rely on dashboards alone

This is not a complaint about dashboards. Good dashboards matter.

The issue is simply that the nature of dashboards creates blind spots.

They are usually designed for recurring rhythms such as weekly operational reviews, growth reviews, and health checks. In other words, they answer “the things we already knew we wanted to watch”.

PM work is often a bit less polite.

More often, you are dealing with situations such as:

- a release breaks only one platform and one acquisition entry point
- the funnel appears stable, but the denominator quietly changed
- feature adoption looks healthy, but only among highly intentional users
- a metric drops and you first need to rule out a data issue before discussing a product issue

Those situations require pulling data that sits close to the problem, not waiting for someone else to build the perfect chart for you.

That sequence is exactly why your roadmap places SQL after the tracking-plan article. First you stabilise event meaning. Then you talk about evidence retrieval. The point is not to turn PMs into data engineers. It is to build the habit of **clear definitions first, then self-serve verification**.

## How much SQL a PM actually needs

My answer is very simple:

**Enough to answer roughly 60 to 70 per cent of day-to-day product analysis questions without waiting in a queue.**

That 60 to 70 per cent is usually not exotic. It is the very practical stuff:

1. Volume checks: DAU, WAU, bookings, activations, searches  
2. Conversion checks: what is the step conversion and where does the drop happen?  
3. Segment comparisons: new versus returning users, platform, country, channel, plan type  
4. Time comparisons: yesterday, last week, before versus after release, campaign period  
5. Relationship checks: do people who did X later become more likely to do Y?  
6. Sanity checks: is this a product problem, or is the data lying?

Your PM data course outline captures the minimum kit rather well. Day 4 boils it down to `SELECT / WHERE / GROUP BY / JOIN`, then adds time handling, deduplication, and data types. That looks modest, but in practice it is enough to support a very large amount of first-pass product judgement.

So the first goal of SQL for PMs is not becoming a wizard.  
It is stopping the habit of waiting for someone else to translate every product question into a query.

## Do not memorise syntax first. Learn the order of investigating a product question

Many people struggle with SQL not because the language is impossibly hard, but because they start from the wrong end.

If you begin by trying to memorise:

- `INNER JOIN`
- `LEFT JOIN`
- `COUNT(DISTINCT ...)`
- `DATE_TRUNC`
- `CASE WHEN`

your head quickly turns into a drawer full of unlabeled parts. You have seen them before, but you do not know which one to reach for.

I think it is far better to work backwards from the product question.

Suppose the question is:

> Why is `Start Booking Rate` lower this week than last week?

The order is usually something like this:

1. Decide the grain  
   Are you analysing sessions, users, bookings, or events?

2. Decide the numerator and denominator  
   Is it `Booking Started / Listing Viewed`, or `Booking Started / Search Performed`?

3. Identify the necessary tables  
   Event table? Users table? Orders table? Experiment assignment table?

4. Pull the smallest useful dataset first  
   Do not begin with a five-table join if the core event table will already tell you something.

5. Only then break it down  
   Platform, channel, country, new versus returning users, version.

When you work this way, SQL stops feeling like a memorisation exam and starts behaving like a translation layer for your reasoning.

## The first SQL actions PMs should know well

If I had to compress the minimum kit, I would keep this article to five capabilities.

### 1. Use `SELECT` and `WHERE` to define the scope properly

Everything starts here.

PostgreSQL’s `SELECT` documentation lays out the order of operations very clearly. Data is drawn from the `FROM` list, filtered by `WHERE`, then grouped, projected, deduplicated, and so on. BigQuery describes query statements similarly, as scanning one or more tables or expressions and returning result rows.

That matters for PMs because a surprising number of broken analyses are not broken by sophisticated maths. They are broken because the scope was wrong in the very first step.

If you forget to filter to `event_name = 'Search Performed'`, everything afterwards may be beautifully wrong.

### 2. Use `GROUP BY` to understand distribution, not just totals

Looking only at totals is one of the easiest ways to fool yourself.

The value of `GROUP BY` is that it shows where the difference actually lives. PostgreSQL explicitly describes how grouping forms row groups and computes aggregate results before the final output is returned.

Suppose `Booking Started` is down 8 per cent. The next step is rarely to panic. It is to split by platform:

```sql
SELECT
  platform,
  COUNT(*) AS booking_started
FROM events
WHERE event_name = 'Booking Started'
  AND event_date BETWEEN '2026-04-01' AND '2026-04-07'
GROUP BY platform
ORDER BY booking_started DESC;
```

This sort of query is very ordinary. It is also very often the first move that turns “something seems odd” into “iOS is down, Android is flat”.

### 3. Use `JOIN` to reconnect events to context

Many product questions cannot be answered from a single table.

PostgreSQL defines join queries in simple terms: rows from one table are combined with rows from another according to a pairing condition. For PM work, the importance of that is not database theory. It is that you can finally connect “what happened” to “who it happened to”, “where it came from”, or “what happened next”.

Examples:

- join event data to users to compare new and returning behaviour
- join search events to listing metadata to inspect supply quality
- join booking events to payments to inspect failure patterns
- join experiment assignment to conversion events to inspect treatment effects

Without joins, a great deal of analysis stops at “how many times did event X happen?”  
With joins, the data begins to acquire context.

Of course, joins are also one of the easiest ways for PMs to step on a rake.  
A single wrong key can inflate a number like a balloon.

That is why I recommend asking two questions before every join:

- what is the grain of the table I am starting from?
- will this join turn a one-to-many relationship into duplicate counting?

Those two questions prevent an astonishing amount of trouble.

### 4. Learn to deduplicate rather than treating rows as entities

One of the most common first-SQL mistakes is counting rows as though they were automatically users, sessions, or bookings.

They are not.

A row in a table does not necessarily equal the thing you actually intend to count.

PostgreSQL’s `SELECT` documentation explicitly calls out `SELECT DISTINCT`, because duplicate rows are a normal part of query work.

If you want weekly successful search users, you often want `COUNT(DISTINCT user_id)`, not event rows.

```sql
SELECT
  DATE_TRUNC('week', event_time) AS week_start,
  COUNT(DISTINCT user_id) AS unique_search_users
FROM events
WHERE event_name = 'Search Performed'
GROUP BY 1
ORDER BY 1;
```

What matters here is not the keyword itself. What matters is whether you keep asking:

> Am I counting events, sessions, users, or orders?

Without that awareness, even quite advanced SQL can take you confidently to the wrong answer.

### 5. Handle time properly, or your trends will quietly lie to you

Time handling is another trap that PMs tend to underestimate.

BigQuery documents functions such as `DATE_TRUNC`, `TIMESTAMP_TRUNC`, and `EXTRACT` in detail. PostgreSQL similarly provides `date_trunc` and related datetime functions. These sound like modest utilities until you have worked on weekly reporting, campaign windows, or release comparisons. Then you realise they are doing a lot of the invisible heavy lifting.

The three most common time mistakes are:

- mixing UTC with local business time
- mixing calendar day with rolling 24-hour windows
- mixing event time with data arrival time

If you do not deal with those properly, many trend charts become storytelling devices rather than evidence.

## The six query patterns PMs get the most value from first

If you are learning now, I would not begin with clever syntax. I would begin with these six patterns.

### Pattern 1: volume trends
- daily search sessions
- weekly successful bookings
- monthly active users

### Pattern 2: segment comparisons
- `Booking Started` on iOS versus Android
- `Payment Success Rate` for new versus returning users
- `Inventory Match Rate` by country

### Pattern 3: funnel conversion
- `Search Performed → Listing Viewed`
- `Listing Viewed → Booking Started`
- `Booking Started → Payment Succeeded`

### Pattern 4: feature adoption
- how many users saw and used a new feature
- whether users who enabled price alerts returned more often afterwards

### Pattern 5: before-and-after comparisons
- payment success before versus after a checkout change
- search quality during a campaign week versus a typical week

### Pattern 6: sanity checks
- did one event suddenly halve yesterday?
- has one platform started sending lots of null properties?
- did an enum suddenly gain a strange new value?

That set covers a large portion of real PM work.  
It is not glamorous. It is extremely useful.

## What belongs in the PM minimum kit, and what does not

This boundary is worth drawing clearly, otherwise people sprint into a 400-page SQL manual and come back with a thousand-yard stare.

### This article is deliberately not going deep on:
- advanced window functions
- query performance tuning
- warehouse partition strategy
- advanced statistics or causal inference

Not because those topics do not matter, but because **they are not the first step in building PM-level evidence retrieval**.

You will usually get much more value from stabilising these first:

- know the grain
- know the numerator and denominator
- know when a join is needed
- know when deduplication is needed
- know how the time window is defined
- know how to sanity-check the result before interpreting it

Plenty of people can write impressively complicated SQL and still confuse users, sessions, and orders in the denominator. That is a bit like owning exquisite knives and still slicing your fingers on an onion.

## The most common SQL mistakes PMs make

A few failure modes are worth calling out directly.

### 1. Writing before defining the grain

This is the biggest one.  
Are you analysing users, sessions, events, or bookings?  
If that is not pinned down early, the rest is very unlikely to hold.

### 2. Feeling safe because the query uses `LEFT JOIN`

A `LEFT JOIN` is not automatically safe.  
If the table on the right is one-to-many, you can still inflate the result badly.

### 3. Treating event time as business time

Payment success may occur now, while cancellation or refund happens much later.  
If you do not define the observation window carefully, you end up comparing immediate conversion to delayed cost in a very sloppy way.

### 4. Telling stories as soon as the query returns a number

This is a classic PM temptation.  
You see a breakdown and immediately narrate a cause without checking sample size, data quality, or segment definition.

### 5. Skipping sanity checks

Whenever I finish a query, I still ask a few boring questions first:

- is the total vaguely plausible?
- does it broadly align with the dashboard?
- is the null rate strange?
- do segment sums make sense?
- compared with last week, is the jump suspiciously large?

These checks are not glamorous. They save lives.

## How I would suggest a PM practise SQL

If you are a PM rather than someone trying to become an analytics engineer, I would practise like this:

1. Keep using the same product case  
   For example, a booking app. Do not switch between ecommerce, SaaS, and gaming every day.

2. Ask one question at a time  
   For example, “which platform lost the most in `Start Booking Rate`?”, not “explain the entire business”.

3. Write the question in plain language first  
   Spell out the numerator, denominator, time window, and breakdown before touching SQL.

4. Write one sentence of conclusion after every query  
   Not just “the query ran”, but:
   - what I observed
   - what I still do not know
   - what I need to check next

That way, what you learn is not just syntax. It is an investigative rhythm.

And that, to me, is the real value of SQL for PMs.  
Not the identity badge of “I can write queries too”.  
But the ability to stop standing in front of a dashboard guessing, and start pulling evidence out for yourself.

The next piece can go deeper into window functions, sessionisation, and funnel SQL.  
That is where SQL starts moving from “querying numbers” to “reading journeys”.
