export interface LocalizationStringTypesDeclaration
{
	[key: string]: {
		type: string,
		optional: boolean,
		line: number,
		column: number
	};
}
