import { LocalizationResourceMetaData } from './LocalizationResourceMetaData';
import { ResourcePath } from './ResourcePath';
import { TemplateArguments } from './TemplateArguments';

/**
 * Represents the internal implementation of Localization that allows passing _meta
 * for resource lookups
 * @internal
 */
export interface InternalLocalization
{
	resource(
		path: ResourcePath,
		key: string,
		args: TemplateArguments,
		_meta: LocalizationResourceMetaData
	): string;
}
