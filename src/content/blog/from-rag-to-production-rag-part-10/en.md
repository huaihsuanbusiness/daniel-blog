---
title: "From RAG to Enterprise RAG Part 10 | Deploying My RAG: 10 Pits I Fell Into"
description: "Going from a local prototype to a public API isn't the final step—it's another exam. This article walks through 11 real deployment pitfalls (Oracle VM capacity, Docker env shadowing, Compose healthcheck cascading failures, Nginx + Cloudflare HTTPS trust chain, Qdrant payload index bootstrap, etc.) across four infrastructure layers, with prevention frameworks for each. Personal architecture choices (Oracle VM / Qdrant Cloud / Cloudflare / Docker Compose) explicitly marked as 'my choices, not general advice'."
categories: ["ai"]
tags: ["ai", "rag", "production-rag", "deployment", "oracle-cloud", "docker", "nginx", "cloudflare", "qdrant", "smoke-test", "infrastructure"]
date: 2026-06-12T12:00:00
featured: true
subtitle: "From RAG to Enterprise RAG Part 10"
series: "From RAG to Enterprise RAG"
seriesOrder: 10
---

## Story: The API Is Alive, But It Stopped Responding

One afternoon, the RAG API's health check was still returning 200, but `/ask` started throwing 502s across the board.

No code change. No docker-compose change. No Nginx change. No Qdrant config change.

It was fine an hour ago.

I stared at that 502 for a long time. Eventually I figured out: this wasn't one bug—it was the 4 stack layers (environment, container, network, integration), each in a perfectly reasonable way, deciding to break on the same day.

Part 09 walked through the 7 stations of the document side (parsing → raw storage → Postgres metadata → ingestion queue → auth/permission → document APIs → citation viewer). Part 08 wrapped 4 capabilities into 5 query modes; the routing looked strict.

But on the deployment side, **the distance between "running" and "production-ready" was much larger than I expected**.

This Part walks through 11 real pits, distributed across 4 stack layers:

- **Environment layer** (2): VM capacity, deploy key
- **Container layer** (3): env not reaching the container, Compose healthcheck cascading failures, build context bloat
- **Network layer** (3): Oracle Ingress, Nginx reverse proxy, Cloudflare HTTPS trust chain
- **Integration layer** (2): Qdrant payload index, production-style smoke test

Every pit was real. Every prevention framework was bought with time and error.

One note up front: 2 of these 10 pits (Pit 4, Pit 5) come from my real L34 patch series. The "4-2" / "4-3" / "L27394-L27576" references are my dev-note section numbers and line ranges—you don't need to look them up; they're just provenance markers. The important part: **a poorly written Compose healthcheck can drag down the entire stack**, and no article warned me about this before I hit it myself.

---

## First Line: Environment Layer

### Pit 1: Oracle VM Can't Grab an Always Free Instance

Oracle Cloud's Always Free plan offers up to 4 OCPUs and 24 GB RAM on ARM Ampere A1 shapes (you allocate 1/2/3/4 OCPUs + matching RAM yourself—not a fixed 4+24). Sounds like plenty for a small RAG API.

First reality check: **you often can't get one**.

Popular regions (us-ashburn-1, us-phoenix-1) return a very quiet error:

```json
{ "code": "InternalError", "message": "Out of host capacity." }
```

You didn't do anything wrong. This is Oracle's resource scheduling for Always Free quotas—paid users get priority in high-demand regions.

> **Scenario source:** 4-2 part7 + 4-3 L19845-L21687. Daniel cycled through multiple regions, waited, retried, and eventually secured a usable node.

**Prevention framework:**

- Don't just take the default region—check current load before you start
- Evaluate non-popular regions (ap-seoul-1, ap-tokyo-1) for latency to your actual users
- Rehearse the "grab a new instance" flow once before you need it—the moment you need it is never a calm moment

> **Personal choice (not general advice):** For personal projects or small prototypes, Oracle Always Free's specs and zero cost are reasonable. But if you need 99.9% SLA, or your team can't absorb resource volatility, this isn't the right VM for you.

---

### Pit 2: GitHub Private Repo + Deploy Key Misconfiguration

The most frequent auth failure from localhost to VM: wrong deploy key format, missing SSH config line, git clone keeps asking for a password.

**Where deploy keys commonly break:**

- Deploy key added to personal SSH keys instead of the repo's Deploy keys list
- Wrong key format (ED25519 vs RSA—fingerprint comparison fails because of format mismatch)
- `.env` not in the repo, so the cloned repo on VM has no `.env`—production env didn't travel with the code

> **Source materials:** 4-2 part9 / part10. Any single step in the SSH handshake going wrong causes clone to fail.

**Prevention framework:**

- Use `ed25519` for deploy keys (shorter key length than RSA, faster signing, currently the cryptographic community's recommendation)
- Never put `.env` in Git—make a `.env.example` as the template, manage VM env separately (encrypted `scp` transfer, or Docker secret/env-file)
- After first clone, verify `.env` exists before running `docker-compose up`

---

## Second Line: Container Layer

### Pit 3: env Variables Don't Reach the Container (Shadowing / Build-time vs Runtime)

The single most common Docker + FastAPI deployment failure: **API key works locally, gets 403 in production**.

**Technical background (verified):**

- `ARG` is only usable during `docker build`; it's not available once the image is packaged and the container starts
- `ENV` survives both build and runtime in the container
- `docker-compose.yml`'s `environment:` block is runtime injection, not written into the image
- `.env` file auto-interpolates on `docker-compose up`, but if you use `--env-file` specifying a path, that path is relative to the **execution directory**, not the compose file location

> **Source materials:** 4-2 part11 + 4-3 L27394-L27576. Port 8000 conflict and env not being delivered happened the same night.

**Prevention framework:**

Any API key, secret, production parameter must satisfy all three simultaneously:

1. Present in the `.env` file
2. Declared in `docker-compose.yml`'s `environment:` block (or via `env_file:`)
3. Has a corresponding field in FastAPI's `Settings` class (`QDRANT_URL`, `SUPABASE_URL`, etc.)

After first deploy, run inside VM:

```bash
docker exec <container> env | grep QDRANT
```

Verify the key actually made it in.

> Side note: `python-dotenv`'s `.env` doesn't read `export` prefixes by default. Format should be `KEY=*** (not `export KEY=***`.

---

### Pit 4: Compose Healthcheck Dragging Down the Entire Stack

This is the most under-appreciated pit in the whole series.

One day Qdrant clearly had logs saying it started:

```text
Qdrant HTTP listening on 6333
```

But the entire docker-compose stack didn't come up, and api/worker never started. The error looked like this:

```text
Container llamaindex-demo-qdrant Error
dependency qdrant failed to start
dependency failed to start: container llamaindex-demo-qdrant is unhealthy
```

Was Qdrant dead? No. It was alive. The problem was that the L34 healthcheck used `curl` inside the container:

```yaml
healthcheck:
  test: ["CMD", "curl", "-fsS", "http://127.0.0.1:6333/healthz"]
```

And Qdrant's image doesn't have `curl/wget`. **Service is alive, healthcheck tool doesn't exist**, Compose declares it dead, and `depends_on: service_healthy` blocks all downstream services.

Docker official docs confirm: `curl` is not present in minimal images (Alpine, scratch) by default—you need to switch to `wget`, install `curl`, or use `CMD-SHELL` with `cat` / `grep` for healthcheck.

> **Scenario source:** 4-3 L18332-L19862. The L34 → L34B → L34G → L34I patch series was about getting this cleaned up.

**Prevention framework:**

- Healthcheck can't rely on `curl` OR `wget` being in the container—minimal images (Alpine busybox) only have `wget` by default, and scratch images may not have either; the safest approach is to write a tiny Python / shell healthcheck script
- Don't blindly use `depends_on: service_healthy`—if the health definition itself has a bug, it'll **cascade-block all downstream services**
- Decouple healthcheck from "service is up": service started ≠ healthcheck passed ≠ downstream can start working

Here's how I handled it in the L34B patch:

```yaml
services:
  qdrant:
    # No more internal curl
    healthcheck:
      test: ["CMD-SHELL", "ss -ltn | grep -q ':6333' || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s

  api:
    depends_on:
      qdrant:
        condition: service_started   # service_started, not service_healthy
```

Or move health verification to the host side using curl smoke tests, and skip container-internal healthcheck entirely.

---

### Pit 5: 4.31 GB Build Context—Moving the Whole Repo into Docker

Another real record from the L34 series: the first `docker compose up --build` printed this in the build log:

```text
transferring context: 4.31GB
```

Took 335 seconds. **That was moving the entire repository, foundation and all, into Docker.**

The `Dockerfile` was fine, the image built successfully. But `.dockerignore` was never written, so:

- `.venv` (Python virtual environment, several GB) shipped in
- `storage` / `data` folders (test PDFs, intermediate JSON) shipped in
- `models` (Hugging Face cache) shipped in
- `__pycache__` shipped in
- `.git` shipped in

Every `docker build` did a meaningless full transfer.

> **Scenario source:** 4-3 L17200-L17420. The L34G patch was mainly about `.dockerignore` and build context.

**Prevention framework:**

```text
# Minimal .dockerignore
.venv
storage
data
models
__pycache__
.git
.env
*.log
*.pyc
.DS_Store
```

`.dockerignore` deserves the same care as `.gitignore`. It should be in the first commit.

---

## Third Line: Network Layer

### Pit 6: Oracle Ingress Rules—which Ports to Open, Which to Keep Closed

Oracle Cloud's VCN (Virtual Cloud Network) has a Security List layer—this is a **subnet-level firewall** (not instance-level; instance-level is NSG / Network Security Group). **Even if the VM's internal UFW is correctly configured, external traffic won't reach the VM if Oracle Cloud's Security List doesn't have the right ports open.**

Think of the Oracle VM as a building:

```text
Internet → Oracle Cloud outer wall (Security List) → VM's own firewall (UFW) → Nginx → FastAPI container
```

An Ingress Rule is "who is allowed to come in through which door."

**Common port tradeoffs:**

- **22 (SSH)**: for logging into the VM from your Mac. Source CIDR can be restricted to "your IP/32" (but if your IP changes frequently, start with `0.0.0.0/0` to avoid locking yourself out)
- **80 (HTTP)**: for external `http://<public-ip>/health`—browsers use port 80 by default when no port is specified
- **443 (HTTPS)**: for when you have a domain, external traffic goes `https://api.yourdomain.com`

**Ports that should never be open to the public internet:**

- **8000**: occupied by the VM's MCP server at `127.0.0.1:8000`; no need to expose
- **18000**: the internal port mapped for the FastAPI container, used by Nginx inside the VM only; external traffic should only hit 80/443
- **6333 / 6334**: Qdrant's REST/gRPC ports; this project uses Qdrant Cloud (not self-hosted Qdrant), so these ports don't need to be open on the VM at all

> **Scenario source:** 4-3 L27944-L28400. Daniel hit "VM internal Nginx responded but public IP didn't"—root cause was Oracle Cloud Security List didn't have port 80 open.

**Prevention framework:**

- In Oracle Cloud Console: VCN → Security Lists → Add Ingress Rule, verify destination port 80 is open
- Test in stages: first inside VM `curl 127.0.0.1/health`, then from Mac `curl http://<public-ip>/health`
- If VM internal works but public IP doesn't, the problem is in Oracle Security List, not Nginx

---

### Pit 7: Nginx Reverse Proxy and the Cloudflare HTTPS Trust Chain

External traffic hits your VM through an Nginx reverse proxy before reaching the FastAPI container. Nginx itself needs HTTPS configured, but there are **two layers of HTTPS** here that need separate handling: Cloudflare ↔ external user (Full strict), and Cloudflare ↔ Oracle VM (Origin Certificate).

> **Scenario source:** 4-3 L30495-L31200 + 4-2 part18. Daniel encountered "origin certificate didn't match the private key" and "SSL mode wasn't Full strict" during Cloudflare Origin Certificate setup.

**The two-layer HTTPS architecture:**

```text
External user → HTTPS → Cloudflare (validates your domain certificate)
Cloudflare  → HTTPS → Oracle VM (validates Cloudflare Origin Certificate)
```

**Cloudflare Origin Certificate setup steps:**

1. In Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
2. Hostname: `api.yourdomain.com` (not a wildcard—reduces scope)
3. Choose RSA 2048 (compatible with Nginx defaults). **This certificate is valid for 15 years by default** (not 15 days)—the biggest difference from a regular LE cert
4. Transfer the generated PEM + KEY files to VM at `/etc/ssl/cloudflare/` using `scp`
5. Reference these files in Nginx config
6. Cloudflare SSL/TLS mode: **Full (strict)**

**What not to do:**

- Don't transfer the origin certificate's private key over plaintext channels—`scp` / `sftp` go over SSH (encrypted), so transferring the PEM file itself is fine; but email, plaintext chat, or pasting into an issue tracker are all wrong
- Don't set SSL mode to Flexible—it makes the Cloudflare→origin leg HTTP, exposing you to middlebox interception

**Prevention framework:**

- After setup, test from outside with `curl -v https://api.yourdomain.com/health`—verify the certificate chain is complete and trusted
- On VM, test `curl -v https://localhost/health` (using the origin cert directly against the VM)—verify Nginx correctly reads the PEM/KEY files

---

### Pit 8: Cloudflare Origin Certificate Didn't Match the Source

This is a sub-problem of the previous pit but deserves its own section, because it's the most common single cause of HTTPS setup failure:

- The origin certificate was created, the files were transferred, but the Nginx config pointed to the wrong PEM/KEY files
- Or the Cloudflare SSL/TLS mode wasn't changed to Full strict, causing traffic to stall in Flexible mode

> **Source materials:** 4-3 L31004-L31189. The troubleshooting process for "Cloudflare is Full strict but origin HTTPS doesn't connect" was mainly about these two errors.

**Prevention framework:**

- Store certificate and key in `/etc/ssl/cloudflare/`—don't mix with other certs (NGINX has many places to store certs, easy to get confused)
- On Oracle VM, verify:
  ```bash
  sudo nginx -t                              # Nginx config syntax check
  openssl x509 -in /etc/ssl/cloudflare/api.yourdomain.com.pem -text -noout   # cert not empty
  openssl pkey -in /etc/ssl/cloudflare/api.yourdomain.com.key -check       # key format correct (works for both RSA / ED25519)
  ```
- After setup, run an online SSL check (e.g., ssllabs.com's test) from outside to verify the chain is trusted

---

## Fourth Line: Integration Layer

### Pit 9: Qdrant Cloud Connection and Payload Index Bootstrap

Qdrant Cloud is a managed service—you don't maintain the vector DB yourself—but that doesn't mean there are no pitfalls. API key transmission, runtime env configuration, and Qdrant Cloud collection state all require active confirmation.

**Common Qdrant Cloud issues:**

1. **API key transmission failure**: Qdrant Cloud API keys are in `eyJ...` JWT format; if `.env` has extra spaces or trailing newlines, the Python client treats it as malformed and skips it
2. **Collection doesn't exist**: on first deploy, Qdrant Cloud collection is empty; `/ask` returns `index_ready: false` (not 500—it's a graceful error response)
3. **Runtime env shadowing**: if another service on the VM also uses `QDRANT_API_KEY` as an env variable name, docker-compose env gets overridden

> **Source materials:** 4-2 part8 / part9. Complete troubleshooting process for Qdrant Cloud connection and API key issues.

**Payload index isn't just a performance issue—it's an ACL issue.**

Qdrant Cloud's payload index isn't just about "faster search"—**it also supports ACL filtering**. Each chunk's payload has `tenant_id` + `document_id`; at query time, filter by these two fields to ensure user A can't see user B's documents.

If the payload index wasn't bootstrapped, the filter fails—and that's one of the root causes behind the "Q3 contract had another company's content" scenario from Part 09.

> Qdrant's official docs confirm: the payload index is a secondary data structure; vector search with a filter consults it; without an index, the filter degrades or fails. `create_payload_index` must be done on `tenant_id`, `document_id` and other high-cardinality fields.

**Prevention framework:**

- Verify the API key in `.env` has a clean format (`QDRANT_API_KEY=*** with no trailing blank lines)
- After first deploy, test from VM:
  ```bash
  docker exec <container> python -c "from qdrant_client import QdrantClient; c = QdrantClient(url='https://xxx.qdrant.tech', api_key=*** print(c.get_collections())"
  ```
- Verify collection exists and payload index has been bootstrapped—if not, trigger manually in Qdrant Cloud Dashboard or run the corresponding init script

---

### Pit 10: Ingestion Smoke Test—Verifying `/health` Alone Isn't Enough

The most important thing after deployment isn't "API is alive"—it's "RAG data path is alive." **A deployment without a smoke test is an unverified deployment.**

**What smoke test must confirm (not just `/health`):**

1. `/health` → 200 OK (Nginx, container, FastAPI all alive)
2. `/query-profiles` → returns profiles (API endpoint working)
3. Post a test query to `/ask` → gets an answer (Qdrant Cloud has data, payload index bootstrapped)
4. Citations are present (`citations` array non-empty)

> **Source materials:** 4-2 part14 / part15 / part16. Complete ingestion smoke test script and payload index bootstrap process.

**Prevention framework:**

Write smoke test as a script, run it as the last step in the deploy pipeline:

```bash
BASE_URL="https://api.yourdomain.com"
TOKEN=$(python get_access_token.py)

echo "1. health check"
curl -s "$BASE_URL/health" | jq '.status == "ok"' || exit 1

echo "2. query-profiles check"
curl -s "$BASE_URL/query-profiles" | jq '.supported_modes' || exit 1

echo "3. smoke document ingestion"
# ... ingest a known smoke document ...

echo "4. smoke query with citation"
curl -s -X POST "$BASE_URL/ask" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question": "What is the unique marker of the smoke document?", "query_mode": "safe"}' \
  | jq '.citations | length > 0' || exit 1
```

Smoke test isn't just "got an answer"—it must confirm citations are present; having an answer doesn't mean the RAG data path is complete.

---

## These Are My Choices, Not General Advice

These 4 choices aren't "how to do it" tutorials—they're "why I chose this" disclosures. If your conditions differ (budget, team size, data compliance, expected traffic), the conclusions may flip entirely.

**Oracle VM (not AWS / GCP / Azure)**
I chose Oracle Cloud Always Free not because it's the most stable, but because it's free and the specs are sufficient for a small RAG API. The downside: unstable availability in popular regions, no SLA, complex documentation. If your project needs 99.9% uptime or your team needs better migration paths, this isn't the first choice.

**Qdrant Cloud (not self-hosted Qdrant / Pinecone / Weaviate)**
I chose Qdrant Cloud because I didn't want to maintain a vector DB myself (backup, upgrade, monitoring all cost something). The downside: your data is with a third party, network latency is higher than local, costs scale with usage. If your data privacy requirements are extreme or your vector search volume is massive, self-hosting may be more appropriate.

**Cloudflare (not direct VM IP exposure / not Certbot/Let's Encrypt)**
I chose Cloudflare because I was already using it to manage my domain, and Origin Certificate setup is simpler than Certbot (no DNS challenge handling, no certificate renewal worry). The downside: you're tying your entire DNS lifecycle to Cloudflare—if Cloudflare has an outage, your API goes down with it.

**Docker Compose + L34 patches (not k8s)**
For this project's scale, k8s is over-engineering. Compose + one VM is the sweet spot for a single RAG API. The downside: horizontal scaling has to be done manually, but this project isn't at that scale yet.

---