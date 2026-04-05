---
title: "PM Growth Levers and Monetisation 01 － Activation Is Not Onboarding: PMs Should Start with the Aha Moment, TTFV, and the First Verifiable Value Moment"
description: "A lot of teams say they want to improve activation, but what they actually end up working on is onboarding."
categories: ["pm"]
tags: []
date: 2026-04-05T16:08:00
series: "PM Growth Levers and Monetisation Series"
seriesOrder: 1
---

A lot of teams say they want to improve activation, but what they actually end up working on is onboarding.

A slightly smoother welcome flow.
A shorter profile form.
A few more product tips.
A cleaner checklist.

Those things can help, but they are not activation. They are only part of the route.

**Activation answers a harder question: has the user actually reached product value, or have they merely completed the tour you designed for them?**

That distinction sounds fussy until you see what happens when teams blur it. They ship plenty of onboarding improvements, celebrate better completion rates, and then wonder why retention refuses to move. The flow became easier to finish. The product did not become easier to believe in.

The most useful way I know to frame it is this:

> onboarding is the path to value; activation is the first moment of verifiable value.

That is the line this article is trying to draw.

## Why teams keep confusing activation with onboarding

The confusion is common for fairly boring reasons.

First, onboarding is visible.  
You can count how many people completed the checklist, filled in the form, or clicked through the tutorial. Those events happen early, they are easy to instrument, and they look reassuring on a dashboard.

Second, the real value moment is often fuzzier.  
In many products, value does not arrive the second a user clicks something. It may depend on data arriving, another person replying, a workflow finishing, or a result being confirmed. When that happens, teams often settle for “finished onboarding” because it is easier to measure.

Third, many products have never properly defined what it means for a user to have “got value” in the first place.  
When that definition is vague, teams default to whatever is easiest to count.

The problem is not that onboarding metrics are useless. It is that they are often **preconditions**, not value itself.

PostHog’s definition is a good corrective here. It describes activation metrics as a set of actions new users take that correlate with greater retention. That moves the discussion away from “this feels important” and back towards “does this behaviour actually predict that the user is more likely to stick around?”[^posthog-activation]

## How I would define activation: start with the first verifiable value moment

If you stop at “aha moment”, the idea can still stay annoyingly vague. Aha is emotionally right, but operationally slippery.

So I prefer to start with something a bit stricter:

**the first verifiable value moment.**

I use three checks to decide whether an event is a credible candidate for activation.

### 1. The user has done something meaningfully tied to the job

Not merely watched the tutorial or dismissed the tooltip, but taken an action linked to the product’s core use case.

For example:
- sending the first message in a collaboration tool that actually gets a reply
- publishing the first report in an analytics product that someone else will use
- completing a search in a booking product that returns options fitting the user’s dates and constraints

### 2. The system has returned a result the user can actually perceive

Not just “saved successfully”, but something the user can see, inspect, or work with.

For example:
- a result page that is not empty
- a first dashboard that is not a blank shell
- a recommendation list that is concrete enough to act on

### 3. That result is connected to the user’s original problem

This is the bit teams skip most often.

Users do not arrive to complete your setup ritual. They arrive to solve something.  
So activation is not “they completed our process”. It is “they now have enough evidence to believe this product might genuinely help”.

Amplitude’s framing of time to value gets close to this. It describes TTV as the span between “I’ve just signed up” and “this actually helps me”. That is much more useful than measuring how fast somebody got through the admin. The real question is when the first meaningful outcome showed up. [^amplitude-ttv]

If an event only passes the first check, it is usually too early.  
If it passes the first two, it may still be interaction rather than value.  
If it passes all three, it is finally worth considering as the centre of your activation definition.

## Aha is not something to worship. It has to be translated into a proxy.

This is where many teams get stuck:

“If the aha moment is subjective, how are we supposed to measure it?”

Usually, you do not measure aha directly. You define an **aha proxy**.

That means choosing a trackable behaviour that stands in for the value moment. It does not need to be perfect, but it should do two things reasonably well:

- stay close to the real product value
- correlate with downstream retention or revenue better than shallower events do

The common mistake is to confuse “the earliest thing that happens” with “the best representation of value”.

Take a booking product:
- completing sign-up is early, but shallow
- finishing preference setup is still shallow
- running a first search is getting warmer
- getting search results is warmer still
- viewing several listings that actually fit the trip may be a stronger proxy
- saving one might be stronger again
- completing the first booking may be too late, because pricing, supply, trust, and payments all get mixed in

The PM move here is not to pick one event by instinct. It is to line up a few candidate proxies and compare how well they predict D7, D30, repeat use, or paid conversion.

That is broadly the approach PostHog describes as well. They did not begin by declaring one sacred activation event. They compared plausible behavioural combinations and looked for the ones most associated with higher long-term retention. [^posthog-activation]

**Aha can stay subjective. The proxy cannot stay purely intuitive.**

## What TTFV really needs you to shorten

When people hear “time to value”, they often think “right, let’s trim the onboarding flow”.

Sometimes that is correct, but often it is only part of the story.

TTV is not the time from sign-up to finishing the tutorial. It is the time from sign-up to the first meaningful outcome. In practice, you are usually trying to reduce one or more of these distances:

- the distance from sign-up to the first core action
- the distance from the first core action to the first visible result
- the distance from the first visible result to the first trusted value moment

Those are not always solved in the same way.

Sometimes the problem is a bloated form.  
Sometimes it is an empty page.  
Sometimes the product demands too much setup before it will reveal anything useful.  
Sometimes the deeper issue is that value depends on network effects, inventory depth, or team adoption.

So instead of asking only, “how do we shorten onboarding?”, I prefer to ask:

> is the user getting stuck before value appears, or after value appears but before they trust it?

Those are very different bottlenecks.

## The activation levers that actually matter

This is not meant to be an onboarding tactics list, but there are a few levers worth taking seriously because they directly compress the distance to value.

### 1. Move value earlier instead of demanding commitment first

Amplitude makes a practical point here: do not force users to complete their entire profile or setup before they can do anything useful. Sample data, pre-filled templates, and “try it now” flows are all variations of the same idea: let value show up before commitment is fully paid. [^amplitude-ttv-short]

This matters a lot in SaaS.  
If a reporting product asks users to complete a dozen configuration steps, connect data sources, invite teammates, and define roles before the first useful report appears, poor TTV is almost guaranteed.

### 2. Empty states are not decorative. They are part of activation.

Appcues’ point about empty states is one I agree with strongly. Empty states are often where a new user first meets the real product. A blank screen is not just ugly. It kills momentum. A useful empty state should at least explain where the user is and what they should do next. [^appcues-empty]

If your product has dashboards, inboxes, libraries, projects, or workspaces, empty states are not edge-case UI. They are often part of the activation experience itself.

### 3. Give users example assets instead of handing them a blank canvas

Templates matter because they help users cross the “from nothing to something” gap. Appcues’ GoodUX breakdown of PandaDoc’s quick-start templates makes the point nicely: many users are not struggling because they dislike the product. They are struggling because they do not want to begin from a blank page. [^pandadoc-template]

That is not just a nice UX flourish. It reduces the distance between an empty account and the first workable artefact.

### 4. Turn the core action into a one-click move where you can

If you already know a certain action is tightly linked to retention, the thing worth optimising is often not the whole onboarding sequence. It is making that action dramatically easier to happen.

For instance:
- create the first list in one click
- import sample data in one click
- save the first candidate in one click
- send the first invite in one click

That may look like interaction design, but strategically it is activation design.

## When the problem is not onboarding at all

This article would be too tidy if it implied that better onboarding always fixes activation. It does not.

Here are a few cases where the leak is elsewhere.

### 1. The traffic is wrong

If the people arriving are a poor fit in the first place, smoother onboarding just escorts the wrong audience to the exit faster. In that situation, fixing the promise, the targeting, and the landing page usually matters more than polishing the welcome flow. That is where the next article will pick up.

### 2. The core value does not form quickly enough

Imagine a two-sided marketplace with thin supply. Search often returns poor results. In that case, it does not matter how elegant the onboarding is. The real problem sits in supply quality, market density, or product value, not the tutorial.

### 3. The chosen proxy is too shallow

If activation is defined as “finished onboarding” or “created an account”, the team will get very good at driving those numbers up. What they may not improve is retention. This is how seemingly healthy activation metrics become a polite form of self-deception.

### 4. The value moment is not naturally instantaneous

Some products simply do not have a single click that equals value. Analytics tools, recruitment products, data platforms, and collaborative systems often need a staged definition. In those cases, the right move is to articulate the first verifiable value moment more carefully, not to force everything into one tidy event.

## What a PM should actually deliver

If I were responsible for activation, I would not want the team to leave with a prettier flow alone. I would want four concrete outputs.

### 1. A written definition of the first verifiable value moment

One sentence explaining when the user first has credible evidence that the product is helping.

### 2. Two to four candidate aha proxies

Not one prematurely sacred number, but a small set of plausible activation candidates.

### 3. A retention or revenue check against each proxy

At minimum, compare them against D7 or D30, or whatever repeat-use window genuinely fits the product.

### 4. A TTFV breakdown

Map the path from:
- setup
- first action
- first result
- first verified value

Once that map exists, many arguments become easier. You can see whether the problem sits in forms, empty states, sample assets, supply depth, or a weak definition of activation itself.

## Closing thought: activation is not about getting users in. It is about helping them win once.

I used to think about activation mostly as onboarding optimisation. The more time I spent looking at funnels, candidate proxies, and retention behaviour, the less convincing that became.

Onboarding still matters, obviously. But it is a bridge, not the destination.

Useful activation is not about getting somebody through your process. It is about helping them **win once**, even if that first win is small. It has to be connected to the product’s core value, and ideally it should be measurable in a way that stands up once you compare it against retention.

If you are staring at onboarding completion rates and still cannot move D7 or first conversion, I would not begin by asking whether you need more tooltips. I would begin by asking whether you have actually defined activation properly.

The next piece moves one step earlier in the chain: many growth experiments fail long before the product is judged. They fail because the promise is vague, the framing is off, or the landing page does not cash the cheque the ad or headline wrote.

## References

[^posthog-activation]: PostHog, “How we found our activation metric (and how you can too)”.
[^amplitude-ttv]: Amplitude, “What Is TTV: A Complete Guide to Time to Value”.
[^amplitude-ttv-short]: Amplitude, “Time to Value: The Key to Driving User Retention”.
[^appcues-empty]: Appcues, “Your product’s empty states deserve more love. Here’s how.”
[^pandadoc-template]: GoodUX / Appcues, “PandaDoc’s quick start templates”.
