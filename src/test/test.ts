import * as FS from 'fs';
import * as Path from 'path';
import { Parser } from '../parser/Parser';
import { LocalizationCache } from '../LocalizationCache';
import { Localization } from '../Localization';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';

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
console.log(Localization.resource('test', 'TEST', {}), '\n');
console.log(Localization.resource('test', 'TEST', { bar: 'bar', baz: 'baz', far: 'far' }));
// console.log(nodeList);
