---
title: "ComfyUI 系列 07｜踩坑與故障排除大全：SQLAlchemy、requirements.txt、OOM、紅節點、safetensors 到底在吵什麼"
description: "如果你前面幾篇都有跟著做，到了這一篇，多半已經不是「我會不會裝」的問題了，而是："
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:16:00
featured: false
---

如果你前面幾篇都有跟著做，到了這一篇，多半已經不是「我會不會裝」的問題了，而是：

- 為什麼昨天還能跑，今天一開就噴錯？
- 為什麼 workflow 打開之後一堆紅節點？
- 為什麼模型明明下載了，ComfyUI 卻像沒看到？
- 為什麼 Mac 上明明有 MPS，速度還是忽快忽慢？
- 為什麼 Flux 一套上去，整個流程像在解壓縮一座違章建築？

這篇就是整套系列的急救箱。

它的目標不是把所有錯誤碼背給你，而是幫你建立一套比較像工程現場的查錯順序。因為大多數 ComfyUI 問題，真的不是「它壞掉了」，而是下面幾種狀況混在一起：

1. **環境沒裝完整**
2. **模型放錯地方**
3. **workflow 跟模型版本不對**
4. **custom node 缺東缺西**
5. **記憶體不夠，或 MPS 行為跟你想像的不一樣**
6. **你其實抓到了不夠安全、或不夠相容的檔案格式**

先講我自己的結論：

> **ComfyUI 最常見的問題，不是單點爆炸，而是小地方一起偏掉。**
> 你如果每次都想從錯誤訊息最後一行硬猜答案，通常會越修越亂。比較穩的做法，是先把問題分成「環境、模型、節點、記憶體、格式」五層，再一層一層排。

---

## 先給一個最實用的查錯順序

真的卡住時，我會先照這個順序看：

1. **ComfyUI 本體能不能正常啟動**
2. **終端機裡的第一個錯誤是什麼**
3. **是不是缺 Python 套件**
4. **是不是缺 custom node**
5. **是不是模型放錯資料夾**
6. **是不是 workflow 用的 loader 跟你下載的模型格式不一致**
7. **是不是 OOM 或 MPS 後端出事**
8. **最後才去懷疑某個奇怪 bug**

這個順序有點像先排水管、再查馬達，不要一開始就把整台機器拆了。

---

## 問題 1：ComfyUI 根本打不開，或啟動就黑掉

這通常先不要急著怪模型，因為模型還沒來得及犯錯，程式就先倒了。

先看幾件事：

- Python 版本對不對
- 虛擬環境有沒有真的啟用
- `pip install -r requirements.txt` 有沒有跑完
- 終端機有沒有明確寫缺某個模組
- 是不是某個 custom node 在啟動時就把整個程序拖下去

ComfyUI 官方 troubleshooting 也很明確，它建議先回到最基本狀態，從系統需求、安裝是否完整、再到 custom node 排查，而不是一上來就亂刪模型或重裝整套。這點很重要，因為真正把環境弄壞的人，常常不是 bug，而是我們自己連續做了三種修法。 

### 我會怎麼做
先暫時把可疑的 `custom_nodes/` 移開，確認純淨狀態能不能開。  
如果純淨狀態能開，代表不是 ComfyUI 主程式掛掉，而是擴充節點出了問題。

---

## 問題 2：第四步跳錯，說缺 `SQLAlchemy`

這個坑前面安裝篇有提過，但值得再收一次，因為它很典型。

當你看到類似：

```bash
ModuleNotFoundError: No module named 'sqlalchemy'
```

先不要把它想成什麼深奧 bug。這通常只是很樸素的一件事：

> **你現在跑的 Python 環境裡，缺了 ComfyUI 或某個節點要用的套件。**

### SQLAlchemy 是什麼？
SQLAlchemy 是 Python 很常見的資料庫工具包，很多專案會拿它做 ORM 或資料存取層。  
你不一定要懂 ORM 才能修這個錯，重點是知道：**它是一個 Python 依賴套件，不是模型，也不是 ComfyUI 專屬名詞。**

### 為什麼會少掉？
最常見原因是：

- `requirements.txt` 沒有完整安裝成功
- 你裝在系統 Python，但實際跑的是 venv 裡另一套 Python
- 某個 custom node 自己還有額外 requirements，你沒裝到

### requirements.txt 到底在做什麼？
它本質上就是一份依賴清單。  
專案作者把需要的 Python 套件列在裡面，讓你用 `pip install -r requirements.txt` 一次裝齊。

它不是魔法卷軸，也不是保證百分之百成功的護身符。  
如果你網路中斷、權限有問題、切錯 Python、或某個套件版本彼此打架，它還是可能裝到一半失敗。

### 我會怎麼修
先確認你現在真的在正確的虛擬環境裡：

```bash
which python
python --version
pip --version
```

然後重跑：

```bash
pip install -r requirements.txt
```

如果是某個 custom node 自己缺東西，再進那個節點資料夾補裝它自己的 requirements。

---

## 問題 3：Workflow 一打開就滿地紅節點

這是新手最容易被嚇到的畫面之一。  
但老實說，紅節點很多時候比黑箱錯誤還好，因為它至少是在大聲告訴你哪裡沒對上。

紅節點通常代表幾種情況：

- 你沒裝對應的 custom node
- 你有裝，但版本不相容
- 你下載的 workflow 期待某個 loader，但你現在環境裡沒有
- 節點名稱改版了
- 模型路徑或資產名稱對不上

ComfyUI 官方文件對 custom node 問題的建議很實際：**用二分法排查**。也就是不要一次禁用或啟用全部，而是每次先切一半，逐步找出是哪個節點包在搞事。這招很土，但很好用。

### 我會怎麼排
1. 先看紅的是哪一類節點  
   - Loader 類
   - Scheduler 類
   - 自訂功能類
2. 再回 workflow 說明頁看作者到底要求哪些 node
3. 確認安裝的 custom node 名稱、版本、依賴
4. 還是不行的話，就把 custom nodes 先對半關掉做 binary search

### 很容易忽略的一點
有些 workflow 是一兩個月前能跑，不代表今天還能原封不動跑。  
節點作者更新命名、ComfyUI 更新 API、或某個 loader 改接口，都可能讓舊 workflow 長出紅框。

---

## 問題 4：模型明明下載了，ComfyUI 卻看不到

這一題表面上很像 UI 問題，本質上通常是**放錯資料夾**或**格式理解錯誤**。

最常見的錯法：

- checkpoint 丟進 `models/clip/`
- VAE 丟進 `models/checkpoints/`
- LoRA 丟錯資料夾
- GGUF 檔案放進一般 checkpoint 路徑，卻用普通 loader 去讀
- 你抓的是 text encoder，但以為它是主模型

這也是我一直強調，不要只看副檔名 `.safetensors`。  
同樣是 `.safetensors`，它可能是 checkpoint、VAE、LoRA、CLIP、UNet，完全不是同一種東西。

### 最穩的排法
先回模型頁或 workflow 說明，確認它到底是哪一類檔案，再對照資料夾：

- checkpoint → `models/checkpoints/`
- VAE → `models/vae/`
- LoRA → `models/loras/`
- CLIP / T5XXL → 常見 `models/clip/`
- 特定 workflow 的 UNet / diffusion model → 依說明放到指定路徑

---

## 問題 5：為什麼我下載的是 GGUF，workflow 卻不吃？

這個坑幾乎可以算 Flux 新手禮包。

GGUF 是一種量化格式，它最大的吸引力是想辦法把大模型變得比較能在本地機器上運作。  
但 GGUF 不是 ComfyUI 最原生、最無腦的路線。它常常意味著：

- 你需要額外的 loader node
- 你可能需要 custom node
- workflow 不是所有版本都直接相容
- 某些 sampler / scheduler / node 組合會變得比較敏感

### Loader node 跟 custom node 差在哪？
這兩個名詞很容易混。

- **Loader node**：負責讀取特定格式模型的節點
- **custom node**：額外安裝的節點套件，裡面可能包含 loader，也可能包含別的功能

也就是說，loader node 常常是 custom node 套件裡的一部分，但兩者不是同義詞。

### 為什麼有人想把 GGUF 轉成 safetensors？
不是因為 GGUF 比較「邪門」，而是因為大家最後常追求三件事：

1. 相容性比較高
2. workflow 比較單純
3. 少裝一層 custom node

這也是為什麼有些人到最後會發現，FP8 或 safetensors workflow 雖然不一定最省資源，但比較省心。

---

## 問題 6：safetensors 是什麼？為什麼一直有人叫你別亂下 pickle

這題很值得講清楚，因為它不是單純的格式偏好，而是牽涉到安全。

Hugging Face 官方文件講得很直白：`safetensors` 的核心賣點之一，就是**比 pickle 類格式安全**，因為它不是靠 Python 反序列化去執行任意物件。Hugging Face 也另外有一整份 pickle 安全說明，提醒使用者 pickle 類檔案可能帶來任意程式碼執行風險。

### 那為什麼有人還在用其他格式？
因為現實世界很少有單一完美格式。  
你有時候會碰到：

- 某個老 workflow 就是沿用舊格式
- 某些模型版本先釋出的是別的封裝
- 某些工具鏈對量化檔支援比較完整

### 為什麼要轉成 safetensors？
最常見理由有三個：

1. **安全性比較好**
2. **分享與管理比較放心**
3. **在現代 ComfyUI / Hugging Face 生態裡相容性通常比較好**

但要注意，**不是所有檔都能隨手一轉就萬事 OK**。  
有些檔轉格式後，還是得確認對應的 loader、workflow、metadata 和模型組件是不是一致。

---

## 問題 7：Mac 上明明有 MPS，為什麼還是慢、卡、或直接炸掉？

這裡先分兩件事：

- **MPS 可用**
- **MPS 每一條路都很穩**

這兩件事不是同一件事。

Apple 與 PyTorch 官方都明確表示，MPS 是 Apple Silicon 上 PyTorch 的 GPU 加速路徑，而且近幾個版本還持續在補 operator coverage 與錯誤回報。  
但這不代表所有模型、所有 custom node、所有量化組合都會一樣穩。

### 在 Mac 上常見的幾種狀況
1. **真的有加速，但沒有你想像中那麼快**  
   因為某些步驟還是會掉回 CPU，或 workflow 本身瓶頸不在那裡。

2. **可跑，但記憶體壓力大**  
   Apple Silicon 是統一記憶體，不代表無限記憶體。  
   模型吃太大，一樣會卡、一樣會慢，甚至被系統壓縮記憶體或直接終止。

3. **某些 MPS 路徑會撞到後端 bug 或限制**  
   像 2026 年仍然看得到一些 issue，顯示特定運算或暫存陣列大小在 MPS 路徑上會撞到限制，結果就是整個程序硬崩。

### 所以要怎麼想比較健康？
不要把「MPS」想成一顆神奇加速按鈕。  
它比較像是一條很值得用、但仍然有邊界的本地 GPU 路線。

---

## 問題 8：OOM 是什麼？真的會怎樣？

OOM 就是 **Out Of Memory**。  
簡單講，就是你要求這台機器在某一刻吞下比它能穩定承受更多的記憶體。

在 ComfyUI 現場，OOM 可能長這樣：

- 直接噴錯
- 生成卡死
- 速度突然掉到像在踩泥巴
- 程式被系統殺掉
- MPS / Metal 報很難讀的底層錯

### 在 Apple Silicon 上要特別注意什麼？
很多人看到統一記憶體，就以為「16GB 其實很夠」。  
比較準的說法是：

> **16GB 技術上可以跑不少東西，但不是代表你可以把任何 workflow 都塞進去還要求它保持優雅。**

像大型 Flux 流程、重型文字編碼器、額外 LoRA、又加高解析度、又想多 batch，這些東西一疊上去，OOM 風險就會開始變得很真實。

### OOM 的常見解法
- 降解析度
- 降 batch size
- 換比較小或量化過的模型
- 先拿掉額外 LoRA / control 類資產
- 改成比較簡單的 workflow
- 在 Mac 上接受「能跑」跟「跑得舒服」是兩回事

---

## 問題 9：sigma 對接 bug、scheduler 問題，到底在講什麼？

這一塊最容易讓人看一堆討論串後更混亂。

先用人話講：

- **KSampler** 是負責實際採樣的一大類節點
- **Scheduler** 決定採樣步驟怎麼排
- **sigma** 可以理解成某些採樣流程裡噪聲層級或步進安排的表示方式之一

當 workflow 的 sampler、scheduler、模型格式、或某個 custom node 的實作版本沒對上時，就可能出現：

- 參數接不起來
- node 型別不相容
- 採樣結果怪掉
- 直接噴錯

### 為什麼 GGUF + MPS 特別容易讓人感覺在踩地雷？
因為你一次把兩種敏感因素疊在一起：

1. **GGUF** 本身常仰賴額外 loader / custom node
2. **MPS** 又不是每種運算路徑都像 CUDA 那樣成熟和普及

所以最後很容易變成：
不是某一個東西單獨壞，而是**格式、節點、後端加速**三邊對不上。

這也是為什麼很多人繞一圈後，會覺得 safetensors 或 FP8 workflow 雖然未必最極限省，但維護成本比較低。

---

## 問題 10：FP8 checkpoint 聽起來很香，為什麼最後很多人還是沒一直用？

FP8 checkpoint 的吸引力很直觀：

- 比全精度省
- 看起來比 GGUF workflow 簡單
- 在某些情況下可以直接走 `CheckpointLoaderSimple` 或較接近一般 checkpoint 的工作流

這也是它讓人心動的地方。  
但它不是萬靈丹，實際上還是要看：

- 你拿到的是哪個版本
- workflow 是不是為這個 checkpoint 設計
- 對應 text encoder、VAE、UNet 的組法有沒有對上
- 你的硬體到底撐不撐得住

### 為什麼有人最後不用 `flux1-dev-fp8`？
理由通常不是「它不能跑」，而是比較務實：

- 某些版本更新後 workflow 改了
- 自己手上的 GGUF 工作流已經調好了
- 或反過來，GGUF 太麻煩，乾脆改走一般 checkpoint 路線
- 最後選的是**總維護成本**最低的那條

---

## 一個很實用的故障排除框架：先問五個問題

每次出事時，先問自己：

### 1. 這是環境問題，還是 workflow 問題？
如果 ComfyUI 連開都開不起來，先別怪 workflow。

### 2. 這是模型檔問題，還是節點問題？
如果是紅節點滿地，通常先看 node，不是先重抓模型。

### 3. 這是格式問題，還是放置路徑問題？
同樣是 `.safetensors`，不代表放同一個資料夾就對。

### 4. 這是資源不夠，還是版本不相容？
如果是 OOM，重裝不會救你。  
如果是版本不相容，降解析度也不一定有用。

### 5. 這是單一 bug，還是三件事一起疊？
ComfyUI 最常見的崩法，就是小錯同時疊三個。  
只抓其中一個修，常常會誤以為「怎麼修了沒用」。

---

## 我自己的建議：排錯時先保守，先回到 boring 的狀態

每次踩坑時，最容易犯的錯，是同時做五件事：

- 換模型
- 換 workflow
- 更新 ComfyUI
- 更新 custom nodes
- 順手再重裝一次 Python

這樣通常只會把問題攪成一鍋濃湯。

比較穩的做法是：

1. 先回到最小可用狀態
2. 用最簡單 workflow 驗證
3. 一次只改一個變數
4. 改完就記錄
5. 能用 safetensors 就先用 safetensors
6. 能少裝 custom nodes 就少裝
7. 在 16GB Mac 上，接受大型 workflow 本來就比較容易碰到邊界

這聽起來不炫，但它真的比較接近能把事情修好的方法。

---

## 這篇的小結

如果你一路看到這裡，應該會發現一件事：

> **ComfyUI 的坑，多半不是「你太笨」，而是它真的把模型、格式、節點、記憶體、後端全部攤在你面前。**

這也是它厲害、也讓人容易崩潰的地方。  
你看得到每一層，所以自由度很高；但也因為每一層都看得到，任何一層歪掉，你都得自己把它扶回來。

如果要把這整系列壓成一句話，我會這樣說：

> **先選對路，再裝起來；先跑通，再追求更快、更大、更花。**
> 不然你很容易還沒開始玩模型，就先被自己的工具鏈教育一輪。

---

## 這系列到這裡，你已經能做什麼？

到第 7 篇為止，你其實已經具備一套很完整的本地生成入門地圖：

- 知道為什麼選 ComfyUI，而不是別的 UI
- 知道 Mac mini M4 16GB 技術上能跑到哪
- 知道 ComfyUI 怎麼安裝、怎麼啟動、怎麼用 tmux 跑在背景
- 知道模型去哪找，怎麼看 Civitai 和 Hugging Face
- 知道 SD 1.5、SDXL、Flux、HiDream、LCM、LoRA、T5XXL 大致差在哪
- 知道模型檔該放哪裡
- 也知道踩坑時該先從哪裡查起

這時候你就不再只是「把工具裝起來的人」，而是開始有能力自己做判斷、自己排問題的人了。

這在本地 AI 世界裡，很重要。因為很多時候，真正拉開差距的不是你會不會按 Generate，而是你有沒有能力在畫面炸掉時，還知道下一步要看哪裡。

## Image Asset Plan

目前這篇不強制需要圖片。  
如果之後要補一張，我只建議補一張：

1. filename: comfyui-troubleshooting-01-debug-layers.svg
   purpose: 用五層排查框架整理 ComfyUI 常見問題來源
   placement: 放在「先給一個最實用的查錯順序」段落後
   alt: ComfyUI 常見問題的五層排查框架圖
   prompt: A clean blog-friendly SVG diagram showing five troubleshooting layers for ComfyUI: environment, models, nodes, memory, and file format. Modern rounded boxes, gentle colours, clear arrows, English labels, no clutter, suitable for a technical blog.
