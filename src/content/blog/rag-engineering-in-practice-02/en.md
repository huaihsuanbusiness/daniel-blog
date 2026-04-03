---
title: "RAG Engineering in Practice 02 – From Relational to Vector: A Practical Database Selection Map"
description: "A lot of database discussions still begin with “SQL versus NoSQL”. That is not wrong, exactly. It is just usually too coarse to be very useful for real engineering decisions in 2026."
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:24:00
featured: false
---

A lot of database discussions still begin with “SQL versus NoSQL”. That is not wrong, exactly. It is just usually too coarse to be very useful for real engineering decisions in 2026.

Because the thing you are usually choosing is not a syntax tribe. It is some combination of these questions:

- is your workload OLTP, OLAP, search, or retrieval?
- is your data model relational, document-shaped, graph-like, or vector-oriented?
- do you care most about transactionality, query flexibility, retrieval latency, or operational cost?
- are you building a system of record or a retrieval subsystem?

This article is about putting databases back into that more practical frame. And then answering the question people keep asking:

> what exactly is a vector database, and how is it different from a traditional database that merely happens to support vectors?

## The core claim

If I had to start with one sentence, it would be this:

> You are not choosing the coolest database. You are choosing which kind of system can keep correctness, retrievability, latency, and operational cost in balance for your workload.

That may sound slightly severe, but it is a very practical way to avoid the usual mistakes. Database choices rarely go wrong because the logo was unfashionable. They go wrong because the wrong kind of system was asked to solve the wrong physical problem.

## Why SQL vs NoSQL is not enough

SQL versus NoSQL is a perfectly decent beginner framing. It just stops being especially precise once you are doing real architecture.

For example:

- PostgreSQL can be an OLTP store and also carry vector search through pgvector
- MongoDB is document-oriented but also offers vector search
- Qdrant is clearly vector-native
- Snowflake and Redshift are warehouse-oriented systems that have also been adding vector capabilities

So if the first and only question is still “is it SQL or NoSQL?”, you usually miss the more important decision points.

## The first cut I trust more: workload

More than anything else, I prefer to start with workload.

### 1. OLTP
This is the world of:

- low-latency transactions
- strong consistency
- frequent writes and updates
- correctness as the top concern

Orders, payments, account state, and inventory all belong here.

### 2. OLAP
This world is more about:

- relatively fewer but heavier queries
- scans, aggregates, and reporting
- throughput and analytical efficiency

The point here is not transactional precision. It is analysis.

### 3. Search / retrieval
This is where “can we find the right thing?” becomes the main concern.  
Full-text search, inverted indexes, vector similarity search, and hybrid retrieval all sit somewhere in this space.

These workloads are solving different physical problems. If you approach retrieval with purely OLTP instincts, you often end up making the architecture more confused than it needs to be.

## Then look at the data model

The second cut I find useful is the data model itself.

### Relational
Good at:

- explicit schema
- constraints
- joins
- transactional semantics
- acting as the system of record

### Document
Good at:

- storing semantically complete units in one object
- smoother schema evolution
- content-heavy or event-shaped data

### Graph
Useful when relationships are the point of the query, not merely an implementation detail.

### Vector
The important thing here is not that it is “more AI”. The important thing is that data is projected into a high-dimensional semantic space so that nearest-neighbour search becomes meaningful.

## What vectors are actually solving

Vectors are not magic. They are another way of representing data.

You embed text, images, product descriptions, or behaviour traces into a high-dimensional space, and hope that semantically close things live near one another.

The advantage is obvious:  
the query and the document do not need to share the exact same wording in order to be retrieved together.

But that creates another physical problem:  
**if the collection is large, brute-force similarity checks become expensive.**

That is why approximate nearest neighbour methods such as HNSW and IVF exist in the first place.

## What a vector database actually is

If I wanted a definition that sounds serious without sounding mystical, I would put it like this:

> A vector database is a data system that treats vector similarity retrieval as a first-class concern. It does not merely store vectors. It integrates distance metrics, ANN indexing, metadata-aware filtering, latency control, and operational behaviour into a retrieval product.

The important phrase there is **first-class concern**.

Plenty of databases can now store vectors. That does not automatically make them vector databases in the stronger sense.

## The distinction I find genuinely useful: vector-native vs vector-capable

This is one of the most practical cuts in the whole discussion.

### Vector-native
These systems are built with vector retrieval as a central design goal.

Qdrant is a good example. Its core structures, filtering model, and retrieval path are all shaped around the idea that search is the product, not merely one feature among many.

### Vector-capable
These systems were not originally built as dedicated vector retrieval engines, but have since grown vector functionality.

That includes things such as PostgreSQL with pgvector, MongoDB vector search, and various warehouses or general-purpose databases that now expose vector features.

Their advantages are often very practical:

- no need to move the data far away
- easier integration with the existing application stack
- reuse of existing permissions, backups, and operations

The trade-off is that their tuning depth and upper ceiling for demanding retrieval workloads may not match a truly vector-native system.

## When you probably do not need a dedicated vector database

This is the counterexample that matters.

Not every RAG or semantic-search project needs an independent vector database on day one.

If your current situation looks like this:

- the data volume is still moderate
- retrieval is not the main product path
- you already have PostgreSQL or Supabase in place
- you care a lot about governance, consistency, backup, and operational simplicity

then a vector-capable route such as pgvector may be the more sensible choice at the start.

By contrast, if your situation looks more like this:

- retrieval is a central product path
- you expect higher QPS
- filtering is complex
- metadata boundaries matter a lot
- multi-tenancy is involved
- retrieval needs to scale independently

then a vector-native product like Qdrant starts to look much more at home.

## Why this matters for RAG specifically

This loops back to the first article.

RAG is not the same thing as a vector database, but once you do build retrieval-heavy RAG systems, storage and retrieval choices start to influence a great deal downstream.

Because the real questions become things like:

- how easy is metadata filtering?
- how cleanly can payload indexing be managed?
- where is the boundary between the application database and the retrieval store?
- should retrieval scale independently?
- should vector search and the source of truth be separated?

That is why I think the proper place of a vector database is not “the shiny AI thing in the stack”. It is a retrieval-oriented role inside a wider data-system map.

## The selection rules I trust now

If I had to reduce the whole article to a few working rules, they would be these:

1. start with workload, not with brand or syntax identity  
2. ask whether retrieval is the main path or a supporting one  
3. vector-native and vector-capable both have honest home turf  
4. do not assume you need a dedicated vector database just because everyone is talking about one  
5. what you are really selecting is a system boundary, not a fashionable component

## What comes next

The next article moves one level lower into the part of retrieval design that looks small at first and then quietly affects everything else:

**chunking.**

That is where evidence granularity, retrieval quality, evidence-pack size, and output stability all start tugging on each other.
