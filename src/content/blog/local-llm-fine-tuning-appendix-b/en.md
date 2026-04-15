---
title: "Local LLM Fine-Tuning, Explained Appendix B | Commands, warnings and troubleshooting quick reference"
description: ""
categories: ["ai"]
tags: []
date: 2026-04-12T05:00:00
series: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO"
seriesOrder: 11
---

This appendix is not another tutorial, and it is not a compressed rewrite of the main series.

It is closer to a field card.

If Appendix A is the terminology index,  
Appendix B is the thing you want when:
- you are stuck and need to know where to look first
- you want to identify which layer a failure belongs to
- you need to distinguish annoying warnings from real blockers
- you want the least self-destructive command path back to a working state

The goal here is not elegance.  
The goal is to help you wake up ten minutes earlier next time.

---

## 1. Minimum runnable command path

### 1. Enter the project and virtual environment
```bash
cd ~/llama31-lora-lab
source .venv/bin/activate
```

### 2. Confirm critical imports
```bash
python -c "import torch; import transformers; import peft; import trl; print('ok')"
```

### 3. Smallest training entry
```bash
python train_lora.py
```

### 4. Smallest DPO entry
```bash
python train_dpo.py
```

### 5. Smallest comparison entry
```bash
python compare_lora.py
python compare_dpo.py
```

### 6. Common route back to Ollama
```bash
python merge_lora.py
ollama create my-model -f ./Modelfile
ollama run my-model
```

---

## 2. Four-layer failure diagnosis

The most useful diagnostic framework from the whole journey was not memorising every error string.  
It was learning to separate failures into layers.

### Type A: environment layer
Typical signs:
- `ModuleNotFoundError`
- running from `~` instead of the project directory
- forgetting to enter `.venv`

Most common fix:
```bash
cd ~/llama31-lora-lab
source .venv/bin/activate
```

### Type B: text / shell / Python syntax layer
Typical signs:
- `SyntaxError`
- `kimport torch`
- heredoc leftovers inside `.py`
- pasting Python into zsh

Most common fix:
- run `head -20 filename.py`
- check whether the first lines are really Python
- if unsure, rebuild the file cleanly rather than patching one line

### Type C: API / version-compatibility layer
Typical signs:
- `TypeError: unexpected keyword argument ...`
- trainer args rejected
- local behaviour does not match the docs

Most common fix:
```bash
python -c "import trl; print(trl.__version__)"
python - <<'PY'
from trl import DPOConfig
import inspect
print(inspect.signature(DPOConfig.__init__))
PY
```

### Type D: resource layer
Typical signs:
- OOM
- MPS allocated / max allowed
- failure at `optimizer.step()`
- generation looking dead but actually being very slow

Common directions:
- reduce `max_length`
- reduce trainable scope
- use LoRA instead of partial FT
- shorten compare samples
- use forward-only smoke tests first

---

## 3. Common warning quick reference

### `torch_dtype` is deprecated! Use `dtype` instead!
Meaning:
- the old argument still works
- but the API is moving towards `dtype`

Judgement:
- **not fatal**
- worth cleaning up later

---

### `temperature` / `top_p` may be ignored
Common cause:
- `do_sample=False`

Meaning:
- you are not running a sampling generation path
- therefore sampling parameters are being ignored

Judgement:
- **not fatal**
- just a configuration mismatch

---

### `pin_memory` not supported on MPS
Meaning:
- this setting does not really help in your current MPS route

Judgement:
- **not fatal**
- if it is noisy, set `dataloader_pin_memory=False`

---

### tokenizer mismatch / prompt mismatch warnings
Often appears in DPO or chat-template-heavy flows.

Meaning:
- prompt-only tokenisation and prompt-plus-answer tokenisation do not align cleanly

Judgement:
- not always fatal in a smoke test
- should be fixed in a real dataset

Typical fixes:
- clean whitespace
- standardise chosen / rejected prefixes
- avoid having one answer begin with `Answer:` while the other does not

---

## 4. Common “stuck” situations and first reactions

### Situation 1: model loading takes forever
Check first:
- access rights
- pending gated access
- Hugging Face auth
- paths

---

### Situation 2: `python compare_dpo.py` hangs at `Generating...`
Do not immediately assume it is broken.  
Think:
- 8B
- MPS
- adapter
- autoregressive `generate()`

First fixes:
- switch to forward-only
- shorten the answer
- move to chosen/rejected margin comparison

---

### Situation 3: failure at `optimizer.step()`
Suspect first:
- optimiser states
- too many trainable weights
- partial FT exceeding what the machine can hold

---

### Situation 4: `ollama create` cannot find Modelfile or safetensors
Check first:
- current working directory
- `-f` path
- Modelfile syntax
- whether `FROM` points to a complete model or to a route Ollama can actually ingest

---

## 5. Common failure patterns and what to do next

### Pitfall 1: shell commands accidentally saved inside Python files
Symptom:
- `cat > file.py <<'EOF'` appears inside `.py`

Fix:
- rebuild the file cleanly
- do not try to salvage it line by line unless you are certain

---

### Pitfall 2: running from the home directory instead of the project
Symptom:
- packages appear missing
- files cannot be found
- something that worked before now looks gone

Fix:
```bash
cd ~/llama31-lora-lab
source .venv/bin/activate
```

---

### Pitfall 3: assuming slow generation means a broken model
Fix:
- run a forward-only smoke test
- then try a shorter generation
- then fall back to margin comparisons

---

### Pitfall 4: assuming quantisation will fix model quality
Fix:
- first decide whether you have a speed disease or a quality disease
- quantisation mainly fixes slow, not stupid

---

### Pitfall 5: assuming a pretty loss curve means the model deserves to survive
Fix:
- always compare variants
- always inspect prompts directly
- always test in actual use

---

## 6. The most stable debugging order

If you get stuck again, this order is worth keeping:

### Step 1: decide which layer the problem belongs to
Environment, syntax, API compatibility or resource/runtime.

### Step 2: run the smallest smoke test
- can it import?
- can it load?
- can it do one forward pass?
- can it do the shortest possible generation?

### Step 3: only then inspect the training recipe
For example:
- target scope too wide
- sequence too long
- partial FT too heavy

### Step 4: only after that move to packaging and deployment
Do not misdiagnose a training failure as a deployment problem, or the other way round.

---

## 7. Principles worth remembering

- Not every red line is the same kind of emergency.
- “Stuck” often means “too heavy”, not “broken”.
- Pipeline success is not the same as model success.
- Quantisation is not a quality repair tool.
- The best mainline is not the flashiest version; it is the most stable one.
