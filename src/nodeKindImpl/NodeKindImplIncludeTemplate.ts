import { LocalizationStringChildNode } from '@/interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '@/types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '@/interfaces/LocalizationStringParentNode';
import { TemplatePipe } from '@/types/TemplatePipe';

/**
 * Represents an abstract Localization resource node for a template that will
 * load another Localization resource when the resource containing the template
 * is loaded at runtime
 * @internal
 */
export class NodeKindImplIncludeTemplate implements LocalizationStringChildNode
{
	public readonly kind: LocalizationStringNodeKind = LocalizationStringNodeKind.IncludeTemplate;

	public readonly includeKey: string;
	public readonly parent: LocalizationStringParentNode;
	public readonly line: number;
	public readonly column: number;
	public readonly pipes: TemplatePipe[];

	public constructor(
		includeKey: string,
		parent: LocalizationStringParentNode,
		line: number,
		column: number,
		pipes: TemplatePipe[]
	)
	{
		this.includeKey = includeKey;
		this.parent = parent;
		this.line = line;
		this.column = column;
		this.pipes = pipes;
	}
}
