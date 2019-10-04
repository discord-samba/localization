import { LocalizationStringChildNode } from './LocalizationStringChildNode';
import { LocalizationStringTypesDeclaration } from '../types/LocalizationStringTypesDeclaration';

export interface LocalizationStringParentNode
{
	container: string;
	key: string;
	children: LocalizationStringChildNode[];
	paramTypes: LocalizationStringTypesDeclaration;
	line: number;
	column: number;
}
