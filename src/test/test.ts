/* eslint-disable */
import * as Path from 'path';
import { Localization } from '../Localization';
import { TemplateArguments } from '../types/TemplateArguments';
import { LocalizationResourceProxy } from '../types/LocalizationResourceProxy';
import { LocalizationFileLoader } from '../loader/LocalizationFileLoader';

let json = require('../../docs.json');
console.log(Object.keys(json).length);

for (const node of json.children)
{
	if (node.flags.isPrivate)
		console.log(node.name);
}

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
	boo: ['foo', '2', 'baz'],
	// far: [1, 2, 3],
	faz: [true, false, true],
	any: [1, '2', true],
	arg: 'arg'
};

console.log('---Test regular strings with args---');
console.log(Localization.resource('test', 'TEST', args), '\n');
console.log(Localization.resource('test', 'TEST2', args), '\n');

console.log('---Test strings with categories and subcategories---');
console.log(Localization.resource(['test', 'test'], 'TEST'), '\n');
console.log(Localization.resource(['test', 'test', 'test'], 'TEST', { foo: 'bar' }), '\n');

console.log('---Test regular proxies---')
let proxy: LocalizationResourceProxy<any> = Localization.getResourceProxy('test');
console.log(proxy.TEST(args), '\n');
console.log(proxy.TEST2(args), '\n');

console.log('---Test category and subcategory proxies---');
let testCategoryProxy: LocalizationResourceProxy<any> = Localization.getResourceProxy(['test', 'test']);
let testSubcategoryProxy: LocalizationResourceProxy<any> = Localization.getResourceProxy(['test', 'test', 'test']);
console.log('Category proxy test: ', testCategoryProxy.TEST(), '\n');
console.log('Subcategory proxy test: ', testSubcategoryProxy.TEST({ foo: 'bar' }), '\n');

console.log('---Test one-line strings---');
console.log(Localization.resource('test', 'FOO'));
console.log(Localization.resource('test', 'BAR'));

console.log('\n');
