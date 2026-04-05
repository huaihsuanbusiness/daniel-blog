---
title: "PM Product Data and Experimentation 03 － A Tracking Plan Is Not an Event Checklist: It Is a Data Contract Between PM, Engineering, and Analytics"
description: "When teams talk about a tracking plan, they often sound as if they are managing a to-do list."
categories: ["pm"]
tags: []
date: 2026-04-05T16:02:00
series: "PM Product Data and Experimentation Series"
seriesOrder: 3
---

When teams talk about a tracking plan, they often sound as if they are managing a to-do list.

Track this page.  
Track that button.  
Track payment success.  
Track saves.  
Track sign-up.

It sounds busy, and quite a lot of instrumentation does get shipped. But the moment someone tries to analyse the data properly, the edges start to fray.

The same `search` event means one thing on web and another on mobile.  
The same `booking_started` event fires when one team counts a CTA click, and another counts entry into the payment flow.  
`user_type` sometimes means free versus paid, and sometimes guest versus member.  
The data lands in the warehouse, yet the funnel still refuses to line up.

At that point, the real problem is usually not whether instrumentation exists. It is that **the data was never defined as something multiple teams could reliably agree to**.

That is why I have never thought of a tracking plan as an “event checklist”. I think of it like this:

**A tracking plan is a data contract between PM, engineering, and analytics.**  
It should first define what counts as an event in business terms, then specify how that data should be captured, and only after that worry about how the dashboards will look.

If the first two parts are fuzzy, every polished dashboard afterwards is just a prettier way of visualising ambiguity.

## Why teams often fail not because they did not track enough, but because they tracked in a way that could not be analysed

Sometimes teams really do not have instrumentation. More often, though, the data is already flowing and analysis is still a slog.

The symptoms are usually familiar.

### 1. Event names behave like personal notes instead of definitions

If event names are written only for the engineer implementing them, they usually turn into private shorthand that nobody else can read six months later. Things like `click_btn`, `submit_form`, `step2_next`, or `prod_event_7` may feel expedient in the sprint, but they age like milk.

A good event name is not about polish. It is about making future analysis, debugging, and cross-team collaboration possible.

Segment’s best-practice material recommends a consistent casing convention, typically Title Case for events and snake_case for properties. RudderStack similarly recommends descriptive, human-readable event names and explicitly warns against vague names such as `Event2`. Snowplow goes further and separates naming across event specifications, data structures, and properties, while making the broader point that consistency matters more than stylistic dogma. The issue is not whether Title Case is somehow nobler than snake_case. The issue is that **the same data system cannot look like documentation on Monday and a secret code on Friday**.

### 2. Multiple business actions get crammed into one oversized event

Another common failure is using one giant event to capture many actions, then relying on a `type` property to explain what really happened.

You see this with things like `booking_action`, where `action_type` is used to distinguish `search`, `view_listing`, `start_booking`, and `payment_success`. Technically it can work. Analytically it becomes a pain very quickly because every query starts with remembering which enum value means what, and whether all platforms use the same set.

Snowplow’s tracking design guidance says this quite plainly. An Event Specification should represent a single business event with a clear purpose, such as `Add To Cart`, `Checkout Started`, or `Order Completed`. If one bloated event tries to capture many separate actions, both implementation and analysis get muddled.

The real problem is not aesthetic untidiness. It is that **the grain of the data gets blurred at the moment of design**. Once an event no longer represents one action cleanly, funnels, conversion, task success, and experiment exposure all start to warp.

### 3. The team defines events, but not trigger conditions or field responsibilities

A surprising number of tracking plans stop at:

- Event name
- Description
- Platform

That looks like documentation. It is nowhere near enough.

The details that actually trip up analysis later tend to be the ones nobody wrote down:

- when the event should fire
- whether it should fire once or potentially multiple times
- whether the client sends it or the server does
- which properties are required
- what the property types are
- which enum values are valid
- whether a user trait comes from identify or from the event payload itself
- who owns the event
- how it will be validated after release

Twilio Segment’s definition of a tracking plan is refreshingly direct. It describes the tracking plan as the organisation’s single source of truth for what is tracked, where it is tracked, and why it is tracked. That is already much richer than “track this event”, because it links business intent to implementation location.

If a tracking plan tells you only what to track, but not where or why, the real meaning still lives in someone’s head. That is not a contract. It is folklore.

## First separate the responsibilities of events, properties, and user traits

This sounds basic, but many teams start slipping exactly here.

Amplitude’s distinction between user properties and event properties is very useful. User properties describe the user, such as plan type, referral source, or whether they are a paying customer. Event properties describe the context of a specific event. Amplitude also makes an important operational point: user properties can change over time, and new values are not applied retroactively to old events.

That matters enormously when designing a tracking plan.

My own rule of thumb is simple:

- **Event**: a clearly identifiable business action has happened
- **Event property**: context that is true for that action at that moment
- **User trait / user property**: a relatively stable attribute that is reused across events

In a booking product:

- `Search Performed` is an event
- `check_in_date`, `guest_count`, and `result_count` are event properties
- `member_tier`, `country_code`, and `is_host` are user traits

This split prevents the data model from doing something strange where the same field refers to a person in one chart and to an event in another.

Put more bluntly, if a value is only true for this one search, it should not be a user trait. If it is useful across many events, it probably should not be copied into every event property payload separately.

Once these responsibilities blur, dashboards do not merely become messy. Everyone starts telling plausible but incompatible stories with the same data.

## What a tracking plan should actually contain

I do not like tracking plans that are little more than spreadsheets with column names. I prefer them to sit somewhere between a specification and an analysis document. At minimum, they should contain the following layers.

### 1. Business purpose

Start by writing why the event deserves to exist.

Not “because everyone tracks it”, but “because this helps us answer a specific question”.

For example:

- `Search Performed`: tells us whether demand is actually entering the supply-matching flow
- `Listing Viewed`: tells us whether search results are compelling enough for users to click through
- `Booking Started`: tells us whether users are willing to move from browsing into transaction
- `Payment Succeeded`: tells us whether the transaction actually completed

### 2. Trigger condition

This matters more than the description.

For instance, `Booking Started` should not merely say “when booking starts”. It should be written much closer to a validation condition:

> Fire when the user clicks Book Now from the listing page or booking summary page and successfully enters the first actionable step of the checkout flow. Opening a modal without entering the flow does not count.

That is the level of precision you need if you want a funnel to mean anything later.

### 3. Required properties and types

List the properties that materially affect analysis, such as:

| property | type | required | example | meaning |
|---|---|---|---|---|
| `listing_id` | string | yes | `lst_1024` | listing identifier |
| `search_id` | string | yes | `srch_88af` | links one search to subsequent views |
| `result_count` | integer | yes | `42` | number of results returned |
| `check_in_date` | date | yes | `2026-05-01` | user-selected check-in date |
| `guest_count` | integer | yes | `2` | number of guests |
| `platform` | string | yes | `ios` | source platform |

Type information is easy to underestimate. It becomes painfully important later when you start filtering, grouping, validating, or debugging.

PostHog’s schema management product makes this explicit. Teams can define events before data is captured, attach typed property groups, and mark fields as required. That is not just tooling flair. It reflects a deeper truth: **if analytics is meant to be maintainable, the definition cannot live only in people’s heads**.

### 4. Ownership and validation

A tracking plan without ownership tends to become a shared document that nobody really owns.

I usually add at least two roles:

- **Implementation owner**: who is responsible for shipping the event correctly
- **Analytical owner**: who is responsible for confirming the event is usable

The validation section should then say at least three things:

- what a sample payload looks like
- where the event will be checked after release
- which sanity checks indicate that it is behaving plausibly

That is when the plan starts looking like a contract rather than a hopeful wish list.

## Naming conventions are not fussy housekeeping. They are how data remains maintainable

The common mistake here is turning naming conventions into a tiny sectarian war.  
There is no sacred style. There is only one real goal: **be consistent, and make the data easy to understand at a glance**.

My practical preference is:

- event names: human-readable and action-specific, using one tense consistently
- property names: snake_case
- enum values: tightly controlled dictionaries, not freestyle synonyms
- IDs: stable keys for important entities such as `user_id`, `search_id`, `listing_id`, and `booking_id`

You can follow Segment’s event Title Case plus property snake_case. You can follow Snowplow’s Title Case event specifications with snake_case data structures and properties. Either is fine, so long as the whole system speaks one language.

What you really want to avoid is this sort of thing:

- the same action is `Listing Viewed` on web and `view_listing` on mobile
- the same concept appears as `plan_type` one day and `user_plan` the next
- one enum contains `paid`, `Paid`, `premium`, and `pro`
- a team stuffs everything into abstract keys like `type`, `status`, or `value`

During the sprint, these look like pebbles. Three months later, when you are investigating a retention drop or an experiment side effect, they have turned into a wall.

## What counts as the minimum for a dataset to be analytically usable

Here I want to be a bit stricter than the average tracking-plan article.

Many teams treat “the event arrived in the warehouse” as equivalent to “the event is analysable”. I do not.

For me, an event becomes genuinely analysable only when several things are true.

### 1. The definition is clear enough that someone else can repeat it

A PM, engineer, or analyst who did not create the event should still be able to explain roughly when it fires and what question it exists to answer.

If the meaning has to be re-explained every time, the definition has not really stabilised.

### 2. The schema is stable and the types are predictable

Snowplow builds schema validation directly into the pipeline, so invalid events are routed separately rather than silently contaminating the analytics tables. That design is worth stealing. If your data quality checks begin only once the dashboard looks odd, you are already late.

### 3. The key joins exist

If the event cannot reliably connect to `user_id`, `session_id`, `search_id`, or `booking_id`, a great deal of funnel and attribution work will break later.

### 4. The fields support the breakdowns you will actually use

More properties is not the goal. **Useful properties** is the goal.

Platform, country, signed-in state, new versus returning user, traffic source, and payment method are often much more valuable than a heap of glamorous custom fields that nobody ever uses.

### 5. There is a QA process, not a prayer circle

Most teams know this. Far fewer operationalise it.  
I usually split QA into three layers:

- **Implementation QA**: is the payload structurally correct, complete, and well typed?
- **Behaviour QA**: when the user performs the action once, does the event fire once at the correct moment?
- **Analytical QA**: within a day of release, do volume, platform mix, and core enum distributions look plausible?

Once you reach that point, the tracking plan really does behave like a contract. Otherwise it behaves more like wedding vows. Lovely in the room, much less useful when the dishes pile up.

## Funnel closure is the validation step teams forget most often

I do not often see teams write funnel closure into the tracking plan itself. They should.

Funnel closure is not merely whether the events exist in sequence. It is whether:

- each step has a clearly defined event
- those event definitions do not overlap
- the steps can be linked through sensible keys
- the time windows and denominators make sense
- one platform is not structurally missing part of the journey

Take a booking flow with:

1. `Search Performed`
2. `Listing Viewed`
3. `Booking Started`
4. `Payment Succeeded`

At tracking-plan stage, the team should already be asking:

- does `Listing Viewed` always include `search_id`?
- does `Booking Started` always include `listing_id`?
- does `Payment Succeeded` always include `booking_id`?
- is `Booking Started` defined the same way on web and mobile?
- if the user crosses devices, can we at least reconnect at account level?

If those questions are postponed until the SQL stage, the funnel usually turns out to be a very elegant-looking pipe with holes everywhere.

## When not to make a tracking plan heavier than it needs to be

This is the boundary condition worth stating clearly.

I am not arguing that every small feature needs an 80-column specification and a formal ceremony.

Overweight process can be just as harmful, especially in early-stage work or rapid iteration.

If you are testing a small UX tweak or a one-off campaign landing page, the tracking plan can absolutely be lighter. But even then, I would still protect a few basics:

- event name and purpose
- trigger condition
- required properties
- owner
- QA method

In other words, **simplify if needed, but do not lose the point**.  
“Let us just track it first and sort it out later” often feels faster in the sprint and becomes much slower once the debt comes due.

## How I would write a tracking plan that is good enough to use

If a PM is drafting the first version, I would suggest a minimum like this:

1. Start from the metric tree or funnel and choose the 10 to 20 events that matter most  
2. For each event, define:
   - business purpose
   - trigger
   - owner
   - required properties
   - sample values
   - downstream metric
3. Pull cross-event information into user traits or reusable entities  
4. Define naming rules and enum dictionaries  
5. Write one QA checklist for each critical event  
6. Validate funnel closure before shipping broadly

The benefit is not only smoother implementation. The real benefit is that when you later move into SQL, cohorts, A/B validity checks, or data debugging, you are not wandering through fog. You are walking on a map that has already been drawn.

That, to me, is the real job of a tracking plan.

It is not an event checklist.  
It is the contract that translates business meaning into data meaning, so that engineering and analytics can both execute against the same reality.

Next, we can move into SQL.  
Because once the event layer is stable, SQL becomes evidence retrieval.  
Without that layer, it is just a more technical way of fishing noise out of the water.

## Image Asset Plan

1. filename: tracking-plan-data-contract-stack.svg
   purpose: Show the relationship between business purpose, event definition, properties, and QA
   placement: After the section on what a tracking plan should contain
   alt: Four-layer data contract structure for a tracking plan
   prompt: A blog-friendly SVG diagram showing a four-layer data contract for product analytics. Layers from top to bottom: Business Purpose, Event Specification, Properties and Traits, QA and Validation. Clean modern layout, rounded boxes, soft colours, English labels, minimal text, clear arrows, suitable for a technical blog.

2. filename: booking-funnel-closure-map.svg
   purpose: Show funnel closure and key joins in a booking product
   placement: After the section on funnel closure
   alt: Booking product funnel closure map with key identifiers
   prompt: A clean SVG diagram for a booking app funnel closure map. Steps: Search Performed, Listing Viewed, Booking Started, Payment Succeeded. Show join keys like search_id, listing_id, booking_id, user_id beneath each step. Rounded boxes, clear arrows, blog-friendly, English labels.
