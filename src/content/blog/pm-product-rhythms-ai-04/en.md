---
title: "Product Rhythms in the Age of AI Part 04 | If I Were Running a Product Team Today, I Wouldn't Run Scrum the Same Way"
description: ""
categories: ["pm"]
tags: []
date: 2026-04-15T05:00:00
series: "Product Rhythms in the Age of AI"
seriesOrder: 4
---

I’ve seen two kinds of teams.

One had plenty of process, but never seemed to learn very quickly. Every ceremony was there, every ticket looked tidy, every meeting had structure, yet the important misunderstandings still travelled all the way to the end. It wasn’t that people were idle. They were busy doing a lot of things that looked like progress.

The other kind went the other way. Everything was meant to be fast. Fewer meetings, less process, less documentation. It sounded modern. It sounded native to the age of AI. In practice, it mostly meant throwing fuzzy requirements at engineering more quickly, mistaking prototypes for answers more quickly, and turning “we’ll figure it out as we go” into a habit.

I don’t want either version.

So if I were setting up a product team today, I wouldn’t run Scrum in quite the same way. But I wouldn’t burn the whole thing down either. That isn’t a compromise. It’s more that once AI makes a large chunk of coordination work cheaper, you’re almost forced to redesign the rhythm on purpose.

My own taste in process has become more conservative, and more selective.

Not because I’ve suddenly become fond of management. If anything, it’s the opposite. I trust management theatre less than I used to. The most dangerous teams aren’t always the messy ones. Sometimes they’re the teams with immaculate ceremonies, tidy backlogs and a reassuring sense of motion, while steadily heading in the wrong direction.

AI makes that easier to see.

DORA’s 2025 work describes AI as an amplifier, which feels about right. AI doesn’t automatically make a team stronger. It tends to magnify what is already there. If the team already has decent clarity, solid habits and a clean feedback loop, AI helps it move faster. If responsibility is blurry, acceptance is fuzzy and meetings are mostly ritual, AI helps those problems move faster too. Digital.ai’s latest State of Agile has a similar tone. It is not really about Agile fading away. It is about adaptation. Put those together and the conclusion I keep returning to is fairly plain: teams in the age of AI do not need less structure by default. They need less time wasted on the wrong structure.

If I had to say what I’d keep, it would be five things.

First, a clear goal. What exactly are we trying to solve in this cycle, and what are we explicitly not trying to solve? This cannot be vague. A surprising number of teams do not lack output. They lack focus.

Second, ownership. Who is framing the problem, who is deciding the slice, who signs off on the acceptance bar, who stands behind the outcome? AI makes role boundaries more fluid. That much is true. But it makes responsibility boundaries more important, not less.

Third, a review loop. Not a ceremonial demo for the sake of a demo, but a regular moment when assumptions are forced into the open. I care less about how often it happens than whether it happens before the team has sunk too much cost into the wrong thing.

Fourth, a retro loop. Not a therapeutic download. Not a list of ten action items nobody remembers two days later. My preference is simpler: change one rule that will materially improve the next cycle.

Fifth, a validation bar. Call it Definition of Done if you like. The label is not the point. The point is that the line between “done”, “almost done”, and “merely pushed to a branch” gets more important when generation becomes cheap.

I also know quite clearly what I would cut.

I do not want estimation for the sake of estimation.  
I do not want standups for the sake of standups.  
I do not want a pretty backlog full of work that still is not actually ready.  
And I do not want process itself to become the output, with the team feeling busy while learning very little.

These things were not entirely irrational in the past. But the cost structure has changed. A lot of actions that once made practical sense are starting to look more like inherited habit than present need.

What I would add is equally important.

First, AI-assisted first drafts. Stories, acceptance criteria, test cases, risk lists, research summaries — a lot of that can be drafted before people sit down together. Not because the model is magically wiser, but because there is no point wasting expensive human attention on work that can be scaffolded first.

Second, context hygiene. I no longer think this is old-fashioned. If anything, the age of AI makes it more valuable. Thoughtworks’ work on spec-driven development points in this direction: not that thicker documents are inherently better, but that cleaner context, clearer constraints and sharper boundaries matter more in AI-assisted workflows.

Third, small-batch delivery. There are simply fewer excuses now for tying multiple assumptions into one large bet. If first versions are cheaper, the threshold for testing smaller slices should also come down.

Fourth, explicit validation rules. I am more conservative here than I used to be. “Let’s build it and see” is far too easy in the age of AI. The easier it becomes to produce artefacts, the more deliberate you need to be about what evidence counts, who gets to judge it, and when a team should stop.

If I had to make this more concrete, this is roughly how I would run the rhythm.

A cycle can be one week or two, but not much longer. Start by naming the goal clearly. Push refinement forward asynchronously where possible. When people do meet, they should not be retyping stories or reading the same notes aloud. They should be discussing boundaries, dependencies, risks and the validation bar. Planning should not be a giant information transfer exercise. It should be where commitments and trade-offs are made. Standups should either be very short or partially async, with blockers as the centre of gravity. There should be a review before the end, not only at the end. And the retro should change one rule that will actually survive contact with the following week.

This gets abstract quickly unless you put it inside a concrete workflow.

So take something ordinary: improving signup completion. The goal for the cycle is not “finish login”. The goal is to remove the largest source of friction in the funnel. AI can draft stories and acceptance criteria for social sign-in, field reduction, error handling and event tracking. The real work for product, design and engineering in refinement is not generating the list. It is deciding which slice to test first, what evidence matters, and what done should look like. The daily checkpoint exists to expose blockers. There is a review before too much sunk cost accumulates. At the end, the team does not simply ask whether the feature shipped. It asks whether the funnel moved. Then the retro asks a harder question: which rules helped, and which ones merely made the team feel organised?

This is also why I no longer believe very much in the idea of the best process.

What I believe in is whether a team can fit speed, judgement, validation and correction into the same rhythm. AI has not solved that problem for us. It has only made it harder to avoid.

This model has obvious limits.

If you are running a large, compliance-heavy organisation with strong audit and traceability needs, this sort of Scrum-lite rhythm may need a much thicker layer of governance around it. And Scrum-lite can degrade into chaos-lite very quickly. Especially if the people leading the team are weak at framing problems or holding the validation bar. In that environment, AI only helps fuzzy work travel faster. Atlassian’s State of Teams 2025 noted that knowledge workers and managers spend roughly a quarter of their time simply trying to find answers. In organisations like that, loosening the rhythm too early rarely produces freedom. It usually produces fog.

So if I were running a product team today, I would not run Scrum the way many teams still do.

But I would not make the opposite mistake either. Removing Scrum does not automatically leave you with something sharper.

What really needs redesigning is not the ceremony checklist.  
It is the team’s arrangement around speed, judgement, validation and responsibility.

![A Scrum-lite operating model for AI-era product teams](./resource/scrum-lite-01-operating-model.svg)

![A weekly rhythm for Scrum-lite teams](./resource/scrum-lite-02-weekly-rhythm.svg)

## Image Asset Plan

1. filename: scrum-lite-01-operating-model.svg
   purpose: Show the core keep/remove/add design of a Scrum-lite operating model
   placement: After the sections on what to keep, cut and add
   alt: A Scrum-lite operating model for AI-era product teams
   prompt: A blog-friendly SVG overview of a Scrum-lite operating model. Centre title: Scrum-lite operating model. Three surrounding zones: Keep (clear goal, ownership, review loop, retro loop, validation bar), Remove (estimation theatre, status recital standups, pretty backlog theatre), Add (AI first drafts, context hygiene, small-batch delivery, explicit validation rules). Clean modern layout, soft colours, rounded rectangles, English labels.

2. filename: scrum-lite-02-weekly-rhythm.svg
   purpose: Show a possible weekly rhythm for a Scrum-lite team
   placement: After the signup-completion workflow example
   alt: A weekly rhythm for Scrum-lite teams
   prompt: A blog-friendly horizontal SVG showing a weekly rhythm for a Scrum-lite product team: goal setting, async refinement, short planning, build, blocker checkpoint, demo/review, retro, reprioritise. English labels, modern and minimal, clear arrows.
