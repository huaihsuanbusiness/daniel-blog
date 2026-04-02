---
title: "ComfyUI Series 05 | How do you actually choose a model? SD 1.5, SDXL, LCM, Turbo, Pony, Flux, and HiDream explained"
description: "Once ComfyUI is up and running, the next thing that tends to melt people's brains is the model list."
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:14:00
featured: false
---

Once ComfyUI is up and running, the next thing that tends to melt people's brains is the model list.

SD 1.5, SD 2.1, SDXL, LCM, Turbo, Pony, Flux, HiDream. Everyone has a favourite. Everyone says their pick is “the good one”. Then you look at the file sizes and your SSD starts sweating before the model has even finished downloading.

So let me start with the bit that matters:

> **The newest, largest, or most talked-about model is not automatically the right one for your machine or your workflow.**
> On a Mac mini M4 with 16GB of unified memory, the real question is not whether a model can technically run. It is whether you actually want to live with it.

And yes, part of the appeal of running local image models is freedom. You are not paying per prompt, you are not bouncing off someone else’s guardrails, and if you want to generate something naughty, that is your business rather than a platform moderation queue.

This article is here to answer the practical questions:

- What is the difference between these model families?
- Who made them?
- Which ones are official base models and which ones are community finetunes?
- What can 16GB realistically cope with?
- If you want speed, realism, anime, or the least possible pain, where should you begin?

---

## First, split the models into three buckets

A lot of the confusion comes from people comparing things that do not sit at the same level.

My simpler way of sorting them is this:

1. **Base models**
   - SD 1.5, SD 2.1, SDXL, FLUX.1, HiDream-I1
   - These are the actual foundations that do the heavy lifting

2. **Acceleration or distilled variants**
   - LCM, SDXL Turbo, FLUX.1 Schnell
   - These are mostly about getting images out in fewer steps

3. **Community finetunes and LoRA-driven ecosystems**
   - Pony, RealisticVision, and a whole zoo of stylistic LoRAs
   - These lean hard into specific looks or use cases

That distinction matters. Pony is not quite the same sort of thing as SDXL, and LCM is not best understood as a completely separate universe.

---

## A quick comparison table

| Model / family | Type | Main developer | Typical use / look | Speed tendency | Storage / memory pressure | Technically runnable on 16GB? | My practical take |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SD 1.5 | base model | Stability AI / Runway ecosystem | older but flexible, huge LoRA ecosystem | fast | low | yes | great for beginners and older community assets |
| SD 2.1 | base model | Stability AI | newer than 1.5, but with less community gravity | medium | medium | yes | workable, but rarely the first recommendation now |
| SDXL | base model | Stability AI | stronger composition, stronger prompt following | medium to slow | medium-high | yes | one of the best balanced starting points |
| LCM | acceleration technique / adapter | LCM team | fast previews, low-step generation | very fast | low to medium | yes | excellent when speed matters |
| SDXL Turbo | distilled fast model | Stability AI | immediate-ish generation, low-step workflows | very fast | medium-high | yes | brilliant for rapid prompt testing |
| Pony Diffusion | community finetune | community model | anime, stylised characters, strong subculture adoption | medium | medium-high | yes | great if you specifically want that ecosystem |
| FLUX.1 dev | base model | Black Forest Labs | realism, composition, prompt understanding | slow | very high | yes, but not lightly | lovely results, heavier daily driving |
| FLUX.1 schnell | fast distilled model | Black Forest Labs | quicker Flux workflow with some of the same flavour | medium-fast | high | yes | the gentler way into Flux on 16GB |
| HiDream-I1 | base model | HiDream.ai | very high quality, newer open model family | slow | extremely high | technically yes | not my first recommendation for a 16GB daily driver |

---

## SD 1.5: old, but still hanging about for sensible reasons

Stable Diffusion 1.5 is not “current” in the fashionable sense, but it is still around because it remains genuinely useful.

If your goals are:
- to learn ComfyUI without fighting your machine,
- to use older LoRAs,
- to explore a huge body of community workflows,
- and to keep your hardware on speaking terms with you,

then SD 1.5 still makes a lot of sense.

Its strengths are gloriously unglamorous:
- a massive ecosystem,
- endless tutorials,
- lighter files,
- less hardware pressure,
- and broad compatibility with older LoRAs and finetunes.

The downsides are also fairly obvious:
- prompt understanding is older-generation,
- composition is less consistent than newer models,
- text rendering is not exactly a triumph.

A common `v1-5-pruned-emaonly.safetensors` file is about 4.27GB. On a 16GB Apple Silicon machine, that is comparatively manageable.

---

## SD 2.1: perfectly usable, just not usually the first pick now

SD 2.1 sits in an awkward middle seat.

It is not bad. It is simply wedged between two stronger practical choices:
- if you want a lighter ecosystem with tons of community assets, people often go back to SD 1.5;
- if you want stronger overall image quality and more modern behaviour, people usually jump to SDXL.

So SD 2.1 tends to be a “you probably know why you are here” model.

---

## SDXL: one of the best balanced starting points

If someone asked me where to start in 2026 on a local Mac setup without immediately marching into heavyweight model territory, I would point at **SDXL** first.

Why?

- It feels like a newer generation than SD 1.5.
- Prompt following and composition are generally stronger.
- The ecosystem is large enough to be useful without feeling dead.
- ComfyUI support is mature.

The common SDXL base safetensors file is roughly 6.94GB, which is clearly larger than SD 1.5 but still within practical territory for a Mac mini M4 with 16GB.

---

## LCM: not a separate kingdom, but a way of making existing models move faster

LCM is often misunderstood because the name sounds like it ought to be a complete model family of its own.

A cleaner way to think about it is this:

> **LCM is an acceleration technique, often packaged as a distilled adapter for an existing model.**

Its big trick is reducing the number of inference steps dramatically. That is useful when:
1. you want quick previews,
2. your machine can run the workflow but you do not fancy waiting ages for every test image.

The LoRA itself is relatively small. `lcm-lora-sdxl`, for instance, is listed at 197M on its model card.

---

## SDXL Turbo: built for fewer steps from the start

LCM feels like bolting a speed kit onto an existing car.

**SDXL Turbo** is more like buying a car designed to move quickly in the first place.

### Turbo vs LCM
- **LCM** is an acceleration technique or adapter.
- **Turbo** is a model trained specifically for low-step generation.

Both are about speed. They simply get there differently.

---

## Flux: tempting, impressive, and very good at bullying smaller machines

Black Forest Labs’ FLUX.1 family has a lot going for it. Prompt understanding is strong. Composition is strong. Realism is often excellent.

But on a 16GB Apple Silicon machine, here is the practical truth:

> **Flux is runnable. That is not the same as pleasant.**

### FLUX.1 dev
`FLUX.1 [dev]` is a 12B parameter rectified flow transformer. It is the quality-focused member of the pair and it can produce lovely images.

It is also heavier:
- large model,
- heavier load times,
- larger supporting assets,
- more workflow baggage around text encoders and optional quantised paths.

### FLUX.1 schnell
`FLUX.1 [schnell]` is also a 12B parameter model, but it is positioned for faster generation. If you want to try Flux without immediately jumping into the deepest end of the pool, schnell is usually the kinder first stop.

### Schnell vs Turbo vs LCM
- **Schnell** is the quick member of the Flux family.
- **Turbo** is the quick member of an SDXL-derived family.
- **LCM** is a speed technique rather than a single model family.

---

## Pony: less a model, more a whole community accent

Pony Diffusion is not an official base model in the same sense as SDXL or FLUX. It is better understood as a strong community finetune ecosystem with its own expectations and habits.

If you spend any time around anime, stylised character work, or fan-art-adjacent circles, Pony turns up constantly.

---

## HiDream-I1: impressive, but not exactly polite to small local setups

HiDream-I1 is one of the more interesting newer open image model families. Its official model card describes it as a 17B parameter image generation foundation model.

Which is where the practical issue appears:
- 17B parameters,
- newer architecture,
- heavier companion assets,
- very large model shards.

Even a ComfyUI-oriented FP8 diffusion model sits in the teens of gigabytes. That does not make it impossible on a Mac mini M4 with 16GB. It does make it distinctly ungraceful.

---

## Why do so many people stop at SDXL rather than marching straight into Flux or HiDream?

Because choosing a model is not the same thing as choosing the most glamorous benchmark contender.

Most practical decisions look more like this:
- **SD 1.5** for lower overhead and older community assets,
- **SDXL** for the best balance,
- **Flux** for stronger quality at a higher workflow cost,
- **HiDream** for newer frontier curiosity, not necessarily comfortable daily use.

So if you asked me for a Mac mini M4 16GB ranking, mine would be:

### Safest starting points
1. **SDXL**
2. **SD 1.5**

### Best if speed matters
1. **SDXL + LCM**
2. **SDXL Turbo**
3. **FLUX.1 schnell**, if you are willing to accept a heavier stack

### Best if quality matters and you are patient
1. **FLUX.1 dev**
2. **HiDream-I1**

---

## Why does SDXL LCM often look a bit plasticky?

Usually because:
1. **LCM prioritises speed, not peak image quality.**
2. **Low-step generation tends to flatten finer detail.**
3. **Some SDXL base workflows, without additional tuning or LoRAs, can make skin and materials look overly smooth.**
4. **Fast preview workflows often optimise for “image appears quickly” before “surface texture looks photographic”.**

That is why people often add realism-oriented LoRAs afterwards.

---

## So what should you pick?

### If you just want local image generation working
Pick **SDXL** or **SD 1.5**

### If you want quick feedback
Pick **SDXL + LCM** or **SDXL Turbo**

### If you want anime, character work, and strong community style
Pick **Pony** or an anime-focused SD 1.5 / SDXL finetune

### If you want stronger realism and prompt understanding
Pick **FLUX.1 dev**, but only if you are comfortable with a heavier workflow

### If you want to poke the frontier
Pick **HiDream-I1**, with realistic expectations about memory pressure

---

## My boring but survivable recommendation

If I were setting up a Mac mini M4 with 16GB today, I would follow this order:

### Stage 1: stay alive
- SDXL
- or SD 1.5

### Stage 2: make it faster
- SDXL + LCM
- or SDXL Turbo

### Stage 3: start chasing higher ceilings
- FLUX.1 schnell
- then FLUX.1 dev if you really want to

### Stage 4: only once you know what you are doing
- HiDream
- heavier Flux workflows
- niche community-specialised models

---

## One simple takeaway

> **SDXL is the best balanced all-round starting point for a 16GB Mac, SD 1.5 is the easiest old friend, Flux is excellent but heavier, and HiDream is exciting but not where I would begin.**

Next up, we stop talking about model choice in the abstract and move on to the practical mess:
- what checkpoints, clips, loras, and vae files actually are,
- where they go,
- when you need LCM adapters, T5XXL, GGUF, or FP8 files,
- and why Flux workflows so often open like a small red-node apocalypse.

## Image Asset Plan

No image is strictly necessary for this article.  
If we later add one, the most useful option would be a single SVG model selection map rather than a pile of decorative comparison graphics.

1. filename: comfyui-model-selection-map.svg
   purpose: show the positioning of SD 1.5, SDXL, LCM, Turbo, Pony, Flux, and HiDream in one glance
   placement: after the comparison table
   alt: Model selection map for common ComfyUI image models
   prompt: Create a clean blog-friendly SVG decision map comparing SD 1.5, SD 2.1, SDXL, LCM, SDXL Turbo, Pony Diffusion, FLUX.1 dev, FLUX.1 schnell, and HiDream-I1. Use soft colours, rounded rectangles, minimal labels, and clear grouping by base models, acceleration models, and community finetunes. Emphasise speed, quality, and memory pressure.
