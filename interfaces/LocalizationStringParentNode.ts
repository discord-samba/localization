import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringTypeDeclarationMapping } from '#type/LocalizationStringTypeDeclarationMapping';

/**
 * Interface for an abstract Localization resource parent node
 * @internal
 */
export interface LocalizationStringParentNode
{
	kind: LocalizationStringNodeKind;
	container: string;
	key: string;
	category: string;
	subcategory: string;
	children: LocalizationStringChildNode[];
	params: LocalizationStringTypeDeclarationMapping;
	line: number;
	column: number;
}
