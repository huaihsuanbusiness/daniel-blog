---
title: "OpenClaw 部署與配置 Part2"
description: "安裝完成之後，第一輪到底該先改哪些設定，哪些反而先不要碰。"
categories: ["openclaw"]
tags: ["openclaw", "deployment", "configuration", "gateway", "ops", "self-hosted"]
date: 2026-04-03T20:05:00
featured: false
---
*安裝完成之後，第一輪到底該先改哪些設定，哪些反而先不要碰*

我先講一個我很想吐槽的現象。

網路上很多 OpenClaw 教學，安裝段落還沒對完，就直接開始教你：

- 手改一大坨 `openclaw.json`
- 先接 Telegram 或 WhatsApp
- 然後一路加 skills、加 browser、加 automation
- 最後再來猜你到底哪一段壞掉

這種流程的問題不是不夠完整，而是**太早把變數堆滿**。

如果你是科技小白，這樣寫通常會讓人更迷糊。  
但你現在不是那個讀者。這篇是寫給已經會用 Terminal，也知道服務、token、config 都會互相影響的人。

所以我想講的是比較工程化的版本：

**OpenClaw 安裝完之後，第一輪設定的目標不是「配到最強」，而是先建立一個可驗證、可觀察、可迭代的基線。**

## 先把目前官方流程對齊

截至這次查證，官方 first-run flow 的主路徑大致是這樣：

### 路徑 A：官方 installer
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

這條路會偵測環境、處理 Node 版本需求、安裝 OpenClaw，然後啟動 onboarding。

### 路徑 B：你自己管理 Node
```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

如果你用 pnpm，也有官方寫法，但第一次全域安裝後要額外批准 build scripts。

這裡最容易被舊教學帶歪的點有兩個：

1. **安裝不等於 setup 完成**  
   真正完成 first-run setup 的關鍵，是 `openclaw onboard --install-daemon` 這段流程。

2. **第一個驗證入口應該是 dashboard，不是 channel**
   這不是因為 dashboard 比較潮，而是因為它少一層外部變數。  
   你應該先確認本機 Gateway、auth、UI 能對上，再去接 Telegram、Discord 之類的 channel。

我現在比較認同的驗證順序是：

```bash
openclaw gateway status
openclaw models status
openclaw dashboard
```

如果 dashboard 都還沒通，你就先別急著接 channel。  
不然一出事，你根本不知道是 model、gateway、channel 還是 token 在鬧。

## 先建立一個對 config 比較健康的心智模型

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀 optional JSON5 config。  
如果檔案不存在，系統會用安全預設值。

這裡有兩個很實用的現實：

- 你不需要第一天就把整份 config 寫滿
- 你也不應該把 configuration reference 當成從頭背到尾的教材

我現在比較推薦的理解方式是：

### 1. onboarding 先建立基線
它會幫你處理 model/auth、workspace、gateway、daemon、部分 channel 與 skills。

### 2. `configure`、`config get/set` 用來做小幅調整
例如：

```bash
openclaw config file
openclaw config get agents.defaults.model
openclaw config set tools.profile coding
```

### 3. 直接手改 JSON5，只留給你已經知道自己在改什麼的時候
不是不能手改，而是不要在還不熟 schema 時直接把它當主要操作介面。

## 第一輪真正值得動的，不是全部，而是這幾塊

### A. 模型與 auth

這是最先確認的。不是因為它最炫，而是因為沒有它，後面大多數調整都沒有意義。

如果你走 OpenAI API key 路線，官方建議很直白：

```bash
openclaw onboard --auth-choice openai-api-key
```

如果你走 Codex OAuth 路線，也有對應流程：

```bash
openclaw onboard --auth-choice openai-codex
# 或
openclaw models auth login --provider openai-codex
```

我會建議第一輪先確認三件事：

- default model 是什麼
- auth 是不是有效
- 你現在到底走 API key 還是 subscription OAuth

因為這三件事情如果模糊，後面很多「模型怪怪的」其實都只是在追錯問題。

### B. Gateway bind 與 auth

如果你現在是在自己的本機或 Mac mini 上做第一輪配置，我的建議通常很保守：

- 先維持 loopback
- 先保留 token auth
- 先不要急著改成 LAN / 公網可碰

這不是在賣恐懼，而是因為新版文件和 troubleshooting 已經把 guardrails 收得更硬了。  
非 loopback bind 如果 auth 沒配對，很容易直接進 crash loop 或 handshake 失敗。

很多人第一輪不是壞在 OpenClaw 本身，而是壞在「我只是想從別台機器打開看看」，結果一不小心把 gateway 暴露方式和 auth 一起弄亂。

### C. Browser 設定

這塊很值得第一輪就搞清楚，但不一定要第一輪就玩很深。

官方現在對 browser 的分法很有用：

- `openclaw` profile：隔離的 managed browser
- `user` / `existing-session`：附著到你現有的本機 Chrome session

我的建議很簡單：

**第一輪先把 browser 當成獨立、隔離、可驗證的能力來看。**

先確認下面這組最基本的命令有沒有通：

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
```

如果你一開始就想跨 host、跨 WSL2、跨 Windows Chrome、跨現有 user session，你不是在配置 browser，你是在把 transport 問題、CDP 問題、host-local 限制一起打包進來。

那是第二輪的事。

### D. Channels

第一輪我只建議做一件事：**不要一次開太多。**

你可以先接一個最想用的 channel，但我不會建議在 gateway、dashboard、model 都還沒穩之前，就同時把 Telegram、Discord、Signal 全接進來。

對技術讀者來說，這個道理其實跟後端服務一樣：  
先把 core path 跑順，再加 ingress。

### E. `tools.profile`

這塊很重要，但我刻意不在這篇講太滿。  
因為它值得在 Part3 單獨講清楚。

你現在先記一件事就夠：

**`tools.profile` 不是裝飾欄位，它是 base allowlist。**

如果 profile 把某組工具先關掉，你後面即使在 config 裡另外寫了 tool settings，那些工具也可能根本不會真的出現在 agent 看得到的工具集裡。

對本機技術型個人使用者來說，我通常會把 `coding` 當成比較誠實的起點。  
但這篇先不展開，後面再細講。

## 哪些設定第一輪反而先不要碰

這裡我想刻意寫反面清單。因為很多問題其實是「太早優化」造成的。

### 1. 不要第一天就重寫整份 config
你不是在寫 infra-as-code showcase。你是在建立穩定基線。

### 2. 不要第一天就把 bind 擴到 LAN / tailnet / public
先把 loopback 上的 dashboard、token、browser 跑通。

### 3. 不要第一天就把所有 channels 接滿
這只會讓你失去定位問題的能力。

### 4. 不要把 browser 的遠端控制模式和本地驗證混在一起
先證明本地 browser 能跑，再做跨 host。

### 5. 不要把每次 config 變更都當成必須重啟
新版 config 支援 hot reload，預設 `hybrid` 會熱套用安全變更，必要時自動重啟。  
當然，如果你改的是 bind、auth、service 相關設定，而且 status 與實際行為看起來不一致，那我還是會傾向手動 `openclaw gateway restart`，因為這比較誠實。

## 我自己的第一輪配置方法

如果今天是一台新裝好的 Mac mini，我的第一輪通常長這樣：

1. 安裝 OpenClaw  
2. 跑 onboarding 與 daemon install  
3. 確認 `openclaw gateway status`  
4. 確認 `openclaw models status`  
5. 開 `openclaw dashboard`  
6. 找到 config file 與目前有效設定：
   ```bash
   openclaw config file
   openclaw config get agents.defaults.model
   openclaw config get tools.profile
   ```
7. 只改最有感的幾塊：model、gateway auth/bind、browser、第一個 channel
8. 其他先不碰

這個流程很不炫，但我後來愈來愈相信它。  
因為它讓你每改一層，都知道自己是在改哪一層。

## 這篇真正想留下的一句話

**第一輪 config 的重點，不是把 OpenClaw 變成完全體，而是先把它變成一個你能相信的系統。**

這兩者差很多。

完全體很容易長成怪物。  
可信的系統，才有資格慢慢加能力。

## 下一篇會往哪裡接

當你把第一輪 config 改到「可以用」之後，真正會冒出來的問題通常不是功能不夠，而是：

- 權限該開到哪裡才剛好
- `tools.profile` 到底怎麼影響 agent 能做什麼
- 更新、備份、搬家要怎麼做，才不會自己把自己玩壞

那就是下一篇要處理的事。

## 參考說明

完整來源整理在 `./resource/references.md`。
