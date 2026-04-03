---
title: "OpenClaw Deployment and Configuration Part3"
description: "How to handle permissions, updates, backups, and migration without gradually wrecking a working OpenClaw host."
categories: ["openclaw"]
tags: ["openclaw", "deployment", "configuration", "gateway", "ops", "self-hosted"]
date: 2026-04-03T20:06:00
featured: false
---
*How to handle permissions, updates, backups, and migration without gradually wrecking a working OpenClaw host*

A lot of people assume the hard part of OpenClaw is the model layer.

I have ended up believing something slightly less glamorous: once OpenClaw is working, the thing most likely to damage it is not model quality. It is operations discipline.

The two recurring failure classes are usually these:

1. **you never got clear about the authority boundary**
2. **updates, backups, and migration were treated as occasional improvisation**

That is what this article is about.

And I want to state the stance up front:

- I am not against `full`
- I am not against updating
- I am against opening everything before you understand your workload, and I am against treating upgrades like a lucky dip

Both habits feel like freedom.  
In practice they mostly postpone the explosion.

## Start with `tools.profile`, because a lot of weird behaviour begins there

The current docs are quite explicit:

- `tools.profile` is a **base allowlist**
- the profile is applied before `tools.allow` / `tools.deny`
- new local configs from onboarding now default to `coding`

Those points matter because they explain a large chunk of the “OpenClaw suddenly only chats and will not do any work” wave from March 2026.

The problem was not that users forgot how to configure `exec`. The problem was that many assumed “I configured exec, therefore the agent can see exec”. In reality, if the profile was still `messaging`, the runtime and filesystem tools were never entering the tool set in the first place.

## How I think about the four profiles

### `minimal`
This is close to a single-purpose status surface.  
It is not the normal starting point for a personal technical host.

### `messaging`
This makes sense for narrow chat-facing use cases or constrained public entry points. It preserves messaging and session-oriented capability, not the broader filesystem or runtime layer.

If your OpenClaw host is meant to:

- reply to messages
- inspect sessions
- perform limited messaging workflows

then `messaging` is useful. If you expect it to read files, edit a workspace, run commands, or patch code, it is usually not the profile you are imagining.

### `coding`
For a **local technical personal setup**, this is the profile I reach for most often. The current docs define it as including:

- filesystem tools
- runtime tools
- session tools
- memory tools
- image capability

That combination is often the honest default: useful enough to do real work, but not the same as removing all boundaries.

### `full`
`full` is not the “pro” profile.  
It simply means **no base restriction**.

That distinction is worth saying plainly. Many people treat `full` as a kind of maturity badge, as though advanced users are supposed to enable it automatically. I do not think that follows.

`full` makes sense when:

- you know what classes of capability you genuinely need
- you have additional allow / deny controls or environmental boundaries
- you understand the blast radius you are enlarging

If those conditions are not in place, `full` is often not efficiency. It is uncontrolled scope.

## My decision order

If this is my own Mac or Mac mini, I usually decide in this order.

### 1. Ask about workload before asking about comfort
Am I expecting:

- coding, patching, and command execution?
- mostly messaging?
- a mixed workload with browser and messaging?

If the centre of gravity is coding, local automation, and workspace manipulation, I usually start with `coding`.

### 2. Use the profile to define the outer boundary, then use allow / deny to trim
The docs are clear about the order: base profile, then provider-specific restrictions, then allow / deny. That is a good design. It forces you to choose the broad shape first instead of trying to play whack-a-mole with fine-grained tool lists.

### 3. Do not jump to `full` when you do not yet understand the fault domain
A lot of people hit missing-tool behaviour and immediately open everything. Sometimes that does make the symptoms move. It can also hide the actual problem.

If the real issue is:

- the session is still using an older tool snapshot
- the profile changed but you never started a fresh session
- the Gateway and service token drifted apart
- the relevant plugin was never loaded

then `full` is mostly just a louder mistake.

## Updates: do not mix install methods, do not update bare, and do not make the agent your release manager

This part is more operational than philosophical.

The official installer currently defaults to the `npm` install method, but it also supports `git`. The update path then follows the active channel and install method: stable and beta track npm-style flows; dev tracks source / git-style flows.

The practical implication is easy to miss:

**do not use the installer one day, hand-roll npm the next, then flip to git later and expect the system to retain perfect memory of what you meant.**

My preference is simple:

- update along the line you installed on
- if you want to change install method, treat it as an intentional migration, not a casual experiment

## My own update workflow

### Routine inspection
```bash
openclaw update status
openclaw --version
openclaw gateway status
```

### Before a real update
Back it up:

```bash
openclaw backup create --verify
```

If all you need immediately is the config, there is a narrower option:

```bash
openclaw backup create --only-config
```

### Updating
If I am on the official path, I normally prefer:

```bash
openclaw update
```

If I chose to manage installation manually with npm or pnpm, I stay consistent with that. I do not bounce between methods.

### After updating
```bash
openclaw doctor
openclaw gateway status
openclaw status
```

There is nothing especially dramatic about this sequence. That is exactly why I trust it. It turns update from “press the button and hope” into “perform a change with a return path”.

## Why I do not recommend having the agent update OpenClaw itself

The FAQ is fairly honest here: possible, but not recommended. I agree completely.

An update may involve:

- restarting the Gateway
- dropping the active session
- a clean worktree requirement
- plugin sync
- post-update doctor
- and then whatever service, token, or LaunchAgent state follows afterwards

None of that makes self-update impossible. It does make it a poor idea when you are still asking basic questions like “is this host actually stable right now?”

Do not outsource release management to the same system that is being restarted by the release.

## Backup and migration: what you move is state, not just a JSON file

This is another place where people frequently underestimate the system.

The migration guide is quite clear: moving to a new machine is not just about copying `openclaw.json`. If you want to preserve the real working state, you are generally preserving at least:

- config
- auth / OAuth / credentials
- sessions
- channel state
- workspace contents, including `MEMORY.md`, skills, and prompts

In other words, the operational unit worth respecting is not “the config file”. It is **the OpenClaw state**.

That is one reason I have become much fonder of:

```bash
openclaw backup create --verify
```

before larger maintenance or migration work. It gives you a manifest-backed, verifiable archive instead of a hand-copied pile of hidden directories and half-remembered credentials.

## The practical rules I trust most

### 1. `coding` is often more honest than `full`
Especially for a local technical personal host.

### 2. `full` is valid, but it is not a badge of honour
You should know which risk surface you are enlarging.

### 3. Updates should follow the install method
Do not create drift by casually switching tracks.

### 4. Back up before major change
That is not old-fashioned. It is time-efficient.

### 5. Migrate the state, not just the config
Anything else is wishful thinking.

## Final view

I increasingly think the operational heart of OpenClaw is not “maximum capability”. It is **authority boundaries, update discipline, and the ability to retreat safely**.

A long-lived OpenClaw host usually does not fail because it lacked one more feature. It fails because:

- authority was over-opened too early
- updates had no process
- backups were performative
- and every fault was diagnosed from memory instead of evidence

If you keep those under control, a surprising amount of “OpenClaw is unstable” shrinks back into ordinary engineering.

