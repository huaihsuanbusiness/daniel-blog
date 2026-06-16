---
title: "從 RAG 到企業級 RAG Part 05 | 從最小可用 RAG 到可持續擴充的專案骨架"
description: "這個專案不是一開始就長這樣的——一開始是 30 行的 app.py 在本機 terminal 印答案，演進到 5 個檔案 + FastAPI server 中間走了 3 個禮拜。這篇寫的是那 3 個禮拜怎麼走過來的：什麼時候該停在最小版、什麼時候該往前推、哪些抽象晚一點再碰。"
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "fastapi", "learning-path"]
date: 2026-06-10T16:30:00
featured: true
subtitle: "從 RAG 到企業級 RAG Part 05"
series: "從 RAG 到企業級 RAG"
seriesOrder: 5
---

這個專案不是一開始就長這樣的。

一開始是 30 行的 `app.py`，本機 terminal 印答案。演進到現在 5 個檔案 + FastAPI server，**中間走了 3 個禮拜**——每一步都踩在具體的「卡住」訊號上。

這篇寫的是那 3 個禮拜怎麼走過來的：什麼時候該停在最小版、什麼時候該往前推、哪些抽象晚一點再碰。


> **Tested API shape 提醒**：本文程式片段示範的是這個專案採用的實作形狀，不是永久不變的 SDK contract。請 pin Python 套件版本，替每段關鍵 snippet 保留最小 smoke test，升級 LlamaIndex / Qdrant / FastAPI / eval framework 前先對照官方文件。

---

## 一、從 0 開始，我會先做這 3 件事

不是寫 code，是**先想清楚專案結構**。

第一件事：決定專案放哪。LLM 程式不是 SaaS 產品，是你在本機 / Docker / VPS 跑的 library。專案路徑一旦定下來，之後的 `.env`、`.git`、venv 全部圍著這個資料夾長。

第二件事：建 Python 虛擬環境。`python3 -m venv .venv` 然後 `source .venv/bin/activate`。這一步是為了不污染全域 Python，**不是可以跳過的 boilerplate**——後面裝 `llama-index`、HuggingFace embedding、FastAPI、Qdrant client，每個套件版本可能互打架，沒 venv 到第三個禮拜你會開始刪 `__pycache__` 砍問題。

第三件事：把 `.gitignore` 寫對。`.env`（API key）、`.venv/`（虛擬環境）、`__pycache__/`（編譯快取）這三個**不能 commit**。第一次 commit 不處理，等到 PR review 那天，會看到 API key 躺在 GitHub commit history 裡——這時候要 rotate key、scrub git history、清掉所有 fork 出來的 local clone，**整套清理流程你會想做一週噩夢**。

具體 Step 1-5 跑一遍長這樣：

```bash
# Step 1: 建專案資料夾 + 進去
mkdir llamaindex-lab && cd llamaindex-lab

# Step 2: 建 Python 虛擬環境 + 啟用
python3 -m venv .venv
source .venv/bin/activate
# Windows: .venv\Scripts\activate

# Step 3: 裝套件
pip install llama-index python-dotenv

# Step 4: 建資料夾結構 + .env
mkdir data
touch .env
echo "MINIMAX_API_KEY=sk-xxxxxxxx" > .env

# Step 5: 寫 .gitignore（不要 commit API key、venv、cache）
cat > .gitignore << 'EOF'
.env
.venv/
__pycache__/
*.pyc
data/.ipynb_checkpoints/
EOF
```

這 5 步**都不是寫 code**，但**不做，後面 30 天你會一直回頭補**。

---

## 二、最小 RAG 必備的 5 個檔案結構

第一課的目標只有一個：讓 RAG 跑起來。

```text
llamaindex-lab/
├── data/
│   └── notes.txt          ← 一份範例文件
├── app.py                  ← 主程式
├── .env                    ← API key
├── .venv/                  ← Python 虛擬環境
└── .gitignore              ← 環境變數、cache 不要 commit
```

`app.py` 完整版（包含 LLM 跟 embedding 設定）：

```python
import os
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.llms.openai_like import OpenAILike
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

load_dotenv()

# LLM 設定（用 OpenAI-compatible endpoint 走 MiniMax-M2.7）
Settings.llm = OpenAILike(
    model="MiniMax-M2.7",
    api_key=os.getenv("MINIMAX_API_KEY"),
    api_base="https://api.minimax.io/v1",
    is_chat_model=True,
    context_window=128000,
)

# Embedding 設定（本地 HuggingFace BGE，不用 OpenAI 維度對齊問題）
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5",
    cache_folder="./.cache/huggingface",
)

# 載入文件 → 建 index → 建 query engine
documents = SimpleDirectoryReader("data").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()

response = query_engine.query("你的問題")
print(response)
```

跑得起來的話，`app.py` 大約 25 行（含空行）。

這段程式做了 4 件事：

- `SimpleDirectoryReader("data").load_data()`：讀 `data/` 裡的檔案，變成 LlamaIndex 的 Document
- `VectorStoreIndex.from_documents(documents)`：把 Document 切 chunk、轉 embedding、建立本地 vector index
- `index.as_query_engine()`：建一個可以問問題的 query engine
- `query_engine.query(...)`：retrieval + LLM 生成答案

**為什麼 LLM 跟 embedding 分開設？** 因為 RAG 需要兩種模型：LLM 負責生成答案，embedding model 負責把文字轉向量做語意搜尋。OpenAI 的 text-embedding-3-small 跟 MiniMax 的 chat model 維度不同，混用會對不上——所以**LLM 走 MiniMax，embedding 走本地 BGE** 是最不踩雷的組合。

這個 `app.py` 跑得起來之後，你才會知道後面要加什麼：metadata、hybrid search、rerank、citation、ACL——這些都是從「跑得起來」之後才會浮現的需求。

---

## 三、6 個核心物件，搞懂你就不是在「跑範例」

第二課把 `app.py` 拆開，**6 個核心物件**：

```text
Document     = 原始資料進來後的容器
Node         = Document 被切開後的 chunk
Index        = 把 Node 建成可搜尋的 vector store
Retriever    = 從 Index 撈相關 Node
Query Engine = Retriever + LLM 串起來，負責生答案
Response     = Query Engine 吐出的最終答案（可能含 citation / source）
```

把這 6 個物件**各自拉出來呼叫**，你才看得到 RAG 引擎每個齒輪怎麼咬：

```python
from llama_index.core import Settings

# 1. Document
documents = SimpleDirectoryReader("data").load_data()
print(f"載入 {len(documents)} 份文件")

# 2. Node（Document 被切開的 chunk）
nodes = Settings.node_parser.get_nodes_from_documents(documents)
print(f"切成 {len(nodes)} 個 chunk")

# 3. Index
index = VectorStoreIndex(nodes, embed_model=Settings.embed_model)

# 4. Retriever（從 Index 撈相關 Node）
retriever = index.as_retriever(similarity_top_k=5)
hits = retriever.retrieve("早期 MVP 階段是否收費？")
for i, hit in enumerate(hits, 1):
    print(f"[{i}] score={hit.score:.4f} | {hit.node.metadata.get('file_name', '?')}")

# 5. Query Engine（Retriever + LLM 串起來）
query_engine = index.as_query_engine(similarity_top_k=5)

# 6. Response
response = query_engine.query("早期 MVP 階段是否收費？")
print(f"\n答案：{response}")
print(f"來源 nodes：{len(response.source_nodes)} 個")
```

跑這段你會看到：retriever 撈 5 個 chunk（每個有 score），query engine 把這 5 個 chunk 餵給 LLM，**Response 物件帶 `source_nodes` 屬性**——citation 從這裡來。

後面 Part 06 要拆的 retrieval engineering 跟 Part 07 要拆的 citation assembly，都是在這 6 個物件上面加層。**搞懂這 6 個，後面 9 篇文章會順很多**。

但這 6 個物件**不一定要馬上懂**。一開始先讓 `app.py` 跑起來，之後回頭看這 6 個物件才會有 context。**先跑、後懂**，順序對了，學習效率差 3 倍。

---

## 四、哪些抽象晚一點學比較划算

不是所有東西都要一開始就學。**這 3 個抽象**新手最常見一開始就碰，結果卡關卡到放棄：

1. **LlamaCloud / LlamaParse** — 這是官方雲端平台，PDF 解析、managed ingestion 都是它在處理。**新手不要一開始就碰**。先學會本機跑 LlamaIndex framework，等你知道「底層 RAG 怎麼長出來」之後，再決定要不要用雲端加速。
2. **Qdrant / 正式 vector DB** — 最小版本用 `VectorStoreIndex`（本機記憶體）就夠。文件量幾百份以下、用本機 index 跑得動。文件量到幾千、ACL 開始重要、跨 process 共用 index 的時候再換 Qdrant。
3. **Agentic RAG / LangGraph / LlamaIndex Workflows** — 這是 RAG 進階版（query planning、tool routing、reflect/refine/retry loop）。**先把 RAG 走通，再加 agentic**。一開始堆 agent 就像請一群實習生在圖書館跑步，熱鬧但沒比較準。

反面教材：**6 步學習順序**（從素材庫整理出來）—— 一個一個補、不跳級：

```text
1. metadata chunking        ← chunk 上面掛 metadata
2. hybrid search            ← dense + BM25
3. reranking                ← 粗找 → 精排
4. parent-doc expansion     ← 小 chunk 找位置，大 parent 組裝
5. eval                     ← faithfulness / citation / regression
6. agentic RAG              ← 最後才加 query planning
```

這順序是**地基先打、牆面再漆**的順序。跳級的代價是「後面 debug 的時候不知道哪一層在出錯」。

---

## 五、3 個訊號代表你該從 demo 走向 backend API

`app.py` 跑起來之後，**一段時間**你會停留在 terminal 問問題。但有 3 個訊號告訴你「該往前推了」。

**訊號 1：你想用 curl / Postman 測了。**  
每次改 prompt 都要手動跑 `python app.py` 改問題、印答案——這時候**就該把 RAG 包成 HTTP API**。FastAPI 寫起來不難：`@app.post("/ask")` 一個 route、`rag_engine.ask(question)` 一次呼叫、JSON response。**30 分鐘從 demo 走到 server**。

跑起來之後用 curl 試：

```bash
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "你的問題"}'

# Response
{
  "question": "你的問題",
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

**訊號 2：你想量化「這個 query 走對了沒」。**  
demo 階段你只在意答案對不對。但當同一個 query 換不同 prompt、不同 chunking、不同 embedding 都可能跑出不同答案時，你會開始想：「哪個版本比較好？」「這個 query 走了哪些 retrieval？rerank 排得對不對？latency 多少？token 花了多少？」**這些問題 terminal 答不出來**——需要 trace 框架（Langfuse 之類）跟 eval dataset 來量。Server 是 observability 的入口，沒有 server 就沒辦法量。

Langfuse 接到 LlamaIndex 的 callback manager：

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

裝上後每次 query 都會在 Langfuse dashboard 留下完整 trace：retrieved chunks、rerank scores、LLM prompt 跟 response、token 數、latency。**這是 Part 07 的入口**。

**訊號 3：你想把 RAG 給同事 / 客戶 demo。**  
`python app.py` 只能你自己跑、`curl` 還得記指令、`Postman` 還得裝——要把 RAG 拿給不是工程師的人看，**最直接是給他一個 URL**。FastAPI 跑起來後 `http://127.0.0.1:8000/docs` 有自動生成的 API 文件，任何人只要裝好 client 就能試。

這 3 個訊號**不一定同時出現**。第一個最常見，第二個、第三個通常 1-2 週後才會浮現。

---

## 六、第三課：把 RAG 包成 FastAPI

訊號 1 出現時，做第三課。

```text
從：                                到：
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

先建 `rag_engine.py`，把 LlamaIndex 的查詢邏輯包成 class：

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


# module-level singleton（避免每個 request 都重新建 index）
rag_engine = RAGEngine()
```

再建 `server.py` 把 RAG engine 接到 FastAPI：

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

啟動跟測試：

```bash
# 裝 FastAPI 相依
pip install fastapi uvicorn pydantic

# 啟動 server（--reload 讓改 code 自動重啟）
uvicorn server:app --reload --host 127.0.0.1 --port 8000

# 另一個 terminal 測
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "..."}'

# 開瀏覽器看自動 API 文件
open http://127.0.0.1:8000/docs
```

跑得起來後，整個架構變成：

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

**這還是本機**——127.0.0.1，只在你自己的電腦跑，沒上雲。但從這個結構開始，**所有 production 級的能力都有地方掛了**——但每一個能力歸哪一篇、什麼時候加，要先想清楚。

第三課不是「把 RAG 變 production」，是「**把 RAG 從 demo 變成可以接 production 零件的形狀**」。

往後的路徑不是一條：

- **訊號 1 出現（想量化 query 對錯）→ Part 07**：可量測、可除錯、可控——faithfulness check、citation check、offline eval、Langfuse tracing、cost tracking、deterministic-first。Part 07 不做 auth、不做權限，**純評估跟觀測**。
- **訊號 3 出現（想給非工程師 demo）→ Part 09**：permission-aware retrieval、文件 ACL、document APIs、citation source viewer。Part 09 處理「誰能問、能問到哪些文件」。
- **任何時候都可以做 → Part 06**：retrieval engineering——hybrid search、reranking、parent-doc expansion、context compression。**有 server 才好 debug**，但這些不是訊號觸發。

Part 04 講的 n8n 工具分工也接在這條路徑上——n8n 走另一條路，Part 09 跟 Part 10 才接 ingestion 跟 webhook。

---

Part 01 的互動 demo 跑的就是這個專案的 production pipeline——想看真實 query 怎麼走，可以直接去文章頁面問。Part 06 會拆 retrieval engineering——hybrid search、rerank、parent-doc expansion 怎麼掛在這個骨架上、怎麼讓答案品質從「跑得起來」變成「真的能用」。`rag/retrieval.py`、`rag/compression.py`、`rag/citations.py` 這幾個模組在 Part 06 才正式展開。
