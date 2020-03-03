import * as FS from 'fs';

/**
 * Represents a parse-time error in the Localization engine
 */
export class ParseError extends Error
{
	public readonly name: string;
	public readonly message!: string;
	public readonly stack!: string;

	public constructor(message: string, container: string, line: number, column: number)
	{
		super(message);
		this.name = this.constructor.name;

		let fileContents!: string;
		try { fileContents = FS.readFileSync(container)?.toString(); }
		catch {}

		const oldStack: string[] = this.stack.split('\n').slice(1);
		const newStack: string[] = [];

		if (typeof fileContents !== 'undefined')
		{
			const lines: string[] = fileContents.replace(/\t/g, ' ').split('\n');
			const errorLine: string = ` ${line} | ${lines[line - 1]}`;
			const arrow: string = '^'.padStart(line.toString().length + column + 4);

			newStack.push(`${container}:${line}`, '', errorLine, arrow, '', `${this.name}: ${this.message}`);
		}
		else
		{
			newStack.push(`${this.name}: ${this.message}`);
		}

		newStack.push(`    at Localization Container (${container}:${line}:${column})`, ...oldStack, '');

		this.stack = newStack.join('\n');
	}
}
