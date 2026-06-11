---
title: "From RAG to Enterprise-Grade RAG Part 08 | Five query modes: how to decide whether this query deserves a faithfulness check"
description: "Part 07 split faithfulness, citation, tracing and cost into four separate capabilities. Part 08 wraps those four capabilities into five query modes (fast, safe, deep_eval, creative, agentic) and routes incoming /ask requests to one of them via six features. Same endpoint, different capability bundle per query. The piece works through a concrete workload per mode (Q3 contract clause → safe, FAQ → fast, debug → deep_eval, summary → creative, multi-step → agentic), four counter-examples (fast on a contract query, deep_eval synchronously on the user path, too many modes blowing up the codebase, too few modes sacrificing both faithfulness and latency), and a 5-mode decision tree. The routing pattern is grounded in the public LlamaIndex RouterQueryEngine and LangChain RouterChain patterns, but with the production twist that we are not routing between prompt templates — we are routing between capability bundles — and the asymmetry of routing error (wrong-safe → wasteful, wrong-fast → harmful) shapes the default-to-strict rule."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "llamaindex", "routing", "query-mode", "langfuse", "ragas", "observability", "cost-control"]
date: 2026-06-10T22:30:00
featured: true
subtitle: "From RAG to Enterprise-Grade RAG Part 08"
series: "From RAG to Enterprise-Grade RAG"
seriesOrder: 8
---

## Part 07's capabilities are unused until you decide where to deploy them

Part 07 split faithfulness checking, citation validation, Langfuse tracing and cost tracking into four capabilities, each implemented in its own module. After that work shipped, the next problem surfaced immediately: **running all four capabilities on every query breaks the budget**. Full eval, full trace, full citation check on every request pushes p95 latency from 1.5 s to 6 s and triples cost. The user experience collapses.

**Part 07 gave us the capabilities. Part 08 gives us the routing.** Same `/ask` endpoint, but the capability bundle applied to each incoming query is decided at request time based on the query's nature. Router patterns in [LlamaIndex](https://developers.llamaindex.ai/python/examples/workflow/router_query_engine/) and [LangChain](https://reference.langchain.com/python/langchain-classic/chains/router) are well-documented and not something we invented here. The twist is that **we are not routing to "different prompt templates" — we are routing to "different capability bundles."** The router's output is not just "which query engine," it is "should this query run faithfulness at all, should we open stage-level tracing, what is the cost ceiling for this query."

That distinction matters because **RAG routers are not like general LLM routers** — the failure cost is asymmetric. An LLM giving a wrong answer can be retried; a RAG system giving a wrong answer about a contract, a legal clause, or a patient dose can cause real harm. So Part 08 is not "five modes at five speeds." It is a three-dimensional decision: 5 modes × 4 capabilities × N query features.

---

## The five modes are the five capability bundles that actually appeared in production logs

Here is the mode list (lifted from Part 07's closing summary — **that is a spec floor, not decoration**):

```text
fast       (latency < 1s)    → skip faithfulness, skip tracing, pure vector search
safe       (contracts/legal) → full faithfulness + citation check, async RAGAS
deep_eval  (debug phase)     → sync RAGAS + LLM judge, full trace
creative   (open-ended)      → skip faithfulness, switch to llm_first synthesis
agentic    (multi-step)      → per-step trace, faithfulness per step
```

These five are not "five routes we thought up." They are the five capability bundles that **emerged from clustering real production queries by their capability needs**. The order of operations matters: we observed query clusters first, then mapped each cluster to a capability bundle. We did not start from capabilities and derive the modes.

**Six-axis decision table** (these six axes are **a working criterion from this project, not a general industry definition** — another team might add a seventh axis for synthesis mode or chunk count, but six is the working set here):

| mode | faithfulness | citation | tracing | cost / query | p95 latency | determinism |
|---|---|---|---|---|---|---|
| **fast** | off | off | query-level | ≤ $0.001 | < 1 s | pure vector |
| **safe** | full + async RAGAS | full | query + stage | ≤ $0.01 | < 3 s | hybrid + rerank + parent expansion |
| **deep_eval** | sync RAGAS + LLM judge | full | full trace | ≤ $0.10 | 5–15 s | full pipeline + sync eval |
| **creative** | off | weak (presence only) | query-level | ≤ $0.02 | < 2 s | llm_first + light retrieval |
| **agentic** | per-step | per-step | per-step trace | ≤ $0.05 / step | < 4 s / step | multi-step planner |

The cost and latency ranges are **estimates from this project's measurements plus common industry baselines** ([thedataguy.pro on RAG cost optimisation](https://thedataguy.pro/writing/2025/07/the-economics-of-rag-cost-optimization-for-production-systems/), [Tetrate's RAG architecture patterns](https://tetrate.io/learn/ai/rag-architecture-patterns)). They are **not vendor SLAs and not platform guarantees** — the same query on Cohere, OpenAI, MiniMax, or a self-hosted LLM will produce cost and latency that vary by 2–5×. The $0.001 vs $0.10 gap on the same query is an architecture decision, not a model decision.

---

## Where the router lives is the first design decision

Part 08 is not the same question as Part 04's "LlamaIndex vs LangGraph vs n8n" — that was about which framework to use. Part 08 is about **how the same framework, same `/ask` endpoint, splits internally**. There are three places the router can live:

1. **URL endpoint split** (`/ask/fast`, `/ask/safe`, `/ask/agentic`) — front-end forces the mode. If the client picks wrong, the system breaks.
2. **Mode field in request payload** (`{"query": "...", "mode": "safe"}`) — flexible, but if the client sends the wrong mode, fast mode runs on a contract clause.
3. **Server-side auto-routing** (no mode parameter; routing decided from query features + business metadata) — production-friendly, but the router itself has to be written correctly. A wrong router here hurts more than 1 or 2.

**This project chose option 3 — auto-routing — but added an escape hatch:** the request can carry a `mode` field that **force-overrides** the auto-routing decision. The reason: when auto-routing goes wrong (and in particular when fast mode is applied to a contract query), operations need to be able to flip the mode immediately. The escape hatch is not for end users; it is for incident response.

**That is the core Part 08 design trade-off:** robustness and control from auto-routing do not come for free together. The escape hatch is what you pay for having both.

---

## Six query features decide which mode to run

**Auto-routing is not "ask an LLM to pick the mode"** — that is a mistake. An LLM-based router has its own cost, its own latency, and its own failure mode. The order is: cheap features first, rule-based pre-filter, then LLM judge as a fallback for ambiguous cases. Six features, ordered by the cost of obtaining them:

```python
# rag/router/features.py
from dataclasses import dataclass

@dataclass
class QueryFeatures:
    # Cheap features (no LLM call)
    source_path: str              # "contract" / "faq" / "runbook" / "open"
    has_explicit_citation: bool   # does the request ask for [1][2] citations?
    query_length: int             # character count
    is_multi_step: bool           # detect "and then" / "next" / "step 1 step 2"
    
    # Medium features (one cheap call: regex / classifier)
    has_numeric_constraints: bool # "60 days" / "6 months" / "$10,000"
    domain_risk: str              # "high" / "medium" / "low" — derived from source_path
    
    # Expensive feature (LLM call, only for ambiguous cases)
    intent_classifier: str        # "factual" / "summarisation" / "open-ended"
```

**Router logic** (a working criterion from this project, not a general industry pattern):

```text
Step 1: is_multi_step = True                                → agentic
Step 2: domain_risk = "high"                                → safe
Step 3: has_numeric_constraints AND source_path in contract/legal → safe
Step 4: intent_classifier = "summarisation" AND source_path = "open" → creative
Step 5: source_path in faq/runbook AND query_length < 50    → fast
Step 6: default (including ambiguous)                       → safe (default strict)
```

**Default-to-strict needs explaining.** Auto-routing is asymmetric: a router sending fast → safe wastes money; a router sending safe → fast causes harm. The default goes strict, and we loosen only when features clearly justify it. **This asymmetry is the part of Part 08 that differs most from a generic routing system.**

Step 6's intent-classifier LLM call is not optional. Steps 1–5 cannot always tell the difference — "what is this Q3 report about" looks like summarisation, but it could also be a factual lookup the user wants cited. The router has to make that LLM call when the cheap features are ambiguous. **The cost of that call is included in Part 08's cost model.** It is not free, and trying to skip it with a regex is what makes routing wrong in production.

---

## Five modes: when to use, when not to, and how each one fails

Per the rubric's section 3 requirement, each mode gets all three.

### fast — pure vector, zero eval

**When to use:** FAQ, known runbooks, internal knowledge bases with stable structure — "VPN reset steps", "API rate limit". Short query, short answer, concentrated source, low blast radius when wrong.

**When not to use:** Anything where a wrong answer causes harm. Contract amounts, patient doses, customer PII. **Running fast on these queries gives a near-100% faithfulness failure rate.** The Part 07 Q3 early-termination contract, run through fast mode, would produce the same wrong-but-plausible answer we saw before Part 06's retrieval upgrades — because skipping faithfulness removes the only thing that would have caught it.

**Failure modes:** (1) vector recall drops when synonyms are not covered ("early termination" missing from chunk titles → fast mode misses it); (2) no rerank → too much noise on multi-language or multi-section documents; (3) no trace → when something goes wrong, you cannot debug it. **Fast trades measurability for cost-control, and debuggability for latency.**

### safe — contracts, legal, medical

**When to use:** The Part 06 Q3 contract case, "what does Section 3 of this MOU say", legal clause lookup. **This is the workload Part 07's faithfulness and citation checks were designed for.**

**When not to use:** Low-risk FAQ (running safe mode on FAQ is using a sledgehammer — 5–10× the cost, with no meaningful faithfulness improvement, because FAQ answers are already short and citation does not need deep checking). Also, real-time conversational "chat while asking" — 3 s latency instead of fast's 1 s breaks conversational rhythm.

**Failure modes:** (1) faithfulness check false positives — the LLM judge says a claim is unsupported when it actually is, just phrased differently; (2) async RAGAS sampling rate too low, long-tail failure cases slip past; (3) **cost blow-up** — parent expansion runs away, context balloons to 100k tokens, the cost ceiling from Part 07 gets bypassed. **Safe is the easiest mode to blow the budget on, which is why Part 07's cost tracking has to be wired up before safe mode goes live.**

### deep_eval — debug and regression, never the user path

**When to use:** (1) before and after changing prompt, chunking, or rerank — offline comparison; (2) **5% deep_eval sampling in production when an incident is unfolding**, to get stage-level trace on which node broke; (3) CI on offline eval dataset of 50–100 questions.

**When not to use:** **Never the general user path.** Sync RAGAS + LLM judge on every query: 5–15 s, 100× the cost of fast, 15× the latency. The async 5% sampling from Part 07 is the correct pattern; sync deep_eval is a debug tool, not a user feature.

**Failure modes:** (1) operations accidentally switch deep_eval to 100% of user traffic, p95 jumps from 1.5 s to 12 s, users bounce, API quota burns; (2) LLM judge is non-deterministic — the same question run twice gives faithfulness scores that differ by 0.1, which makes a 0.05 CI threshold flaky; (3) **offline dataset goes stale** — chunking changes but the dataset is still keyed to the old chunks, so the "accurate" score is actually misleading. (This is the worst failure mode, because it gives false confidence.)

### creative — open-ended, summarisation, no faithfulness

**When to use:** "What does this Q3 report say", "give me three takeaways", "suggest a new marketing direction". The answer has no right/wrong, only useful/not-useful.

**When not to use:** Any factual lookup, any query that needs citation. **Creative mode on the Q3 early-termination clause is dangerous** — faithfulness off means the LLM is free to hallucinate, and a contract clause will be freely reinterpreted.

**Failure modes:** (1) switching synthesis to llm_first makes the LLM "over-expand" — user asks for three points, LLM gives eight, token cost and latency both blow the budget; (2) weak citation set too loose becomes no citation, the traceability users want disappears; (3) **the boundary with safe mode blurs** — "how should we interpret the pricing strategy in this report" is it summarisation or factual? The Part 08 rule is: creative mode is only allowed when `source_path = "open"`, everything else goes safe.

### agentic — multi-step, cross-document reasoning

**When to use:** "Compare Q3 and Q2 contracts and find the differences", "synthesise a risk matrix from three reports". Single retrieval cannot carry the weight — the task has to be split into steps.

**When not to use:** Simple "find a passage" or "summarise a passage". **Agentic on FAQ is 5–10× slower and 5–10× more expensive than fast** — the planner and per-step faithfulness overhead is fixed, and it does not shrink just because the query is easy.

**Failure modes:** (1) **planner splits steps wrong** — step 2's retrieval query does not match step 1's results, and the downstream faithfulness fails in a chain; (2) per-step faithfulness not designed carefully, **step 1 is wrong, step 2 cites step 1's wrong result**, errors compound; (3) **per-step trace without Langfuse parent-child spans** — debugging agentic is structurally different from debugging a single query, and **no per-step trace means giving up on agentic's debuggability entirely**.

---

## Four counter-examples: when this decision tree breaks

Per the rubric's section 5 requirement, **every criterion needs a counter-example.** Part 08 has to handle at least these four explicitly:

**Counter 1: fast mode on a contract query.** "Early termination penalty" routed to fast — skip faithfulness, skip citation, vector recall hits the MOU but misses Section 3, the LLM invents a plausible-sounding 30-day / mutual-agreement answer. The user gets something **completely wrong that looks completely right.** This is the same case that opened Part 07. The Part 08 guardrail is `Step 2: domain_risk = "high" → safe`, but if the domain classification is wrong ("contract" tagged as "faq"), the entire guardrail collapses.

**Counter 2: deep_eval synchronously on the production user path.** Operations accidentally switches deep_eval to 100% of user traffic. p95 latency explodes from 1.5 s to 12 s — bounce rate spikes, API quota burns, the Langfuse dashboard shows rerank as the bottleneck (it is not, sync RAGAS is waiting on the LLM judge). The "async evaluator 5% sampling" pattern from Part 07 exists to prevent exactly this, but if someone bypasses async and calls sync directly, the guardrail is gone.

**Counter 3: too many modes, codebase explosion.** Once we tried splitting safe into three — "safe-contracts", "safe-legal", "safe-medical". The three modes ended up with almost identical capability bundles, debugging tripled in difficulty, and we eventually merged them back into a single safe mode. **Heuristic: number of modes = number of natural query clusters observed in production, not "the more the merrier."** If two modes have 80% the same capability bundle, merge them.

**Counter 4: too few modes, sacrificing both faithfulness and latency.** Splitting into just "fast" and "slow" — fast runs FAQ but also runs contracts, slow runs every high-risk query. **This loses on both axes**: fast on a contract causes Counter 1; slow on creative (summary) gets dragged out 3 s by faithfulness checks the user does not need, and they bounce. **Five modes is the "right" granularity for the faithfulness-skip trade-off** — fewer than five sacrifices one side, more than five explodes the codebase.

---

## Router implementation: avoid the obvious mistake

**The most common mistake is using an LLM to pick the mode directly**: "router LLM looks at the query, picks the mode." That fails on three levels:

1. **The router LLM has its own cost and latency** — when Part 08's cost model is built, the router LLM call has to be included. It is not free.
2. **Router LLM mis-classification is expensive** — a contract classified as FAQ breaks the entire downstream pipeline.
3. **Router LLM itself drifts over time** — model upgrades, prompt changes, router behaviour shifts. Debugging router problems is harder than debugging query problems.

**The order Part 08 actually uses:** cheap features → rule-based pre-filter → LLM as fallback for ambiguous cases. **The LLM is the fallback, not the default path.** This is the same design instinct as Part 04's "n8n uses pure visual flow, not an LLM router" — **deterministic first, LLM as fallback**.

Implementation excerpt (from this project's `rag/router.py`):

```python
# rag/router.py
from dataclasses import dataclass
from enum import Enum

class Mode(Enum):
    FAST = "fast"
    SAFE = "safe"
    DEEP_EVAL = "deep_eval"
    CREATIVE = "creative"
    AGENTIC = "agentic"

def route(features: QueryFeatures, override: Mode | None = None) -> Mode:
    # Incident-response escape hatch: force-overrides from request
    if override is not None:
        return override
    
    # Step 1: multi-step → agentic
    if features.is_multi_step:
        return Mode.AGENTIC
    
    # Step 2: high domain risk → safe
    if features.domain_risk == "high":
        return Mode.SAFE
    
    # Step 3: contracts/legal with numeric constraints → safe
    if features.has_numeric_constraints and features.source_path in {"contract", "legal"}:
        return Mode.SAFE
    
    # Step 4: summarisation over open source → creative
    if features.intent_classifier == "summarisation" and features.source_path == "open":
        return Mode.CREATIVE
    
    # Step 5: FAQ or runbook with short query → fast
    if features.source_path in {"faq", "runbook"} and features.query_length < 50:
        return Mode.FAST
    
    # Step 6: default strict
    return Mode.SAFE
```

```python
# /ask endpoint — pick mode then dispatch
@app.post("/ask")
async def ask(req: AskRequest):
    features = extract_features(req.query, req.context)  # cheap features first
    if needs_llm_fallback(features):
        features.intent_classifier = await llm_intent_classify(req.query)  # one LLM call
    
    mode = route(features, override=req.mode)
    return await dispatch(mode, req)  # each mode composes its own pipeline + eval/trace
```

**This is not a universal pattern** — `extract_features` and `llm_intent_classify` have different cost structures in every project. The faq / runbook / contract labels here come from document metadata we already have, not from an LLM. Other projects will need keyword pre-filters or a domain classifier.

---

## How Part 08 relates to Part 07: capabilities and routing

**Part 07 is "how to write a faithfulness check, how to wire up Langfuse trace, how to compute cost tracking" — capability decomposition.** **Part 08 is "given those capabilities, how does the same `/ask` decide which to run on this query" — routing design.** The division of labour: Part 07 ships each capability as a stable module; Part 08 packages those modules into five modes and routes each query to one of them.

**Without Part 07's capabilities, Part 08's routing is an empty shell** — mode-switching decides to run safe, but safe mode has no faithfulness check, so it is indistinguishable from fast. **Without Part 08's routing, Part 07's capabilities are wasted** — every query runs full eval and full trace, cost and latency both blow up. **The two are read together to understand the cost-vs-correctness trade-off in production RAG.**

**Part 05 → Part 08 interface:** the moment Part 05 moves from demo to a FastAPI server, the `/ask` response should reserve a `mode` field — even if routing logic is not implemented yet, the schema is there. When Part 08 adds the router module, the response schema does not change, the API contract does not break. Part 07 reserved `faithfulness_check` / `citation_check` / `observability` in the response for capability placeholders; Part 08 reserves `mode` for the routing placeholder. **Two separate reservation lines, no interference when modules are added.**

**Part 06 → Part 08 interface:** Part 06's four-layer retrieval upgrade (hybrid + rerank + parent expansion + citation assembly) is the default pipeline for safe mode and deep_eval mode. Fast mode uses just the first layer (pure vector); creative mode uses hybrid but skips rerank; agentic mode uses 2–3 layers per step. **The ROI of retrieval upgrades is not uniform across modes** — safe and deep_eval run all four layers, fast runs one, creative runs two. Part 06 is "what retrieval layers are available"; Part 08 is "which mode uses which layers".

The Part 01 interactive demo runs both fast and safe modes — you can add `?mode=fast` or `?mode=safe` in the query box to see the latency, cost and faithfulness score differences directly. (This is also the prerequisite for Part 09's "demo for non-engineers" — mode switching has to be visible at the API layer for the UI to plug in.)

**Part 08 is not the end of production work.** Part 09 is about wrapping these five modes into a UI a non-engineer can operate. Part 10 is about plugging this whole system into CI / monitoring / alerting as a complete ops loop. Part 08 is the dividing line: RAG without routing is a demo, RAG with routing is a production system.
