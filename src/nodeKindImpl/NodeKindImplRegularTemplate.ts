import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';

/**
 * Represents an abstract Localization resource node for a regular template
 * that will have a value provided for it at runtime
 *
 * @private
 */
export class NodeKindImplRegularTemplate implements LocalizationStringChildNode
{
	public kind: LocalizationStringNodeKind = LocalizationStringNodeKind.RegularTemplate;

	public key: string;
	public parent: LocalizationStringParentNode;
	public line: number;
	public column: number;

	public constructor(key: string, parent: LocalizationStringParentNode, line: number, column: number)
	{
		this.key = key;
		this.parent = parent;
		this.line = line;
		this.column = column;
	}
}
