const gulp = require('gulp');
const gulp_ts = require('gulp-typescript');
const gulp_sourcemaps = require('gulp-sourcemaps');
const del = require('del');

const project = gulp_ts.createProject('tsconfig.json');

let _linter;
let _gulp_tslint;
let _tslint;

const gulp_tslint = () => _gulp_tslint = _gulp_tslint || require('gulp-tslint');
const tslint = () => _tslint = _tslint || require('tslint');
const linter = () => _linter = _linter || tslint().Linter.createProgram('tsconfig.json');

gulp.task('lint', () => {
	return gulp.src('src/**/*.ts')
		.pipe(gulp_tslint()({
			configuration: 'tslint.json',
			formatter: 'prose',
			program: linter()
		}))
		.pipe(gulp_tslint().report());
})

gulp.task('build', () => {
	del.sync(['bin/**/*.*']);
	const tsCompile = gulp.src('src/**/*.ts')
		.pipe(gulp_sourcemaps.init({ base: 'src' }))
		.pipe(project());

	tsCompile.pipe(gulp.dest('bin/'));

	gulp.src('src/**/*.js').pipe(gulp.dest('bin/'));
	gulp.src('src/**/*.json').pipe(gulp.dest('bin/'));
	gulp.src('src/**/*.lang').pipe(gulp.dest('bin/'));

	return tsCompile.js
		.pipe(gulp_sourcemaps.write('.', { sourceRoot: '../src' }))
		.pipe(gulp.dest('bin/'));
});

gulp.task('default', gulp.series('build'));
gulp.task('build:vscode', gulp.series('lint', 'build'));
