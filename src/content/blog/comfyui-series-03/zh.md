---
title: "ComfyUI 系列 03｜裝好之後別急著亂按：`127.0.0.1:8188`、第一張圖、tmux、背景執行與重開機怎麼辦"
description: "這篇適合誰？ 已經把 ComfyUI 裝起來，但打開之後還有點茫，想先搞懂怎麼跑第一張圖、怎麼讓它不要跟著 Terminal 一起死掉的人。 如果你還沒安裝，先看上一篇。這篇假設你已經能把 ComfyUI 啟動起來。"
categories: ["ai"]
tags: ["ai", "comfyui", "image-generation", "models", "stable-diffusion"]
date: 2026-04-02T15:12:00
featured: false
---

> 這篇適合誰？  
> 已經把 ComfyUI 裝起來，但打開之後還有點茫，想先搞懂怎麼跑第一張圖、怎麼讓它不要跟著 Terminal 一起死掉的人。  
> 如果你還沒安裝，先看上一篇。這篇假設你已經能把 ComfyUI 啟動起來。

安裝成功，通常不代表真的上手。

很多人卡住的點很像：`python main.py` 會跑，瀏覽器也開得起來，可是接下來要按哪裡、模型要怎麼選、Workflow 要怎麼載、Terminal 到底能不能關、tmux 是不是一定要學，腦袋馬上打結。

所以這篇不講花俏功能，也先不碰 Flux、LoRA、ControlNet。這篇只做一件事：**把 ComfyUI 變成一套你明天打開還記得怎麼繼續用的東西。**

先講今天的結論：

> **第一輪先不要追求「最厲害的 workflow」，先做出一套你能穩定重複的最小 SOP。**  
> 能打開 `127.0.0.1:8188`、能載 workflow、能選模型、能成功出第一張圖、知道圖存去哪裡、知道 Terminal 掛掉怎麼救，這樣就夠了。

## 先校正一件事：你現在連到的是什麼？

如果你是照上一篇的手動安裝路線跑，瀏覽器裡打開的通常會是：

```text
http://127.0.0.1:8188
```

這串地址其實在講兩件事：

- `127.0.0.1` 是 **localhost**，意思是「你現在連的是這台電腦自己」
- `8188` 是這個本機服務用的 **port**

所以它不是一個公開網站，也不是什麼神祕雲端後台。它就是你這台 Mac 上正在跑的 ComfyUI web server。也因為這樣，**你只有在 ComfyUI 真的有啟動時，這個網址才打得開。**

如果你看到瀏覽器顯示連不上、逾時、白畫面，第一件事先不要懷疑人生，先看 Terminal 裡那個 ComfyUI 程序是不是還活著。

順手補一個容易混淆的小地方：ComfyUI 官方桌面版跟手動安裝版的埠號不一定相同。這個系列主線走的是**手動安裝版**，所以文章裡一律以 `8188` 為準。

## 你打開 ComfyUI 之後，畫面上在看什麼？

第一次進 ComfyUI，很多人會有一種「這是不是還沒載完」的感覺。其實不是，它本來就長這樣。

你主要會看到這幾塊：

1. **中央的節點畫布**  
   workflow 主要都在這裡。每個方塊是一個 node，線是資料流。

2. **Queue / Run 按鈕**  
   你按下去之後，ComfyUI 才會真的開始跑圖。

3. **模型相關下拉選單**  
   像 checkpoint、VAE、LoRA 這類，通常會出現在對應 node 裡。

4. **輸出預覽區**  
   跑完之後你會在畫面上看到結果，也能存檔或打開輸出資料夾。

如果你現在看到的是一張空畫布，不代表壞掉。只是你還沒載入 workflow。

## 第一次出圖，先照這份 SOP 走

這裡我不打算跟你講十種玩法。先用一條最短路線把事情做成。

### Step 1：先確認 ComfyUI 真的在跑

在 Terminal 裡啟動 ComfyUI，例如：

```bash
cd ~/ComfyUI
source .venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188
```

接著打開瀏覽器：

```text
http://127.0.0.1:8188
```

如果有開起來，先不用再折騰別的。

### Step 2：載入一個最基本的文字生圖 workflow

這裡有三種常見方法：

#### 方法 A：用內建 template

新版 ComfyUI 有 workflow templates。對新手來說，這是最省事的起點。你直接載一個 text-to-image 範本，比空白畫布從零組起來穩很多。

#### 方法 B：打開別人的 workflow JSON

如果你手上已經有 `.json` workflow，可以從選單裡開啟。這種做法很適合教學文或別人分享的設定包。

#### 方法 C：把一張帶 metadata 的 PNG 直接拖進去

這是 ComfyUI 很實用的一個設計。只要那張圖本身有把 workflow metadata 存進去，你可以直接把圖拖進 ComfyUI，它就會把當初那條 workflow 還原出來。

這也是為什麼很多人分享 workflow 時，不一定只丟 JSON，直接丟一張生成過的圖也能交流。

## 第一次使用時，我建議你畫面上至少先認得這幾個 node

你不需要一開始就懂全部，但至少先認得這些常客：

- **CheckpointLoaderSimple**  
  載入主模型 checkpoint。

- **CLIP Text Encode**  
  把你的 prompt 轉成模型能吃的文字向量。

- **Empty Latent Image**  
  設定畫布尺寸。

- **KSampler**  
  真正負責抽樣和生成的核心節點。

- **VAE Decode**  
  把 latent 轉成你看得懂的圖片。

- **Save Image**  
  把圖存到輸出資料夾。

看到這幾顆，基本上就知道這條 workflow 還算正常，不是在唱空城計。

## 模型怎麼選？先別貪心

你現在最容易犯的錯，不是參數設錯，而是**模型裝太多，結果自己也不知道現在在跑哪一個。**

第一輪很簡單：

1. 先只裝 **一個主 checkpoint**
2. workflow 裡先確認 **CheckpointLoaderSimple** 真的有選到它
3. 不要同時亂掛一堆 LoRA、VAE、ControlNet

如果你在 checkpoint 下拉選單裡看不到模型，九成不是 ComfyUI 心情不好，是模型檔沒有放到對的位置。這件事我們下一批的模型安裝篇會更完整拆開講。

## Prompt 怎麼下？第一輪先追求可重複，不追求神作

第一次出圖時，請盡量用簡單 prompt。像這樣就夠了：

```text
a cosy Taipei alley at night, cinematic lighting, realistic photo
```

如果 workflow 裡有 negative prompt，也先寫簡單一點：

```text
blurry, low quality, deformed
```

第一輪的目標不是炫技，而是確認整條管線都有通：

- 模型有載入
- prompt 有進去
- sampler 有跑
- 圖有生成
- output 找得到

先把這五件事確認完，再來玩風格、採樣器、步數、LoRA 才有意義。

## 按下 Run 之後，圖會跑去哪？

預設情況下，ComfyUI 生成的輸出會存到 **ComfyUI 專案底下的 `output/` 資料夾**。

如果你的安裝目錄是：

```text
~/ComfyUI
```

那輸出通常會在：

```text
~/ComfyUI/output/
```

所以你之後如果找不到剛剛那張圖，先去這裡找，不要懷疑它蒸發了。

## 你之後會碰到的，其實不是 UI，而是 workflow 檔

很多新手會以為 ComfyUI 的重點是介面操作。用幾天之後才發現，真正的核心其實是 **workflow 本身**。

ComfyUI 的 workflow 可以存成 JSON。這代表幾件事：

- 你可以把它版本化
- 你可以分享給別人
- 你可以自己留存不同用途的流程
- 你也可以拿它做 API 呼叫

如果你從前端手動調好一條流程，之後可以把它另存成 JSON。下一次你就不用再從空白畫布慢慢接。

這也是我很推薦你早點建立自己的 `image-generation` SOP 的原因。真的不用寫得很漂亮，哪怕只是這種程度也夠用：

```text
1. 啟動 ComfyUI
2. 打開 127.0.0.1:8188
3. 載入 text-to-image workflow
4. 確認 checkpoint 正確
5. 輸入 prompt
6. Run / Queue
7. 到 output 確認圖片
8. 覺得可以再另存 workflow JSON
```

這種小 SOP 很土，但非常有用。尤其過兩天再回來時，你會感謝前一天的自己。

## ComfyUI 也能走 API，但你現在先知道有這條路就好

ComfyUI 不只是圖形介面，它也有 server routes，可以把 workflow 用 API format 丟給本機服務。

這句翻成白話是：

> 你現在在畫布上做的事情，之後其實可以改成腳本、自動化、或其他工具去叫它跑。

最常見的流程是這樣：

1. 在前端把 workflow 存成 **API format**
2. 用 `POST /prompt` 把 workflow 送給本機 ComfyUI server
3. 取得 `prompt_id`
4. 再透過 WebSocket 或其他方式看進度與結果

你現在不一定要馬上用 API，但至少要知道：**ComfyUI 不是只能手動點按鈕。** 這也是它為什麼很適合一路從「自己玩」長到「自動化工作流」的原因。

## 終端機一定要一直開著嗎？

### 最短答案

**如果你是直接在 Terminal 裡跑 `python main.py`，那是的，那個 Terminal 視窗背後的程序要活著，ComfyUI 才會活著。**

你把那個程序停掉、把視窗關掉、或讓 shell session 結束，ComfyUI 通常也會一起下班。

### 但這不代表你一定要盯著那個視窗看

這就是 tmux 派上用場的地方。

## tmux 是什麼？為什麼本地跑 ComfyUI 很常用它？

tmux 是一個 terminal multiplexer。講人話，它可以讓你在一個 shell 裡開 session、detach 離開，再 attach 回來。**你人離開了，裡面的程序還能繼續跑。**

它特別適合這種情境：

- 你不想一直霸占一個 Terminal 視窗
- 你想關掉 iTerm / Terminal 之後，ComfyUI 還繼續跑
- 你想隔天再 attach 回來看 log

### 你可以怎麼用 tmux 跑 ComfyUI

先開一個 session：

```bash
tmux new -s comfyui
```

進去之後啟動 ComfyUI：

```bash
cd ~/ComfyUI
source .venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188
```

然後按：

```text
Ctrl + b, 然後按 d
```

這樣就是 detach。ComfyUI 會繼續跑，但你會回到一般 shell。

### 常用 tmux 指令

```bash
tmux ls
```

列出目前所有 session。

```bash
tmux attach -t comfyui
```

回到 `comfyui` 這個 session。

```bash
tmux kill-session -t comfyui
```

把這個 session 關掉。

### 想一步到位，也可以直接背景開一個 session

```bash
tmux new -d -s comfyui 'cd ~/ComfyUI && source .venv/bin/activate && python main.py --listen 127.0.0.1 --port 8188'
```

這條指令的意思是：建立一個名叫 `comfyui` 的 tmux session，直接在裡面跑 ComfyUI，而且不先把畫面 attach 上去。

## 那 tmux 算不算 background service？

算，也不算。

它確實讓 ComfyUI 變成「你不用一直盯著 Terminal 視窗」的背景程序，但它本質上還是**使用者 session 裡的一個終端機會話**，不是 macOS 原生的系統服務。

所以你可以把它理解成：

- **比單開 Terminal 穩很多**
- **比真正的 service 輕很多，也好救很多**
- **很適合個人機器、開發機、暫時長跑的本地服務**

但如果你要的是「開機自動啟動、登入後就自己起來、完全不想手動 attach」，那就已經不是 tmux 的工作，而是 `launchd` 的工作。

## 關機或重開機之後，還要不要重啟 ComfyUI？

這題的答案很乾脆：

### 如果你只是用 Terminal 或 tmux 跑

**要。**

因為重開機會把整個使用者 session 清掉，tmux session 也會一起不見。你的 ComfyUI 不會神奇復活。

### 如果你有另外設開機自啟

那就不一定。像 macOS 的 `launchd`、某些登入自動執行設定，才有機會讓它在登入後自己啟動。

所以別把 tmux 跟「開機常駐服務」混在一起。tmux 很好用，但它不是不死鳥。

## 要不要現在就把 ComfyUI 做成 macOS service？

我的建議是：**先不要太快。**

如果你現在還在認 workflow、模型、輸出資料夾，這時候就急著把 ComfyUI 包成一個完全自動啟動的背景服務，反而很容易把問題藏起來。

我會建議順序是這樣：

1. **先用普通 Terminal 跑過幾次**
2. **再改成 tmux**
3. **等你已經穩定使用了，再考慮 launchd**

原因很簡單。你現在最需要的不是「超漂亮的 service 管理」，而是**出錯時知道去哪裡看 log、怎麼重新拉起來。**

## 如果你真的想做成 service，方向是什麼？

在 macOS 上，正統做法通常會是 `launchd`，也就是用 `~/Library/LaunchAgents/` 放一個 plist，讓它在登入後自動把 ComfyUI 拉起來。

但這一步我不建議在剛入門就做，因為它會讓 debug 變得比較繞。尤其你後面還要裝 custom nodes、換模型、改 Python 套件，這時候 tmux 比較像一把順手的活動板手，`launchd` 比較像固定在牆上的工具架。

## 我自己的建議配置

如果你現在是 **Mac mini M4 16GB + ComfyUI 手動安裝版**，我會這樣排：

### 第一階段：普通 Terminal

用來確認：

- 真的能啟動
- `127.0.0.1:8188` 打得開
- 能成功出圖
- output 找得到

### 第二階段：tmux

用來解決：

- 不想一直開著一個 Terminal 視窗
- 想讓 ComfyUI 在你 detach 之後繼續跑
- 想回頭看 log

### 第三階段：真的天天用，再考慮 service 化

這時候你再研究 `launchd` 比較合理。因為到這個階段，你已經知道正常狀態長什麼樣，也知道不正常時怎麼分辨。

## 這篇最想幫你省掉的坑

最後把最容易混在一起的三件事再講一次：

1. **ComfyUI 跑得起來**，不代表你已經有自己的使用流程
2. **tmux 能讓程序在你關掉 Terminal 視窗後繼續活著**，但不等於它能跨重開機復活
3. **`127.0.0.1:8188` 是本機服務，不是公開網站**，打不開時先看本機程序，不要先去怪網路

## 小結

這篇如果要濃縮成一句話，就是：

> **先把 ComfyUI 變成一套你能穩定重複的本地流程，再去追求更花的玩法。**

你現在最需要的不是一個巨大 workflow，而是一條最小但可重複的路：啟動、打開、載入、選模型、出圖、找輸出、會重啟、會 detach。

這條線一穩，你後面學什麼都比較不容易散掉。

下一篇我們來處理另一個新手一定會撞上的問題：**模型到底去哪裡找？Civitai 和 Hugging Face 又差在哪？**
