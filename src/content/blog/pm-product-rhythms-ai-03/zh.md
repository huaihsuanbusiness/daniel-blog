---
title: "AI 時代的產品節奏 Part 03｜我現在不太問要不要跑 Scrum，我比較常問哪個儀式還真的有用"
description: ""
categories: ["pm"]
tags: []
date: 2026-04-15T05:02:00
series: "AI 時代的產品節奏"
seriesOrder: 3
---

我以前對 daily standup 最反感的時候，真的覺得它很像一種輕量版打卡。

大家輪流講昨天做了什麼、今天要做什麼、卡在哪裡。講的人知道自己在報流水帳，聽的人也知道自己沒有真的在聽，只是這個動作已經變成某種背景音。那種 standup 現在回頭看，最尷尬的地方不是它浪費十分鐘，而是它把「同步」誤裝成了「協作」。

後來我也看過另一種 standup。很短。短到有時候不像會議。可是真的會把 blocker 撞出來，真的會有人在那十分鐘裡決定先停什麼、先解什麼，甚至順手把某個原本要拖兩天的誤會當場拆掉。那時我才慢慢分清楚，我討厭的不是 standup 這件事，我討厭的是只剩形式、沒有用途的 standup。

所以現在如果有人問我，AI 來了之後 Scrum 那些 ceremonies 還值不值得留，我反而不太想先回答 yes or no。這種題目一開口就容易變成信仰戰。有人會很快站到「會議都該砍」那邊。也有人會下意識護著原本的節奏，覺得不能亂動。可是真正有用的問題沒有那麼戲劇化。

我現在比較常先問：這個儀式現在到底在幫我們做什麼。

如果它主要在處理資訊同步，那 AI 很可能已經吃掉它一大塊成本了。如果它在處理決策協調，那形式可能可以變，但功能不能消失。如果它在處理品質和風險，那我反而會比以前更不想輕易拿掉。

我現在大概會把常見的 Scrum ceremonies 粗粗分成三類。

第一類是資訊同步型。像是大家知道現在需求長怎樣、故事拆到哪裡、哪些票卡著、哪些資訊還沒補齊。以前這一層很多事情真的只能靠人手整理。現在 AI 先把會議摘要、story draft、acceptance criteria 草稿、測試案例草稿都打好之後，這類 ceremony 最容易開始變重。不是它突然沒價值了，而是它原本靠人類時間在撐的那一塊，現在沒那麼稀缺了。

第二類是決策協調型。像 planning、scope trade-off、風險對齊。這一類的價值本來就不是把資訊重講一遍，而是要在有限時間內，清楚這一輪到底承諾什麼、不承諾什麼。AI 可以幫你把資訊前置整理好，但它不會替你決定這一刀該先切哪裡。這也是我現在越來越不喜歡那種大型、鈍重、像在人工搬運資訊的 planning。不是 planning 該死，是那種 planning 已經老了。

第三類是品質與風險控制型。像 review、retro、Definition of Done。這一類我反而覺得在 AI 時代更重要。因為生成成本下降之後，真正變便宜的是「做出來」。沒有一起變便宜的，是「做對」和「驗清楚」。Scrum.org 在 2026 講得很直白，AI is rewiring Scrum Teams, but not Scrum。它們要守住的其實就是這條線：team 的工作方式會變，但 empiricism 這種骨架沒有失效。citeturn189000search3

所以我現在不太相信「少開會」這種口號。

坦白說，這種話有點便宜。比較麻煩的從來不是會議多不多，而是你到底有沒有把協作設計對。有些會議該死，是因為它們只剩儀式感。有些會議還該留，是因為它們其實在替決策品質和風險控制付保費。

Planning 就是很典型的例子。

我不覺得 planning 應該被一刀砍。真正該被砍的，是那種把 planning 做成大型資料輸入作業的版本。Planning 的本質本來就不是把 backlog 排滿，也不是讓每個人都有事做。它更像是在說，這一輪到底想解哪個問題，哪些風險先扛，哪些範圍先不扛。AI 之後，planning 理論上應該更短，但也更硬。少一點資訊搬運，多一點承諾和 trade-off。

Refinement 更是這篇最值得講的地方。

我以前不太會特別討厭 refinement，因為它本來就是團隊一起把模糊需求拉到可做、可測、可驗收的地方。問題是，很多團隊後來把 refinement 跑成大型手工整理現場。大家花很多時間把故事打乾淨、把 AC 補完整、把 ticket 排整齊。以前這樣做還算有道理，因為那些內容本來就得有人生出來。現在 AI 可以先把第一版吐出來之後，refinement 最值錢的部分反而變了。它不該再花那麼多力氣在「把內容做出來」，而是要把力氣花在「把邊界說清楚」。哪一刀先切，哪個假設先驗，done 的標準是什麼，哪裡有依賴，哪裡有風險。Thoughtworks 今年把 spec-driven development 拉出來談，我其實很能理解那個味道。不是回去崇拜厚規格，而是當 AI 對上下文、規格和約束更敏感時，真正值錢的不是文件更多，而是邊界更準。citeturn189000search2

Daily standup 也是一樣。

如果 daily 還只是輪流唸昨天做了什麼，那它現在只會更尷尬。因為如果只是狀態更新，AI 整理得比人快，也比人一致。人還坐在那裡，不應該只是複誦機器也會說的東西。Daily 留下來的理由，應該是 unblock，是把原本會拖三天的問題當場撞出來，是讓風險提早浮上來。不是讓 Jira 看起來有被照顧。

Review、retro 和 DoD 則是我現在更不想輕易拿掉的部分。

理由其實很簡單。當生成成本下降、速度上來之後，驗收和回顧就更像煞車系統。DORA 2025 把 AI 形容成 amplifier，其實對這裡也很有解釋力。高表現團隊會被放大，低品質協作、糟糕資料環境、模糊驗收，也一樣會被放大。AI 不會自動把壞流程變好，它只會讓壞流程跑得更快。citeturn189000search0turn189000search4turn189000search12

我用一個最普通的 workload 來看這件事，會更清楚。

假設今天是註冊流程優化。以前你可能先開一場很長的 refinement，把 user story、acceptance criteria、邊界條件、錯誤訊息、追蹤事件一個個手工補出來。現在更合理的做法很可能是：AI 先把初稿生出來，產品、設計、工程在 refinement 裡看的不再是「有沒有內容」，而是「內容的邊界對不對」、「這一輪只想解哪個漏點」、「done 要長什麼樣」。Planning 也不用再花很多時間把資訊重新走過一遍。Daily 不是為了複誦進度，而是為了拆 blocker。Review 要看的不是做了多少，而是註冊漏斗有沒有真的被改動。Retro 則要回來看，這次的拆法是不是讓問題提早顯形，還是只是更快地把模糊東西往下丟。

這裡當然也有反例。

如果你帶的是高合規、大型跨部門、對稽核和可追溯要求很高的組織，很多你現在很想縮掉的 ceremonies，本來就不是為了效率，而是為了治理。再來，如果團隊成熟度不高，太早把 ceremonies 拿掉，最後通常不是更 agile，而是更混亂。Atlassian 2025 的資料其實也有一個很接近的提醒：AI adoption 上升，但 friction persists。很多省下來的時間，最後還是會被組織低效、資訊找不到、決策對不齊吃回去。citeturn189000search2turn189000search10

所以我現在不太問要不要跑 Scrum。

我比較常問的是，這個儀式現在還在幫我們做什麼。如果它只是在延續一種習慣，那很可能該縮。如果它還在幫你把風險提早變可見，那就不該只因為 AI 來了就順手砍掉。

AI 不是讓你少開會。

它只是逼你重新設計會議。

![Keep, shrink, or drop Agile rituals after AI](./resource/agile-ai-rituals-01-keep-shrink-kill.svg)

![Refinement before and after AI-assisted drafting](./resource/agile-ai-rituals-02-refinement-before-after.svg)

## Image Asset Plan

1. filename: agile-ai-rituals-01-keep-shrink-kill.svg
   purpose: 把常見 ceremonies 分成 keep / shrink / redesign
   placement: 放在三類 ceremony 分析之後
   alt: Keep, shrink, or drop Agile rituals after AI
   prompt: A blog-friendly SVG with three columns: Keep, Shrink, Redesign. Include review, retro, DoD in Keep; planning, refinement, daily in Shrink; manual status recitals, information-only sync meetings, estimation theatre in Redesign. Clean modern style, rounded rectangles, soft colors, English labels.

2. filename: agile-ai-rituals-02-refinement-before-after.svg
   purpose: 對照 refinement 在 AI 前後的差異
   placement: 放在 refinement 段落之後
   alt: Refinement before and after AI-assisted drafting
   prompt: A side-by-side SVG diagram comparing refinement before and after AI-assisted drafting. Left side: manual story writing, manual AC drafting, long sync-heavy meeting. Right side: AI first draft, boundary review, dependency check, DoD alignment, risk discussion. Blog-friendly, minimal, English labels.
