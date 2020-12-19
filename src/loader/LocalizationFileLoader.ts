import * as FS from 'fs';
import * as Glob from 'glob';
import * as Path from 'path';
import { LocalizationCache } from '#root/LocalizationCache';
import { LocalizationParser } from '#parser/LocalizationParser';
import { NodeKindImplParentNode } from '#nodeKindImpl/NodeKindImplParentNode';

/** @internal */
export class LocalizationFileLoader
{
	/**
	 * Loads a single .lang file and caches it for the given language
	 */
	public static loadLangFile(language: string, file: string): void
	{
		if (!file.toLowerCase().endsWith('.lang'))
			throw new TypeError('Localization files must be in .lang format');

		const resolvedFile: string = Path.resolve(file);

		let fileContent: string;
		try { fileContent = FS.readFileSync(resolvedFile)?.toString(); }
		catch { throw new Error(`Failed to read localization file: ${resolvedFile}`); }

		if (fileContent.trim() === '')
			throw new Error(`Localization file is empty: ${resolvedFile}`);

		const nodeList: NodeKindImplParentNode[] = LocalizationParser.parse(resolvedFile, fileContent);
		for (const node of nodeList)
			LocalizationCache.set([language, node.category, node.subcategory], node.key, node);
	}

	/**
	 * Loads all .lang files in the given directory and caches them for the given language
	 */
	public static loadFromDirectory(language: string, dir: string): void
	{
		const resolvedDir: string = Path.resolve(dir);
		const filesGlob: string = `${resolvedDir}/**/*.lang`;
		const allLangFiles: string[] = Glob.sync(filesGlob);

		for (const file of allLangFiles)
			LocalizationFileLoader.loadLangFile(language, file);
	}
}
