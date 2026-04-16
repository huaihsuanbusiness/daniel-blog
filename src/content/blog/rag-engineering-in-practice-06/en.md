---
title: "RAG Engineering in Practice 06 – Taking RAG into Production: Retrieval, Citation, Evaluation, and Observability Are Not Optional"
description: "A lot of RAG systems are very good at performing in demo mode."
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:28:00
featured: false
---

A lot of RAG systems are very good at performing in demo mode.

You ask a question, they produce a tidy answer.
Sometimes they even cite a source, which makes the whole thing look faintly trustworthy. Someone on the team says the usual line:

- “This looks promising.”
- “Let’s connect a few more documents.”
- “We probably just need to tune the prompt a bit.”

And then the system starts moving towards production, and the problems change shape.

What tends to break is not that the model suddenly becomes stupid. It is things like:

- the system retrieved documents, but the answer still drifted
- some phrasings are stable while others go completely off
- the same question works today and changes tomorrow after a document update
- users start asking where exactly a claim came from
- legal, support, or internal knowledge use cases start demanding permissions, versioning, and auditability
- somebody on the team finally asks the uncomfortable question:
  **how do we know this system is actually improving?**

That is what this article is about:

**once you want RAG in production, the real exam paper is evidence, citation, evaluation, ACL, versioning, and observability. Prompting is not the whole story.**

## The core claim

If I had to start with one line, it would be this:

> A RAG system without evaluation, citation, and observability is not really a production system. It is closer to a demo that has been lucky so far.

That is not meant as theatre. The success criteria genuinely change once the system is expected to be relied upon.

In demo mode, success often means “that answer looked good”.

In production, success looks more like this:

- did it retrieve the right evidence?
- can the answer be traced back to that evidence?
- when it fails, can we tell whether retrieval failed or generation failed?
- are data access, versions, and latency under control?

If you cannot answer those questions, the system may still answer some queries well. It is just very hard to trust.

## The first production problem is usually not model size. It is evidence quality.

This gets missed surprisingly often.

A lot of teams put their attention on model choice or prompt engineering, but in RAG the biggest return often comes from the quality of the evidence itself.

Because the model is really only doing three things:

1. reading the context you gave it
2. reasoning within that boundary
3. expressing the result fluently

If the evidence is messy, duplicated, bloated, stale, or mutually inconsistent, then a larger model will mostly just explain that mess with greater confidence.

So the framing I trust more now is:

- **retrieval** is responsible for bringing back the right evidence
- **generation** is responsible for staying inside the evidence boundary
- **the system layer** is responsible for making all of this observable, measurable, and auditable

## The first debugging split: did retrieval fail, or did generation fail?

This distinction matters a great deal.

A bad answer may look like a single category of failure from the outside, but in practice it usually falls into one of two buckets.

### Case 1: retrieval failed
That means the system did not actually bring back the evidence it needed.

Common causes include:

- the wrong chunking granularity
- bad filter design
- poor top-k settings
- no hybrid retrieval or reranking
- weak metadata boundaries
- document updates without proper reindexing

### Case 2: generation failed
That means the evidence was present, but the model still overreached.

Common causes include:

- prompts that do not enforce grounded answers
- weak citation alignment
- overly fat contexts, so the model grabs the wrong thread
- a tendency to merge across chunks too aggressively
- answer templates with no graceful “I don’t know” path

My own habit now is very simple:

**look at the evidence first, then judge the answer.**

If the right chunk never came back, there is no point blaming the model yet.

## Citation is not UI decoration. It is risk control.

A lot of teams initially treat citation as a nice-to-have. I don’t, at least not anymore.

In production RAG, citation does at least three jobs:

1. it lets the user verify the answer
2. it lets the team debug the system
3. it makes the system auditable

If the system says “according to the SOP, refunds require manager approval”, then it should be able to show the SOP passage that supports that claim.

Otherwise, in legal, support, compliance, or internal knowledge workflows, it becomes difficult to trust the answer even when it sounds plausible.

Citation is not about making the interface look academic. It is about tying answers back to evidence so that errors can be located.

## Evaluation is not a vibe check

RAG systems are very prone to fake stability.

They can look “mostly fine” for a while, while nobody actually knows whether they are improving or merely avoiding difficult cases.

That is why evaluation frameworks such as RAGAs matter. The current docs lay out metrics that look at both retrieval and generation, including things like:

- context precision
- context recall
- faithfulness
- response relevancy Those metrics matter less because the names sound clever and more because they force you to answer practical questions:

- did retrieval rank relevant chunks highly enough?
- did the necessary evidence make it into top-k?
- is the answer actually supported by context?
- is it merely fluent, or is it on point?

Without those measures, teams often fall back to vibe checks:
“This feels better than last week.”

That is common in demos. It is thin ice in production.

## A minimal metric set is already much better than none

You do not need to build a cathedral on day one.
But if you have no metrics at all, most later arguments end up being aesthetic rather than diagnostic.

A practical minimum could look like this:

### Retrieval
- Recall@k
- Precision@k

### Generation
- Faithfulness / groundedness
- Answer relevance

### System
- latency
- cost per query
- follow-up rate
- source-click rate

That will not answer every question for you, but it will at least tell you which layer you are trying to improve.

## ACL belongs in retrieval, not as an awkward patch after generation

This is easy to underestimate, but it matters.

If your RAG system touches enterprise knowledge, internal docs, legal content, or support material, permissions cannot be treated as a cosmetic clean-up step after the answer has already been formed.

The healthier approach is usually:

- documents or chunks carry ACL metadata
- retrieval applies those constraints
- generation never sees material the user should not access

Because the risk is not only leaking an answer. Sometimes it is leaking the existence of a document.

## Versioning is not tidy housekeeping. It is the basis of reproducibility.

One of the more irritating production realities is that the same question can receive a different answer next week, and you may have no immediate idea why.

Without version information, it becomes hard to answer questions like:

- which document version supported this answer?
- when was the index last updated?
- did the chunk change after ingestion?
- was the difference caused by document updates or retrieval logic changes?

This is why source metadata, document versioning, and chunk provenance all feel dull but turn out to be indispensable.

## Observability determines whether you can actually debug the system

Without observability, many RAG failures turn into folklore.

At a minimum, it helps to be able to inspect:

- the query
- the retrieved chunks
- rerank changes
- the final evidence pack
- the answer
- the citation alignment
- user follow-up behaviour

That is not just useful for dashboards. It is what lets you work out whether the fix belongs in retrieval, generation, schema design, chunking, or the source material itself.

## When production-grade RAG is not worth it

It is also worth saying plainly that not every scenario deserves fully loaded production RAG.

If your setting has:

- a small document set
- low update frequency
- little audit pressure
- low risk
- users who can easily click through to source material

then plain search plus summarisation plus clear source links may be a far saner choice.

This is why I increasingly see RAG not as a system you should max out by default, but as an engineering trade-off shaped by risk, data characteristics, and workload.

## The production rules I trust now

If I had to reduce the whole article to the set of production rules I actually use, they would be these:

1. clean evidence comes before clever generation
2. citation is risk control, not decoration
3. evaluation does not need to be perfect on day one, but it cannot be absent
4. ACL belongs in retrieval
5. versioning is the baseline for reproducibility
6. observability determines whether debugging is real or theatrical
7. if you cannot tell whether a failure came from retrieval or generation, the system is not ready for production

## What comes next

If I were to close this series with a case study, the natural follow-up would be:

**how my job agent turns JDs, CVs, and rubrics into a working evidence pipeline.**

That would let the earlier engineering principles land inside one real workflow rather than staying at the level of reusable abstractions.
