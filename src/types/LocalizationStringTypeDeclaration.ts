/**
 * Represents a Localization resource argument type declaration
 * @internal
 */
export interface LocalizationStringTypeDeclaration
{
	identType: string;
	isOptional: boolean;
	isArrayType: boolean;
	line: number;
	column: number;
}
