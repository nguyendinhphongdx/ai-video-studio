import { AbsoluteFill } from 'remotion';

import { DesignScene } from '../design';
import { useBrand, useFont } from '../primitives';

export interface TitleSceneProps {
  title: string;
}

/** The channel's own intro, drawn from its design; the video title fills the {title} placeholder. */
export function TitleScene({ title }: TitleSceneProps) {
  const brand = useBrand();
  const font = useFont();
  if (!brand.introDesign) {
    return (
      <AbsoluteFill style={{ background: brand.palette[0] ?? '#4F46E5', color: 'white', fontFamily: font, fontWeight: 800, fontSize: 96, justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 80 }}>
        {title}
      </AbsoluteFill>
    );
  }
  return <DesignScene design={brand.introDesign} kind="intro" title={title} />;
}
