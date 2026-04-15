---
title: "ComfyUI 系列 02｜Mac mini M4 安裝 ComfyUI：把 Python、PyTorch、MPS 先鋪好，之後才不會一路修環境"
description: "這篇適合誰？ 已經決定用 ComfyUI，現在要在 Mac mini M4 16GB 上把它穩穩裝起來的人。 這篇先不談模型大全，也先不衝 Flux。目標很單純，就是把基礎環境鋪平。"
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:11:00
featured: false
---

> 這篇適合誰？  
> 已經決定用 ComfyUI，現在要在 Mac mini M4 16GB 上把它穩穩裝起來的人。  
> 這篇先不談模型大全，也先不衝 Flux。目標很單純，就是把基礎環境鋪平。

如果你剛從上一篇過來，現在心裡八成只有一個念頭：好，那到底要怎麼裝？

這時候最容易發生的事，就是你打開搜尋，看到十幾篇教學，每篇都像有道理：

- 有人叫你直接裝 Desktop 版
- 有人叫你 `git clone`
- 有人叫你用 Conda
- 有人說先上 nightly，不然 MPS 不穩
- 有人說千萬不要 nightly，先 stable
- 還有人會貼一串指令給你，然後假裝 `requirements.txt` 不存在

結果就是，你明明只想把 ComfyUI 跑起來，最後卻先學會了怎麼把 Python 環境弄亂。

所以我先講這篇的主張：

> **第一輪安裝，不要追求最省事。先追求可恢復。**  
> 你今天多花一點點時間，把 Python、venv、PyTorch、requirements 這些東西講清楚，後面裝模型、裝 custom nodes、踩錯時才知道自己在修什麼。

這篇我會走的主線是：

- **手動安裝**
- **獨立 virtual environment**
- **先 stable PyTorch**
- **有需要再考慮 nightly**
- **先把 ComfyUI 本體跑起來，再談模型和花活**

## 為什麼這篇不把 Desktop 版當主線？

先講清楚，Desktop 版不是不能用。  
ComfyUI 官方現在也有 macOS Desktop，而且明講 Apple Silicon 支援。不少人如果只是想快點上車，直接裝 Desktop 版其實很合理。

但這系列後面還會碰到：

- checkpoints、clips、loras、vae
- LCM Adapter
- Flux、GGUF、T5XXL、FP8
- custom nodes
- 依賴衝突
- 模型路徑
- workflow 匯入與除錯

到了這一層，**看得見環境** 反而很重要。  
所以我這裡故意不用最省腦的做法，而是用之後最好維護的做法。

講白一點，Desktop 版比較像「今天先玩到圖出來」。  
這篇想做的是「讓你兩個禮拜後壞掉時，還知道從哪裡開始救」。

## 這篇要用哪個 Python 版本？

這裡很容易看到兩種說法，然後新手就開始頭痛。

ComfyUI 官方現在的 system requirements 會推薦比較新的 Python 版本，像 3.13，並把 3.12 當成不錯的 fallback。這個方向沒問題。  
但如果你考慮到後面還要碰第三方 custom nodes，我自己的建議會保守一點：

> **第一輪先用 Python 3.12。**

原因很單純，不是 3.13 不好，而是 3.12 在很多時候比較 boring。  
而 boring 在安裝這件事上，通常是優點，不是缺點。

你真的很想追最新版本，當然可以直接用 3.13。  
但如果你問我哪個比較像「先把地板鋪平」的選擇，我還是會答 3.12。

## PyTorch、Metal、MPS 到底是在講什麼？

安裝前先把這三個名詞弄懂，不然後面看指令很容易像在看符咒。

### PyTorch 是什麼？

PyTorch 是深度學習框架。  
用白話講，它就是那個讓模型真的能在 CPU 或 GPU 上跑起來的引擎。

ComfyUI 不是自己直接操作你的 GPU，它是透過 PyTorch 去做推理。

### Metal 是什麼？

Metal 是 Apple 的圖形與運算框架。  
在 Apple Silicon 這個世界裡，很多 GPU 計算都是走 Metal 這條路。

### MPS 又是什麼？

MPS 是 **Metal Performance Shaders**。  
對 PyTorch 來說，它比較像是接到 Apple GPU 的那層 backend。

你可以把這三者想成：

- **Metal** 是 Apple 這條 GPU 高速公路
- **MPS** 是 PyTorch 上高速公路的交流道
- **PyTorch** 是真的把模型載上去跑的司機

所以在 Mac 上裝 ComfyUI，重點其實不是「我有沒有獨顯」這種 PC 用語，重點是：

> **你的 PyTorch 有沒有正確吃到 MPS。**

## 官方為什麼一邊說支援 Apple Silicon，一邊又一直提 nightly？

這也是很容易把人看亂的一題。

你去看 Apple 的 Metal + PyTorch 頁面，或是某些 ComfyUI troubleshooting 文件，會看到它們提到 nightly / preview build，因為新的 MPS 修正、某些 operator 支援，常常會先出現在那裡。  
但你再去看新的 ComfyUI system requirements，又會覺得它已經把 Apple Silicon 寫得很成熟，像 M1 到 M4 都列進支援範圍，語氣沒有以前那麼驚險。

這兩件事其實不矛盾。

我的理解是：

- **nightly** 比較像「你需要最新修正時再上」
- **stable** 比較像「先把變因壓低，環境先跑起來」

所以這篇我會建議：

> **先用 stable PyTorch。真的遇到確認是 MPS 特有的問題，再考慮切 nightly。**

這樣比較像工程現場，也比較好除錯。

## 安裝前先做這幾件事

開始前先確認幾件很 boring，但很重要的事：

- 你是 Apple Silicon 的 Mac，也就是 M1、M2、M3 或 M4
- macOS 不要太舊
- 至少先留 **20GB 到 40GB** 的空間，不然本體裝好，模型一下來你就開始清硬碟
- 先不要混用一堆 Python 來源  
  例如一半系統 Python、一半 Homebrew、一半 Conda，再加上別套 UI 留下來的殘環境

安裝最怕的不是慢，是髒。  
乾淨的環境，之後會省你很多時間。

## Step 0：先把基礎工具裝好

先打開 Terminal，跑這幾行：

```bash
xcode-select --install
brew update
brew install git python@3.12
```

### 這三行在幹嘛？

- `xcode-select --install`  
  裝開發工具鏈。很多 Python 套件在安裝時會用到，先補齊比較省事。

- `brew update`  
  更新 Homebrew 套件索引。

- `brew install git python@3.12`  
  把 Git 跟 Python 3.12 裝好。

裝完之後，先確認版本：

```bash
git --version
/opt/homebrew/bin/python3.12 --version
```

如果你電腦上的 Homebrew 不在 `/opt/homebrew`，就先查路徑：

```bash
which python3.12
```

## Step 1：把 ComfyUI repo 抓下來

我建議你找一個固定資料夾放這類工具。像我自己會用 `~/ai` 這種乾淨路徑，不要丟在 Downloads 裡，之後找東西真的比較不痛苦。

```bash
mkdir -p ~/ai
cd ~/ai
git clone https://github.com/Comfy-Org/ComfyUI.git
cd ComfyUI
```

到這一步，你應該會有一個 `~/ai/ComfyUI` 資料夾。

## Step 2：建立獨立 virtual environment

接下來這步很重要。  
不要偷懶直接拿系統 Python 裝，不然之後套件一打架，你會很想哭。

```bash
/opt/homebrew/bin/python3.12 -m venv .venv
source .venv/bin/activate
python --version
```

如果你剛剛查到的 Python 路徑不是 `/opt/homebrew/bin/python3.12`，請把第一行改成你自己的實際路徑。

啟用成功之後，Terminal 前面通常會出現 `(.venv)`。

### venv 到底是在幹嘛？

它就是幫你在專案資料夾裡切出一個乾淨的 Python 小世界。  
你之後裝的 torch、numpy、SQLAlchemy、custom node 依賴，都會先裝在這裡，不會亂灑到全系統。

這件事超級 boring，但真的非常值得。

## Step 3：先升級 pip

這步常被略過，但我建議先做。

```bash
python -m pip install --upgrade pip setuptools wheel
```

這不是什麼神祕儀式，單純是讓後面裝套件時少踩一點舊版本工具的坑。

## Step 4：安裝 PyTorch

這一步就是把「模型要跑在哪裡」先鋪好。

最簡單的做法是先走 PyTorch 官方 stable 路線：

```bash
pip install torch torchvision torchaudio
```

現在的 stable PyTorch 在 Apple Silicon 上已經有 MPS 支援，所以第一輪安裝不用急著衝 nightly。

### 怎麼確認 MPS 有沒有被抓到？

你可以先跑這段：

```bash
python -c "import torch; print(torch.__version__); print('MPS available:', torch.backends.mps.is_available())"
```

如果看到 `MPS available: True`，代表至少基礎上有抓到。

### 如果是 False 呢？

先不要慌，先看幾件事：

- 你是不是用到錯的 Python
- 你是不是忘了啟用 `.venv`
- macOS 版本是不是太舊
- 這個 torch 是不是裝在別的環境
- 你是不是用了 Rosetta 或其他混亂路徑

真的都確認過了，還是碰到 MPS 特有問題，再考慮 nightly。

## Step 5：安裝 ComfyUI 需要的依賴

這一步超常出事，而且很多教學會輕描淡寫帶過，結果你照做之後一打開就噴錯。

```bash
pip install -r requirements.txt
```

請注意，**這一步不是可有可無。**

很多人以為前面已經裝了 torch，應該差不多了。  
沒有，真的差很多。ComfyUI 本體還有其他 Python 套件要裝，缺了就很容易在第一次啟動時看到某些 module not found 的錯。

## `requirements.txt` 是什麼？

這個檔案可以把它想成「這個專案需要哪些 Python 套件」的清單。

裡面會列出版本需求或套件名稱，`pip install -r requirements.txt` 的意思就是：  
**照這張清單把該裝的東西一次裝好。**

你如果跳過這一步，ComfyUI 很可能還是會啟動到一半，但很快就會開始報錯。

## 為什麼很多人會在這裡撞到 `SQLAlchemy`？

這是很典型的情況。

有些人第四步裝完 torch 就太有信心，直接跑 ComfyUI。  
然後一打開就看到類似這種東西：

```text
ModuleNotFoundError: No module named 'sqlalchemy'
```

這時候不要急著上網亂找一堆 patch。  
先回來做最基本的事情：

```bash
pip install -r requirements.txt
```

### SQLAlchemy 是什麼？

SQLAlchemy 是 Python 裡很常見的資料庫工具包。  
你不一定要深入懂它怎麼運作，但你至少要知道一件事：

> 它不是什麼「突然天外飛來的怪東西」，它只是你的環境少了一個 ComfyUI 或相關元件會用到的依賴。

所以這類錯誤的第一反應通常不是去東補西補，而是先確認：

- 我是不是在對的 venv 裡
- `requirements.txt` 有沒有真的跑完
- pip 有沒有裝到同一個 Python 環境

## Step 6：第一次啟動 ComfyUI

環境裝完之後，就可以先試著啟動：

```bash
python main.py
```

如果一切正常，你會看到 ComfyUI 啟動訊息，然後預設會在本機開一個介面。常見是：

```text
http://127.0.0.1:8188
```

先別急著衝模型，這一步的目標只有一個：

> **確認本體真的能開、Terminal 沒在瘋狂噴錯、MPS 至少有正常被辨識。**

## 安裝時最常踩的幾個坑

這裡我把最常見的幾個坑直接整理成你之後會用得到的版本。

### 坑 1：忘了進入 venv

症狀：

- 你明明有裝 torch
- 也跑過 `requirements.txt`
- 但啟動還是一直說找不到模組

這時候很常見的原因就是：  
你裝套件時在一個 Python 環境，啟動時卻是在另一個 Python 環境。

回到專案根目錄，再做一次：

```bash
source .venv/bin/activate
which python
which pip
```

看一下 `python` 和 `pip` 是不是都指到 `.venv` 裡面。

### 坑 2：第四步就想直接開

這是很多人會中的招。  
裝完 torch，看到沒報錯，就忍不住先跑 `python main.py`。

結果一打開缺東缺西，再回來補套件。這樣不是不能救，但路會比較亂。

比較乾淨的順序是：

1. 建 venv  
2. 裝 torch  
3. 跑 `pip install -r requirements.txt`  
4. 再啟動

### 坑 3：MPS 沒有抓到

症狀：

- ComfyUI 可以開
- 但速度很奇怪
- 或測試時發現 `torch.backends.mps.is_available()` 是 False

先不要第一秒就怪 ComfyUI。  
先看：

- Python 環境對不對
- torch 裝在哪裡
- macOS 版本
- 你有沒有混到舊環境
- 有沒有用到不對的終端機 session

### 坑 4：套件裝一半網路斷掉

這種也不少見，尤其在裝比較大的 Python 套件時。  
表面上看起來有跑完，實際上某些套件是壞的，或殘了一半。

最簡單的做法通常是：

```bash
pip install -r requirements.txt --force-reinstall
```

如果真的亂到不行，有時候直接刪掉 `.venv` 重建，反而比硬救快。

## 我會建議的新手安裝原則

如果你問我，第一輪安裝最重要的是什麼，我會答這幾句：

- **不要混環境**
- **不要省略 `requirements.txt`**
- **先 stable，真的有需要再 nightly**
- **先求能穩定開，再求跑最快**
- **能看懂自己裝了什麼，比一鍵安裝更重要**

本地模型世界有很多文章會把安裝寫得像三行就能結束，然後把所有髒活都藏起來。  
那種文章看起來很順，實際上常常最不適合新手，因為你一旦出錯，根本不知道要從哪裡下手。

## 這篇結尾，留一個很實際的提醒

如果你今天只是想先看到一張圖，Desktop 版當然還是有它的價值。  
但如果你打算真的把 ComfyUI 當主線，而且後面還要碰模型、LoRA、VAE、Flux、custom nodes，那我會很誠實地說：

> **第一輪就把環境理乾淨，真的比較省總時間。**

下一篇我們會進到你真的打開 ComfyUI 之後，該怎麼用它、`127.0.0.1:8188` 是什麼、Terminal 要不要一直開著、tmux 跟背景 service 該怎麼看。
