---
title: "PM User Research and Fieldwork 01 － When the Dashboard Speaks but the User Does Not: Why PMs Need User Research to Close Product Blind Spots"
description: "Concept calibration / series opener"
categories: ["pm"]
tags: []
date: 2026-04-05T16:14:00
series: "PM User Research and Fieldwork"
seriesOrder: 1
---

## Article type

Concept calibration / series opener

## The one thing this piece is trying to say

A lot of PMs do not suffer from a lack of data. They suffer from treating data as if it were the answer.

A dashboard is excellent at telling you where users drop, which cohort is weaker, or where a journey slows down. What it usually cannot do on its own is explain the trade-offs in a user’s head, the constraints around them, or the workaround they have stitched together outside your product. That gap is where user research earns its keep.

Put more plainly:

**Data is good at pointing to patterns. User research is good at supplying context. Better product judgement comes from knowing which kind of evidence is currently missing.**

## Start with a familiar mistake

Imagine you work on a hotel-booking product.

One week, you open the dashboard and notice that `Start Booking Rate` is broadly flat, but `Payment Success Rate` has fallen sharply. Your first reaction might be one of these:

- the payment flow is broken
- the price feels too high
- a coupon or promo path has failed
- a certain card type is not supported properly
- the mobile UI has introduced friction

All of those are plausible. None of them is yet an answer.

Because the same drop in payment completion might mask very different realities:

- users only realise the full price at the final step
- business travellers need invoice details that the flow does not support
- the card belongs to a partner or family member and the payment stalls
- the network is weak and the OTP arrives too late
- users are not unwilling to buy, they are unwilling to trust an unfamiliar platform with a card

The event stream can show you the drop. It cannot reliably show you the reasoning, the anxiety, the workaround, or the real-world situation surrounding that moment.
That is not a failure of analytics. It is a mismatch between the question and the instrument.

## I find it useful to think about three types of blind spots

This is the judgement frame I would start with. Otherwise teams often say “let’s do a few interviews” without being clear about what kind of uncertainty they are actually trying to remove.

### 1. Semantic blind spots

You tracked an event, but you do not know what that event actually means.

For example:

- `clicked_share`
- `saved_listing`
- `started_checkout`

Those events look tidy in a dashboard, but they do not automatically represent value, intent, or commitment.

Did the person share the listing because they wanted to recommend it, or because they wanted to send the link to themselves for later?
Did they save a property because they planned to book, or because they were building a comparison shortlist?
Did they start checkout because they intended to pay, or because they wanted to inspect the total price and cancellation policy first?

In cases like this, the problem is not a lack of volume. It is that **you are assigning too much meaning to the event itself**.

### 2. Context blind spots

You know what the user did, but not the situation in which they did it.

This is the blind spot PMs tend to underestimate most.
A great deal of friction is not contained neatly inside the UI. It lives in the surrounding context:

- who else is involved
- whether the person is commuting, working, standing at a counter, or at home
- whether they are copying information from another tool
- whether an internal approval or finance process is blocking them
- whether they need to check with a manager, a partner, or someone else before moving forward

If you only look at the event stream or a replay, you may see a finger moving about the screen. You may not see the environment that is forcing the detour.
That is exactly why field research and other context methods can matter so much. Sometimes the thing you need to understand is not the interface, but the setting.

### 3. Decision blind spots

You can see that people leave, but not the trade-off that led them to leave.

Some product problems are not usability problems. They are decision problems.

For example:

- the user is not confused, merely not urgent
- the user does not dislike the offer, but thinks the switching cost is too high
- the user is not unconvinced by the feature, but unconvinced by your company
- the user does have a pain point, but not one painful enough to force change

A funnel can tell you that people did not finish. It cannot tell you the standard by which they judged whether it was worth continuing.

## So what exactly is user research adding?

Not theatre. Not anecdotes for slide decks.

Good research tends to add four kinds of evidence.

### 1. How users frame the problem

This is the mental-model layer.

Do they think they are “booking accommodation”, or “reducing the risk of making a bad choice”?
Do they think your product helps them “complete a transaction quickly”, or “make a decision with confidence”?

That distinction changes how you define activation, how you phrase your value proposition, and what counts as a first value moment.

### 2. Where the real friction actually sits

A dashboard will often present the problem as a funnel step. The user may be experiencing it as a chain of connected frictions.

Take weak onboarding conversion. The issue may not be that the first screen is busy. It may be that:

- the benefit of the step is unclear
- users lack starter material
- they fear making an irreversible choice
- they do not know what happens after they complete the step

If you do not listen and observe, it is easy to polish the visible friction and miss the reason people do not want to continue in the first place.

### 3. Which workaround people use to get the job done

Workarounds are often more informative than complaints.

A user saying “this feature is a bit inconvenient” is vague.
Watching them do this is not:

- ask a colleague in Slack
- export to a spreadsheet
- clean things up elsewhere
- paste the result back into your product

That tells you the job to be done is not the isolated step you were focusing on. It is a broader workflow crossing tools, approvals, habits, and risks.

### 4. How users rank value against risk

A lot of growth work misses because teams assume convenience is the main lever.

Sometimes it is not. Sometimes users care more about:

- data security
- reversibility
- whether they might be stung
- compatibility with an existing way of working

These factors do not always show up neatly in an event schema, but they shape conversion and retention all the same.

## When should a PM research first instead of adding more events?

A practical rule I like is this:

**When your team can describe very clearly what is happening, but can only explain why through three or more plausible competing stories, it is probably time to add research.**

For instance:

- retention is down, but you cannot tell whether the issue is weak value, poor acquisition quality, or mistimed reminders
- activation is weak, but you cannot tell whether TTFV is too long, the promise is vague, or new users simply do not know what to do next
- one segment underperforms, but you cannot tell whether its context is different, its needs are different, or the workflow does not fit how that group actually works

At that point, more instrumentation may not rescue you.
What you may be missing is not resolution, but an interpretive frame.

## But not every problem calls for interviews

This matters because teams can become just as superstitious about user research as they are about dashboards.

There are a few situations where I would not start with research.

### 1. Your data quality is not stable yet

If tracking is broken, denominators are unclear, events are delayed, or identities are mangled, interviews can become a substitute for fixing your measurement layer.

Research will not repair an instrumentation bug.

### 2. The issue is obviously a technical or operational failure

If payment errors spike after a release, a form-validation rule is broken, or crash rate jumps on one device class, debug first. Research later, if needed.

### 3. The real shortage is commitment, not information

Some teams are not stuck because they do not know. They are stuck because they do not want to make a hard decision.

Perhaps everyone already knows the free tier is too generous, the empty state is too empty, or the trial lacks a proper handoff. No one simply wants to own the call.

In that situation, another round of interviews can become a very elegant delay tactic.

## Put research back into the PM workflow

The more useful way to position user research is this:

**Analytics should help you find anomalies, patterns, and segments. Research should help you recover meaning, context, and decision logic.**

In practice, the flow often looks like this:

1. use analytics to find where the drop is, who is dropping, and when
2. write down the most plausible competing hypotheses
3. decide which of those can only be separated by listening to users or seeing the work in context
4. run interviews, a field study, a diary study, or a usability session
5. feed the findings back into better tracking, clearer funnel definitions, sharper messaging, and stronger hypotheses

That keeps research from becoming a parallel side activity. It becomes part of the same decision system.

## A more practical warning for PMs

Many PMs are not anti-research. They are wary of research that feels slow, soft, and hard to connect to the roadmap.

That concern is fair.
When research is done badly, it really does collapse into:

- over-broad questions
- a wandering discussion guide
- the wrong participants
- a few memorable quotes
- no decision attached at the end

But when it is done properly, it tends to give you exactly the layer your dashboard cannot produce on its own:

- what users think you are helping them do
- how they describe their work in their own language
- what makes them delay
- which workaround they rely on
- which frictions are truly painful and which are merely irritating

And that small missing layer often determines whether your activation, value proposition, paywall, or lifecycle work actually lands.

## Where this series goes next

This opening piece is trying to settle one thing:

**User research is not a substitute for data. It is what you use to patch the blind spots in data.**

The next article will separate qualitative, quantitative, and mixed-methods work more carefully.
Because many PMs think they are choosing between “qual” and “quant”, when the real question is closer to this:

- what exactly am I trying to learn?
- do I lack pattern or context?
- do I need scale, or do I need to untangle causes?

If that distinction is fuzzy, the rest of the series goes crooked from the first step.
