// Components for the @remotion tool's blocks, keyed by block reference. src/tools/remotion/blocks/* point here.
import type { ReactElement } from 'react';

import { CardsScene, type CardsSceneProps } from './cards';
import { ChartScene, type ChartSceneProps } from './chart';
import { CounterScene, type CounterSceneProps } from './counter';
import { DotsScene, type DotsSceneProps } from './dots';
import { GaugeScene, type GaugeSceneProps } from './gauge';
import { TimelineScene, type TimelineSceneProps } from './timeline';
import { KineticScene, type KineticSceneProps } from './kinetic';
import { OutroScene, type OutroSceneProps } from './outro';
import { PictureScene, type PictureSceneProps } from './picture';
import { QuizScene, type QuizSceneProps } from './quiz';
import { RecapScene, type RecapSceneProps } from './recap';
import { TitleScene, type TitleSceneProps } from './title';
import { VoxScene, type VoxSceneProps } from './vox';
import { WhiteboardScene, type WhiteboardSceneProps } from './whiteboard';

export type { CardsSceneProps, ChartSceneProps, CounterSceneProps, DotsSceneProps, GaugeSceneProps, TimelineSceneProps, KineticSceneProps, OutroSceneProps, PictureSceneProps, QuizSceneProps, RecapSceneProps, TitleSceneProps, VoxSceneProps, WhiteboardSceneProps };

type Draw = (props: Record<string, unknown>, ordinal: number) => ReactElement;

export const BLOCKS: Record<string, Draw> = {
  'remotion/title': (p) => <TitleScene {...(p as unknown as TitleSceneProps)} />,
  'remotion/cards': (p, ordinal) => <CardsScene {...(p as unknown as CardsSceneProps)} ordinal={ordinal} />,
  'remotion/whiteboard': (p, ordinal) => <WhiteboardScene {...(p as unknown as WhiteboardSceneProps)} step={ordinal} />,
  'remotion/recap': (p) => <RecapScene {...(p as unknown as RecapSceneProps)} />,
  'remotion/quiz': (p) => <QuizScene {...(p as unknown as QuizSceneProps)} />,
  'remotion/vox': (p, ordinal) => <VoxScene {...(p as unknown as VoxSceneProps)} ordinal={ordinal} image={typeof p.image === 'string' ? p.image : undefined} />,
  'remotion/picture': (p, ordinal) => <PictureScene {...(p as unknown as PictureSceneProps)} ordinal={ordinal} image={typeof p.image === 'string' ? p.image : undefined} />,
  'remotion/kinetic': (p, ordinal) => <KineticScene {...(p as unknown as KineticSceneProps)} ordinal={ordinal} />,
  'remotion/counter': (p) => <CounterScene {...(p as unknown as CounterSceneProps)} />,
  'remotion/timeline': (p) => <TimelineScene {...(p as unknown as TimelineSceneProps)} />,
  'remotion/gauge': (p) => <GaugeScene {...(p as unknown as GaugeSceneProps)} />,
  'remotion/dots': (p) => <DotsScene {...(p as unknown as DotsSceneProps)} />,
  'remotion/chart': (p) => <ChartScene {...(p as unknown as ChartSceneProps)} />,
  'remotion/outro': (p) => <OutroScene {...(p as unknown as OutroSceneProps)} />,
};
