import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';

export class NodeKindImplStringChunk implements LocalizationStringChildNode
{
	public kind: LocalizationStringNodeKind =
		LocalizationStringNodeKind.StringChunk;

	public content: string;
	public parent: LocalizationStringParentNode;
	public line: number;
	public column: number;

	public constructor(value: string, parent: LocalizationStringParentNode, line: number, column: number)
	{
		this.content = value;
		this.parent = parent;
		this.line = line;
		this.column = column;
	}
}
