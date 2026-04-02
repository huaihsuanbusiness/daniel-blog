---
title: "OpenClaw Getting Started 02 | A Recoverable First Install on macOS / Mac mini"
description: "A practical macOS install guide for technically comfortable readers who want a boring, recoverable OpenClaw baseline before adding channels, skills, or remote access."
categories: ["openclaw"]
tags: ["openclaw", "agent", "gateway", "self-hosted", "tools", "memory"]
date: 2026-04-02T14:41:00
featured: false
---

> Audience: readers who are comfortable with the terminal and want OpenClaw running properly on macOS / Mac mini.  
> The goal here is not to unlock everything. The goal is to build a **recoverable, verifiable, maintainable** first install.

---

## The real goal of the first install

A lot of people try to do all of this at once:

- install OpenClaw
- connect Discord
- enable browser use
- install a pile of skills
- expose the gateway to the LAN
- experiment with Docker, a VPS, or a VM in parallel

That turns troubleshooting into soup.

The core claim of this article is simple:

> **The first install should optimise for a stable local Gateway, not maximum features.**

If you can do the following, you are in good shape:

- Node is correct
- the `openclaw` CLI works
- Codex OAuth is done
- `openclaw onboard --install-daemon` succeeds
- launchd owns the service lifecycle
- `openclaw doctor`, `openclaw gateway status`, and the dashboard all verify cleanly

Discord, skills, memory, and remote access come later in Part 2.

---

## Why this article uses Mac mini as the mainline, not Oracle VM, Docker, or a VPS

Let’s settle this early.

### Why Mac mini is a strong first host
For individual builders, the Mac mini path has several advantages:

- it matches the local-first operating model well
- later macOS-specific node and app capabilities are easier to add
- you do not have to solve remote auth, SSH tunnels, tailnets, container mounts, and service-manager differences on day one

### Why Oracle VM is not the main teaching path
Daniel’s Oracle VM experiment is valuable precisely because it shows the difference between “works” and “fits”.

A 1GB RAM VM can get you far enough to prove that:
- the CLI can run
- a foreground gateway can start

But it also creates pressure around:
- swap
- Node and PATH handling
- SSH session lifecycle
- cleanup and migration work
- memory pressure on onboarding, doctor, and health-oriented flows

That makes it a good counterexample and a useful comparison point, but not the best baseline for a first install tutorial.

### Why I would not start with Docker on Mac
Docker is useful, but it introduces extra variables immediately:

- volumes
- container lifecycle
- port mapping
- host vs container permissions
- onboarding output that does not always mean the container is healthy

If you have not yet proved the base install, Docker makes fault isolation harder.

---

## Choose your install route

On macOS, I would separate the paths like this.

### Path A: the official installer, fastest route
Best when:
- you want the official flow
- you are happy for the installer to handle Node / Git / OpenClaw
- you want the fastest path to a working baseline

### Path B: manage Node first, then install with npm
Best when:
- you already manage Node yourself
- you want tighter control over the moving parts
- you want cleaner troubleshooting if something breaks

For this series, the practical stance is:

> **Understand Path A, but think like Path B.**  
> In other words, know what the official installer does, while still checking your Node and PATH state deliberately.

---

## Pre-flight checklist

Before you start, confirm these things.

### 1. You have a Mac you are willing to treat as a host
It does not have to be a Mac mini, but if you want it always on, it should not be the machine you constantly power down, reconfigure, or churn through multiple Node stacks on.

### 2. You accept that the first pass stays local
This article assumes:
- local bind
- dashboard through `127.0.0.1`
- token auth kept on
- no early exposure of port 18789 to the LAN or public internet

### 3. You have already picked your auth path
The mainline here is **Codex OAuth**, meaning:
- you have a ChatGPT account and plan
- you expect a browser-based OAuth flow
- you are not using the OpenAI API key route for this install

### 4. Do not install the whole stack as root
Community reports already show how easy it is to create pain with global npm prefixes and wrong ownership on a clean macOS install.  
For a personal machine, using your normal user account is the sane starting point.

---

## Step 1: check your Node path

OpenClaw’s official install docs and Node docs currently say:

- Node 24 is recommended
- Node 22 LTS remains supported
- the installer can handle Node automatically

If you want to install it yourself first, Homebrew is the common macOS route.

### Check what you have
```bash
node -v
npm -v
which node
which npm
```

### If you do not have Homebrew yet
Use the official Homebrew install command:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then add `brew shellenv` exactly as the terminal output tells you.

### Install Node 24
```bash
brew install node@24
```

### Confirm PATH is sane
On Apple Silicon, the common Homebrew path is:

```bash
/opt/homebrew/bin
```

If `node -v` still does not show 24.x after installing it, that is usually a PATH issue, not an OpenClaw issue.

---

## Step 2: install OpenClaw

### Path A: official installer
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

The current installer flow is roughly:

1. detect the OS
2. ensure a supported Node runtime, defaulting to Node 24
3. ensure Git
4. install the OpenClaw CLI
5. enter onboarding

### Path B: npm after you have prepared Node
```bash
npm install -g openclaw@latest
```

Then validate:

```bash
openclaw --version
```

If you get `command not found` here, stop and inspect:

```bash
npm prefix -g
which openclaw
echo $PATH
```

You want to know where the CLI landed and whether your shell can see it before going further.

---

## Step 3: run onboarding and install the daemon in the same pass

This is the core step of the first install.

The recommended command is:

```bash
openclaw onboard --install-daemon
```

The point is not only the interactive wizard. The point is also to hand the service lifecycle to the operating system.

### What this normally does
- choose a model provider
- verify auth
- check the model configuration
- install a per-user LaunchAgent on macOS
- take you into the local dashboard path

### Mainline for this series: OpenAI Codex
If you want to select that path directly:

```bash
openclaw onboard --auth-choice openai-codex
```

Or later:

```bash
openclaw models auth login --provider openai-codex
```

### What to expect from OAuth
Normally the browser opens and you complete the ChatGPT sign-in and approval flow.  
Think of this as “granting subscription-backed model access”, not as manually pasting a secret token into config.

---

## Step 4: verify that LaunchAgent really took over

The real success condition on macOS is not “I once launched OpenClaw”. It is “launchd now owns the service lifecycle”.

Official docs currently state that:
- macOS uses a per-user LaunchAgent
- the label is `ai.openclaw.gateway` or `ai.openclaw.<profile>`
- if the service is missing, `openclaw gateway install` can restore it

### Validation commands
```bash
openclaw gateway status
openclaw doctor
```

You can also inspect launchd directly:

```bash
launchctl print gui/$UID/ai.openclaw.gateway
```

If the service is not installed, the most direct repair is often:

```bash
openclaw gateway install
openclaw gateway start
```

---

## Step 5: verify the Gateway, dashboard, and token path

Now you are proving the whole local control path, not just “the install seemed to work”.

### Basic checks
```bash
openclaw --version
openclaw doctor
openclaw gateway status
openclaw models status
openclaw config get agents.defaults.model
```

### Open the dashboard
```bash
openclaw dashboard
```

If the UI asks for auth, fetch the token with:

```bash
openclaw config get gateway.auth.token
```

Then paste it into the Control UI settings.

### Do not casually disable localhost token auth
OpenClaw now enforces token auth on loopback by default.  
That is not pointless ceremony. It prevents arbitrary local processes from calling your gateway.

If you do not have a token yet:

```bash
openclaw doctor --generate-gateway-token
```

### One operational rule
Do not treat the token as harmless just because the gateway is local.  
Do not leave it in chat logs, screenshots, or long-lived URLs if you can avoid it.

---

## What counts as “done” for the first install

You do not need Discord, browser automation, or a big skills stack to call this successful.

The practical finish line is:

- `openclaw --version` returns normally
- `openclaw doctor` shows no fatal blockers
- `openclaw gateway status` is healthy or recoverable
- `openclaw models status` shows your auth path
- `openclaw dashboard` opens
- if auth is requested, you know how to retrieve the token
- reopening a terminal does not make the whole service disappear

If those are true, your base install is standing.

---

## Common issues to avoid early

## 1. `openclaw: command not found`
Usually this is PATH, not OpenClaw. Check:

```bash
which openclaw
npm prefix -g
echo $PATH
```

## 2. Wrong Node version after installation
Again, usually PATH.  
Fix Node visibility before reinstalling OpenClaw.

## 3. macOS permissions or xattr behaviour makes the gateway look dead
Community reports have already documented macOS cases where the gateway is effectively blocked and the user needs to inspect Privacy & Security behaviour.  
If the CLI is installed but the gateway will not come up, do not look only at OpenClaw logs. Check the OS security layer too.

## 4. `openclaw gateway restart` and the service vanishes
There is a GitHub report describing a macOS path where restart can leave the service missing, after which `openclaw gateway install` plus `start` is needed to recover.  
If you see “service not installed”, try:

```bash
openclaw gateway install
openclaw gateway start
```

## 5. Docker on macOS hangs after onboarding output
Community reports also show Docker-on-Mac flows that appear to finish onboarding but do not leave a properly running container.  
This is exactly why Docker is not my first-install recommendation.

## 6. Do not expose the gateway to the LAN or the internet on day one
Keep it on localhost first.  
Remote access comes later, with SSH tunnels or Tailscale Serve.

---

## Daniel’s Oracle VM example: why it stays as a counterexample, not the mainline

Your Oracle VM work is useful because it surfaces real operational friction:

- manual swap
- Node and npm global path cleanup
- very tight memory for onboarding and doctor flows
- foreground SSH windows ending the foreground gateway process
- non-trivial cleanup and migration work

That does not mean the VM route is worthless. It means:

> **it is a second-phase deployment decision, not the first-phase install path.**

For most technically comfortable personal users, getting the Mac mini baseline stable first is simply more efficient.

---

## What Part 2 will cover

Part 2 is where we move from “alive” to “actually useful”:

- Discord pairing and access control
- skills installation and governance
- memory behaviour in practice
- remote access
- `coding`, sandboxing, and exec approval boundaries

That is where the system starts to feel like a real assistant rather than a freshly installed service.

---

