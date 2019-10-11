import { LocalizationStringTypeDeclaration } from './LocalizationStringTypeDeclaration';

/**
 * Represents a mapping of type identifiers to types that a
 * Localization resource expects at runtime
 *
 * @private
 */
export interface LocalizationStringTypeDeclarationMapping
{
	[key: string]: LocalizationStringTypeDeclaration;
}
