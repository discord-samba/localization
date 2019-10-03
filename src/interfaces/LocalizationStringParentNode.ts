import { LocalizationStringChildNode } from './LocalizationStringChildNode';
import { LocalizationStringTypesDeclaration } from '../types/LocalizationStringTypesDeclaration';

export interface LocalizationStringParentNode
{
	container: string
	key: string;
	line: number;
	column: number;
	children: LocalizationStringChildNode[];
	paramTypes: LocalizationStringTypesDeclaration;
}
