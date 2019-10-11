/**
 * Represnts the kinds of templates we can expect to encounter within a
 * Localization resource
 *
 * @private
 */
export enum LocalizationStringTemplateKind
{
	Regular,
	Maybe,
	Forward,
	Script,
	Invalid
}
