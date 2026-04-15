---
title: "Local LLM Fine-Tuning, Explained part 08 | From adapters back to Ollama: merge, quantisation and deployment"
description: "a finished training run is not the same thing as a finished model"
categories: ["ai"]
tags: []
date: 2026-04-10T09:00:00
series: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO"
seriesOrder: 8
---

By the time you truly reach this stage, one fact becomes impossible to miss:

**a finished training run is not the same thing as a finished model**

A lot of first local fine-tuning attempts are driven by a very intuitive picture:

- training completes
- files appear
- therefore the model must be ready

Reality is longer than that.

What training often gives you is not a finished product, but an intermediate artefact. That artefact might be:
- an adapter
- a checkpoint
- a safetensors weight file
- a pre-merge intermediate state

Turning those things back into something genuinely usable on a local machine, especially through Ollama, usually requires a different engineering path altogether.

![Adapter, merge, quantisation and Ollama path](./resource/local-llm-finetuning-part-08-deployment-path.svg)

## Why adapters do not have to be merged

This is worth stating early, because many people begin by assuming merge is mandatory.

It is not.

Adapters are designed to be able to:
- live separately from the base model
- be attached when needed
- let one base model support multiple behavioural variants

That is part of why LoRA is so attractive in engineering terms. You do not need to duplicate a full base model every time you create a new variant. You only need to store the increment.

So an adapter that is not merged is not incomplete.  
It simply means:

**your deployment route still allows the base and the increment to exist separately**

---

## What the difference is between an adapter and a merge

This needs to stay very clean.

### Adapter route
- the base model remains the base model
- the adapter is stored separately
- inference combines them

### Merge route
- the adapter’s learned increment is folded back into the base model
- the result becomes one new complete weight set

So merge is not a training method.  
It is a packaging and deployment step.

That matters because it affects:
- file size
- versioning flexibility
- what downstream tools can ingest directly

---

## Why adapters are so much more storage-efficient

Because they only store the delta.

The files you kept seeing:
- `adapter_model.safetensors`
- `adapter_config.json`

are not whole-model copies. They are compact trainable increments. That is why they remain so much smaller than a fully merged model.

Which is also why:
- adapters are excellent for experimentation
- merge feels more like a pre-production step

---

## What merge is actually doing

The plain version is:

**merge folds the adapter’s learned increment back into the base model weights**

So after merge, you no longer have:
- base + adapter as separate pieces

You now have:
- one full model weight set

That is why merged models become much larger. You are no longer storing a small delta. You are storing the whole thing.

---

## What Safetensors is

Safetensors is not a model category.  
It is best understood as a weight-file format.

So when you saw:
- `adapter_model.safetensors`
- `model.safetensors`

the difference was not that one was somehow more “advanced”.  
The difference was what they were storing:

- adapter increment
- or full merged weights

Safetensors appears constantly in this workflow because it fits very naturally into:
- Hugging Face model storage
- pre- and post-merge exchange
- movement between training and local deployment stages

---

## Where GGUF sits

GGUF is also not a different personality of model.  
It is better understood as another container format, especially common in local quantised inference ecosystems.

The most practical way to hold the distinction is:

- Safetensors: training / merge / interchange
- GGUF: local quantised inference ecosystem

Neither is the model itself.  
They are containers.

---

## Why merge is often followed by quantisation

This was one of the clearest lived differences in your own session.

You merged a model, brought it back into Ollama, and saw the most direct possible outcome:

- the unquantised version could run
- but it was painfully slow

Then the q4 version appeared, and the speed improved dramatically.

The main judgement here is:

**quantisation is not for making the model smarter. Quantisation is for making the model runnable**

---

## What quantisation is

The plainest version is:

**replace a heavier, higher-precision weight representation with a lighter one**

A useful metaphor is:
- same luggage contents
- different suitcase
- lighter to carry
- easier to deploy

### Why do it at all?
Because local deployment pain usually comes from:
- memory
- load cost
- inference latency

Quantisation is a direct fight against those constraints.

---

## What q4_0, q4_K_M, fp16 and fp32 are

You do not need to fall into the deepest quantisation theory on day one. The broad shape is enough to begin with.

### fp32
Higher precision, heavier.

### fp16
Still fairly high precision, but lighter than fp32.

### q4_0
A common 4-bit quantised family form.

### q4_K_M
Another common 4-bit local-inference format. This is the kind of route that eventually gave you a version that felt usable again.

These names are not describing different personalities.  
They are describing different weight representations of essentially the same model.

---

## What quantisation helps, and what it does not

### It helps with:
- storage
- fitting into local memory
- inference speed

### It does not automatically fix:
- a poorly trained adapter
- a distorted model
- a bad recipe
- a degraded alignment balance

That is one of the most important conclusions from the whole path.

Quantisation can solve “slow”.  
It cannot solve “this model was trained into the weeds”.

---

## Why some versions are slow and others feel stupid

This is worth preserving as a central judgement.

### Slow
Usually means:
- too large
- not quantised
- expensive to load and run

### Stupid
Usually means:
- data too small
- recipe unstable
- adapter distorted the model
- evaluation happened too late

Those two problems can absolutely appear in the same run.  
But they are not the same disease.

---

## Why a Modelfile is not the same thing as a system prompt

You already felt this distinction earlier.

### System prompt
More like a role note for the actor.  
It tells the model:
- who it is
- how it should speak
- what not to do

### Modelfile
More like the full production brief.  
It can define:
- the base model source
- system text
- template
- parameters
- messages
- and sometimes the route by which the model or adapter is packaged

So a Modelfile is not merely a longer system prompt.  
It sits one layer above that.

---

## How a Modelfile is built

You already walked the two most important routes.

### Route 1: from an existing Ollama model
For example:

```text
FROM llama3.1:8b
SYSTEM ...
PARAMETER ...
TEMPLATE ...
```

### Route 2: from a merged local model directory
For example:

```text
FROM /Users/daniel/llama31-lora-lab/out/merged-qkvo-full
```

The difference is:
- the first wraps an existing Ollama model
- the second repackages your own completed model artefact

---

## Why `ollama create` sometimes failed to read your Modelfile properly

This was not simply “Ollama being broken”.  
More often the cause was one of these:

- wrong working directory
- `-f` path not pointed correctly
- the `FROM` target not being something Ollama could ingest in that route
- mixing adapter-based assumptions with full-model assumptions

That is why the eventually successful path became:
- merge first
- quantise next
- create a new Ollama model from the resulting complete model

---

## What “returning to Ollama” really means

This is worth keeping as a single very plain sentence:

**you are not merely copying training files back into Ollama; you are turning training artefacts into deployment-ready model products**

That makes a great many things suddenly reasonable:
- why adapters are not always directly consumable
- why merge can be the smoother path
- why quantisation is practically mandatory in local deployment
- why the Modelfile belongs to packaging, not to training itself

---

## The one sentence worth keeping

If this piece leaves one sentence behind, it should be this:

**training usually gives you artefacts, not a finished product. To get a usable local model, you still need adapter management, merging, format conversion, quantisation and Modelfile packaging.**

That sentence matters because it separates “training succeeded” from “this is now usable”.
