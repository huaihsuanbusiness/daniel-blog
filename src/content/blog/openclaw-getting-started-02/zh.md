---
title: "OpenClaw 快速上手 02｜在 macOS / Mac mini 做出可恢復的第一輪安裝"
description: "給會用 Terminal 的技術型讀者。從 Node、安裝、Codex OAuth、LaunchAgent 到 dashboard 驗證，建立一套 boring but recoverable 的 OpenClaw 本機安裝流程。"
categories: ["openclaw"]
tags: ["openclaw", "agent", "gateway", "self-hosted", "tools", "memory"]
date: 2026-04-02T14:41:00
featured: false
---

> 適合誰：會用 Terminal，想把 OpenClaw 在 macOS / Mac mini 上穩穩跑起來的人。  
> 這篇的目標不是把所有能力打開，而是先做出一個**可恢復、可驗證、可維運**的第一輪安裝。

---

## 先講結論：第一輪安裝的目標不是「功能全開」，而是「先活著」

很多人安裝 OpenClaw 時，一開始就同時做這些事：

- 裝 OpenClaw
- 接 Discord
- 接 Browser
- 裝一堆 Skills
- 把 gateway 開到 LAN
- 順便研究 Docker / VPS / VM

然後事情就像一鍋剛沸騰的火山麵糊，哪裡炸都看不清。

這篇主張很簡單：

> **第一輪安裝只做一件事：把本機 Gateway 跑穩。**

只要你完成下面這些，就算成功：

- Node 版本正確
- `openclaw` CLI 可執行
- Codex OAuth 完成
- `openclaw onboard --install-daemon` 走通
- Gateway 可以被 launchd 接手
- `openclaw doctor`、`openclaw gateway status`、Dashboard 都能驗證

後面的 Discord、Skills、Memory、遠端連線，我們放到 Part 2。

---

## 為什麼這篇主線放在 Mac mini，而不是 Oracle VM / Docker / VPS

先把這件事說死，比較省時間。

### Mac mini 為什麼適合當第一台主機
對個人使用者來說，Mac mini 這條路有幾個優點：

- 本機工作流整合最好
- 之後若要接 macOS node / system.run / Browser / UI，也比較順
- 不必第一天就處理遠端 auth、SSH tunnel、tailnet、容器掛載與 service manager 差異

### 為什麼不把 Oracle VM 當第一輪主線
Daniel 這次的 Oracle VM 實測非常值得保留。  
它不是完全不能跑，但它清楚展示出一件事：

> **1GB RAM 的 VM 可以讓你看到 CLI 與前景 gateway 起來，卻不代表它是 onboarding / doctor / 健康驗證最舒服的第一台主機。**

你還得額外處理：

- swap
- PATH 與 Node 安裝
- SSH session 的生命週期
- 清理與遷移成本
- CLI / service / health 類流程對記憶體的壓力

換句話說，它很適合作為對照案例，不適合拿來當大多數人第一輪教學主線。

### 為什麼不建議一開始就用 Docker on Mac
Docker 很有用，但在第一輪安裝上，它會引進額外變因：

- volume 掛載
- container lifecycle
- port mapping
- host / container 權限差異
- dashboard link 其實不等於 container 已穩定運作

如果你連 base install 還沒走通，就先跳到 Docker，後面出錯時會很難分辨到底是 OpenClaw、Node、容器、權限，還是網路。

---

## 先選你的安裝路線

對 macOS 來說，我會把路線分成兩條：

### 路線 A：官方 installer，最快
適合：
- 你想盡量照官方路徑
- 你不介意讓 installer 幫你補 Node / Git / OpenClaw
- 你要的是最快把基線跑起來

### 路線 B：自己先把 Node 管好，再用 npm 安裝
適合：
- 你平常就自己管 Node
- 你想更清楚知道系統上裝了什麼
- 你想把變因切得更乾淨

對 Daniel 這個系列，我建議這樣做：

> **先看懂路線 A，實際偏向路線 B 的思維。**  
> 也就是先知道官方怎麼想，再自己確認 Node 與 PATH 沒歪。

---

## 安裝前 checklist

開始之前，先確定這幾件事。

### 1. 你有一台真的打算讓它當 host 的 Mac
不一定非得是 Mac mini，但如果你想長時間掛著，它最好不是那台會一直被你關機、亂清理、切換多套 Node 環境的主要工作機。

### 2. 你接受第一輪先不要碰遠端暴露
這篇預設：
- Gateway 綁本機
- Dashboard 先走 `127.0.0.1`
- token 先保留
- 不把 18789 裸露到 LAN 或公網

### 3. 你已經決定主模型登入方式
本系列主線是 **Codex OAuth**。  
也就是：

- 你有 ChatGPT 帳號與對應方案
- 你打算用瀏覽器完成 OAuth
- 你不是要走 OpenAI API key 這條

### 4. 你先不要用 root / sudo 安裝整套
這點很重要。  
社群 issue 已經有人回報，在乾淨的 macOS 上用不對的安裝使用者或把權限弄亂，會讓全域 npm 路徑與後續執行變得很麻煩。  
對個人機器來說，先用你的正常使用者帳號安裝最穩。

---

## Step 1：確認 Node 路線

OpenClaw 官方目前的安裝文件與 Node 文件都很清楚：

- Node 24 是推薦版本
- Node 22 LTS 仍受支援
- installer script 會自動處理 Node

如果你想自己先補 Node，macOS 最常見就是 Homebrew。

### 檢查你現在有什麼
```bash
node -v
npm -v
which node
which npm
```

### 如果你還沒有 Homebrew
照官方 Homebrew 安裝方式處理：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安裝後請照終端機提示把 `brew shellenv` 加進 shell 設定。

### 安裝 Node 24
```bash
brew install node@24
```

### 確認 PATH 沒歪
Apple Silicon 常見路徑是：

```bash
/opt/homebrew/bin
```

如果你裝完後 `node -v` 還不是 24.x，通常不是 OpenClaw 的鍋，而是 PATH 仍然先抓到舊版 Node。  
這種情況先修 PATH，不要先重裝 OpenClaw。

---

## Step 2：安裝 OpenClaw

### 路線 A：官方 installer
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

這條路的好處是快。  
官方 installer 目前會做幾件事：

1. 偵測 OS
2. 確保 Node 24 為主的 runtime 條件
3. 確保 Git
4. 安裝 OpenClaw CLI
5. 進 onboarding 流程

### 路線 B：Node 已經整理好時，用 npm
```bash
npm install -g openclaw@latest
```

然後先驗證：

```bash
openclaw --version
```

如果這裡就出現 `command not found`，先不要往下跑。  
先檢查：

```bash
npm prefix -g
which openclaw
echo $PATH
```

你要先知道 CLI 到底裝在哪裡、PATH 有沒有包含它，而不是一路往下賭。

---

## Step 3：跑 onboarding，而且一次把 daemon 裝好

這一步是第一輪安裝的核心。

最推薦的指令是：

```bash
openclaw onboard --install-daemon
```

它的意義不是只幫你做互動精靈，而是順便把後面的 service lifecycle 一起處理掉。

### 這一步通常會做什麼
- 選模型 provider
- 驗證 auth
- 檢查 model 設定
- 在 macOS 上安裝 per-user LaunchAgent
- 帶你到 dashboard / local control 路線

### 本系列主線：選 OpenAI Codex
如果你要直接指定路線，可以用：

```bash
openclaw onboard --auth-choice openai-codex
```

也可以在已安裝後補做：

```bash
openclaw models auth login --provider openai-codex
```

### 關於 OAuth 的正確期待
這個流程通常會開瀏覽器，讓你用 ChatGPT 帳號完成授權。  
你要把它想成「讓 OpenClaw 取得 subscription-based model access」，不是把什麼神秘 token 貼進 config。

---

## Step 4：確認 LaunchAgent 真的接手了

macOS 這條線的關鍵，不在於你曾經跑過 OpenClaw，而在於之後是不是由 launchd 接手。

官方文件目前寫得很清楚：

- macOS 用的是 per-user LaunchAgent
- label 會是 `ai.openclaw.gateway` 或 profile 版的 `ai.openclaw.<profile>`
- 如果 service 不存在，可以再跑 `openclaw gateway install`

### 驗證指令
```bash
openclaw gateway status
openclaw doctor
```

必要時也可以直接查 launchd 狀態：

```bash
launchctl print gui/$UID/ai.openclaw.gateway
```

如果你看到 service 沒裝好，最直接的修法通常是：

```bash
openclaw gateway install
openclaw gateway start
```

---

## Step 5：驗證 Gateway、Dashboard 與 token

現在你要驗證的，不是「我好像有安裝成功」，而是整條 local control path 都是真的活的。

### 基本驗證
```bash
openclaw --version
openclaw doctor
openclaw gateway status
openclaw models status
openclaw config get agents.defaults.model
```

### 打開 dashboard
```bash
openclaw dashboard
```

如果 UI 要求 auth，請用：

```bash
openclaw config get gateway.auth.token
```

把 token 貼進 Control UI 設定欄。

### 關於 localhost token，先不要自作主張關掉
OpenClaw 現在連 loopback 也預設 token auth。  
這不是多此一舉，而是為了避免本機其他 process 隨便連你的 gateway。

如果還沒有 token，也可以讓 doctor 生成：

```bash
openclaw doctor --generate-gateway-token
```

### 一個重要原則
不要把 token 當成「反正本機用而已」就隨便貼進聊天、螢幕截圖、或永久 URL。  
官方 dashboard / FAQ 也一直在提醒，token 最好透過 config 與 UI settings 處理，而不是到處留痕。

---

## Step 6：第一輪安裝完成的標準

你不用等到 Discord、skills、browser 全通才算成功。  
這篇的完成線其實很務實：

### 你至少要能做到這些
- `openclaw --version` 有輸出
- `openclaw doctor` 沒有致命錯誤
- `openclaw gateway status` 顯示 running 或可明確啟動
- `openclaw models status` 看得到認證狀態
- `openclaw dashboard` 能開
- 若 UI 要 auth，你知道去哪裡拿 token
- 重開 terminal 後，service 不會憑空消失

只要這些成立，你的 base install 就算站起來了。

---

## 常見踩坑，這裡先幫你避掉

## 1. `openclaw: command not found`
大多不是 OpenClaw 壞掉，而是 PATH 沒包含 npm global bin 或 Homebrew bin。  
先查：

```bash
which openclaw
npm prefix -g
echo $PATH
```

## 2. `node -v` 不是你以為的版本
這通常表示 PATH 先抓到舊版 Node。  
先修 Node，再修 OpenClaw。不要本末倒置。

## 3. macOS 權限或 xattr 讓 gateway 看起來像沒起來
社群上已經有人回報過 macOS 上 DMG / 權限相關問題，包含 gateway 被系統阻擋、使用者需要去 Privacy & Security 按 Allow Anyway 之類的狀況。  
如果你看到 CLI 裝了、但 gateway 起不來，不要只盯著 OpenClaw log，也去看系統層的安全提示。

## 4. `openclaw gateway restart` 後 service 不見
GitHub 上已經有人回報 macOS 的 restart 流程在某些情況下會把 service 弄掉，之後需要重新 `openclaw gateway install` 再 `start` 才能恢復。  
所以如果你遇到 restart 之後 status 說 service not installed，先不要慌，直接做：

```bash
openclaw gateway install
openclaw gateway start
```

## 5. Docker on Mac 卡在 onboarding complete
社群也有人回報 Docker 安裝在 macOS 上卡住，即使看到 onboarding complete，container 本身不一定真的穩定跑起來。  
這正是為什麼我建議 Docker 放到 base install 穩定之後再研究。

## 6. 不要一開始就把 gateway 綁到 LAN 或公網
如果你只是本機驗證，先讓它待在 localhost。  
遠端連線要做，但放到 Part 2，再用 SSH tunnel 或 Tailscale Serve 來講。

---

## Daniel 的案例：為什麼這系列把 Oracle VM 留在反例，不當主線

你這次在 Oracle VM 上做的事情其實很有價值，因為它把一堆「文件不一定會提醒你」的 operational friction 都踩出來了：

- swap 要自己補
- Node / npm 全域安裝路徑要自己收
- 1GB RAM 對 onboarding / doctor 很緊
- 關掉前景 SSH 視窗，不等於 OCI VM 會停，但會讓前景 gateway 程序一起結束
- 清理、遷移與重裝的總成本，比想像中高

這不是說 Oracle VM 沒價值，而是說：

> **它更像第二階段的部署選型題，不是第一輪安裝題。**

對大多數技術型個人使用者來說，先把 Mac mini 的本機基線做穩，真的更省事。

---

## 下一篇要接什麼

Part 2 我們才會把能力真正往外擴：

- Discord 配對與 access control
- Skills 安裝與治理
- Memory 的實際分工
- 遠端連線
- `coding`、sandbox、exec approvals 的安全基線

也就是說，下一篇開始，我們才會從「先活著」走向「真的能用」。

---

## Image Asset Plan

1. filename: openclaw-02-part1-install-flow.svg  
   purpose: 呈現 macOS / Mac mini 的第一輪安裝與驗證流程  
   placement: 放在「Step 1 到 Step 5」之後  
   alt: OpenClaw 在 macOS 上的安裝與驗證流程圖  
   prompt: A blog-friendly SVG showing the installation flow of OpenClaw on macOS / Mac mini: Node check, install, onboard, daemon install, gateway status, dashboard auth. Clean layout, English labels, soft colours, rounded boxes.

2. filename: openclaw-02-part1-deployment-choice.svg  
   purpose: 呈現 Mac mini、Oracle VM、Docker 三條起手路的取捨  
   placement: 放在「為什麼這篇主線放在 Mac mini」段落後  
   alt: OpenClaw 第一輪安裝的部署選擇比較圖  
   prompt: A clean SVG comparing Mac mini, Oracle VM, and Docker as first-step deployment choices for OpenClaw. Highlight operational complexity, recoverability, and suitability for a first install. English labels only.

---

資料來源請見 `./resource/references.md`。
