import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';

export class NodeKindImplForwardTemplate implements LocalizationStringChildNode
{
	public kind: LocalizationStringNodeKind =
		LocalizationStringNodeKind.ForwardTemplate;

	public forwardKey: string;
	public parent: LocalizationStringParentNode;
	public line: number;
	public column: number;

	public constructor(forwardKey: string, parent: LocalizationStringParentNode, line: number, column: number)
	{
		this.forwardKey = forwardKey;
		this.parent = parent;
		this.line = line;
		this.column = column;
	}
}
