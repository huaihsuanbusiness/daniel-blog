---
title: "PM Growth Levers and Monetisation 04 － Monetisation Is More Than Slapping on a Paywall: How to Choose Between Fake Doors, Trials, Bundling, and Usage Limits"
description: "When teams start talking about monetisation, the conversation often rushes straight to the paywall."
categories: ["pm"]
tags: []
date: 2026-04-05T16:11:00
series: "PM Growth Levers and Monetisation Series"
seriesOrder: 4
---

When teams start talking about monetisation, the conversation often rushes straight to the paywall.

Move the wall earlier.
Tighten the free plan.
Make the upgrade CTA more prominent.
Shorten the trial.
Restrict more things.

Those moves sometimes help. But when every monetisation problem gets treated as a paywall problem, it usually means something more basic has gone wrong:

**the team has not yet worked out what uncertainty it is actually trying to reduce.**

Because monetisation problems are rarely all the same problem.

Sometimes the uncertainty is:
- does anybody genuinely want this paid value?
- do users need to experience it before they will pay for it?
- are the plans packaged in the wrong way?
- should charging be tied to features, seats, or usage?
- are we placing the limit too early, too late, or on the wrong action altogether?

If all of that gets collapsed into “let’s optimise the paywall”, teams end up running monetisation experiments that look busy but teach them very little.

So the central claim in this article is simple:

> the first step in monetisation is not designing the paywall. It is deciding whether your current uncertainty is about demand, value experience, packaging, or usage thresholds.

Once you separate those questions, the choice of experiment becomes much less muddy.

## The common mistake: treating every monetisation issue as a paywall issue

The paywall is visible, which is part of the problem.

It is easy to discuss.
Easy to redesign.
Easy to blame.

But many stalled conversion problems begin further upstream.

For example:
- users have not yet been convinced that the value is worth paying for
- the product needs more hands-on experience before a payment conversation makes sense
- the paid package is poorly assembled, so there is no clean upgrade logic
- the limit is in the wrong place, blocking both high-intent and low-intent users in equally clumsy ways
- you do not even know whether the new premium feature has real demand

In those cases, rewriting the paywall is often local cosmetics. The page might improve. The learning usually does not.

That is why I prefer to split monetisation experiments into four broad types:

1. **Fake door**: validate demand first
2. **Trial**: let users experience value before asking them to pay
3. **Bundling / packaging**: combine value into a more coherent upgrade path
4. **Usage limits**: align the payment moment more closely with consumption and value

These are not mutually exclusive. They simply answer different questions.

## Validate demand first: when a fake door is the right move

A fake door is most useful when the core uncertainty is very specific:

> is this premium feature or paid offer wanted enough to justify building it?

Optimizely describes a painted door test as a false-feature method that lets you test feature or market ideas before committing significant development effort. [^optimizely-painted]

Amplitude’s explanation is even more useful for PM work. It defines fake door testing as creating UI elements that look real but do not yet work, then tracking who clicks, when they click, and how often they try. That gives you behavioural evidence rather than stated preference. [^amplitude-fake-door]

The important point is not the fake button itself. It is what the method is good at validating:

- whether demand exists at all
- which segments care most
- whether the interest is strong enough to show up in behaviour, not just in interviews

### When a fake door is a strong first step

- you want to test whether a premium feature is worth building
- you want to see whether a paid add-on attracts any real interest
- you suspect a packaging direction has promise, but do not want to fund a full build yet
- you want to recruit high-intent beta users before development is complete

### What a fake door actually measures

This needs to be stated plainly because fake doors are easy to romanticise.

What they usually measure is:
- interest
- intent to explore
- willingness to opt in

What they do **not** measure is:
- actual usage satisfaction
- long-term retention
- the full picture of willingness to pay

Amplitude says this directly: fake doors measure intent, not satisfaction, and they work best for discrete, easy-to-understand features rather than complex multi-step workflows. [^amplitude-fake-door]

### The boundary: do not spend trust carelessly

A fake door is cheap in engineering terms, but not always cheap in trust terms.

Amplitude explicitly warns that fake doors carry reputation risk if they are not handled transparently. It recommends disclosing the test immediately after the click, explaining why demand is being tested, and offering something useful in return, such as a waitlist or beta access. [^amplitude-fake-door]

That is why I would not use fake doors for:
- highly trust-sensitive financial promises
- regulated or payment-sensitive capabilities
- messages where “we said it existed but it does not” would feel like a serious breach

Use the method to validate demand, not to mortgage credibility.

## Let users experience value first: when a trial is more appropriate

Some conversion problems have little to do with missing demand. The issue is that users have not yet properly experienced the value.

That is where trials usually make more sense than a harder paywall.

The uncertainty a trial answers is different:

> if people can actually use this for a controlled period, are they more likely to understand the value and convert?

Stripe’s subscription and trial documentation is helpful here because it treats trials as part of the billing lifecycle, not just a marketing gimmick. Stripe explicitly supports trials alongside recurring subscriptions, upgrade paths, and even usage-based billing. [^stripe-trials] [^stripe-free-trials]

That is a useful reminder:

**a trial is not just a discount. It is a deliberately designed exposure window in which the user gets a chance to experience value under controlled conditions.**

### When a trial is a better fit than a fake door

- you already have reasonable confidence that demand exists
- the value is experiential and hard to judge from copy alone
- the product needs some hands-on setup or exploration
- you are trying to learn about paid conversion, not just surface-level interest

### The trade-off: shorter is not always smarter

OpenView’s reverse-trial piece lays out the tension well. Traditional free trials often produce stronger urgency and better free-to-paid conversion than freemium, but that only helps if users can reach meaningful value within the trial window. If they cannot, a short trial simply throws people out before they understand the product. [^openview-reverse-trial]

That is why trial length should follow time to value, not impatience.

If the product naturally requires users to:
- import data
- wait for results
- invite teammates
- complete a full usage cycle

then an overly short trial is often just a faster route to misunderstanding.

### When a reverse trial is worth considering

OpenView defines a reverse trial as giving new users temporary access to premium features and then, if they do not upgrade, dropping them back to a free tier. [^openview-reverse-trial]

That model can be especially sensible when:
- you want to preserve a free entry point
- you still want new users to see the upper bound of premium value
- you care about long-term adoption as much as immediate conversion

It will not suit every product, but it can be a very practical fit for product-led businesses that want both acquisition and premium exposure.

### Trials also carry operational and compliance detail

Stripe also notes that if you offer trials or promotions, you still need to comply with notification requirements around trial endings and billing changes. [^stripe-compliance]

That is worth underlining because trial design is not just a growth dashboard decision. It also touches billing, email notifications, payment authentication, and the user’s experience at the moment the trial rolls into paid status.

## Repackage the value: when bundling or packaging is the real problem

Sometimes conversion stalls not because the value is weak, but because the value has been sliced too thinly.

That is when the problem looks more like packaging than paywall copy.

Paddle / ProfitWell defines product bundling quite simply: complementary products or capabilities are sold together as a whole, making the value proposition easier to understand while increasing what the business can sell in a single motion. [^paddle-bundling]

OpenView makes a related point in its pricing mistakes article: good-better-best packages are common because they often strike a workable balance between simplicity for the customer and upsell flexibility for the company. [^openview-packaging]

### When bundling helps

- the capabilities are naturally complementary
- what users are buying is an outcome, not a feature checklist
- the current plans are so fragmented that users can see isolated feature value but not a compelling upgrade path

### When bundling goes wrong

- you are just tying slow-selling features together and calling it strategy
- the bundle does not map cleanly to a persona or use case
- it looks as though the company is trying to sell more rather than help the customer succeed faster

The central test is simple:

**does the bundle make the value easier to understand, or does it merely make the pricing page more confusing?**

If the answer is the latter, the problem is not solved. It has just become harder to read.

## Align the payment moment with value: when usage limits make more sense

For some products, the right monetisation move is not locking away features entirely. It is aligning payment more closely with the way value is consumed.

Stripe’s explanation of usage-based pricing is clear: charges are tied to usage rather than a flat recurring amount. [^stripe-usage]

OpenView’s advice on monetising APIs adds the sharper PM layer: the critical choice is not whether you can bill on usage, but whether the metric you bill on is actually correlated with the value the customer receives. Choose the wrong metric and you either undercharge, overcharge, or charge for things that do not feel like value at all. [^openview-usage]

That matters well beyond APIs. A lot of “limit strategy” failures happen because the limit sits on the wrong action.

### Good usage limits tend to have a few properties

- the limit is connected to something the user experiences as meaningful value
- the free experience still allows a genuine first success
- once the limit is hit, the reason to upgrade is understandable
- the post-upgrade value expansion is obvious

### Bad usage limits often look like this

- users hit the wall before they have experienced value
- the limited action is low-value, not high-value consumption
- the free plan cannot complete a meaningful job
- the threshold is so opaque that users cannot tell what they are buying

Stripe’s piece on pricing iterations is useful here as well. It frames pricing changes as evidence-based adjustments that can include new tiers, changes to usage thresholds, experimental bundles, and segment-specific discounts. [^stripe-iterations]

That is the right mentality.

**A usage threshold is not a line you sketch out of frustration. It is a monetisation decision that should be calibrated against observed value and behaviour.**

## How to choose: what uncertainty is largest right now?

If I had to compress this article into a decision map, it would look like this.

### 1. Your biggest uncertainty is “does anyone actually want this?”
Use a **fake door**.

### 2. Your biggest uncertainty is “does using it make people more likely to pay?”
Use a **trial**.

### 3. Your biggest uncertainty is “what is the right upgrade composition?”
Look at **bundling / packaging**.

### 4. Your biggest uncertainty is “where should the payment threshold sit so that it tracks value?”
Look at **usage limits** or broader usage-based logic.

All four may eventually affect the paywall, but they are not the same layer of decision.

The paywall is often the final presentation layer. If the upstream judgement is wrong, polishing the paywall simply makes the wrong answer more elegant.

## When not to optimise the paywall too early

This article needs a counterexample section, otherwise it will sound like all roads still lead back to paywall design.

They do not.

### 1. The user has not yet reached the first value moment

If nobody has succeeded once, the problem is still activation. Asking for payment before the product has proved itself is often premature.

### 2. You do not know whether the premium value is actually wanted

In that case, a fake door or another demand test usually teaches you more than a fully built paid flow.

### 3. The package itself is unstable

If plan boundaries make no sense, personas are muddled, and the upgrade logic is vague, the paywall is not the main battlefield.

### 4. The usage threshold is obviously in the wrong place

If the threshold is wrong, rewriting the paywall is like repainting the doorframe while the staircase is still broken.

## What a PM should actually deliver here

If I were leading monetisation, I would want the team to produce more than “a new paywall experiment”. I would want four things.

### 1. A monetisation uncertainty map

Be explicit about whether you are testing:
- demand
- value experience
- packaging
- usage threshold logic

### 2. Success metrics matched to the experiment type

For example:
- fake door: click-through, waitlist opt-in, segment quality
- trial: trial-to-activation, trial-to-paid, post-trial retention
- bundle: attach rate, upgrade rate, ARPU or plan mix
- usage limit: threshold hit rate, upgrade conversion, churn after hitting the wall

### 3. A check beyond immediate conversion

If revenue goes up but refunds, early churn, activation drop-off, or user frustration also rise, you may just be pulling revenue forward rather than improving monetisation.

### 4. An experiment that can answer “build this” versus “change direction”

That is what makes a monetisation experiment genuinely useful.

## Closing thought: monetisation is not about building a taller wall. It is about placing the payment moment in the right place.

I used to think about monetisation mostly through paywalls and pricing pages. The more I separated demand, trial design, packaging, and usage thresholds, the less convincing that became.

Sometimes the first thing to test is whether anybody wants the offer at all.
Sometimes it is whether hands-on value changes willingness to pay.
Sometimes the package is the real problem.
Sometimes the threshold is disconnected from value.

Mature monetisation work is not “conversion fell, move the wall forward”. It is knowing which uncertainty you are actually trying to resolve.

Get that diagnosis right, and the paywall can become a sensible final touch. Get it wrong, and the paywall often becomes a prettier wall built around a bad assumption.

## References

[^optimizely-painted]: Optimizely, “What is a painted door test? It’s benefits and examples”.
[^amplitude-fake-door]: Amplitude, “What Is Fake Door Testing: Methods And Best Practices”.
[^stripe-trials]: Stripe Docs, “Configure trial offers on subscriptions”.
[^stripe-free-trials]: Stripe Docs, “Use free trial periods on subscriptions”.
[^openview-reverse-trial]: OpenView, “Your Guide to Reverse Trials”.
[^stripe-compliance]: Stripe Docs, “Manage compliance requirements for trials and promotions”.
[^paddle-bundling]: Paddle / SBI Growth, “Product Bundling Basics & Examples”.
[^openview-packaging]: OpenView, “The 5 SaaS Pricing Mistakes You’re Probably Making (And How to Avoid Them)”.
[^stripe-usage]: Stripe, “What is usage-based pricing?”.
[^openview-usage]: OpenView, “4 Tips to Monetise APIs With Usage-Based Pricing”.
[^stripe-iterations]: Stripe, “How to implement pricing iterations for your business”.
