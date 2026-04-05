---
title: "RAG Engineering in Practice 05 – Qdrant’s JSON 400 Hell: The Problem Is Usually Not Qdrant but the Body You Actually Sent"
description: "If you are calling Qdrant from Make or another low-code tool, the thing most likely to drive you up the wall is usually not vector retrieval itself. It is the class of JSON 400s that look utterly unreasonable."
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:27:00
featured: false
---

If you are calling Qdrant from Make or another low-code tool, the thing most likely to drive you up the wall is usually not vector retrieval itself. It is the class of JSON 400s that look utterly unreasonable.

You see things like:

- `Format error in JSON body: key must be a string`
- `expected value at line 1 column 1`
- `expected value at line 2 column 32`

The especially maddening bit is that you paste the body into a JSON validator and it passes.

At that point you start doubting Qdrant, the HTTP module, the toolchain, and eventually your own life choices.

The core idea in this article is very simple:

**Qdrant’s JSON 400s are often not really Qdrant problems. They are problems of what the server actually received, as opposed to what you thought you sent.**

Once that clicks, the debugging path becomes much cleaner. You stop asking “why is Qdrant rejecting my request?” and start asking:

> did I actually send the object shape it expects, or did I merely send something that looks a bit like JSON?

## The core claim

If I had to reduce the whole piece to one line, it would be this:

> JSON 400 is usually a client-truth problem, not a Qdrant problem.

By client truth, I mean the raw bytes the server receives.  
Not the template you see in Make. Not the thing you pasted into a validator. Not the shape you imagine the body must have.

Qdrant is actually rather honest here. It parses what it receives. If you think you sent an object but it really received a string, it will reject it. There is no mystery in that.

## Fix the endpoint picture first

A surprising number of JSON 400s that look like parse errors are really endpoint-shape mismatches.

The most common Qdrant paths in this area are roughly:

- `POST /collections/{collection}/points`  
  for point upserts
- `POST /collections/{collection}/points/query`  
  for a single query
- `POST /collections/{collection}/points/query/batch`  
  for batch queries citeturn851418search2turn851418search4

And here is the key point:

**the single-query endpoint and the batch-query endpoint do not expect the same body shape.**

### Single query
Qdrant expects something like:

```json
{
  "query": [0.1, 0.2, 0.3],
  "limit": 3,
  "with_payload": true
}
```

### Batch query
Qdrant expects:

```json
{
  "searches": [
    {
      "query": [0.1, 0.2, 0.3],
      "limit": 2
    },
    {
      "query": [0.1, 0.2, 0.3],
      "limit": 1
    }
  ]
}
```

If you send the batch body to the single-query endpoint, the error you get may not politely say “wrong endpoint”. It may just throw a rather grumpy 400.

## Three common ways to send something that looks like JSON but is not what Qdrant needs

### 1. You think you sent a JSON object, but you actually sent a JSON string

This is the classic one.

You intended to send:

```json
{
  "query": [0.1, 0.2],
  "limit": 3
}
```

But what actually went over the wire was:

```json
"{"query":[0.1,0.2],"limit":3}"
```

A validator may still say this is valid JSON, because it is. It is a valid JSON string. It is just not the object Qdrant expects.

This usually comes from **double-stringify**. You stringify the object once, and then the HTTP module effectively wraps it again.

### 2. You think you sent an array, but the array got flattened into naked values

You meant to send:

```json
{
  "query": [-0.02, 0.03, 0.04]
}
```

But some low-code templating setups end up producing:

```json
{
  "query": -0.02, 0.03, 0.04
}
```

That is no longer valid JSON.  
And this is exactly the sort of thing that leads to those irritating `line 2 column 32` messages. In many cases, what the parser is really saying is:

**your vector is not a JSON array at all.**

### 3. The endpoint and the body shape do not match

You send:

```json
{
  "searches": [...]
}
```

but the URL is `/points/query`.

Or you hit `/points/query/batch` while sending only a single `query` object.

That may look like a JSON problem when it lands, but what is actually wrong is the contract between the endpoint and the payload shape.

## The most reliable debugging order: get the smallest viable request working first

I try very hard not to start with the full family meal: batch query, filters, payload, rerank, and three different evidence lanes all at once.

For JSON problems, the most effective debugging order is very plain:

### Step 1: run a single query without filters

```json
{
  "query": [/* embedding */],
  "limit": 1,
  "with_payload": true
}
```

### Step 2: confirm the vector is really an array
If your tool gives you a raw request preview, look at that. Not your template. The raw request.

### Step 3: add the filter back
Once the single-query body works, add `filter.must`.

### Step 4: only then move to batch
Switch the URL to `/points/query/batch`, and switch the body to `searches: [...]`

This order is useful because it tells you exactly which layer broke.

## Why the validator passes but the server still rejects you

This confuses a lot of people because validators only tell you whether the text you pasted is valid JSON.

They do not tell you:

- whether your object got wrapped as a string
- whether your endpoint and body shape match
- whether your array got flattened during interpolation
- whether the HTTP client actually sent the body you think it sent

In other words, the validator checks **your text**, not **the request body the server received**. Those are often not the same thing.

## What I trust more in Make and similar tools

If you are working in Make or another low-code environment, I trust a few habits more than others.

### 1. Use an object builder when possible
If the platform has a JSON-building step, that is usually safer than hand-assembling raw bodies with lots of interpolation.

### 2. Treat embeddings as data, not as text
Once you turn the embedding into a string, you are asking for trouble.

### 3. Avoid double-stringify
This point deserves repetition.  
If the body is meant to be an object, let the HTTP module send an object. Do not stringify it yourself and then hand it over to be wrapped again.

## This is not really about Qdrant as much as it is about client behaviour

That is the part I trust more now.

People often classify this as “Qdrant being awkward”. In practice, it is more often about:

- how the low-code tool interpolates values
- how the HTTP client serialises the body
- whether the endpoint contract and the payload shape actually match

Qdrant is just being honest enough to tell you that what it received was not what it wanted.

## When this rule of thumb does not fully apply

To be fair, not every 400 is a JSON assembly problem.

Some 400s really are about:

- filter schema issues
- missing payload indexes
- wrappers expecting a different query shape
- the wrong endpoint path entirely

So the point is not “every 400 means double-stringify”. The point is:

> first confirm that the server received a structurally correct request, then start suspecting higher-level retrieval design issues.

## The debugging rules I actually trust now

If I had to reduce this class of problems to a short set of rules, it would be these:

1. confirm the endpoint first  
2. confirm the outer body shape next  
3. confirm the vector is a real array  
4. confirm nothing got double-stringified  
5. get the single-query path working before batch  
6. only debug filters and payload-index issues after the JSON layer is genuinely stable

It is not glamorous, but it works.

## What comes next

This article is about client truth.

The next one moves to the bigger question: **how RAG goes from something that can answer questions to something you can actually run in production.**

That means retrieval, citation, evaluation, ACL, versioning, and observability, which all look like optional extras until the day they suddenly are not.
