import { LocalizationStringChildNode } from './LocalizationStringChildNode';
import { LocalizationStringTypeDeclarationMapping } from '../types/LocalizationStringTypeDeclarationMapping';

export interface LocalizationStringParentNode
{
	container: string;
	key: string;
	children: LocalizationStringChildNode[];
	params: LocalizationStringTypeDeclarationMapping;
	line: number;
	column: number;
}
