---
title: "OpenClaw 部署與配置 Part4"
description: "OpenClaw 壞掉時，怎麼先把問題分到正確的故障線，而不是一開始就猜錯方向。"
categories: ["openclaw"]
tags: ["openclaw", "deployment", "configuration", "gateway", "ops", "self-hosted"]
date: 2026-04-03T20:07:00
featured: false
---
*OpenClaw 壞掉時，怎麼先把問題分到正確的故障線，而不是一開始就猜錯方向*

我現在對 OpenClaw troubleshooting 的看法，跟一開始很不一樣。

一開始我很容易把所有故障都想成同一類：

- 不能連，就是網路問題
- 不會做事，就是模型問題
- dashboard 401 / 1008，就是 token 壞掉
- browser 怪怪的，就是 browser 壞掉

後來真的動手跑多幾輪之後，我發現 OpenClaw 最浪費時間的地方不是 bug 多，而是**很多不同類型的 bug 長得很像**。

尤其當你又剛好跑在低 RAM 主機、剛更新過版本、手上還有 channel 與 browser 一起在動時，表面症狀更會互相偽裝。

所以這篇不是 bug 大全。  
我想給你的，是一張我自己現在比較信的**故障分類地圖**。

## 先說最重要的一句話

**OpenClaw 出事時，先分類，再修。**

如果你一開始就猜錯 fault domain，後面做得再勤勞也只是繞路。

## 我現在固定會跑的第一輪命令

官方 FAQ 的「first 60 seconds」其實很值得照抄，因為它的排序是對的。

我現在第一輪幾乎固定跑這幾個：

```bash
openclaw status
openclaw status --all
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

如果 gateway 還活著，而且你需要更完整的 probe：

```bash
openclaw status --deep
openclaw health --verbose
```

如果你懷疑是 browser：

```bash
openclaw browser status
openclaw browser profiles
```

如果你懷疑是 channel：

```bash
openclaw channels status --probe
```

這裡的重點不是命令多，而是**順序**。  
你應該先知道：

1. Gateway 在不在
2. CLI 跟 Gateway 能不能正常握手
3. logs 在說哪一層
4. doctor 有沒有直接指出 schema / service / token / permission 問題

不是一開始就去重裝。

## 我現在怎麼切 fault domain

### 第一條：service / daemon 線

先看：

```bash
openclaw gateway status
```

如果這一步就不對，先別去猜 model、browser、channel。  
你要先回答：

- service 有沒有真的載入
- 進程在不在
- probe target 是不是你以為的那個
- CLI 與 service 到底是不是在看同一份 config

這條線在 macOS 特別值得小心，因為 LaunchAgent 問題有時候不是「完全沒起」，而是起在一個不太對的狀態。近期 issue 就有出現：

- restart 後 service 沒正確 reload
- config 觸發的 restart 在 launchctl 路徑上 timeout
- `gateway stop` 之後 service 沒再正確 loaded
- LaunchAgent 與實際 token / env 不一致

這些問題都很討厭，因為它們會讓你誤以為「Gateway 明明有跑」，但實際上 probe 或 operator scope 已經歪掉。

### 第二條：auth / token / device token 線

如果 gateway 在，但你看到的是：

- `unauthorized`
- `AUTH_TOKEN_MISMATCH`
- `AUTH_DEVICE_TOKEN_MISMATCH`
- dashboard 一直 1008
- CLI 說 reachable 但 RPC probe 有問題

那就先不要再猜 browser 或 model。

先查：

```bash
openclaw config get gateway.auth.token
openclaw devices list
openclaw gateway status
```

必要時看 troubleshooting 裡的 token drift recovery checklist。  
新版 dashboard / Control UI 的 token 行為也要記得一件事：它只會把 token 記在**目前瀏覽器 tab 的設定狀態**，不是某種全域永久神祕登入。

所以很多「明明昨天可以，今天不行」的情況，其實不是 gateway 壞掉，而是：

- 你連到不同 URL
- tab 內 token 沒帶過去
- device token 已經 stale
- 或 service 用的 token 與 config 漂移了

## 第三條：工具集 / profile / session 線

這條線很常被誤判成模型退化。

典型症狀是：

- agent 只會文字回覆
- `exec`、`read`、`write`、`browser` 說 tool not found
- 明明 config 裡有寫，但 agent 看不到

這時候先不要急著重裝。  
先查兩件事：

```bash
openclaw config get tools.profile
openclaw status
```

然後確認你是不是還在沿用**舊 session**。

這是最近一波 issue 很有代表性的教訓：  
`tools.profile=messaging` 會把 runtime / fs 工具整組先擋掉。你就算另外寫了 tool config，也不代表 agent 真看得到。

而且有些情況下，**你改完 profile 還需要開新 session**，不然舊對話沿用的是舊工具快照。這件事如果沒搞清楚，很容易誤以為 OpenClaw 整套工具系統壞掉。

## 第四條：browser 線

如果 Gateway 正常、auth 也正常，但 browser 就是不對，那就老實走 browser 線，不要再把它混回其他故障。

我通常會先跑：

```bash
openclaw browser status
openclaw browser profiles
openclaw logs --follow
```

我現在最常先排查的是這幾種：

### 1. browser 根本沒載入
如果 `plugins.allow` 把 browser 排掉，你即使 `browser.enabled=true` 也沒用。

### 2. binary path 或 CDP 起不來
例如 executable path 錯、CDP port 沒開起來。

### 3. 你選錯 browser mode
`user` / `existing-session` 是 host-local 路線。  
如果 Gateway 跟 Chrome 不在同一台機器上，這條路本來就不會自然工作。

### 4. orphan / zombie browser process
近期 issue 有出現 Gateway restart 或 crash 後，Chromium process 沒被收乾淨，長時間累積記憶體。這種東西表面上會像「browser 慢慢變怪」，底層其實已經變成 resource 問題。

## 第五條：低 RAM / 資源壓力線

這條是我自己最有感的一條。

低 RAM 主機最麻煩的地方，不是一定會馬上 OOM。  
而是它常常讓問題看起來像別的問題。

例如：

- CLI command 突然 heap out of memory
- browser tab 沒關乾淨
- message send 在 4GB 主機某些版本開始 crash
- session 一長，行為開始飄
- 看起來像 config drift，其實是 process 已經在喘

這也是為什麼我一直把 Oracle VM 1GB 當成很好用的反例。  
它不是證明「OpenClaw 完全不能跑小機器」，而是提醒你：

**小機器會放大很多本來就邊緣的問題，而且把症狀變得很不誠實。**

如果你在 1GB 或 2GB 環境裡調 OpenClaw，我的建議通常不是「再多猜幾次」，而是先問：

> 我現在遇到的是配置錯，還是這個 host 根本不適合當第一個 debug 現場？

## 我自己的急救順序

如果我現在接手一台有問題的 OpenClaw 主機，我通常這樣做：

### 1. 先做最小診斷
```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

### 2. 懷疑大修前先留快照
```bash
openclaw backup create --verify
```

### 3. 確認 fault domain
- service / daemon
- auth / token
- tools.profile / session
- browser
- 資源壓力

### 4. 只在確定 fault domain 後才做對應動作
例如：
- token drift 才去 devices rotate / approve
- tools.profile 才去改 profile 並開新 session
- browser 問題才去看 profile / CDP / orphan process
- 低 RAM 問題才考慮換 host 或縮 workload

這個順序的好處是，你比較不會因為心急，把一個問題重寫成三個問題。

## 最後的結論

我現在最相信的 OpenClaw troubleshooting 原則，不是某一個神奇指令，而是：

**先分類，再修；先保命，再折騰。**

保命的意思包括：

- 先留 backup
- 先確認 service 與 token
- 先把問題切到正確 fault domain
- 不要一上來就刪 `~/.openclaw`

因為 OpenClaw 真正麻煩的，常常不是 bug 本身，而是你被它的表面症狀騙去別條線上忙半天。

分類能力比手速重要。  
對這套系統來說，這句話真的很值錢。

## 參考說明

完整來源整理在 `./resource/references.md`。
