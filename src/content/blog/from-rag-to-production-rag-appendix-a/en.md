---
title: "From RAG to Enterprise-Grade RAG Appendix A | Production RAG Tool Index"
description: "This appendix turns Production RAG into a searchable engineering matrix: ingestion and indexing, query planning and retrieval, context and answer generation, evaluation and observability, and application infrastructure. The point is not to chase tool names, but to understand what each step solves, what to start with, when to switch, and what usually breaks."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "tooling", "llamaindex", "vector-database", "evaluation", "observability"]
date: 2026-06-15T22:30:00
featured: true
subtitle: "From RAG to Enterprise-Grade RAG Appendix A"
series: "From RAG to Enterprise-Grade RAG"
seriesOrder: 12
---

This appendix is not Part 12.

The main series already closed in Part 11. This piece has a different job: it is a tool index. When you actually move RAG toward production, which engineering steps appear? What problem does each step solve? Which tools are common? What would I start with? What tells you it is time to switch?

So this is not a ranking of the best RAG tools. Tool names change, APIs change, pricing changes, and community attention moves around. The more stable thing is the engineering problem:

- How does the document enter the system?
- How do permissions and metadata survive ingestion?
- Is a retrieval miss caused by recall, precision, or context fragmentation?
- How do you verify the answer?
- How do you debug the system when it fails?
- Which layer is responsible for cost or latency growth?

If the first 11 posts are the journey from naive RAG to a production backbone, this appendix is the lookup table for that journey.

![Production RAG Tool Map](/images/from-rag-to-production-rag-appendix-a/appendix-a-production-rag-tool-map.png)

---

## How to use this appendix: problem first, tool second

For each row, use the same order of questions:

1. What problem does this step solve?
2. What tools are commonly used?
3. What would I start with today?
4. What situation tells me to switch?
5. What usually goes wrong?

That order matters. Many RAG projects get stuck not because there are too few tools, but because the team has not named the layer that is actually failing.

![RAG Tool Selection Ladder](/images/from-rag-to-production-rag-appendix-a/appendix-a-rag-tool-selection-ladder.png)

---

## A. Ingestion and indexing

This is the build side. It decides whether the knowledge base is clean, updateable, permission-aware, and rich enough for retrieval to work later.

| Step | Problem solved | Common tools | My starting choice | Switch when | Common trap |
|---|---|---|---|---|---|
| Data source connectors | Pull data from Google Drive, Notion, Slack, GitHub, S3, databases, and websites | LlamaIndex Readers, LangChain document loaders, Airbyte, custom ETL | For a few sources, start with LlamaIndex Readers or custom connectors | Many sources, complex sync rules, or CDC requirements | Pulling content without source id, updated_at, owner, or version |
| Parser / OCR / document conversion | Convert PDF, Office, HTML, or scanned files into usable text and structure | Unstructured, LlamaParse, Docling, Azure AI Document Intelligence, Google Document AI, Tesseract | For technical PDFs, try LlamaParse or Docling; for scanned docs, evaluate cloud OCR | Tables, layouts, page numbers, or heading hierarchy are unreliable | Keeping only plain text and losing pages, headings, and table semantics |
| Chunking / node creation | Turn documents into retrievable units | LlamaIndex NodeParser, LangChain text splitters, semantic chunking, custom splitters | Start with markdown or heading-aware chunking plus parent id | Answers often need multiple paragraphs or sections | Chunks too small become fragments; chunks too large become noisy |
| Metadata extraction | Create source, title, section, page, time, entity, and doc type signals | LlamaIndex extractors, LLM-based extraction, spaCy, custom rules | Start with deterministic metadata, then add LLM extraction where needed | Classification, entity extraction, or date inference becomes necessary | Metadata looks nice but cannot be filtered |
| ACL / permission | Prevent users from retrieving documents they should not see | Source ACL sync, app DB permission tables, row-level security, metadata filters | Store user, group, and tenant signals in metadata and app DB | Permission inheritance or cross-system groups become complex | Blocking access only in the UI while retrieval has no permission filter |
| Raw docstore / parent store | Preserve original documents, parent sections, and source paths | Postgres, S3/R2, MongoDB, LlamaIndex docstore | Store raw files in object storage; store metadata and parent mapping in Postgres | Versioning and audit requirements increase | Storing chunks only, so you cannot re-chunk, rebuild, or cite correctly |
| Dense embedding | Turn text into semantic vectors | OpenAI embeddings, Cohere Embed, Voyage AI, bge, e5, Jina embeddings | Start with a hosted embedding model; self-host after quality and cost are understood | Domain vocabulary, language quality, or cost becomes a blocker | Changing embedding model versions without a rebuild plan |
| Dense vector DB | Run approximate vector search | Qdrant, Pinecone, Weaviate, Milvus, pgvector, Elasticsearch vector search | Small to medium systems can start with pgvector or Qdrant; use Pinecone for managed needs | Data volume, filter latency, HA, or multi-tenant isolation becomes a bottleneck | Choosing from benchmarks without testing your own filters and payloads |
| Sparse / BM25 / keyword index | Catch exact terms, product names, IDs, and keyword-heavy queries | Elasticsearch, OpenSearch, Postgres full-text, Meilisearch, BM25 retriever | Start with Postgres FTS or Elasticsearch/OpenSearch | Synonyms, weighting, or Chinese tokenization needs tuning | Assuming dense vector search replaces keyword search |
| Metadata filter index | Make tenant, source type, date, doc id, and other filters fast | DB indexes, Qdrant payload indexes, Elasticsearch filters, Postgres indexes | Index high-frequency filter fields early | Filter latency dominates query time | Writing metadata but not indexing it |

---

## B. Query planning and retrieval

This is the query side. Naive RAG usually does only top-k vector search; production RAG first identifies query shape and then chooses the right retrieval path.

| Step | Problem solved | Common tools | My starting choice | Switch when | Common trap |
|---|---|---|---|---|---|
| Query classification | Identify fact lookup, comparison, summary, troubleshooting, creative, or agentic queries | small LLM classifier, rules, LlamaIndex router, custom intent classifier | Start with rules plus a small LLM | Modes grow and misclassification becomes costly | Making classes too granular to debug |
| Query rewrite | Turn a conversational query into a retrieval-friendly query | LlamaIndex query transform, LangChain query rewriting, custom prompt | Use conservative rewrite and keep the original query | Users rely on abbreviations, typos, or cross-lingual wording | Rewriting so aggressively that user intent changes |
| Query decomposition | Split compound questions into sub-questions | LlamaIndex sub-question query engine, LangChain decomposition, custom planner | Enable only for comparison or multi-hop queries | Sub-questions require different sources or retrieval modes | Decomposing every query and exploding latency |
| Routing | Choose the index, tool, or mode for this query | LlamaIndex RouterQueryEngine, LangGraph, custom router | Start with a few fixed modes: fast, safe, deep_eval, creative, agentic | More sources, workflows, or tool calls are required | Router decisions are not traced, so failures are opaque |
| Hybrid search | Combine dense vector, BM25, and metadata filters | Qdrant hybrid, Weaviate hybrid, Elasticsearch, LlamaIndex fusion retriever | Start with dense + BM25 + metadata filter, merged by RRF | Exact terms, product names, or IDs frequently miss | Dense and sparse scores are not calibrated |
| Reranking | Reorder candidate chunks to improve precision | Cohere Rerank, bge-reranker, Jina reranker, Voyage rerank, cross-encoder | Validate with a hosted reranker before self-hosting | Results exist but top-k ordering is noisy | Reranking too many candidates and inflating latency |

---

## C. Context and answer generation

This layer decides whether the model sees fragments, noise, or an answerable evidence pack.

| Step | Problem solved | Common tools | My starting choice | Switch when | Common trap |
|---|---|---|---|---|---|
| Parent-doc expansion | Pull back parent sections or documents when top chunks are too fragmented | LlamaIndex recursive retriever, parent-child mapping, custom docstore | Start with section-level parent expansion | Answers need surrounding context, clauses, flows, or adjacent sections | Looking only at chunk scores and ignoring parent-level continuity |
| Context compression | Remove query-irrelevant text to reduce tokens and noise | LlamaIndex compressor, LangChain contextual compression, reranker-based filtering | Start with reranker or sentence-level compression | Parent expansion makes context too long | Compression deletes text needed for citation |
| Citation assembly | Bind answer claims to source, page, section, and chunk id | LlamaIndex citation query engine, custom citation mapper, source span mapping | I prefer a custom citation mapper with source paths preserved | Compliance, internal review, or support workflows need claim-level review | Showing a source list without claim-to-source mapping |
| Response synthesis | Turn the evidence pack into a final answer | LlamaIndex response synthesizer, LangChain chains, custom prompt, OpenAI structured outputs | Start with a fixed answer contract: answer, sources, confidence, warnings | Different tones, schemas, or multi-step answers are required | Asking the model to answer from context without an output contract |

---

## D. Evaluation and observability

This is the boundary between demo RAG and production RAG. Without eval and tracing, you are tuning by taste.

| Step | Problem solved | Common tools | My starting choice | Switch when | Common trap |
|---|---|---|---|---|---|
| Faithfulness check | Check whether the answer is supported by retrieved context | RAGAS, DeepEval, TruLens, LLM judge, custom rules | Start with lightweight app-layer checks, then add RAGAS / DeepEval | High-risk settings need multiple judges and human audit sampling | Judging whether the answer sounds good, not whether it is grounded |
| Citation check | Check whether citations actually support claims | DeepEval citation metric, RAGAS context metrics, custom citation verifier | Start with a custom citation verifier | Citation is part of the product or compliance promise | Citation format exists, but sources do not support the answer |
| Offline eval | Compare changes against a fixed dataset | RAGAS, DeepEval, promptfoo, OpenAI Evals, custom golden set | Start with a 30-100 question golden set | Query types, versions, and regressions multiply | No train / eval split; only testing favourite examples |
| Tracing / observability | See what each query did, what it cost, and where it failed | Langfuse, LangSmith, Arize Phoenix, OpenTelemetry, Helicone | Start with Langfuse or Phoenix plus cost, latency, and mode tags | Multiple services, agents, or models enter the system | Logging only the final answer, not candidates or rerank scores |

---

## E. Application and infrastructure

This layer is rarely the focus of RAG tutorials, but it decides whether the system can actually be used.

| Step | Problem solved | Common tools | My starting choice | Switch when | Common trap |
|---|---|---|---|---|---|
| Backend | Provide API, auth, rate limits, and request schema | FastAPI, Next.js API routes, NestJS, Express, Django | For a Python RAG stack, start with FastAPI | A full-stack repo, edge functions, or enterprise framework constraints dominate | The notebook works but there is no stable API contract |
| App DB | Store users, conversations, feedback, job status, and config | Postgres, Supabase, Neon, PlanetScale, MongoDB | Start with Postgres / Supabase | Document-shaped state or existing database constraints dominate | Putting application state into the vector DB |
| Raw storage | Store original files, converted files, images, and OCR results | S3, Cloudflare R2, GCS, Azure Blob, local disk | Start with S3/R2-style object storage | Compliance, region, or enterprise cloud constraints dominate | Storing only parsed output and losing the source file |
| Deployment | Ship the service with rollback and scaling | Docker, Fly.io, Render, Railway, Vercel, Cloud Run, Kubernetes | Start with Docker plus a managed platform for small APIs | GPU, self-hosted reranking, private networking, or HA is required | Indexing jobs and query API share one fragile process |
| Workflow / batch | Run ingestion, reindexing, eval, reports, and schedules | Celery, RQ, Temporal, Airflow, Dagster, GitHub Actions, cron | Start with GitHub Actions, cron, or RQ | Dependencies, retries, and audit requirements become serious | Manual reindexing with no job id, retry, or failure log |

---

## My default starting stack

If I were starting from zero and wanted a production-capable small to medium RAG system, I would begin here:

| Layer | Initial choice |
|---|---|
| Parsing | LlamaParse or Docling, depending on PDF complexity |
| Chunking | Markdown / heading-aware chunking plus parent-child mapping |
| Metadata / ACL | Postgres for permissions and parent mapping; sync required fields into retrieval metadata |
| Embedding | Hosted embedding first, then evaluate self-hosting after quality and cost are clear |
| Vector DB | Qdrant or pgvector |
| Keyword | Postgres FTS or Elasticsearch / OpenSearch |
| Retrieval | Hybrid + metadata filter + RRF |
| Rerank | Hosted reranker first to validate quality |
| Context | Parent expansion + compression |
| Citation | Custom citation mapper |
| Eval | Custom lightweight checks + RAGAS / DeepEval offline eval |
| Tracing | Langfuse or Phoenix |
| Backend | FastAPI |
| App DB | Postgres / Supabase |
| Storage | S3 / R2 |
| Workflow | Start with cron / GitHub Actions / RQ; move to Temporal when workflows become complex |

This is not the only correct stack, but it has one advantage: every layer can be replaced independently. The real danger in Production RAG is not picking an unfashionable tool. It is coupling every layer so tightly that any single failure forces a rewrite of the whole system.

---

## When not to add another tool

If you do not yet have:

- a fixed eval set
- query traces
- source id / parent id / chunk id
- retrieval candidate logs
- cost / latency dashboards
- a before-and-after comparison method for every change

then do not rush into GraphRAG, agents, multi-vector retrieval, long-context, or knowledge graphs.

Not because those patterns are bad. Because without instrumentation, you cannot tell whether they improved anything. Tool upgrades without eval often make errors more expensive, slower, and harder to debug.

---

## The real job of this tool index

The point of this appendix is not to memorise tool names. It is to turn RAG back into engineering problems.

When the answer is wrong, do not ask only whether you need a stronger model. Ask:

- Did the data enter the system?
- Did the parser break tables or sections?
- Is chunking too fragmented?
- Are metadata and ACL fields filterable?
- Did dense search miss an exact term?
- Did BM25 find the right thing but reranking bury it?
- Is the context too long or too short?
- Are citations bound to claims?
- Does eval even measure this failure mode?

Once you can answer those questions, you are ready to talk about tool selection.

Production RAG is not one tool. It is an observable, replaceable, evaluable engineering chain.