---
title: "AI Agentic Workflow Series 6 — When should you use a Workflow, and when do you actually need an Agent?"
description: "Not every multi-step system is an agent, and a human approval step does not magically make one. This article combines Daniel’s practical heuristics with Anthropic and OpenAI’s guidance to offer a more useful way to decide between workflows and agents."
categories: ["ai"]
tags: ["ai", "agent", "workflow", "automation", "architecture", "openai", "anthropic", "make"]
date: 2026-04-02T09:58:00
featured: false
---

I’ve been using Make for automation for quite a while, and more recently I’ve been spending more serious time on agentic system design. It has not been a glamorous journey. It has been much more like walking through a field of tripwires.

What finally pushed me to separate **workflows** from **agents** was not that I suddenly mastered the terminology. It was a very ordinary mistake. I once wanted AI to compress a paragraph into a single sentence. A single model call would have done the job. Instead, I got itchy fingers and wrapped the task in a plan-and-execute structure because it looked more “agentic”. The result was not a smarter system. It was a longer, slower, more expensive chain that was harder to debug.

That experience left me with a rule of thumb I now trust quite a lot:

> **What matters is not how many steps a system has. What matters is who decides the next step.**

This is not meant to be a grand official taxonomy. It is a working heuristic shaped by Daniel’s own implementation experience. It aligns with the mainstream direction taken by Anthropic and OpenAI, but the emphasis here is practical: how to avoid over-engineering, how to avoid dressing up a simple task as an “agent problem”, and how to make better system design choices.

---

## Start with the mainstream distinction, otherwise everything gets muddled

In *Building Effective Agents*, Anthropic draws a very useful line:

- **Workflows** are systems where LLMs and tools are orchestrated through predefined code paths.
- **Agents** are systems where LLMs dynamically direct their own processes and tool usage.

I like this distinction because it does not depend on whether there is a chat interface, whether there are five steps, or whether a planner is involved. It gets to the real issue: control.

OpenAI’s *A practical guide to building agents* and its building agents guidance point in a similar direction. Start with the simplest solution that can work. If a deterministic or rule-based structure still holds, do not rush to upgrade the system into an agent. Agents earn their keep where conventional automation begins to crack.

That is why I no longer find these shortcuts especially useful:

- multi-step = agent  
- human-in-the-loop = agent  
- tool use = agent  
- planner = agent  

Each can be a signal. None is a reliable boundary on its own.

---

## The decision order I now use most often

### 1. Can a single model call solve it?

If yes, do not build a workflow yet.

That sounds obvious, but people ignore it all the time. Systems often become complicated not because the problem is inherently complicated, but because we start designing architecture far too early.

Tasks like these often only need one call:

- turning rough notes into a polished email
- compressing a transcript into a concise summary
- rewriting text into a different tone
- producing structured output from clearly specified fields

If that is the shape of the job, adding a planner, router, memory layer, or multiple agents is usually not an upgrade. It is engineering inflation.

The mainstream guidance supports this as well. Anthropic explicitly says the most successful implementations tend to rely on simple, composable patterns rather than elaborate frameworks. OpenAI says agents are especially useful when deterministic and rule-based approaches fall short. That already implies an order of operations: **push single-turn design and lightweight augmentations as far as they sensibly go before escalating.**

### 2. If one call is not enough, can you still draw the path up front?

If yes, I will usually choose a workflow first.

This is the judgement call I use most often because many real tasks are indeed multi-step, but the core path is still clear enough to map in advance. You roughly know what each step should do, and you know where to look when something breaks.

When I was first learning workflows in Make, I kept building chains like:

`Webhook → data extraction → regex or field transformation → filtering → archive / notify`

That is not trivial work, but it is still **predefinable**. You can diagram the main route and design retries, exceptions, approvals, and compensating logic around it. In tasks like this, workflows are enormously valuable because they are:

- controllable
- testable
- observable
- replayable
- maintainable

I still handle many jobs this way:

- scheduled job collection
- baseline scoring
- routing promising items into deeper analysis
- synchronisation and scheduling
- API integration and data transformation

Some of these are long chains, but if the main path can be laid out before runtime, I will still favour a workflow.

### 3. Only seriously consider an agent when the path cannot be fixed in advance

This is where agents begin to justify themselves:

> **The path only reveals itself while the task is being executed.**

Suppose a user does not submit a neat form, but instead says:

> Find suitable remote product roles for me, filter out the poor fits, compare the three best opportunities, then rewrite my self-introduction to match them.

At that point, the system may not know in advance whether it should search first, inspect the CV first, ask follow-up questions first, or compare constraints first. Tool choice, information gathering, stopping conditions, and moments for clarification are all determined during execution.

That is where an agent starts to make real sense. What you need is not just a longer chain. You need a system that can:

- adjust strategy based on newly discovered information
- choose dynamically between tools
- clarify ambiguous input as it goes
- realise when it lacks context and deliberately go back to gather more

That is the actual dividing line.

### 4. Human-in-the-loop matters, but more as a design signal than a taxonomy

I used to oversimplify this question into a single line:

> Does a person need to be in the middle of the process?

That question is not useless, but it is insufficient.

It has two important counterexamples.

#### Counterexample one: a human is involved, yet the system is still just a workflow

Imagine a content review pipeline:

`system drafts content → human reviews → publish according to policy`

There is a human checkpoint, yes. But the main path is still predefined. This is better understood as a workflow with human approval, not necessarily as an agent.

#### Counterexample two: no human is involved, yet the system is already agentic

Imagine a browser agent that searches a documentation site, opens pages, revises search terms, changes direction, and decides where to go next based on what it finds. No human may intervene in the middle, but if the next step is continuously chosen from the current environment, that is already agent behaviour.

So the more accurate statement is this:

> **Human-in-the-loop affects interaction design and risk control. The deeper classification hinge is still control and path predictability.**

---

## The four-level decision ladder I now recommend

If you do not want to re-litigate the philosophy every time, use this ladder instead.

### Level 0: Can a single turn solve it?

Ask yourself:

- Is the input already clear enough?
- Can the output format be specified directly?
- Is the failure cost low?
- Would better context, examples, or retrieval be enough?

If the answer is mostly yes, do not build a workflow yet, and definitely do not build an agent.

### Level 1: Is it multi-step, but still orchestratable in advance?

If the task needs several steps, but the path can still be mapped and exceptions can still be governed by rules, start with a workflow.

Typical examples include:

- routing after classification
- synchronising data across systems
- branching on explicit conditions
- fixed data transformation followed by notifications

At this stage, what deserves investment is:

- clean module boundaries
- observability
- retries and compensation
- idempotency
- approval checkpoints

Not an agent loop.

### Level 2: Does the next step depend on information discovered at runtime?

If the next move depends on what the system finds while working, and both tools and route may change on the fly, then you are moving into agent territory.

Typical examples:

- open-ended research assistants
- browser-based task completion
- debugging assistants across multiple tools
- tasks that require clarification, replanning, and iterative narrowing

These systems need things like:

- strong tool definitions
- explicit exit conditions
- traces and evaluation
- guardrails
- carefully chosen human intervention points

### Level 3: Do you genuinely need multiple agents?

I am conservative here.

Plenty of teams start by splitting a system into planner, researcher, writer, critic, and reviewer because it looks elegant. In practice, this often fails first on:

- fuzzy prompt boundaries
- overlapping tools
- unreadable traces
- exploding latency and cost
- blurry responsibility lines

OpenAI’s current guidance points in roughly the same direction: get as much mileage as you can from a single agent with good tools and instructions before reaching for a multi-agent architecture. For most teams starting out, **single agent + clear tools + a workflow shell** is a more realistic path than building an agent society on day one.

---

## When I deliberately do **not** use an agent

This section matters because a serious technical article cannot stop at “when to use it”. It also needs to say “when not to”.

### 1. The task is highly predictable

If the main path can be defined ahead of time and the exceptions can be covered with rules, a workflow is usually the sturdier choice.

### 2. Latency and cost are real constraints

Anthropic states this plainly: agents often trade latency and cost for improved task performance. That is not a flaw. It is a trade-off. The question is whether the task deserves that trade.

### 3. You need strong auditability

Some operational and approval-heavy processes care less about flexibility than about the ability to answer these questions:

- what happened, step by step?
- can I replay it?
- can I audit it?
- where exactly did it fail?

Those are workflow-friendly demands.

### 4. Your tools and boundaries are still poorly defined

A surprising number of “agent reliability” problems are not really model problems. They are design problems:

- vague tool descriptions
- overlapping tool responsibilities
- messy schemas
- undefined success criteria
- unclear fallback behaviour

In that state, tightening tool design and process instrumentation is usually more valuable than adding more autonomy.

---

## When I do begin to lean towards an agent

### 1. User input is highly variable and ambiguous

If fixed rules keep breaking because the input shape changes every time, an agent’s flexibility starts to pay for itself.

### 2. The job requires exploration, not merely execution

Research, debugging, investigation, cross-page navigation, and candidate comparison are not simple pipelines. They are exploratory.

### 3. Tool selection cannot be fully pre-committed

You may know what tools are available, but not which one should come first in this particular case, or whether the system will need to change direction midway through. That is a genuine reason to open up model control.

### 4. You are willing to pay the governance cost in exchange for higher task completion

This is the practical truth. Agents are not a free upgrade. They introduce:

- more demanding tracing and evaluation
- more detailed guardrails
- more complex tool governance
- a larger failure surface

If you do not intend to pay those costs, do not choose an agent merely because it looks more sophisticated.

---

## The architecture pattern I now trust most: workflow shell, agent islands

In practice, I increasingly avoid the false binary of “pure workflow” versus “pure agent”.

The pattern I use most often now is:

> **Use workflows as the operating skeleton, and agents as localised high-flexibility decision nodes.**

For example:

- scheduling, data sync, notifications, and archiving go to the workflow layer
- open-ended search, comparison, rewriting, and browser operations go to the agent layer

This split has real advantages:

- the main skeleton remains observable
- risky steps can carry human approval
- the model only acts where judgement is actually needed
- the whole chain does not collapse into one opaque blob

This is also the starting architecture I would recommend for most teams. Not because it is fashionable, but because it is survivable in production.

---

## A decision table I keep coming back to

| Question | Workflow is usually better | Agent is usually better |
|---|---|---|
| Can the main path be drawn in advance? | Yes | Not really |
| Who decides the next step? | Engineer / rules | Model based on runtime context |
| Is the input highly variable? | Low | High |
| Can tool choice be fixed up front? | Mostly yes | Often no |
| How important is precise debugging? | Extremely | Still important, but harder |
| Are latency and cost tight constraints? | Usually yes | Higher cost may be acceptable |
| Core value | Reliable execution | Dynamic decision-making |

---

## The one sentence I now trust most

If I can sketch the main path before the system starts, I usually choose a workflow first.  
If the path only emerges while the system is running, that is when I begin to take agents seriously.

Whether a human appears in the loop still matters.  
But it is more a clue about interaction design and risk control than a definitive taxonomy.

For me, workflow versus agent is not about which one is more advanced. It is about this:

> **Which control model actually matches the problem in front of you?**

---

## Image Asset Plan

1. filename: ai-agentic-workflow-series-06-01-decision-ladder.svg  
   purpose: A visual ladder explaining the progression from single-turn prompts to workflows, agents, and multi-agent systems  
   placement: Before the section on the four-level decision ladder  
   alt: Decision ladder for choosing between a single LLM call, workflow, agent, and multi-agent system  
   prompt: A blog-friendly SVG decision ladder for AI system design. Four levels from bottom to top: Single LLM Call, Workflow, Agent, Multi-Agent. Clean rounded boxes, subtle colours, arrows upward, minimal labels, modern product-doc style, generous spacing, no clutter.

2. filename: ai-agentic-workflow-series-06-02-workflow-vs-agent-table.svg  
   purpose: A visual comparison of the core differences between workflows and agents  
   placement: After the decision table  
   alt: Diagram comparing workflow control and agent control  
   prompt: A clean comparison SVG for a technical blog showing Workflow vs Agent. Left side workflow with predefined path, checkpoints, retry, auditability. Right side agent with dynamic tool selection, runtime branching, replanning. English labels, soft product illustration style, readable and uncluttered.

---

## Sources

See `./resource/references.md` for the full reading list.
