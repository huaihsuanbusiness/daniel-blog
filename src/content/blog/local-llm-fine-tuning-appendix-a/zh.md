---
title: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰系列 Appendix A｜術語字典與層級對照表"
description: "當你看到一個名詞，想知道它到底是什麼、在第幾層、該往哪裡改時，可以快速查到一個夠用而不失真的答案。"
categories: ["ai"]
tags: []
date: 2026-04-11T05:00:00
series: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰"
seriesOrder: 10
---

這份附錄不是要把整條系列重講一遍。  
它的用途比較單純：

**當你看到一個名詞，想知道它到底是什麼、在第幾層、該往哪裡改時，可以快速查到一個夠用而不失真的答案。**

主線比較像地圖。  
這份附錄比較像口袋索引。

---

## 一、整體分層對照

| 名詞 | 比較接近哪一層 | 最白話的理解 |
|---|---|---|
| 單次請求 | 應用 / 互動層 | 你這次真的送進模型的內容 |
| System Prompt | 提示 / 系統層 | 導演給演員的角色小紙條 |
| TEMPLATE / Chat Template | 提示模板層 | 劇本格式，決定對話怎麼排版 |
| MESSAGE / few-shot | 提示示範層 | 幾段示範演出 |
| PARAMETER | 推理 / runtime 層 | 拍攝風格設定，如 temperature、top_p |
| Modelfile | 服務 / 封裝層 | 整個拍片企劃書 |
| tokenizer | 輸入編碼層 | 把文字切成 token 的轉譯器 |
| base model weights | 模型權重層 | 演員原本的大腦與訓練底子 |
| adapter / LoRA | 參數增量層 | 訓練義肢，或改肌肉記憶的增量 |
| DPO / SFT | 訓練方法層 | 你打算怎麼教模型 |
| merge | 部署轉換層 | 把增量折回完整模型 |
| quantization | 部署最佳化層 | 把模型換成更輕的表示方式 |
| Ollama | 本地服務層 | 把模型包裝成可在本地跑的服務 |

---

## 二、核心術語字典

### base model
你一切客製化行為的起點。  
如果是純 base，通常更接近預訓練底子；如果是 instruct，代表它已經經過一輪 instruction tuning。

### instruct
比起 raw base，更像已經被教過如何跟人互動、怎麼跟隨指令的版本。  
你這整條路基本上都是在 `Llama-3.1-8B-Instruct` 上做增量。

### weights
模型真正的參數。  
如果說 prompt 是角色設定、template 是劇本格式，那 weights 就是演員原本的大腦與底子。

### adapter
掛在 base model 上的一組額外可訓練權重。  
可以分開存，不一定要 merge。

### fine-tuned adapter
已經被訓練過的 adapter，也就是你前面存出來的：
- `adapter_model.safetensors`
- `adapter_config.json`

### LoRA
Low-Rank Adaptation。  
一種 PEFT 路線，用少量可訓練參數去改模型行為。  
LoRA 不是訓練目標，它是參數更新方式。

### PEFT
Parameter-Efficient Fine-Tuning。  
泛指那些不想全量打開模型、希望用更少參數完成微調的方法生態。

### SFT
Supervised Fine-Tuning。  
用示範答案教模型怎麼回答。

### LoRA SFT
用 LoRA 這種 PEFT 路線，去做 SFT。  
你前面大多數小實驗都屬於這一類。

### DPO
Direct Preference Optimization。  
用 `prompt + chosen + rejected` 這種偏好對，教模型更偏向某種答案。

### TRL
Transformers Reinforcement Learning。  
Hugging Face 生態裡處理 SFT、DPO、偏好訓練等常見 trainer 的工具庫。

### SFTTrainer
專門處理示範式監督微調的 trainer。

### DPOTrainer
專門處理偏好資料、chosen / rejected 結構的 trainer。

### tokenizer
把文字切成 token，並轉成模型真正吃得下去的輸入。  
在 chat model 裡，它常常也和 template 層一起工作。

### chat template
把 user / assistant / system 角色與訊息，排成模型預期的對話格式。  
它不是單純美化格式，而是直接影響模型輸入結構。

### prompt-completion
比較傳統的資料格式：
- prompt
- completion

### conversational
比較像聊天模型的資料格式：
- messages
- assistant reply

### few-shot
在 prompt 裡直接塞幾段示範例子。  
不是寫進模型權重，而是寫進單次請求的上下文。

### prefix tuning
一種比 prompt 更接近參數層、但通常又比 LoRA 更輕的 tuning 路線。  
主線只需知道它是 LoRA 的相鄰方法，不必深鑽。

### prompt tuning
比起真的改權重，更像學一小段可訓練的提示表示。  
跟 prefix tuning 很像，但不完全相同。

### q_proj / k_proj / v_proj / o_proj
attention 裡幾個核心 projection 層。  
你前面的 baseline / qkvo 路線，就是在決定 LoRA 要掛到這些模組中的哪些地方。

### all-linear
一種 shorthand，表示 LoRA 要掛到模型中更廣泛的 linear 模組，不只 attention projection。

### target_modules
在 `LoraConfig` 裡指定 LoRA 要掛到哪些模組。

### layers_to_transform
指定這些模組要掛在哪幾層，例如只掛後半層。

### layers_pattern
指定模型層結構的匹配規則。  
通常只有在做 layer-selective LoRA 時才需要碰。

### model.model.norm
模型接近輸出端的一層 normalization。  
打開它，行為很容易更有感，成本也更高。

### lm_head
最後把 hidden states 投到詞彙表 logits 的輸出頭。  
同樣靠近輸出端，所以很敏感。

### partial FT
只打開部分原始權重做 fine-tune。  
比 LoRA 深，但比 full fine-tune 保守。

### full fine-tune
直接訓整顆或大範圍原始權重。  
成本最高，風險也最高。

### merge
把 adapter 學到的增量折回 base model 權重。  
完成後就不再是 base + adapter，而是一份完整模型。

### Safetensors
一種常見的權重檔格式。  
不是模型類型，而是權重容器。

### GGUF
常見於本地量化推理生態的權重容器格式。  
不是另一種模型人格。

### quantization
把高精度權重換成更輕、更省空間、更本地友善的表示方式。  
通常是為了讓模型更跑得動，不是讓模型更聰明。

### fp32 / fp16
比較高精度的表示方式。  
越高精度通常越重。

### q4 / q4_0 / q4_K_M
4-bit 量化家族的一些常見變體。  
對主線讀者最重要的不是死背縮寫，而是知道它們比 fp16 輕很多。

### blob
通常不是新模型，而是工具鏈內部儲存或引用某些模型實體的表示方式。

### Modelfile
Ollama 的模型包裝藍圖。  
它可以定義：
- FROM
- SYSTEM
- TEMPLATE
- PARAMETER
- MESSAGE
- 以及某些模型來源路徑

### Ollama
本地模型服務與封裝工具。  
把模型打包成一個可在本地 `run` 的服務。

---

## 三、常見參數對照

### `r`
LoRA 容量旋鈕之一。  
不是越大越好。

### `lora_alpha`
LoRA 影響力的縮放係數。  
不是 learning rate，但會影響增量更新的表現。

### `learning_rate`
每一步更新參數的步幅。  
不是越高越好，太高容易不穩，太低又可能學不到。

### `num_train_epochs`
整份資料完整跑幾輪。  
資料少時，epoch 太高反而容易過擬合或把模型推歪。

### `max_length`
每筆資料最多吃多長。  
越長越重。

### `gradient_accumulation_steps`
如果 batch 開不起來，可以累積幾步梯度再更新。  
某種程度是在用時間換空間。

### `dataloader_pin_memory`
在 CUDA 場景常被用來改善搬運，但在你前面的 MPS 場景裡，不一定有幫助。

### `temperature`
控制 sampling 發散程度。  
只有在 `do_sample=True` 時才真正有意義。

### `top_p`
另一種 sampling 限制。  
同樣通常要在 sampling 模式下才會生效。

### `do_sample`
是否走 sampling generation 路線。  
如果是 `False`，很多 sampling 參數都會被忽略。

---

## 四、最值得記住的幾句話

- SFT 教模型怎麼答，DPO 教模型更偏向哪個答案。
- LoRA 是參數更新方式，不是訓練目標。
- Modelfile 不是比較長的 system prompt，它是更高一層的封裝藍圖。
- adapter 可以不 merge；merge 只是某種部署路線比較順。
- quantization 能解慢，不一定能解笨。
- 主力版本不是改最多的版本，而是最穩、最能保住底模、又真的解到問題的版本。
