import { CreateProject } from './create-project.tool';
import { DeleteProject } from './delete-project.tool';
import { GetCostSummary } from './get-cost-summary.tool';
import { GetStudioGuide } from './get-studio-guide.tool';
import { ListProjects } from './list-projects.tool';
import { ListRunningWork } from './list-running-work.tool';
import { RequestUpload } from './request-upload.tool';

export const projectTools = [new GetStudioGuide(), new ListProjects(), new CreateProject(), new DeleteProject(), new ListRunningWork(), new GetCostSummary(), new RequestUpload()];
