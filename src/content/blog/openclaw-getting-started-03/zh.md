---
title: "OpenClaw 快速上手 03｜Discord、Skills、Memory、遠端連線與安全基線"
description: "給已完成 base install 的技術型讀者。把 OpenClaw 接上 Discord、Skills、Memory 與遠端連線，同時把 access control、sandbox、exec approvals、skills 供應鏈風險一起講清楚。"
categories: ["openclaw"]
tags: ["openclaw", "agent", "gateway", "self-hosted", "tools", "memory"]
date: 2026-04-02T14:42:00
featured: false
---

> 適合誰：你已經完成 base install，現在想把 OpenClaw 真的拿來用，而不是只讓它停在 localhost 上。  
> 這篇不追求功能數量，而是追求一套**可用但不失控**的能力基線。

---

## 先講結論：OpenClaw 真正難的，不是安裝，而是治理

安裝 OpenClaw 本身，今天已經沒有那麼神祕。  
真正會把人拖進泥沼的，是安裝完成後的四件事：

1. **通道怎麼接**  
2. **技能怎麼裝、裝多少**  
3. **記憶怎麼累積、怎麼召回**  
4. **遠端怎麼連，權限怎麼收**

換句話說，Part 1 是讓它活下來，Part 2 才是讓它不要變成一台權限過大的奇怪生物。

---

## 先校正：TUI、Dashboard、Gateway 到底是什麼關係

這個關係如果一開始沒切清楚，後面很容易對行為產生錯誤期待。

### TUI
`openclaw chat` 是 terminal 裡的前端。  
它很方便，但不是 state 的 source of truth。

### Dashboard / Control UI
這是另一個前端。  
你可以用瀏覽器打開，透過 WebSocket 跟 Gateway 說話。  
如果 UI 要求 token，表示它在走正確的 auth 流程，不是壞掉。

### Gateway
真正持有 session、routing、tools、memory、transcript 的是 Gateway。  
所以：

- 離開 TUI，不等於系統死掉
- 關掉瀏覽器，不等於系統死掉
- 真正要看的是 `openclaw gateway status`、logs、doctor、channel probe

這個切分很重要，因為你之後接 Discord、遠端 access、skills、memory，全部都還是回到同一個 Gateway。

---

## Part 2 的最小能力基線

如果你想讓 OpenClaw 真正上工，我建議先把目標鎖在這組最小能力上：

- 你能從 Discord DM 它
- 你知道 pairing / allowlist / mention gating 怎麼運作
- 你只裝少量必要 skills
- 你知道 `MEMORY.md` 跟 daily notes 在幹嘛
- 你知道 localhost token、SSH tunnel、Tailscale Serve 各自是什麼
- 你不會因為某個工具被擋住就直接把 profile 切成 `full`

只要做到這些，OpenClaw 就已經比很多「只會跑 demo」的安裝狀態成熟很多了。

---

## Discord：請用最小權限把它接起來，而不是一開始就給 Administrator

Discord 是很好的第一個外部通道，因為 setup 路徑相對清楚，社群案例也夠多。

### 1. 建立 Bot 與取 Token
官方 Discord channel 文件目前要求你做的事情大致是：

- 建立 Discord application
- 建立 bot
- 複製 bot token
- 用 OAuth2 URL generator 產生邀請連結
- 至少給這些權限：
  - View Channels
  - Send Messages
  - Read Message History
  - Embed Links
  - Attach Files
  - Add Reactions（選填）

一個很值得保留的細節是：

> **避免直接給 Administrator。**

很多快速教學會偷懶直接全開，但對私人 agent 來說，這不是好習慣。

### 2. 開啟 Developer Mode，拿到 IDs
你至少要拿到：

- user ID
- server ID
- 視情況也拿 channel ID

之後的 allowlist、guilds、probe 與 routing 都比較穩。

### 3. token 優先用 env / SecretRef
官方 Discord 文件現在給的安全基線，比「把 token 直接硬寫在 JSON 裡」成熟很多。  
比較推薦的做法是：

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
```

這不代表你永遠不能用 plaintext config，而是代表**第一反應應該是不要把 bot token 到處留明文。**

### 4. pairing 與 DM 驗證
Discord 的 DM policy 預設是 `pairing`。  
這代表未授權使用者第一次 DM bot 時，不會直接放行，而是走配對流程。

這其實是個不錯的預設值，因為它讓第一次接入有一個明確的授權步驟，而不是「只要知道 bot 在哪裡就能直接用」。

---

## pairing、allowlist、mention gating：這三個東西不要混成一團

很多 Discord 設定文的問題，在於把 access control 講成一坨模糊的「授權」。

實際上至少有三個層次：

## 1. DM policy
`channels.discord.dmPolicy` 常見值包括：

- `pairing`
- `allowlist`
- `open`
- `disabled`

對個人使用者來說，我會把推薦順序寫得很清楚：

- **起步：`pairing`**
- 有穩定名單後：`allowlist`
- **不要為了方便就直接 `open`**

## 2. Group / guild policy
Discord 的 guild / channel 行為還受到 `groupPolicy`、guild allowlist、channel allowlist 影響。  
這意味著：

> 你把 `requireMention` 改成 `false`，不代表群組裡就會自然放行。

如果 allowlist 或 guild/channel 層的規則沒對上，訊息仍然可能被擋。

## 3. mention gating
`requireMention` 是另一個概念。  
它控制的是群組裡回應是否必須提到 bot，而不是整個 group access control 的全部。

### 一個實務建議
如果你把 OpenClaw 放進多人 server，我很建議這樣起步：

- guild / channel 先 allowlist
- `requireMention: true`
- 先只允許少數 user IDs
- 不開 `allowBots=true`，除非你真的知道為什麼要開

這樣可以大幅降低 bot loop、誤觸發與公共頻道副作用。

---

## Skills：不要把它當外掛商城，要把它當供應鏈與 prompt 成本

Skills 很有用，但也是最容易被「裝越多越強」這種直覺帶偏的區塊。

### 1. `openclaw skills` 先會這幾個
```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

### 2. 安裝位置與 precedence 要先知道
OpenClaw 的 skill 載入不是單一路徑，而是有一整套 precedence：

- `<workspace>/skills`
- `<workspace>/.agents/skills`
- `~/.agents/skills`
- `~/.openclaw/skills`
- bundled skills
- `skills.load.extraDirs`

同名 skill 會按優先序覆寫。  
這代表你之後看到同名 skill 行為怪怪的，不一定是壞掉，也可能是你其實載到另一層版本。

### 3. session snapshot：為什麼你剛裝好，當前 session 不一定立刻表現得像換腦
OpenClaw 會在 session 開始時 snapshot eligible skills。  
這表示：

- 你剛裝的新 skill
- 你剛改過的 skill config
- 你剛接上的 remote node

未必會在同一個舊 session 裡立刻完全生效。  
很多時候你需要開新 session，或等 watcher 在下一個 agent turn refresh。

### 4. 為什麼我會建議你少裝一點
官方 skills 文件直接提醒第三方 skills 要視為不受信任程式碼。  
而且還有一個常被忽略的工程成本：

> **每個 eligible skill 都會變成 prompt 裡的一部分。**

官方甚至把 token impact 算得很細：skills 會以 compact XML 形式注入 system prompt，除了 base overhead，還有每個 skill 額外的固定與變動字元成本。  
所以少裝不是保守而已，也是效能與可控性的決策。

### 5. 一個現實提醒：有掃描不等於你可以不看
OpenClaw 已經在做 ClawHub 相關的安全掃描與信任措施，例如 VirusTotal Code Insight 與一些 marketplace trust controls。  
但這不等於你可以把任何 skill 當成預設可信。  
對高權限或會碰 credentials 的 skill，最穩的做法還是：

- 看 source
- 先在小範圍測
- 再決定要不要留下來

---

## Memory：先把它當檔案系統，不要先把它神化成 AI 記憶體

如果你把 OpenClaw 記憶想成「模型默默都記住了」，你之後一定會失望。

比較正確的理解是：

> **它是一套由檔案與檢索組成的記憶層。**

### 1. 基本兩層
官方 memory 文件把它切成：

- `MEMORY.md`：長期、整理過的記憶  
- `memory/YYYY-MM-DD.md`：每天的工作筆記 / running context

這個切法其實很合理。  
因為很多內容不應該永久常駐，只該存在於最近兩天或某次工作脈絡中。

### 2. 先用 `memory-core`
對大多數剛安裝的人，我會建議先停在預設 `memory-core`。  
你先把 daily notes、long-term memory、召回時機這些基本體感建立起來。

### 3. `memory-lancedb` 什麼時候再碰
當你已經明確感受到：
- 記憶量變大
- 需要更積極的 auto-recall / auto-capture
- 你知道自己想要的是檢索升級，而不是模糊的「讓它更會記」

這時候再研究 `memory-lancedb` 會比較合理。

---

## 遠端連線：先記住這句話，`127.0.0.1` 不是你的遠端地址

這是最值得在 Part 2 先打進腦子的觀念。

如果 Gateway 在你的 Mac mini 上跑，那麼：

- `http://127.0.0.1:18789/` 是 **那台機器自己的 localhost**
- 你拿這個網址去別台電腦打開，不會 magically 連到你的 Mac mini
- 它只會指向那台「當下正在開瀏覽器的機器自己」

### 本機最穩的路
```text
http://127.0.0.1:18789/
```
加上 UI settings 裡貼 token。

### 從別台機器連進來，最簡單安全的路：SSH tunnel
```bash
ssh -N -L 18789:127.0.0.1:18789 user@your-host
```

然後你在本地瀏覽器打：
```text
http://127.0.0.1:18789/
```

### 比較長期的遠端路線：Tailscale Serve
如果你之後真的要長期跨設備連，Tailscale Serve 很適合。  
因為它可以讓 gateway 仍然維持 loopback / 安全邊界，同時透過 tailnet 暴露 HTTPS 路徑。

### 先不要做的事
不要一開始就把 18789 裸露到公網。  
也不要把 token 直接塞進到處亂傳的 URL，當永久登入方式。

---

## `coding`、`full`、sandbox、exec approvals：這四個詞一定要拆開理解

這部分會決定你之後的風險曲線。

## 1. `coding` profile 不是弱化版，而是合理起點
對個人 builder 來說，`coding` 已經能做很多事：

- 讀寫檔案
- runtime
- sessions
- memory
- image
- 常見的本機工作流

如果你只是因為某次操作被擋，就直接切成 `full`，多半是跳太快。

## 2. `full` 是什麼
`full` 幾乎等於不限制工具。  
對私人自用、本機、你非常清楚自己在做什麼的情境，未必永遠不能用。  
但它不應該是「我現在有點卡，所以先全開」的快捷鍵。

## 3. exec approvals 是什麼
exec approvals 比較像 host execution 的安全互鎖。  
它不是完整隔離，也不是多租戶邊界。  
它做的是：讓某些 host / node 上的命令執行，需要符合 allowlist、ask 或 approval 流程。

## 4. sandbox 是什麼
sandbox 才比較接近真正的隔離執行思維。  
如果你要讓 OpenClaw 在較不受信任的輸入、公共群組、或高風險 skill 上跑，sandbox 與 host isolation 才是更硬的那道牆。

### 一個非常實用的思路
如果你之後要把 OpenClaw 同時放在：

- 私人 DM
- 公共或半公共的群組

那麼把 DM 和 group 的 execution posture 分開，是很值得做的。  
官方文件甚至直接給了「DM 在 host，group 在 sandbox」這類模式的思路。

---

## Daniel 這套部署的現實建議

如果把你現在的情況講成一句實務建議，我會這樣寫：

> **先把 Mac mini 當主 gateway，讓 Codex OAuth、Discord、少量 skills、memory-core、localhost / tunnel 路線跑穩。等你真的感受到跨設備或長期遠端需求，再研究 VPS / Linux gateway / remote node。**

這個排序很重要。  
因為它讓你先建立：

- service lifecycle 的直覺
- access control 的直覺
- token / auth / tunnel 的直覺
- memory 與 skill 的直覺

而不是第一天就把每個 deployment abstraction 一次搬進來。

---

## 這篇的收斂版建議清單

如果你只記得 10 件事，我希望是這 10 件：

1. TUI / Dashboard 都是前端，Gateway 才是核心  
2. Discord 起步先走 DM + pairing  
3. 不要直接給 Discord Bot Administrator  
4. guild / channel 先 allowlist，再談 `requireMention=false`  
5. 第三方 skills 視為不受信任程式碼  
6. skills 裝少一點，因為它會增加 prompt 與治理成本  
7. 記憶先理解 `MEMORY.md` 和 daily notes，再碰 LanceDB  
8. `127.0.0.1` 不是遠端入口  
9. 遠端 access 先用 SSH tunnel 或 Tailscale Serve  
10. 不要因為卡住就直接把 tools profile 切到 `full`

---

