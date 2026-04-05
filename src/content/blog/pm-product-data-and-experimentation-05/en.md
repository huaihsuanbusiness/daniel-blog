---
title: "PM Product Data and Experimentation 05 － Window Functions, Sessionisation, and Funnel SQL: Where SQL Starts Becoming a PM Superpower"
description: "A lot of PMs learn SQL by learning how to count."
categories: ["pm"]
tags: []
date: 2026-04-05T16:04:00
series: "PM Product Data and Experimentation Series"
seriesOrder: 5
---

A lot of PMs learn SQL by learning how to count.

`count(*)`
`group by`
`sum(case when ...)`

That stage matters. It is the point where you can finally pull evidence yourself instead of queuing for help every time a question appears.

But once you get into real product work, another pattern shows up very quickly.

The hard questions are rarely just:

- how many users did a thing
- how many bookings started
- how many payments succeeded

More often, the hard questions look like this instead:

- what happened immediately before this event
- which attempt should count as the real start of the journey
- whether two actions belong to the same session or two different ones
- whether the funnel denominator should be a user, a session, or a booking attempt
- whether the drop is real or caused by the way the journey was stitched together

In other words, **SQL starts becoming genuinely useful when you stop treating it as a counting tool and start using it to reason about sequence, boundaries, and journeys.**

That is why I group `row_number`, `lag`, `lead`, sessionisation, and funnel SQL together. They look like separate techniques, but they are all doing the same underlying job:

> turning a messy event stream into evidence you can use to judge a user journey.

This piece is not trying to teach every window function. It is also not a detour into clever SQL for its own sake. The point is narrower and more practical: **when PMs should use these tools, what decisions they are actually encoding, and how they usually go wrong.**

## Why basic SQL stops being enough

Basic SQL is good at cross-sectional questions.

For example:

- how many `booking_started` events happened last week
- which country had the highest payment success rate
- whether iOS has a lower `Inventory Match Rate` than Android

What it does not handle especially well is sequence.

Questions like:

- how many listings a user viewed before starting a booking
- which `booking_started` event counts when a user clicks the button three times
- whether a payment failure belongs to the same attempt or a later one
- whether a funnel drop-off is a real product issue or a bad session boundary

Those questions force you back to the event stream itself. That is where window functions begin to matter.

## `row_number`: not really about ranking, more about choosing which row counts

People often learn `row_number()` as a ranking function. That is not wrong, but for PM work its most practical use is usually simpler: **picking the representative row**.

The most common example is deduplication.

Say your booking flow emits multiple `booking_started` events because of retries, page refreshes, or frontend resends. If you feed every one of those into a funnel, the first step inflates and the later conversion rate quietly bends out of shape.

What you actually care about is usually something like:

- the first `booking_started` in a given session
- the first listing viewed in a search journey
- the final payment state for an order attempt

A simplified query might look like this:

```sql
with booking_start_ranked as (
  select
    user_id,
    session_id,
    event_time,
    row_number() over (
      partition by user_id, session_id
      order by event_time asc
    ) as rn
  from events
  where event_name = 'booking_started'
)
select *
from booking_start_ranked
where rn = 1;
```

The important part is not the syntax. The important part is the judgement embedded in it:

**within a given user and session, only the first `booking_started` counts as the funnel entry.**

That judgement matters more than the function name.

### Where `row_number` becomes genuinely useful

- deduplicating repeated events while keeping the first or last one
- finding a user’s first value moment
- identifying session entry pages and exit pages
- reshaping an event stream into a one-row-per-user or one-row-per-session table

### The mistake people make most often

Not a syntax error. A boundary error.

If the right partition is `user_id, search_session_id` and you only partition by `user_id`, you may accidentally fuse separate journeys into one. The query runs. The table looks tidy. The conclusion drifts anyway.

## `lag` and `lead`: where SQL starts reading journeys instead of snapshots

If `row_number` helps you decide which row counts, `lag` and `lead` help you ask what happened immediately before or after.

That sounds small, but it changes the sort of product questions you can answer.

Imagine `start_booking_rate` drops after a release, and the aggregate funnel is too coarse to explain why. You may want to know:

- what event tends to follow `view_listing`
- how long users wait between `view_listing` and `booking_started`
- whether people who drop leave the listing page, go back to search, or hit an error

That is where navigation functions start earning their keep.

```sql
select
  user_id,
  event_time,
  event_name,
  lag(event_name) over (
    partition by user_id
    order by event_time
  ) as prev_event,
  lead(event_name) over (
    partition by user_id
    order by event_time
  ) as next_event
from events
where event_date >= current_date - interval '7 day';
```

Queries like this do not always hand you the answer directly. What they do give you is the relationship between events.

Once you add `lag(event_time)`, you can also calculate time gaps and start spotting things like:

- users who move to the next step within seconds
- users who stall at a particular step
- sessions that have probably ended, even though your current model still treats them as one journey

## Sessionisation is not a fact of nature. It is a modelling choice.

This is one of the most useful mindset shifts for PMs.

**A session is not a naturally occurring object waiting to be discovered. It is a boundary you define so that behaviour can be analysed in a tractable way.**

Different tools make different choices.

GA4 defines a session as a period of user interaction and, by default, times it out after 30 minutes of inactivity. PostHog also groups events into sessions and starts a new one by default after 30 minutes of inactivity or after 24 hours. Those defaults are useful conventions, but they are still conventions.  

That matters because PMs often treat a session as if it were ground truth, then build far more certainty on top of it than the model deserves.

For example:

- for a high-consideration product, 30 minutes of inactivity may not mean the journey is over
- for a content product, sessions can be very useful, but for an infrequent B2B workflow they may be much less meaningful than user-day or account-stage
- for a search product, the real unit may be a `search_session`, not the website session

My rough rule is:

- if you care about the quality of a single interaction, sessions are often useful
- if you care about the completion of a specific task, you may need a task session or search session
- if you care about long-cycle value creation, sessions are usually not the main character. Cohorts and retention often matter more

### A simple sessionisation pattern

A common warehouse-side approach is to start a new session when the gap from the previous event crosses a threshold.

```sql
with ordered_events as (
  select
    user_id,
    event_time,
    event_name,
    lag(event_time) over (
      partition by user_id
      order by event_time
    ) as prev_event_time
  from events
), session_flags as (
  select
    *,
    case
      when prev_event_time is null then 1
      when event_time - prev_event_time > interval '30 minutes' then 1
      else 0
    end as is_new_session
  from ordered_events
), sessionised as (
  select
    *,
    sum(is_new_session) over (
      partition by user_id
      order by event_time
      rows between unbounded preceding and current row
    ) as session_seq
  from session_flags
)
select *
from sessionised;
```

This looks technical, but the important part is the product judgement underneath it:

> after 30 minutes without activity, we will treat the next event as the start of a new context.

Whether that is sensible depends on the product, not on SQL.

## Funnel SQL is harder because the argument is about definitions, not syntax

When people first tackle funnel SQL, they often think the hard part is chaining the steps together. That is only the surface layer.

The real difficulty is that you have to define the funnel precisely enough to be trusted. At minimum, there are four questions you need to answer.

### 1. What is the denominator?

Is the funnel user-based, session-based, or task-based?

Using a booking product as an example:

- if the question is “how many users eventually paid”, a user-based funnel may be sensible
- if the question is “how efficient is a single search journey”, a search-session funnel is more plausible
- if the question is “how often does a booking attempt complete”, the denominator might need to be booking attempts

All three may be valid. They do not tell the same story.

### 2. How should order be handled?

Mixpanel’s funnel documentation is a good reminder that a funnel is never just a list of steps. It also includes rules about conversion windows, re-entry, and ordering.

If a user produces `A -> A -> B -> C`, should you:

- treat the first `A` as the entry
- treat the latest `A` as the entry
- allow re-entry
- or only count the first attempt

That is not a technical footnote. It is a definition choice.

### 3. How long is the conversion window?

If `view_listing -> booking_started -> payment_success` can happen within 7 days and still count as one conversion, that tells a very different product story from one where it must happen within 30 minutes.

Too long, and you blur distinct contexts into one flattering funnel. Too short, and you undercount real conversions that simply take time.

### 4. What should be excluded?

Are you excluding:

- internal traffic
- test accounts
- repeated payment retries
- bots
- automatically resent events

Miss that step and a great many funnel queries become beautifully organised noise.

## A practical funnel-SQL order of operations for PMs

I do not think PMs need to write warehouse-perfect funnel logic on day one. What matters more is getting the order of thought right.

1. Choose the funnel entity: user, session, or task
2. Define the step events and the order rules
3. Set the conversion window
4. Decide the re-entry and deduplication rules
5. Only then write the SQL

Do not reverse the sequence.

A lot of people write the query first and then invent the rationale afterwards. That is usually where metric drift starts.

## When not to reach for sessionisation or funnel SQL

Not every question deserves this machinery.

### Case 1: you are only sanity-checking the headline number

If all you want to know is whether yesterday’s `payment_success_rate` moved, a straightforward aggregate may be enough. Pulling in sessionisation and multi-step funnel logic can make the work slower and the query more fragile without changing the decision.

### Case 2: your event definitions are still unstable

If `view_listing` and `booking_started` are still being interpreted differently by different teams, writing a detailed funnel query is just building on sand. Fixing the tracking plan is usually the better move.

### Case 3: the journey is not naturally session-based

Enterprise workflows, procurement journeys, and other long-cycle actions often do not fit neatly into session logic. Cohorts, stage transitions, or account-level progression may be more truthful than session analysis.

## How these techniques usually fail in practice

The biggest failures I see are rarely syntax failures. They are judgement failures.

### Failure 1: mixing analysis units in the same funnel

Step one uses sessions. Step two uses users. Success is counted on `order_id`. The query still runs, but the denominator has already shape-shifted three times.

### Failure 2: treating tool defaults as truth

Thirty-minute timeouts, first-touch entry, seven-day conversion windows. These are defaults, not laws of physics.

### Failure 3: being able to calculate without being able to read

Some people can write a long funnel query but still cannot explain whether a drop-off means waiting, hesitation, technical failure, or a broken session boundary. That is like buying a beautiful microscope and then being unable to tell a cell from dust.

## What level does a PM actually need?

Probably less than you fear, but more than dashboard literacy.

A practical threshold looks something like this:

- you know what `row_number` is usually for, and can write a first-event or last-event query
- you know how `lag` and `lead` help with event sequence and time gaps
- you understand that sessions are modelling choices rather than natural facts
- you know that funnel SQL is mostly a problem of definitions, not performative syntax
- you know when to investigate alone and when to pull in an analyst to settle the rules properly

Once you reach that point, SQL stops being just a counting tool. It becomes a workbench for examining journeys, testing interpretations, and exposing weak metric definitions.

That is exactly where the next article begins.

Because once you can read sequences and sessions, the next hard question appears almost immediately:

> not everyone stays for the same reason, and an average can look healthy while the product is quietly leaking.

So the next piece moves into retention, cohorts, and segmentation, and why PMs get into trouble the moment they trust the average too much.
