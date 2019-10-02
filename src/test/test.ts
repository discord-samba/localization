import { StringReader } from '../parser/StringReader';
import { Parser } from '../parser/Parser';
import * as Path from 'path';
import * as FS from 'fs';

// import { NodeKindImplScriptTemplate } from '../classes/NodeKindImplScriptTemplate';
// import { NodeKindImplParentNode } from '../classes/NodeKindImplParentNode';

// let parent: NodeKindImplParentNode = new NodeKindImplParentNode('Foo.lang', 'FOO_BAR_BAZ', 1, 1);

// let a: NodeKindImplScriptTemplate = new NodeKindImplScriptTemplate(`return 1 + 1;`, 2, parent, 1, 1);
// let b: NodeKindImplScriptTemplate = new NodeKindImplScriptTemplate(`throw new Error('Testing');`, 4, parent, 3, 1);
// let c: NodeKindImplScriptTemplate = new NodeKindImplScriptTemplate(`foo();
// bar());
// baz();
// boo();`, 6, parent, 5, 1);

// console.log(a);
// console.log(b);
// console.log(c);
// console.log('Tests run');
// b.fn(null, null);

let reader: StringReader = new StringReader('FooBarBaz\nBooFarFaz');
console.log(reader.peekSegment(2, 2));
console.log(reader.peek());
console.log(reader.consume(3));
console.log(reader.peek());
console.log(reader.consume(3));
console.log(reader.peek());
console.log(reader.peekBehind());
console.log(reader.consume(3));
console.log(reader.peek());

let parser: Parser = new Parser();

let foo = 
// 	parser.parse('en-US.test.lang',
// `[STRING_TEST]
// FooBarBaz ## comment
// BooFarFaz \\## escaped comment

// [TEMPLATE_TEST]
// Foo{{ bar }}Baz

// [MAYBE_TEST]
// Foo{{bar?}}baz

// [FORWARD_TEST]
// Foo{{>bar}}baz

// [SCRIPT_TEST]
// Foo {{!
// 	'BAR'	
// !}} baz

// [SCRIPT_TEST_2]
// Foo{{!'BARBAR'!}} baz

// [COMMENT_TEST]
// ## first comment
// test ## second comment
// ## third comment

// [TYPES_TEST]
// ##! foo: string, bar: number

// [ESCAPED_TEMPLATE_TEST]
// \\{{ foo }}`);

parser.parse('test_lang.lang', FS.readFileSync(Path.join(__dirname, './test_lang.lang')).toString().replace(/\r\n/g, '\n'));

console.log(foo);