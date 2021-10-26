var gulp = require('gulp');
var i18n = require('.');
const beautify = require('gulp-jsbeautifier');
const prettier = require('gulp-prettier');

gulp.task('generate-translation', function () {
    var files = gulp.src("./language.csv");
    var langMap = {
        'en-us': "en-us",
        'fr-fr': "fr-fr"
    };

    return files.pipe(i18n({
            'moduleFile': "myStrings.d.ts",
            'keyColumnName': "key",
            'langMap': langMap,
            'interfaceName': "IPwaReactWebPartStrings",
            'moduleName': "PwaReactWebPartStrings",
            'separator': ";"
        }))
        .pipe(beautify())
        .pipe(gulp.dest('./language'));
})

gulp.task('ts-beautify', gulp.series('generate-translation', function (done) {
    gulp.src('./language/mystrings.d.ts')
        .pipe(prettier({
            singleQuote: true
        }))
        .pipe(gulp.dest('./language'));
    done();
}));

gulp.task('gulp-spfx-localization', gulp.series('ts-beautify'));