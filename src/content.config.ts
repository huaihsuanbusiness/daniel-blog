import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['web3', 'ai', 'travel', 'openclaw', 'business', 'tech']),
    date: z.date(),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
  }),
});

export const collections = { blog };
