export type BlogLang = 'en' | 'zh';

export type CategoryId =
  | 'ai'
  | 'openclaw'
  | 'pm'
  | 'entrepreneurship'
  | 'business'
  | 'web3'
  | 'travel';

export const CATEGORY_ORDER: CategoryId[] = [
  'ai',
  'openclaw',
  'pm',
  'entrepreneurship',
  'business',
  'web3',
  'travel',
];

export const CATEGORY_LABELS: Record<CategoryId, Record<BlogLang, string>> = {
  ai: { en: 'AI', zh: 'AI' },
  openclaw: { en: 'OpenClaw', zh: '龍蝦養殖' },
  pm: { en: 'PM', zh: '產品' },
  entrepreneurship: { en: 'Entrepreneurship', zh: '創業' },
  business: { en: 'Business', zh: '商業' },
  web3: { en: 'Web3', zh: 'Web3' },
  travel: { en: 'Travel', zh: '旅行' },
};

export const CATEGORY_ICONS: Record<CategoryId, string> = {
  ai: '◈',
  openclaw: '⬡',
  pm: '▣',
  entrepreneurship: '△',
  business: '◆',
  web3: '◇',
  travel: '✦',
};

const CATEGORY_ALIASES: Record<string, CategoryId> = {
  ai: 'ai',
  openclaw: 'openclaw',
  business: 'business',
  web3: 'web3',
  travel: 'travel',
  pm: 'pm',
  product: 'pm',
  tech: 'pm',
  entrepreneurship: 'entrepreneurship',
  startup: 'entrepreneurship',
};

export function normalizeCategory(category: string): CategoryId | null {
  return CATEGORY_ALIASES[category.toLowerCase()] ?? null;
}

export function getCategoryLabel(category: string, lang: BlogLang): string {
  const normalized = normalizeCategory(category);
  if (!normalized) return category;
  return CATEGORY_LABELS[normalized][lang];
}

export function getOrderedCategories(categories: string[]): CategoryId[] {
  const normalized = new Set(
    categories
      .map(normalizeCategory)
      .filter((category): category is CategoryId => Boolean(category))
  );

  return CATEGORY_ORDER.filter(category => normalized.has(category));
}
