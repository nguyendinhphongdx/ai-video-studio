// The guide an outside AI reads must not point at tools that do not exist.
import { describe, expect, it } from 'vitest';

import { GUIDE } from '@/core/assistant/studio-guide';
import { STUDIO_TOOLS } from '@/server/assistant/tools';

/** snake_case words of the guide that are not tools: episode states. */
const NOT_TOOLS = new Set(['script_review', 'video_review']);

describe('studio guide', () => {
  it('names only tools offered over MCP', () => {
    const offered = new Set(STUDIO_TOOLS.filter((t) => t.surfaces.includes('mcp')).map((t) => t.name));
    const named = Object.values(GUIDE).join('\n').match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [];
    expect(named.length).toBeGreaterThan(20);
    expect([...new Set(named)].filter((n) => !offered.has(n) && !NOT_TOOLS.has(n))).toEqual([]);
  });
});
