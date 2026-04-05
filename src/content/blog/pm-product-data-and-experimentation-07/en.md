---
title: "PM Product Data and Experimentation 07 － A/B Testing Is Not Just Hypotheses and P-Values: PMs Need Exposure Rules, SRM, Guardrails, and Validity"
description: "A surprising number of experiments do not fail because the idea was weak. They fail for a far more awkward reason."
categories: ["pm"]
tags: []
date: 2026-04-05T16:06:00
series: "PM Product Data and Experimentation Series"
seriesOrder: 7
---

A surprising number of experiments do not fail because the idea was weak. They fail for a far more awkward reason.

You thought you were comparing treatment and control, but you were really comparing two groups that were never properly comparable.  
You thought users had seen the new experience, but many of them were only assigned to a variant and never genuinely affected by it.  
You thought the primary metric was up, only to discover that refunds, complaints, latency, crashes, or some downstream behaviour had quietly worsened alongside it.

If all you look at is the p-value, it is very easy to drift towards a dangerous conclusion:

> the experiment seems positive, so we can ship it.

The trouble is that **“the result looks positive” and “the result is trustworthy enough to act on” are not the same thing.**

The way I think about this is a deliberately practical three-layer check. It is not a universal definition. It is closer to a working PM rubric for ship, iterate, or rerun decisions:

1. **Who was actually affected?**  
   In other words: was the hypothesis clear, was the primary metric sensible, and was the exposure rule defined properly?

2. **Can the data itself be trusted?**  
   That is where SRM, logging quality, contamination, and spillover come in.

3. **Even if the signal is statistically real, is it worth shipping?**  
   That is where effect size, guardrails, cost, risk, and rollout conditions matter.

Plenty of teams focus on the third layer and write the first two far too loosely. That is how good changes get killed and bad changes get launched.

## Experiment design starts with defining success, not designing the variant

A decent experiment design should answer at least four questions:

- what changed
- which metric you expect to move
- which side effects would be unacceptable
- who genuinely counts as exposed to the change

Most teams are reasonably comfortable with the first two. The last two are where things often get vague.

Suppose you are testing new copy on a booking paywall. A lightweight experiment brief might say:

- hypothesis: the new copy will improve paid conversion
- primary metric: `payment_success_rate`

That is not wrong, but it is not enough.

You still need to state:

- the guardrails: for example `refund_rate`, `support_ticket_rate`, or `payment_error_rate`
- the exposure rule: does exposure mean “assigned to the paywall variant”, or “actually saw the paywall”?

That difference matters more than it sounds.

If a user is assigned to treatment but never reaches the paywall, or drops before it is rendered, they were technically bucketed but not meaningfully affected. If you pour those users into the denominator anyway, you dilute the signal and can even misread the direction of the effect.

So I like to write the first principle in almost blunt language:

> you are not testing an idea in the abstract; you are testing whether a specific change produced an acceptable effect for the people who were actually touched by it.

That framing prevents a lot of sloppy analysis later.

## Keep the primary metric short, and make the guardrails do real work

Statsig’s documentation is refreshingly practical on this point. It generally recommends keeping the list of primary metrics small, often one to three at most, while guardrails and explanatory metrics sit in secondary positions. That makes sense. When the primary success criteria sprawl, interpretation usually becomes mushy. By contrast, guardrails exist to define the conditions under which a “win” does not count. 

In a booking flow, if you are testing something designed to improve `booking_started` or `payment_success_rate`, sensible guardrails might include:

- `refund_rate`
- `cancellation_rate`
- `support_ticket_rate`
- `payment_error_rate`
- perhaps crash-free users, page latency, or support conversations

These metrics do not need to move every time. They do need to be written down before the fact. A lot of false victories are really just cost transfers to another part of the system.

### A structure I use a great deal

- **Primary metric**: the one metric you are genuinely willing to use for the decision
- **Guardrails**: health metrics you do not want to damage
- **Readout metrics**: intermediate or diagnostic metrics that help you understand mechanism, but do not independently declare victory

That split makes experiment readouts much easier to reason about.

## Exposure rules are not a technical footnote. They are the law of the denominator.

Many PMs know they need randomisation. Far fewer treat the exposure rule as a first-class decision.

That is risky, because **assignment is not the same thing as exposure**.

Statsig and GrowthBook have both been very clear in their documentation about the importance of exposure logging. Statsig treats exposure events as a minimum requirement for experiment analysis and health checks. GrowthBook is similarly explicit that the tracking callback exists so the system knows which user actually saw which variation. Without that layer, a great deal of apparent lift is really stage dressing. 

A common pattern is to assign a variant on page load even though the treatment only occurs later, perhaps when the user opens a modal, presses a button, or reaches a particular stage in the flow.

If you analyse all assigned users as the denominator in that scenario, two things tend to happen:

1. you include many people who never had a realistic chance of being influenced, so the effect gets washed out  
2. the composition of the truly affected users can differ between control and treatment, which bends the interpretation

A good exposure rule should answer three questions:

- **what is the trigger point**: when does a user genuinely count as exposed?
- **what is the analysis unit**: user, device, session, or account?
- **how do repeated exposures count**: the first exposure, every exposure, or only qualifying exposures?

This is not about making the rule more ornate. It is about making it clearer.

## SRM is not a minor warning. It usually means “do not trust this yet”.

If I had to pick one experiment health check that PMs should develop a reflex for early, it would be SRM: sample ratio mismatch.

Microsoft’s experimentation team states the principle plainly: **if an A/B test has SRM, do not trust the result until you diagnose the cause.** They have also written that, in one internal analysis, roughly 6% of their A/B tests showed SRM. Statsig likewise treats SRM as a central health check, using a chi-squared test to see whether the exposure mix has drifted away from the expected split. 

SRM does not merely mean “the split was not exactly 50/50, which looks untidy”. It means that the observed sample distribution differs from the configured traffic allocation by more than random variation would comfortably explain.

What makes SRM dangerous is this:

**the missing users are rarely random missing users.**  
They are often the users most affected by the thing you changed, or users with a distinctive technical path through the system. Once that happens, treatment and control stop being cleanly comparable.

Common causes include:

- missing or inconsistent exposure logging in one variant
- certain browsers or devices being logged correctly in only one arm
- redirects, slower load time, or crashes causing more drop-off in one variant
- broken joins or segmentation filters that exclude one side more aggressively
- users self-selecting into a variant
- uneven ramping that was never accounted for in the analysis

The pattern here is important. These are not issues you discover by staring harder at the uplift. They are issues you catch through health checks.

### My working rule is simple

- **if SRM persists, do not make a ship decision**
- inspect assignment, exposure logging, joins, and segment filters first
- until you find the cause, treat the result as a clue, not a conclusion

That one habit will save you a lot of pain.

## Contamination and spillover mean your experiment may not be cleanly isolated

Even without SRM, validity can still break.

Another family of problems that gets underestimated is contamination and spillover. In plain language: you thought control and treatment were separate worlds, but they leak into one another.

The common patterns are familiar:

- the same person arrives on multiple devices or browsers and identity is not stitched correctly
- users in treatment create content or inventory that users in control can still see
- in social, invite-driven, or marketplace products, one side’s behaviour changes the environment for the other side
- in ranking, search, or recommendation systems, experimental traffic changes a shared pool
- multiple people use the same account while the randomisation unit sits at browser or device level

At that point, even a statistically significant result may no longer be cleanly attributable to the variant itself.

So I usually start with one practical question:

> does this change only affect the assigned unit, or does it alter a broader shared environment?

If it is the latter, caution is warranted. You may still be able to run an experiment, but you may need a different randomisation unit, a revised exposure definition, or at the very least an honest limitation in the readout.

## Statistical significance is not enough, and business significance should not be used to excuse broken validity

Teams often say “statistical significance is not the same as business significance”, which is true, but they only apply half of the thought.

A healthier sequence is:

1. **first check that validity is intact**
2. **then decide whether the signal is statistically credible**
3. **only then ask whether it is commercially worth acting on**

The order matters.

If the experiment suffers from SRM, vague exposure rules, or broken joins, you cannot rescue it by saying “yes, but the uplift is large”. Sometimes the large uplift is precisely the artefact created by the bias.

On the other hand, even statistically significant movement may not justify a rollout.

For example:

- conversion improves by 0.2%, but the engineering and maintenance cost is high
- revenue rises, but refunds and support load rise with it
- an intermediate metric looks lovely, but medium-term retention does not improve
- the effect is positive overall, but negative in the most valuable segment

The real questions are then:

- is the effect size practically meaningful?
- did any guardrails regress?
- is the effect stable in the segments that matter?
- do the rollout costs, risks, and technical debt make sense relative to the gain?

## The PM’s job is not to read a p-value. It is to make a decision.

I find it much more useful to collapse experiment readouts into four actions rather than a single “winner” label.

### 1. Ship

Use this when:

- the primary metric improved
- the guardrails stayed healthy
- exposure, SRM, and logging all look clean
- the effect is large enough to matter
- no important segment shows a worrying downside

### 2. Iterate

Use this when:

- the direction looks promising
- mechanism metrics moved in sensible ways
- the main metric is not yet strong enough, or the effect is too small
- validity is fine; the version is simply not quite mature enough

### 3. Rerun

Use this when:

- SRM appeared
- the exposure rule was wrong or under-logged
- metric joins were faulty
- contamination was substantial
- the observation window was poorly chosen

The important move here is not to over-interpret. It is to admit that this run cannot support the decision.

### 4. Kill

Use this when:

- guardrails clearly worsened
- the commercial risk outweighs the gain
- a key high-value segment is harmed
- even if the change “works”, it is not the kind of growth you want

That framework sounds almost boring, but boring is good here. Repeatable experimentation rarely comes from fancier statistics alone. It comes from having consistent exits.

## When not to force everything into a standard A/B test

Although this piece is about experiment validity, not every change should be pushed through the same A/B testing template.

I would be cautious in cases like these:

- high-risk infrastructure migrations
- products with strong shared supply or marketplace effects
- features with obvious network effects
- very small samples paired with very low-frequency outcome metrics
- changes so broad that clean isolation between control and treatment is unrealistic

In those cases, staged rollout, guarded rollout, holdouts, before-and-after analysis with tighter monitoring, or smaller-scope directional tests can be more sensible. Sometimes a fake door or a round of qualitative work is the more honest first move.

An A/B test is not a magic ruler.  
Its strength depends on whether you actually preserved the conditions required for comparison.

## Closing thought

If I had to compress the whole article into one line, it would be this:

> before you ask whether the idea won, ask whether the right people were exposed, whether the data stayed honest, and whether the size of the effect is worth shipping.

That is why PMs need to understand exposure rules, SRM, guardrails, and validity. Not because they are trying to become statisticians, but because they are ultimately accountable for the ship or no-ship decision.

In the next piece, I want to push this into messier territory. Because in real product work, data rarely breaks at the SQL layer first. The more common culprits are identity, late events, bot traffic, and rollouts that went sideways.
