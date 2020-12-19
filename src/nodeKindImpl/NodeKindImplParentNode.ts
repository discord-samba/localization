import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringParentKeyData } from '#type/LocalizationStringParentKeyData';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { LocalizationStringTypeDeclarationMapping } from '#type/LocalizationStringTypeDeclarationMapping';

/**
 * Represents an abstract Localization resource parent node, of which all other
 * nodes comprising that Localization resource are children
 * @internal
 */
export class NodeKindImplParentNode implements LocalizationStringParentNode
{
	public readonly kind: LocalizationStringNodeKind = LocalizationStringNodeKind.Parent;

	public readonly container: string;
	public readonly key: string;
	public readonly category: string;
	public readonly subcategory: string;
	public readonly line: number;
	public readonly column: number;
	public readonly children: LocalizationStringChildNode[];

	public params: LocalizationStringTypeDeclarationMapping;

	public constructor(
		container: string,
		data: LocalizationStringParentKeyData,
		line: number,
		column: number
	)
	{
		this.container = container;
		this.key = data.key;
		this.category = data.category;
		this.subcategory = data.subcategory;
		this.line = line;
		this.column = column;
		this.children = [];
		this.params = {};
	}

	/**
	 * Adds the given child to this node's children array
	 */
	public addChild(child: LocalizationStringChildNode): void
	{
		this.children.push(child);
	}

	/**
	 * Append the given param types to this node's current parameter declarations mapping
	 */
	public addParams(paramTypes: LocalizationStringTypeDeclarationMapping): void
	{
		this.params = { ...this.params, ...paramTypes };
	}
}
