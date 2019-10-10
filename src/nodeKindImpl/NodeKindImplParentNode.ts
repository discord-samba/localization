import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentKeyData } from '../types/LocalizationStringParentKeyData';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { LocalizationStringTypeDeclarationMapping } from '../types/LocalizationStringTypeDeclarationMapping';

export class NodeKindImplParentNode implements LocalizationStringParentNode
{
	public kind: LocalizationStringNodeKind = LocalizationStringNodeKind.Parent;

	public container: string;
	public key: string;
	public category: string;
	public subcategory: string;
	public line: number;
	public column: number;
	public children: LocalizationStringChildNode[];
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
