---
title: "Local LLM Fine-Tuning, Explained part 05 | What DPO is actually changing"
description: "what exactly should the model learn when there is no single canonical answer, only a preference that one answer is better than another?"
categories: ["ai"]
tags: []
date: 2026-04-09T09:00:00
series: "Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO"
seriesOrder: 5
---

If the previous piece was about separating SFT, LoRA, partial FT and full fine-tuning by the question each one answers, this piece has to move onto another axis that gets flattened far too easily:

**what exactly should the model learn when there is no single canonical answer, only a preference that one answer is better than another?**

That is where DPO comes in.

A lot of explainers start with a memorable line:

- SFT teaches the model how to answer
- DPO teaches the model which answer to prefer

That line is useful, and it is not wrong.  
But if the whole article stops there, DPO gets explained too thinly.

Because the real point of DPO is not simply that it uses `chosen / rejected` pairs.  
The real point is this:

**it turns what was previously a long RLHF pipeline into a loss that can be optimised directly on offline preference data.**

So DPO is not just a fashionable data format.  
It is a different optimisation route.

![Comparison of SFT, RLHF and DPO](./resource/local-llm-finetuning-part-05-dpo-rebuilt-map.svg)

---

## The plainest possible version first

If we stay away from equations for a moment, the simplest distinction is still:

### SFT
You give the model one target answer.  
It learns to move towards that answer.

### DPO
You give the model two answers:
- `chosen`
- `rejected`

What the model learns is not “memorise the chosen one”.  
It learns:

**under this prompt, the chosen answer should sit above the rejected answer.**

The crucial phrase here is not “ground truth answer”.  
It is “preference ordering”.

That is why DPO is particularly well suited to situations like:
- both answers are broadly acceptable
- but one style is clearly preferred
- for example: more direct, less preachy, more structured, less lecture-like

You can push some of that through SFT.  
But DPO fits the ranking problem itself more naturally.

---

## Why DPO is always discussed next to RLHF

Because DPO did not appear out of nowhere.  
It is answering an old and heavy RLHF problem.

A rough sketch of the classic RLHF route looks like this:

1. collect human preference data  
2. train a reward model from that data  
3. use an RL method such as PPO to update the policy model  
4. keep the policy from drifting too far away from a reference policy

That route is not wrong.  
It is simply expensive and operationally awkward.

The central claim of the DPO paper is not merely “we have a simpler variant”.  
The stronger claim is:

**the KL-constrained RLHF objective can be reparameterised into a directly optimisable objective on preference data, without an explicit reward model and without running a separate RL loop.**

That is the real reason DPO matters.

---

## What RLHF was trying to optimise in the first place

The full derivation does not belong in the middle of a readable column,  
but the skeletal objective does.

A rough version looks like this:

\[
\max_{\pi} \; \mathbb{E}_{x \sim D,\; y \sim \pi(\cdot|x)} \left[r(x,y)\right] - \beta \, D_{KL}\big(\pi(\cdot|x)\;||\;\pi_{ref}(\cdot|x)\big)
\]

This looks more frightening than it is.

It is really expressing two forces:

### First force
You want the model to produce high-reward answers.  
That means answers that better reflect human preference.

### Second force
You do not want the model to chase that reward so aggressively that it drifts arbitrarily far from the reference policy.

So the objective is doing two things at once:
- pulling the model towards preferred behaviour
- pushing back against uncontrolled drift

DPO matters because it does not throw this objective away.  
It rewrites it into something much easier to optimise directly. citeturn187255view0turn442250view2

---

## What Bradley–Terry is, and why it appears here

This is one of the points where DPO explanations usually become properly technical, and it is exactly the part this revised piece should not skip.

If you want to model statements like “answer A is preferred to answer B”, one of the most common statistical tools is the **Bradley–Terry model**.

At a high level, if each candidate answer has some reward score, then the probability that the chosen answer should beat the rejected answer can be written as a pairwise preference probability.

A minimal form is:

\[
P(y^+ \succ y^- \mid x) = \sigma\big(r(x,y^+) - r(x,y^-)\big)
\]

where:
- \(x\) is the prompt
- \(y^+\) is the chosen answer
- \(y^-\) is the rejected answer
- \(r(x,y)\) is a reward-like score
- \(\sigma\) is the sigmoid

That expression matters because it turns “human preference” into something trainable rather than something purely intuitive.

In other words:

**preference is not just a feeling. It can be written as a pairwise probability model.**

Cameron Wolfe’s write-up is particularly helpful here because it restores Bradley–Terry to the centre of the story rather than treating preference data as a mysterious black box. citeturn442250view2

---

## What the reward model was doing in classic RLHF

In the classic RLHF pipeline, the usual move is:
- train a reward model
- let it score prompt-completion pairs
- then optimise the language model against those scores

So in the Bradley–Terry framing,  
the \(r(x,y)\) term is often supplied by an explicit reward model.

This is where DPO makes its key move.

It says:

**you do not necessarily need to train a separate standalone reward model. You can reparameterise the reward in terms of the policy and the reference policy.**

That is what the paper title means by saying the language model is “secretly” a reward model.  
Not that the policy literally turns into an extra reward head, but that:

**under this derivation, relative policy probabilities can play the role of an implicit reward.**

---

## How DPO rewrites reward into an implicit reward

This is the structural beam the previous draft did not make explicit enough.

One key part of the derivation begins from the closed-form optimal policy under the KL-constrained RLHF objective and rewrites the reward in terms of policy and reference-policy probabilities.

The conceptual version to hold onto is:

\[
r(x,y) \propto \log \pi_\theta(y|x) - \log \pi_{ref}(y|x)
\]

More precisely, there are also \(\beta\)-dependent terms and prompt-only terms that later cancel out in the pairwise comparison. But for the main body, the important idea is:

**DPO rewrites the reward signal as the relative log-probability of a completion under the current policy versus the reference policy.**

That is what is meant by an **implicit reward**.  
The reward is no longer predicted by a separate explicit reward model. It is recovered from the policy-relative structure itself. citeturn187255view0turn442250view2

---

## The minimal DPO loss you actually need to understand

This is the structural core the revised part 05 has to keep.

TRL states the DPO loss as:

\[
\mathcal{L}_{DPO}(\theta)
=
- \mathbb{E}_{(x,y^+,y^-)}
\left[
\log \sigma
\left(
\beta
\left[
\log \frac{\pi_\theta(y^+|x)}{\pi_{ref}(y^+|x)}
-
\log \frac{\pi_\theta(y^-|x)}{\pi_{ref}(y^-|x)}
\right]
\right)
\right]
\]

Let us unpack the symbols.

- \(x\): prompt
- \(y^+\): chosen completion
- \(y^-\): rejected completion
- \(\pi_\theta\): the policy model you are training
- \(\pi_{ref}\): the reference model
- \(\sigma\): sigmoid
- \(\beta\): the strength of the preference signal

On paper this looks dense.  
In practice it is doing something very plain:

### It compares two relative scores

One score is:
- how much the current policy likes the chosen answer
- relative to how much the reference policy likes it

The other is:
- how much the current policy likes the rejected answer
- relative to how much the reference policy likes it

If the chosen side wins by enough margin, the loss gets smaller.  
If the rejected side is still too competitive, the loss pushes in the opposite direction.

So in the most practical language:

**DPO is not memorising the chosen answer. It is training the model so that the chosen answer sits above the rejected answer in relative policy-vs-reference space.** citeturn442250view1turn442250view0

---

## Why people say DPO looks like binary classification or binary cross-entropy

Because it genuinely has that flavour.

You can think of it as:
- one preference pair
- one objective that says the chosen response should beat the rejected response
- one sigmoid-shaped loss on that pairwise comparison

That is why many introductory explanations say DPO can be understood as a kind of binary classification objective over preference pairs.

That is a useful entry point.

But it is also not the whole story.

Because this is **not** ordinary BCE on raw outputs.  
It is BCE-like behaviour built on:
- policy-vs-reference relative log-probability
- chosen-vs-rejected pairwise comparison
- the implicit reward reparameterisation

So “it behaves like binary cross-entropy” is a good beginner handle, but stopping there would still undersell the method. Both SuperAnnotate and Cameron’s overview are helpful entry ramps here, but the paper’s actual contribution is deeper than a generic pairwise classifier. citeturn442250view4turn442250view3

---

## What the reference model is really doing

In the earlier draft I described it mainly as an anchor. That was not wrong, but it was too soft.

A more exact way to put it is:

**the reference model defines the baseline distribution against which the current policy’s movement is measured**

That has two big consequences.

### First consequence
It preserves the “do not drift arbitrarily far” logic.  
You are not only asking whether the current policy likes the chosen answer.  
You are asking how much more it likes it relative to the reference model.

### Second consequence
It is what allows the implicit reward expression to exist in the first place:

\[
\log \pi_\theta(y|x) - \log \pi_{ref}(y|x)
\]

That relative structure is not decorative.  
It is one of the actual load-bearing beams of DPO.

TRL’s training metrics reflect exactly this logic. Its logs expose:
- `rewards/chosen`
- `rewards/rejected`
- `rewards/margins`

all in terms of implicit rewards derived from policy-relative probabilities. citeturn442250view0turn442250view1

---

## Why β is not the learning rate

Saying “β controls preference strength” is true, but still a little soft.

A more operational way to hold it is:

- larger \(\beta\): stronger pressure on the chosen-vs-rejected difference
- smaller \(\beta\): more conservative preference pressure

So \(\beta\) is not about step size the way the learning rate is.  
It is more like a dial for:

**how seriously the pairwise preference margin is being taken inside the loss**

It is not a speed knob.  
It is a pressure knob.

---

## Which layer DPO belongs to

This was one of your best earlier questions, and the answer is still worth keeping.

### DPO does not belong to the LoRA layer
LoRA is an update strategy.

### DPO is not the base-weight layer either
It is not a model type.

### DPO belongs to the training-method layer
It answers:
- what signal you use to teach the model
- how preference data is turned into policy updates

So what you actually did in your own experiments was not vaguely “a DPO model”.  
It was:

**DPO carried through LoRA.**

That sentence matters because it puts:
- SFT / DPO
- LoRA / adapters
- partial FT / full FT

back into their correct conceptual lanes.

---

## What SFTTrainer and DPOTrainer are each solving

If all you say is “they are different APIs”, you have not really said enough.

### SFTTrainer
Handles:
- prompt-answer supervision
- conversational demonstration data
- imitation-style fine-tuning

Its central question is:

**can the model imitate the demonstrated answer pattern?**

### DPOTrainer
Handles:
- prompt
- chosen
- rejected

Its central question is:

**can the model push the chosen answer above the rejected answer under a preference objective?**

So these are not cosmetically different trainer names.  
They reflect different data structure, different objective structure and different logging logic. citeturn187255view1turn442250view1

---

## When SFT is the better fit, and when DPO is the better fit

This is still one of the most practically useful distinctions.

### SFT is usually better when you are teaching:
- structure
- answer format
- tone
- stable response shape
- what a good answer should look like

For example:
- start with the conclusion
- then use principle / risk / action
- be less preachy
- keep a steadier Traditional Chinese voice

These are demonstration problems.

### DPO is usually better when you are teaching:
- preference
- ranking
- “both are acceptable, but I consistently want this one”

For example:
- both answers are technically fine, but one is too lecture-like
- both answers are usable, but one gets to the point much faster

That is where DPO becomes the more natural tool.

---

## Which parts of your own work were DPO, and which were not

This also needed to be made much cleaner.

### Not DPO
The long earlier stretch:
- baseline-small
- qkvo-small
- all-linear-small
- all-linear-last-half-small
- partial FT

Those were still:
- LoRA SFT
- or partial FT

That means they still belonged to the world of demonstration-style supervision, even when the parameter-update strategy changed.

### Actually DPO
The point where you began to:
- write `dpo_train.jsonl`
- prepare `prompt / chosen / rejected`
- switch to `DPOTrainer`
- evaluate using chosen-vs-rejected margins

That is where you genuinely entered preference optimisation territory.

---

## How your two DPO rounds map back onto the theory

I think this is the most valuable part of the revised piece, because this is where the theory and your own evidence finally lock together.

### Round one
- 4 examples
- 1 epoch
- very conservative LoRA settings
- result: the pipeline worked, but the margin only moved slightly

### Round two
- 12 examples
- 2 epochs
- more concentrated preference data
- result: still stable, but the margin still only moved slightly

If you only read this through vibes, someone might say:

> so DPO did not really do much

But that is not the best interpretation.

Once you place the result back inside the theory, it becomes quite reasonable.

### Why it is reasonable

#### 1. Your base model was already strong
You were using `Llama-3.1-8B-Instruct`, not an unaligned raw base.  
So the chosen direction was not alien to the model to begin with.

#### 2. The dataset was still tiny
Twelve examples are enough for a smoke test.  
They are not much if your goal is to create a large and obvious preference shift in an 8B model.

#### 3. The LoRA scope was conservative
- `r=4`
- `lora_alpha=8`
- a restrained attachment scope

That is a safe setup, but it also naturally limits the magnitude of the movement.

#### 4. Your evaluation was unusually honest
You did not just ask the model one prompt and decide by vibe.  
You directly inspected chosen-vs-rejected margin behaviour.

And that is actually much closer to the heart of DPO.

So what your two rounds really showed was not:
- DPO is useless

but rather:

**under tiny datasets, conservative LoRA settings and a strong instruct base, DPO produces a visible but limited preference shift**

That is a very mature conclusion.

---

## Was the experiment a success?

I would keep the same judgement, but now phrase it more precisely:

**it was a successful DPO implementation test and an unusually honest effect test, but not yet a finished-product validation**

### What succeeded
- you really ran DPOTrainer
- you really prepared preference pairs
- you really attached the resulting adapter back to the base model
- you really evaluated it with the kind of margins DPO actually cares about

### What you have not yet achieved
- a large preference shift
- a dataset scale that could realistically produce one
- a finished DPO artefact ready to serve as a polished deployment model

That is more useful than either calling it a victory or calling it a failure.

---

## The sentences worth leaving behind

If this revised piece only leaves one plain sentence, let it be this:

**SFT teaches the model how to answer. DPO teaches the model which answer to prefer.**

If it leaves one more technical sentence, let it be this:

**DPO is not merely a chosen/rejected data format; it is a reparameterisation of the KL-constrained RLHF objective into a loss that can be optimised directly on offline preference data.**

And if it leaves the sentence most faithful to your own session, let it be this:

**DPO can move a model’s preferences, but it does not turn the model into a different person by magic; how far it moves depends on data scale, preference consistency, base-model strength, LoRA scope and evaluation honesty.**
