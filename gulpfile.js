/* eslint-disable @typescript-eslint/typedef */
const gulp = require('gulp');
const typescript = require('gulp-typescript');
const eslint = require('gulp-eslint');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');

const project = typescript.createProject('tsconfig.json');

gulp.task('lint', () =>
	gulp.src('src/**/*.ts')
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError()));

gulp.task('build', () =>
{
	del.sync(['bin/**/*.*']);
	const tsCompile = gulp.src('src/**/*.ts')
		.pipe(sourcemaps.init({ base: 'src' }))
		.pipe(project());

	tsCompile.pipe(gulp.dest('bin/'));

	gulp.src('src/**/*.js').pipe(gulp.dest('bin/'));
	gulp.src('src/**/*.json').pipe(gulp.dest('bin/'));
	gulp.src('src/**/*.lang').pipe(gulp.dest('bin/'));

	return tsCompile.js
		.pipe(sourcemaps.write('.', { sourceRoot: '../src' }))
		.pipe(gulp.dest('bin/'));
});

gulp.task('gh-prebuild-prepare', cb => {
	del.sync([
		'../indev-build/**',
		'../indev-build/.*',
		'!../indev-build',
		'!../indev-build/.git',
		'!../indev-build/.git/**'
	], { force: true });
	gulp.src('bin/**/*.*').pipe(gulp.dest('../indev-build/bin'));
	gulp.src('package.json').pipe(gulp.dest('../indev-build'));

	return cb();
});

gulp.task('default', gulp.series('lint', 'build'));
