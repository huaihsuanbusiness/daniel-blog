---
title: "RAG Engineering in Practice 07 – How My Job Agent Turns JDs, CVs, and Rubrics into a Working Evidence Pipeline"
description: "If the first six articles in this series were mostly about sharpening concepts, setting boundaries, and clearing technical debris off the road, this one is about putting those ideas back into a real workflow and seeing how they actually hold together."
categories: ["ai"]
tags: ["ai", "rag", "retrieval", "qdrant", "vector-database", "evaluation"]
date: 2026-04-04T01:29:00
featured: false
---

If the first six articles in this series were mostly about sharpening concepts, setting boundaries, and clearing technical debris off the road, this one is about putting those ideas back into a real workflow and seeing how they actually hold together.

This is not meant to be a full tutorial on how to clone my job agent from scratch.  
It is better thought of as a case study that answers questions like:

- why did I end up treating the JD, the CV, and the rubric as three different kinds of data?
- why should the CV be chunked finely while the rubric should not be chopped too aggressively?
- why can’t fields like `source_type` and `memory_set` just sit in payload as decorative metadata?
- why does the evidence pack need to be kept deliberately lean?
- why do some issues that look like model failures turn out to be retrieval-boundary problems instead?

If you have read the earlier pieces, this is the point where those rules stop sounding theoretical and start looking like practical ways of preventing very ordinary system failures. fileciteturn15file0turn15file3turn15file4

## The core claim

If I had to start with one line, it would be this:

> What made this job agent more stable was never a magical model or a single clever tool. It was turning the JD, the CV, and the rubric into a retrieval system with a usable evidence pipeline.

The most important phrase there is not “agent”. It is **evidence pipeline**.

Because once the system actually runs for a while, many of the problems that appear to be model problems turn out to be something else entirely: the evidence is shaped wrongly, assembled in the wrong order, mixed across roles, or simply too bloated for the model to use cleanly. fileciteturn15file0turn15file4

## If you treat it as “just give the JD and CV to the model”, you hit a wall quite quickly

The first naive version of this workflow is easy to imagine:

1. pass the full JD  
2. pass the full CV  
3. add some rubric or scoring instructions  
4. ask the model to score, justify, and perhaps draft a cover letter

That is not completely useless.  
For small documents, simple jobs, and one-off tasks, it may even look acceptable at first.

But once you try to turn it into a repeatable workflow, the weaknesses start surfacing:

- the CV is too long, so the model grabs the wrong details
- a hard gate in the rubric gets overlooked
- the same JD gets a slightly different score on different days
- the relevance rationale begins smuggling in narrative that was not really grounded in the JD
- the evidence pack gets fatter and fatter until you hit token ceilings or `MAX_TOKENS` trouble fileciteturn15file0turn15file4

At that point, this no longer feels like a prompt-tuning issue. It starts to look like what it really is:

**the evidence units, data roles, and retrieval boundaries were never properly designed in the first place.**

## In this system, the JD, the CV, and the rubric are not the same kind of data

At first it is easy to think, “they are all just text, so surely I can embed them, index them, and retrieve them in roughly the same way.”  
In practice, that turns out to be a poor mental model. These three sources do different jobs inside the system.

### The JD: task context and factual requirements
The JD acts as the task frame. It tells the system:

- what the job is looking for
- what kinds of deliverables matter
- which requirements are explicit
- which constraints are non-negotiable

In many cases, the JD does not even need to be chunked immediately. Passing the full text first is often the steadier move, because the model needs the overall shape of the role rather than one isolated bullet point. fileciteturn15file4

### The CV: an evidence pool
The CV is not the rulebook, and it is not the task definition.  
It is an evidence pool from which the system needs to pull the most relevant experience for the JD at hand.

That is why fat CV chunks are so dangerous.  
If one chunk contains too many unrelated signals, then a single match on AI or growth language may bring back an oversized block, and the model may start dragging unrelated material into the reasoning. fileciteturn15file0

### The rubric: a rule system
The rubric is closer to a rulebook.

Its job is not to inspire the model. Its job is to constrain the scoring logic, preserve output shape, and keep important gates from drifting out of view.

That is why it should not be sliced like a CV.  
You want rule groups that are self-contained. Otherwise top-1 or top-2 retrieval may bring back half a rule and leave the rest behind. fileciteturn15file0

## Chunking did not just change retrieval. It changed downstream output stability.

### Why the CV needs finer cuts
Because the task is not “summarise this person”.

It is more like:

- which parts of this CV support this JD?
- which bullets are the best evidence for a given requirement?
- which angle is strongest for the final writing step?

That is an evidence-mapping problem, not a document-summary problem. So the CV benefits from being split by evidence-bearing themes or retrievable signals. fileciteturn15file0turn15file4

### Why the rubric should not be too fragmented
If the rubric becomes too fragmented, retrieval may pull criteria without gates, format without constraints, or only half the scoring frame.

The resulting instability is especially annoying because it often does not look like a dramatic failure. The system simply becomes a little more inconsistent over time, which is far harder to spot and far more corrosive. fileciteturn15file0

## The evidence pack has to be kept deliberately lean

Many people react to unstable outputs by adding more evidence:

- more chunks
- higher top-k
- extra profile context
- more rules

But the evidence pack is not better simply because it is bigger.  
A bloated pack does not necessarily make the answer more grounded. Often it just makes the model noisier and more expensive. fileciteturn15file0turn15file4

In this workflow, a more practical recipe looked roughly like:

- rubric: topK = 2
- profile: topK = 1
- CV: topK = 2 to 3
- JD: pass full text first, revisit JD chunk retrieval later if needed

That is useful not because those numbers are sacred, but because they force one important discipline:

> evidence-pack design is part of retrieval design, not an afterthought. fileciteturn15file0turn15file4

## Why `source_type` and `memory_set` cannot remain decorative payload fields

As soon as the system starts storing several kinds of data in the same collection, metadata stops being decorative.

Fields such as:

- `source_type`
- `memory_set`
- `rubric_id`
- `profile_id`
- `job_id`

may look boring, but they define the retrieval boundaries.  
If those fields are not treated as proper query dimensions, retrieval starts to become semantically plausible but structurally muddy. fileciteturn15file1turn15file2

This is why I ended up thinking about payload indexes as schema migration rather than as some annoying Qdrant requirement. The system is not just doing vector similarity. It is doing vector similarity plus structured boundaries plus role-aware evidence lanes. That means schema has entered the picture whether you like it or not. fileciteturn15file1

## Many things that look like model hallucination are really retrieval-boundary failures

This case also forces a useful habit: learning to ask whether the real failure happened in **R** or in **G**.

A weak relevance rationale may look like a model problem.  
But once you inspect the evidence pack, you often find something else:

- the right CV chunk never made it into retrieval
- the chunk that came back was too fat
- the rubric came back only partially
- `source_type` boundaries leaked
- top-k was high enough for noise to drown the evidence that actually mattered fileciteturn15file0turn15file4

At that point, the model is not really improvising from nowhere. It is often just explaining a messy context with alarming fluency.

## The system became more stable not because it became more complex, but because the boundaries became clearer

The things that helped most were roughly these:

1. separating the roles of JD, CV, and rubric  
2. using different chunking logic for CV and rubric  
3. keeping the evidence pack deliberately lean  
4. using fields like `source_type` and `memory_set` as real boundaries  
5. adopting the habit of inspecting evidence before blaming the model  
6. treating output stability as a retrieval-design concern rather than a lucky prompt side effect

## When the lessons from this case do not generalise cleanly

Not every RAG system resembles job matching.  
These rules work here because the task is fundamentally about:

- requirement matching
- evidence-backed scoring
- constrained writing

If the task were:

- FAQ assistance
- long-form summarisation
- contract Q&A
- code retrieval
- multimodal document reasoning

then the ideal chunking, retrieval, and schema patterns might look quite different.

So this article should be read as a case study with reusable lessons, not as a universal template.

## The rules I actually trust after building this workflow

1. separate data roles before you optimise retrieval  
2. the CV behaves like an evidence pool; the rubric behaves like a rulebook  
3. the evidence pack needs to stay intentionally lean  
4. metadata fields are not decoration; they define retrieval boundaries  
5. many apparent model problems are really evidence-boundary problems  
6. production RAG stability usually depends less on model power than on evidence-pipeline design

## What I wanted this whole series to leave behind

The thing I most want to leave behind is probably not a single tooling conclusion. It is this feeling:

> the hard part of RAG is often not the embeddings, not the model, and not even the vector database by itself. It is whether you have actually thought through the role, boundary, granularity, and flow of evidence.

Once those things become clear, the system starts to feel much less like magic and much more like engineering.
