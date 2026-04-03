---
title: "OpenClaw 部署與配置 Part3"
description: "權限、更新、備份與搬家，怎麼做才不會把一台已經開始長住的 OpenClaw 主機玩壞。"
categories: ["openclaw"]
tags: ["openclaw", "deployment", "configuration", "gateway", "ops", "self-hosted"]
date: 2026-04-03T20:06:00
featured: false
---

# OpenClaw 部署與配置 Part3

*權限、更新、備份與搬家，怎麼做才不會把一台已經開始長住的 OpenClaw 主機玩壞*

很多人以為 OpenClaw 真正難的地方是模型。  
我現在反而比較常覺得，模型不是最容易讓人翻車的地方。

真正會把一台原本「能用」的 OpenClaw 主機慢慢玩壞的，通常是兩件事：

1. **權限與工具邊界沒有搞清楚**
2. **更新、備份、搬家被當成臨時想起來才做的事**

這篇想處理的就是這兩條線。

而且我要先把立場講清楚：

- 我不是反對 `full`
- 我也不是反對更新
- 我反對的是在還不知道自己 workload 的情況下，把所有東西先開滿，再把更新當抽卡

這兩種做法都很像自由。  
其實更像延後爆炸。

## 先講 `tools.profile`，因為很多怪問題都從這裡開始

官方文件現在把這件事寫得非常清楚：

- `tools.profile` 是 **base allowlist**
- 先套 profile，再套 `tools.allow` / `tools.deny`
- local onboarding 對新的本機 config，現在預設會落到 `coding`

這幾句話很重要，因為它們直接解釋了 2026 年 3 月那波大量「OpenClaw 只會聊天、不會做事」的現象。

問題不是大家突然不會配 `exec`。  
而是很多人以為自己把 `exec` 寫進 config 了，agent 就一定看得到。實際上，如果 profile 還停在 `messaging`，runtime / fs 那組工具根本不會進工具集。

## 這四個 profile 要怎麼看

### `minimal`
幾乎只留 `session_status`。  
這不是一般個人主機的預設，而是給極端收斂用途。

### `messaging`
這條線很適合「訊息型 bot」或公共入口面。  
它主要保留的是 messaging 與 session 類能力，不是檔案系統與執行環境。

如果你現在的 OpenClaw 只負責：

- 回訊息
- 查 session
- 做有限度的轉發或互動

那它有存在價值。  
但如果你期待它能讀檔、寫檔、跑命令、改檔案，`messaging` 常常不是你想像中的起點。

### `coding`
這是我現在最常推薦給**本機技術型個人使用者**的起點。  
因為它有比較誠實的能力組合：

- `group:fs`
- `group:runtime`
- `group:sessions`
- `group:memory`
- `image`

意思是：它夠能做事，但不是把所有東西全部無條件放開。

### `full`
`full` 不是「專業版」，只是**不做 base restriction**。

這件事值得說清楚。  
很多人把 `full` 想成一種成熟度徽章，好像只要夠懂 OpenClaw，就應該開 `full`。我不太認同。

`full` 合理的情境通常是：

- 你很清楚自己要讓 agent 碰哪些能力
- 你已有額外的 allow / deny 或環境邊界
- 你願意承擔更大的 blast radius

如果這三件事都還沒有，那 `full` 多半不是效率，而是範圍失控。

## 我自己的判斷順序

如果是我自己的本機或 Mac mini，我的判斷通常長這樣：

### 1. 先問 workload，不先問爽度
我要它做的是：

- coding / patch / command execution？
- 還是只是訊息互動？
- 還是混合，但 browser 與 messaging 都有？

如果重點是 coding、本機自動化、工作區操作，我大多從 `coding` 起手。

### 2. 先用 profile 定大邊界，再用 allow / deny 修細節
官方文件現在很清楚：順序是 base profile → provider/profile restriction → allow/deny。

這很好，因為它逼你先做大方向決策，而不是一開始就在細項白名單上打地鼠。

### 3. 不要在看不懂 fault domain 時直上 `full`
很多人遇到工具不見，就直接全開。  
這有時候的確能讓事情「先動起來」，但也很容易把真正問題蓋掉。

如果根本問題是：

- session 用的是舊工具快照
- profile 變更後沒開新 session
- gateway / service token 漂移
- plugin 根本沒載入

那你開 `full` 也只是把現場弄得更吵。

## 更新：不要混 install method，不要裸更新，不要把 agent 當 release manager

這段我想講得很實際。

官方 installer 現在預設 install method 是 `npm`，但也支援 `git`。  
`openclaw update` 會依照當前 channel / install method 走不同路徑，stable/beta 會走 npm，dev 則會去維護 git checkout。

這意味著一件很容易被忽略的事：

**不要今天 installer，明天手動 npm，後天又切 git，然後希望系統自己永遠記得你在幹嘛。**

我現在比較認同的做法是：

- 你怎麼裝，就盡量沿著那條線更新
- 要改 install method，可以，但要當成正式變更，不要當隨手試試

## 我自己的更新流程

### 日常檢查
```bash
openclaw update status
openclaw --version
openclaw gateway status
```

### 真正更新前
先做備份：

```bash
openclaw backup create --verify
```

如果你真的只想先留 config，也可以：

```bash
openclaw backup create --only-config
```

### 更新
如果你走官方主路徑，我傾向先用：

```bash
openclaw update
```

如果你是手動以 npm / pnpm 管理，也要保持一致，不要來回跳。

### 更新後檢查
```bash
openclaw doctor
openclaw gateway status
openclaw status
```

這套流程看起來很普通，但它有一個很重要的優點：

**它讓更新從「按下去祈禱」變成「有回退線的操作」。**

## 為什麼我不建議讓 agent 自己更新 OpenClaw

官方 FAQ 對這件事其實講得滿誠實的：  
可以，但不建議。

我完全同意。

因為更新可能牽涉到：

- gateway restart
- active session 中斷
- clean worktree 要求
- plugin sync
- post-update doctor
- 還有 service / token / launch agent 的後續狀態

這種東西讓 agent 去做，不是完全不可能。  
但如果你還在問「這台機器目前到底有沒有穩」，那就先不要把 release management 外包給同一個會因更新而重啟的系統。

## 備份與搬家：真正要搬的是 state，不是只有一份 JSON

這也是很多人容易想太簡單的地方。

官方 migration guide 現在講得很清楚：搬機不是只搬 `openclaw.json`。  
如果你要保留原本的系統狀態，你通常至少要保：

- config
- auth / OAuth / credentials
- sessions
- channel state
- workspace（包含 `MEMORY.md`、skills、prompts）

也就是說，真正值得尊重的單位不是「某個設定檔」，而是**整個 OpenClaw state**。

這也是為什麼我愈來愈喜歡先用：

```bash
openclaw backup create --verify
```

再去談遷移。  
因為它至少讓你在大修之前，先有一個有 manifest、可 verify 的歸檔，而不是手動亂 copy 一堆隱藏資料夾，最後忘了哪個 token 或 workspace 沒帶走。

## 這篇最想留下來的幾個實務原則

### 1. `coding` 往往比 `full` 更誠實
尤其對本機技術型個人使用者來說。

### 2. `full` 合理，但不是預設榮譽勳章
你要先知道自己在放大什麼風險。

### 3. 更新要沿 install method 走
不要混線更新，然後再把 drift 當成神祕 bug。

### 4. 更新前先備份
這不是老派，是節省時間。

### 5. 搬家要搬整個 state
不是只搬一份 JSON。

## 最後的結論

我現在愈來愈相信，OpenClaw 的運維重點不是把功能開到最多，而是把**能力邊界、更新節奏、回退能力**建立起來。

一台真的開始長住的 OpenClaw 主機，不怕能力不夠。  
比較怕的是：

- 權限一開始就失控
- 更新沒有流程
- 備份只是心理安慰
- 一出事就靠印象亂猜

如果你把這幾條守住，後面很多「OpenClaw 很不穩」的抱怨，至少有一半會先縮小成比較可管理的工程問題。

## 參考說明

完整來源整理在 `./resource/references.md`。
