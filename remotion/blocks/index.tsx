// Components for the @remotion tool's blocks, keyed by block reference. src/tools/remotion/blocks/* point here.
import type { ReactElement } from 'react';

import { CardsScene, type CardsSceneProps } from './cards';
import { OutroScene, type OutroSceneProps } from './outro';
import { TitleScene, type TitleSceneProps } from './title';
import { WhiteboardScene, type WhiteboardSceneProps } from './whiteboard';

export type { CardsSceneProps, OutroSceneProps, TitleSceneProps, WhiteboardSceneProps };

type Draw = (props: Record<string, unknown>, ordinal: number) => ReactElement;

export const BLOCKS: Record<string, Draw> = {
  'remotion/title': (p) => <TitleScene {...(p as unknown as TitleSceneProps)} />,
  'remotion/cards': (p) => <CardsScene {...(p as unknown as CardsSceneProps)} />,
  'remotion/whiteboard': (p, ordinal) => <WhiteboardScene {...(p as unknown as WhiteboardSceneProps)} step={ordinal} />,
  'remotion/outro': (p) => <OutroScene {...(p as unknown as OutroSceneProps)} />,
};
