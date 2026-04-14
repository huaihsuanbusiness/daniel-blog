---
title: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO — Part 04 | SFT、LoRA 與 full fine-tune：它們各自在改什麼"
description: "SFT answers how you teach. LoRA answers how you change parameters. Full fine-tuning answers how deep you are willing to cut."
categories: ["ai"]
tags: []
date: 2026-04-09T05:00:00
series: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO"
seriesOrder: 4
---
This is one of those places where terminology quietly makes everything worse.

Once you start touching real models, a small cluster of words begins to blur into one thing:

- SFT
- LoRA
- adapters
- full fine-tuning
- partial FT

On the surface, they all look like variants of “fine-tuning”.  
In practice, they are answering different questions.

That distinction matters more than it sounds. A lot of confusion does not come from knowing nothing. It comes from knowing just enough to compress different layers into one story. You start talking about LoRA as if it were a training objective, or about SFT as if it were a model type, or about full fine-tuning as if it were merely LoRA turned up a notch.

A cleaner way to hold it is this:


![Relationship map of SFT, LoRA, partial FT and full fine-tuning](./resource/local-llm-finetuning-part-04-training-landscape.svg)

## Three different questions, not one

I find it easier to separate the territory into three questions.

The first is: **what signal are you using to teach the model?**  
The second is: **how are you introducing trainable parameters into the system?**  
The third is: **how much of the original model are you actually updating?**

A great deal of muddle disappears the moment those three are no longer treated as one axis.

### Teaching signal
This is where SFT lives, and where DPO will live in the next piece.

### Parameter update strategy
This is where LoRA and adapter-style PEFT methods sit.

### Surgical depth
This is where partial FT and full fine-tuning sit.

## What SFT is

SFT stands for supervised fine-tuning.

In plain language, it is about showing the model examples of what a good answer looks like, then nudging it to produce answers in that direction when it sees similar prompts again.

That means the core of SFT is not a particular model form.  
The core is that you have a supervised target.

Most of the time, the data comes in one of two shapes.

### 1. Prompt-completion
You provide:
- a prompt
- a completion

### 2. Conversational
You provide:
- messages
- an assistant reply

The LoRA experiments you ran earlier were, at heart, SFT experiments. Not DPO. Not RLHF. Just supervised fine-tuning carried out through a parameter-efficient route.

## Why SFT is useful

The strength of SFT is not that it is exotic. It is that it is direct.

If what you want is something like:
- start with the answer
- then break it into principle / risk / action
- keep the tone more concise
- sound more like a technical assistant
- hold a steadier Traditional Chinese style

then SFT makes intuitive sense. Those are all things that lend themselves to demonstration.

Its boundary is just as important.

If the problem is not “what does a good answer look like?” but rather “between two plausible answers, which one do I consistently prefer?”, then SFT is no longer the neatest tool. That is where DPO becomes more natural.

## What LoRA is

LoRA, Low-Rank Adaptation, is documented by PEFT as a way of reducing the number of trainable parameters by introducing low-rank matrices rather than updating the full original matrix stack. In practical terms, it is a method for making large-model fine-tuning cheaper and lighter.

If you translate that into engineering language, it becomes much less mystical:

**LoRA is a trainable prosthetic attached to the original model rather than a rewrite of the whole body.**

That is why the “muscle memory” metaphor works. You are not replacing the actor’s brain, and you are not merely handing over a new note. You are changing part of the response pattern while trying to leave the wider base intact.

### LoRA is not a teaching objective
LoRA does not answer:
- what kind of data you are using
- whether you are doing SFT or DPO

LoRA answers:
- whether you want a parameter-efficient route
- whether you want to avoid opening the whole base model
- how much training cost you are prepared to carry

So “LoRA training” is often too vague. More precise phrases are:
- LoRA SFT
- LoRA DPO

LoRA is the carrier. It is not the lesson.

## What an adapter is

Across this whole workflow, the most practical way to think about an adapter is this:

**an extra trainable layer attached to the base model**

LoRA is usually one concrete form of that broader adapter idea.

That means the files you kept generating, such as:
- `adapter_config.json`
- `adapter_model.safetensors`

are not separate full models. They are fine-tuned increments intended to sit on top of the base.

That is why adapters do not have to be merged. They are designed to exist separately from the base model if your deployment path supports that.

## What LoRA SFT means

LoRA SFT simply means:

**doing supervised fine-tuning through a LoRA-based PEFT route**

That is exactly what the earlier baseline-small, qkvo-small and all-linear-small experiments were.

## What full fine-tuning is

Full fine-tuning is more blunt.

It is not about attaching a small trainable prosthetic next to the model.  
It is about updating the original weights themselves.

The upside is obvious:
you can make broader and deeper behavioural changes.

The cost is just as obvious:
- more memory
- more storage
- more training time
- more risk of disturbing the balance the instruct model already had

## What partial FT is

If LoRA is the cautious route and full fine-tuning is the deep-water route, partial FT sits somewhere in between.

It means opening selected parts of the original model, such as:
- the last few transformer blocks
- certain specific submodules
- late-stage components like `model.model.norm` or `lm_head`

That makes it deeper than LoRA, because it does genuinely modify original weights.  
But it is still more conservative than full fine-tuning because you are not updating everything.

## What the base model is

The base model is simply:

**the starting brain from which all your customisation departs**

If what you have is a raw base model, it is closer to the pretrained foundation.  
If what you have is an instruct model, it is already a model that has been tuned to follow instructions and behave more naturally in dialogue.

That is also why your whole workflow centred on `Llama-3.1-8B-Instruct`. The thing worth protecting was not just the weights in the abstract, but the behavioural balance that came with the instruction-tuned version.

## Instruct versus base

### Base
Closer to the raw foundation.

### Instruct
Closer to a model that has already gone through a round of training around instruction following, task completion and dialogue behaviour.

In practice:
- base feels more like raw material
- instruct feels more like a prepared substrate

## Has the model actually “learned” after LoRA?

Yes, but the claim needs to be precise.

If the question is:
> Has the model’s behaviour changed after LoRA fine-tuning?

Yes. Otherwise the adapter would have no point.

If the question is:
> Is that the same kind of learning as full fine-tuning?

No.

LoRA learning is closer to:
- adding trainable increments on top of the base
- altering behaviour through those increments
- without rewriting the full original parameter body

## Can you stack another LoRA on top of a customised Llama?

Conceptually, yes.

The engineering caveat is more important than the conceptual one.

### 1. Being possible is not the same as being a good idea
Every added adapter increases:
- validation complexity
- debugging complexity
- ambiguity about which layer is causing weird behaviour

### 2. A stable mainline is worth more than another experimental layer
That judgement already came out of your own experiments. It is very easy to keep adding layers of method. It is much harder to preserve a model that still feels intelligent and usable.

## Why LoRA is so tempting

LoRA sits in a very seductive place.

It is:
- deeper than prompting
- lighter than full fine-tuning
- often still viable on local hardware

So it looks like a beautiful middle road.

The catch is that a middle road is not automatically a safe road.

LoRA is useful, but it does not automatically preserve the base model’s balance. Narrow data, tiny data, late evaluation and wide attachment scopes can still push the model into strange accents.

## When not to reach for LoRA first

If your goal is mainly:
- preserve the base model
- make replies more direct
- reduce fluff
- stabilise formatting
- avoid touching the deeper parameter layers

then the first thing to adjust is often not LoRA at all. It is more likely to be:
- system prompt
- few-shot examples
- Modelfile
- runtime parameters

## The one sentence worth keeping

**SFT answers how you teach, LoRA answers how you update, and full fine-tuning answers how deep you are willing to cut.**

Once those three are no longer being used as one blob, the rest of the map becomes much easier to read.

#