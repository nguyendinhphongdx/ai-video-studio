// Components for the @remotion tool's blocks, keyed by block reference. src/tools/remotion/blocks/* point here.
import type { ReactElement } from 'react';

import { CardsScene, type CardsSceneProps } from './cards';
import { OutroScene, type OutroSceneProps } from './outro';
import { PictureScene, type PictureSceneProps } from './picture';
import { QuizScene, type QuizSceneProps } from './quiz';
import { RecapScene, type RecapSceneProps } from './recap';
import { TitleScene, type TitleSceneProps } from './title';
import { VoxScene, type VoxSceneProps } from './vox';
import { WhiteboardScene, type WhiteboardSceneProps } from './whiteboard';

export type { CardsSceneProps, OutroSceneProps, PictureSceneProps, QuizSceneProps, RecapSceneProps, TitleSceneProps, VoxSceneProps, WhiteboardSceneProps };

type Draw = (props: Record<string, unknown>, ordinal: number) => ReactElement;

export const BLOCKS: Record<string, Draw> = {
  'remotion/title': (p) => <TitleScene {...(p as unknown as TitleSceneProps)} />,
  'remotion/cards': (p, ordinal) => <CardsScene {...(p as unknown as CardsSceneProps)} ordinal={ordinal} />,
  'remotion/whiteboard': (p, ordinal) => <WhiteboardScene {...(p as unknown as WhiteboardSceneProps)} step={ordinal} />,
  'remotion/recap': (p) => <RecapScene {...(p as unknown as RecapSceneProps)} />,
  'remotion/quiz': (p) => <QuizScene {...(p as unknown as QuizSceneProps)} />,
  'remotion/vox': (p, ordinal) => <VoxScene {...(p as unknown as VoxSceneProps)} ordinal={ordinal} image={typeof p.image === 'string' ? p.image : undefined} />,
  'remotion/picture': (p, ordinal) => <PictureScene {...(p as unknown as PictureSceneProps)} ordinal={ordinal} image={typeof p.image === 'string' ? p.image : undefined} />,
  'remotion/outro': (p) => <OutroScene {...(p as unknown as OutroSceneProps)} />,
};
