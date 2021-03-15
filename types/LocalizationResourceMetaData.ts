import { LocalizationResourceProxy } from '#type/LocalizationResourceProxy';

/** @internal */
export interface LocalizationResourceMetaData
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
