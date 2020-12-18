import { LocalizationStringNodeKind } from '@/types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '@/interfaces/LocalizationStringParentNode';

/**
 * Interface for an abstract Localization resource child node
 * @internal
 */
export interface LocalizationStringChildNode
{
	kind: LocalizationStringNodeKind;
	parent: LocalizationStringParentNode;
	line: number;
	column: number;
}
