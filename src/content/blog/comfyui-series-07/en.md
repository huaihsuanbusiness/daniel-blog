---
title: "ComfyUI Series 07 | Troubleshooting and common pitfalls: SQLAlchemy, requirements.txt, OOM, red nodes, and why safetensors keeps coming up"
description: "If you have made it through the earlier parts of this series, you are probably no longer stuck at “how do I install this”, but rather at questions like these:"
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:16:00
featured: false
---

If you have made it through the earlier parts of this series, you are probably no longer stuck at “how do I install this”, but rather at questions like these:

- why did it work yesterday and explode today?
- why is the workflow full of red nodes?
- why can’t ComfyUI see a model file I definitely downloaded?
- why does MPS exist on my Mac and still feel oddly temperamental?
- why does a Flux workflow sometimes feel like assembling a machine out of missing parts?

This article is the emergency kit for the whole series.

The aim is not to dump every error message on you. It is to give you a troubleshooting order that actually resembles real engineering work. Because most ComfyUI failures are not one dramatic fault. They are usually one of these:
1. **the environment is incomplete**
2. **the files are in the wrong place**
3. **the workflow and the model version do not match**
4. **a custom node dependency is missing**
5. **you have run out of memory, or MPS is behaving within its own limits**
6. **you grabbed a format that is less safe or less compatible than you thought**

My short version is this:

> **Most ComfyUI problems are not single-point failures. They are a handful of small mismatches piling up.**
> If you always try to guess the answer from the final line of the traceback, things often get messier. A steadier approach is to split the problem into five layers: environment, models, nodes, memory, and file format.

---

## A troubleshooting order that is actually useful

When something goes wrong, I usually check things in this order:

1. **Can ComfyUI itself start properly?**
2. **What is the first error in the terminal, not the last?**
3. **Is a Python package missing?**
4. **Is a custom node missing or broken?**
5. **Is the model in the wrong folder?**
6. **Does the workflow expect a different loader from the format you downloaded?**
7. **Are you hitting OOM or a backend MPS problem?**
8. **Only then do you start suspecting some obscure bug**

It is a bit like checking the plumbing before you dismantle the motor.

---

## Problem 1: ComfyUI will not open, or it crashes on startup

At this point, do not blame the model yet. The model has not even had a chance to misbehave.

Check the obvious things first:
- is the Python version sensible?
- did you actually activate the virtual environment?
- did `pip install -r requirements.txt` finish properly?
- does the terminal explicitly say a module is missing?
- is a custom node killing the process during startup?

ComfyUI’s own troubleshooting guide recommends returning to a minimal state first: check the system requirements, confirm the install is complete, and then investigate custom nodes. That matters, because the person who wrecks the environment is often not the bug. It is us, trying three fixes in a row and mixing them together.

### What I would do
Temporarily move suspicious folders out of `custom_nodes/` and see whether a clean ComfyUI install can start.

If the clean state works, ComfyUI itself is probably fine. The extension layer is the real suspect.

---

## Problem 2: step four throws an error saying `SQLAlchemy` is missing

We touched this in the install article, but it is worth revisiting because it is a classic example.

If you see something like this:

```bash
ModuleNotFoundError: No module named 'sqlalchemy'
```

do not treat it as a mystical ComfyUI-specific failure. It usually means something very ordinary:

> **The Python environment you are currently running does not contain a dependency that ComfyUI, or one of your nodes, expects.**

### What is SQLAlchemy?
SQLAlchemy is a widely used Python database toolkit. Plenty of projects use it for ORM or data access.

You do not need to become an ORM expert to fix the issue. You only need to recognise that it is a Python dependency, not a model, and not a ComfyUI-only concept.

### Why does it go missing?
The usual reasons are:
- `requirements.txt` did not install cleanly
- you installed packages into one Python interpreter but are running another
- a custom node has its own extra requirements that were never installed

### What does `requirements.txt` actually do?
It is simply a dependency list.

The project author writes down the Python packages the project expects, and `pip install -r requirements.txt` tries to install them in one go.

It is not magic. It is not a guarantee either. If the network drops, permissions are odd, you use the wrong interpreter, or package versions clash, the install can still fail halfway through.

### What I would do
First confirm you are in the right environment:

```bash
which python
python --version
pip --version
```

Then rerun:

```bash
pip install -r requirements.txt
```

If the missing dependency belongs to a custom node, install that node’s own requirements as well.

---

## Problem 3: the workflow opens, and everything is red

This is one of the most alarming beginner moments, but honestly, red nodes are often kinder than silent failure. At least they are telling you where the mismatch is.

Red nodes usually mean one of these:
- the required custom node is missing
- the custom node is installed, but the version does not match
- the workflow expects a loader you do not have
- a node has been renamed in a newer release
- the asset path or model name does not line up

ComfyUI’s own custom-node troubleshooting docs recommend a very practical method: **binary search**. Do not disable or enable everything at once. Flip half, test, and narrow it down.

### What I would do
1. Identify the category of red node  
   - loader
   - scheduler
   - utility / feature node
2. Re-check the workflow notes to see what the author actually requires
3. Confirm the custom node package name, version, and dependencies
4. If things are still messy, disable half of the custom nodes and do a binary search

### One easy detail to miss
A workflow that worked a month ago is not guaranteed to work unchanged today.

Node authors rename things. ComfyUI evolves. Loaders gain or lose assumptions. Old workflows can become fossil layers surprisingly quickly.

---

## Problem 4: you downloaded the model, but ComfyUI cannot see it

This looks like a UI issue on the surface, but it is usually either **the wrong folder** or **the wrong understanding of the file**.

The usual mistakes:
- putting a checkpoint in `models/clip/`
- putting a VAE in `models/checkpoints/`
- putting a LoRA in the wrong place
- dropping a GGUF file into a normal checkpoint path and trying to load it with a standard checkpoint loader
- downloading a text encoder and mistaking it for the main model

That is why I keep saying not to trust the `.safetensors` extension on its own.

The same extension can describe a checkpoint, a VAE, a LoRA, a CLIP encoder, or a UNet. Those are not the same category of thing.

### A steadier way to check
Go back to the model page or the workflow notes and confirm what the file actually is, then match it to the folder:
- checkpoint → `models/checkpoints/`
- VAE → `models/vae/`
- LoRA → `models/loras/`
- CLIP / T5XXL → often `models/clip/`
- workflow-specific UNet or diffusion model → wherever the instructions say

---

## Problem 5: why did I download GGUF if the workflow refuses to use it?

This is almost a Flux beginner starter pack.

GGUF is a quantised format. Its appeal is straightforward: it is one of the ways people try to make very large assets more manageable on local machines.

But GGUF is not the most native, frictionless ComfyUI path. It often means:
- you need an extra loader node
- you may need a custom node package
- not every workflow version supports it cleanly
- certain sampler, scheduler, and node combinations become more fragile

### What is the difference between a loader node and a custom node?
These two labels get mixed up all the time.

- **loader node**: a node whose job is to read a specific model format
- **custom node**: an extension package that adds nodes to ComfyUI, which may include loaders but is not limited to them

So a loader node is often part of a custom node package, but the two terms are not interchangeable.

### Why do some people convert GGUF back into safetensors?
Usually because they want:
1. higher compatibility
2. a simpler workflow
3. one fewer custom-node dependency

That is also why some people eventually find FP8 or safetensors-based workflows less stressful, even when they are not the absolute lightest option.

---

## Problem 6: what is safetensors, and why does everyone keep warning you about pickle?

This one matters because it is not merely a file-preference debate. It is partly a security question.

Hugging Face’s documentation is very clear here: one of the main selling points of `safetensors` is that it avoids the arbitrary-code-execution risks associated with pickle-style deserialisation. Hugging Face also has separate guidance on pickle security and scanning.

### So why are other formats still around?
Because the real world rarely gives you a single perfect format.

You may still run into cases where:
- an older workflow is built around an older format
- a model release appears in another packaging format first
- a quantised toolchain has better support for one format than another

### Why convert to safetensors?
Usually for three reasons:
1. **better security**
2. **more confidence when sharing and managing files**
3. **better compatibility across modern ComfyUI and Hugging Face workflows**

That said, not every file can be waved through a converter and declared solved. You still need the loader, workflow, metadata, and model components to line up.

---

## Problem 7: MPS exists on my Mac. Why is it still slow, unstable, or occasionally dramatic?

Start by separating two ideas:
- **MPS is available**
- **every MPS path is equally stable**

Those are not the same claim.

Apple and PyTorch are explicit that MPS is the GPU acceleration path for Apple Silicon in PyTorch, and recent PyTorch releases continue improving operator coverage and error reporting. That still does not mean every model, custom node, quantised asset, and backend combination behaves perfectly.

### Common realities on Mac
1. **You are getting acceleration, just not as much as you hoped**  
   Some operations still fall back to CPU, or the workflow bottleneck is elsewhere.

2. **It runs, but memory pressure is high**  
   Unified memory is not infinite memory. Large models can still make the system crawl or collapse.

3. **Certain MPS paths still hit backend limits or bugs**  
   Even in 2026 you can still find issues where a particular operation or temporary array size trips over an MPS limitation and kills the process.

### A healthier mental model
Do not treat MPS as a magical speed button.

Treat it as a very worthwhile local GPU path with real boundaries.

---

## Problem 8: what is OOM, and what actually happens when it bites?

OOM means **Out Of Memory**.

In plain English, you have asked the machine to hold more working data than it can handle comfortably at that moment.

In ComfyUI, OOM often shows up like this:
- a direct error
- generation freezing
- performance dropping off a cliff
- the process being killed
- unreadable-looking MPS or Metal backend failures

### What matters on Apple Silicon?
A lot of people see unified memory and assume that “16 GB is basically enough for everything”.

A more honest version is this:

> **16 GB can technically run quite a lot, but that does not mean every large workflow will run elegantly.**

Large Flux-style workflows, heavy text encoders, extra LoRAs, higher resolutions, and larger batches can pile up quickly.

### Common ways to reduce OOM risk
- lower the resolution
- reduce batch size
- choose a smaller or quantised model
- remove extra LoRAs or control assets
- simplify the workflow
- accept that “it runs” and “it runs comfortably” are different things on a 16 GB Mac

---

## Problem 9: what do people mean by sigma mismatch, scheduler trouble, and sampler weirdness?

This is one of those topics where reading too many threads can make things less clear.

In plain language:
- **KSampler** is part of the sampling path that actually performs generation
- a **scheduler** determines how the sampling steps are arranged
- **sigma** is one way of representing noise levels or step progression in certain sampling workflows

When the sampler, scheduler, model format, or custom-node implementation do not line up, you can get:
- parameter mismatches
- incompatible node types
- odd generation results
- or a direct failure

### Why does GGUF + MPS feel especially fragile?
Because you are stacking two sensitivity points at once:
1. **GGUF** often relies on extra loaders or custom nodes
2. **MPS** is useful, but not as universally exercised as the CUDA path across every image-model combination

So what breaks is not always one thing. It is often the combination of **format, nodes, and backend** failing to line up cleanly.

That is why many people eventually conclude that safetensors or FP8 workflows are not always the most extreme option, but they can be cheaper to maintain.

---

## Problem 10: FP8 checkpoints sound tidy. Why do people still stop using them?

The appeal of FP8 checkpoints is obvious:
- lighter than full precision
- often simpler than a GGUF-based workflow
- sometimes closer to a normal checkpoint-style setup

That is exactly why they are attractive.

But they are not a universal answer. In practice it still depends on:
- which release you downloaded
- whether the workflow was designed for it
- whether the text encoder, VAE, and UNet arrangement matches
- whether your hardware can handle the rest of the stack

### Why do some people stop using `flux1-dev-fp8`?
Usually not because it is impossible to run, but because of practical maintenance choices:
- the workflow changed
- another path was already tuned and working
- GGUF became too fiddly
- or the reverse: GGUF was abandoned in favour of a simpler checkpoint-style path

In other words, people usually settle on the route with the lowest overall maintenance cost, not the one that looks best in isolation.

---

## A practical troubleshooting framework: ask five questions first

Whenever something breaks, ask yourself:

### 1. Is this an environment problem or a workflow problem?
If ComfyUI cannot even start, stop blaming the workflow.

### 2. Is this a model-file problem or a node problem?
If the canvas is full of red nodes, check the nodes first.

### 3. Is this a format problem or a folder-path problem?
The `.safetensors` extension does not tell you the full story.

### 4. Is this a resource problem or a version mismatch?
If it is OOM, reinstalling things will not save you.  
If it is version mismatch, lowering the resolution may not help either.

### 5. Is this one bug, or three small mismatches at once?
That multi-layer pile-up is probably the most common ComfyUI failure pattern of all.

---

## My own advice: when debugging, get boring on purpose

The easiest mistake is to make five changes at once:
- swap the model
- swap the workflow
- update ComfyUI
- update all custom nodes
- reinstall Python for good measure

That usually turns the problem into soup.

A steadier method is:
1. go back to a minimal working state
2. validate with the simplest workflow you have
3. change one variable at a time
4. keep notes
5. use safetensors when you reasonably can
6. install fewer custom nodes where possible
7. on a 16 GB Mac, accept that large workflows really do brush against the edges more often

It is not glamorous, but it is far closer to what actually fixes things.

---

## Final thoughts

By now you have probably noticed something important:

> **ComfyUI’s pain points are not proof that you are bad at this. It is simply a tool that exposes the layers: models, formats, nodes, memory, and backend behaviour.**

That is part of why it is powerful, and part of why it can make people want to lie down on the floor for a bit.

You can see the layers, which gives you freedom.  
But because you can see the layers, you also get to deal with them when one shifts out of place.

If I had to compress the whole series into one sentence, it would be this:

> **Pick the right path, get it running, then chase speed, size, and fancy workflows later.**
> Otherwise you can end up being educated by your own toolchain before you make anything interesting.

---

## What you can do now

By the end of part 7, you should have a fairly solid beginner map for local image generation:
- you know why you are using ComfyUI rather than another UI
- you know what a Mac mini M4 with 16 GB can technically manage
- you know how to install ComfyUI, launch it, and keep it running with tmux
- you know where models come from and how to read Civitai and Hugging Face pages
- you know the broad differences between SD 1.5, SDXL, Flux, HiDream, LCM, LoRA, and T5XXL
- you know where model files go
- and you know where to start when things break

At that point, you are no longer just someone who managed to install a tool. You are becoming someone who can make judgements and recover from failure.

And in the local AI world, that matters quite a lot.

## Image Asset Plan

This article does not strictly need an image.  
If we add one later, I would only suggest one:

1. filename: comfyui-troubleshooting-01-debug-layers.svg
   purpose: show a five-layer troubleshooting framework for common ComfyUI failures
   placement: after the section on troubleshooting order
   alt: Five-layer troubleshooting framework for common ComfyUI issues
   prompt: A clean blog-friendly SVG diagram showing five troubleshooting layers for ComfyUI: environment, models, nodes, memory, and file format. Modern rounded boxes, gentle colours, clear arrows, English labels, no clutter, suitable for a technical blog.
