---
title: "OpenClaw 快速上手 01｜OpenClaw 是什麼？先分清它是自架 Agent Gateway，不是聊天 UI 的加強版"
description: "給會用 Terminal 的技術型讀者。一篇先把 OpenClaw 的 Gateway、Agent、Channel、Tools、Skills、Memory、部署路線與適用邊界切清楚的導讀文。"
categories: ["openclaw"]
tags: ["openclaw", "agent", "gateway", "self-hosted", "tools", "memory"]
date: 2026-04-02T14:40:00
featured: false
---

> 適合誰：會用 Terminal、想把 OpenClaw 跑起來的技術型讀者。  
> 這篇不教你每個按鈕怎麼點，而是先把系統邊界切清楚。因為很多安裝失敗，不是指令不會打，而是心智模型一開始就歪了。

---

## 先講結論

如果你把 OpenClaw 理解成「比較強的 ChatGPT」，你之後大概會一路撞牆。

更準確的理解是：

> **OpenClaw 是一個長期運作在你自己機器上的 Agent Gateway。**  
> 它負責接收訊息、維持 session、管理工具權限、讀寫記憶、連接模型、再把能力投射到 Discord、Telegram、iMessage 或本機 Dashboard 上。

這個定義有兩個後果：

1. 你安裝的不是單一聊天介面，而是一個**常駐服務**。  
2. 你管理的不是單一模型，而是一套**通道、工具、記憶與權限**的執行邊界。

這也是為什麼 OpenClaw 值得寫成一個系列，而不是一篇安裝文收工。

---

## 為什麼很多人第一次看 OpenClaw 都會看錯

第一次接觸 OpenClaw，很容易把它看成下列三種東西之一：

### 看錯 1：把它當聊天 UI
這是最常見的誤會。  
TUI、Dashboard、Discord、Telegram 這些都只是 **front end**。真正持有狀態的是 Gateway，不是你眼前那個視窗。

### 看錯 2：把它當模型本體
模型只是推理引擎。OpenClaw 真正加上去的是**工具、通道、記憶、配對、權限與執行治理**。  
你可以換模型，但 OpenClaw 的核心價值不在於模型名單，而在於整套 runtime。

### 看錯 3：把它當「裝了就會變超強」的 agent 套件
OpenClaw 很強，但不是魔法。  
它的風險也來自同一個地方：你讓它讀你的檔案、接你的訊息、打開瀏覽器、跑 shell 指令，它才有能力幫你做事。換句話說，能力與風險本來就綁在一起。

---

## 最小心智模型：七個元件先切清楚

## 1. Gateway
Gateway 是整套系統的常駐核心。  
它聽 WebSocket、維持 session、處理 auth、路由 channel、管理工具、讀寫 transcript 與記憶。

對新手最重要的理解只有一句：

> **關掉某個前端，不等於 Gateway 停掉。**

你關掉 TUI，Gateway 可能還在。  
你關掉 Dashboard，Gateway 可能還在。  
你如果是以前景模式手動跑 `openclaw gateway`，關掉那個 terminal 才會停。  
如果你用 daemon / LaunchAgent，則服務會交給作業系統管理。

## 2. Agent
Agent 是負責決策的那一層。  
它根據目前 session、可用工具、skills、記憶與系統提示，決定下一步做什麼。

模型像引擎，Agent 像駕駛邏輯。  
這也是為什麼「換模型」和「整體行為穩不穩」不是同一件事。

## 3. Channel
Channel 是 OpenClaw 對外接訊息的入口。  
Discord、Telegram、WhatsApp、iMessage、Signal 這些都是 channel。  
一個 Gateway 可以接多個 channel，但是否應該全接上，是治理問題，不是炫技問題。

## 4. Tools
Tools 是實際副作用的入口。  
讀檔、寫檔、執行命令、瀏覽器、圖像分析、傳訊息，全都在這裡。

OpenClaw 文件目前把本機 onboarding 的 `tools.profile` 預設設成 `coding`，不是 `full`。這個細節很重要，因為它代表官方也在試圖讓新安裝的預設值稍微保守一點，而不是一上來就無上限放權。`coding` 主要包含檔案、runtime、sessions、memory 與 image；`messaging` 則是更窄的訊息型工具集合。  
如果你不理解這層，最容易做的錯事就是看到某個能力不能用，就直接把 profile 改成 `full`。這通常不是第一步該做的事。

## 5. Skills
Skills 不是模型能力本身，而是**教代理怎麼用工具**的 skill folders。  
它們有自己的載入位置、優先順序、相容檢查與安全風險。

一個很容易被忽略的細節是：skills 不只是功能包，也會變成 system prompt 的一部分。裝越多，代理可見的 skill 清單越長，token 成本和選錯工具的機率也會一起長大。  
所以「把 ClawHub 能裝的全部裝滿」幾乎從來不是好策略。

## 6. Memory
OpenClaw 的記憶不是模型憑空記住，而是落在磁碟上的檔案。  
官方文件把它拆成兩層：

- `MEMORY.md`：長期記憶  
- `memory/YYYY-MM-DD.md`：每日筆記

這是一個很值得先理解的設計。因為它表示你管理的不是抽象「有沒有記憶」，而是**哪些內容應該整理成 durable memory，哪些只是當天上下文**。

## 7. Node / macOS app
如果你在 macOS 上用 app 或遠端 node 模式，OpenClaw 還可能多一層 node host。  
這一層會讓某些 macOS 能力，例如 `system.run`、螢幕、通知、相機、Canvas，在 app 的 UI / TCC 脈絡中執行。  
這和「Gateway 直接在本機 host 上跑 exec」不是完全同一條路。

---

## 它和直接用 ChatGPT、Codex app、Codex CLI 的差別在哪

很多人真正想問的其實不是「OpenClaw 是什麼」，而是：

> 我已經有 ChatGPT / Codex 了，為什麼還要多這一層？

### 直接用 ChatGPT
適合：
- 查資料
- 腦力輔助
- 一次性的寫作與問答

不適合：
- 持續連接你的訊息通道
- 管你的本機檔案與工作區
- 用固定 gateway 維持跨通道 session 與記憶

### 直接用 Codex app / Codex CLI
Codex 已經可以在本機讀、改、跑程式，對純 coding 任務非常實用。  
如果你的需求主要是「在某個 repo 裡寫程式、改檔、跑測試」，那麼直接用 Codex app / CLI 很可能比較直，不一定需要 OpenClaw。

### 用 OpenClaw
OpenClaw 比較像一個**持續在線的自架 runtime**。  
它的強項不是單次寫程式，而是把這些能力放進一個可常駐、可接多 channel、可控權限、可加記憶、可加 skills 的代理系統裡。

### 一句話切邊界
- **Codex app / CLI**：很適合「我坐在這台機器前，讓模型幫我工作」  
- **OpenClaw**：很適合「我想把模型做成一個持續在線的 agent gateway，從不同入口去驅動它」

---

## 模型與認證：API key 跟 Codex OAuth 是兩條路，不要混講

這一點原本很多教學都講得太滑順，結果新手很容易誤會。

### 路線 A：OpenAI API key
這條路適合：
- 明確要走 OpenAI Platform
- 想用 usage-based billing
- 想把 OpenClaw 放進比較可程式化的流程

### 路線 B：OpenAI Codex / ChatGPT OAuth
這條路適合：
- 已經有 ChatGPT Plus / Pro / Business / Enterprise 等方案
- 不想額外管理 API key 與 API 帳單
- 想沿用 ChatGPT subscription 的登入體驗

OpenAI 的 Codex 文件與 OpenClaw 的 provider 文件都把這兩條路分得很清楚。  
對你這個系列來說，主線會放在 **Codex OAuth**。因為這是 Daniel 目前的真實使用路線，也是很多個人 builder 最想先走通的路。

但要注意兩件事：

1. **OAuth token 不是 API key**  
2. 你在 `openai/*` 跟 `openai-codex/*` 之間切的是供應商模式，不只是模型名稱前綴

---

## 部署形態比較：不要只問能不能跑，要問哪裡最適合當第一台主機

OpenClaw 官方安裝支援 macOS、Linux、Windows/WSL2，Node 24 為推薦版本，Node 22 LTS 也仍受支援。  
但「支援」和「適合你當第一輪主機」是兩個不同問題。

下面這張表比較像工程上的起手式判斷，而不是官方市場文案。

| 形態 | 適合什麼 | 優點 | 代價 / 風險 |
|---|---|---|---|
| **Mac mini / 本機 macOS** | 個人常駐主機、和你自己的工作流綁很深 | 最接近本機使用情境，Browser / node / UI 路線完整 | 真機就是真機，權限與資料都更敏感 |
| **Linux / VPS** | 長期遠端 host、多裝置接入 | 網路與服務管理比較像 production | 要處理 auth、remote access、節點與網路安全 |
| **Docker** | 可重現、隔離、團隊實驗 | 好回滾、可版本化 | 第一輪會多出容器、掛載、port、權限等額外變因 |
| **小規模 VM** | 想隔離風險、試驗系統 | 比真機安全邊界清楚 | 資源太小時，CLI 能跑不代表 onboarding / doctor / browser 類流程跑得順 |

### Daniel 的案例：Oracle VM 1GB 是很好的反例
這個案例很值得保留，因為它正好說明「能跑」跟「適合當第一台主機」不是同一件事。

你這次在 Oracle VM E2.1.Micro 上的觀察很清楚：

- CLI 與前景 gateway 可以起來
- 但 onboarding / doctor / health 這種流程在 1GB RAM 上非常吃緊
- 還要額外處理 swap、Node 安裝、PATH、SSH session 與清理腳本
- 最後真正比較像長期可維護主線的，仍然是 Mac mini

所以這個系列的主線不會寫成「先上 Oracle VM 再說」，而是：

> **先在 Mac mini 把本機 gateway 跑穩，再決定要不要把 gateway、node 或某些能力拆到 Linux / VPS。**

---

## OpenClaw 什麼時候值得用，什麼時候先不要用

這一段是本篇最重要的判斷區。

## 值得用的情境
### 1. 你要的是常駐 agent，不是單次對話
例如：
- 你想在 Discord / Telegram 上叫它做事
- 你要它跨 session 保留工作脈絡
- 你要它在同一套 workspace 內管理記憶、工具和技能

### 2. 你想把本機或自家主機當成能力邊界
例如：
- 檔案只放自己的機器
- 不想把所有流程外包給雲端 SaaS
- 想自己控制 auth、network、skills、transcript、權限

### 3. 你接受它是一套要維運的系統
OpenClaw 不是「安裝完就像手機 app 一樣無腦」。  
你要接受：
- 服務會有 lifecycle
- tools / skills 會有權限與 supply-chain 風險
- channel / group / DM access control 要自己定規則

## 先不要用的情境
### 1. 你只是想找一個更會寫 code 的模型
那先用 Codex app / CLI、ChatGPT、Claude Code 類工具就好。  
不需要一開始就把 runtime、channel、memory、gateway 都扛起來。

### 2. 你沒有要維運常駐服務
如果你其實不想碰 daemon、token、allowlist、gateway status，那麼 OpenClaw 會讓你覺得「事情比想像中多」。

### 3. 你想把它直接接到高敏感帳號上，卻還沒建立安全基線
這是最危險的一種。  
OpenClaw 的價值和風險都來自權限。若你還沒有想清楚：
- 哪些 channel 開放
- 哪些 tools 開放
- skills 哪些可信
- gateway 是否只綁 loopback
- 要不要 sandbox / exec approvals

那最好的起步不是先裝更多，而是先縮小能力邊界。

---

## 關於 Skills：我會建議你比多數教學再保守半格

很多新手教學會把 skills 當成一個「裝越多越厲害」的功能區。  
但工程上比較誠實的說法是：

> **Skills 是能力，也是一個 prompt 與供應鏈成本。**

幾個你之後會用到的重要細節：

1. `openclaw skills install <slug>` 會把 skill 安裝到目前 workspace 的 `skills/` 目錄  
2. 同名 skill 有明確 precedence，workspace 內的 override 會蓋掉更低層來源  
3. skills 會在 session 開始時被 snapshot；有 watcher 時可以在下一個 agent turn 熱更新  
4. 第三方 skills 要視為不受信任程式碼  
5. 官方現在有一些 ClawHub 掃描與信任措施，但這不等於你可以不看 source 就裝

所以這系列後面會採取的原則是：

- **先裝最少**
- **先理解 precedence**
- **先知道每個 skill 會增加什麼 prompt / secret / execution 面積**
- **再裝**

---

## 這篇真正想留下的一句話

OpenClaw 值得學，不是因為它是一個爆紅專案，而是因為它把很多人只在 demo 裡看到的「AI 真的幫你做事」變成一套可部署、可接通道、可加工具、可維運的 runtime。

但也正因為它是一套 runtime，你不能用看聊天 UI 的方式去看它。

如果你把它看成：

- 一個**常駐 gateway**
- 一套**session 與記憶管理**
- 一組**工具與 skills 治理**
- 一條**本機 / 遠端 / channel / auth / 安全基線**的部署路徑

後面的教學才會真的變得簡單。

---

## 下一篇會做什麼

下一篇我們不會急著接 Discord、裝滿 skills、開一堆遠端入口。

我們只做一件事：

> **在 macOS / Mac mini 上做出一個可恢復的第一輪安裝。**

也就是把下面這些事情先走通：

- Node 24 與 PATH
- OpenClaw 安裝
- Codex OAuth
- `openclaw onboard --install-daemon`
- LaunchAgent / gateway status / dashboard / token 驗證
- 幾個你大機率會遇到的 macOS 踩坑

---

