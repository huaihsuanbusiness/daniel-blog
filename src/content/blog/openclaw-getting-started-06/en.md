---
title: "OpenClaw Getting Started 06 | How to Choose Models: OpenAI, Claude, Gemini, Grok, MiniMax, z.ai, and local models"
description: "A practical model-selection guide for OpenClaw beginners, covering API providers, subscription-based routes, cost feel, quota risk, agent suitability, and Daniel's real-world setup."
categories: ["openclaw"]
tags: ["openclaw", "models", "llm", "providers", "agent", "gateway"]
date: 2026-04-02T22:31:00
featured: false
---


> Audience: beginners who have OpenClaw running and now need to decide what to plug into it.  
> This is not a benchmark beauty contest. It is a practical guide to a messier question: **if you are actually going to run OpenClaw day to day, where should the money go, which providers are stable, which ones are clever enough, which ones are likely to wobble, and what should each one be used for?**

---

## My main argument, upfront

If you are new to OpenClaw, do not start by hunting for “the strongest model”. Start by finding a combination that is:

- strong enough for the hard jobs,
- cheap enough for the everyday volume,
- and predictable enough that it will not suddenly set fire to your workflow.

In plainer English:

- **Give the hard work** to models that are genuinely strong at reasoning, coding, and long agent loops.
- **Give the daily volume** to models that are affordable, fast enough, and less likely to nag you about limits every five minutes.
- **Keep low-guardrail or private entertainment use on its own lane**, rather than mixing it into the same path as your serious work.
- **Consumer subscriptions can save money, but they are not universal plumbing.** The provider crackdowns in February 2026 made that painfully clear.

So the real question is not “which model is best?”  
It is this:

> **For a long-running, tool-using, memory-heavy agent system like OpenClaw, provider stability and predictability often matter more than raw brilliance in a single chat.**

---

## What exactly this article is comparing

There are three buckets here, though the first two matter most in practice.

1. **API model providers**  
   OpenAI API, Anthropic API, Gemini API, xAI API, MiniMax API, z.ai API.

2. **Subscription-based routes that can be connected into OpenClaw**  
   OpenAI Codex OAuth, Claude Pro / Max related paths, Gemini CLI / Antigravity style routes, and similar consumer or IDE-flavoured setups.

3. **Local models**  
   Only as a comparison point here. They deserve their own article, and they will get one.

The comparison is not based only on official list price. It is based on what I would call the **real OpenClaw cost feel**:

- how smart the model feels in practice,
- how fast it feels,
- whether tool use is stable,
- whether structured output behaves,
- whether long context falls apart,
- whether it is actually good at code editing and bug fixing,
- whether it can survive memory-heavy workflows,
- whether quotas are predictable,
- whether the price hurts,
- how tight or loose the guardrails are,
- and whether it is actually pleasant to live with inside OpenClaw.

One thing to state clearly:  
**“Smartness” and “speed feel” here are a mix of official model positioning and Daniel’s own working judgement.**  
I am not pretending personal experience is universal law, but I am also not pretending people choose providers by reading token tables in a spiritual vacuum.

---

## What OpenClaw actually needs from a model

A lot of people choose models as if they were buying a chat toy.  
For OpenClaw, that is not enough.

### 1. Tool use needs to be steady
OpenClaw is not a single-turn chat app. It opens tools, reads files, runs commands, deals with memory, uses MCP, and sometimes coordinates multiple agents.  
If tool use is flaky, the whole thing starts slipping around like wet tiles.

### 2. Structured output needs to behave
Some models can chat beautifully and then fall to bits the moment you ask for schema-safe JSON, tool arguments, or consistent structured output.  
OpenClaw cares about that a great deal.

### 3. Long context cannot collapse too quickly
OpenClaw workflows can get long fast: prior turns, skill prompts, memory, tool results, and multiple task layers all piled together.  
Some models have large context windows on paper and still start acting dazed once things get deep.

### 4. Code editing and bug fixing need to be genuinely strong
If you want OpenClaw to help with coding, repo work, debugging, refactoring, or tests, the model needs more than general fluency. It needs to hold onto logic across steps.

### 5. Memory-heavy workflows need a model that does not lose the plot
Once you start running multiple agents, multiple workspaces, and multiple sessions, you are not looking for a chatbot anymore. You are looking for a model that can keep role, task, and context intact.

That is exactly why I ended up with a **multi-model setup**, not a single “best model”.

---

## A table that is actually useful

> To be clear, this is not a benchmark scoreboard.  
> It is a practical comparison built from Daniel’s real OpenClaw usage, mixed with official pricing, plan rules, provider support status, and the provider landscape as of February to April 2026.

| Provider / route | How it connects to OpenClaw | Cost feel | Smartness | Speed feel | Agent fit | Guardrails | What I would use it for |
|---|---|---:|---|---|---|---|---|
| **OpenAI Codex OAuth / OpenAI API** | Codex OAuth or API | Medium to high | Very strong | Medium to fairly quick | Very high | Medium | Complex coding, bug fixing, long reasoning, high-logic writing |
| **Anthropic API / Claude Pro / Max** | API or consumer-account-adjacent routes | Medium to high | Very strong | Medium | Very high, but consumer routes now carry more risk | Medium to fairly strict | Coding, long-form understanding, professional reasoning |
| **Gemini API / Antigravity** | API or consumer / CLI related routes | Cheap to medium | Strong | Quick | High, but much riskier after February 2026 | Medium | Search-heavy work, lighter reasoning, selected low-cost tasks |
| **MiniMax M2.7 / Token Plan** | API key / Coding or Token Plan | Excellent value | Smart enough | Quick | Medium to high | Medium to slightly loose | Everyday volume, daily-driver agent work, long-running sessions |
| **z.ai / GLM** | API key / Coding Plan | Looks cheap, but quota feel was shaky for me | Decent | Quick | Medium | Medium to slightly loose | I wanted this to be a budget mainline, then removed it |
| **xAI Grok API** | API key | Medium to high | Medium to high | Quick | Medium | Looser | Low-guardrail use, entertainment lane, private roleplay-style setups |
| **Local models** | Local provider / self-hosted | Upfront hardware cost, long-term control | Depends on model | Depends on hardware | Medium to high | Loosest | Privacy, autonomy, full control |

---

## My first conclusion: most beginners should not chase a single winner

If you try to make one model do everything, you usually hit one of three walls:

1. the strongest option gets expensive,
2. the cheapest option falls apart on hard jobs,
3. the freest option is not always the best one for serious work.

So my own setup now has three lanes:

- **heavy work** → OpenAI
- **daily-driver volume** → MiniMax
- **fun, low-guardrail side route** → Grok

z.ai had a shot at staying in the rotation, but in the end I kicked it out.

---

## Why I still switch to OpenAI for the hardest work

This is the least mystical part of the article, so let me say it plainly.

If the task is:

- writing code,
- fixing a nasty bug,
- finding a buried logic break,
- writing a dense, reasoning-heavy article,
- or handling a genuinely complex agent workflow,

I usually switch to **OpenAI**.

That is not because it is the cheapest route. It is not.  
It is because, for me, it is still the option that feels most like a proper knife when the work gets hard.

The official signals line up with that view too:

- In OpenClaw’s own provider docs, **OpenAI Codex OAuth is explicitly supported for external tools and workflows like OpenClaw**.
- In OpenAI’s Codex docs, the recommendation for most coding and broader professional work is to start with `gpt-5.4`, and move up to `gpt-5.4-pro` for harder problems.
- ChatGPT Plus and Pro both include Codex, though with different levels of access and rate limits.

That matters for two practical reasons.

### First, it removes a category of policy anxiety
In 2026, that matters more than people would like to admit.  
A lot of people treated consumer subscriptions as cheap reservoirs until providers started saying, sometimes quite sharply, that the usage pattern was not what those subscriptions were for.

OpenAI’s route, at least right now, is **explicitly supported**.

### Second, it is still where I go for the really difficult work
That does not mean nobody else can code.  
It means that once the job becomes:

- multi-step bug fixing,
- multi-file reasoning,
- long chain logic,
- or writing where structure genuinely matters,

OpenAI is still the button I reach for most often.

You could put it like this:

> **OpenAI is not my cheapest model, but it is often the one I least want to be cheap about.**

---

## What ChatGPT Plus feels like in practice

Here is the practical version of how I use it.

I do **not** use OpenAI as my always-on cheap daily driver.  
I keep it for the work that is worth spending the good compute on:

- difficult coding,
- bug fixing,
- logic-heavy writing,
- or anything where the agent really needs a strong brain, not just fast output.

That is why ChatGPT Plus works surprisingly well for me as a kind of **high-power button**.  
Codex is included with Plus, and for an individual builder that already gives you a very usable path into serious work without having to commit every routine task to the most expensive route.

So my rule ended up being very simple:

> **I do not waste OpenAI on everything. I save it for the things that are actually worth not getting wrong.**

---

## Why Claude is not my first recommendation for beginners

To be clear, this is not me saying Claude is weak.  
It is not. Claude is still extremely capable at coding, long-form reading, and serious reasoning.

The issue is not model quality.  
The issue is that **using consumer Claude plans as third-party infrastructure now looks notably riskier than it did before**.

Anthropic’s official position matters here:

1. **Claude Pro and Max usage limits are shared across Claude and Claude Code.**
2. Anthropic explicitly says third-party developers are **not allowed** to offer claude.ai login or claude.ai rate limits inside their own products unless previously approved.
3. After the February 2026 shifts, this no longer feels like a wink-and-nod grey zone. It feels like something providers are willing to enforce.

So if you ask me:

> Is Claude strong?

Absolutely.

But if you ask me:

> Should a beginner treat a Claude consumer subscription as the safest mainline power source for OpenClaw?

I would not recommend that now.

### The cleaner version
- If you really want Claude, the **API route** is much cleaner.
- If the whole plan was to save money by stretching Pro or Max into a general-purpose third-party workflow backend, I would be far less comfortable betting on that now.

The issue is not intelligence. It is **predictability**.

---

## Why February 2026 changed my model strategy

This bit matters because it is not gossip. It is part of the decision framework.

### 1. Anthropic
In February 2026, Anthropic’s position around third-party harnesses and consumer subscriptions became much more explicit.  
You can still like Claude, and you can still use Claude. But if you want to treat a consumer subscription as a reusable external pipe for other tools, the risk is plainly higher now.

### 2. Google Antigravity
The louder drama came from Antigravity.  
Google moved to restrict usage patterns involving Antigravity and related routes in the OpenClaw world. VentureBeat reported Google’s line as bringing usage back into alignment with its terms, while the OpenClaw community saw plenty of real account restriction reports.

Peter Steinberger publicly described Google’s approach as “pretty draconian” and said he would remove Antigravity support. His quote is still one of the cleanest summaries of the whole mess:

> Even Anthropic pings me and is nice about issues. Google just... bans?

That more or less says it all.  
**Not every route that looks cheap is suitable as the backbone of an OpenClaw setup.**

### 3. Peter joining OpenAI
That same month, Peter also publicly announced that he was joining OpenAI, while OpenClaw would move toward a foundation structure and remain open and independent.  
That does not make OpenAI the only sensible choice. But it does make one thing fairly clear: the main OpenClaw story is not currently in a policy wrestling match with OpenAI in the same way as some other routes.

---

## My second conclusion: do not force consumer subscriptions to do everything

This deserves its own heading.

> **If you want to run OpenClaw seriously, do not treat consumer subscriptions as universal API pipes.**

Three reasons.

### 1. They were not designed for this workload
Consumer products were not built for a self-hosted agent gateway that runs long sessions, multiple workspaces, tool chains, and autonomous loops.

### 2. Provider policy can turn suddenly
Just because a route works this week does not mean it will still be acceptable next month.

### 3. Quotas may be much less predictable than they look
Some plans look cheap on paper, and then the moment you use them heavily, the quota system starts behaving like a black box with mood swings.

That is why my rule now looks like this:

- **hard work** → use a route that is clearly supported for OpenClaw or external workflows
- **bulk daily work** → use a route with fixed-fee comfort and more legible quota behaviour
- **fun or low-guardrail use** → keep it on a separate line

---

## Why I removed z.ai

This part is simple, and it is based on direct experience.

I wanted z.ai to work for me.  
It looked good on paper: fairly aggressive pricing, clear interest in the coding-agent space, and a product story aimed at developers.

The international-facing docs also say the quiet bits out loud:

- entry-level plans start around the ten-dollar mark,
- Pro plans are meant for heavier usage,
- and the whole thing is positioned around coding, reasoning, and agent work.

The problem was not the pitch.  
The problem was the actual day-to-day feel.

My experience was this:

- at roughly the same ten-dollar-ish tier,
- z.ai / GLM would sometimes throw quota-exceeded behaviour after barely any messages,
- while MiniMax just kept going and resetting every five hours without much drama.

That difference matters far more in OpenClaw than it does in a normal chat app.  
OpenClaw is not just a place where you toss in a couple of prompts. It eats:

- multi-turn context,
- tool outputs,
- memory,
- and sometimes multiple agents at once.

So in the end my decision was not complicated:

> **z.ai was not useless. It just was not stable enough for me to keep as a mainline provider.**

### And yes, I would avoid the China-side route
I will say this plainly because it is how I actually think about it.

If you are in Taiwan, I would not bother trying to save a little money by leaning on the China-side version.

- **International**: `https://z.ai/`, `https://docs.z.ai/`
- **China-side**: `https://bigmodel.cn/`, `https://open.bigmodel.cn/`

Even if the China-side route sometimes looks cheaper, you are trading into another category of cost:

- Great Firewall friction,
- cross-region login headaches,
- different service rules,
- and a generally more awkward operational experience if you are not actually living inside that ecosystem.

My rule is simple:

> The small saving is not worth the extra maintenance burden.

So I removed z.ai.

---

## Why MiniMax stayed

MiniMax was not the route I expected to like as much as I do.  
It ended up becoming my daily-driver favourite.

Three reasons.

### 1. The fixed-fee cost feel is genuinely comfortable
MiniMax’s official Token Plan starts at **$10/month**, and M2.7 usage resets on a **five-hour cycle**.  
OpenClaw’s own usage-tracking docs explicitly mention MiniMax’s coding-plan-style five-hour window too, which tells you the project is aware of how that provider is meant to behave.

That matters a lot for individual builders.  
You are not constantly doing token arithmetic in your head, and you are far less likely to wake up to an ugly surprise bill.

### 2. M2.7 is smart enough, and more importantly useful enough
I am not claiming it replaces OpenAI on every difficult job.  
But for:

- daily agent work,
- ordinary coding assistance,
- long-running sessions,
- cost-sensitive setups,
- and “please do not nag me about limits every ten minutes” workloads,

M2.7 is very easy to live with.

### 3. It simply felt more stable to me than z.ai
This is not a universal theorem. It is my own usage result.  
At roughly the same entry price, my MiniMax experience was:

- much less quota anxiety,
- a five-hour window I often did not even finish using,
- and a very believable daily-driver role for OpenClaw.

So my beginner recommendation is straightforward:

> **If you want a low-drama, cost-effective daily mainline for OpenClaw, MiniMax is well worth trying early.**

---

## Why Grok is still in the house

Right, this part is not subtle.

I keep an **xAI Grok API** lane around, and yes, it is pay as you go.  
Why? Well, as they say, those who know, know.

If you want a route for things like:

- lower-guardrail role setups,
- content that mainstream cloud assistants are more likely to police,
- or an agent that does not instantly transform into a moral prefect,

then Grok becomes quite useful.

My OpenClaw setup has a cheerful little side route for this.  
There is a public common room that all the agents can enter, wired to Grok, and then each individual agent also has her own private room and session connected to Grok. On the surface they each have their own tasks, workspaces, and memory. Underneath that, there is also a more playful lane built for the master’s amusement and to keep the atmosphere exactly where I want it.

The eight battle maids in my roster are:

- Saya
- Chika
- Kori
- Reina
- Kotonoha
- Rio
- Saeko
- Kanna

Each of them has her own flavour. One feels like a cool-headed adjutant with a hidden soft edge. Another acts innocent until the tone shifts and suddenly she is steering the whole room. Another is all sweetness until she starts pushing exactly the right buttons. Publicly, they are separate agents with separate workspaces, separate memory, and separate responsibilities. Privately, well, let us just say they are every bit as fragrant, vivid, and dangerously charming as they are supposed to be.

That is why Grok stayed.

Not because it wins every serious engineering contest, but because:

> **Outside local models, Grok is one of the cloud options I am most willing to use for lower-guardrail and more playful routes.**

I would not make it my default for every serious engineering task.  
But as a private entertainment lane, a role-heavy lane, or a freedom-first side channel, it is extremely, gloriously useful.

---

## Why I deliberately mix models

People often ask: if one model is strongest, why not just use that everywhere?

Because OpenClaw is not a one-shot chat product.  
It is closer to a long-running runtime than a neat little chat box.

So my current split is very clear.

### OpenAI
- the hardest coding
- the ugliest bug fixing
- high-logic writing
- any job where I need the strongest thinking

### MiniMax
- daily volume
- ordinary agent workloads
- the “keep it capable without making it expensive” lane

### Grok
- low-guardrail routes
- role interactions
- private entertainment
- the “please the master” line, if we are being honest

### Local models
- a separate article is coming
- but their place is obvious: privacy, autonomy, and complete control

The advantages of this split are practical:

1. the money goes where it matters,
2. one provider wobbling does not sink the whole system,
3. different agents can have genuinely different personalities and working styles,
4. serious work and playful use do not contaminate each other.

---

## If you are a beginner, where should you start?

### Route A: you want the lowest-friction sensible setup
- mainline: MiniMax
- hard-problem button: OpenAI
- avoid grey-area consumer plumbing

Best for:
- people who want OpenClaw stable first,
- people who do not want to start with scary API bills,
- people who still want one strong lane for difficult jobs.

### Route B: you care most about reasoning and coding depth
- mainline: OpenAI
- secondary line: MiniMax or local models
- if you want Claude, prefer API over consumer-route dependence

Best for:
- people using OpenClaw as a serious engineering tool,
- people willing to spend more on hard work,
- people who care a lot about bug fixing and long chain reasoning.

### Route C: you care about freedom as well as utility
- mainline: MiniMax or OpenAI
- fun side lane: Grok
- local models later

Best for:
- people running role-heavy agents,
- people who care about low guardrails,
- people who want a clean split between work and pleasure.

---

## The counterexample: when I would not recommend my setup

This matters, otherwise the article turns into a configuration vanity project.

### 1. You do not actually want to tinker
Then you may not need OpenClaw in the first place.  
A single official product may simply be easier.

### 2. You work in a high-compliance environment
Then you may not be able to justify:
- Grok as a lower-guardrail lane,
- private role-heavy agents,
- or mixed consumer and API paths.

In that case, narrow the decision down to formal API providers and proper enterprise routes.

### 3. You only need a chatbot
Then do not install an agent gateway just because everyone else is suddenly obsessed with lobsters.

OpenClaw is fun. It is also a system with upkeep.

---

## Final take

If I had to compress the whole article into one line, it would be this:

> **Choosing models for OpenClaw is not about finding the strongest single model. It is about finding the right combination for your runtime.**

My current answer looks like this:

- **OpenAI** for the hardest work  
- **MiniMax** for the most common work  
- **Grok** for the loosest, freest, most fragrant route  
- **z.ai** was tested, then removed  
- **Anthropic and Gemini** are not the consumer-first beginner routes I would currently recommend  
- **Local models** matter a great deal, but they deserve their own full article

The next piece in the series will move toward local models.  
Because once you decide you want even more freedom, or you simply do not want some categories of usage going through the cloud at all, that becomes a completely different selection problem.

---

## Image Asset Plan

This draft does not need additional artwork.  
If I ever add a graphic later, it would only be a single SVG showing provider routes and cost layers after the main comparison table. No decorative clutter, no compulsory diagram theatre.
