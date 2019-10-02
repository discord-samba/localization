import { LocalizationStringChildNode } from './LocalizationStringChildNode';

export interface LocalizationStringParentNode
{
	container: string
	key: string;
	line: number;
	column: number;
	children: LocalizationStringChildNode[];
	paramTypes: { [param: string]: string };
}
