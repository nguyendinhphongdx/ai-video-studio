import { z } from 'zod';

import { FORMAT_IDS, type Format } from '@/core/domain';

export const Formats = z.array(z.enum(FORMAT_IDS as [Format, ...Format[]])).min(1);
