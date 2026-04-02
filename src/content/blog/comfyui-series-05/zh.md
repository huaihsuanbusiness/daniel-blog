---
title: "ComfyUI 系列 05｜模型到底怎麼選？SD 1.5、SDXL、LCM、Turbo、Pony、Flux、HiDream 一次講清楚"
description: "如果你剛裝好 ComfyUI，下一個很容易把人搞到眼神放空的，就是模型。"
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:14:00
featured: false
---

如果你剛裝好 ComfyUI，下一個很容易把人搞到眼神放空的，就是模型。

你會看到一堆名字在眼前亂飛。SD 1.5、SD 2.1、SDXL、LCM、Turbo、Pony、Flux、HiDream。每個都有人推，每個都有人說「這個比較神」，然後你一看檔案大小，SSD 空間先抖一下，RAM 也跟著抖一下。

先講我這篇的核心結論：

> **不是最新、最大、最紅的模型就一定最適合你。**
> 在 Mac mini M4 16GB 這種機器上，真正重要的不是「理論上跑不跑得動」，而是你想做什麼圖、願不願意等、以及你能不能接受整套 workflow 變複雜。

如果你只是想先把本地出圖這件事跑起來，甚至想要更自由一點，連 `generate something naughty` 這種雲端平台不太願意碰的題材也能自己掌握，那模型選型就更重要了。因為本地模型的魅力，從來不只是省 API 費，而是你終於不用被別人的 guardrail 決定你今天能做什麼。只是自由不是免費午餐，它通常會換來更麻煩的安裝、更肥的模型，以及更需要自己判斷的代價。

這篇不是要把所有模型都講成百科全書，而是幫你回答幾個比較實際的問題：

- 這些模型到底差在哪裡？
- 誰開發的？是官方 base model 還是社群微調模型？
- 16GB 到底跑不跑得動？
- 想要快、想要寫實、想要動漫、想要少踩坑，該先挑哪個？

---

## 先把模型分成三大類，不然很容易全混在一起

很多人第一次看這些名字會卡住，不是因為模型本身太難，而是因為**不同層級的東西被放在同一張桌上比**。

我自己的分法比較簡單：

1. **基礎模型 / base model**
   - 例如 SD 1.5、SD 2.1、SDXL、FLUX.1、HiDream-I1
   - 這些是整個畫圖能力的底子
   - 通常比較大，也比較決定整體風格上限

2. **加速版或蒸餾版**
   - 例如 LCM、SDXL Turbo、FLUX.1 Schnell
   - 目標通常不是把畫質衝到最高，而是讓你用更少步數更快出圖

3. **社群微調模型 / finetune / LoRA 生態**
   - 例如 Pony、RealisticVision、各種角色風格 LoRA
   - 這些更像是把某個 base model 往特定風格拉過去

這個分類很重要。因為你不能拿 Pony 跟 SDXL 當成完全同一層級的東西比，也不能把 LCM 當成一顆獨立宇宙的「全新模型」來理解。那樣很快就會掉進名詞泥沼。

---

## 一張表先看大方向

| 模型 / 系列 | 類型 | 主要開發者 | 典型風格 / 用途 | 速度傾向 | 檔案與資源壓力 | 16GB 技術上可跑？ | 我會怎麼建議 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SD 1.5 | base model | Stability AI / Runway 生態 | 老牌萬用、LoRA 很多、輕量 | 快 | 低 | 可以 | 新手、舊 LoRA、生態完整 |
| SD 2.1 | base model | Stability AI | 比 1.5 新，但社群熱度較低 | 中 | 中 | 可以 | 除非你有既有 workflow，不然通常不是首選 |
| SDXL | base model | Stability AI | 畫質、構圖、字面理解比舊代穩 | 中慢 | 中高 | 可以 | 現在最穩的通用起點之一 |
| LCM | 加速技術 / adapter | LCM 團隊 | 少步數快速預覽 | 很快 | 低到中 | 可以 | 想快出圖時很好用 |
| SDXL Turbo | 蒸餾快模型 | Stability AI | 即時感、少步數生成 | 很快 | 中高 | 可以 | 預覽、快速試 prompt |
| Pony Diffusion | 社群微調模型 | 社群模型 | 二次元、角色感、特定畫風很強 | 中 | 中高 | 可以 | 動漫圈很常見，但提示詞習慣不太一樣 |
| FLUX.1 dev | base model | Black Forest Labs | 寫實、構圖、文字理解強 | 慢 | 很高 | 可以，但會很吃力 | 想追畫質可以碰，但 16GB 不輕鬆 |
| FLUX.1 schnell | 蒸餾快模型 | Black Forest Labs | 比 dev 快很多，保留 Flux 風格 | 中快 | 高 | 可以 | 16GB 想碰 Flux，通常先從 schnell 開始 |
| HiDream-I1 | base model | HiDream.ai | 高畫質、偏新世代開放模型 | 慢 | 非常高 | 技術上可跑，但不漂亮 | 16GB 不建議當日常主力 |

---

## SD 1.5：老派，但到現在還是很多人離不開

Stable Diffusion 1.5 雖然已經不是新東西了，但它現在還活著，不是靠情懷，而是因為它真的夠輕、夠熟、社群資產夠多。

如果你今天的目標是：

- 先快速熟悉 ComfyUI
- 想套很多老 LoRA
- 想跑一些比較輕的 workflow
- 不想一開始就讓 Mac mini 進入烤箱模式

那 SD 1.5 其實還是很合理的起點。

它的優點很務實：

- 生態超大
- 教學超多
- 檔案相對輕
- 對硬體比較友善
- 舊有寫實、動漫、角色 LoRA 一堆都還在這個系統上活得很好

缺點也很明顯：

- 提示詞理解和構圖能力跟新一代模型還是有差
- 高解析度、複雜場景、細節穩定度通常不如 SDXL 之後的模型
- 寫字能力不算強

### 誰開發的？
SD 1.5 來自 Stable Diffusion 生態，原始版本長期由 Stability AI 與 Runway 相關釋出流傳。現在 Hugging Face 上常見的是社群鏡像版本，因為原始 repo 的歷史路徑已經有些變動。這也是為什麼你查資料時會看到老連結失效。這不代表模型不能用，只是來源要看清楚。

### 大小與 16GB 體感
常見的 `v1-5-pruned-emaonly.safetensors` 大約 4.27GB。對 16GB 統一記憶體的 Apple Silicon 來說，這算是友善很多的等級。

### 適合誰？
- 新手
- 想玩大量 LoRA
- 動漫 / 插畫 / 舊社群模型資產很多的人
- 想先求穩再求神的使用者

---

## SD 2.1：不是不能用，但現在通常不是第一個會推薦的

SD 2.1 當年推出時是明顯升級，但現在回頭看，它有一點尷尬。

它不是差，而是**剛好卡在 SD 1.5 與 SDXL 之間**。  
如果你要的是輕量與社群資產，很多人會回去 SD 1.5。  
如果你要的是畫質與新一代模型表現，多半直接上 SDXL。

所以 SD 2.1 現在比較像是：

- 你手上剛好有既有 workflow
- 你知道自己為什麼用它
- 或者你就是在延續一套舊專案

不然對大多數新手來說，它很少是最順手的第一站。

---

## SDXL：現在最穩的通用起點之一

如果你問我，2026 年要在本地玩圖，又不想一開始就衝到 Flux 或 HiDream 那種重量級怪獸，我通常會先看 **SDXL**。

原因很單純：

- 它比 SD 1.5 更像新一代模型
- 對 prompt 的理解、整體構圖、細節穩定度通常更好
- 社群資產也夠大
- 在 ComfyUI 裡的支援非常成熟

SDXL base 的 safetensors 常見檔案大約 6.94GB，明顯比 SD 1.5 大，但還不到完全不可碰的程度。對 Mac mini M4 16GB 來說，它算是那種**技術上可跑，而且日常也還算能接受**的級別。

---

## LCM：它不是新的宇宙，而是一種讓你少走很多步的加速法

LCM 這個名字很容易被誤會。很多人第一次看到會以為它是一顆獨立新模型，但更準確的理解是：

> **LCM 比較像是一種加速技術，或一種可套用在既有模型上的蒸餾 adapter。**

它的價值在於，可以把生成步數大幅壓低，像是 2 到 8 步就出圖。  
這對兩種人特別有吸引力：

1. 你只是想快速預覽 prompt 與構圖
2. 你的機器不是不能跑，但你不想每張圖都等很久

LCM LoRA 本身也不算大。以 `lcm-lora-sdxl` 為例，模型卡上標的是 197M。

### 為什麼有時候會需要 LCM Adapter？
因為它不是把 base model 整顆換掉，而是幫既有模型掛上一個「我現在要走快車道」的模式。  
你想把 SDXL 這種比較重的模型變得更適合快速試 prompt，LCM 就很有用。

---

## SDXL Turbo：不是只快而已，它是「天生就想少步數」

LCM 比較像是幫原本的模型裝一個加速模組。  
**SDXL Turbo** 則更像是**一開始就為低步數生成而訓練的版本**。

### Turbo 跟 LCM 差在哪？
- **LCM**：更像加速技巧 / adapter，通常附著在既有模型上
- **Turbo**：模型本身就是為低步數出圖訓練的

你可以把它想成：
- LCM 比較像幫原本的車改渦輪
- Turbo 比較像本來就是一台性能取向的車

---

## Flux：很香，但更重

Black Forest Labs 的 FLUX.1 系列，魅力來自它對文字理解、構圖、寫實感與整體表現的確很能打。

但你如果用的是 16GB Apple Silicon，要先有一個心理準備：

> **Flux 是可以跑，但不等於跑得輕鬆。**

### FLUX.1 dev
`FLUX.1 [dev]` 是 12B 參數的 rectified flow transformer。這顆比較像主力高品質版本。  
問題也很直接：

- 模型大
- 載入壓力高
- 需要的文字編碼器與周邊資產也不輕
- 在 16GB 上雖然技術上可跑，但整體體驗很容易進入「能動，可是有點辛苦」的區間

### FLUX.1 schnell
`FLUX.1 [schnell]` 同樣是 12B 參數，但定位更偏向快速生成。  
如果你想碰 Flux，又不想一開始就把自己推進最重的 workflow，schnell 通常比較像 16GB 使用者會先摸的版本。

### Schnell 跟 Turbo、LCM 的差別
- **Schnell**：Flux 家族裡偏快的原生成員
- **Turbo**：SDXL 系統裡偏快的蒸餾模型
- **LCM**：是一種加速技巧，不是單一模型

---

## Pony：它不是官方 base model，而是社群文化本身

Pony Diffusion 這一系，在很多人心中根本已經不是單一模型，而是一整個社群語言。

它通常建立在 SDXL 生態上，但定位更像**高度風格化、角色導向、社群微調模型**。

### 它強在哪？
- 對特定角色感、構圖、姿勢、二次元風格很有自己的味道
- 社群資產很活
- 對「你就是想要那種畫風」的人來說，它不是替代品，是主菜

### 也要注意什麼？
- 它不是通用 base model 的萬用解
- 提示詞習慣和很多教學文會不太一樣
- 常常比較吃社群 workflow 與搭配資產

---

## HiDream-I1：很猛，但 16GB 用起來不會很優雅

HiDream-I1 是新一代開放影像模型裡很受關注的一顆。官方模型卡直接寫得很兇：17B 參數，主打高品質生成。

- 17B
- 新世代架構
- 相關文本編碼器與配套也不輕
- 檔案分片非常大

從 Hugging Face 上的 ComfyUI 相關打包版本來看，FP8 的 diffusion model 檔案也還是在十幾 GB 這個級別。這種東西在 Mac mini M4 16GB 上不是不能跑，但體感通常不會是「順」。

---

## 為什麼很多人最後會停在 SDXL，而不是一路衝去 Flux 或 HiDream？

因為選模型不是在選海報冠軍，而是在選**你願不願意每天都用它**。

很多人的實際決策長這樣：

- **SD 1.5**：夠輕、夠熟、LoRA 很多
- **SDXL**：更平衡，畫質與資源需求之間抓得不錯
- **Flux**：很香，但更重
- **HiDream**：更猛，但更不適合小機器當日常主力

所以如果你問我 Mac mini M4 16GB 最現實的建議，我會這樣排：

### 16GB 最穩的起點
1. **SDXL**
2. **SD 1.5**

### 16GB 想追快
1. **SDXL + LCM**
2. **SDXL Turbo**
3. **FLUX.1 schnell**（前提是你願意接受整體更重）

### 16GB 想追畫質但要有心理準備
1. **FLUX.1 dev**
2. **HiDream-I1**

---

## 那 SDXL LCM 為什麼常常看起來不夠寫實，甚至有點塑膠感？

原因通常不是單一點，而是幾個因素疊在一起：

1. **LCM 的重點是速度，不是畫質上限**
2. **低步數生成本來就更容易把細節壓平**
3. **某些 SDXL base workflow 如果沒搭合適 LoRA 或調整，人物皮膚質感很容易偏光滑、偏假**
4. **快速預覽模型常常先把「能很快長出圖」擺在「材質真不真」前面**

所以你會看到很多人後來會再補寫實向 LoRA，像是 RealisticVision 類型的資產，原因不是 SDXL 不能畫寫實，而是**你如果又要快、又要低步數、又要像商業人像攝影，通常需要更多額外調味**。

---

## 到底什麼情況該選哪顆？

### 1. 我只想先把本地出圖跑起來
選 **SDXL** 或 **SD 1.5**

### 2. 我想快點看到結果
選 **SDXL + LCM** 或 **SDXL Turbo**

### 3. 我想玩動漫、角色、社群風格
選 **Pony** 或 SD 1.5 / SDXL 的動漫系微調模型

### 4. 我想追寫實與更好的 prompt 理解
選 **FLUX.1 dev**  
但前提是你願意接受比較重的 workflow

### 5. 我想碰最前線的新模型
選 **HiDream-I1**  
但先接受它在 16GB 上不會很輕鬆

---

## 我自己的建議，不是最帥，但最容易活下來

如果你今天真的在 Mac mini M4 16GB 上開局，我會建議這樣走：

### 第一階段：先活下來
- SDXL
- 或 SD 1.5

### 第二階段：開始追速度
- SDXL + LCM
- 或 SDXL Turbo

### 第三階段：開始想追更高上限
- FLUX.1 schnell
- 再視情況碰 FLUX.1 dev

### 第四階段：你已經知道自己在幹嘛了
- HiDream
- 更重的 Flux workflow
- 各種社群特化模型

---

## 這篇先收一個簡單結論

> **SDXL 是 16GB 使用者最穩的通用起點，SD 1.5 是最省心的老朋友，Flux 很香但更重，HiDream 很猛但不適合一開始就拿來當日常主力。**

下一篇我們就不再停留在「選哪顆」，而是直接進到更實際的問題：

- checkpoint、clip、loras、vae 到底差在哪？
- 模型要放哪裡？
- LCM Adapter、LoRA、T5XXL、GGUF、FP8 這些到底什麼時候需要？
- 為什麼 Flux workflow 常常一打開就是紅節點樂園？

## Image Asset Plan

目前這篇不強制需要配圖。  
如果後續要補圖，最適合的是一張「模型選型地圖」的 SVG，而不是硬做一堆比較海報。

1. filename: comfyui-model-selection-map.svg
   purpose: 用一張圖把 SD 1.5 / SDXL / LCM / Turbo / Pony / Flux / HiDream 的定位畫清楚
   placement: 放在「一張表先看大方向」後
   alt: ComfyUI 常見模型的定位與選型地圖
   prompt: Create a clean blog-friendly SVG decision map comparing SD 1.5, SD 2.1, SDXL, LCM, SDXL Turbo, Pony Diffusion, FLUX.1 dev, FLUX.1 schnell, and HiDream-I1. Use soft colours, rounded rectangles, minimal labels, and clear grouping by base models, acceleration models, and community finetunes. Emphasise speed, quality, and memory pressure.
