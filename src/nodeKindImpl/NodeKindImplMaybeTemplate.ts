import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';

export class NodeKindImplMaybeTemplate implements LocalizationStringChildNode
{
	public kind: LocalizationStringNodeKind = LocalizationStringNodeKind.MaybeTemplate;

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
