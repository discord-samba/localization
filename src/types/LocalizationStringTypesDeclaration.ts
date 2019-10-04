export interface LocalizationStringTypesDeclaration
{
	[key: string]: {
		type: string,
		isOptional: boolean,
		isArrayType: boolean,
		line: number,
		column: number
	};
}
