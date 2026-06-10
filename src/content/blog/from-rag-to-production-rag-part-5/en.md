---
title: "From RAG to Enterprise-Grade RAG Part 05 | From Minimum-Viable RAG to an Extensible Project Skeleton"
description: "This project did not start out looking like this — it began as a 30-line app.py printing answers in a local terminal, and it took three weeks to grow into 5 files plus a FastAPI server. This piece walks through those three weeks: when to stay at the minimum version, when to push forward, and which abstractions to leave for later."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "fastapi", "learning-path"]
date: 2026-06-10T16:30:00
featured: true
subtitle: "From RAG to Enterprise-Grade RAG Part 05"
series: "From RAG to Enterprise-Grade RAG"
seriesOrder: 5
---

This project did not start out looking like this.

It began as a 30-line `app.py` printing answers in a local terminal. It took three weeks to grow into five files plus a FastAPI server — and every step landed on a concrete "stuck" signal.

What this piece walks through: those three weeks — when to stop at the minimum version, when to push forward, which abstractions to leave for later.

---

## 1. The three things to do first

Not writing code. **Deciding the project structure first.**

First: pick a home for the project. An LLM program is not a SaaS product — it is a library you run on your machine, in Docker, or on a VPS. Once the project path is fixed, the `.env`, `.git` and venv all grow around that directory.

Second: stand up a Python virtual environment. `python3 -m venv .venv` then `source .venv/bin/activate`. This step is **not boilerplate you can skip** — by the third week, when you have installed `llama-index`, a HuggingFace embedding, FastAPI and a Qdrant client, package versions will start fighting each other and you will be deleting `__pycache__` directories trying to fix it.

Third: write `.gitignore` correctly. `.env` (the API key), `.venv/` (the virtual environment) and `__pycache__/` (the compiled cache) **must not be committed**. Skip this on the first commit and the day the PR review lands, you will see the API key sitting in the GitHub commit history. By then you are rotating keys, scrubbing git history and cleaning up every fork's local clone — **that whole cleanup arc is a week-long nightmare**.

The concrete five steps look like this:

```bash
# Step 1: create the project directory and enter it
mkdir llamaindex-lab && cd llamaindex-lab

# Step 2: stand up the Python virtual environment and activate it
python3 -m venv .venv
source .venv/bin/activate
# Windows: .venv\Scripts\activate

# Step 3: install packages
pip install llama-index python-dotenv

# Step 4: create the directory structure and the .env file
mkdir data
touch .env
echo "MINIMAX_API_KEY=sk-xxxxxxxx" > .env

# Step 5: write .gitignore (do not commit API key, venv or cache)
cat > .gitignore << 'EOF'
.env
.venv/
__pycache__/
*.pyc
data/.ipynb_checkpoints/
EOF
```

None of these five steps is writing code. **Skip them and you will be backfilling for the next 30 days.**

---

## 2. The five files a minimum RAG needs

The first lesson's only goal: get RAG running.

```text
llamaindex-lab/
├── data/
│   └── notes.txt          ← one example document
├── app.py                  ← the main script
├── .env                    ← the API key
├── .venv/                  ← the Python virtual environment
└── .gitignore              ← keep env vars and cache out of git
```

A complete `app.py` (with LLM and embedding settings):

```python
import os
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.llms.openai_like import OpenAILike
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

load_dotenv()

# LLM settings (OpenAI-compatible endpoint pointing at MiniMax-M2.7)
Settings.llm = OpenAILike(
    model="MiniMax-M2.7",
    api_key=os.getenv("MINIMAX_API_KEY"),
    api_base="https://api.minimax.io/v1",
    is_chat_model=True,
    context_window=128000,
)

# Embedding settings (local HuggingFace BGE, sidesteps OpenAI dimension mismatch)
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5",
    cache_folder="./.cache/huggingface",
)

# Load documents → build index → build query engine
documents = SimpleDirectoryReader("data").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()

response = query_engine.query("Your question")
print(response)
```

When it runs, `app.py` is roughly 25 lines including blank lines.

The script does four things:

- `SimpleDirectoryReader("data").load_data()`: read everything in `data/` into a list of LlamaIndex `Document`
- `VectorStoreIndex.from_documents(documents)`: chunk the documents, embed them, build a local vector index
- `index.as_query_engine()`: produce a query engine you can throw questions at
- `query_engine.query(...)`: run retrieval, then feed the results to the LLM for the final answer

**Why set the LLM and the embedding separately?** RAG needs two different models: the LLM generates the final answer, the embedding model converts text to vectors for semantic search. OpenAI's `text-embedding-3-small` and MiniMax's chat model do not share an embedding dimension, so mixing them silently breaks retrieval. **The least-buggy pairing is LLM on MiniMax, embeddings on a local BGE.**

Once `app.py` runs, you will start to see what comes next: metadata, hybrid search, reranking, citation, ACL — none of that surfaces before the minimum version actually runs.

---

## 3. The six core objects — once you know these, you are not "running a sample" anymore

The second session of this project breaks `app.py` into **six core objects**:

```text
Document     = container for raw data after it enters the system
Node         = a chunk that came from slicing a Document
Index        = Nodes turned into a searchable vector store
Retriever    = pulls relevant Nodes out of the Index
Query Engine = Retriever + LLM, in charge of producing the answer
Response     = the final answer the Query Engine emits (may carry citations / sources)
```

Calling each of these objects out individually is how you see the RAG engine's gears turning:

```python
from llama_index.core import Settings

# 1. Document
documents = SimpleDirectoryReader("data").load_data()
print(f"loaded {len(documents)} documents")

# 2. Node (Document sliced into chunks)
nodes = Settings.node_parser.get_nodes_from_documents(documents)
print(f"sliced into {len(nodes)} chunks")

# 3. Index
index = VectorStoreIndex(nodes, embed_model=Settings.embed_model)

# 4. Retriever (pulls relevant Nodes out of the Index)
retriever = index.as_retriever(similarity_top_k=5)
hits = retriever.retrieve("Was the early-MVP stage free of charge?")
for i, hit in enumerate(hits, 1):
    print(f"[{i}] score={hit.score:.4f} | {hit.node.metadata.get('file_name', '?')}")

# 5. Query Engine (Retriever + LLM chained together)
query_engine = index.as_query_engine(similarity_top_k=5)

# 6. Response
response = query_engine.query("Was the early-MVP stage free of charge?")
print(f"\nanswer: {response}")
print(f"source nodes: {len(response.source_nodes)}")
```

After running this you will see: the retriever pulls 5 chunks (each with a score), the query engine feeds those 5 chunks to the LLM for the answer, and the **Response object also carries a `source_nodes` attribute** — that is where citations come from.

The retrieval engineering Part 06 will break down, and the citation assembly Part 07 will break down, are both layers built on top of these six objects. **Once you have them, the other nine pieces read much more easily.**

But these six objects **do not have to click immediately**. Get `app.py` running first, then come back to the six objects with context. **Run first, understand second.** Get that order right and the learning curve is three times easier.

---

## 4. The abstractions worth saving for later

Not everything has to be learned on day one. **These three abstractions** are the ones newcomers reach for, get stuck, and give up on:

1. **LlamaCloud / LlamaParse** — the official cloud platform, doing PDF parsing and managed ingestion under the hood. **Do not touch this on day one.** Get comfortable running LlamaIndex on your own machine first; once you understand how the RAG layer grows from the bottom up, then decide whether cloud acceleration is worth it.
2. **Qdrant / a proper vector database** — the minimum version uses `VectorStoreIndex` (in-memory) and that is enough. A few hundred documents fit comfortably; switch to Qdrant when document count climbs into the thousands, ACL starts to matter, and you need to share the index across processes.
3. **Agentic RAG / LangGraph / LlamaIndex Workflows** — these are advanced RAG features (query planning, tool routing, reflect / refine / retry loops). **Get RAG working first, then add agentic.** Stacking agents at the start is like hiring a crowd of interns to run around the library — lively, but not actually more accurate.

The reverse curriculum: a **six-step learning order** (compiled from the source library) — fix one step at a time, no skipping:

```text
1. metadata chunking        ← attach metadata to each chunk
2. hybrid search            ← dense + BM25
3. reranking                ← coarse retrieval → refined ranking
4. parent-doc expansion     ← small chunk for location, large parent for context
5. eval                     ← faithfulness / citation / regression
6. agentic RAG              ← only then add query planning
```

The order is **foundation first, walls later**. Skip a step and the price is debugging later without knowing which layer is on fire.

---

## 5. Three signals that say it is time to move from demo to backend API

After `app.py` runs, **for a while** you will stay in the terminal asking questions. Three signals tell you it is time to push forward.

**Signal 1: you want to use curl / Postman to test.**  
Every time you tweak a prompt, you have to run `python app.py` by hand, change the question, print the answer — at that point **it is time to wrap the RAG in an HTTP API**. FastAPI is not hard: one `@app.post("/ask")` route, one `rag_engine.ask(question)` call, JSON response. **Thirty minutes from demo to server.**

Once it is running, hit it with curl:

```bash
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Your question"}'

# Response
{
  "question": "Your question",
  "answer": "...",
  "sources": [
    {
      "file_name": "notes.txt",
      "score": 0.59,
      "node_id": "612cd2ee-..."
    }
  ]
}
```

**Signal 2: you want to quantify "did this query go right".**  
In the demo phase you only care whether the answer is right. But the moment a single query can produce different answers with different prompts, different chunking or different embeddings, the questions start: "which version is better?" "which retrieval did this query walk through?" "is reranking lined up?" "what was the latency?" "how many tokens did it cost?" **The terminal cannot answer these.** They need a tracing framework (Langfuse and the like) and an eval dataset to measure against. The server is the entry point for observability — without a server, you cannot measure anything.

Hook Langfuse into LlamaIndex's callback manager:

```python
from llama_index.core import Settings
from llama_index.core.callbacks import CallbackManager
from langfuse.llama_index import LlamaIndexCallbackHandler

langfuse_callback_handler = LlamaIndexCallbackHandler(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host="https://cloud.langfuse.com",
)
Settings.callback_manager = CallbackManager([langfuse_callback_handler])
```

After this every query leaves a complete trace on the Langfuse dashboard: retrieved chunks, rerank scores, LLM prompt and response, token count, latency. **This is the entry point for Part 07.**

**Signal 3: you want to demo the RAG to a colleague or a client.**  
`python app.py` only you can run. `curl` requires you to remember the command. `Postman` requires installing the app. To hand the RAG to someone who is not an engineer, **the shortest path is to give them a URL**. Once FastAPI is up, `http://127.0.0.1:8000/docs` serves an auto-generated API document that anyone with a client can try.

The three signals **do not necessarily appear at the same time**. The first is the most common; the second and third tend to surface a week or two later.

---

## 6. Step three: wrap the RAG in FastAPI

When signal 1 appears, do lesson three.

```text
from:                                to:
Terminal input                     HTTP request
    ↓                                  ↓
app.py                            FastAPI route: POST /ask
    ↓                                  ↓
RAG answer                        rag_engine.ask(question)
                                       ↓
                                   LlamaIndex query_engine
                                       ↓
                                   LLM answer
                                       ↓
                                   JSON response
```

First, `rag_engine.py` to wrap the LlamaIndex query logic in a class:

```python
# rag_engine.py
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings


class RAGEngine:
    def __init__(self, data_dir: str = "data"):
        documents = SimpleDirectoryReader(data_dir).load_data()
        self.index = VectorStoreIndex.from_documents(documents)
        self.query_engine = self.index.as_query_engine(
            similarity_top_k=5,
            response_mode="compact",
        )

    def ask(self, question: str) -> dict:
        response = self.query_engine.query(question)
        return {
            "question": question,
            "answer": str(response),
            "sources": [
                {
                    "file_name": node.metadata.get("file_name"),
                    "score": float(node.score or 0),
                    "node_id": node.node_id,
                    "text_preview": node.get_content()[:200],
                }
                for node in response.source_nodes
            ],
        }


# module-level singleton (so the index is not rebuilt per request)
rag_engine = RAGEngine()
```

Then `server.py` to wire the RAG engine into FastAPI:

```python
# server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from rag_engine import rag_engine


app = FastAPI(
    title="LlamaIndex RAG API",
    description="Production-style RAG built on LlamaIndex",
    version="0.1.0",
)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class SourceItem(BaseModel):
    file_name: str
    score: float
    node_id: str
    text_preview: str


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceItem]


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest):
    try:
        result = rag_engine.ask(req.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
```

Start it and test:

```bash
# install FastAPI dependencies
pip install fastapi uvicorn pydantic

# start the server (--reload auto-restarts on code change)
uvicorn server:app --reload --host 127.0.0.1 --port 8000

# in another terminal
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "..."}'

# open the auto-generated API docs
open http://127.0.0.1:8000/docs
```

Once it is running, the architecture looks like this:

```text
Browser / curl / n8n / frontend
        ↓
FastAPI server (127.0.0.1:8000)
        ↓
rag_engine.ask(question)
        ↓
LlamaIndex query_engine
        ↓
embedding model + VectorStoreIndex
        ↓
LLM
```

**This is still local** — 127.0.0.1, only running on your own machine, not in the cloud. But from this shape, **every production-grade capability now has a place to hang** — though which capability goes where, and when, is worth thinking about before bolting it on.

Step three is not "turn the RAG into production". It is "**turn the RAG from a demo into a shape that production parts can hang on**".

The path from here is not a single line:

- **Signal 1 appears (you want to quantify query correctness) → Part 07**: measurable, debuggable, controllable — faithfulness check, citation check, offline eval, Langfuse tracing, cost tracking, deterministic-first. Part 07 does not do auth, does not do permissions — **purely evaluation and observability**.
- **Signal 3 appears (you want to demo to a non-engineer) → Part 09**: permission-aware retrieval, document ACL, document APIs, citation source viewer. Part 09 is "who is allowed to ask, and which documents are they allowed to reach".
- **Anytime you want → Part 06**: retrieval engineering — hybrid search, reranking, parent-doc expansion, context compression. **A server makes debugging easier**, but these are not triggered by a signal — you reach for them when "the answer quality should be better".

The n8n tool division Part 04 talked about is also part of this path — n8n goes its own way, with ingestion and webhook picked up in Part 09 and Part 10. How n8n connects to FastAPI, how it consumes eval results — that gets broken down later.

---

The interactive demo in Part 01 runs exactly this project's production pipeline — go to the article page and ask it anything to see the trace flow. Part 06 will start breaking down retrieval engineering — how hybrid search, reranking, and parent-doc expansion hang on this skeleton, how the answer quality moves from "runs" to "actually useful". `rag/retrieval.py`, `rag/compression.py` and `rag/citations.py` get their proper breakdown in Part 06.
