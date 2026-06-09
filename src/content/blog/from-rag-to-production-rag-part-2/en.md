---
title: "From RAG to Enterprise-Grade RAG Part 02 | Chunking and Embedding Are Still Here: The Layers That Enterprise-Grade RAG Actually Adds"
description: "The tech community says chunking and embedding are outdated, but that claim is only half right. What production RAG really adds is not a new technology — it is 12 stations of retrieval engineering."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "retrieval", "observability"]
date: 2026-06-10
featured: true
subtitle: "From RAG to Enterprise-Grade RAG Part 02"
series: "From RAG to Enterprise-Grade RAG"
seriesOrder: 2
---

In tech circles you often hear: "Chunking and embeddings for RAG are already outdated — the cutting edge is X."

That statement is half right.

The half that is right: a naive RAG (chunking + embedding + vector top-k → LLM) is not enough in a production setting. Answers miss the point, citations break, costs spiral. These are not problems with some particular RAG framework — they are problems with how the pipeline is designed.

The half that is wrong: lumping "chunking is outdated", "embedding is outdated" and "vector DB is outdated" into a single claim.

In fact, all three are still the foundation of a production RAG (enterprise-grade RAG). **What is actually outdated is not any one of those technologies — it is the combination of using only those three and pretending it is a production RAG.**

What this piece wants to make clear: what chunking, embedding and the vector DB actually do in a production setting, and what layers have to be stacked on top of them before a system can stand up to real queries.

---

## 1. What the three technologies actually do

**What does chunking do in production?**

It is not enough to chop the document up and toss it into a vector DB. Production-grade chunking covers: preserving semantic boundaries (do not slice in the middle of a sentence), attaching metadata (chapter, page, timestamp, language, permissions), and structuring parent-child relationships (so the search retrieves small chunks while the answer can be reassembled back to the full paragraphs of the original).

Anthropic's Contextual Retrieval (2024) is a clear case in point. By prefacing each chunk with document context before embedding and BM25, the top-20 chunk retrieval failure rate dropped from 5.7% to 1.9% — about a 67% reduction in failures.

**What does embedding do in production?**

Dense embeddings handle semantic search. But they frequently miss proper nouns, code, numbers, dates and product codes — and that gap shows up most on documents that are dense with exact terms: insurance policies, credit-card agreements, legal contracts. In production you have to add a sparse / BM25 layer on top. The two together (hybrid search) cover both "semantic" and "exact term" needs.

**What does the vector DB do in production?**

The vector DB is still the best tool for semantic search. But it should not be the only source of truth. In production systems, raw documents, metadata, permissions, parent documents and eval results all live in Postgres, S3 or object storage. The vector DB is only responsible for the vector search leg.

**Short version: all three are alive. What is outdated is just the thin combination of using only those three.**

---

## 2. A full production RAG request

The fastest way to show what naive RAG is missing is to walk one or two production pipelines end to end.

**Scenario A: Investor pitch deck design check**

Suppose I am working on my own investor pitch deck, and the question is:

> "Will the first 30 seconds of this deck make an investor — the kind who, according to DocSend's 2024 study, only spends an average of 2 minutes 42 seconds on a deck — actually stop and keep reading? What do comparable decks usually do in the first 30 seconds?"

For this question to reach an answer, the system has to walk through 14 stations:

```text
1.  Query enters the system
2.  Query classification (this falls under pitch design + competitive analysis)
3.  Query rewrite (turn it into terms that search well)
4.  Query decomposition (split into 3 sub-queries: the first 30 seconds, DocSend's research, comparable decks)
5.  Routing (decide which sources to query: pitch deck design notes, DocSend research, competitor deck teardowns, startup methodology)
6.  Hybrid retrieval (dense + BM25 + metadata filter)
7.  Reranking (pull 50–100 candidates, narrow down to 5–20)
8.  Parent-doc expansion (let small chunks find their full original paragraph)
9.  Context compression (drop the irrelevant bits)
10. Citation assembly (bind source / page / section to each chunk)
11. LLM generates the answer
12. Faithfulness check (is the answer supported by the source?)
13. Citation check (do the citations point where they should?)
14. Tracing + logging (record every step for eval and debugging)
```

**Scenario B: Customer switching-cost analysis**

Another common query in B2B sales is:

> "They have a need, they have the budget, they can see the value — but they still will not buy. Where is the problem? Should I keep pushing?"

In a production setting this kind of query pulls across multiple interview notes, multiple business-model write-ups and multiple customer cases — a genuinely multi-source, cross-document, multi-step reasoning problem. Naive RAG almost always answers this kind of question superficially.

**These 14 stations are the minimum set for production RAG. The stripped-down naive version only covers stations 6 and 11.** Lose any one of the other 12 and answer quality drops a notch. Lose three or more and the system should not be in production at all.

---

## 3. Only that one thing is outdated

Distilled from production observations:

- **Not outdated:** chunking (paired with metadata and parent structure)
- **Not outdated:** embedding (paired with sparse / BM25 in a hybrid)
- **Not outdated:** vector DB (just one component in the retrieval system)
- **Outdated:** the single-step pipeline of "chunking + embedding + vector top-k → LLM"

This distinction matters in production. **What sets the ceiling on a RAG answer's quality is not how strong the embedding model is, but how complete the retrieval system is designed.**

That is also why this project spends about 70% of its effort on the retrieval layer. Hybrid search, reranking, context assembly, citation — these capabilities widen the gap far more than swapping in a more expensive embedding model.

---

## 4. The V0 → V4 evolution of this project

This project's version history can be roughly split into four stages.

### V0 — pure vector

```text
document → chunk → embedding → vector top-k → LLM
```

The typical V0 failure modes: questions with specific numbers go unanswered, cross-section synthesis questions come back as a stitched-together patchwork, cited sources point to the wrong page.

### V1 — adding hybrid and rerank

```text
+ sparse / BM25
+ metadata filter
+ reranker (pull 100, rerank to 10)
```

V1 fixes roughly 60% of V0's failure modes — exact terms are caught now, and rerank brings the most relevant 10 to the top. But citation and eval are still missing.

### V2 — adding context assembly and citation

```text
+ parent-doc expansion
+ context compression
+ citation assembly
```

V2 is where answers become trustworthy — every answer carries source / page / section, and the citations line up.

### V3 — adding observability and eval

```text
+ faithfulness check
+ citation check
+ offline eval dataset
+ Langfuse tracing
+ cost / latency tracking
```

After V3, debugging and optimisation finally have data to look at, instead of "let me just try a different prompt and see".

### V4 — adding query planning and agentic

```text
+ query classification
+ query rewrite / decomposition
+ routing
+ agentic workflow (the agent decides when to query, where to query, and how many times)
```

V4 handles the hardest queries: cross-document, cross-source, multi-step reasoning.

V0 to V4 is the actual evolution of this project. **Part 02 only gives the overview. The next nine pieces will break it down station by station.**

---

Chunking and embedding are still the foundation of RAG in 2026 — they are not outdated. What is outdated is the thin approach of using only those two and pretending it is production.

**What really sets the ceiling on RAG is the 12 retrieval-engineering stations in the middle.**

This 14-station pipeline is not just for RAG internals. Pitch deck design checks, customer switching-cost analysis, interview-method validation, workflow tool selection — all of these scenarios run on the same retrieval-engineering logic. The difference is only how routing and context assembly are designed.

The next piece (Part 03) will draw out a full 14-station pipeline diagram and walk through what each station does, how to implement it, and which tools to use.

If you want to see the production 14 stations in action, start with the interactive demo in Part 01 — that demo is running exactly the full production pipeline this piece describes.
