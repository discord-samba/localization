/**
 * Represents the different kinds of chunks of characters found within a raw
 * Localization string before parsing
 *
 * @private
 */
export enum LocalizationStringChunkKind
{
	ParentKey,
	Comment,
	TypesDeclaration,
	StringChunk,
	Template,
	None
}
