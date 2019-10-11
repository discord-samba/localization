import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from './LocalizationStringParentNode';

/**
 * Interface for an abstract Localization resource child node
 *
 * @private
 */
export interface LocalizationStringChildNode
{
	kind: LocalizationStringNodeKind;
	parent: LocalizationStringParentNode;
	line: number;
	column: number;
}
