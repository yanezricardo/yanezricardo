import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const caseStudies = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/case-studies' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date().optional(),
		status: z.enum(['draft', 'published']).default('draft'),
		tags: z.array(z.string()).default([]),
		featured: z.boolean().default(false),
	}),
});

const labs = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/labs' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		status: z.enum(['experiment', 'active', 'paused', 'archived']),
		url: z.url().optional(),
		repository: z.url().optional(),
		technologies: z.array(z.string()).default([]),
		featured: z.boolean().default(false),
		draft: z.boolean().default(false),
	}),
});

export const collections = { caseStudies, labs };
