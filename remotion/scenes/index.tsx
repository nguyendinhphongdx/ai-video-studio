// Remotion-drawn tools, keyed by tool id. The server-side tool definitions in src/tools/* point here.
import type { ReactElement } from 'react';

import { CardsScene, type CardsSceneProps } from './cards';
import { OutroScene, type OutroSceneProps } from './outro';
import { TitleScene, type TitleSceneProps } from './title';
import { WhiteboardScene, type WhiteboardSceneProps } from './whiteboard';

export type { CardsSceneProps, OutroSceneProps, TitleSceneProps, WhiteboardSceneProps };

type Draw = (props: Record<string, unknown>, ordinal: number) => ReactElement;

export const SCENES: Record<string, Draw> = {
  title: (p) => <TitleScene {...(p as unknown as TitleSceneProps)} />,
  cards: (p) => <CardsScene {...(p as unknown as CardsSceneProps)} />,
  whiteboard: (p, ordinal) => <WhiteboardScene {...(p as unknown as WhiteboardSceneProps)} step={ordinal} />,
  outro: (p) => <OutroScene {...(p as unknown as OutroSceneProps)} />,
};

export const canDraw = (toolId: string) => toolId in SCENES;
