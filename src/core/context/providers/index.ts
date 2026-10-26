// Registered context layers. Add a provider file and list it here.
import type { ContextLayer } from '../layer';

import { channelLayer } from './channel';
import { episodeLayer } from './episode';
import { formatLayer } from './format';
import { instructionsLayer } from './instructions';
import { memoryLayer } from './memory';
import { skillLayer } from './skill';
import { styleLayer } from './style';
import { systemLayer } from './system';

export const CONTEXT_LAYERS: ContextLayer[] = [systemLayer, channelLayer, instructionsLayer, skillLayer, styleLayer, formatLayer, memoryLayer, episodeLayer];
