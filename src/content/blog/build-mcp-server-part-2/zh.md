---
title: "自主建造 MCP Server — Part 2：如何在 Oracle VM 上部署公開的 MCP Server"
description: "Part 2 of the MCP Server build series."
categories: ["ai"]
tags: ["ai", "mcp", "agent", "workflow", "automation", "architecture"]
date: 2026-03-31T19:23:00
featured: false
---

**副標：用 Oracle VM、Cloudflare、nginx 與 FastMCP，把一個本來只會在 terminal 裡跑的 MCP server，變成 ChatGPT 真能連上的公開 `/mcp` 端點。**

上一篇我談的是觀念邊界：MCP 真正改變的是責任分工，不只是工具接線方式。

這一篇就不再停在觀念了。  
我們直接講施工。

因為只要你真的開始自己架 remote MCP server，很快就會發現最煩的地方通常不是 `@mcp.tool`，而是下面這些很土、但又絕對逃不掉的問題：

- VM 到底有沒有真的對外
- public IP、VCN、subnet、Internet Gateway、security rules 哪裡少一塊
- 為什麼你在機器裡 `curl localhost` 成功，外面卻還是打不到
- 為什麼 nginx 看起來正常，ChatGPT 還是連不上 `/mcp`
- 為什麼 TLS、DNS、Cloudflare、origin config，會把一個原本像 Python 題目的東西變成網路題

我自己的做法是：先把 **FastMCP server** 當成很薄的一層，再讓它去吃 GitHub 上的 skill files，最後在後面呼叫既有 Make execution flows。  
整條路線長這樣：

```text
ChatGPT
→ Cloudflare
→ nginx
→ FastMCP
→ skill loader / adapter
→ Make execution flows
```

這篇會把這條路完整拆開。

![Deployment overview for a public Oracle VM MCP endpoint](./resource/build-your-own-mcp-server-part-2-01-deployment-overview.svg)

## 先講結論：如果你只是想驗證概念，先不要上 Oracle VM

我先給一個不那麼浪漫的建議。

如果你現在只是：

- 想先驗證一個 skill 能不能被 host 正常看到
- 還不確定 tool surface 該長什麼樣
- 只是想測本機或內部 demo
- 還不想碰 DNS、TLS、反向代理、systemd、機器維運

那你其實不一定要一開始就選 Oracle VM。

因為一旦你選了 VM，你同時也選了：

- SSH
- 網路拓樸
- 防火牆規則
- OS patching
- process management
- certificate handling
- 外部可用性

也就是說，**你選的不是「部署地點」，而是一整包運維責任。**

我自己會選 Oracle VM，是因為這套 server 後面真的要當長駐公開入口，而且我不想把 capability surface 交給第三方平台的預設行為。但如果你現在只是驗證 MVP，先用 PaaS 或 tunnel 也很合理。

## 這篇要完成的 end state

我這篇採用的 reference implementation 很明確：

- Oracle VM 跑 Ubuntu
- FastMCP app 不直接暴露給公網
- nginx 負責 public HTTPS 入口
- Cloudflare 管 DNS 與外層代理
- 對外真正給 host 的入口是：

```text
https://mcp.example.com/mcp
```

這樣做的目的不是把架構弄複雜，而是讓責任切得比較乾淨：

- **FastMCP** 負責 MCP capability surface
- **nginx** 負責 reverse proxy 與 HTTPS entrypoint
- **Cloudflare** 負責 DNS 與 edge-facing traffic
- **Oracle VM** 提供你可控的運行環境

## 我會怎麼分四個施工階段

我現在最推薦的順序不是「先寫 server」，而是這樣：

1. 先把 Oracle VM 網路層打通
2. 再讓 FastMCP 在內部 port 跑起來
3. 再掛 nginx 與 HTTPS
4. 最後才把 endpoint 接進 ChatGPT Developer Mode

這個順序有一個非常實際的好處：  
**每一層壞掉時，你比較知道自己是在 debug 哪一層。**

## 第 1 階段：把 Oracle VM 變成真的 public host

Oracle 官方文件講得很清楚。  
一台 compute instance 要從 internet 可達，至少要同時滿足幾件事：

- instance 有 public IP
- subnet / route table 真的能通到 Internet Gateway
- security rules 允許對應 ingress / egress
- 你能用正確 private key SSH 進去

這裡最常見的錯覺是：

> 「我看到 public IP 了，應該就能連了吧？」

不一定。

因為 Oracle networking 真正決定生死的，是：
- **VCN / subnet**
- **route table**
- **Internet Gateway**
- **security list 或 NSG**

### 一個我很推薦的起手式

如果你現在是從零開始建 Oracle VM，我反而會建議先用 Oracle 的 **VCN with Internet Connectivity wizard** 做起始版本。  
因為這個 wizard 會幫你先把一部分 public subnet、gateway、route table、security list 的骨架搭起來，對第一版比較不容易漏東漏西。

之後你再慢慢改成你自己的 network layout。

### SSH 先過，再談別的

Oracle 官方的 Linux instance 連線文件也很直接：  
你需要的是正確的 **public IP**、正確的 **使用者名稱**，以及正確的 **private key**。如果你拿的是 `.pub`，那不是登入鑰匙，那只是公鑰。  
這個坑很土，但很常見。

最小檢查清單可以先用這組：

```bash
ssh -i /path/to/private-key ubuntu@<PUBLIC_IP>
```

如果你連 SSH 都還沒通，不要急著去懷疑 FastMCP。  
十之八九是 VM 網路層還沒真的通。

![OCI network checks before you blame FastMCP](./resource/build-your-own-mcp-server-part-2-02-oci-network-checks.svg)

## 第 2 階段：先讓 FastMCP 在內部 port 活著

我非常不建議一開始就直接把 FastMCP 裸奔到公網 port。

比較穩的做法是：

- FastMCP 先只 listen 在內部
- 例如 `127.0.0.1:8000`
- 外面再由 nginx 把 `/mcp` 反代進來

這樣你排錯時比較有層次，也比較容易保證 app 不會直接暴露。

### 在 Ubuntu 上的最小安裝步驟

這是一組很典型的起手式：

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git nginx
```

接著把 repo 拉下來：

```bash
sudo mkdir -p /opt/job-mcp
sudo chown "$USER":"$USER" /opt/job-mcp
cd /opt/job-mcp
git clone https://github.com/huaihsuanbusiness/job-skills-gateway app
cd app
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
```

### 一個夠薄的 FastMCP app

對這類 skill gateway，我現在的偏好很明確：

- server 只暴露高層 skills
- skill files 從 repo 讀
- adapter 去叫 backend execution layer
- 不要把 raw Make flow names 直接暴露給 host

如果你要用 ASGI app 接 nginx / uvicorn，FastMCP 現在的 Python SDK 可以直接建立 streamable HTTP app。  
一個很小的骨架長這樣：

```python
from fastmcp import FastMCP
from fastmcp.server.http import create_streamable_http_app

mcp = FastMCP("Job Skills Gateway")

@mcp.tool
def healthcheck() -> dict:
    """Return basic liveness for deployment checks."""
    return {"ok": True}

app = create_streamable_http_app(
    server=mcp,
    streamable_http_path="/mcp",
)
```

如果你只是要快速本機驗證，也可以直接用 FastMCP 的 HTTP transport 跑起來。  
但對我要的部署形狀來說，**ASGI app + uvicorn + nginx** 比較好控。

### 本機先驗證，不要急著外放

先在機器裡測：

```bash
source /opt/job-mcp/app/.venv/bin/activate
uvicorn mcp_server.app.server:app --host 127.0.0.1 --port 8000
```

再開另一個 shell 測：

```bash
curl -i http://127.0.0.1:8000/mcp
```

這裡我要刻意提醒一個容易把人嚇到的點：

> 在某些 MCP / ASGI 配置下，普通 `curl` 打 `/mcp` 回 406 或其他看起來不友善的狀態，不一定代表 endpoint 壞掉。

因為 MCP 不是一般的 HTML 首頁。  
在我自己的部署裡，`406 Not Acceptable` 反而是個訊號，表示請求真的打到 MCP endpoint 了，只是你不是用對 transport 方式在跟它講話。

## 第 3 階段：把它變成真正會活下去的 service

如果你還在靠一個 terminal 視窗手動跑 uvicorn，那不叫部署完成。  
那叫「剛好現在有跑」。

這一步我建議很務實地交給 `systemd`。

### 參考 service unit

```ini
[Unit]
Description=Job MCP Server
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/job-mcp/app
EnvironmentFile=/opt/job-mcp/app/.env
ExecStart=/opt/job-mcp/app/.venv/bin/uvicorn mcp_server.app.server:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

存成：

```bash
sudo nano /etc/systemd/system/job-mcp.service
```

然後執行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable job-mcp.service
sudo systemctl start job-mcp.service
sudo systemctl status job-mcp.service --no-pager
```

看 log：

```bash
journalctl -u job-mcp.service -n 100 --no-pager
```

到這一步，你才算把「一段 Python 程式」變成「一個長駐服務」。

## 第 4 階段：讓 nginx 對外提供 `/mcp`

FastMCP 在內部跑著，下一步才輪到 nginx。

我現在偏好的 public shape 是：

```text
https://mcp.example.com/mcp
→ nginx :443
→ 127.0.0.1:8000/mcp
```

### 一個可讀的 nginx 參考設定

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    ssl_certificate     /etc/ssl/certs/cloudflare-origin.crt;
    ssl_certificate_key /etc/ssl/private/cloudflare-origin.key;

    location /mcp {
        proxy_pass http://127.0.0.1:8000/mcp;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

如果你也要做 HTTP → HTTPS redirect，可以再加一個 `listen 80` 的 server block。

測設定：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Cloudflare 在這裡到底在做什麼

很多人把 Cloudflare 想成「綁網域的地方」。  
這樣講不算錯，但不夠工程。

在這個部署裡，Cloudflare 至少做了兩件重要的事：

1. **DNS**
   - 把 `mcp.example.com` 指到你的 Oracle VM

2. **Proxy / edge-facing HTTPS**
   - 當你把 DNS record 設成 proxied（橘雲）時，HTTP/HTTPS 流量會先進 Cloudflare，再到 origin

這件事有一個很實際的含義：

> 你的 Oracle origin 不再直接面對所有訪客流量，它看到的是來自 Cloudflare 的流量。

這也是為什麼 Cloudflare 官方一直在講：
- proxied records
- origin certificates
- authenticated origin pulls
- edge 與 origin 的 TLS 關係

### Cloudflare Origin CA 真的很好用

如果你的流量是經過 Cloudflare 代理，再進你的 Oracle VM，那一個很實用的做法，就是在 origin 端用 **Cloudflare Origin CA** 憑證。

好處是：

- 很適合 Cloudflare ↔ origin 這段
- 不用一開始就去折騰公開 CA
- 配合 `Full (strict)` 模式比較順

但也要記得：  
如果你把 SSL mode 拉到 `Full` 或 `Full (strict)`，origin 端就真的要能處理 443 HTTPS。否則你很容易看到 525 之類的 handshake 錯誤。

![nginx, Cloudflare, and FastMCP request path](./resource/build-your-own-mcp-server-part-2-03-nginx-fastmcp-path.svg)

## 接進 ChatGPT 之前，先做 smoke tests

到這裡，先別急著打開 ChatGPT。

我會先要求自己把幾個最小驗證做完：

### Smoke test 1：機器內部 app 存活
```bash
curl -i http://127.0.0.1:8000/mcp
```

### Smoke test 2：nginx 反代正常
```bash
curl -ik https://mcp.example.com/mcp
```

### Smoke test 3：service 能重啟
```bash
sudo systemctl restart job-mcp.service
sudo systemctl status job-mcp.service --no-pager
```

### Smoke test 4：機器重開後 service 還在
```bash
sudo reboot
```

重連後：

```bash
systemctl status job-mcp.service --no-pager
systemctl status nginx --no-pager
```

如果這幾關都還沒過，就先不要把錯怪到 ChatGPT 或 Developer Mode 上。

## 最後才是 ChatGPT Developer Mode

OpenAI 現在的 Developer Mode 文件已經明講，remote MCP app / connector 的建立流程，是在 ChatGPT Apps 設定裡建立 app，然後填你自己的 remote MCP server。官方也明確列出：

- 支援的協定：**SSE 與 streaming HTTP**
- 驗證方式：**OAuth、No Authentication、Mixed Authentication**

所以如果你現在是第一版、內網已經有其他保護，而且 server 沒做 OAuth，你可以先選 **No Authentication** 做開發驗證。  
但這只是第一版策略，不是長期安全策略。

### 連線前，我會先確認這三件事

1. `/mcp` 是真的 public HTTPS，可從外部到達  
2. host 看到的是 skill-level tools，不是 raw backend tools  
3. 錯誤至少能用 logs 看出是：
   - DNS / TLS / proxy 問題
   - app 問題
   - backend adapter 問題

## 這一路最值得記下來的幾個坑

我把這篇最值得寫進 blog 的坑，收成四個：

### 坑 1：你以為是 FastMCP 壞掉，其實是 Oracle 網路根本沒通
這是最常見的錯覺。  
public IP 有了，不代表 subnet route、IGW、security list、NSG 都對。

### 坑 2：你以為程式有跑，就等於服務可用
不對。  
有跑的 Python process，不等於可維運服務。  
systemd、restart policy、logs，這些不是加分題，是基本盤。

### 坑 3：你以為 nginx 通了，TLS 就一定沒問題
不對。  
Cloudflare、origin cert、Full / Full (strict)、443 ingress、redirect loop，這些任一個不對，你都可能卡在 525 或奇怪的連線失敗。

### 坑 4：你以為 ChatGPT 連不上，一定是 ChatGPT 的問題
通常不是。  
更多時候，問題在：
- endpoint 不夠公開
- proxy path 沒對齊
- transport 或 auth 設定不一致
- server tool surface 不乾淨

## 我現在會怎麼看這一題

如果一定要把這篇再濃縮成一句工程判準，那就是：

> **部署 remote MCP server 時，真正的工作量不在 tool decorator，而在把網路層、程序層、與 capability surface 一起做對。**

FastMCP 當然重要。  
但在 Oracle VM 這種 self-hosted 場景裡，它只是整條鏈中的一層。  
真正讓系統變穩的，是你有沒有把這幾件事分清楚：

- 哪一層對外
- 哪一層只聽內部 port
- 哪一層負責 TLS
- 哪一層負責 skill exposure
- 哪一層負責 backend execution

## 下一篇會開始談框架比較

做到這裡，很多人下一個問題通常是：

> 那為什麼你最後選 FastMCP，而不是別的 MCP framework？

這就會是 Part 3 要談的主題。  
我會把比較重點放在：

- framework 重不重
- transport / auth / deployment 夠不夠成熟
- 你是在做 demo server，還是在做會長大的 public server
- 你到底要的是「快做完」，還是「之後不會痛」

![A practical rollout checklist for a public MCP server](./resource/build-your-own-mcp-server-part-2-04-rollout-checklist.svg)
