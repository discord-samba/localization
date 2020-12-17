/**
 * Represents the different kinds of abstract node found within a Localization
 * resource at parse-time
 * @internal
 */
export enum LocalizationStringNodeKind
{
	Parent,
	StringChunk,
	RegularTemplate,
	OptionalTemplate,
	IncludeTemplate,
	MatchTemplate,
	ScriptTemplate
}
