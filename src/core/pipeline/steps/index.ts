// Registered production steps. Add a step file and list it here; order comes from `after`.
import type { PipelineStep } from '../step';
import type { ProductionContext } from '../production';

import { assembleStep } from './assemble';
import { qualityStep } from './quality';
import { renderStep } from './render';
import { voiceStep } from './voice';

export const PRODUCTION_STEPS = [voiceStep, renderStep, assembleStep, qualityStep] as PipelineStep<ProductionContext>[];
