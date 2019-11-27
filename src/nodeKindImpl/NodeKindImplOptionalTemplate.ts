import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';

/**
 * Represents an abstract Localization resource node for an optional template
 * that may or may not have a value provided at runtime
 * @internal
 */
export class NodeKindImplOptionalTemplate implements LocalizationStringChildNode
{
	public kind: LocalizationStringNodeKind = LocalizationStringNodeKind.OptionalTemplate;

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
