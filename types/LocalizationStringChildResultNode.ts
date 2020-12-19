import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';

/**
 * Represents the result of evaluating an abstract Localization string child
 * node at runtime
 * @internal
 */
export interface LocalizationStringChildResultNode
{
	kind: LocalizationStringNodeKind;
	value?: string;
}
