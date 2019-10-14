import { StringReader } from '../../parser/StringReader';

describe('Reading strings with StringReader', () =>
{
	it('Should advance by a given amount (consume, discard)', () =>
	{
		const reader: StringReader = new StringReader('foobarbaz');
		expect(reader.column).toBe(1);

		reader.consume();
		expect(reader.column).toBe(2);
		reader.consume(2);
		expect(reader.column).toBe(4);

		reader.discard();
		expect(reader.column).toBe(5);
		reader.discard(2);
		expect(reader.column).toBe(7);
	});

	it('Should do nothing if advancing by a negative number (consume, discard)', () =>
	{
		const reader: StringReader = new StringReader('foobarbaz');
		expect(reader.consume(-1)).toBe('');
		expect(reader.line).toBe(1);
		expect(reader.column).toBe(1);
		reader.discard(-1);
		expect(reader.line).toBe(1);
		expect(reader.column).toBe(1);
	});

	it('Should properly handle newlines (consume, discard)', () =>
	{
		let reader: StringReader = new StringReader('foo\nbar\nbaz');
		reader.discard(4);
		expect(reader.line).toBe(2);
		expect(reader.column).toBe(1);

		reader = new StringReader('foo\nbar\nbaz');
		reader.consume(4);
		expect(reader.line).toBe(2);
		expect(reader.column).toBe(1);

		reader = new StringReader('foo\nbar\nbaz');
		reader.discard(10);
		expect(reader.line).toBe(3);
		expect(reader.column).toBe(3);

		reader = new StringReader('foo\nbar\nbaz');
		reader.consume(10);
		expect(reader.line).toBe(3);
		expect(reader.column).toBe(3);
	});

	it('Should peek ahead by a given amount', () =>
	{
		const reader: StringReader = new StringReader('foo\nbar\nbaz');
		expect(reader.peek()).toBe('f');
		expect(reader.peek(5)).toBe('a');
	});

	it('Should peek a segment of given length', () =>
	{
		const reader: StringReader = new StringReader('foo\nbar\nbaz');
		expect(reader.peekSegment(5)).toBe('foo\nb');
	});

	it('Should peek a segment with an offset', () =>
	{
		const reader: StringReader = new StringReader('foo\nbar\nbaz');
		expect(reader.peekSegment(5, 3)).toBe('\nbar\n');
	});

	it('Should peek behind by a given amount', () =>
	{
		const reader: StringReader = new StringReader('foo\nbar\nbaz');
		reader.discard(10);
		expect(reader.peekBehind()).toBe('a');
		expect(reader.peekBehind(6)).toBe('b');
	});

	it('Should identify EOF', () =>
	{
		const reader: StringReader = new StringReader('foo\nbar\nbaz');
		reader.discard(11);
		expect(reader.eof()).toBe(true);
	});
});
