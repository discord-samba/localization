export class ParseError extends Error
{
	public name: string = this.constructor.name;

	public constructor(message: string, container: string, line: number, column: number)
	{
		super(message);

		let stack: string[] = [];
		stack.push(`${this.name}: ${this.message}`);
		stack.push(`    at Localization Container (${container}:${line}:${column})`);
		
		this.stack = stack.join('\n');
	}
}