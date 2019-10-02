import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from './LocalizationStringParentNode';

export interface LocalizationStringChildNode
{
	kind: LocalizationStringNodeKind;
	parent: LocalizationStringParentNode;
	line: number;
	column: number;
}
