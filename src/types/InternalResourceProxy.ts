import { LocalizationResrouceMetaData } from './LocalizationResourceMetaData';
import { TemplateArguments } from './TemplateArguments';

/**
 * Reprsents the internal implementation of resource proxies that accpet _meta
 * @internal
 */
export interface InternalResourceProxy
{
	[key: string]: (args: TemplateArguments, _meta: LocalizationResrouceMetaData) => string;
}
