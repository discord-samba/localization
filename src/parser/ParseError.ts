import * as FS from 'fs';

/**
 * Represents a parse-time error in the Localization engine
 */
export class ParseError extends Error
{
	public name: string;

	public constructor(message: string, container: string, line: number, column: number)
	{
		super(message);
		this.name = this.constructor.name;

		let fileContents!: string;
		try { fileContents = FS.readFileSync(container)?.toString(); }
		catch {}

		// Switch back to this when typescript-eslint no longer errors on ??
		// // const oldStack: string[] = this.stack?.split('\n') ?? [];
		const oldStack: string[] = (Boolean(this.stack?.split('\n')) ? this.stack?.split('\n')! : []).slice(1);
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
