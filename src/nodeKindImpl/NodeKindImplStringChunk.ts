import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';

/**
 * Represents an abstract Localization resource node containing raw text without
 * any special localization syntax
 * @internal
 */
export class NodeKindImplStringChunk implements LocalizationStringChildNode
{
	public readonly kind: LocalizationStringNodeKind = LocalizationStringNodeKind.StringChunk;

	public readonly content: string;
	public readonly parent: LocalizationStringParentNode;
	public readonly line: number;
	public readonly column: number;

	public constructor(value: string, parent: LocalizationStringParentNode, line: number, column: number)
	{
		this.content = value;
		this.parent = parent;
		this.line = line;
		this.column = column;
	}
}
