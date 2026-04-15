---
title: "ComfyUI 系列 06｜模型怎麼裝？checkpoints、clips、loras、vae、T5XXL、GGUF、FP8 一次講明白"
description: "到這一篇，事情終於從「理論上懂」進入「手會不會抖」的階段。"
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:15:00
featured: false
---

到這一篇，事情終於從「理論上懂」進入「手會不會抖」的階段。

因為你前面就算已經知道要選 SDXL、Flux、或 HiDream，真正開始下載模型後，通常還是會被資料夾名字和一堆名詞打成一團：

- checkpoints 是什麼？
- clip 跟 clip_l 是什麼？
- vae 是什麼？
- loras 又是什麼？
- Flux 為什麼還要 T5XXL？
- GGUF 是什麼？為什麼又要 custom node？
- FP8 checkpoint 是什麼？是不是裝了就比較省？
- 為什麼 workflow 一打開就滿地紅節點？

這篇的目標，就是把這一整坨整理成**真的可以照著裝**的版本。

先講一句最重要的：

> **ComfyUI 本身很小，真正胖的是模型。**
> 你安裝程式本體時可能還覺得一切歲月靜好，開始抓 checkpoint、VAE、LoRA、文字編碼器之後，硬碟和記憶體才會正式開始跟你談判。

---

## 先把四個最常見的資料夾搞懂

ComfyUI 官方文件講得很清楚，模型檔通常都放在 `ComfyUI/models/` 底下，然後依類型分資料夾。新手最常碰到的幾個就是：

- `models/checkpoints/`
- `models/clip/`
- `models/loras/`
- `models/vae/`

如果你記不住太多東西，先記這句就好：

> **checkpoint 是主菜，clip 是看 prompt 的，vae 是負責影像編解碼的，lora 是拿來加風味的。**

### checkpoints 是什麼？
checkpoint 可以想成整顆主要模型的重量包。  
像 SD 1.5、SDXL、某些社群微調模型，很多時候你下載到的一顆 `.safetensors` 檔，放進 `models/checkpoints/`，再用 `CheckpointLoaderSimple` 載入，就可以開始出圖。

### clip / clip_l 是什麼？
CLIP 是文字編碼器。  
它的工作不是直接畫圖，而是把你的 prompt 轉成模型能理解的表示。  
在很多 Stable Diffusion 系統裡，你不太會特別感覺到它存在，因為它常被包在 checkpoint 裡。

但到一些比較新的 workflow，尤其 Flux 這類比較重的系統，你會明顯看到：
- `clip_l`
- `t5xxl`
- 不同的 text encoder node

### vae 是什麼？
VAE 是 Variational Autoencoder。  
你可以把它想成影像的編碼 / 解碼器，負責把模型內部的 latent 表示轉成你最後看到的圖片。

### loras 是什麼？
LoRA 是一種很常見的微調權重格式。  
它的定位不是把整顆模型換掉，而是像在主模型上再掛一個比較小的風格模組。

---

## 一張表先看：這些東西到底放哪裡

| 類型 | 主要作用 | 常見副檔名 | 通常放哪裡 | 常見對應節點 |
| --- | --- | --- | --- | --- |
| checkpoint | 主模型本體 | `.safetensors` | `models/checkpoints/` | `CheckpointLoaderSimple` |
| clip / clip_l | 文字編碼器 | `.safetensors` | `models/clip/` | `CLIP Loader`、各類 text encoder 節點 |
| T5XXL | 大型文字編碼器 | `.safetensors`、GGUF 量化檔 | `models/clip/` 或相應 GGUF 路徑 | T5 / dual text encoder 類節點 |
| vae | 影像編解碼 | `.safetensors` | `models/vae/` | `VAE Loader` |
| lora | 微調風格權重 | `.safetensors` | `models/loras/` | `Load LoRA` |
| unet / diffusion model | 生成核心模組 | `.safetensors`、GGUF 等 | 依 workflow 而定，常見 `models/unet/` | 專用 loader、GGUF loader |
| custom node | 額外功能節點 | 資料夾 / Python 套件 | `custom_nodes/` | 不是模型，是擴充功能 |

---

## 模型安裝的基本 SOP

### 步驟 1：先確認你下載的是什麼類型
不要一看到 `.safetensors` 就以為全部都丟到 `checkpoints/`。

同樣是 `.safetensors`，它可能是：
- checkpoint
- VAE
- LoRA
- CLIP
- UNet
- T5XXL

### 步驟 2：看模型頁面或 workflow 說明
最準的來源通常是：
- 官方模型頁
- ComfyUI template / workflow 範例
- workflow 作者的 readme

### 步驟 3：放到正確資料夾
最常見的就是：
- checkpoint → `models/checkpoints/`
- VAE → `models/vae/`
- LoRA → `models/loras/`
- CLIP / T5 → `models/clip/`

### 步驟 4：重開或 refresh ComfyUI
有些情況下 ComfyUI 會自動抓到新模型，有些時候重開比較乾脆。

### 步驟 5：先用官方或簡單 workflow 驗證
ComfyUI 官方 troubleshooting 也建議，新模型先從 template workflow 或官方範例開始，不要一開始就拿來套最魔改的工作流。

---

## 為什麼有些模型只要一顆 checkpoint，有些卻像在組機？

### SD 1.5 / SDXL 類
你常常會遇到這種比較單純的情境：
- 一顆 checkpoint
- 視情況補一顆 VAE
- 視情況再掛 LoRA

### Flux / HiDream 類
這種比較新的重型 workflow，常常不只是主模型本體，還會牽涉：
- 額外文字編碼器
- T5XXL
- CLIP
- UNet / diffusion model 分件
- GGUF 量化版本
- 專用 loader node
- custom node

---

## LCM 是什麼加速技術？LCM Adapter 又是什麼？

LCM 全名是 **Latent Consistency Model**。  
但在 ComfyUI 實際安裝和使用時，很多人碰到的是 **LCM LoRA / LCM Adapter**。

它的概念是：
- 你本來有一顆 SDXL 或 SD 1.5
- 你再掛上一個 LCM adapter
- 讓這顆模型可以用更少步數出圖

### 為什麼需要 LCM Adapter？
因為它不是在取代 base model，而是在**幫 base model 開啟低步數快車道**。

---

## Hugging Face 是什麼？為什麼大家最後都會去那裡？

很簡單，它基本上就是模型世界的超大型倉庫與交換站。

你會看到大家常去 Hugging Face，不是因為它看起來最潮，而是因為它通常有：
- 官方模型卡
- 檔案列表
- licence
- 使用說明
- discussion
- 有些模型還會標 gated access

---

## Flux 為什麼這麼常踩坑？

因為它不是只有一顆模型大，而是整套流程都比較重。

最常見的坑通常是這些：

1. **你缺 loader node**
2. **你缺 custom node**
3. **你下載的是 GGUF，但 workflow 用的是普通 loader**
4. **你下載的是 safetensors，但 workflow 期待的是量化版本**
5. **你缺 T5XXL 或 CLIP**
6. **模型放錯資料夾**
7. **workflow 裡用的 scheduler / sampler 跟版本不合**

### Loader node 是什麼？
就是專門負責把某類模型檔載進來的節點。

### custom node 是什麼？
custom node 不是模型，是功能擴充包。  
它通常是一個安裝到 `custom_nodes/` 的額外節點套件。

---

## GGUF 是什麼？為什麼會冒出來？

GGUF 這個格式原本很多人是從 LLM 圈先認識的，它是 llama.cpp 生態裡很常見的量化格式。後來也有人把它拿來做影像模型某些部分的量化與載入支援。

它的吸引力很簡單：
- 想把模型壓小一點
- 想讓比較大的模型變得更容易塞進本地機器
- 想減少記憶體壓力

但代價也很真實：
- 你常常需要額外的 loader node
- 相容性沒有內建 checkpoint 那麼無腦
- workflow 比較容易多出一層複雜度

### 為什麼需要額外的 Loader node 或 custom node？
因為 ComfyUI 內建節點不一定認得這種量化格式。  
像 `city96/ComfyUI-GGUF` 這個專案，就是為了讓 ComfyUI 支援 GGUF 格式的模型檔。

### 為什麼有人又會把 GGUF 轉回 safetensors？
通常是為了：
- 相容性
- 流程單純
- 減少 custom node 依賴

---

## safetensors 是什麼？為什麼大家一直推？

safetensors 是 Hugging Face 推動的一種權重格式。  
它最大的賣點很簡單：

- 載入速度通常不差
- 結構清楚
- 不像 pickle 那類格式一樣帶有任意執行程式碼的風險

這也是為什麼現在只要有得選，我通常都會建議先拿 safetensors。

---

## UNet 是什麼？為什麼有些模型會要求你把它放到 `models/unet/`？

在很多 diffusion 模型裡，UNet 是負責主要去噪生成的核心網路之一。  
有些 ComfyUI workflow 不把整顆模型包成單一 checkpoint，而是把不同部分拆開。

這時你就可能看到：
- UNet 單獨放
- CLIP 單獨放
- VAE 單獨放

---

## T5XXL 是什麼？為什麼 Flux 會需要它？

T5XXL 本質上是大型文字編碼器。  
在 Flux 這類 workflow 裡，它不是拿來直接生圖，而是負責更完整地吃 prompt、理解文字，再把資訊丟給後面的生成系統。

### 哪裡下載？
常見來源會是 Google 的 `t5-v1_1-xxl`，或 ComfyUI 社群整理過、適配 workflow 的版本與量化版。  
原始 Hugging Face repo 上，完整 `t5-v1_1-xxl` 權重非常大，`model.safetensors` 就到 44.5GB。

### Q4 / Q5 差別是什麼？
如果你抓的是 GGUF 量化版，常見會看到：
- Q4
- Q5

大方向很簡單：
- **Q4**：比較省資源
- **Q5**：通常保留多一點品質，但更重

---

## CLIP 文字編碼器模型是什麼？為什麼需要它？

CLIP 的核心用途是把文字與影像放在同一個語意空間裡。  
對生成模型來說，它就是 prompt 進圖像系統之前的一個關鍵翻譯層。

### 有 OOM 風險嗎？
單獨一顆 CLIP 通常還好，但當它和大顆 T5XXL、Flux 主模型、MPS、其他中間張量一起工作時，總體資源壓力就會開始往上疊。

OOM 就是 out of memory。  
在 Apple Silicon 上它不一定每次都會漂亮地跳一個視窗。有時是：
- 變超慢
- ComfyUI 卡住
- 某個步驟失敗
- 程式直接被系統收掉

### Apple Silicon 的熱管理與 throttling 會怎樣？
蘋果晶片的熱管理通常比很多人想像中穩，會透過功耗控制與降頻來保護系統。

---

## LoRA 是什麼？為什麼需要 LoRA？

LoRA 是低秩微調權重。  
講白話一點，它讓你不用整顆重訓模型，就能往特定風格、角色或效果推一把。

### 為什麼常看到 RealisticVision？
因為很多人要的不是「模型能生出一張臉」，而是「皮膚、光線、鏡頭味、材質看起來比較像照片」。

### 為什麼 SDXL LCM 自己有時候不夠寫實？
不是因為它沒能力，而是因為：
- 它的重點本來就在速度
- 低步數本來就容易損失細節
- 沒有額外寫實微調時，膚質、光影、材質容易顯得太滑

---

## clip_l 是什麼？去哪裡下載？

`clip_l` 一般指的是 CLIP-L / ViT-L 級別的文字編碼器資產。  
在某些 workflow，尤其 Flux 相關流程裡，會明確要求它。

最常見的來源會是：
- OpenAI 的 CLIP ViT-L/14 相關 Hugging Face repo
- ComfyUI 社群整理過的 workflow 打包版本

---

## VAE 是什麼？去哪裡下載？

VAE 前面有提到，它負責影像編碼 / 解碼。  
像在 SDXL 與一些社群 workflow 中，常會指定特定 VAE，例如 `ae.safetensors` 之類的檔案。

來源通常會是：
- 官方模型 repo
- workflow 指定的 release
- ComfyUI 社群整理包

---

## KSampler 是什麼？Flux2Scheduler 又是什麼？

### KSampler 是什麼？
KSampler 是 ComfyUI 裡很核心的一個採樣節點。  
簡單說，它負責「怎麼從雜訊一步一步走到圖像」。

### Flux2Scheduler 是什麼？
這通常是 Flux 類 workflow 裡，專門搭配 Flux 模型族的 scheduler / 時序安排節點。

### sigma 對接是什麼？為什麼會出 bug？
你可以把 sigma 理解成去噪過程裡的一套數值節奏。  
不同的 sampler、scheduler、模型實作如果沒有對齊，就很容易出現：
- 結果怪異
- 直接錯誤
- workflow 表面能跑，結果卻很怪

### 為什麼 GGUF + MPS 容易冒出這種 bug？
這個組合的麻煩通常不是單一點，而是多重交會：
- GGUF 本身是量化路徑
- MPS 是 Apple 的 GPU backend
- custom node 可能有自己的張量處理方式
- Flux 類 workflow 的 scheduler 又比較敏感

---

## 為什麼有人會改用 FP8 checkpoint？CheckpointLoaderSimple 又為什麼能取代 GGUF workflow？

### FP8 版本的 Flux checkpoint 是什麼？
簡單說，就是把模型權重量化到 FP8 精度的 checkpoint。  
目的通常是：
- 降低資源壓力
- 讓大模型更容易在本地跑

但要注意，**FP8 不等於模型突然變得很小巧**。  
以社群常見的 Flux FP8 檔來看，仍然可能是 10GB 到 17GB 這個級別。

### CheckpointLoaderSimple 是什麼？
它是 ComfyUI 內建的 checkpoint 載入節點。  
如果你拿到的是一顆 ComfyUI 能直接認得的 checkpoint 格式，而且相關文字編碼器 / VAE 搭配得上，那你就有機會走比較單純的路。

### 為什麼它有時能取代 GGUF workflow？
因為 GGUF workflow 的複雜度，常常來自：
- 額外量化格式
- 額外 loader
- 額外 custom node

如果你拿到的是整理好的 FP8 checkpoint，整條路徑有時候就會單純很多。

---

## 這篇最後，給新手一套最實用的安裝順序

### 路線 A：SDXL / SD 1.5 新手穩定版
1. 先裝 checkpoint  
2. 再補 VAE（如果 workflow 需要）  
3. 再裝 LoRA  
4. 先用簡單 workflow 驗證  
5. 最後才碰 LCM Adapter  

### 路線 B：Flux 類 workflow
1. 先確認 workflow 要哪一版主模型  
2. 再確認是否需要 `clip_l`、`t5xxl`、VAE  
3. 再確認是 safetensors 還是 GGUF 路線  
4. 如果是 GGUF，先裝 custom node / loader  
5. 全部檔案放對資料夾後，再開 workflow  
6. 如果滿地紅，先檢查缺的是節點還是模型，不要先怪人生

---

## 一句話收掉這篇

> **在 ComfyUI 裡，模型安裝最難的不是下載，而是分清楚每個檔案在整套 workflow 裡到底扮演什麼角色。**
