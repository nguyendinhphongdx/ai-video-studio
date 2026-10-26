'use client';

import { EpisodeShell } from '../components/EpisodeShell';
import { ProduceStage } from '../components/production/ProduceStage';
import { PublishStage } from '../components/publish/PublishStage';
import { ScriptStage } from '../components/ScriptStage';

export const ScriptView = ({ id }: { id: string }) => <EpisodeShell id={id} stage="script">{(v) => <ScriptStage view={v} />}</EpisodeShell>;
export const ProduceView = ({ id }: { id: string }) => <EpisodeShell id={id} stage="produce">{(v) => <ProduceStage view={v} />}</EpisodeShell>;
export const PublishView = ({ id }: { id: string }) => <EpisodeShell id={id} stage="publish">{(v) => <PublishStage view={v} />}</EpisodeShell>;
