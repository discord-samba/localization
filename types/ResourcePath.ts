/**
 * Represents a language identifier (string) or tuple of string identifiers that
 * lead to a distinct set of localization resources. The value will be interpreted
 * as follows:
 *
 *     [language, category, subcategory] // Self-explanatory
 *     [language, category]              // Defaults to 'default' subcategory
 *     [language]                        // Defaults to 'default' category, 'default' subcategory
 *     'language'                        // Defaults to 'default' category, 'default' subcategory
 */
export type ResourcePath =
	| string
	| [string]
	| [string, string]
	| [string, string, string];
