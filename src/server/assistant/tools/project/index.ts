import { GetCostSummary } from './get-cost-summary.tool';
import { ListRunningWork } from './list-running-work.tool';
import { DeleteProject } from './delete-project.tool';
import { CreateProject } from './create-project.tool';
import { ListProjects } from './list-projects.tool';

export const projectTools = [new ListProjects(), new CreateProject(), new DeleteProject(), new ListRunningWork(), new GetCostSummary()];
