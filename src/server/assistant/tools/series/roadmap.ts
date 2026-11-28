import { z } from 'zod';

export const Roadmap = z.array(z.object({ topic: z.string().min(3).max(300), goal: z.string().max(300).default('') })).min(1).max(60);
