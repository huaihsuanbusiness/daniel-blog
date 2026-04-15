---
title: "ComfyUI Series 06 | How do you install models? Checkpoints, clips, loras, vae, T5XXL, GGUF, and FP8 explained"
description: "This is the point where things stop being “I vaguely understand the theory” and become “why is my workflow full of angry red boxes”."
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:15:00
featured: false
---

This is the point where things stop being “I vaguely understand the theory” and become “why is my workflow full of angry red boxes”.

Because even if you already know you want SDXL, Flux, or HiDream, the moment you start downloading files you usually run straight into a wall of unfamiliar labels:
- what is a checkpoint?
- what is CLIP, and what on earth is `clip_l`?
- what does a VAE do?
- where do LoRAs go?
- why does Flux suddenly want T5XXL as well?
- what is GGUF and why does it come with extra loader nodes?
- what is an FP8 checkpoint, and is it actually simpler?
- why does opening a workflow sometimes feel like detonating a small node grenade?

The goal of this article is to turn that pile into something you can actually work with.

> **ComfyUI itself is relatively small. The real bulk comes from the models.**
> Installing the app can feel tidy enough. The moment you start collecting checkpoints, VAEs, LoRAs, and text encoders, your storage and memory stop being abstract concepts.

---

## First, understand the four folders you will see all the time

ComfyUI’s own documentation is clear on this: model files usually live under `ComfyUI/models/`, sorted by type. The four folders beginners run into most often are:
- `models/checkpoints/`
- `models/clip/`
- `models/loras/`
- `models/vae/`

If you only remember one sentence from this section, make it this:

> **A checkpoint is the main course, CLIP reads the prompt, a VAE handles image encoding and decoding, and a LoRA adds flavour.**

### What is a checkpoint?
A checkpoint is the main weight package for the core model.

With SD 1.5, SDXL, and many community finetunes, you often download a single `.safetensors` file, place it in `models/checkpoints/`, load it with `CheckpointLoaderSimple`, and you are off.

### What is CLIP, and what is `clip_l`?
CLIP is a text encoder.

Its job is not to draw pixels directly. Its job is to turn your prompt into something the model can actually work with.

With newer workflows, especially Flux-style ones, you will often see separate assets such as:
- `clip_l`
- `t5xxl`
- dedicated text encoder nodes

### What is a VAE?
VAE stands for Variational Autoencoder.

In practice, it handles image encoding and decoding between the model’s latent representation and the actual image you see.

### What is a LoRA?
A LoRA is a lightweight finetuning weight.

Instead of replacing the whole model, it nudges an existing one in a specific direction.

---

## One table: what goes where?

| Asset type | What it does | Common file type | Usual location | Typical node |
| --- | --- | --- | --- | --- |
| checkpoint | main model package | `.safetensors` | `models/checkpoints/` | `CheckpointLoaderSimple` |
| clip / clip_l | text encoder | `.safetensors` | `models/clip/` | `CLIP Loader` or text encoder nodes |
| T5XXL | large text encoder | `.safetensors`, GGUF quantised files | `models/clip/` or GGUF-related path | T5 / dual text encoder nodes |
| vae | image encoder / decoder | `.safetensors` | `models/vae/` | `VAE Loader` |
| lora | finetune / style weight | `.safetensors` | `models/loras/` | `Load LoRA` |
| unet / diffusion model | core generative module | `.safetensors`, GGUF, etc. | workflow-dependent, often `models/unet/` | dedicated loaders |
| custom node | feature extension, not a model | folder / Python package | `custom_nodes/` | extra nodes rather than weights |

---

## The basic installation SOP

### Step 1: identify what you actually downloaded
Do not assume every `.safetensors` file belongs in `checkpoints/`.

The same file extension can represent:
- a checkpoint,
- a VAE,
- a LoRA,
- a CLIP encoder,
- a UNet,
- a T5XXL weight.

### Step 2: read the model page or workflow notes
The best source is usually:
- the official model page,
- a ComfyUI template workflow,
- the workflow author’s README.

### Step 3: place the file in the correct folder
The common pattern is:
- checkpoint → `models/checkpoints/`
- VAE → `models/vae/`
- LoRA → `models/loras/`
- CLIP / T5 → `models/clip/`

### Step 4: restart or refresh ComfyUI
Sometimes ComfyUI picks up new assets automatically. Sometimes restarting is quicker.

### Step 5: validate with a simple or official workflow first
ComfyUI’s troubleshooting docs explicitly recommend starting from template workflows or official examples when trying a new model.

---

## Why do some models feel like one file, while others feel like assembling a machine?

### SD 1.5 / SDXL-style workflows
These often look relatively straightforward:
- one checkpoint,
- maybe a VAE,
- maybe a LoRA.

### Flux / HiDream-style workflows
These more modern and heavier workflows often involve:
- extra text encoders,
- T5XXL,
- CLIP,
- split UNet or diffusion model components,
- GGUF quantised variants,
- dedicated loader nodes,
- custom nodes.

---

## What is LCM, and what is an LCM adapter?

LCM stands for **Latent Consistency Model**.  
In practice, what many ComfyUI users install is an **LCM LoRA** or **LCM adapter**.

The basic idea is:
- you already have SDXL or SD 1.5,
- you add an LCM adapter,
- the workflow can then produce images in fewer steps.

### Why do you need an LCM adapter?
Because it does not replace the base model. It gives the base model a lower-step acceleration path.

---

## What is Hugging Face, and why does everything eventually lead there?

Because it is one of the closest things the ML world has to a serious public model warehouse.

People keep sending you to Hugging Face because model pages there usually contain:
- model cards,
- file listings,
- licensing,
- usage notes,
- discussions,
- gated-access notices where relevant,
- and often safetensors versions.

---

## Why is Flux so often a source of pain?

Because the trouble is not only that the main model is large. The whole workflow stack is heavier.

The usual failure modes look like this:
1. **you are missing a loader node**
2. **you are missing a custom node**
3. **you downloaded GGUF files but the workflow expects a normal loader**
4. **you downloaded safetensors, but the workflow is built around quantised assets**
5. **you are missing T5XXL or CLIP**
6. **the files are in the wrong folder**
7. **the scheduler / sampler path does not match the workflow version**

### What is a loader node?
A loader node is the node responsible for reading a particular type of model file into ComfyUI.

### What is a custom node?
A custom node is not a model. It is a ComfyUI extension package.

---

## What is GGUF, and why does it keep appearing?

A lot of people first met GGUF in the local LLM world. It is a quantised format closely associated with llama.cpp-style tooling.

The appeal is straightforward:
- smaller or more manageable assets,
- less memory pressure,
- a fighting chance of running larger components on local machines.

The trade-offs are just as straightforward:
- you often need extra loader nodes,
- compatibility is more fiddly than with ordinary checkpoints,
- the workflow becomes more complicated.

### Why do GGUF workflows need extra loaders or custom nodes?
Because ComfyUI’s built-in nodes do not necessarily know how to read these quantised formats.

That is why projects such as `city96/ComfyUI-GGUF` exist.

### Why do some people convert GGUF back to safetensors?
Usually for:
- better compatibility,
- simpler workflow setup,
- fewer custom node dependencies.

---

## What is safetensors, and why do people keep recommending it?

`safetensors` is a weight format popularised across the Hugging Face ecosystem.

Its biggest attraction is simple:
- it is widely supported,
- it avoids the arbitrary-code-execution risks associated with pickle-style model loading,
- and it usually makes sharing weights less nerve-wracking.

---

## What is a UNet, and why do some workflows want it in `models/unet/`?

In many diffusion architectures, the UNet is one of the core denoising components.

Some ComfyUI workflows package everything as a single checkpoint. Others split pieces apart. When that happens, you may see:
- a UNet stored separately,
- CLIP stored separately,
- VAE stored separately.

---

## What is T5XXL, and why does Flux want it?

T5XXL is a large text encoder.

In Flux-style workflows, it is there to process prompt text in a richer way before that information reaches the image model.

### Where do you get it?
Common sources include Google’s `t5-v1_1-xxl` and ComfyUI-adapted versions or quantised packs shared by the community.

The original Hugging Face repo is enormous. The main `model.safetensors` is listed at 44.5GB.

### Q4 vs Q5
If you are using a GGUF quantised version, you will often see names like:
- Q4
- Q5

The practical distinction is:
- **Q4** usually means lower resource use,
- **Q5** usually means a bit more fidelity but more pressure on your machine.

---

## What is a CLIP text encoder, and why do you need it?

CLIP’s job is to place text and image concepts into a shared semantic space.

### Is there an OOM risk?
A CLIP file on its own is not usually the main villain. The trouble appears when it works alongside a large T5XXL, a large main model, MPS, and the rest of the graph.

OOM means out of memory.  
On Apple Silicon, it does not always present itself politely. Sometimes it means:
- the workflow becomes painfully slow,
- ComfyUI freezes,
- a generation step crashes,
- or the OS quietly cleans house.

### What about Apple Silicon throttling?
Apple’s thermal and power management is generally quite good. Rather than exploding dramatically, the machine may simply become slower under sustained load.

---

## What is a LoRA, and why would you use one?

A LoRA is a low-rank adaptation weight.

It lets you push a base model towards a specific style or use case without replacing the whole thing.

### Why do people keep mentioning RealisticVision?
Because many users do not merely want “a face”. They want skin, lighting, lens feel, and texture that read more like photography.

### Why does SDXL LCM sometimes look plasticky on its own?
Usually because:
- it prioritises speed,
- low-step generation tends to flatten texture,
- and a base workflow without realism-oriented finetuning can look overly smooth.

---

## What is `clip_l`, and where do you get it?

`clip_l` usually refers to a CLIP-L / ViT-L style text encoder asset.  
In some Flux workflows, it is explicitly required.

The common sources are:
- OpenAI’s CLIP ViT-L/14 Hugging Face repository,
- or ComfyUI-adapted packs provided alongside a workflow.

---

## What is a VAE, and where do you get one?

The VAE handles image encoding and decoding.

In SDXL and some community workflows, you may see specific VAE files referenced by name, such as `ae.safetensors` or other released assets.

Common sources are:
- official model repositories,
- workflow-specific releases,
- ComfyUI-oriented community packs.

---

## What is KSampler? What is Flux2Scheduler? And why do sigma bugs happen?

### What is KSampler?
KSampler is one of ComfyUI’s core sampling nodes.

It is effectively the stage that controls how noise turns into an image over a sequence of denoising steps.

### What is Flux2Scheduler?
This is the sort of scheduler node used in Flux-oriented workflows to match the expectations of that model family.

### What is a sigma mismatch, and why does it cause bugs?
Think of sigma as part of the denoising rhythm.

If the sampler, scheduler, model implementation, and loader path are not aligned, you can end up with:
- strange images,
- hard failures,
- or workflows that technically run but produce nonsense.

### Why is GGUF + MPS more bug-prone?
Usually because several tricky pieces overlap:
- GGUF introduces a quantised path,
- MPS is Apple’s GPU backend,
- custom nodes may handle tensors in their own way,
- Flux-family schedulers can be more sensitive.

---

## Why do some people switch to FP8 checkpoints? And why can `CheckpointLoaderSimple` replace a GGUF workflow?

### What is an FP8 Flux checkpoint?
It is a checkpoint whose weights have been quantised to FP8 precision.

But do not assume “FP8” means “tiny”. Community FP8 Flux files are still often in the 10GB to 17GB range.

### What is `CheckpointLoaderSimple`?
It is ComfyUI’s built-in loader for checkpoint files.

If you have a checkpoint format ComfyUI can read directly, and the matching text encoders / VAE are in place, then the workflow can become a lot simpler.

### Why can that replace a GGUF workflow?
Because GGUF workflows often become complicated due to:
- extra quantised formats,
- extra loaders,
- extra custom node dependencies.

---

## A practical installation order for beginners

### Path A: SDXL / SD 1.5 beginner route
1. install the checkpoint  
2. add the VAE if required  
3. add LoRAs afterwards  
4. test with a simple workflow  
5. only then try an LCM adapter  

### Path B: Flux-style workflow
1. confirm the exact main model version  
2. confirm whether it needs `clip_l`, `t5xxl`, and a VAE  
3. confirm whether the graph expects safetensors or GGUF  
4. if GGUF is involved, install the custom node / loader first  
5. place every file in the correct folder  
6. if the graph goes red, check whether you are missing nodes or weights before blaming fate itself

---

## One-sentence takeaway

> **The hardest part of installing models in ComfyUI is not downloading them. It is understanding the role each file plays inside the workflow.**
