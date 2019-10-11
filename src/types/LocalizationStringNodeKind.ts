/**
 * Represents the different kinds of abstract node found within a Localization
 * resource at parse-time
 *
 * @private
 */
export enum LocalizationStringNodeKind
{
	Parent,
	StringChunk,
	RegularTemplate,
	MaybeTemplate,
	ForwardTemplate,
	ScriptTemplate
}
