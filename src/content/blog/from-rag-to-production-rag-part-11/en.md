---
title: "From RAG to Enterprise-Grade RAG Part 11 | Series Closure: From 5 Query Modes to the 2026 Production RAG Landscape"
description: "Parts 02-10 walked through the complete journey from minimum viable RAG to production. This closer turns the series into a coordinate system: how 11 capability flags collapse into 5 query modes, why the learning path has to be re-sorted after one full round, what I deliberately chose not to build, and where the shared production backbone, Agentic RAG, Structured / SQL RAG, Multimodal / Document RAG, Long-context Hybrid, GraphRAG, and Hierarchical RAG / RAPTOR sit in the 2026 Production RAG landscape."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "query-mode", "learning-path", "retrospective", "capability-framework"]
date: 2026-06-12T13:45:00
featured: true
subtitle: "From RAG to Enterprise-Grade RAG Part 11"
series: "From RAG to Enterprise-Grade RAG"
seriesOrder: 11
---

## Story: The Day I Finished the Last Line

From the first line of code to a production HTTPS endpoint, to the final "Production Checklist" stamped complete, one full round of the project.

That day I opened the dev notes and read from the top. **It looked like a finished product, but the more I read, the more it looked like a coordinate system.**

Every change is a capability point. But "running" and "understanding why others designed it this way" are two different things. A finished product is "do we have these capabilities"; a coordinate system is "how do these capabilities interact, which is the base layer, which is the top, which can be split, which can't".

This Part 11 is not a summary index of Parts 02-10; it reframes the project into **three higher-level observations**. The specific technical details were covered in each Part; this one is about the things I only saw clearly after doing them.

These 3 things are:

1. **Capabilities can be collapsed**: 11 flags collapsed into 5 modes—the shift from feature-oriented to system-oriented design
2. **Learning paths can be re-encoded**: re-sort the entire learning order after one round of implementation—a refactoring the teacher has to go through
3. **What you choose not to do shapes the system**: the deferred and explicitly-not-now list is as important as the done list

But this post needs to do one more thing: bring the original Part 12 landscape idea back into Part 11. A proper series closure should not only review what I built. It should also mark where this production core RAG backbone sits in the broader 2026 RAG map.

A note up front: these 3 things are not a success story. They are the structure that became visible after implementation. If you are building a RAG project right now, these observations may help you avoid some rework.


> **Landscape version note:** this post describes the 2026 RAG landscape as a coordinate system, not a permanent taxonomy. Tool names and APIs will move; the stable part is the capability boundary between retrieval, routing, context assembly, evaluation, observability, and operations.

---

## Observation 1: 11 Flags → 5 Modes

The original design had 11 independent flags:

```text
auto_route
auto_rewrite
retrieval_mode
use_reranker
use_parent_expansion
use_context_compression
use_long_context_reorder
use_faithfulness_check
use_ragas_check
use_citation_check
use_llm_citation_judge
```

Each flag on/off is a behavior, and the combinations are dozens of query pipelines. **Sounds flexible, but in practice it's outsourcing decisions to the caller.**

Problems surfaced quickly:
- The caller doesn't know which flags to turn on or off
- Different callers turn on different flags, and during debugging you can't tell which pipeline this query ran
- Adding a new capability becomes "one more flag", and the system becomes harder and harder to read

I eventually collapsed it into 5 modes:

```text
fast      — direct lookup, no evaluation
safe      — adds faithfulness check, citation
deep_eval — runs RAGAS and citation judge synchronously
creative  — LLM-first synthesis
agentic   — allows multi-step workflow, tool routing
```

![How 11 capability flags collapse into 5 query modes](/images/from-rag-to-production-rag-part-11/part-11-flags-to-modes.png)

**The difference after the collapse:**

- The caller just picks a mode, doesn't think about flag combinations
- The pipeline is determined (5 paths), so debugging means looking at the mode to know which path ran
- Adding a new capability becomes "which mode does this belong to" instead of "one more flag"

> Takeaway: **When your system has more than 5 independent binary switches, users have effectively given up trying to understand it.** Collapsing into modes turns "combinatorial explosion" back into "a few paths".

This is the design lesson that became clear after implementation: **Not every capability should be a user-facing switch.** Collapsing it into modes is system design, not interface polish.

---

## Observation 2: Re-sort the Learning Path After One Round

I wrote teaching notes as I went. The original learning path was sorted by "what I know, so teach it first":

```text
- LlamaIndex Workflows
- Tool Routing
- MCP Tool Call Integration
- Evaluate / Reflect / Refine / Retry Loop
- FastAPI Auth
- Dockerize FastAPI + Qdrant
- Deploy to VPS
- Cloud Deployment Options
```

After one round of implementation, I found two problems with the order:

1. **Tool routing and MCP were placed after Workflows**: but Workflows internally use tool routing; teaching Workflows first then tool routing leaves students stuck on how Workflows dispatch tools
2. **FastAPI Auth and Docker were separated**: but in practice, the Auth middleware and Docker port planning are coupled; teaching them separately makes students only discover at deploy time that auth can't use loopback inside the container

So I broke up the entire path and re-sorted it. The re-sorted order is by "**where students actually get stuck**", not by "what I know":

```text
- Production Query Modes / Cost Profiles
- Runtime Budget Guard
- LlamaIndex Workflows
- Tool Routing
- MCP Tool Call Integration
- Reflect / Refine / Retry Loop
- Async Evaluators
- Ingestion Job Queue
- FastAPI Auth + Permission-aware Retrieval Hardening
- Document Management APIs
- Citation Source Viewer Payload
- Dockerize FastAPI + Qdrant + Worker
- Cloud Deployment Options
- Oracle E2 + Qdrant Cloud decision
- Deploy API to Oracle E2 + Qdrant Cloud
- Cloudflare domain + HTTPS
- Production Checklist Final Pass
```

> FastAPI Auth moved from position 5 to "just before Dockerization"—because auth can't use loopback inside a container, a coupling that only surfaces at deploy time.

**This was not covered in Part 03 or Part 04, and only appears here in Part 11** because it is about curriculum design, not a single technical component.

**Takeaway:** Re-sorting the learning path after one round of implementation is a refactoring the teacher has to go through. The first path is sorted by "what I know"; the re-sort is sorted by "where students get stuck". **The latter matters more than the former.**

---

## Observation 3: What You Choose Not To Do Shapes the System

Parts 02-10 walked through "building it". But a production RAG that is stable to run is shaped not only by what you build, but also by what you explicitly defer.

Only the **deferred items** (out of scope for this series) are listed here:

```text
- Multi-LLM provider abstraction (Anthropic / OpenAI / Gemini all supported)
- Self-hosted Qdrant (currently using Qdrant Cloud)
- Streaming response (currently returns complete answer)
- WebSocket push (citation changes proactively notify client)
- Multi-region failover (VM is only in us-ashburn-1)
- Production-style observability stack (Prometheus + Grafana + alert)
- A/B testing framework (5 query modes have no traffic split)
- Fine-tuning embedding model (using off-the-shelf OpenAI / BGE)
- RAGAS / LLM judge switched to local models (currently cloud LLM)
- In-house prompt registry (prompts scattered inside each module)
```

Each of these is "buildable". Each is "not building right now".

**Why this matters:**

The existence of a deferred list means you **know what you are not doing yet**. A RAG project's "not done" list is a useful signal of system maturity, because it makes scope explicit.

- "We're in production" → What does that mean? How much traffic? What SLA? Unspecified
- "We have 10 capability flags" → So what? How does the caller use them? Unspecified
- "We didn't do multi-LLM abstraction" → Why? Cost? Time? Vendor lock-in? **That reason is the real information**

> **Source materials:** 3-3/Deferred / Not Now section + implicit assumptions in 4-1's closing section.

**Takeaway:** **A RAG project's "not done" list is part of its design philosophy.** Writing this list down is harder than writing the Done list, and often more useful for planning.

---

## Alignment with Part 10: These Are My Choices, Not General Advice

Part 10's closing covered 4 architecture choices (Oracle VM / Qdrant Cloud / Cloudflare / Docker Compose). **Those 4 are "system layer" choices.** The 3 choices in this Part 11 are "**methodology layer**" choices.

| Choice | Part 10 (system layer) | Part 11 (methodology layer) |
|--------|------------------------|------------------------------|
| How to pick VM | Oracle Cloud Always Free | — |
| How to pick Vector DB | Qdrant Cloud | — |
| How to pick HTTPS | Cloudflare Origin Cert | — |
| How to pick orchestration | Docker Compose (not k8s) | — |
| How to manage capabilities | — | 11 flags → 5 modes |
| How to order learning path | — | re-sort by production sequence |
| How to define scope | — | explicit deferred list |

**Same principle applies:** these 3 are "why I chose this", not "you should do this". If you're building a different RAG project, the conclusions may flip entirely—for example, if your caller is an engineering team, 11 flags might be fine; if your curriculum is for experts, the production sequence might not be right; your deferred list might not need to be deferred at all.

> What these 3 have in common is not "my answer is right." It is: **after finishing, I can state what I chose, what I deferred, and why.** That is closure.

---

## 2026 Production RAG Landscape: Where This Series Fits

If you only read Parts 02-10, this series looks like a complete implementation path for production RAG: from chunking, embeddings, and retrieval to query routing, ingestion, ACL, and deployment. That path matters, but it is not the whole 2026 production RAG landscape.

The more precise statement is: this series builds the **Production Core RAG Backbone**.

That backbone has six layers:

| Layer | Where it appears in this series | Problem it solves |
|---|---|---|
| Ingestion | Part 03, Part 09 | How documents enter, persist, and carry metadata / ACL |
| Retrieval | Part 02, Part 06 | How the system moves from dense-only to hybrid / rerank / parent expansion |
| Context Assembly | Part 03, Part 06 | How candidates become context the LLM can reliably use |
| Verification | Part 07, Part 08 | How groundedness, citations, and final answers are checked |
| Observability | Part 07, Part 10 | How traces, debugging, cost, and latency become visible |
| Deployment | Part 10 | How the API, DB, vector store, HTTPS, and workers actually live in production |

![2026 Production RAG Landscape](/images/from-rag-to-production-rag-part-11/part-11-production-rag-landscape.png)

Outside that backbone, 2026 production RAG has several specialized patterns. They do not replace each other. They grow from the same backbone and solve different classes of problems.

| Pattern | Where it sits in this series | Depth in this series | When it becomes necessary |
|---|---|---|---|
| Agentic RAG | Part 08 as the main stage, with Part 07 / 11 adding observability and landscape | Deep | The query needs planning, tool routing, retry, and a final verifier |
| Structured / SQL RAG | Mainly Part 08, with Part 03 as the entry point | Medium | The answer lives in tables, databases, or APIs, not document paragraphs |
| Multimodal / Document RAG | Mainly Part 09, with Part 03 as the entry point | Medium | Documents contain tables, images, layout, OCR, and bbox citations |
| Long-context Hybrid | Mainly Part 06, with Part 08 adding the routing decision | Medium | Top-k is too fragmented, but packing whole documents is too expensive |
| GraphRAG | Positioned in the Part 11 landscape | Positioned only | The answer depends on entities, relationships, or community structure |
| Hierarchical RAG / RAPTOR | Positioned in the Part 11 landscape | Positioned only | Long documents or large corpora need tree summaries and multi-level retrieval |

The point of this table is not that this series covered everything. The point is the more useful closure question: **which layers did I go deep on, and which layers did I only position?**

If you are planning your own RAG system, I would start with this question:

> Am I missing the backbone, or am I missing a specialized pattern?

Many teams do not yet have stable ingestion, metadata, citation, or traces, but already want to add GraphRAG or agents. That is usually not an upgrade. It is moving an unstable problem into a more complex layer. On the other hand, once the backbone is stable, specialized patterns are where the next real ceiling lift comes from.

That is why this series does not chase the newest term first. It builds the backbone, then places the specialized patterns where they belong.

---

## What the Series Closure Looks Like

Part 01 is the interactive demo entry. Parts 02-10 walk through the whole arc. Part 11 collapses them into a coordinate system.

But what does "coordinate system" actually mean? It's not "this system has X, Y, Z capabilities"—it's "**how do these capabilities interact, how can a reader enter**".

My own way of entering:

1. **Want to understand how RAG works** → Part 02, 03
2. **Want to see what a real project looks like** → Part 05-09
3. **Want to push RAG to production** → Part 10
4. **Want to see how the whole project reads, how to assess your own progress** → Part 11 (this Part)
5. **Want to compare framework choices** → Part 04 (looking back)

Readers can enter from anywhere. **Part 11 is less a final article than an orientation page for the coordinate system**: after you finish Parts 02-10, come back here for the panoramic view; after you read this, jump back to whichever layer you need.

---

## For Readers Building a RAG Project Right Now

If I had to summarize these 3 things for readers in the middle of building a RAG project:

**The first one (flags → modes) is a reminder for system designers**: when you feel flags multiplying and callers randomly flipping switches, stop and collapse them into modes. **This isn't interface simplification, it's system design.**

**The second one (re-sort learning path) is a reminder for teachers**: the first path is sorted by "what I know"—**the re-sort is sorted by "where students get stuck"**. If you teach others or keep a record of your own learning path, run one round then come back and re-sort.

**The third one ("not done" list) is a reminder for project owners**: the Done list is "we've built it"; **the "not done" list is "we haven't built it, and we know why we haven't"**. The latter is harder to write and better at helping you locate your own progress.

If any of these 3 changes how you plan your own RAG system, then the closure has done its job.