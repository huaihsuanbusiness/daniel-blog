---
title: "PM Product Data and Experimentation 08 － Data Rarely Breaks at the SQL Layer: PMs More Often Fight Identity Issues, Late Events, Bot Traffic, and Failed Rollouts"
description: "When PMs see strange numbers, the first instinct is often something like this:"
categories: ["pm"]
tags: []
date: 2026-04-05T16:07:00
series: "PM Product Data and Experimentation"
seriesOrder: 8
---

When PMs see strange numbers, the first instinct is often something like this:

- did the query break?
- is the dashboard wrong?
- did somebody wreck the join?

Those things certainly happen. But once you spend longer around product analytics and experimentation, another pattern becomes hard to ignore.

**Data usually does not fail at the SQL layer first.**

Much more often, the first break appears somewhere upstream:

- anonymous users never get stitched to logged-in users
- the same person turns into two people across browsers or devices
- late events make yesterday’s funnel grow a new tail today
- internal traffic, debug traffic, bot traffic, or spam drift into production analytics
- a rollout is still unstable while people are already treating the metrics as settled truth
- the session definition no longer matches the task users are actually trying to complete

That is why many issues that look like “analysis problems” are really identity, event-time, traffic-quality, or release-control problems in disguise.

If I wanted to give PMs a debug order that is less likely to send them in circles, I would use this one. Again, not doctrine, just a working field sequence:

1. **Identity layer**: was one person split into several, or several people merged into one?
2. **Time layer**: are you using event time or processing time, and are late events involved?
3. **Traffic layer**: did internal, developer, bot, or spam traffic slip into the data?
4. **Release layer**: did a progressive rollout, flag change, app release, or kill switch distort the picture?
5. **Query layer**: only then come back to SQL, joins, and table definitions

This order is not meant to diminish SQL. It is meant to recognise that **SQL often reveals the wound rather than causing it.**

## Start with identity: is this actually the same person?

Identity problems are awkward because they often create errors that look small enough to ignore, yet large enough to infect everything downstream.

Amplitude, Segment, and PostHog are all explicit in their documentation about identity resolution. If anonymous IDs, device IDs, and user IDs are not linked correctly, the same person can be split across sessions, devices, and platforms. Conversely, if distinct IDs are generated badly, different people can be merged into one. 

That affects:

- DAU, WAU, and MAU
- user-level funnel counts
- cohort retention
- experiment consistency
- cross-device journey analysis

### The failure modes that show up most often

#### 1. Anonymous-to-logged-in identity never joins up

A user browses anonymously, then signs in later.  
If the identify or merge flow is not wired properly, the pre-login and post-login behaviour never becomes one journey.

The symptoms usually look like this:

- activation appears lower than it should
- onboarding funnels seem to break sharply in the middle
- pre-login behaviour stops predicting retention or purchase well

#### 2. The same person is split across devices

This is common in content, ecommerce, booking, and B2B products alike.  
The user researches on mobile at lunch, then converts on desktop in the evening. Without decent stitching, the research and the conversion become separate lives.

You end up seeing:

- lots of search activity, but bookings lag strangely behind
- first touch and conversion appearing to belong to different users
- some acquisition sources looking implausibly weak

#### 3. Different people are merged incorrectly

PostHog’s documentation is unusually direct here: if your distinct IDs are generated with a bug, and people are identified as generic values such as `null` or `true`, multiple users can collapse into one profile. That kind of error is nasty because it does not simply undercount. It corrupts the relationships between behaviours. 

### What I would inspect first

- does a high-intent cohort show an odd anonymous-to-identified drop?
- are identify rates unusually strange on a particular platform, browser, or app version?
- does the gap between user-level and device-level funnels suddenly widen?
- does the experiment assignment unit actually match the product’s login and merge logic?

Quite often, half the mystery starts dissolving at this stage.

## Session definitions are modelling choices, not laws of nature

Session issues often get treated as analytical housekeeping, but they can rewrite the funnel.

Tools such as GA4 and PostHog provide session-related defaults, but those defaults are not the product truth. For some products, a 30-minute inactivity rule is perfectly sensible. For others, especially higher-consideration journeys, it is far too blunt.

A booking product is a good example:

- the user browses listings at lunchtime
- returns in the evening after discussing options
- completes payment the next day

If you force that into a few ordinary sessions, the journey starts to look like a sequence of abandonments.

So I treat session as an analytical modelling choice rather than a naturally occurring object. In practice, the unit that matters might be:

- a website session
- a search session
- a booking task session
- user-day or user-week

### A simple rule of thumb

- if you are studying friction in a single interaction, session can be useful
- if you are studying task completion, a task-oriented session is often better
- if you are studying longer-term value, cohorts and retention usually matter more than sessions

A great many “the funnel suddenly broke” stories are really “our session definition stopped matching reality”.

## Next check time: late events can make yesterday’s numbers move today

If you have ever seen yesterday’s dashboard change by itself today, you have probably met late events already.

Google Cloud Dataflow documentation defines late data in terms of watermarks and windows. In PM language, the useful version is simpler:

> the time an event happened and the time your systems processed it are not necessarily the same thing.

Once that distinction gets muddy, a great deal starts looking odd.

### The common causes

- offline users sending events later
- weak networks delaying uploads
- server-side pipelines being replayed
- queues backing up before events land in the warehouse
- ETL or ELT jobs finishing late

The consequences are familiar:

- yesterday’s DAU changes today
- yesterday’s funnel fills in after the fact
- cohort tables keep backfilling
- A/B test metrics look different depending on which day you inspect them

### The three clocks you need to separate

1. **event time**: when the thing actually happened  
2. **ingestion or processing time**: when the system received or processed it  
3. **reporting cut-off**: when you are willing to treat a day or window as settled

A lot of teams do understand late events in theory. What they lack is an explicit reporting cut-off. The result is that daily dashboards feel tidal, and trust in the numbers starts eroding.

My own preference is straightforward:

- daily monitoring can use provisional figures, but the freshness should be made explicit
- weekly reviews and experiment readouts should use settled data with a grace period
- any metric with known lag should say so plainly rather than pretending to be real time

## Then check traffic quality: not all traffic deserves to shape product decisions

Most teams know they ought to exclude bot, internal, and developer traffic. Fewer teams do it rigorously.

GA4’s official guidance makes two very practical points:

- GA4 automatically excludes known bots and spiders, but you cannot see how much was excluded
- internal and developer traffic still need explicit filters 

That means **built-in bot filtering is helpful, but nowhere near enough on its own.**

If you rely only on default exclusions, you can still end up with:

- traffic from a country or referrer spiking for non-human reasons
- landing-page views exploding while nothing downstream moves
- the top of the funnel swelling with no corresponding product value
- employee testing, QA work, or support operations distorting production analytics

PostHog’s own guidance on filtering internal users fits the same story. This is not cosmetic. If traffic quality gets dirty, conversion, retention, and even experiments will all bend with it. 

### Signals I would watch closely

- country, IP, or referrer patterns that do not resemble real user behaviour
- pageviews or searches rising sharply while view-to-start-to-pay remains flat
- important dashboards that still include internal cohorts
- developer debug mode, staging builds, or test accounts leaking into production analytics
- event counts swelling around app releases or QA cycles in ways that make no behavioural sense

## Then check the rollout: a lot of metric incidents are really release-control incidents

This is the layer PMs tend to underestimate.

Many people treat rollout as an engineering detail. But if you are looking at product metrics, experiments, or data incidents, release control sits right on the front line.

LaunchDarkly’s documentation is very practical here: release flags let you roll features out progressively, and kill switch flags exist so you can shut off functionality quickly in an incident. Firebase Remote Config rollouts make a similar point from another angle: monitor the rollout with Crashlytics and Google Analytics and compare the rollout group with a control group as you expand exposure. 

Underneath the terminology, the message is the same:

> production is not a binary place. You need a control layer that lets you release gradually, observe, stop, and roll back.

### Why progressive rollout matters

Because some problems only reveal themselves under real traffic:

- certain devices crash
- a region-specific network path is slower
- a third-party service becomes unstable at higher load
- a new flow floods support
- edge cases only emerge at production scale

If you switch everything on at once, you multiply both the risk and the diagnostic complexity.

A steadier rhythm is usually:

1. start with a small rollout
2. watch the core metrics and guardrails
3. watch crashes, latency, support load, and payment errors particularly closely
4. expand gradually if it stays healthy
5. use a kill switch or rollback quickly if it does not

### Rollout is not the same as an A/B test

This distinction matters.

- **An A/B test** is mainly trying to answer “which version is better?”
- **A rollout** is mainly trying to answer “can this version survive production safely?”

The two support each other, but they are not interchangeable.  
Some changes deserve a proper experiment first and a rollout afterwards.  
Some high-risk changes may skip a classic A/B design but still absolutely require a guarded rollout.

## A data debug playbook I would actually use

Suppose one morning you see:

- a key metric jumping
- a funnel snapping
- retention suddenly changing shape
- an experiment result looking too strange to trust

My suggestion would be to inspect things in this order.

### Step 1: check the release log

- was a feature flag ramped up?
- was there an app release, SDK upgrade, or tracking-code change?
- was a kill switch triggered or a rollback performed?
- did an ETL job fail or run late?

### Step 2: inspect traffic composition

- which countries, devices, referrers, or platforms moved?
- did internal, developer, or QA traffic leak in?
- is there a recognisable bot or spam pattern?

### Step 3: inspect identity

- did identify or merge rates drop?
- did the balance between anonymous and logged-in events shift?
- did the difference between user counts and device counts widen?
- does the experiment assignment unit conflict with the identity model?

### Step 4: inspect time

- did lag between event time and processing time increase?
- are you still inside a backfill window?
- are some key events arriving materially later than usual?

### Step 5: only then inspect SQL

- did the join key change?
- did a filter exclude too much?
- did the denominator definition move?
- did somebody mix session, user, and order-level grain?

The advantage of this sequence is that it forces you to inspect the data-generation and control layers before vanishing into query detail.

## How daily monitoring and weekly review should connect

Monitoring that lives only inside dashboards often turns into daily line-watching and weekly confusion.

I prefer splitting the cadence in two.

### Daily monitoring should watch

- real-time health metrics such as crashes, payment errors, and support volume
- rollout-group versus control-group stability
- event volume, identify rates, and ingestion lag
- sudden inflation at the top of funnels
- internal or spam traffic anomalies

The point here is early detection, not grand conclusions.

### Weekly review should watch

- settled versions of the core metrics
- changes at cohort and segment level
- whether last week’s rollout or experiment should be shipped, iterated, killed, or rerun
- which issues are clearly instrumentation problems and should not be used in product arguments
- which guardrails now deserve permanent monitoring

Daily work acts like radar. Weekly review acts more like judgement.  
You need both if you want a stable operating rhythm.

## Closing thought

If I had to compress this article into one line, it would be this:

> when metrics jump, funnels snap, or experiments look odd, do not blame SQL first. Check identity, event timing, traffic quality, and release control before you come back to the query.

Because quite often the query is only the mirror.  
The real fault lies upstream in the identity model, the event pipeline, the cleanliness of the traffic, or the release rhythm.

This also works nicely as the closing move of the whole series core. By this point, the reader should have a reasonably complete skeleton for product data and experimentation: how to define success, govern metrics, plan tracking, query behaviour, read cohorts, protect experiment validity, and debug data before jumping to conclusions. That is the point at which a growth series becomes genuinely useful rather than merely tactical.
