---
title: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO — Part 07 | 訓練成本與 MPS：為什麼會慢、會卡、會 OOM"
description: "training is not slow inference. Training is forward pass, loss, backward pass, gradients, optimiser state and parameter updates all competing inside the same space."
categories: ["ai"]
tags: []
date: 2026-04-10T05:00:00
series: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO"
seriesOrder: 7
---
This is where the whole series starts to smell less like a framework and more like a real worksite.

The earlier pieces could still rely on maps, layers and clean distinctions.  
This one cannot.  
This one has to deal with the questions that start showing up the moment you actually train something:

- why is this so slow
- why does it look stuck
- why are some warnings harmless and others a real problem
- why can LoRA just about run while partial FT collapses into memory pain
- why does “only 2.7% of weights” still feel enormous
- why does generation look dead when it is sometimes merely being brutally honest about how slow it is

If I had to put the central point right at the top, it would be this:


![Training cost and MPS pressure map](./resource/local-llm-finetuning-part-07-mps-cost-map.svg)

## Why training is so much heavier than inference

Saying “because the model is big” is not wrong, but it is not enough.

The pain you felt earlier did not come only from size.  
It came from the fact that **training does much more than inference**.

### What inference is doing
At its core:
- forward pass
- logits
- then the next token

If all you do is a single forward pass, the cost is comparatively plain. That is exactly why your “forward pass only” DPO smoke test could succeed even when generation felt unusable.

### What training is doing
Training has to carry extra work:
- loss computation
- backward pass
- gradient storage
- optimiser state
- parameter updates

So training is not “inference done many times”.  
It is a different workload category.

That is why the same 8B model can feel:
- survivable in one type of inference
- much harsher the moment training begins

---

## What loss is, and why it exists

This sounds like a beginner question, but it matters.

The plain version is:

**loss is the numerical form of how far the model is from the target you want it to move towards**

Training needs something optimisable. The model cannot merely be told “that answer felt a bit off”. It needs a quantity that backward pass can use.

### In SFT
Loss is closer to:
- how far the model’s output is from the demonstrated target answer

### In DPO
The shape is different, but the principle is similar:
- how far the model’s current preferences are from the desired preference relation

So loss is not dashboard decoration.  
It is part of the actual force that moves parameters.

---

## Why training loss does not equal quality

You already proved this the hard way.

Some LoRA runs:
- completed successfully
- produced checkpoints
- logged reasonable numbers

and yet once deployed back into use, the model still:
- became duller
- invented strange terminology
- lost its balance
- felt less intelligent overall

That is why I never want to turn loss into the protagonist.

Loss matters.  
But it only tells you:

**how well the model fit this training signal**

It does not guarantee:
- stable generalisation
- preserved deployment quality
- good behaviour on real prompts

So the stable workflow is always:
- read the loss
- but also compare versions
- and also test them in use

---

## Why LoRA training takes so long

Your Mac runs were very honest about this.  
The slowness was not imaginary.

At least four things were stacked together.

### 1. You were not only doing forward passes
This is the main one.  
Backward pass and optimiser steps fundamentally change the cost.

### 2. You were using MPS
MPS matters because it makes local Apple Silicon training possible at all.  
But it is not a drop-in substitute for a mature high-end CUDA training stack. PyTorch treats MPS as an official backend and documents its dedicated memory controls, which tells you it is real support, not a hack. It does not tell you that large-model training will be comfortable. citeturn563578search7turn563578search11

### 3. Your settings were conservative but still non-trivial
Small batch sizes, modest accumulation and non-trivial sequence lengths all make the cost feel very real.

### 4. Saving can itself be slow
Not every apparent stall is training.  
Checkpoint writing, merged shard writing and large-file output can be painfully slow on their own.

---

## Why generation keeps looking stuck

You built a very complete case study of this.

You saw things like:
- generation appearing dead
- but forward pass succeeding
- shorter generation limits still feeling awful
- the eventual realisation that this was 8B + MPS + adapter + generate, not a broken model

The most important judgement here is:

**stuck does not automatically mean broken**

Sometimes it really means:
- first-token latency is terrible
- MPS generation is heavy
- the model and adapter are fine, but your requested workload is unfriendly to the hardware

That is exactly why moving to:
- forward-pass-only smoke tests
- logits checks
- chosen/rejected log-prob comparisons

was not just a workaround. It was, in several cases, a more honest evaluation route.

---

## The `temperature` warning and `do_sample`

You saw this many times:

> The following generation flags are not valid and may be ignored: ['temperature', 'top_p']

This is not the main problem.

It usually just means:
- `do_sample=False`
- therefore sampling parameters such as `temperature` and `top_p` do not apply
- transformers is warning you that they are being ignored

Annoying, yes.  
Fatal, no.

---

## What the `torch_dtype` warning is telling you

You also saw:

> `torch_dtype` is deprecated! Use `dtype` instead!

That is not a sign that the model cannot run.  
It is an API-evolution warning.

In plain terms:
- this parameter name is being phased out
- it still works now
- but the newer spelling should replace it later

Worth cleaning up, not worth panicking about.

---

## What MPS actually is

The most useful plain-language definition is:

**MPS is the route that lets PyTorch use Apple’s GPU stack on Apple Silicon**

For your purposes, that mattered because:
- it made local training on a Mac worth attempting at all
- but it also exposed the real limits of that path

PyTorch documents MPS-specific backend and memory settings, which is a good reminder that this is a supported path, not a side alley. citeturn563578search7

---

## What the MPS high watermark is

This is the piece you started touching when `PYTORCH_MPS_HIGH_WATERMARK_RATIO` showed up.

In plain terms, it is a memory guardrail for the MPS allocator.  
It is not a permission slip to consume memory infinitely.

So when you see errors describing:
- MPS allocated
- max allowed
- tried to allocate

that usually means:
**this configuration does not fit on this machine**

### What `PYTORCH_MPS_HIGH_WATERMARK_RATIO` is
It is one of PyTorch’s MPS memory-control environment variables. The official docs expose it as part of allocator tuning. That matters because it helps you understand what it is not: it is not a magic model shrink ray. citeturn563578search7

Loosening it can sometimes shift behaviour. It does not necessarily fix the underlying mismatch between workload and hardware.

---

## Why OOM happens

Your partial FT run failed in a very educational way.

The reason is straightforward.

### 1. You are not just loading weights
You are also carrying:
- gradients
- optimiser states
- activations
- update steps

### 2. Partial FT really opens original weights
That is the large difference from LoRA.

LoRA is closer to:
- frozen base
- small trainable increments

Partial FT is closer to:
- genuine trainable base weights
- with gradients and optimiser states attached

### 3. `exp_avg` and `exp_avg_sq` are not free
These are optimiser states associated with Adam-style methods.  
That means you are not only paying for the trainable parameters themselves, but also for those extra running statistics.

That is why many runs do not explode during forward pass. They explode when the optimiser step arrives.

---

## What `trainable params` and `trainable %` are actually telling you

These numbers are worth understanding properly.

### `trainable params`
The raw number of parameters that will actually be updated.

### `trainable %`
How large that trainable set is relative to the entire model.

So when you see:
- 17.4%
- or 2.7%

the human instinct is to think “2.7% sounds small”.  
On an 8B model, it is not small in the way your intuition wants it to be.

### Is roughly 2.7% a lot?
For local 8B training on MPS, yes.  
Certainly large enough to push you out of LoRA territory and into something that genuinely feels like base-weight work.

---

## What 2.7% really means

The easiest way to think about it is:

you are not opening a symbolic flag.  
You are opening **hundreds of millions of original parameters**.

So “small percentage” does not mean “small bill”.

That point matters especially in large-model work.

---

## Why partial FT feels so much harsher than LoRA

Because it sits in the most deceptive middle zone:

- much deeper than LoRA
- but not obviously as radical as full fine-tuning

That makes it easy to underestimate.

You tell yourself:
- I am only opening the final few layers
- it should not be that different

Then the machine answers with a very firm “it is different”.

---

## How to read different kinds of “stuck”

I think this is worth keeping as a practical diagnostic table.

### Type 1: merely slow
Signs:
- no explicit error
- the system is still doing work
- generation just sits there

Likely cause:
- terrible first-token latency
- heavy MPS generation
- large model plus adapter

### Type 2: true incompatibility
Signs:
- immediate TypeError
- trainer arguments rejected
- API calls not recognised

Likely cause:
- version mismatch across TRL / PEFT / Transformers

### Type 3: resource collapse
Signs:
- OOM
- allocator errors
- failure during optimiser step

Likely cause:
- too much trainable scope
- partial FT too heavy
- sequence too long
- optimiser state too large

### Type 4: text-editing and shell-layer accidents
Signs:
- `kimport`
- `SyntaxError`
- heredoc leftovers
- running commands from the wrong directory

Not glamorous, but extremely common.

---

## Why compare scripts can also become expensive

You proved this too.

### Train
Heavy, yes, but the trainer knows what kind of heavy it is.

### Compare
Looks harmless, but once it becomes:
- 8B base
- adapter attached
- generation
- or long-sequence log-prob comparison

it can absolutely become a serious workload in its own right.

That is why you ended up trimming compare scripts into:
- one sample only
- shorter answers
- disable-adapter base comparisons
- margin-based scoring instead of full long-form generation

That was not cheating.  
It was respecting the machine.

---

## The one sentence worth keeping

If this piece leaves one sentence behind, it should be this:

**training is not slow inference. It is forward pass, loss, backward pass, gradients, optimiser states and updates all competing inside the same space.**

Once that sentence really lands, a great deal of the rest becomes legible:
- why LoRA is still survivable
- why partial FT explodes so quickly
- why MPS often feels abrasive
- why generation looking stuck is not always a bug
- why compare scripts can become unexpectedly painful too

#