import { ListCharacters } from './list-characters.tool';
import { SaveCharacter } from './save-character.tool';
import { SaveCharacterAction } from './save-character-action.tool';
import { RemoveCharacter } from './remove-character.tool';
import { DrawCharacterPictures } from './draw-character-pictures.tool';

export const characterTools = [new ListCharacters(), new SaveCharacter(), new SaveCharacterAction(), new RemoveCharacter(), new DrawCharacterPictures()];
