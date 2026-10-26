import { describe, expect, it } from 'vitest';

import { applyPublishTemplate } from '@/core/script/publish';
import { assembleScenes, draftFromScenes, parseDraft } from '@/core/script/script';
import { activeSlots } from '@/core/series/format';
import { toolCatalog } from '@/tools/registry';

import { cardsScene, publish, seriesFormat, version } from '../fixtures';

const slots = activeSlots(seriesFormat, 3);

describe('script contract', () => {
  it('accepts blocks allowed by each slot and normalises props', () => {
    const raw = { title: 'Số 3', slots: { recap: [cardsScene('2')], lesson: [cardsScene('3'), { ...cardsScene('3'), props: { ...cardsScene('3').props, count: 99 } }] }, publish };
    const draft = parseDraft(raw, slots, toolCatalog);
    expect(draft.slots.lesson?.[1]?.props.count).toBe(10);
  });

  it('accepts block refs written with "@"', () => {
    const raw = { title: 'x', slots: { recap: [{ ...cardsScene('2'), block: '@remotion/cards' }], lesson: [cardsScene('3')] }, publish };
    expect(parseDraft(raw, slots, toolCatalog).slots.recap?.[0]?.block).toBe('remotion/cards');
  });

  it('rejects a block the slot does not allow', () => {
    const raw = { title: 'x', slots: { recap: [{ ...cardsScene('2'), block: 'remotion/whiteboard' }], lesson: [cardsScene('3')] }, publish };
    expect(() => parseDraft(raw, slots, toolCatalog)).toThrow();
  });

  it('never lets the AI write a locked slot, and fills it from the template', () => {
    const draft = parseDraft({ title: 'Số 3', slots: { recap: [cardsScene('2')], lesson: [cardsScene('3')], intro: [cardsScene('X')] }, publish }, slots, toolCatalog);
    expect(draft.slots.intro).toBeUndefined();
    const scenes = assembleScenes(slots, draft, { n: '3', topic: 'Số 3' }, toolCatalog);
    expect(scenes.map((s) => s.slotId)).toEqual(['intro', 'recap', 'lesson']);
    expect(scenes[0]).toMatchObject({ locked: true, block: 'remotion/title', narration: 'Chào các bé! Gà Bông đây. Tập 3: Số 3!', props: { title: 'Tập 3', look: 'sky' } });
    expect(draftFromScenes('Số 3', scenes, publish).slots.intro).toBeUndefined();
  });

  it('applies the series publish template', () => {
    const kit = applyPublishTemplate(publish, version.publish, { series: 'Bé học đếm', n: '3', topic: 'Số 3' });
    expect(kit.youtube.title).toBe('Bé học đếm | Tập 3: Số 3');
    expect(kit.youtube.description).toBe('d\n\nĐăng ký kênh nhé');
    expect(kit.tiktok.hashtags).toEqual(['#x', '#gabong']);
  });
});
