import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { Primitive } from '#type/Primitive';
import { TemplatePipe } from '#type/TemplatePipe';

/**
 * Represents an abstract Localization resource node for a regular template
 * that will have a value provided for it at runtime
 * Represents an abstract Localization resource node for a match template
 * that will map input to specified values based on input matches at runtime
 * @internal
 */
export class NodeKindImplMatchTemplate implements LocalizationStringChildNode
{
	public readonly kind: LocalizationStringNodeKind = LocalizationStringNodeKind.MatchTemplate;

	public readonly parent: LocalizationStringParentNode;
	public readonly key: string;
	public readonly line: number;
	public readonly column: number;
	public readonly pipes: TemplatePipe[];
	public readonly matchers: [Primitive, Primitive][];
	public readonly defaultMatch?: Primitive;

	public constructor(
		key: string,
		parent: LocalizationStringParentNode,
		line: number,
		column: number,
		pipes: TemplatePipe[],
		matchers: [Primitive, Primitive][],
		defaultMatch?: Primitive
	)
	{
		this.key = key;
		this.parent = parent;
		this.line = line;
		this.column = column;
		this.pipes = pipes;
		this.matchers = matchers;
		this.defaultMatch = defaultMatch;
	}
}
