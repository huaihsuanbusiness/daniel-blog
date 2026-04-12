export type BlogLang = 'en' | 'zh';

export interface SeriesMeta {
  key: string;
  order: number;
  label: string;
}

const SERIES: Array<{ slug: RegExp; key: string; order: number; labelZh: string; labelEn: string }> = [
  { slug: /^openclaw-getting-started-\d+$/, key: 'openclaw-getting-started', order: 1, labelZh: '1. OpenClaw 快速上手', labelEn: '1. OpenClaw Getting Started' },
  { slug: /^openclaw-deployment-and-configuration-part-\d+$/, key: 'openclaw-deployment-and-configuration', order: 2, labelZh: '2. OpenClaw 部署與配置', labelEn: '2. OpenClaw Deployment and Configuration' },
  { slug: /^ai-agentic-workflow-series-\d+$/, key: 'ai-agentic-workflow', order: 1, labelZh: '1. AI 代理工作流', labelEn: '1. AI Agentic Workflow' },
  { slug: /^building-ai-skills-series-part-\d+$/, key: 'building-ai-skills', order: 2, labelZh: '2. 打造 AI Skill', labelEn: '2. Building AI Skills' },
  { slug: /^build-mcp-server-part-\d+$/, key: 'build-mcp-server', order: 3, labelZh: '3. 自主建造 MCP Server', labelEn: '3. Build Your Own MCP Server' },
  { slug: /^mcp-engineering-deep-dive-\d+$/, key: 'mcp-engineering-deep-dive', order: 4, labelZh: '4. MCP 工程深化', labelEn: '4. MCP Engineering Deep Dive' },
  { slug: /^comfyui-series-\d+$/, key: 'comfyui-series', order: 5, labelZh: '5. ComfyUI', labelEn: '5. ComfyUI' },
  { slug: /^rag-engineering-in-practice-\d+$/, key: 'rag-engineering-in-practice', order: 6, labelZh: '6. RAG 工程實戰', labelEn: '6. RAG Engineering in Practice' },
  { slug: /^pm-llm-application-engineering-\d+$/, key: 'pm-llm-application-engineering', order: 7, labelZh: '7. PM LLM 應用工程與治理', labelEn: '7. LLM Application Engineering and Governance for PMs' },
  { slug: /^pm-product-data-and-experimentation-\d+$/, key: 'pm-product-data-and-experimentation', order: 1, labelZh: '1. PM 產品數據與實驗', labelEn: '1. PM Product Data and Experimentation' },
  { slug: /^pm-growth-levers-monetisation-\d+$/, key: 'pm-growth-levers-monetisation', order: 2, labelZh: '2. PM 成長槓桿與變現', labelEn: '2. PM Growth Levers and Monetisation' },
  { slug: /^pm-user-research-fieldwork-\d+$/, key: 'pm-user-research-fieldwork', order: 3, labelZh: '3. PM 用戶研究與田野訪查', labelEn: '3. PM User Research and Fieldwork' },
  { slug: /^after-the-pause-\d+$/, key: 'after-the-pause', order: 1, labelZh: '1. 暫停之後', labelEn: '1. After the Pause' },
  { slug: /^category-design-for-founders-\d+$/, key: 'category-design-for-founders', order: 2, labelZh: '2. 創業家的類別創造', labelEn: '2. Category Design for Founders' },
  { slug: /^what-reality-corrected-\d+$/, key: 'what-reality-corrected', order: 3, labelZh: '3. 被現實修正之後', labelEn: '3. What Reality Corrected' },
  { slug: /^local-llm-fine-tuning-\d+$/, key: 'local-llm-fine-tuning', order: 8, labelZh: '8. 本地 LLM 微調拆解：從 Modelfile、LoRA 到 DPO 的實戰', labelEn: '8. Local LLM Fine-Tuning Breakdown: From Modelfiles and LoRA to DPO' },
  { slug: /^behind-the-trend-\d+$/, key: 'behind-the-trend', order: 9, labelZh: '9. 趨勢的背後', labelEn: '9. Behind the Trend' },
];

export function getSeriesMeta(slug: string, lang: BlogLang): SeriesMeta | null {
  for (const s of SERIES) {
    if (s.slug.test(slug)) {
      return { key: s.key, order: s.order, label: lang === 'zh' ? s.labelZh : s.labelEn };
    }
  }
  return null;
}
