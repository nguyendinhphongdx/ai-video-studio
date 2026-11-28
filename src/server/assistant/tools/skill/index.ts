import { ListBlocks } from './list-blocks.tool';
import { ListSkills } from './list-skills.tool';
import { GetSkill } from './get-skill.tool';
import { InstallMarketSkill } from './install-market-skill.tool';
import { SaveSkill } from './save-skill.tool';
import { DeleteSkill } from './delete-skill.tool';

export const skillTools = [new ListBlocks(), new ListSkills(), new GetSkill(), new InstallMarketSkill(), new SaveSkill(), new DeleteSkill()];
