import * as Path from 'path';
import { LocalizationCache } from '@/LocalizationCache';
import { LocalizationFileLoader } from '@/loader/LocalizationFileLoader';

describe('Loading .lang files', () =>
{
	it('Should successfully load a single file', () =>
	{
		LocalizationCache.clear();
		const path: string = Path.join(__dirname, '../locale/test', 'test1.lang');
		expect(() => LocalizationFileLoader.loadLangFile('test', path)).not.toThrow(TypeError);

		LocalizationCache.clear();
		expect(() => LocalizationFileLoader.loadLangFile('test', path)).not.toThrow(Error);
	});

	it('Should successfully load a directory', () =>
	{
		LocalizationCache.clear();
		const path: string = Path.join(__dirname, '../locale/test');
		expect(() => LocalizationFileLoader.loadFromDirectory('test', path)).not.toThrow(TypeError);

		LocalizationCache.clear();
		expect(() => LocalizationFileLoader.loadFromDirectory('test', path)).not.toThrow(Error);
	});

	it('Should error for invalid file type', () =>
	{
		LocalizationCache.clear();
		const path: string = Path.join(__dirname, '../locale/error', 'test1.foo');
		expect(() => LocalizationFileLoader.loadLangFile('test', path)).toThrow(TypeError);

		LocalizationCache.clear();
		expect(() => LocalizationFileLoader.loadLangFile('test', path))
			.toThrow('Localization files must be in .lang format');
	});

	it('Should error for non-existant file', () =>
	{
		LocalizationCache.clear();
		const path: string = Path.join(__dirname, '../locale/error', 'foo.lang');
		expect(() => LocalizationFileLoader.loadLangFile('test', path)).toThrow(Error);

		LocalizationCache.clear();
		expect(() => LocalizationFileLoader.loadLangFile('test', path))
			.toThrow(`Failed to read localization file: ${path}`);
	});

	it('Should error for empty files', () =>
	{
		LocalizationCache.clear();
		const path: string = Path.join(__dirname, '../locale/error', 'empty.lang');
		expect(() => LocalizationFileLoader.loadLangFile('test', path)).toThrow(Error);

		LocalizationCache.clear();
		expect(() => LocalizationFileLoader.loadLangFile('test', path))
			.toThrow(`Localization file is empty: ${path}`);
	});
});
