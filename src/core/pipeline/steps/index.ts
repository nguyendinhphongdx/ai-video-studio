// Registered production steps. Add a step file and list it here; order comes from `after`.
import type { PipelineStep } from '../step';
import type { ProductionContext } from '../production';

import { assembleStep } from './assemble';
import { imagesStep } from './images';
import { qualityStep } from './quality';
import { renderStep } from './render';
import { thumbnailStep } from './thumbnail';
import { voiceStep } from './voice';

export const PRODUCTION_STEPS = [imagesStep, voiceStep, renderStep, assembleStep, thumbnailStep, qualityStep] as PipelineStep<ProductionContext>[];
