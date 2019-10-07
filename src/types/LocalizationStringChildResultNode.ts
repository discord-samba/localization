import { LocalizationStringNodeKind } from './LocalizationStringNodeKind';

export interface LocalizationStringChildResultNode
{
	kind: LocalizationStringNodeKind;
	value?: string;
}
