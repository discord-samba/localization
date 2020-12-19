import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';

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
