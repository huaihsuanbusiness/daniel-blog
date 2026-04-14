---
title: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰系列 Appendix B｜命令、警告與踩坑速查"
description: ""
categories: ["ai"]
tags: []
date: 2026-04-12T05:00:00
series: "本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰"
seriesOrder: 11
---
這份附錄不是教學文，也不是把主線再縮一次。  
它比較像一套現場用的速查卡。

如果 Appendix A 是名詞索引，  
那這份 Appendix B 比較像：

- 卡住時先看哪裡
- 這個錯到底是哪一層的問題
- 哪些 warning 可以先記著，哪些真的要停下來處理
- 哪一組命令最不容易踩爆自己

目標不是漂亮，  
目標是你下次真的卡住時，能比上次早十分鐘醒悟。

---

## 一、最小可跑路徑命令集合

### 1. 進入專案與虛擬環境
```bash
cd ~/llama31-lora-lab
source .venv/bin/activate
```

### 2. 確認關鍵套件能 import
```bash
python -c "import torch; import transformers; import peft; import trl; print('ok')"
```

### 3. 最小訓練入口
```bash
python train_lora.py
```

### 4. 最小 DPO 入口
```bash
python train_dpo.py
```

### 5. 最小 compare 入口
```bash
python compare_lora.py
python compare_dpo.py
```

### 6. 回到 Ollama 的常見路徑
```bash
python merge_lora.py
ollama create my-model -f ./Modelfile
ollama run my-model
```

---

## 二、錯誤與警告的四層判讀法

這整條路最有用的一套判讀，不是背所有錯誤訊息。  
而是先分層。

### 類型 A：環境層問題
典型現象：
- `ModuleNotFoundError`
- 在 `~` 而不是專案資料夾執行
- 沒有進 `.venv`

最常見修法：
```bash
cd ~/llama31-lora-lab
source .venv/bin/activate
```

### 類型 B：文字 / shell / Python 語法層問題
典型現象：
- `SyntaxError`
- `kimport torch`
- shell heredoc 殘留在 `.py` 裡
- 把 Python 程式碼直接貼進 zsh

最常見修法：
- 先 `head -20 檔名.py`
- 確認第一行是不是正常 Python
- 不確定就整份重貼，不要只修半行

### 類型 C：API / 版本相容層問題
典型現象：
- `TypeError: unexpected keyword argument ...`
- trainer 參數不吃
- TRL / PEFT / Transformers 文件跟你本機行為不一致

最常見修法：
```bash
python -c "import trl; print(trl.__version__)"
python - <<'PY'
from trl import DPOConfig
import inspect
print(inspect.signature(DPOConfig.__init__))
PY
```

### 類型 D：資源層問題
典型現象：
- OOM
- MPS allocated / max allowed
- optimizer.step 爆掉
- generate 看起來像卡死但其實是超慢

最常見修法方向：
- 縮短 `max_length`
- 減少 trainable scope
- 改成 LoRA 而不是 partial FT
- 縮短 compare 樣本
- 先用 forward-only smoke test

---

## 三、最常見 warning 速查

### `torch_dtype` is deprecated! Use `dtype` instead!
意思：
- 舊參數名還能跑
- 但 API 之後會往 `dtype` 走

判讀：
- **不是致命錯誤**
- 可記錄、之後再修

---

### `temperature` / `top_p` may be ignored
常見原因：
- `do_sample=False`

意思：
- 你現在不是 sampling generation
- 所以 sampling 參數不生效

判讀：
- **不是致命錯誤**
- 只是設定互相矛盾

---

### `pin_memory` not supported on MPS
意思：
- 這個參數在你現在的 MPS 場景不會發揮作用

判讀：
- **不是致命錯誤**
- 如果很煩，就把 `dataloader_pin_memory=False`

---

### tokenizer mismatch / prompt mismatch 類警告
常見在 DPO 或 chat template 處理中出現。

意思：
- prompt 單獨 tokenize 的結果
- 和 `prompt + answer` tokenize 的前綴對不上

判讀：
- smoke test 階段不一定致命
- 正式資料集一定要修

修法方向：
- 清理空白
- 統一 `chosen/rejected` 前綴
- 不要一份資料有 `答：`，另一份沒有

---

## 四、常見卡住場景與第一反應

### 場景 1：模型載很久
先檢查：
- 權限是不是還在 pending
- 路徑是不是對
- Hugging Face login / access 有沒有通過

---

### 場景 2：`python compare_dpo.py` 卡在 `Generating...`
第一反應不要直接認定壞掉。  
先想：

- 8B
- MPS
- adapter
- `generate()` 本來就很重

第一步修法：
- 先改成 forward-only
- 再改成短回答
- 再改成 chosen/rejected margin compare

---

### 場景 3：卡在 `optimizer.step()`
先懷疑：
- optimizer states 太重
- trainable scope 太大
- partial FT 已經超出這台機器的承受範圍

---

### 場景 4：`ollama create` 說找不到 Modelfile 或 safetensors
先檢查：
- 當前目錄
- `-f` 路徑
- Modelfile 內容格式
- `FROM` 指向的是完整模型還是你以為它能吃的 adapter 路徑

---

## 五、最常見踩坑紀錄與對應動作

### 踩坑 1：把 shell 指令殘留進 Python 檔
現象：
- `cat > file.py <<'EOF'` 直接被存進 `.py`

修法：
- 整份重建
- 不要一行一行修

---

### 踩坑 2：在家目錄執行，而不是專案目錄
現象：
- 套件找不到
- 檔案不在同一層
- 明明之前裝過東西，現在都不見

修法：
```bash
cd ~/llama31-lora-lab
source .venv/bin/activate
```

---

### 踩坑 3：以為 generate 卡住就是壞掉
修法：
- 先做 forward-only smoke test
- 再做更短的 generate
- 不行就直接用 margin compare

---

### 踩坑 4：以為量化能救品質
修法：
- 先分清楚速度病還是品質病
- 量化主要解的是慢，不是笨

---

### 踩坑 5：以為 loss 漂亮就代表模型值得留
修法：
- 一定做 compare
- 一定做 prompt 對照
- 一定做實際使用驗收

---

## 六、最穩的排錯順序

如果你下次又卡住，我建議順序照這樣走：

### 第一步：先判斷是環境、語法、API 還是資源層
不要一上來就亂改參數。

### 第二步：做最小 smoke test
- 能不能 import
- 能不能載模型
- 能不能 forward
- 能不能最短 generate

### 第三步：再看是不是訓練 recipe 問題
例如：
- target_modules 太大
- max_length 太長
- partial FT 太重

### 第四步：最後才考慮動量化、Modelfile 或部署層
不要把訓練問題誤判成部署問題，也不要反過來。

---

## 七、最值得記住的排坑原則

- 不要把每個紅字都當作同等級危機。
- 卡住不一定是壞掉，很多時候只是太重。
- 流程成功不等於模型成功。
- 量化不是品質修復器。
- 主力版本不是最炫的版本，是最穩的版本。

#