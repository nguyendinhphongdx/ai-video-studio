import { UserFacingError } from '../../domain/errors';
import { imageSpec } from '../../scenes/assets';
import type { PipelineStep } from '../step';
import type { ImagesOutput, ProductionContext } from '../production';

/**
 * Collects the pictures made (and approved) scene by scene. Production never calls an image provider: a scene
 * whose picture is missing or out of date is an error to fix in the scenes step, not something to pay for here.
 */
export const imagesStep: PipelineStep<ProductionContext, ImagesOutput> = {
  id: 'images',
  label: 'Ảnh các cảnh',
  after: [],
  weight: 2,
  inputs: ({ episode, deps, imageStyle }) => episode.scenes.map((s) => [s.id, imageSpec(s, deps.tools, imageStyle)?.hash ?? null, s.assets.imagePath]),
  reusable: async ({ deps }, out) => (await Promise.all(Object.values(out.files).map((f) => deps.media.exists(f)))).every(Boolean),
  async run({ deps, episode, imageStyle }) {
    const files: ImagesOutput['files'] = {};
    for (const [i, s] of episode.scenes.entries()) {
      const spec = imageSpec(s, deps.tools, imageStyle);
      if (!spec) continue;
      if (!s.assets.imagePath || s.assets.imageHash !== spec.hash) throw new UserFacingError(`Cảnh ${i + 1} chưa có ảnh khớp với mô tả hiện tại. Tạo ảnh cho cảnh đó rồi duyệt lại.`);
      const file = deps.media.absolute(s.assets.imagePath);
      if (!(await deps.media.exists(file))) throw new UserFacingError(`Ảnh của cảnh ${i + 1} đã bị mất. Tạo lại ảnh cho cảnh đó.`);
      files[s.id] = file;
    }
    return { files };
  },
};
