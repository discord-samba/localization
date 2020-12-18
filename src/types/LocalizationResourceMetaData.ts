import { LocalizationResourceProxy } from '@/types/LocalizationResourceProxy';

/** @internal */
export interface LocalizationResrouceMetaData
{
	// Call location
	_cl?: string;

	// Call chain
	_cc?: string[];

	// Current key
	_ck?: string;

	// Is proxy
	_ip?: boolean;

	// MetaData proxy
	_mp?: LocalizationResourceProxy;
}
