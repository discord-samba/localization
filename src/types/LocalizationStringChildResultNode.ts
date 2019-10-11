import { LocalizationStringNodeKind } from './LocalizationStringNodeKind';

/**
 * Represents the result of evaluating an abstract Localization string child
 * node at runtime
 *
 * @private
 */
export interface LocalizationStringChildResultNode
{
	kind: LocalizationStringNodeKind;
	value?: string;
}
