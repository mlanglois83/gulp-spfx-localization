
# gulp-spfx-localization

Auto generate localization file based on a csv file

## Install

npm install gulp-spfx-localization --save-dev

## Demo

### Excel File

#### Example

```html
| key   | en-US | fr-FR |
|-------|-------|-------|
| Title | Title | Titre |
| Name  | Name  | Nom   |
```

### gulpfile.js

```js
var gulp = require('gulp');
var i18n = require('.');
const beautify = require('gulp-jsbeautifier');
const prettier = require('gulp-prettier');

// Generate en-us.js and fr-fr.js translation
gulp.task('generate-translation', function () {
    // Input Excel file
    var files = gulp.src("./language.csv");

    //Mapping of each language
    var langMap = {
        'en-us': "en-us",
        'fr-fr': "fr-fr"
    };

    return files.pipe(i18n({
            'keyColumnName': "key",
            'langMap': langMap,
            'fallback': 'en-us', // key of fallback language
            'interfaceName': "IPwaReactWebPartStrings",
            'moduleName': "PwaReactWebPartStrings",            
            'passColumns': ['Comment'],
            'separator': ";"
        }))
        .pipe(beautify())
        .pipe(gulp.dest('./language'));
})

//Beautify TS file
gulp.task('ts-beautify', ['generate-translation'], function () {
    return gulp.src('./language/mystrings.d.ts')
        .pipe(prettier({
            singleQuote: true
        }))
        .pipe(gulp.dest('./language'));
});

gulp.task('spfx-localization', ['ts-beautify']);
```

Run `gulp spfx-localization`  

### output

```js
// ./language/en-us.js
define([], function() {
    return {
        /*************** sheet 1 ***************/
        "Title": "Title",
        /*************** sheet 2 ***************/
        "Name": "Name"
    }
});

// ./language/fr-fr.js
define([], function() {
    return {
        /*************** sheet 1 ***************/
        "Title": "Titre",
        /*************** sheet 2 ***************/
        "Name": "Nom"
    }
});

// ./language/mystrings.d.ts
declare interface IPwaReactWebPartStrings {
  Title: 'Titre';
  Name: 'Nom';
}
declare module 'PwaReactWebPartStrings' {
  const strings: IPwaReactWebPartStrings;
  export = strings;
}


```
