import * as FS from 'fs';
import { LocalizationResrouceMetaData } from './types/LocalizationResourceMetaData';

/**
 * Represents a runtime error in the Localization engine
 */
export class LocalizationStringError extends Error
{
	public name: string;

	public constructor(
		message: string,
		container: string,
		line: number,
		column: number,
		_meta: LocalizationResrouceMetaData = {}
	)
	{
		super(message);
		this.name = this.constructor.name;

		let fileContents!: string;
		try { fileContents = FS.readFileSync(container)?.toString(); }
		catch {}

		const stack: string[] = [];
		stack.push('');

		if (typeof fileContents !== 'undefined')
		{
			stack.push(`${container}:${line}`);
			const lines: string[] = fileContents.split('\n');
			const errorLine: string = ` ${line} | ${lines[line - 1]}`;
			const arrow: string = `${' '.repeat(line.toString().length + column + 3)}^`;
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
		if (typeof _meta._cl !== 'undefined')
			stack.push(_meta._cl);

		stack.push('');

		this.stack = stack.join('\n');
	}
}
