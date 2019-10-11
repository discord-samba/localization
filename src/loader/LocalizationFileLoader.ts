import * as FS from 'fs';
import * as Glob from 'glob';
import * as Path from 'path';
import { LocalizationCache } from '../LocalizationCache';
import { NodeKindImplParentNode } from '../nodeKindImpl/NodeKindImplParentNode';
import { Parser } from '../parser/Parser';

/**
 * @private
 */
export class LocalizationFileLoader
{
	public static loadFromDirectory(language: string, dir: string): void
	{
		const resolvedDir: string = Path.resolve(dir);
		const filesGlob: string = `${resolvedDir}/**/*.lang`;
		const allLangFiles: string[] = Glob.sync(filesGlob);

		for (const file of allLangFiles)
		{
			const fileContent: string = FS.readFileSync(file)?.toString();
			if (typeof fileContent === 'undefined')
				continue;

			const nodeList: NodeKindImplParentNode[] = Parser.parse(file, fileContent);
			for (const node of nodeList)
				LocalizationCache.set([language, node.category, node.subcategory], node.key, node);
		}
	}
}
