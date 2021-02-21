/* eslint-disable @typescript-eslint/typedef */

const { Application, TSConfigReader, ParameterType } = require('typedoc');
const app = new Application();

app.options.addReader(new TSConfigReader());

app.bootstrap({
	target: 'es2017',
	mode: 'file',
	module: 'commonjs',
	theme: 'node_modules/@discord-samba/typedoc-themes/bin/default',
	exclude: './**/+(node_modules|__test__|)/**/*.ts',
	excludePrivate: true,
	out: '../docs',
	gitRevision: 'main',
});

app.options.addDeclaration({ name: 'links', type: ParameterType.Mixed });
app.options.setValue(
	'links',
	[
		{
			label: 'Command',
			url: 'https://discord-samba.github.io/command/docs'
		},
		{
			label: 'Localization',
			url: 'https://discord-samba.github.io/localization/docs',
			current: true
		},
		{
			label: 'Logger',
			url: 'https://discord-samba.github.io/logger/docs'
		}
	]
);

const project = app.convert(app.expandInputFiles(['src']));

if (typeof project !== 'undefined')
	app.generateDocs(project, app.options.getValue('out'));
