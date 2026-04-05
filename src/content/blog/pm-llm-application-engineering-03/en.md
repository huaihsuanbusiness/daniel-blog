---
title: "LLM Application Engineering and Governance for PMs Part 3 – LLMs Do Not Do the Work Alone: How Tool Calling and RAG Connect Models Back to the Real World"
description: "The first instinct many teams have when they start building with LLMs is fairly predictable: write a better prompt, add a few examples, and see whether the model can somehow hold the whole thing toget"
categories: ["ai"]
tags: []
date: 2026-04-05T16:27:00
series: "LLM Application Engineering and Governance for PMs Series"
seriesOrder: 3
---

The first instinct many teams have when they start building with LLMs is fairly predictable: write a better prompt, add a few examples, and see whether the model can somehow hold the whole thing together.

That instinct is understandable. It is also where a surprising number of projects stall.

As soon as the problem touches any of the following, prompt quality stops being the whole story:

- **external actions**, such as checking an order, calculating ROI, creating a ticket, or updating a CRM;
- **private company knowledge**, such as policies, contracts, FAQs, workflows, and product documentation;
- **traceable production behaviour**, where outputs need to be replayed, audited, validated, or routed downstream.

That is why real LLM application engineering quickly runs into two practical capabilities: **tool calling** and **RAG / retrieval**.

They often appear together, but they are not the same thing. Treating them as if they were interchangeable is one of the fastest ways to build something that looks clever in a demo and feels strangely brittle the moment real work arrives.

## The short version: tool calling and RAG solve different jobs

The simplest way to separate them is this.

**Tool calling** is for cases where:

- the model needs fresh or system-specific data that is not in its training set,
- the model needs to trigger an external action,
- a calculation or workflow cannot safely be left to the model’s own reasoning.

OpenAI’s function calling guide is quite explicit here: the model can be given access to tools that query data or take actions, but the actual execution sits in your application. Anthropic describes tool use in much the same way: Claude returns a structured tool call, your application executes it, and the result is sent back to the model. In other words, the model is not “doing the work” by itself. It is producing a structured request for work to be done. ([developers.openai.com](https://developers.openai.com/api/docs/guides/function-calling/))

**RAG / retrieval** is for cases where:

- the model needs to look up internal knowledge before answering,
- the response should be grounded in documents rather than free-form recall,
- you want citations or evidence trails attached to the answer.

OpenAI’s retrieval documentation frames this as semantic search over vector stores, especially useful when results are relevant in meaning rather than by exact keywords. That is not the same problem as calling a function. It is a knowledge access problem. ([developers.openai.com](https://developers.openai.com/api/docs/guides/retrieval/))

So the clean distinction is:

- **Tool calling reconnects the model to system capability.**
- **RAG reconnects the model to knowledge evidence.**

Both move beyond chat. They just pull in different directions.

## Tool calling is not about letting the model “handle it”

The most dangerous misunderstanding around tool calling is the belief that, since the model can choose the tool, perhaps it can also be trusted to calculate, verify, and act on its own.

That is usually where reliability starts to crack.

One line from your own notes gets the boundary exactly right:

> The LLM is not responsible for calculation, retrieval from systems, or writing into systems. The LLM is responsible for deciding which tool to use and filling in the arguments; execution belongs to a deterministic tool. fileciteturn22file0

That is not merely a tidy engineering preference. It is a production design principle.

In practice, tool calling has three distinct parts:

1. **Tool spec**: what tools exist, what they are for, and what arguments they accept.
2. **Tool call**: the model’s structured request to use one of those tools.
3. **Tool result**: the actual output returned by your application after execution.

Once you separate things this way, you get three benefits immediately.

First, **reliability**. A deterministic tool will produce the same result for the same input. A model left to “work it out” may not.

Second, **auditability**. You can log the tool input, tool output, and final answer. If something goes wrong, you can inspect whether the model chose the wrong tool, extracted the wrong arguments, or the tool itself produced an incorrect result.

Third, **controllability**. You can apply action whitelists, argument validation, bounded retries, and fallback rules. You can do none of that with any real confidence if the model is freewheeling inside business logic. fileciteturn22file1

This matters enormously for PMs because it changes the allocation of responsibility:

- the model handles interpretation and routing;
- the tool handles execution and correctness;
- the system handles validation, logging, and replay.

That is not a minor implementation detail. It is the difference between a persuasive assistant and a production component.

## RAG is not about making the model “smarter”

RAG is often described in a strangely mystical way, as though dumping documents into a vector database somehow makes the model understand your business.

It does not.

What it actually does is far more mundane and far more useful. You chunk documents, compute embeddings, store them in a vector index, and later retrieve relevant chunks when a user asks a question. Those chunks are then passed to the model, which synthesises a response from the retrieved evidence. ([developers.openai.com](https://developers.openai.com/api/docs/guides/retrieval/))

So RAG is not “chat with your documents”. It is closer to this:

- first, search for evidence;
- then, generate a grounded answer.

That means the real levers of quality are not especially glamorous.

### 1. Chunking

Chunks that are too small lose context. Chunks that are too large harm retrieval precision and increase prompt cost. Your notes use a practical starting point of roughly 300 to 500 tokens with overlap, which is a sensible baseline for early systems. fileciteturn22file2

### 2. Citations

If the answer has no citation trail, the system often slips into a dangerous grey zone where it sounds grounded without actually being grounded.

### 3. Abstention

A system that says “I cannot find evidence for that” is often more valuable than one that confidently improvises.

This is why enterprise RAG usually looks different from demo RAG. The real difference is not the vector database brand. It is whether the system includes:

- chunk metadata,
- document and chunk IDs,
- citation requirements,
- confidence signals,
- fallback or abstention behaviour.

## When tool calling and RAG belong together

The most common place they meet is in support, operations assistants, and internal copilots.

Imagine a travel platform where a user asks:

> Why was I charged again today when my card already went through yesterday?

A sensible system may need both layers:

- **RAG** for refund policies, payment FAQs, and internal handling guidance;
- **tool calling** for `get_order_status`, `get_payment_events`, or `estimate_refund_timeline`;
- then a model pass to turn that evidence into a useful, human answer.

This is where teams often go wrong. They collapse the architecture:

- they treat a knowledge answer like a tool;
- they treat live order state as if it were a document retrieval problem;
- they let the model infer payment state from partial fragments.

The result is an architecture that feels “AI-native” but is loose at both ends.

The simplest decision rule I know is this.

### Use RAG when the answer is fundamentally “what do our documents say?”

- policy questions,
- workflow guidance,
- FAQs,
- contracts,
- internal documentation.

### Use tool calling when the answer is fundamentally “what does the system know or need to do right now?”

- checking an order,
- calculating ROI,
- raising a ticket,
- updating a CRM,
- issuing a refund.

### Use both when the user needs policy context and system action in the same flow.

It is not flashy, but it keeps systems honest.

## Most failures do not come from weak models. They come from bad boundaries.

The most useful part of this conversation is not the terminology. It is the failure analysis.

### Failure mode 1: too many tools, too much overlap

OpenAI’s agent guide makes a practical point that is easy to miss: the issue is not simply the number of tools. It is the similarity and overlap between them. Some systems perform well with more than fifteen distinct tools; others struggle with fewer than ten when the responsibilities blur together. ([openai.com](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/))

For PMs, this means:

- tool names need to be crisp,
- parameter boundaries need to be explicit,
- adjacent tools should not feel interchangeable.

### Failure mode 2: chunking by size alone

If policies, SOPs, and FAQs are split without regard for structure, retrieval quality degrades in subtle ways. A user asks about refund eligibility; the model retrieves refund timing. The answer sounds plausible, yet it answers a different question.

### Failure mode 3: no citations, but everyone acts as though the answer is grounded

This is common in internal demos. The system sounds authoritative, adopts the right tone, and appears to “know the company”. In reality, it is generating with weak or absent evidence.

### Failure mode 4: tool calling as theatre rather than responsibility design

Some teams open up a large set of tools because the model feels more capable that way. In practice, this often creates permission sprawl, malformed calls, and confusing failure chains.

## What this means for PMs

For a PM, the real takeaway from Part 3 is not a bigger vocabulary. It is knowing which layer you are actually designing.

You are not merely building an assistant. You are deciding:

- which questions belong to knowledge retrieval,
- which belong to external actions,
- which require citations,
- which should be delegated to deterministic logic,
- which should refuse, fallback, or hand off to a human.

Put differently, the real subject of this piece is not tool calling or RAG in isolation.

It is this:

**PMs stop being prompt writers and start becoming designers of system boundaries.**

That is one of the reasons I would not call this “prompt engineering”. By this point the core challenge is no longer “how do I write a better prompt?” It is “how do I make the model, the tools, the knowledge layer, and the backend each do the job they are actually good at?”

## A practical decision frame

If you only keep one framework from this piece, make it this one.

### Question 1: Is the answer in documents or in systems?

- in documents → RAG
- in systems → tool calling
- in both → combine them

### Question 2: Can the task be handled by deterministic logic?

If yes, let the tool do it. Do not ask the model to improvise arithmetic or business rules.

### Question 3: What is the cost of being wrong?

The higher the cost, the more you need citations, validators, whitelists, fallback, and logging rather than a longer prompt.

Those three questions will usually save you more time than memorising ten architecture diagrams.

## Do not rush into agents

Once tool calling and RAG are working, most teams immediately want to build an agent.

That temptation makes sense. Once the model can retrieve, route, and act, the next step seems obvious: let it plan, coordinate, and carry work across multiple steps.

The trouble is that this is often the point where a system stops becoming sharper and starts becoming heavier.

So the next question is not “how can we make this more agentic?”

It is the harder and more useful one:

**When is a multi-step agent actually worth the cost, latency, and governance burden, and when should you stop at guardrails, KPIs, and operational control?**
