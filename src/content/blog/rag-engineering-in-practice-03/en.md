---
title: "RAG Engineering in Practice 03 – The Engineering Philosophy of Chunking: You’re Designing Evidence Units, Not Splitting Text"
description: "One of the first terms people run into when building RAG is chunking. And that is often where things start to drift."
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:25:00
featured: false
---

One of the first terms people run into when building RAG is chunking. And that is often where things start to drift.

People begin debating chunk size, overlap, and which splitter looks more serious on a diagram. None of that is pointless. It just gets treated as though it were the whole problem, when it really is not.

If you frame chunking too early as a text-splitting trick, you often end up with a retrieval system that looks tidy on paper and behaves terribly in practice. The evidence pack balloons, recall gets noisy, the model latches onto the wrong detail, and before long people start blaming embeddings or the model itself.

I’ve ended up thinking about chunking in a more grounded way:

**you are not splitting text, you are designing evidence units for future retrieval and generation.**

This piece unpacks that idea with a concrete case: a job agent that takes a JD, retrieves CV and rubric chunks, then scores or writes from those results. It is a good setting for chunking because the task is not generic Q&A. It is much more about mapping requirements to evidence and doing so in a way the model can actually cite and use. Once you look at it that way, CVs and rubrics clearly should not be cut with the same knife.

## The core claim

If you only take one line away from this article, let it be this:

> Chunking is not about making documents smaller. It is about shaping data into units that can be retrieved, cited, and used reliably downstream.

That sounds slightly philosophical, but it is really an engineering claim.

In a RAG pipeline, a chunk usually plays at least two roles at once:

1. a **retrieval unit**
2. a **citation unit**

If a chunk works for one of those jobs and fails at the other, it is not a very good chunk.

## Why chunk size on its own is the wrong conversation

Pinecone and LangChain both discuss chunking as a practical starting point. LangChain is especially direct about beginning with `RecursiveCharacterTextSplitter`, then tuning `chunk_size` and `chunk_overlap` if needed. That is sensible advice. But a sensible starting point is not the same thing as a design principle.

The real question is not “what chunk size should I use?” It is this:

> What do I need each chunk to be able to do later?

Different document types get fed into the same splitter all the time. FAQs, contracts, CVs, Slack threads, and scoring rubrics all end up looking as though they came off the same assembly line. The chunks are neat. The system is not necessarily any better for it.

## Two common failure modes

### 1. Chunks that are too large

These get recalled because one sentence inside them is relevant, but most of the chunk is noise.

The evidence pack becomes bloated. Attention gets diluted. Tokens disappear into context the model never really needed.

In the job-agent case, CV chunks are where this often goes wrong. Imagine one chunk contains:

- growth metrics
- user interviews
- partnerships
- an AI prototype
- PM cadence

Now a JD mentions AI. That whole chunk may come back. But perhaps the model only needed two lines about the prototype. The rest just muddies the waters and encourages the model to write a broader, noisier relevance story than the prompt actually called for.

### 2. Chunks that are too small

The opposite problem is just as real. Chunks can become so tiny that each one loses the context required to stand on its own.

Then the retriever does not bring back evidence. It brings back fragments. The model is forced to reconstruct the missing links itself, which is precisely where hallucination and unstable reasoning creep in. Teams often respond by pulling more chunks, which raises cost and makes context management worse.

So no, “smaller is better” is not a safe rule. It only works when the smaller unit still preserves meaning.

## Why CVs are worth cutting more finely

I’ve become fairly convinced that CVs usually deserve more granular chunking than people first expect.

Not because CVs are short, but because the downstream questions are different.

In a scoring or cover-letter workflow, the CV is rarely being used to answer “who is this person overall?” More often, it is being used to answer questions like:

- which parts of this CV map to the JD’s actual requirements?
- which bullets are the strongest evidence for this role?
- what angle should I use for the cover letter?
- which non-negotiables fail immediately?

Those are not document-summary questions. They are **mapping questions**. And mapping questions hate chunks that mix several unrelated signals into one large block.

That is why I tend to prefer topic-based or evidence-based slicing for CVs rather than rigid token windows. For example:

- scale metrics
- ambiguity handling and 0→1 scope
- experimentation and funnel thinking
- AI prototype work
- PM cadence
- partnerships or external demos

When retrieval returns chunks like these, the top-k looks more like an evidence list and less like a chapter from someone’s autobiography.

## Why rubrics should not be chopped too aggressively

Rubrics play a different role.

A CV is an evidence pool.
A rubric is closer to the rules of the game.

When retrieving CV evidence, it often makes sense to bring back several chunks. With rubrics, you usually only need one or two well-formed rule groups to drive scoring or formatting. If you break the rubric into pieces that are too small, you often create two problems:

1. the model retrieves criteria but misses hard gates
2. top-1 or top-2 retrieval becomes unstable, so scoring drifts between runs

That kind of drift is annoying because it rarely presents as a dramatic failure. It just slowly makes the system less trustworthy.

So the better move for rubrics is not “smaller”. It is **self-contained rule groups**. A chunk should be usable on its own.

Your change from 9 rubric chunks to 11 was a nice example of this. It was not about fragmentation for its own sake. It was about making each rule group more self-sufficient and easier to retrieve cleanly.

## Chunking and evidence-pack design are the same conversation

When prompts get too long, the reflex is usually to make chunks smaller. In practice, a better move is often to control how many chunks you bring back and how you assemble the evidence pack in the first place.

In your scoring setup, a practical recipe looks something like this:

- rubric: topK = 2
- profile: topK = 1
- CV: topK = 2 to 3
- JD: start by passing the full text, then revisit JD chunk retrieval later if needed

There is nothing magical about those numbers. What matters is that they keep the evidence pack within a range the model can actually handle, without turning the whole prompt into a landfill site.

## A very practical smoke test

If you have a chunk set and no formal evaluation set yet, I like an extremely simple test:

> If I had only one query to recall this chunk, would it have one clear topic?

If the honest answer is “not really, it contains four different things”, the chunk is probably too fat.

A second test is equally blunt:

> If I set CV topK to 3, does the evidence pack already feel too large to hand to the model with a straight face?

If yes, the first things to revisit are usually:

- whether the CV should be split more finely
- whether topK should come down
- whether rubric and profile retrieval should be tightened

Blaming the model at that point is usually premature.

## When this rule of thumb breaks down

This is the important counterexample section.

“Cut CVs finely, keep rubrics more self-contained” is not a universal law. It works because the task here is evidence mapping.

Change the data type or the downstream task, and the chunking logic may need to change as well.

For example:

- **FAQs and knowledge-base articles** often benefit more from heading-aware chunking
- **contracts and regulations** care more about clause completeness than small granularity
- **tables** may need row-level reconstruction with column semantics carried into each chunk
- **code and config files** often want structural or language-aware boundaries rather than ordinary text windows ## The engineering judgement I trust now

If I had to reduce the whole piece to a short set of working rules, it would be these:

1. one chunk, one topic, one usable citation unit
2. cut according to the role of the data first, then tune chunk size
3. evidence-pool documents are often worth splitting more finely than rule documents
4. chunking and evidence-pack design are two sides of the same problem
5. chunks that are too large dilute attention; chunks that are too small force the model to invent glue
6. when chunking is designed properly, RAG stops feeling mystical and starts feeling like engineering

## What comes next

If this piece is about how to design evidence units, the next one moves into a more structured layer:

**once you start attaching metadata to your vector store, and you want fields like `source_type` or `memory_set` to drive retrieval, schema and payload indexing stop being implementation trivia and start becoming part of the retrieval system itself.**
