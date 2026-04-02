---
title: "ComfyUI Series 03 | Don’t just click about blindly: `127.0.0.1:8188`, your first image, tmux, background runs, and what happens after a reboot"
description: "Who is this for? Anyone who has managed to install ComfyUI, but is now staring at the interface wondering what on earth to do next. If you haven’t installed it yet, read the previous piece first. This one assumes ComfyUI already launches on your Mac."
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:12:00
featured: false
---

> Who is this for?  
> Anyone who has managed to install ComfyUI, but is now staring at the interface wondering what on earth to do next.  
> If you haven’t installed it yet, read the previous piece first. This one assumes ComfyUI already launches on your Mac.

Getting ComfyUI installed and getting properly comfortable with it are not the same thing.

A very common pattern looks like this: `python main.py` works, the browser opens, the interface appears, and then everything goes slightly foggy. Which workflow should you load first? Where do you choose the model? Do you need to keep Terminal open forever? Is tmux optional, or one of those things everyone pretends is optional until it clearly isn’t?

So this piece keeps things deliberately plain. No Flux yet. No fancy custom nodes. No workflow flexing. The only job here is to turn ComfyUI into something you can still use tomorrow without having to mentally re-install it from scratch.

Here’s the main point:

> **For your first round, don’t optimise for “most powerful”. Optimise for repeatable.**  
> If you can open `127.0.0.1:8188`, load a workflow, select a model, generate one image, find the output, and recover cleanly when the process stops, you’re in good shape.

## First, be clear about what `127.0.0.1:8188` actually is

If you followed the manual installation path from the previous article, you’re probably opening:

```text
http://127.0.0.1:8188
```

That address tells you two things:

- `127.0.0.1` means **localhost**, so you’re connecting to the same machine you’re sitting on
- `8188` is the **port** the ComfyUI web server is listening on

In other words, this is not a public website and it is not some remote control panel in the cloud. It is your own Mac talking to a local ComfyUI server process. If that process is not running, the page will not load.

So if the browser suddenly shows a blank page, times out, or refuses to connect, don’t leap straight to blaming the network. Check whether the ComfyUI process in Terminal is still alive.

One small clarification is worth adding here. ComfyUI Desktop and manual installs don’t always use the same port defaults. This series is built around the **manual install path**, so I treat `8188` as the baseline throughout.

## What you’re actually looking at when ComfyUI opens

The first time people open ComfyUI, a lot of them have the same reaction: “Has it finished loading?”

Usually yes. That’s just what it looks like.

The main parts to recognise are:

1. **The central node canvas**  
   This is where the workflow lives. Each box is a node. The lines are data flow.

2. **The Queue or Run controls**  
   Nothing really happens until you tell ComfyUI to execute the workflow.

3. **Model-related selectors inside nodes**  
   Checkpoints, VAEs, LoRAs and similar components tend to be chosen in the nodes that need them.

4. **The preview or output area**  
   Once a run finishes, this is where you’ll see the image and usually save or inspect it.

If the canvas looks empty, it doesn’t mean anything is broken. It usually just means you haven’t loaded a workflow yet.

## For your first image, follow a very boring SOP

That is not an insult. Boring is exactly what you want.

### Step 1: Make sure ComfyUI is actually running

Start it in Terminal, for example:

```bash
cd ~/ComfyUI
source .venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188
```

Then open:

```text
http://127.0.0.1:8188
```

If the page loads, leave everything else alone for a moment. Resist the urge to outsmart yourself early.

### Step 2: Load a basic text-to-image workflow

You usually have three sensible options:

#### Option A: Use a built-in template

Recent ComfyUI builds include workflow templates. For beginners, this is the cleanest way to start. A basic text-to-image template is far better than assembling a graph from an empty canvas while still learning what the pieces are called.

#### Option B: Open a workflow JSON file

If someone has shared a workflow as a `.json`, load that. It’s a very normal way to exchange working setups.

#### Option C: Drag in a PNG that contains workflow metadata

This is one of ComfyUI’s more useful habits. If an image was saved with workflow metadata embedded, you can drag the image into ComfyUI and it will reconstruct the graph that made it.

That’s why people sometimes share a generated image instead of a separate JSON file. The workflow can travel with the image.

## The first nodes you should learn to recognise

You do not need to memorise the whole ecosystem yet. But you should get comfortable spotting these regulars:

- **CheckpointLoaderSimple**  
  Loads the main checkpoint.

- **CLIP Text Encode**  
  Turns your prompt into text embeddings the model can use.

- **Empty Latent Image**  
  Sets the canvas dimensions.

- **KSampler**  
  Handles the actual denoising and generation step.

- **VAE Decode**  
  Converts latent output into an image you can see.

- **Save Image**  
  Writes the result to disk.

If those nodes are present, you’re usually looking at a sensible basic workflow rather than a pile of decorative confusion.

## Model selection: keep it boring for the first run

A very common beginner mistake is not “wrong settings”, but **too many moving parts too early**.

For your first run, keep it simple:

1. install **one main checkpoint**
2. make sure **CheckpointLoaderSimple** is actually pointing at it
3. don’t pile on random LoRAs, VAEs, ControlNet branches, or extra tricks yet

If your checkpoint does not appear in the dropdown, the answer is rarely mystical. It is usually sitting in the wrong folder. We’ll unpack that properly in the later model-installation article.

## Prompts: aim for repeatable, not miraculous

For the very first image, use a straightforward prompt. Something like:

```text
a cosy Taipei alley at night, cinematic lighting, realistic photo
```

If your workflow includes a negative prompt, keep that simple too:

```text
blurry, low quality, deformed
```

The first run is not about making a masterpiece. It’s about proving the pipeline works end to end:

- the model loads
- the prompt gets encoded
- the sampler runs
- the image is generated
- the output lands somewhere you can actually find

Once those basics work, then it makes sense to start fussing over samplers, steps, styles, and adapters.

## Where do generated images actually go?

By default, ComfyUI writes output into the **`output/` folder inside your ComfyUI project directory**.

So if your install lives at:

```text
~/ComfyUI
```

your images will usually end up in:

```text
~/ComfyUI/output/
```

This is worth fixing in your mind early, because half the “it didn’t save” panic moments are really just “I forgot where ComfyUI puts things”.

## The real core of ComfyUI isn’t the interface. It’s the workflow file

A lot of people assume ComfyUI is mostly about clicking around the graph editor. After a few days, it becomes obvious that the real centre of gravity is the **workflow itself**.

Workflows can be saved as JSON. That matters because it means:

- you can version them
- you can archive them
- you can share them
- you can reuse them
- you can later submit them through the API instead of manually clicking buttons

That’s why I’d suggest building a tiny personal `image-generation` SOP sooner rather than later. It does not need to be elegant. Even this would do:

```text
1. Start ComfyUI
2. Open 127.0.0.1:8188
3. Load a text-to-image workflow
4. Confirm the checkpoint is correct
5. Enter the prompt
6. Run or queue the job
7. Check the output folder
8. Save the workflow JSON if it’s worth keeping
```

That sort of plain little checklist is surprisingly useful. Especially two days later, when your memory has already started sanding the details off.

## ComfyUI also has an API, but for now it’s enough to know the shape of it

ComfyUI is not just a graphical interface. It also exposes server routes, so a workflow can be submitted in API format to the local service.

In plain English:

> what you build on the canvas today can later be driven by scripts, automation, or another frontend

The usual shape is:

1. save the workflow in **API format**
2. submit it to the local ComfyUI server via `POST /prompt`
3. receive a `prompt_id`
4. track progress via WebSocket or other status checks

You don’t need to use the API today. But it’s worth understanding that **ComfyUI is not trapped inside its own GUI**. That’s part of why it scales so well from casual tinkering to repeatable automation.

## Do you have to keep Terminal open the whole time?

### The honest answer

**If you started ComfyUI by running `python main.py` in Terminal, then yes, that process needs to stay alive.**

If you stop the process, close the shell, or end the session it is attached to, ComfyUI normally stops with it.

### But you do not have to stare at that Terminal window forever

This is where tmux becomes genuinely useful.

## What tmux is, and why people keep recommending it

tmux is a terminal multiplexer. In practice, it lets you create a shell session, detach from it, and later attach to it again. **The session keeps running even when you’re no longer looking at it.**

That makes it handy when:

- you don’t want ComfyUI tied to a visible Terminal window
- you want to close Terminal or iTerm without killing the process
- you want to return later and inspect logs

### A basic tmux flow for ComfyUI

Create a session:

```bash
tmux new -s comfyui
```

Inside it, launch ComfyUI:

```bash
cd ~/ComfyUI
source .venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188
```

Then detach with:

```text
Ctrl + b, then d
```

ComfyUI keeps running. You’re simply no longer attached to that shell view.

### The tmux commands you’ll actually use

```bash
tmux ls
```

Lists your existing sessions.

```bash
tmux attach -t comfyui
```

Reattaches to the `comfyui` session.

```bash
tmux kill-session -t comfyui
```

Stops that session.

### If you want to start it detached in one go

```bash
tmux new -d -s comfyui 'cd ~/ComfyUI && source .venv/bin/activate && python main.py --listen 127.0.0.1 --port 8188'
```

That creates a detached tmux session named `comfyui` and launches ComfyUI inside it immediately.

## Does tmux count as a background service?

Sort of, but not really.

It absolutely gives you a **background-running process you don’t need to keep in a visible Terminal tab**. But it is still part of your user session. It is not a native macOS system service.

So I’d describe it like this:

- **far better than leaving one random Terminal tab open**
- **much easier to debug than a fully abstracted service setup**
- **excellent for local dev machines and personal always-nearly-on workflows**

But if what you really mean is “I want this to start automatically when I log in or when the machine boots”, tmux is not the full answer. That job belongs more properly to `launchd`.

## After shutdown or reboot, do you need to start ComfyUI again?

This one is simple:

### If you’re just using Terminal or tmux

**Yes.**

A reboot wipes the user session. The tmux session goes with it. ComfyUI does not magically resurrect itself.

### If you have configured automatic startup separately

Then possibly not. A `launchd` agent or another login-time startup method can relaunch it for you.

That’s why it’s important not to confuse **tmux persistence** with **system service persistence**. tmux survives detaching from a terminal. It does not survive a machine reboot on its own.

## Should you make ComfyUI into a proper macOS service right now?

My advice: **not yet**.

If you are still learning the interface, still figuring out workflows, and still working out where models or outputs go, jumping straight into a full service setup often hides more problems than it solves.

A better progression is:

1. **run it in a normal Terminal a few times**
2. **move to tmux once the basics are stable**
3. **only consider `launchd` once you are using it regularly and know what “normal” looks like**

Right now, the most valuable thing is not elegant service management. It is knowing where the logs are, how to restart the process, and how to tell the difference between “the browser is confused” and “the server died”.

## If you do eventually service-ise it, what’s the macOS way?

On macOS, the canonical route is usually `launchd`, typically via a plist in `~/Library/LaunchAgents/` so ComfyUI starts when you log in.

That’s a perfectly reasonable later step. I just wouldn’t make it your first one. While you’re still changing Python environments, adding custom nodes, or swapping model dependencies around, tmux is often the more forgiving tool. It’s less grand, but it’s much easier to troubleshoot.

## The setup I’d recommend in practice

If you’re on a **Mac mini M4 with 16GB** and using the **manual ComfyUI install path**, I’d stage things like this:

### Stage 1: Plain Terminal

Use it to confirm that:

- ComfyUI starts
- `127.0.0.1:8188` opens
- a basic workflow runs
- an image is generated
- the output folder is where you expect

### Stage 2: tmux

Use it to solve:

- not wanting a dedicated Terminal window forever
- wanting ComfyUI to keep running after you detach
- wanting to come back and inspect logs later

### Stage 3: Only then consider a service setup

By this point, you already know what a healthy run looks like, and you’ll be in a much better position to notice when something isn’t right.

## The three confusions this article is trying to save you from

Let’s restate the big ones, because these really do trip people up:

1. **ComfyUI launching successfully does not mean you already have a usable workflow routine**
2. **tmux keeps a process alive after you leave the terminal session, but it does not survive a full reboot by itself**
3. **`127.0.0.1:8188` is a local service address, not a public website, so connection failures usually mean “check the local process first”**

## Wrap-up

If I had to compress this whole article into one line, it would be this:

> **Before you chase advanced workflows, make ComfyUI feel repeatable.**

Start it. Open it. Load something sensible. Choose one model. Generate one image. Know where the output went. Know how to restart it. Know how to detach cleanly.

Once that rhythm is stable, everything else is easier.

Next up, we’ll tackle the other question every beginner runs into almost immediately: **where do you actually get models from, and what’s the difference between Civitai and Hugging Face?**
