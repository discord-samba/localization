import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';

export interface LocalizationStringChildResultNode
{
	kind: LocalizationStringNodeKind;
	value?: string;
}
