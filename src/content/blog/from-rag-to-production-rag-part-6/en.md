---
title: "From RAG to Enterprise-Grade RAG Part 06 | Why Retrieval Decides RAG Quality More Than the Model Does"
description: "Vector search finds semantic neighbours, not answers. This piece starts from a concrete failure case and turns the retrieval layer into an enhancement pipeline: hybrid retrieval improves recall, reranking improves precision, parent expansion + compression improve answerability, and citation assembly improves explainability. It also adds when to use Long-context Hybrid and how to think about the quality / latency / cost trade-off."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "retrieval", "hybrid-search", "reranking", "citation"]
date: 2026-06-10T18:30:00
featured: true
subtitle: "From RAG to Enterprise-Grade RAG Part 06"
series: "From RAG to Enterprise-Grade RAG"
seriesOrder: 6
---

## A concrete failure case

There was a query early in this project that the system kept getting wrong:

> "How does the early termination clause in this Q3 contract work, and what is the penalty?"

Vector search found the **right file** — `mou_2025_003.pdf` was in the top three. But the LLM answered: early termination takes 30 days written notice, penalty is whatever the two parties agree.

The contract actually says it clearly: early termination needs 60 days notice and the penalty is 6 months of subscription fees. **The file was found, the answer was still wrong.**

Why? Walking the trace showed that vector search pulled in the "scope of collaboration" and "payment terms" sections of the MOU — both in the top five — but the LLM never saw **the third section**, which is the one that explicitly covers early termination and the penalty. Why not? Because the dense embedding of "early termination penalty" was closer to the embedding of the "scope of collaboration" paragraph than to the dense embedding of that third section.

Put differently: a dense vector captures "semantic similarity", not "the ability to actually answer this question". Close in vector space ≠ the paragraph can answer the query. **Vector search does not know whether a passage answers the question; it only computes similarity** — and that gap is a common root cause of naive RAG failure.

**This is the ceiling of pure vector search: it finds "related" documents, but not necessarily the "right" passage.**


> **Tested API-shape note:** the snippets in this article show the implementation shape used by this project, not a permanent SDK contract. Pin your Python packages, keep a minimal smoke test for each snippet, and re-check LlamaIndex / Qdrant / FastAPI / evaluation-framework docs when upgrading.

---

## "Found it" and "answered it well" are two different things

**Vector search finds semantic neighbours, not actually answerable content.**

Naive RAG collapses the two into one step: pull the top 5, feed them to the LLM. In production that assumption often breaks — you either get "semantically near but unable to answer" or "the answer is in there but the vector is too far to be retrieved".

**The retrieval layer often sets the practical ceiling on answer quality.** If retrieval feeds the LLM the wrong passage, even a stronger model is constrained by the wrong evidence. Model upgrades help less when the relevant passage never enters the context.

In this project, roughly 70% of the engineering effort went into the retrieval layer (hybrid search, reranking, parent expansion, context compression, citation assembly). The LLM side was closer to 30%.

---

## Four retrieval upgrades this project added

Pure vector search was not enough for this project. With the **four upgrades** below, the early-termination query above became answerable.

![Retrieval Enhancement Pipeline](/images/from-rag-to-production-rag-part-6/part-06-retrieval-enhancement-pipeline.png)

The order matters: improve recall first, then use a reranker to improve precision, use parent expansion and compression to make the evidence answerable, and finally use citation assembly to make every important claim traceable. This is not a pile of extra features. It is the path from “find something similar” to “find the right evidence, rank it, make it answerable, and show where it came from.”

![Four retrieval upgrades and the jobs they do](/images/from-rag-to-production-rag-part-6/part-06-four-retrieval-upgrades.png)

### Upgrade 1: hybrid retrieval (dense + BM25 + metadata)

Dense vectors catch semantics, BM25 catches exact strings, metadata filters narrow the scope. All three run together, then RRF (Reciprocal Rank Fusion) merges the rankings.

Creating the hybrid collection (Qdrant named vectors):

```python
from qdrant_client import QdrantClient
from qdrant_client.http import models

def create_hybrid_collection(client: QdrantClient, name: str) -> None:
    client.create_collection(
        collection_name=name,
        vectors_config={
            "dense": models.VectorParams(size=384, distance=models.Distance.COSINE),
        },
        sparse_vectors_config={
            "sparse": models.SparseVectorParams(index=models.SparseIndexParams()),
        },
    )
```

Query side via the LlamaIndex Qdrant integration:

```python
from llama_index.vector_stores.qdrant import QdrantVectorStore

def get_hybrid_store(client: QdrantClient, name: str) -> QdrantVectorStore:
    return QdrantVectorStore(
        client=client,
        collection_name=name,
        enable_hybrid=True,                # dense + sparse built together
        fastembed_sparse_model="Qdrant/bm25",
        hybrid_fusion_fn="rrf",            # Reciprocal Rank Fusion
        # plus metadata filters: document_type, language, tenant_id
    )
```

**Why BM25 matters.** The same query, asked different ways:

| Query | Dense vector | BM25 |
|---|---|---|
| "How does early termination work in this Q3 contract" | medium (semantically near) | strong (hits `early termination`) |
| `GET /users/me/profile` | weak (pure string) | strong (exact match) |
| `INV-2025-003` | weak | strong |
| "What is the procedure to terminate the contract" | strong | weak (does not hit "terminate") |

Dense is strong where BM25 is weak, and BM25 is strong where dense is weak. **Production retrieval is rarely either/or.** In this project, many dense-only failures came from missing exact-string clauses that should have been retrieved.

**The Chinese + BM25 trap.** A lot of BM25 setups default to English tokenisation, and Chinese needs explicit verification. The LlamaIndex Qdrant hybrid integration uses the `Qdrant/bm25` model through FastEmbed. The first check below only verifies that FastEmbed produces a non-empty sparse vector for the mixed Chinese / English query. It does **not** prove that Jieba is being used inside `Qdrant/bm25`.

```python
from fastembed import SparseTextEmbedding

# Qdrant/FastEmbed sparse-vector sanity check.
# This verifies sparse output exists; it does not configure a custom tokenizer.
sparse_model = SparseTextEmbedding(model_name="Qdrant/bm25")

query = "early termination 違約金"
sparse_vec = list(sparse_model.embed([query]))[0]
non_zero = len(sparse_vec.values)
assert non_zero > 0, f"Qdrant/bm25 produced an empty sparse vector: {non_zero}"
```

If you want to test Chinese tokenisation itself, use a local BM25 check where the tokenizer is actually passed into the index:

```python
import jieba
from rank_bm25 import BM25Okapi

def chinese_tokenize(text: str) -> list[str]:
    return [t for t in jieba.cut(text) if t.strip()]

documents = [
    "提前終止需要 60 天書面通知，違約金為 6 個月訂閱費。",
    "付款條款為每月結算，發票到期日為 30 天。",
    "合作範圍包含資料串接與系統維運。",
]
tokenized_docs = [chinese_tokenize(doc) for doc in documents]
bm25 = BM25Okapi(tokenized_docs)

query_tokens = chinese_tokenize("提前終止 違約金")
scores = bm25.get_scores(query_tokens)
assert scores.argmax() == 0
```

**Do not assume "hybrid" automatically solves Chinese retrieval.** Verify sparse-vector output and, separately, verify the Chinese tokenisation strategy you actually use. The first test checks Qdrant/FastEmbed sparse behaviour; the second test checks Jieba tokenisation in a local BM25 index.

### Upgrade 2: reranking (coarse-to-fine)

Hybrid search pulls 50–200 candidates, the reranker uses a cross-encoder to re-score them, and the genuinely useful 5–20 float to the top.

A full query engine pipeline (hybrid + rerank + LongContextReorder + compression):

```python
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.postprocessor import LongContextReorder
from llama_index.postprocessor.cohere_rerank import CohereRerank
from llama_index.core.response_synthesizers import CompactAndRefine

postprocessors = [
    LongContextReorder(),    # put the most relevant chunks at the edges
    CohereRerank(top_n=8, model="rerank-english-v3.0"),
]

query_engine = RetrieverQueryEngine.from_args(
    retriever=retriever,
    node_postprocessors=postprocessors,
    response_synthesizer=CompactAndRefine(),
)
```

**Why rerank on top of hybrid?** RRF after hybrid is a coarse merge — it fuses multiple ranked lists, but the reranker's cross-encoder (query, candidate) comparison is **substantially more accurate than pure vector comparison**. Measured in this project: hybrid + rerank together outperformed either layer alone by roughly 20-30%.

Mainstream options: Cohere Rerank (managed, ready in minutes), BGE reranker (self-hosted, cost under control), Jina / Voyage (multilingual or retrieval-heavy). Qdrant also has ColBERT / multivector options, but those are advanced — start with an external reranker.

### Upgrade 3: parent-doc expansion + context compression

Small chunks are easy to search, large parents are good for answering. **First use small chunks to locate, then pull the parent section back in.**

```python
from llama_index.core.schema import TextNode

async def expand_to_parent(node: TextNode, docstore) -> TextNode:
    """Swap a small retrieved chunk for its parent section."""
    parent_id = node.metadata.get("parent_id")
    if not parent_id:
        return node
    parent = await docstore.aget(parent_id)
    return parent or node
```

Compression filters out sentences that are not relevant to the query. **Why it matters**: cheaper tokens, less noise, fewer hallucinated citations — the benefit is most obvious when the underlying chunks are large.

### One more pattern: Long-context Hybrid

Long-context Hybrid does not mean stuffing every document into the context window. That just renames the retrieval problem as a token problem.

A better definition is: **retrieve first, then smarter-pack a small set of highly relevant parent documents.** It usually lives between parent expansion and context compression: hybrid + rerank finds candidates, parent expansion pulls back the sections or documents most likely to answer, and compression, ordering, and budget guards decide what actually enters the prompt.

When is ordinary top-k retrieval enough?

- The question needs one or two clear evidence snippets
- The answer is concentrated in one section
- The user needs precise citation more than broad synthesis
- Latency or token budget is tight

When does Long-context Hybrid make sense?

- Top-k chunks are too fragmented to answer well
- The question needs several sections from the same document
- The document has important sequence, such as contracts, policies, specs, or research reports
- You need surrounding context to prevent out-of-context answers

A practical decision rule: **if the reranked top chunks come from the same document, adjacent sections, and each has a strong score, do not send only top-k chunks. Pull the parent document or parent section, then compress.** That is cheaper than full-document stuffing and more stable than fragmented top-k.

### Upgrade 4: citation assembly (custom citation mapper)

Bind every answer back to a source. **This is not just showing "source [1]" to the user — it is what lets you verify what the LLM actually answered against.**

```python
from pydantic import BaseModel, Field
from typing import Optional

class CitationItem(BaseModel):
    marker: str = Field(..., description="Inline marker like [1]")
    file_name: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    node_id: str
    text_preview: str
    retrieval_score: float = 0.0

def map_citations(response) -> list[CitationItem]:
    """Turn response.source_nodes into a frontend-ready citation list."""
    return [
        CitationItem(
            marker=f"[{i+1}]",
            file_name=node.metadata.get("file_name", "unknown"),
            page_number=node.metadata.get("page_number"),
            section_title=node.metadata.get("section_title"),
            node_id=node.node_id,
            text_preview=node.get_content()[:200],
            retrieval_score=float(node.score or 0),
        )
        for i, node in enumerate(response.source_nodes)
    ]
```

**Why not just use LlamaIndex's built-in `CitationQueryEngine`?** This project's context runs through Qdrant → reranker → parent expansion → compression → LongContextReorder → custom prompt before the LLM ever sees it. The actual sources that reach the prompt do not line up with `response.source_nodes`, and the built-in citation engine's marker regex breaks after long-context reorder and marker substitution. That counter-example is a real one, not a theoretical risk. **For this pipeline, a custom citation mapper was the more reliable production choice.**

---

## The specific trade-offs

More is not always better. **Each layer has a cost** — the numbers below are labeled by source: **Measured in this project** means observed in this implementation, **Starting heuristic** means a planning default to validate in your own workload, and **External benchmark / price** means provider pricing or commonly cited industry baselines rather than vendor guarantees.

| Upgrade | Quality impact | Cost impact | Explainability impact |
|---|---|---|---|
| Hybrid retrieval | Measured in this project: retrieval recall +20-30% | Starting heuristic: storage about 2x (dense + sparse vectors); measured in this project: query latency +50-100ms; Chinese needs extra tokenisation verification | medium (RRF merge is simple) |
| Reranking | Measured in this project: top-k ordering accuracy +25-35% | External price / benchmark: Cohere Rerank $0.001-0.005 / query (per 1000 tokens); self-hosted BGE reranker adds GPU cost; measured in this project: latency +200-500ms | low (cross-encoder is a black box) |
| Parent expansion | Measured in this project: answer completeness up; LLM citation-hallucination rate down | Starting heuristic: token cost 5-10x (chunk grows from 100 chars to 1000); measured in this project: latency +100-300ms | **high** (traceable to section) |
| Long-context Hybrid | cross-section answerability up; out-of-context quoting down | Token cost sits between top-k and full-document stuffing; needs budget guard / ordering | high (keeps parent doc and section path) |
| Context compression | Measured in this project: noise down; hallucinated citations down | External price / benchmark: small extra reranker call ($0.0001 / query); measured in this project: latency +50-150ms | medium (depends on compressor logic) |
| Citation assembly | Measured in this project: answers become verifiable | Measured in this project: low cost (pure mapping); latency +10-50ms | **highest** (direct link to source) |

**Budget-constrained ordering**: hybrid retrieval first (finding anything is baseline) → citation assembly next (cheapest, highest explainability) → reranking after that (clear quality lift, but it costs) → parent expansion / Long-context Hybrid last (depends on token budget and query shape).

**One more thing to keep in mind**: upgrading the LLM has diminishing returns on answer quality, while every retrieval layer still has visible marginal upside. **Once the LLM is already strong enough for the task, another model upgrade may produce less answer-quality lift than adding a rerank layer** — when the budget is tight, retrieval improvements often deserve priority over model upgrades.

That is also why this project has run the same LLM settings from V0 through V3, and swapped out the retrieval layer four times — retrieval is where the gap opens up, and LLM upgrades are not where the budget should go next.

---

The interactive demo in Part 01 runs exactly this project's production pipeline — you can take that early-termination query straight to the article page and watch the trace flow. Part 07 breaks down "the gap between production and demo" — faithfulness check, citation check, offline eval, Langfuse tracing, cost tracking. After the four retrieval upgrades in this piece, **how do you actually measure how much they improve answer quality** is the question Part 07 is built around. `rag/retrieval.py`, `rag/compression.py` and `rag/citations.py` are where these four upgrades live in the code.
