---
title: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰系列 part 06｜訓練腳本怎麼看：從 `train_lora.py` 到 `train_partial_ft.py`"
description: "把模型、資料、tokenizer、訓練方法、參數範圍和節奏全部綁在一起的實驗設計書。"
categories: ["ai"]
tags: []
date: 2026-04-09T13:00:00
series: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰"
seriesOrder: 6
---
我第一次真的打開 `train_lora.py` 的時候，其實沒有覺得自己在看什麼很重要的東西。

那時候它在我眼裡比較像一份雜亂的施工清單。
哪裡載模型，哪裡讀資料，哪裡設幾個參數，最後交給 trainer 跑完。看起來就是很多設定堆在一起。

後來一路從 baseline、qkvo、all-linear、last-half，再走到 `train_partial_ft.py` 和 `train_dpo.py`，我才慢慢修正這個看法。

訓練腳本不是命令備忘錄。
它其實比較像一份：


![訓練腳本與版本分岔圖](./resource/local-llm-finetuning-part-06-script-map.svg)

## 訓練腳本到底在做什麼

如果只用一句話講，訓練腳本做的事就是：

**把一場微調實驗需要的所有前提，整理成一個可執行、可重跑、可比較的流程。**

也就是說，腳本裡真正綁在一起的，至少有這幾條線：

- 你從哪顆 base model 出發
- 你拿什麼資料教
- tokenizer 怎麼把文字翻成模型吃得下去的形式
- 你用的是 SFT 還是 DPO
- 你是不是用 LoRA
- 你把 LoRA 掛在哪裡
- 你開了多少權重
- 你要跑幾輪、學多快、每次吃多長

## 為什麼寫腳本就能驅動訓練

因為訓練本來就不是一個神祕儀式。
它只是需要很多前提同時被講清楚：

- model 是誰
- data 在哪
- tokenizer 怎麼處理
- 哪些參數可訓練
- loss 用哪種
- trainer 用哪種
- output 存哪裡

你把這些東西寫成 Python 腳本，
等於把一整場實驗的定義交給框架去執行。

## 一份最小可用的 LoRA SFT 腳本，通常至少有什麼

### 1. `MODEL_ID`
它是在決定你從哪顆大腦出發。

### 2. `DATA_PATH`
它是在決定你這次拿什麼教材教模型。

### 3. tokenizer
tokenizer 在腳本裡不是裝飾。
它負責把人類語言轉成 token，也常常一併處理 chat template 這種對話格式問題。

### 4. model 載入
這一段在告訴程式：
- 模型是哪顆
- 要不要用 fp16
- 要不要上 MPS 或 CUDA

### 5. `LoraConfig`
這一段在定義 LoRA 怎麼掛。

### 6. trainer
如果你做的是 SFT，通常是 `SFTTrainer`。
如果你做的是 DPO，通常是 `DPOTrainer`。

### 7. training args
這一段在定義：
- learning rate
- epochs
- batch size
- gradient accumulation
- max length
- output path

## `MODEL_ID` 到底在決定什麼

它是在決定：

**你這次的所有微調，都是從哪顆 base model 開始偏。**

這也是為什麼你前面會那麼在意 `meta-llama/Llama-3.1-8B-Instruct` 的權限。
因為你不是隨便抓一顆模型來練。
你是在一顆特定 instruct 模型上，做後續所有 LoRA、DPO、partial FT。

## `DATA_PATH` 真正代表的是教材，不只是檔案位置

這行也常被低估。

例如：

```python
DATA_PATH = "data/train.jsonl"
```

看起來只是在指路。
實際上，它在決定：

- 你教的是示範答案，還是偏好對
- 你教的是格式，還是偏好
- 你資料的品質到底穩不穩

## tokenizer 跟 chat template 為什麼常常一起出現

tokenizer 最容易被誤解成只是切字器。

其實在 chat model 裡，它通常還在參與另一件事：

**把對話轉成模型真正看得懂的序列格式。**

這就是為什麼 chat template 很重要。

## `LoraConfig` 是腳本第一次真正開始決定「改法」的地方

這一段通常長這樣：

```python
peft_config = LoraConfig(
    r=4,
    lora_alpha=8,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "v_proj"],
)
```

### `r`
LoRA 容量的一個重要旋鈕。
不是越大越好。

### `lora_alpha`
LoRA 影響力的縮放。
不是 learning rate，但也不是可忽略的數字。

### `lora_dropout`
一種 regularization。
資料少時，存在感會更明顯。

### `bias`
要不要把 bias 一起訓。
很多本地小實驗會先不碰。

### `task_type`
告訴 PEFT 你在處理的是哪種任務，像 `CAUSAL_LM`。

### `target_modules`
它在回答：

**LoRA 到底要掛到模型裡哪些區塊上。**

## `q_proj / k_proj / v_proj / o_proj` 是什麼

它們是 transformer attention 裡幾個很核心的 projection 層。

你前面會一路從：

- `q_proj + v_proj`
- 擴到 `qkvo`
- 再擴到 `all-linear`

本質上是在測一件事：

**LoRA 的施工範圍到底要開多大。**

### baseline-small
只掛 `q_proj`、`v_proj`

### qkvo-small
掛：
- `q_proj`
- `k_proj`
- `v_proj`
- `o_proj`

### all-linear-small
再往外擴，把 attention 之外的 linear 層也一起掛進來。

## `all-linear` 展開那 7 個到底是誰定義的

不是「宇宙定義了 all-linear 就一定等於那 7 個」。
更接近的說法是：

- PEFT 提供了像 `"all-linear"` 這樣的 shorthand
- 但最後會命中哪些模組，仍然跟模型結構有關

## `layers_to_transform` 和 `layers_pattern` 在幹嘛

### `layers_to_transform`
在回答：
- 這些 target modules 要掛在哪幾層

### `layers_pattern`
在回答：
- 你的模型結構裡，層名該怎麼被正確匹配

## 為什麼你前面會從 baseline、qkvo 一路走到 all-linear、last-half

因為你那時候其實在探索兩件事：

### 1. 掛載範圍
從：
- 少量 attention 層
- 擴到更多 attention 層
- 再擴到更廣的 linear 層

### 2. 掛載樓層
從：
- 全層
- 到只後半層

## `train_partial_ft.py` 在做什麼

它不再只是掛 adapter。
它開始真的打開原始權重。

也就是說，它比較像：

- 指定哪些 layer block 可訓練
- 是否打開 `model.model.norm`
- 是否打開 `lm_head`

## `model.model.norm` 和 `lm_head` 為什麼會出現

### `model.model.norm`
模型接近輸出前的一層 normalization。

### `lm_head`
最後把 hidden states 映到詞彙表 logits 的輸出頭。

它們都很靠近最終輸出。
所以一旦打開來訓，通常行為很有感。
代價是：
- 更重
- 更吃記憶體
- 更容易讓模型整體平衡被拉動

## `for block in model.model.layers[-4:]` 為什麼是 4 層，不是 3 或 5

沒有神聖答案。

你前面會開最後 4 層，不是因為 4 有理論特權。
而是它在當時是一個折衷：

- 比只開 1 層更有機會有感
- 比全開更保守
- 又沒有誇張到一開始就把機器拖爆

## `learning_rate=5e-6` 這種寫法到底在講什麼

`5e-6` 就是：
- 5 × 10^-6
- 也就是 0.000005

它代表的是：
**每一步更新時，參數移動的幅度大概有多大。**

### 學習率越高越好嗎
不是。

太高：
- 容易衝過頭
- 容易不穩
- 容易把模型拉歪

太低：
- 很慢
- 可能幾乎學不到什麼

## `num_train_epochs=2` 又在講什麼

epoch 很簡單：

**整份資料完整跑幾輪。**

### epoch 越高越好嗎
也不是。

資料少時，epoch 太高反而容易：
- 過度記住資料
- 偏好被推過頭
- 模型開始變得怪

## `max_length`、`gradient_accumulation_steps`、`dataloader_pin_memory=False` 各在幹嘛

### `max_length`
每筆資料最多讓模型吃多長。
越長：
- 上下文越完整
- 但也越重

### `gradient_accumulation_steps`
如果 batch 開不大，可以累幾步梯度再更新一次。
某種程度是在用時間換空間。

### `dataloader_pin_memory=False`
在你前面 MPS 實驗裡，pin memory 不一定有幫助，甚至可能只是多出不必要警告。
所以把它關掉，反而比較乾淨。

## 你前面一直在做的事，到底叫 adapter 還是 LoRA

更準確的說法是：

- 你在做的是 **LoRA adapter**
- 訓出來的產物是 **fine-tuned adapter**
- 用的路線是 **PEFT**

## `compare_lora.py` 做什麼用的

它更像是一個很必要的 sanity check：

- 同一顆 base
- 掛不同 adapter
- 用同一組 prompt
- 看輸出差在哪

這個動作很重要，因為：

**訓練 log 不等於使用感。**

## 比較是必要的嗎

如果你只是想證明流程有沒有跑通，
不是必要。

但如果你真的在挑主力版本，
很必要。

## 這篇真正想留下來的是什麼

**訓練腳本不是一堆設定。它是一份把模型、資料、tokenizer、訓練方法、可訓練範圍與節奏綁成一場實驗的設計書。**

#