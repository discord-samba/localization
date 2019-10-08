/* eslint-disable */
import * as Path from 'path';
import { Localization } from '../Localization';
import { TemplateArguments } from '../types/TemplateArguments';
import { LocalizationResourceProxy } from '../types/LocalizationResourceProxy';
import { LocalizationFileLoader } from '../loader/LocalizationFileLoader';

function now(): number
{
	type NSFunction = (hr?: [number, number]) => number;
	const ns: NSFunction = (hr = process.hrtime()) => hr[0] * 1e9 + hr[1];
	return (ns() - (ns() - (process.uptime() * 1e9))) / 1e6;
}

const start: number = now();

LocalizationFileLoader.loadFromDirectory('test', Path.join(__dirname, 'locale'));

console.log(now() - start, '\n');

const args: TemplateArguments = {
	foo: 'foo',
	bar: 1,
	baz: true,
	boo: ['foo', '1', 'baz'],
	// far: [1, 2, 3],
	faz: [true, false, true],
	any: [1, '2', true],
	arg: 'arg'
};

console.log(Localization.resource('test', 'TEST', args), '\n');
console.log(Localization.resource('test', 'TEST2', args), '\n');

let proxy: LocalizationResourceProxy<any> = Localization.getResourceProxy('test');
console.log(proxy.TEST(args), '\n');
console.log(proxy.TEST2(args));
