import { Composition } from "remotion";
import { Video, type VideoProps } from "./Video";
import { sampleProps } from "./sample";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Main"
    component={Video}
    fps={30}
    width={1920}
    height={1080}
    durationInFrames={300}
    defaultProps={sampleProps}
    calculateMetadata={({ props }: { props: VideoProps }) => ({
      durationInFrames: Math.ceil(props.timeline.total * 30),
      width: props.width,
      height: props.height,
    })}
  />
);
