import { LocalizationResourceProxy } from './LocalizationResourceProxy';

/**
 * @private
 */
export interface LocalizationResrouceMetaData
{
	// Call location
	_cl?: string;

	// Is proxy
	_ip?: boolean;

	// MetaData proxy
	_mp?: LocalizationResourceProxy;
}
