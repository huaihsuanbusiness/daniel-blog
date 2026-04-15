---
title: "Product Rhythms in the Age of AI Part02 | AI Won’t Replace PMs First. It Makes Some Work Cheaper Before It Does Anything Else"
description: ""
categories: ["pm"]
tags: []
date: 2026-04-15T05:01:00
series: "Product Rhythms in the Age of AI"
seriesOrder: 2
---

I’ve become increasingly impatient with the question of whether AI will replace PMs.

Not because it’s too big. Because it flattens too many different kinds of work into one anxious bundle. It usually leads to a very dull kind of discussion: which tasks AI can do, which ones humans still do better, and how long that gap might last. That framing is not especially useful if you’re actually trying to build products.

The question I care about now is different.

Once AI enters the workflow, which parts of PM work become cheaper, and which parts become more valuable?

That question forces you to separate the role into layers. A lot of work that used to be time-consuming, and was often mistaken for core product value, is becoming cheaper quite quickly. Meeting summaries. Requirement synthesis. First-pass PRDs. Initial user stories. Draft acceptance criteria. Early test cases. Even parts of exploration that follow a fairly recognisable pattern. AI can now do a first round of all that.

That doesn’t make those things unimportant. It just makes them less scarce.

If a PM’s value is still tied too heavily to “I can manually tidy all this information into a clean package”, that position is eventually going to loosen.

But that does not mean the role gets smaller.

If anything, I think AI makes it easier to see which parts of product work always mattered most. Atlassian’s 2025 DevEx research carries a tone I find quite revealing. Teams do feel AI is saving them time. But that saved time does not automatically dissolve organisational friction. In other words, the cost of moving information around may fall, while judgement, alignment and trade-offs remain expensive.

The way I now think about PM work is roughly in four parts.

| Capability | What AI compresses | What still needs human ownership |
| --- | --- | --- |
| Framing | First-pass synthesis, restating the problem, collecting inputs | Deciding which problem is actually worth solving now |
| Slicing | Drafting feature options and first-pass stories | Turning a large problem into a smaller bet worth testing |
| Validation design | Producing rough test ideas and metric candidates | Deciding what counts as evidence and what is only noise |
| Trade-offs | Expanding option space and drafting rationale | Choosing what to do first, what to leave out, and why |

The first is framing.

Not translating an incoming request into a ticket, but asking what problem we are actually solving, whether it deserves to be solved now, and how it ranks against everything else pulling at the team. That sounds abstract until you’ve watched a team execute very efficiently against the wrong problem. Then it stops sounding abstract very quickly.

The second is slicing.

I no longer like talking about backlog management in purely administrative terms. What matters is not who keeps the cleanest backlog. It’s who can take a large, blurry problem and cut it into smaller bets that still teach the team something real. Not every feature deserves to be built as one complete package. Quite often the valuable move is to cut the first slice in a way that exposes the wrong assumption early.

The third is verification design.

I used to confuse “making the requirement clear” with “defining the problem clearly”. They are not the same thing. The former is often tidiness. The latter is direction. AI is excellent at making the tidiness look better. Direction is still owned by someone. What counts as signal. What is merely noise. What this iteration is trying to learn. What would count as evidence that a bet worked. If those things are left vague, a surprising amount of output is just progress theatre.

The fourth is trade-off.

That part has never gone away. AI just makes it harder to pretend it isn’t central. Once producing things gets faster, teams become more vulnerable to a particular kind of self-deception: if we can do it quickly, surely we may as well do more of it. The expensive part of product work was never simply building things. It was building the right thing, and not building the wrong one with too much conviction.

If I’m trying to assess whether a PM is standing in the right part of the job, I don’t start by looking at how polished the tickets are. I watch how they cut the problem.

Take a very ordinary example. Let’s say registration completion is weaker than it should be. AI can give you a whole list of possible interventions almost instantly. One-click sign-in. Fewer form fields. Better copy. Better error states. A smoother onboarding flow. Some form of social proof. It can even generate the first pass of the stories and acceptance criteria.

The real difference is not who produces the longest list.

The real difference is who asks the sharper questions first. Where exactly are users dropping? Is this a friction problem, a trust problem, a motivation problem, or simply a flow that asks too much too soon? One-click sign-in sounds sensible, but is it aimed at the largest leak in the funnel? If I only get to place one bet first, which one is it? If it works, what will I expect to see? If it doesn’t, how quickly will I know?

That is the expensive part of the role.

The sign-in example is useful precisely because it looks so obvious on the surface. Whether you score its impact as a 2 or a 3 is not really about confidence in the feature itself. It is about whether it directly addresses the largest source of loss in the current funnel, and whether you have evidence strong enough to justify that confidence. That mode of thinking is much closer to real PM value than producing a very polished feature specification.

So I’m not particularly interested in the question of whether AI replaces PMs.

I’m much more interested in which kind of PM starts looking less valuable first.

My answer is usually some version of this:

The one who is very good at moving information around. Very good at producing documents. Very good at making the backlog look complete. Very good at making work look tidy. But not especially good at helping the team cut the problem, define the evidence, hold the line on scope, or make the trade-offs visible.

That doesn’t mean delivery hygiene stops mattering. It doesn’t. It just shouldn’t be the most expensive thing the role has to offer.

This judgement also has boundaries.

In mature environments with stable processes and a strong need for predictable delivery, delivery hygiene is still worth a great deal. A strong PM in that setting may not be the one making the boldest small bets. It may be the one making the fewest costly mistakes across stability, risk, coordination and timing. And some AI-native teams have a habit of overestimating their discovery capability. They end up packaging a fuzzy idea into a rapid prototype and mistaking that speed for product sense. Those are not the same thing.

These days I’m more inclined to think of the PM role in a slightly unglamorous way.

Not the person who produces the most answers.  
The person who helps the team make fewer expensive mistakes.

A lot of the time that has less to do with better meetings or prettier artefacts than people think. It has more to do with whether you can stand in front of the problem, clear away the wrong paths early, and cut the promising one into a shape the team can test without paying too much tuition.

AI is making a lot of work cheaper. That part is real.

It hasn’t made product judgement cheaper. It has mostly pushed down the price of work that probably should not have been that expensive in the first place. What becomes more valuable, not less, is framing, slicing, verification and trade-off judgement.

![PM value shift in the age of AI](./resource/agile-ai-pm-01-pm-value-shift.svg)

![A small-bets loop for product work](./resource/agile-ai-pm-02-small-bets-loop.svg)
