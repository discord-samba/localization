import { TemplateArguments } from '@/types/TemplateArguments';

/**
 * Represents a Proxy object for a specific language where function calls
 * will call [Localization.resource()]{@link Localization.resource} for that
 * language and forward the given `TemplateArguments` to the resource lookup.
 *
 * >**TypeScript note**: Can be given a type parameter object where the keys
 * are Localization string keys to provide type hinting on key names when
 * using the proxy
 */
export type LocalizationResourceProxy<T = {}> = {
	[key in keyof T]: (args?: TemplateArguments) => string
};
