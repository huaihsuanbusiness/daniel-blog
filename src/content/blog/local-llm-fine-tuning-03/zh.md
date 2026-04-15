---
title: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰系列 part 03｜工具鏈怎麼分工：Hugging Face、Transformers、PEFT、TRL 與 Ollama"
description: ""
categories: ["ai"]
tags: []
date: 2026-04-08T13:00:00
series: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰"
seriesOrder: 3
---

我第一次真的跑到 `python train_lora.py`，不是先死在顯卡，也不是先死在 loss。是先死在工具鏈。

那個 moment 很像你明明覺得自己已經走到工地現場了，結果安全帽都還沒領到。模型權重還沒拿到，套件版本彼此扯後腿，環境裡的 `transformers` 跟 `trl` 不一定對得上，Hugging Face 明明登入了還是抓不到 gated model。那時候我才真正意識到，本地 LLM 微調不是一條「有模型、有資料、寫腳本、開跑」的直線。你先是在跟工具鏈談判，談完了才有資格碰到模型本身。

這篇想做的，就是把這條工具鏈切乾淨。因為如果你沒先弄懂誰在做什麼，後面很容易把所有東西都當成「模型相關工具」，然後在錯的地方浪費力氣。

![Toolchain map for local LLM fine-tuning](./resource/local-llm-toolchain-map.svg)

## 先講最無聊、也最該先做的事：隔離環境

如果你只是偶爾跑別人的 notebook，系統 Python 亂裝幾個套件，短時間內也許真的不會立刻炸。但只要你打算開始做本地微調實驗，我幾乎都會把隔離環境視為第一步，而不是整理桌面之後才順手做的事。

原因很簡單：你不想讓一個專案的依賴，默默把另一個專案搞壞。這個專案需要某個版本的 `transformers`，另一個專案又需要不一樣的 `trl`。你今天升了 `peft`，明天另一個資料夾裡原本會跑的腳本可能就直接死掉。

所以 `python -m venv .venv` 這件事沒有浪漫，它只是替每個專案開一個自己的實驗箱。你一進資料夾就知道：

- 這個專案的環境在哪
- 它的依賴長什麼樣
- 出問題時邊界在哪
- 要刪、要重建、要備份時怎麼處理

這種事很無聊，也正因為它無聊，大家才特別容易跳過。然後後面每一步都在還債。

## 第二關：你登入了，不代表你拿到了模型

我第一次真的撞牆，就是撞在 Hugging Face 的 gated model 上。

很多人剛開始會把 Hugging Face 想成一個模型下載站。這個理解不算錯，但太薄。它當然是模型、資料集、工具、社群入口，但只要模型作者開了 gated access，事情就不再是「登入後直接抓」這麼簡單。Meta 在 Hugging Face 的 Llama 家族頁面就寫得很清楚：你需要接受授權與使用條款，請求會被處理，並不是只要登入就算拿到。citeturn743259search16turn743259search4

這也是為什麼你明明已經 `huggingface-cli login` 了，`from_pretrained()` 還是可能直接回你 403。問題不是程式碼，也不是模型壞了，而是你根本還沒真的拿到那顆模型的使用權。

這聽起來很行政，但它會直接改寫你的實驗節奏。因為你可能什麼都準備好了，最後只是卡在「還沒過門」。

## 所以 Hugging Face 到底在這條鏈上扮演什麼角色

Hugging Face 比較像倉庫、入口站和協議中心。

它負責：

- 模型託管
- 資料集託管
- 權限與授權流程
- model cards
- 與 `transformers`、`datasets`、`trl`、`peft` 這些生態的接軌

它不是訓練器，但很多開源工作流沒有它根本開始不了。尤其像你這條路，從 `meta-llama/Llama-3.1-8B-Instruct` 出發時，Hugging Face 幾乎就是入口。Meta 的模型卡也清楚寫了 Llama 3.1 8B Instruct 是 instruction-tuned text model，對話導向，而且是多語 use cases。這些不是裝飾資訊，而是你後面 deciding prompt format、chat template 與 base expectations 的前提。citeturn743259search0

## Transformers：你跟模型本體打交道的主工具箱

等權限拿到了，下一個真正常駐場的，是 `transformers`。

這個 library 的角色比較直白：

- 載模型
- 載 tokenizer
- forward / generate
- 一般訓練骨架
- config 與 generation config 的管理

很多人第一次接觸時會誤會 `transformers` 就是整套微調框架。其實不是。它更像是你跟模型本體打交道的基礎工具箱。很多更高層的東西，包括 TRL 與 PEFT，其實都是站在這個生態上往上搭。

這也是為什麼很多看起來像「TRL 的問題」，最後其實是 tokenizer、template 或 base model loading 的問題。因為底層還是 `transformers`。

## tokenizer 與 chat template：它們是工具鏈的一部分，不只是文本前處理

這一層一定要在這篇提，因為它雖然技術上很基礎，實務上卻常常害人繞遠路。

tokenizer 不是單純的切字器。對 chat model 來說，它也常跟 chat template 一起決定輸入協議。誰是 system、誰是 user、哪裡接 generation prompt，這些都會變成 token sequence 的一部分。Meta 官方文件直接提供了 Llama 3.1 的 prompt formats，而 Hugging Face 生態裡許多 trainer 與 processor 行為也都預設你會尊重底模本來的輸入格式。citeturn743259search8turn743259search0

這就是為什麼 prompt-completion 跟 conversational 不是單純長相不同，而是兩種資料表達方式。前者比較像你給一個提示和一個完成答案；後者則帶著多輪對話角色。兩者都能被拿來做監督式訓練，但前提是你的資料格式要跟你用的 trainer、tokenizer、chat template 對得起來。

## PEFT：不是另一種模型，而是省參數地改模型的方法集合

PEFT 是 Parameter-Efficient Fine-Tuning。官方文件的定位也很清楚：它是一個用來高效調整大型預訓練模型的 library，核心精神是不去動全部參數，只改少量額外或局部參數，就希望達到接近 full fine-tune 的效果。LoRA 是其中最有名的一種方法。citeturn743259search10turn743259search2

所以 PEFT 不是新模型，也不是新 trainer。它比較像一套「怎麼省成本地改參數」的施工工具。LoRA、adapter 這些東西，進了 PEFT 才真的有一個穩定的工程位置。

這也是為什麼我後來會把「LoRA 是哪一層」講得很清楚：LoRA 不回答你怎麼教模型，它回答的是你怎麼改參數。SFT 和 DPO 是教法；PEFT 和 LoRA 比較像施工方式。

## TRL：站在 Transformers 上面的後訓練工具箱

到 TRL 這裡，問題開始不只是「怎麼載模型」，而是「這次我要做哪一種 post-training」。

Hugging Face 的 TRL 文件把它定位成 post-training foundation models 的 library，包含 SFT、DPO 等訓練路線。換句話說，它不是單純的 RL 工具，也不是只給偏好優化用的東西。它是一個把多種後訓練 trainer 收進來的工具箱。citeturn743259search9turn743259search13

這也是為什麼你會看到：

- `SFTTrainer`
- `DPOTrainer`

同時都出現在 TRL 裡。

也就是說，TRL 幫你回答的是：資料格式、訓練方法、log、loss、偏好資料、指令資料，這一套 post-training 該怎麼站穩。而不是模型本體要怎麼載。

## SFTTrainer 與 DPOTrainer 的工具鏈位置

這裡值得順手切一刀，因為很多人會把 trainer 名稱當成只是 API 差異。其實不是。

- **SFTTrainer**：拿示範資料，教模型怎麼回答
- **DPOTrainer**：拿偏好資料，教模型更偏向哪一個答案

兩者都在 TRL 裡，表示它們是後訓練方法層的兄弟工具，不是模板或 adapter 層的東西。這個分層一旦清楚，後面你才不會問出像「LoRA 和 DPO 哪個比較深」這種其實把兩個維度混在一起的問題。

## Ollama：不是訓練器，而是你把成果變成可用模型的地方

這一點我後來越切越清楚。剛開始很自然會想：我都在 Ollama 跑模型了，那是不是也應該在 Ollama 裡把微調一路做完？實際上通常不是這樣。

Ollama 很強的地方在於：

- 跑模型
- 管理模型
- 用 Modelfile 打包外層設定
- 匯入已經準備好的模型或轉換後產物

但它不擅長的，是你一開始那段訓練工地：

- 載原始 HF 權重後開始寫 trainer
- 掛 LoRA
- 跑 SFT / DPO
- 控制中間訓練細節

所以比較穩的工作流通常是：

1. 在 Hugging Face 生態裡做訓練
2. 拿到 adapter 或 merge 後的完整模型
3. 再把成果帶回 Ollama

接受這個分工很重要，因為你不會再期待 Ollama 什麼都做。它比較像本地 runtime 與封裝層，不是整條訓練鏈的全部。

## adapter、Safetensors、GGUF 先在工具鏈裡站好位置

這幾個名詞很容易在一開始就纏在一起，所以我喜歡先用位置感來分。

- **adapter / fine-tuned adapter**：通常是 LoRA 這類 PEFT 產物，代表你訓出來的那層附加參數
- **Safetensors**：一種權重檔格式，常見於 HF 生態裡的 adapter 與 merge 後模型
- **GGUF**：更常出現在本地量化推理生態裡的模型容器格式

這三個不是同一種東西。adapter 比較像內容，Safetensors / GGUF 比較像容器或包裝格式。這件事先理解，後面講 merge、量化、回 Ollama 時就不會一團霧。

## 什麼時候不要把所有問題都丟給工具鏈

這篇也要留一個反例。因為只要一談工具，很容易掉進另一個極端：什麼問題都想成 tooling 問題。

如果你的目標只是讓模型回答短一點、先給結論、語氣更像技術助理，而且你根本沒有打算動權重，那很多時候你並不需要先衝進 `transformers + peft + trl`。你可能只需要：

- 一顆合適的 instruct base
- 一個寫得像樣的 Modelfile
- 幾組乾淨的 few-shot
- 一點 runtime 參數調整

換句話說，工具鏈很重要，但不是每次都要把整條鏈全部啟動。你得先知道問題在哪一層，才知道這條鏈要走到哪裡。

## 下一篇要接什麼

工具鏈切清楚之後，下一步終於可以回到那個最容易被壓成一團的問題：SFT、LoRA、full fine-tune 這些詞，到底各自在改什麼？哪些是教法，哪些是施工方式，哪些才是真正動到 base weights 的深水區？

那是下一篇。
