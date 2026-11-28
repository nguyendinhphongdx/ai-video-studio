import { GetSettingsStatus } from './get-settings-status.tool';
import { GetChannel } from './get-channel.tool';
import { UpdateChannel } from './update-channel.tool';
import { SetIntroDesign } from './set-intro-design.tool';
import { SetOutroDesign } from './set-outro-design.tool';
import { GenerateChannelArt } from './generate-channel-art.tool';
import { DrawLogo } from './draw-logo.tool';
import { GetKnowledge } from './get-knowledge.tool';
import { SaveKnowledge } from './save-knowledge.tool';

export const channelTools = [new GetSettingsStatus(), new GetChannel(), new UpdateChannel(), new SetIntroDesign(), new SetOutroDesign(), new GenerateChannelArt(), new DrawLogo(), new GetKnowledge(), new SaveKnowledge()];
