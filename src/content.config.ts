import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    date: z.date(),
    featured: z.boolean().default(false),
    subtitle: z.string().optional(),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    coverImage: z.string().optional(),
  }),
});

export const collections = { blog };
