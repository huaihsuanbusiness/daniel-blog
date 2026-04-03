---
title: "RAG Engineering in Practice 04 – Why Qdrant Throws `Index required`: Payload Indexes, Schema, and Filter Design Explained"
description: "The first time you add a filter in Qdrant, there is a decent chance you will run into an error that feels oddly rude:"
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:26:00
featured: false
---

The first time you add a filter in Qdrant, there is a decent chance you will run into an error that feels oddly rude:

> Bad request: Index required but not found for "source_type"

At first glance, it looks annoying rather than enlightening. The payload clearly contains `source_type`. The filter itself looks reasonable enough. So why is Qdrant insisting that you create an index first?

That reaction is understandable, but a bit misleading.

What this error is really telling you is something much more important:

**once you start using metadata such as `source_type`, `memory_set`, or `job_id` to control retrieval, you are no longer just storing vectors. You are designing a schema.**

This article is not only about fixing the 400. It is about understanding payload indexes, field schema, filter design, and why they matter in a retrieval system at all. fileciteturn13file2turn13file13

## The core claim

If I had to reduce the whole thing to one line, it would be this:

> A payload index is not a Qdrant quirk. It is the moment structured conditions formally enter your retrieval system.

In RAG, we often want vector similarity and structured constraints at the same time:

- only search `source_type = "cv"`
- only search one `memory_set`
- only search one tenant or one job
- only search points after a certain version

Embeddings do not solve that layer. Filters do. Payload indexes are part of what stops that layer turning into sludge. citeturn803663search0turn803663search4turn803663search12

## Why having a payload field is not the same as being able to filter on it

In Qdrant, a point’s payload is basically arbitrary JSON. You can quite happily store something like:

```json
{
  "source_type": "cv",
  "memory_set": "daniel_job_memory_v1",
  "title": "PM cadence",
  "text": "..."
}
```

But “the field exists in payload” and “the system can reliably and efficiently use it for filtering” are not the same thing.

Qdrant’s documentation is quite direct on this. If you want filtering to work efficiently, you should create payload indexes for the relevant fields. It also advises you to index the fields you actually filter on, rather than indexing everything and wasting memory. The API reference treats payload-index creation as an explicit operation, not as something the system quietly infers on your behalf. citeturn803663search0turn803663search1turn803663search4turn803663search15

That is why people run into `Index required` even when the filter looks perfectly valid.

## Treat payload indexes as schema migrations and the whole thing starts to make sense

I’ve found that this becomes much easier to reason about once you stop treating it as “Qdrant being fussy” and start treating it as a schema migration.

If your vector store only contains vectors, it is essentially a similarity engine with some attached metadata.

The moment you start storing fields like:

- `source_type`
- `memory_set`
- `job_id`
- `rubric_id`
- `version`
- `tenant_id`

you are no longer just attaching random metadata. You are declaring structure that you expect the retrieval system to respect. fileciteturn13file13

Seen that way, a payload index is effectively saying:

> this field is no longer incidental metadata; it is now part of the query plan

## How to think about field schema

The most common payload index schema types in Qdrant are roughly these:

- `keyword` for exact string matches  
- `integer` and `float` for numeric filtering or ordering  
- `bool` for boolean conditions  
- `text` for full-text related use cases

In RAG memory or knowledge-retrieval setups, the most common metadata fields are usually `keyword` fields, such as:

- `source_type`
- `memory_set`
- `rubric_id`
- `profile_id`
- `tenant_id`

These are not fuzzy semantic values. They are boundaries. They define data sources, tenants, versions, and retrieval lanes. fileciteturn13file2

## Which fields are actually worth indexing first

If you are just starting with Qdrant-backed retrieval, I would not recommend indexing every payload field in sight.

Qdrant’s own docs and production guidance are fairly consistent here: payload indexes consume additional resources, so they should be reserved for fields that genuinely matter to filtering and query planning. citeturn803663search0turn803663search8turn803663search15turn803663search19

In your case, I would begin with these two:

1. `source_type`
2. `memory_set`

### `source_type`
This is often one of the most frequently used filters. You may need to separate:

- rubric
- profile
- CV
- JD chunk

Without that boundary, retrieval tends to mix evidence roles together.

### `memory_set`
If you plan to keep more than one memory space in the same collection, this becomes close to essential. It can behave like a tenant boundary or a knowledge-space boundary.

Both of these usually belong under `keyword`. fileciteturn13file14

## What the API looks like

Qdrant’s API reference uses `PUT /collections/{collection_name}/index` to create a payload index, with `field_name` and `field_schema` in the body. citeturn803663search1turn803663search5

For example:

```bash
curl -X PUT "$QDRANT_URL/collections/daniel_job_memory_v1/index" \
  -H "Content-Type: application/json" \
  -H "api-key: $QDRANT_API_KEY" \
  -d '{
    "field_name": "source_type",
    "field_schema": "keyword"
  }'
```

And then:

```bash
curl -X PUT "$QDRANT_URL/collections/daniel_job_memory_v1/index" \
  -H "Content-Type: application/json" \
  -H "api-key: $QDRANT_API_KEY" \
  -d '{
    "field_name": "memory_set",
    "field_schema": "keyword"
  }'
```

## Once the indexes exist, filtering starts behaving like part of the system rather than an afterthought

A query in this setup might look something like:

```json
{
  "searches": [
    {
      "query": [/* embedding */],
      "limit": 2,
      "with_payload": true,
      "filter": {
        "must": [
          { "key": "source_type", "match": { "value": "rubric" } }
        ]
      }
    }
  ]
}
```

This pattern is perfectly normal in RAG. The same query vector may need to travel down several evidence lanes, with different `source_type` filters, before the results are assembled into one evidence pack. The issue is not the design. The issue is pretending those lanes do not need proper schema support. fileciteturn13file15

## How to verify the index is really there

### Method 1: inspect the collection schema or payload metadata
If your deployment makes the payload schema visible, confirm that `source_type` is registered with the intended schema type.

### Method 2: rerun the original filtered query
This is the most direct test. If the previous response was `Index required`, the difference after index creation tends to be obvious. fileciteturn13file15

## Which fields are not worth indexing indiscriminately

Not every payload field deserves an index.

The rule of thumb I trust is roughly this:

1. **high-frequency filter fields**  
2. **high-selectivity fields**

Fields such as `source_type`, `memory_set`, and `tenant_id` often pass both tests. But a field that is barely ever filtered, or one that only carries a tiny number of low-value categories, may not justify the extra overhead. Qdrant’s guidance is clear that payload indexes are not free. fileciteturn13file13turn13file15turn803663search15

## Three common misunderstandings

### Misunderstanding 1: close enough field names are fine
They are not.

If you stored `source_type` but your filter uses `type`, Qdrant is not going to read your mind.

### Misunderstanding 2: `match.value` is fuzzy
Not for `keyword`.

`cv` and `cv_bullet` are different values. fileciteturn13file13turn13file15

### Misunderstanding 3: indexes make vector similarity more accurate
They do not.

Payload indexes exist primarily to make filtering reliable and efficient. Whether similarity itself is good still depends far more on embeddings, chunking, and query construction. fileciteturn13file13

## Why this matters for RAG specifically

It is tempting to treat payload indexing as an implementation detail, but in a real RAG system it usually is not.

As soon as you start doing things like:

- source-based retrieval
- tenant separation
- separate evidence lanes
- version-aware retrieval
- ACL-like filtering

you are combining semantic similarity with structured conditions in the same query system. Payload indexes sit directly on that boundary.

## When this rule of thumb does not bite as hard

If your collection is small, filtering is rare, or you are still in proof-of-concept territory, some fields may not need indexing straight away. But once retrieval begins to involve:

- frequent filters
- multi-query patterns
- multiple data sources
- multi-tenancy
- production latency requirements

payload indexing stops looking like optional polish and starts looking like part of the retrieval schema itself.

## What comes next

This article is about the moment metadata becomes part of the retrieval system.

The next article tackles a different but equally irritating class of failure: **Qdrant’s JSON 400 hell**. That is the world of `expected value`, `key must be a string`, and `line 2 column 32` even though your request body looks perfectly fine in a validator.
