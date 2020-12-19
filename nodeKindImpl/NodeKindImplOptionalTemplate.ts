import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { TemplatePipe } from '#type/TemplatePipe';

/**
 * Represents an abstract Localization resource node for an optional template
 * that may or may not have a value provided at runtime
 * @internal
 */
export class NodeKindImplOptionalTemplate implements LocalizationStringChildNode
{
	public readonly kind: LocalizationStringNodeKind = LocalizationStringNodeKind.OptionalTemplate;

	public readonly key: string;
	public readonly parent: LocalizationStringParentNode;
	public readonly line: number;
	public readonly column: number;
	public readonly pipes: TemplatePipe[];

	public constructor(
		key: string,
		parent: LocalizationStringParentNode,
		line: number,
		column: number,
		pipes: TemplatePipe[]
	)
	{
		this.key = key;
		this.parent = parent;
		this.line = line;
		this.column = column;
		this.pipes = pipes;
	}
}
