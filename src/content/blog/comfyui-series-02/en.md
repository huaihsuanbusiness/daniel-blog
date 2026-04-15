---
title: "ComfyUI Series 02 | Installing ComfyUI on a Mac mini M4: get Python, PyTorch and MPS sorted first, and life gets easier later"
description: "Who is this for? Anyone who has decided to use ComfyUI and now wants a clean, workable install on a Mac mini M4 with 16GB. We’re not doing the full model menagerie yet, and we’re definitely not diving into Flux on day one. This piece is about laying a sane foundation."
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:11:00
featured: false
---

> Who is this for?  
> Anyone who has decided to use ComfyUI and now wants a clean, workable install on a Mac mini M4 with 16GB.  
> We’re not doing the full model menagerie yet, and we’re definitely not diving into Flux on day one. This piece is about laying a sane foundation.

If you’ve just come from the previous article, you’re probably at the point where all of this becomes very practical very quickly: right, how do I actually install the thing?

This is where people usually fall into a mildly cursed research spiral.

One guide tells you to use the Desktop app.  
Another says to `git clone` everything manually.  
A third tells you to use Conda.  
Somebody insists you need nightly PyTorch or MPS will misbehave.  
Somebody else insists nightly is a terrible idea.  
Then you find a copy-pasted command list that somehow never mentions `requirements.txt`, as though Python dependencies are a state of mind.

That is how people end up learning how to break a Python environment before they’ve generated a single image.

So here’s the principle I’m using for this article:

> **On the first install, don’t optimise for least effort. Optimise for recoverability.**  
> If you spend a little more time now understanding Python, virtual environments, PyTorch and `requirements.txt`, you’ll have a much easier time later when you start adding models, custom nodes, and weird edge-case dependencies.

The route I’m recommending here is:

- **manual install**
- **a dedicated virtual environment**
- **stable PyTorch first**
- **nightly only if you have a confirmed reason**
- **get ComfyUI itself running before you pile on models and extras**

## Why I’m not using the Desktop app as the main route

To be clear, the Desktop app is not a bad option.  
ComfyUI now has a macOS Desktop build, and the official docs explicitly support Apple Silicon. If you simply want to get going quickly, it’s a sensible path.

But the rest of this series is going to cover things like:

- checkpoints, clips, loras and vae folders
- LCM adapters
- Flux, GGUF, T5XXL and FP8
- custom nodes
- dependency conflicts
- model paths
- workflow import and debugging

Once you’re in that territory, **being able to see the environment clearly** becomes a real advantage.

The Desktop app is excellent for “I want images tonight”.  
This article is about “I don’t want to be completely lost two weeks from now when something breaks”.

## Which Python version should you use?

This is one of those points where the internet manages to be both technically correct and oddly unhelpful at the same time.

ComfyUI’s current system requirements lean towards newer Python versions, including 3.13, with 3.12 presented as a good fallback. That all makes sense.  
But once you factor in third-party custom nodes, I’d still err slightly on the conservative side for the first build:

> **Use Python 3.12 for the initial setup.**

That isn’t because 3.13 is bad. It isn’t. It’s because 3.12 is, in many cases, a bit more boring.

And boring, in installation work, is usually rather good.

If you’re the sort of person who likes staying on the newest officially supported branch, you can absolutely go with 3.13. If you want the path that is most likely to keep the floor level while you build the rest of the stack, 3.12 is still a sensible choice.

## What PyTorch, Metal and MPS actually mean

Before throwing commands at the terminal, it’s worth naming the moving parts properly.

### What is PyTorch?

PyTorch is the deep learning framework. In plain English, it’s the thing that actually lets the model run on the CPU or GPU.

ComfyUI doesn’t talk directly to your hardware in some mystical way. It relies on PyTorch for the heavy lifting.

### What is Metal?

Metal is Apple’s graphics and compute framework. On Apple Silicon, a lot of GPU work ultimately runs through Metal.

### And MPS?

MPS means **Metal Performance Shaders**. In the PyTorch context, it’s effectively the backend layer that lets PyTorch use the Apple GPU.

A rough mental model would be:

- **Metal** is the motorway
- **MPS** is the slip road onto it
- **PyTorch** is the bit actually driving the model there

So when you’re setting up ComfyUI on a Mac, the important question isn’t whether you have a discrete GPU in the old PC sense. The important question is:

> **Is your PyTorch install actually using the MPS backend properly?**

## Why do the docs support Apple Silicon, but still keep mentioning nightly?

This confuses people all the time, and understandably so.

If you look at Apple’s Metal + PyTorch guidance, or some of the ComfyUI troubleshooting material around Apple Silicon, you’ll still see references to nightly or preview builds. That’s because newer MPS fixes and operator support often show up there first.

At the same time, newer ComfyUI system requirements are much calmer about Apple Silicon than they used to be. M1 through M4 are all explicitly supported, and the tone is no longer “here be dragons”.

Those two things are not actually contradictory.

My reading is:

- **nightly** is for when you specifically need the newest fixes
- **stable** is for when you want fewer variables while you get the base install working

So my recommendation is:

> **Start with stable PyTorch. If you later hit a confirmed MPS-specific problem, then consider moving to nightly.**

That’s a more useful engineering order than introducing extra moving parts on day one.

## Before you begin

A few very boring checks first, because boring checks save time:

- make sure you’re on an Apple Silicon Mac, so M1, M2, M3 or M4
- don’t do this on an ancient macOS version
- leave yourself at least **20GB to 40GB** of free space to breathe
- don’t mix half a dozen Python sources if you can help it  
  system Python, Homebrew Python, Conda, and leftovers from another UI is how people create archaeology projects

The main enemy during installation isn’t slowness. It’s mess.

## Step 0: install the base tools

Open Terminal and run:

```bash
xcode-select --install
brew update
brew install git python@3.12
```

### What these commands are doing

- `xcode-select --install`  
  Installs the command-line developer tools that Python packages often expect.

- `brew update`  
  Refreshes Homebrew’s package index.

- `brew install git python@3.12`  
  Installs Git and Python 3.12.

Then check what actually got installed:

```bash
git --version
/opt/homebrew/bin/python3.12 --version
```

If your Homebrew path differs, find it first with:

```bash
which python3.12
```

## Step 1: clone the official ComfyUI repository

Pick a tidy place for local AI tools. I tend to use something like `~/ai` rather than stuffing everything into Downloads and regretting it later.

```bash
mkdir -p ~/ai
cd ~/ai
git clone https://github.com/Comfy-Org/ComfyUI.git
cd ComfyUI
```

At this point, you should have a `~/ai/ComfyUI` directory.

## Step 2: create a dedicated virtual environment

This bit is important. Don’t be tempted to spray packages into system Python and hope for the best.

```bash
/opt/homebrew/bin/python3.12 -m venv .venv
source .venv/bin/activate
python --version
```

If your Python 3.12 lives somewhere else, use that path instead of `/opt/homebrew/bin/python3.12`.

Once the environment is activated, your shell prompt will usually show `(.venv)`.

### What the virtual environment is actually doing

It gives this project its own self-contained Python space.  
Torch, numpy, SQLAlchemy, custom-node dependencies and the rest can live there without trampling across the whole machine.

It’s not glamorous, but it saves a lot of grief.

## Step 3: upgrade pip first

This step is easy to skip and often worth doing anyway:

```bash
python -m pip install --upgrade pip setuptools wheel
```

There’s no magic here. It simply reduces the chance of installer weirdness caused by stale packaging tools.

## Step 4: install PyTorch

Now we put the actual model runtime in place.

For the initial setup, I’d start with the stable PyTorch route:

```bash
pip install torch torchvision torchaudio
```

Stable PyTorch on Apple Silicon already includes MPS support, so there’s no need to reach straight for nightly unless you know why you’re doing it.

### How to check whether MPS is visible

Run:

```bash
python -c "import torch; print(torch.__version__); print('MPS available:', torch.backends.mps.is_available())"
```

If you see `MPS available: True`, that’s a good sign.

### What if it says False?

Don’t panic and don’t immediately blame ComfyUI.

Check the obvious things first:

- are you using the correct Python?
- did you actually activate `.venv`?
- is macOS old enough to cause trouble?
- did pip install torch into a different environment?
- have you accidentally mixed in Rosetta or some other odd path?

If all of that checks out and you still have a genuinely MPS-specific problem, that is the point where nightly becomes worth considering.

## Step 5: install ComfyUI’s Python dependencies

This is where a lot of guides suddenly go vague, and where quite a few first installs go wrong.

```bash
pip install -r requirements.txt
```

This step is **not optional**.

A surprisingly common mistake is to install PyTorch, assume the hard part is done, and then launch ComfyUI before the rest of its dependencies are in place. That is how you get a quick lesson in missing modules.

## What is `requirements.txt`?

Think of it as the project’s dependency list.  
It tells pip which Python packages the project expects to have available.

So `pip install -r requirements.txt` really means:

> install everything this project says it needs

If you skip it, ComfyUI may still look as though it’s trying to start, but the odds of it face-planting into import errors go up sharply.

## Why do people often trip over `SQLAlchemy` here?

Because a lot of people get to Step 4, install torch successfully, feel encouraged, and jump straight to `python main.py`.

Then they hit something like:

```text
ModuleNotFoundError: No module named 'sqlalchemy'
```

At that point, the best first response is usually not to go on a panicked internet scavenger hunt. It’s to go back and do the boring but correct thing:

```bash
pip install -r requirements.txt
```

### What is SQLAlchemy?

SQLAlchemy is a very common Python database toolkit.  
You do not need to become an expert in it for this article. You only need to understand this:

> it is not some random alien error message, it is simply one of the dependencies your environment is missing

So when you see that sort of problem, check these first:

- are you in the right virtual environment?
- did `requirements.txt` actually finish installing?
- are pip and python pointing to the same environment?

## Step 6: launch ComfyUI for the first time

Once the environment is ready, try starting it:

```bash
python main.py
```

If all goes well, ComfyUI will start and expose a local interface, usually at:

```text
http://127.0.0.1:8188
```

At this stage, your goal is very modest:

> **confirm that ComfyUI itself launches, the terminal is not throwing a tantrum, and MPS at least appears to be available**

Don’t worry about the full model zoo yet.

## The most common installation mistakes

Here are the ones that come up over and over again.

### Mistake 1: forgetting to enter the virtual environment

Symptoms:
- you know you installed torch
- you know you ran `requirements.txt`
- ComfyUI still says modules are missing

Very often, that means you installed packages in one environment and launched in another.

Go back to the project root and run:

```bash
source .venv/bin/activate
which python
which pip
```

Make sure both `python` and `pip` point into `.venv`.

### Mistake 2: trying to launch straight after torch

This is the classic “Step 4 looked successful, so I got excited” problem.

A cleaner order is:

1. create the venv  
2. install torch  
3. run `pip install -r requirements.txt`  
4. launch ComfyUI

It sounds obvious written out like that. In practice, people skip Step 3 all the time.

### Mistake 3: MPS isn’t being picked up

Symptoms:
- ComfyUI launches
- performance seems odd
- `torch.backends.mps.is_available()` is `False`

Before blaming the app, check the Python environment, the torch install location, the macOS version, and whether you’ve mixed in another session or another environment.

### Mistake 4: the dependency install only half-worked

This happens more often than people think, especially if the network drops mid-install.

You think everything completed. In reality, one or two packages are broken or incomplete. A practical first response is often:

```bash
pip install -r requirements.txt --force-reinstall
```

And if the environment has become too messy, deleting `.venv` and recreating it can be quicker than trying to nurse it back to health.

## My basic rules for a first install

If you only remember a few things from this piece, make them these:

- **don’t mix environments**
- **don’t skip `requirements.txt`**
- **start with stable, move to nightly only if you need to**
- **get it launching cleanly before you chase peak speed**
- **understanding what you installed is worth more than pressing a one-click button**

A lot of local-AI guides make installation look as though it’s three commands and a prayer, then quietly hide all the awkward bits. Those guides feel slick right up until something breaks, at which point they’re no help at all.

## One practical note before we move on

If you only want to see an image as quickly as possible, the Desktop build still has a perfectly valid place.

But if you intend to keep ComfyUI as your main line, and later add models, LoRAs, VAEs, Flux components, and custom nodes, I’d say this quite plainly:

> **doing a clean base install now usually saves time overall, even if it feels a touch slower on day one**

Next, we’ll move on to what happens after launch: what `127.0.0.1:8188` actually is, whether Terminal needs to stay open, and how tmux or background services fit into the picture.
