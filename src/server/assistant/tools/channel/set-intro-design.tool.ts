import { DesignTool } from './design-tool';

export class SetIntroDesign extends DesignTool {
  protected readonly kind = 'intro';
  protected readonly label = 'mở đầu';
  readonly name = 'set_intro_design';
  readonly title = 'Lưu thiết kế mở đầu';
  readonly description = DesignTool.describe('mở đầu');
}
