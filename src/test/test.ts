import * as FS from 'fs';
import * as Path from 'path';
import { Parser } from '../parser/Parser';
import { LocalizationCache } from '../LocalizationCache';
import { Localization } from '../Localization';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { TemplateArguments } from '../types/TemplateArguments';

function now(): number
{
	type NSFunction = (hr?: [number, number]) => number;
	const ns: NSFunction = (hr = process.hrtime()) => hr[0] * 1e9 + hr[1];
	return (ns() - (ns() - (process.uptime() * 1e9))) / 1e6;
}

const start: number = now();

let nodeList: LocalizationStringParentNode[] =
	Parser.parse('test_lang.lang', FS.readFileSync(Path.join(__dirname, './test_lang.lang')).toString());

console.log(now() - start, '\n');

LocalizationCache.set('test', 'TEST', nodeList[0]);
LocalizationCache.set('test', 'TEST2', nodeList[1]);

const args: TemplateArguments = {
	foo: 'foo',
	// bar: 1,
	baz: true,
	boo: ['foo', '1', 'baz'],
	// far: [1, 2, 3],
	faz: [true, false, true],
	any: [1, '2', true]
};

console.log(Localization.resource('test', 'TEST', args), '\n');
console.log(nodeList);
