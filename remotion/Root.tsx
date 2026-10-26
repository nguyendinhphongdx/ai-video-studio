import { Composition } from 'remotion';

import { SceneClip, Storyboard, type SceneClipProps, type StoryboardProps } from './compositions';

const FPS = 30;

const sampleBrand = { name: 'Kid Plazza', logoSrc: null, outroText: 'Hẹn gặp lại các bé nhé!', subscribeText: '🔔 ĐĂNG KÝ KÊNH', palette: ['#5B3DF5'] };

const sampleScene: SceneClipProps = {
  block: 'remotion/cards',
  props: { heading: '3', emoji: '🐥', count: 3, caption: 'Ba chú gà con', color: '#FECA57' },
  ordinal: 1,
  brand: sampleBrand,
  durationSec: 4,
  narrationSrc: null,
  width: 1920,
  height: 1080,
};

const sampleStoryboard: StoryboardProps = {
  brand: sampleBrand,
  music: 'music.wav',
  scenes: [
    { key: 'a', block: 'remotion/title', props: { title: 'Bé học đếm', look: 'sky' }, ordinal: 1, durationSec: 3, narrationSrc: null },
    { key: 'b', block: 'remotion/cards', props: sampleScene.props, ordinal: 1, durationSec: 4, narrationSrc: null },
    { key: 'c', block: 'remotion/whiteboard', props: { heading: 'Trứng', emoji: '🥚', count: 3, caption: 'Ếch mẹ đẻ trứng', color: '#43A047' }, ordinal: 1, durationSec: 5, narrationSrc: null },
    { key: 'd', block: 'remotion/outro', props: { look: 'sky' }, ordinal: 1, durationSec: 4, narrationSrc: null },
  ],
};

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="SceneClip"
        component={SceneClip}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={120}
        defaultProps={sampleScene}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.durationSec * FPS)), width: props.width, height: props.height })}
      />
      <Composition
        id="Storyboard"
        component={Storyboard}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={480}
        defaultProps={sampleStoryboard}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.scenes.reduce((a, s) => a + s.durationSec, 0) * FPS)) })}
      />
    </>
  );
}
