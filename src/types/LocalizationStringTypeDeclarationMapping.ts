import { LocalizationStringTypeDeclaration } from '@/types/LocalizationStringTypeDeclaration';

/**
 * Represents a mapping of type identifiers to types that a
 * Localization resource expects at runtime
 * @internal
 */
export interface LocalizationStringTypeDeclarationMapping
{
	[key: string]: LocalizationStringTypeDeclaration;
}
