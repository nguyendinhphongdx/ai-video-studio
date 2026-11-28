// What the model is told about each tool. A change here changes how the Assistant behaves: update the snapshot
// (`npx vitest run tests/server/assistant-tools.test.ts -u`) only when that is intended.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ASSISTANT_TOOLS } from '@/server/assistant/tools';

describe('assistant tool contract', () => {
  it('keeps names, order, risks, descriptions and arguments', async () => {
    const contract = ASSISTANT_TOOLS.map((t) => ({ name: t.name, risk: t.risk, description: t.description, input: z.toJSONSchema(t.schema, { io: 'input' }) }));
    expect(contract).toHaveLength(44);
    await expect(`${JSON.stringify(contract, null, 2)}\n`).toMatchFileSnapshot('./assistant-tools.contract.json');
  });
});
