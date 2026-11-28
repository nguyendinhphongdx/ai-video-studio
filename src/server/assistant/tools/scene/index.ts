import { MoveScene } from './move-scene.tool';
import { DuplicateScene } from './duplicate-scene.tool';
import { ListScenePictures } from './list-scene-pictures.tool';
import { UseScenePicture } from './use-scene-picture.tool';

export const sceneTools = [new MoveScene(), new DuplicateScene(), new ListScenePictures(), new UseScenePicture()];
