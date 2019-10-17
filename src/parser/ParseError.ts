import * as FS from 'fs';

/**
 * Represents a parse-time error in the Localization engine
 */
export class ParseError
{
	public name: string;
	public message: string;
	public stack!: string;

	public constructor(message: string, container: string, line: number, column: number)
	{
		this.message = message;
		this.name = this.constructor.name;

		// We're not extending the base Error class to avoid local filesystem
		// information being included in typedoc output, since it will link
		// inherited things to their source in the local node_modules
		Error.captureStackTrace(this);

		let fileContents!: string;
		try { fileContents = FS.readFileSync(container)?.toString(); }
		catch {}

		const oldStack: string[] = this.stack.split('\n').slice(1);
		const newStack: string[] = [];

		if (typeof fileContents !== 'undefined')
		{
			newStack.push(`${container}:${line}`);
			const lines: string[] = fileContents.split('\n');
			const errorLine: string = ` ${line} | ${lines[line - 1]}`;
			const arrow: string = `${' '.repeat(line.toString().length + column + 3)}^`;
			newStack.push('');
			newStack.push(errorLine);
			newStack.push(arrow);
			newStack.push('');
			newStack.push(`${this.name}: ${this.message}`);
		}
		else
		{
			newStack.push(`${this.name}: ${this.message}`);
		}

		newStack.push(`    at Localization Container (${container}:${line}:${column})`);
		newStack.push(...oldStack);
		newStack.push('');

		this.stack = newStack.join('\n');
	}
}
