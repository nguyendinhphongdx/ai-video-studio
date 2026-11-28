import { DesignTool } from './design-tool';

export class SetOutroDesign extends DesignTool {
  protected readonly kind = 'outro';
  protected readonly label = 'kết';
  readonly name = 'set_outro_design';
  readonly title = 'Lưu thiết kế kết';
  readonly description = DesignTool.describe('kết');
}
