---
title: "From RAG to Enterprise-Grade RAG Part 04 | LlamaIndex, LangGraph, n8n: A Selection Record of Three Tools"
description: "Before I picked LlamaIndex, I had a serious look at LangGraph and n8n. The three tools solve different problems — and the right pick comes down to what your project is actually trying to do, not which one is strongest. This piece is a record of how I chose, not a tool showdown."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "langgraph", "n8n", "tooling"]
date: 2026-06-10T14:30:00
featured: true
subtitle: "From RAG to Enterprise-Grade RAG Part 04"
series: "From RAG to Enterprise-Grade RAG"
seriesOrder: 4
---

Before I picked LlamaIndex, I had a serious look at LangGraph and n8n. This is a record of how I chose, not a tool showdown.

The three tools solve different problems — they are not in a "which one replaces which" contest. The useful question is which job the project actually needs done.

---

## 1. Where each tool actually sits

**LlamaIndex = a framework for RAG and document-centric agents**

LlamaIndex proper is an open-source Python / TypeScript SDK, not a drag-and-drop UI. In your own backend (FastAPI, Docker, serverless) you import `llama_index` and let it handle document parsing, chunking, indexing, retrieval, query engine, citation, workflow and agent. LlamaCloud and LlamaParse are the cloud peripherals (managed parsing, ingestion, retrieval), but **the core framework is still code, not a UI button**.

Where it shines: RAG pipelines, document-centric agentic workflows (parse → extract → classify → RAG), citation-required question answering, document processing pipelines.

**LangGraph = a controller for general-purpose stateful agent workflows**

LangGraph is the low-level orchestration framework under the LangChain umbrella. It does not do document processing, RAG or indexing. What it does: durable execution (recoverable across crashes), complex state machines, branching across many tools, human-in-the-loop, and the safety net for long-running tasks.

Where it shines: general agent orchestration, branching across many tools (SQL + web + RAG + calculators), long-running flows that have to be recoverable, and multi-agent systems that need serious production observability.

**n8n = visual business-process automation**

n8n is a low-code drag-and-drop platform. You wire nodes in the UI, hook up SaaS (Slack, Notion, Sheets, email, HTTP) and lay down if/else logic. It does not do deep document work, and it does not do complex agent orchestration.

Where it shines: business-process automation (CRM leads into Slack on a schedule, email triggers that hit a webhook, Notion pages synced into Sheets), ingestion automation (a file landing in a cloud drive triggers parse / chunk / index), marketing or support flows, and lightweight SaaS glue.

On one chart:

```text
LlamaIndex = RAG / document-knowledge framework (code)
LangGraph  = agent workflow controller (code)
n8n       = business-process automation (drag-and-drop UI)

They are not on the same axis. Comparing them head to head is the wrong question.
```

---

## 2. How this project chose

I picked LlamaIndex, did not pick LangGraph, and did not pick n8n. Every rejection has a concrete reason.

**Why I picked LlamaIndex**

The brief of this project: take a PDF in, attach metadata, run hybrid retrieval, rerank, cite, faithfulness-check, wrap it in FastAPI. LlamaIndex covers most of that path — document loading, indexing, retrieval, synthesis, citation, and now LlamaIndex Workflows. The official docs also describe Workflows as event-driven, step-based, and capable of branches, loops, state and human-in-the-loop. In other words, for this document-centric agentic RAG project, LlamaIndex was enough without adding LangGraph.

More importantly, LlamaIndex is mature on the document axis: parser, metadata, parent-child structure, citation, docstore, raw storage, permission filter. Those are the core demands of this project, and among the frameworks I evaluated, LlamaIndex was the best fit on the document-RAG axis.

**Why LangGraph was rejected**

LangGraph is strong at general agent orchestration — durable execution, branching across many tools, complex state machines, long-running tasks. But this project is a RAG system: the query path is relatively narrow (one straight line from station 5 to station 14), it does not branch across many external tools, and it does not need a complex state machine.

The more practical reason: **LlamaIndex Workflows plus AgentWorkflow already cover the agentic surface this project needs**. Later in the build, the project started using Workflows (Planner → Rewrite → Decompose → Retrieve → Rerank → Answer → Verify) — all of it inside the LlamaIndex ecosystem. Bringing in LangGraph would mean maintaining two workflow abstractions, higher cognitive cost, more edge cases to test.

From the agentic layer to the deployment layer (auth, containers, cloud, CI), this project can stay within the LlamaIndex-centered stack. **LangGraph did not fill a gap that was important enough for this project's scope**. Part 08 will break down query-mode design, and we will see how LlamaIndex Workflows handles the five modes (fast / safe / deep_eval / creative / agentic) — exactly the slot LangGraph would normally take in a production RAG, but stitched together in LlamaIndex Workflows instead.

**That judgement only holds for this project's document-RAG system**. A different project — say, one that has to branch across CRM, ERP and a support system on a long-running flow — would put LangGraph in the lead, and LlamaIndex would only own the document-query leg.

**Why n8n was not picked**

n8n does not sit on the same axis as LlamaIndex or LangGraph. It is drag-and-drop business-process automation, and **it solves a different problem**: gluing SaaS together so marketing, support and data-sync flows do not need to be coded.

This project's query path is programmatic — FastAPI receives the query, LlamaIndex runs retrieval, Langfuse records the trace, Postgres stores metadata. It is all API to API, and a drag-and-drop UI does not help there.

n8n's role in this project is not on the query path. It is in **ingestion automation and business-process glue**. Part 09, when it breaks down "documents come in, stay governed, stay queryable", will show where n8n plugs into the ingestion pipeline: a file lands in Google Drive → n8n fires the trigger → calls the backend API → runs parse / chunk / index. Part 10, on deployment, will also bring n8n in for webhooks and scheduled jobs.

**So the tool configuration for this project is**:

> **LlamaIndex = the RAG workhorse**  
> **LangGraph  = not used (LlamaIndex Workflows covers the agentic surface)**  
> **n8n       = not on the query path, but Part 09 and Part 10 will pick it up for ingestion and business-process glue**

---

## 3. Why this is not a "winner takes all" contest

The usual mistake is to put the three tools head to head and ask "which is the strongest" or "which will replace which". The question is broken.

They answer different questions:

- LlamaIndex answers: how do you turn documents into queryable knowledge
- LangGraph answers: how do you keep an agent running long, steady and recoverable
- n8n answers: how do you wire SaaS and internal systems together without writing code

Comparing them as direct substitutes hides the more important question: which layer of the system are you trying to solve?

This project is document-RAG centered. LlamaIndex is the main framework, while LangGraph and n8n are useful only if the project scope expands into their layers.

But a different project? A customer-support agent that has to branch across Slack, Zendesk, a CRM and an internal database on a long-running flow — that one puts LangGraph in the lead, and LlamaIndex only owns the document-query leg. An in-house "every Friday, turn this Notion into a Slack digest" — n8n does that in five minutes of dragging, and writing code would be slower.

**So the pick is not "which is the strongest". It is "what is the core problem this project is trying to solve"**.

**Quick reference** — if you are picking between an RAG / agent / business-process tool, this table can be the first-round filter:

| Your core problem | Main pick | Add-on |
|---|---|---|
| Document RAG / QA / citation | LlamaIndex | — |
| Document-centric agentic workflow | LlamaIndex Workflows / AgentWorkflow | LangGraph only when the state gets really complex |
| General agent orchestration, long-running multi-tool | LangGraph | LlamaIndex can be a document-query tool inside it |
| Ingestion automation, business-process glue | n8n | API-to-API still goes through code, drag-and-drop UI for the rest |

**This selection record only holds for the "document RAG system" scenario**. Switch the scenario and the priority order of the three tools can flip completely.

---

The interactive demo in Part 01 runs exactly this project's production pipeline — go straight to the article page and ask it anything to see the trace flow. Part 05 will start breaking down "how does a minimum-viable RAG grow into this project" — five concrete files to start with, three abstractions to leave for later, three signals that tell you it is time to move from a demo script to a backend API. How LlamaIndex grows from a five-line quickstart into a production system, that is what Part 05 will lay out.
