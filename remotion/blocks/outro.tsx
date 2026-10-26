import { AbsoluteFill } from 'remotion';

import { DesignScene } from '../design';
import { useBrand, useFont } from '../primitives';

export type OutroSceneProps = Record<string, never>;

/** The channel's own outro, drawn from its design (closing line and subscribe button come from the channel). */
export function OutroScene(_props: OutroSceneProps) {
  const brand = useBrand();
  const font = useFont();
  if (!brand.outroDesign) {
    return (
      <AbsoluteFill style={{ background: brand.palette[0] ?? '#4F46E5', color: 'white', fontFamily: font, fontWeight: 800, fontSize: 80, justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 80 }}>
        {brand.outroText}
      </AbsoluteFill>
    );
  }
  return <DesignScene design={brand.outroDesign} kind="outro" title="" />;
}
