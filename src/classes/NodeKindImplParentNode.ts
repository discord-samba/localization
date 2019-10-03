import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringTypesDeclaration } from '../types/LocalizationStringTypesDeclaration';

export class NodeKindImplParentNode implements LocalizationStringParentNode
{
	public kind: LocalizationStringNodeKind =
		LocalizationStringNodeKind.Parent;

	public container: string;
	public key: string;
	public line: number;
	public column: number;
	public children: LocalizationStringChildNode[];
	public paramTypes: LocalizationStringTypesDeclaration;

	public constructor(container: string | undefined, key: string, line: number, column: number)
	{
		this.container = container ?? 'Anonymous';
		this.key = key;
		this.line = line;
		this.column = column;
		this.children = [];
		this.paramTypes = {};
	}

	/**
	 * Adds the given child to this node's children array
	 */
	public addChild(child: LocalizationStringChildNode): void
	{
		this.children.push(child);
	}

	/**
	 * Append the given param types to this node's current param types mapping
	 */
	public addParamTypes(paramTypes: LocalizationStringTypesDeclaration)
	{
		this.paramTypes = { ...this.paramTypes, ...paramTypes };
	}
}
