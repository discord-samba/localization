import * as FS from 'fs';

export class ParseError extends Error
{
	public name: string = this.constructor.name;

	public constructor(message: string, container: string, line: number, column: number)
	{
		super(message);

		let fileContents!: string;
		try { fileContents = FS.readFileSync(container)?.toString(); }
		catch {}

		let stack: string[] = this.stack?.split('\n') ?? [];
		stack.push('');

		if (typeof fileContents !== 'undefined')
		{
			stack.push(`${container}:${line}`);
			const lines: string[] = fileContents.split('\n');
			const errorLine: string = ` ${line} | ${lines[line - 1]}`;
			const arrow: string = ' '.repeat(line.toString().length + column + 3) + '^';
			stack.push('');
			stack.push(errorLine);
			stack.push(arrow);
			stack.push('');
			stack.push(`${this.name}: ${this.message}`);
		}
		else
		{
			stack.push(`${this.name}: ${this.message}`);
		}

		stack.push(`    at Localization Container (${container}:${line}:${column})`);
		stack.push('');

		this.stack = stack.join('\n');
	}
}
