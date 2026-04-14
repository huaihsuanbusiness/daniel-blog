---
title: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO — Appendix A | Term Dictionary and Level Mapping Table"
description: "when you see a term and want to know what it is, which layer it belongs to, and where you would actually change it, this is where you should be able to find a usable answer quickly."
categories: ["ai"]
tags: []
date: 2026-04-11T05:00:00
series: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO"
seriesOrder: 10
---
This appendix is not meant to retell the whole series.

Its job is simpler:


The main series is the map.
This appendix is the pocket index.

---

## 1. Layer map at a glance

| Term | Closest layer | Plainest interpretation |
|---|---|---|
| Single request | application / interaction layer | what you actually send into the model this time |
| System Prompt | prompt / system layer | the director’s role note for the actor |
| TEMPLATE / Chat Template | prompt-format layer | the script format for the dialogue |
| MESSAGE / few-shot | prompt-demonstration layer | a few sample performances |
| PARAMETER | inference / runtime layer | shooting-style controls like temperature and top-p |
| Modelfile | service / packaging layer | the whole production brief |
| tokenizer | input encoding layer | the translator that turns text into tokens |
| base model weights | model-weight layer | the actor’s original brain and training base |
| adapter / LoRA | parameter-increment layer | a trainable prosthetic or muscle-memory increment |
| DPO / SFT | training-method layer | how you choose to teach the model |
| merge | deployment conversion layer | folding the increment back into a full model |
| quantization | deployment optimisation layer | making the model lighter to run locally |
| Ollama | local service layer | packaging the model into a runnable local service |

---

## 2. Core glossary

### base model
The starting point for all later customisation.
If it is a raw base, it is closer to pretrained foundation. If it is instruct, it has already gone through instruction tuning.

### instruct
A version that has already been trained to follow instructions and interact more usefully.
Most of your own experiments sat on `Llama-3.1-8B-Instruct`.

### weights
The model’s real parameters.
If prompts are role notes and templates are script format, weights are the actor’s original brain and training.

### adapter
A separate trainable weight block attached to the base model.
It can be stored separately and does not have to be merged.

### fine-tuned adapter
An adapter that has already been trained, such as:
- `adapter_model.safetensors`
- `adapter_config.json`

### LoRA
Low-Rank Adaptation.
A PEFT route that changes model behaviour through a relatively small number of trainable parameters. LoRA is not a training objective. It is an update strategy.

### PEFT
Parameter-Efficient Fine-Tuning.
The broader family of methods that aim to avoid opening the whole model.

### SFT
Supervised Fine-Tuning.
Teaching the model how to answer through target demonstrations.

### LoRA SFT
Doing SFT through a LoRA-based PEFT route.

### DPO
Direct Preference Optimization.
Teaching the model through `prompt + chosen + rejected` preference pairs.

### TRL
Transformers Reinforcement Learning.
The Hugging Face-adjacent library that provides common trainers for SFT, DPO and other alignment-style workflows.

### SFTTrainer
A trainer built around demonstration-style supervised fine-tuning.

### DPOTrainer
A trainer built around preference data with chosen and rejected answers.

### tokenizer
Turns text into tokens and often cooperates with chat templates in chat-style models.

### chat template
The formatting logic that arranges system, user and assistant turns into the sequence the model expects.

### prompt-completion
A simple data format:
- prompt
- completion

### conversational
A chat-style format:
- messages
- assistant reply

### few-shot
Putting a few demonstrations directly into the prompt context.
This does not write into model weights. It writes into the current request.

### prefix tuning
A tuning route closer to parameter space than plain prompting, but usually still lighter than LoRA.

### prompt tuning
A route where a small learnable prompt representation is trained rather than opening large sections of the model.

### q_proj / k_proj / v_proj / o_proj
Core projection layers inside transformer attention.
Your baseline and qkvo routes were mainly deciding how much of this region to touch.

### all-linear
A shorthand for applying LoRA to a broader set of linear modules, not just the main attention projections.

### target_modules
The `LoraConfig` field that decides where LoRA will be attached.

### layers_to_transform
Decides on which layers those target modules will be modified.

### layers_pattern
Helps match the correct model-layer structure when doing selective layer targeting.

### model.model.norm
A normalisation layer near the output end of the model.
Opening it can have a strong effect and a high cost.

### lm_head
The output head that maps hidden states to vocabulary logits.
Also very sensitive because of how close it is to final outputs.

### partial FT
Partial fine-tuning.
Opening only some original weights rather than the entire model.

### full fine-tune
Opening and training the original model weights much more broadly or completely.

### merge
Folding the adapter’s learned increment back into the base model weights.

### Safetensors
A weight-file format.
Not a model category.

### GGUF
A weight-container format common in local quantised inference ecosystems.

### quantization
Replacing heavier high-precision weight representations with lighter ones so the model is easier to run locally.

### fp32 / fp16
Higher-precision representation families.
Heavier than q-formats.

### q4 / q4_0 / q4_K_M
Common 4-bit quantised families and variants.
The main thing to remember is that they are much lighter than fp16.

### blob
Usually not a separate model, but an internal stored object or layer artefact in a toolchain.

### Modelfile
Ollama’s packaging blueprint.
It can define:
- FROM
- SYSTEM
- TEMPLATE
- PARAMETER
- MESSAGE
- and some model-source paths

### Ollama
A local model service and packaging tool.
It turns model artefacts into something you can actually run locally.

---

## 3. Common parameter map

### `r`
One of the main LoRA capacity knobs.
Not automatically better when larger.

### `lora_alpha`
A scaling factor for LoRA influence.
Not the learning rate, but still important.

### `learning_rate`
The size of each parameter update step.
Not something you should always maximise.

### `num_train_epochs`
How many full passes through the dataset are performed.

### `max_length`
How long each example is allowed to be.
Longer is heavier.

### `gradient_accumulation_steps`
Accumulate gradients over several smaller steps before updating.
A way of trading time for memory.

### `dataloader_pin_memory`
Often discussed in CUDA contexts; in your MPS experiments it was not especially helpful.

### `temperature`
Controls sampling spread.
Only meaningful when sampling is enabled.

### `top_p`
A sampling control, again mostly meaningful when sampling is actually enabled.

### `do_sample`
Whether generation is running in sampling mode or deterministic mode.

---

## 4. Sentences worth remembering

- SFT teaches the model how to answer; DPO teaches the model which answer to prefer.
- LoRA is an update strategy, not a training objective.
- A Modelfile is not just a longer system prompt; it is a higher-level packaging blueprint.
- Adapters do not have to be merged; merge is simply convenient for some deployment paths.
- Quantization can rescue slowness, but not necessarily stupidity.
- The best mainline is not the most dramatic version, but the one that preserves the base while actually solving the problem.

#