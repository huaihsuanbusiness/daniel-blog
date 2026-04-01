---
title: "AI Agentic Workflow Series 5 — Why I Eventually Replaced the Make MCP Server with My Own Gateway Server"
description: "AI Agentic Workflow Series 5: migrating from Make MCP Server to a self-hosted FastMCP skill gateway."
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-04-01T00:14:00
featured: false
---

**Subtitle: v2 solved the “Make-first workflow as execution engine” problem. v3 takes the next step and moves the capability surface the model actually sees from the Make MCP server into a self-hosted FastMCP skill gateway.**

I genuinely like the Make MCP server.

That is not throat-clearing.

From a pragmatic engineering angle, it solves a lot of early friction:
- you do not need to host a server first
- you can turn scenarios into callable tools quickly
- you get structured inputs and outputs
- transport, token handling, and scenario-as-tool all have a real product surface

If your goal is:
> **make existing workflows callable by an external model as quickly as possible**

then the Make MCP server is a very good answer.

And yet I still replaced it.

Not because Make was weak, but because my next problem was no longer “how do I expose a scenario as a tool?” It had become:

> **How do I make sure ChatGPT sees skill-level capabilities rather than a surface that is still too close to the execution layer?**

That is where v3 starts.

![Why v3 moved from Make MCP server to a self-hosted gateway](./resource/make-job-agent-v3-01-v2-v3-shift.svg)

## The short version: I did not remove Make. I replaced the public contract layer in front of it

The most important change in v3 is not “Make is gone”.

In reality, the opposite is true.

Make remains the execution layer, and a very important one. What changed is the layer in front of it.

### v2 looked more like this
```text
ChatGPT / external client
→ Make MCP server
→ Make scenarios
```

### v3 looks more like this
```text
ChatGPT
→ FastMCP gateway on Oracle VM
→ GitHub skill registry
→ Make webhook tools
→ internal helper flows
```

So I did not replace Make. I moved the **public capability surface** away from the Make MCP server into a gateway server that I control.

## Why v2 stopped being enough

v2 had already done several things right.

I had already:
- reshaped the Make blueprints into more stable execution contracts
- separated querying, ingestion, scoring, and output generation more clearly
- introduced request / session / trace style context fields
- started splitting helpers from public tools

But once I actually connected the system to ChatGPT, the centre of gravity moved from “can this run?” to “is the capability surface appropriate?”

### Problem 1: the Make MCP server exposes a scenario surface, not a skill surface
Make’s own documentation is very clear: the Make MCP server lets AI systems run scenarios and manage parts of your Make account, and scenario inputs / outputs help the AI understand how to call them.

That is a perfectly sensible product design.

But my job agent did not merely need scenarios exposed as tools.

What I really wanted was a set of semantic, user-facing skills:
- `job_ingestion`
- `job_scoring`
- `job_querying`
- `job_decision_support`

Those are not the same thing.

### Problem 2: I wanted helpers, router policy, and skill assets to live in front of Make
The `job-skills-gateway` repo was never meant to replace Make. Its README and architecture notes say exactly that: it is a thin skill layer that sits between ChatGPT and the Make execution flows. The point is to package the existing blueprints into higher-level skills rather than let ChatGPT see every raw flow directly.

You *can* approximate that with the Make MCP server, but it is not the most natural fit.

Because I did not only need to manage:
- which scenarios could be called

I also needed to manage:
- which capabilities were public skills
- which ones were internal helpers
- which backend tools were allowed under which skill
- how manifests, instructions, examples, and routing policy stayed aligned with the live runtime

### Problem 3: I wanted the strategy layer versioned in GitHub, not buried inside Make
One of the most important v3 design moves was to version these things as plain files:
- skill manifests
- instructions
- examples
- eval notes
- routing policy
- contracts

Those assets fit naturally in GitHub.

They are much less comfortable when buried inside workflow nodes, where every change to a skill boundary turns into delicate surgery inside the visual builder.

![The v3 architecture: ChatGPT, FastMCP gateway, GitHub skills, and Make execution tools](./resource/make-job-agent-v3-02-v3-architecture.svg)

## The final v3 layering

The final structure is actually quite simple, but much cleaner than v2.

### Layer 1: ChatGPT
This is the host, and it remains the thing that talks to the user.

### Layer 2: the FastMCP gateway
This layer stays deliberately thin, but it is strategically important:
- it loads the skill assets from GitHub
- it exposes only skill-level tools
- it keeps the public surface more legible for the model
- it calls Make webhook tools through an adapter

### Layer 3: Make execution tools
Inside Make, I reshaped the stable execution entry points into these tools:
- `v3_tool_fetch_recent_jobs`
- `v3_tool_bulk_score_new_jobs`
- `v3_tool_query_jobs`
- `v3_tool_generate_job_output`
- internal helper: `v3_helper_resolve_job_reference`

### Layer 4: internal data and external integrations
- Google Sheets
- datastore
- HTTP extraction
- downstream LLM scoring / generation
- other integrations

Once you split the system like this, ChatGPT is no longer looking at a scenario surface that is too close to the builder. It is looking at a gateway contract that can be named, versioned, and governed much more deliberately.

## The Make layer was refactored as well

This story would be incomplete if it only talked about Oracle VM and FastMCP.

Because v3 is not just “a new layer in front”. The Make tools themselves were also reshaped to behave more like backend contracts for a gateway.

### 1. Public tools moved to webhook entry points
In v2, many flows started with `StartSubscenario`. In v3, the public tools mostly move to `gateway:CustomWebHook` entry points.

That matters because it changes the design assumption. These tools are no longer primarily shaped around internal Make-to-Make invocation. They are shaped around being called reliably over HTTP by the gateway.

### 2. Request context became a first-class contract
Across the v3 public tools, these fields became explicit and consistent:
- `request_id`
- `session_id`
- `trace_id`
- `source_channel`
- `actor_id`
- `parent_run_id`

That is not cosmetic structure. It means a tool call is no longer treated like an isolated webhook event. It is treated as a traceable run inside a larger interaction.

### 3. The response envelope became standardised
This is one of my favourite parts of v3.

Instead of returning “whatever payload is handy”, the public tools converge on a more stable envelope:

```json
{
  "ok": true,
  "status": "completed",
  "tool_name": "v3_tool_query_jobs",
  "request_id": "...",
  "trace_id": "...",
  "run_id": "...",
  "summary": "...",
  "data": {},
  "error": null,
  "meta": {
    "session_id": "...",
    "source_channel": "chatgpt",
    "actor_id": "...",
    "parent_run_id": "...",
    "tool_version": "3.0.0",
    "schema_version": "2026-03-13.1"
  }
}
```

That envelope gives both the gateway and the host a much cleaner basis for:
- logging
- replay
- error branching
- summary-first presentation
- version-aware debugging

### 4. Helpers stayed internal instead of being promoted just because they matter
`v3_helper_resolve_job_reference` is important. That does not make it a public skill.

It is exactly the kind of capability that should remain an internal helper: vital to the system, but not part of the public semantic surface shown to the model.

![The v3 contract envelope and internal helper policy](./resource/make-job-agent-v3-03-contract-envelope.svg)

## This is why I did not want to stop at the Make MCP server

The strengths of the Make MCP server are also the reason it stopped being the right final fit for this case.

### Its strengths
- fast to expose
- no need to host your own remote server
- scenarios become tools quickly
- excellent for workflow-first teams

### What this case needed instead
- public tools that were not too close to raw execution
- hidden helpers that stayed hidden
- versioned skills, policies, and contracts in GitHub
- a gateway that could decide what to expose
- one place where descriptions, schemas, and visibility rules were kept aligned

In other words, what I needed was not simply “another MCP endpoint”, but:

> **a skill gateway where I control the public contract layer directly.**

That is the real job the FastMCP gateway took over.

## A concrete example: why `job_scoring` had to be split away from `job_ingestion`

This one detail captures the spirit of v3 very well.

At the skill level I ended up with:
- `job_ingestion`
- `job_scoring`
- `job_querying`
- `job_decision_support`

The existence of `job_scoring` matters enormously.

Because when a user says:
> score all the jobs that still do not have a score

that is not a refresh request and not a fetch request.

If the public surface does not have a clean scoring tool, the model will naturally try to squeeze that intent into the ingestion path. That is not the model being broken. That is the capability surface misleading it.

So v3 is not only a hosting migration. It is also about:
- skill-first boundaries
- public versus internal capability split
- standardised execution contracts
- better runtime selection quality

## How I now think about the relationship between v2 and v3

I do not think of v3 as “v2 was wrong, so I rebuilt everything”.

I think of it like this:

### v2 solved
- making a Make-first workflow behave more like an execution engine
- pushing scenarios toward cleaner tool contracts
- beginning to pull planning logic out of Make

### v3 goes one step further
- it moves the public capability surface away from the Make MCP server into a self-hosted gateway
- it puts the skill assets in GitHub
- it makes public skills, internal helpers, and backend tools visibly different layers
- it keeps Make behind the curtain as the execution runtime

So v3 does not invalidate v2. It pushes the contract-thinking from v2 all the way to the front of the system.

![The migration lessons from v2 to v3](./resource/make-job-agent-v3-04-migration-lessons.svg)

## The migration rules I would keep for myself

### Rule 1: Make can remain the execution runtime, but the public contract layer should not be forced to look like the Make surface

### Rule 2: decide what the user should see before deciding how the backend is stitched together

### Rule 3: helpers can be important without being public

### Rule 4: request context, response envelopes, and tool versioning are worth standardising early

### Rule 5: if you want skill-first behaviour, the strategy assets need their own version-controlled home

## The final sentence

I did not replace the Make MCP server because it was bad.

I replaced it because, at a certain stage of system growth, the key question stops being “can a scenario be called by a model?” and becomes:

> **What capability surface is the model actually seeing, and is that surface clean enough?**

For me, that is the real meaning of v3.
Not the Oracle VM by itself. Not FastMCP by itself.

The real change is that I finally separated:
- **skills**
- **public contracts**
- **internal helpers**
- **Make execution tools**

Once those four layers are separated, the job agent starts to look less like a workflow creature that merely runs, and more like a system that can actually evolve.
