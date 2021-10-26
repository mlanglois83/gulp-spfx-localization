var through = require('through2');
var csv = require('csv-parser');
var fs = require('fs');
var File = require('vinyl');
var log = require('fancy-log');
const c = require('ansi-colors');

var PLUGIN_NAME = 'gulp-spfx-localization';
var KEY_COLUMN = 'key';


function toLowerCaseFormat(arr) {
	if (Array.isArray(arr)) {
		return arr.map(function (v) {
			return String(v).toLocaleLowerCase()
		})
	} else {
		return [String(arr).toLocaleLowerCase()]
	}
}

function gulpSpfxLocalization(opt) {


	var outjson = {};
	var keyCol = []; 
	var languages = [];
	opt = opt || {separator:","};

	if (typeof opt.langMap) {
		var langMap = {}
		for (var k in opt.langMap) {
			var langName = k.toLocaleLowerCase();
			if (typeof langMap[langName] != 'undefined') {
				gutil.log(PLUGIN_NAME, "langMap key Repeat")
			};
			langMap[langName] = opt.langMap[k]
		}
		opt.langMap = langMap;
	}

	if (!opt.keyColumnName) opt.keyColumnName = KEY_COLUMN

	var formatOpt = ['passColumns'];

	formatOpt.forEach(function (key) {
		opt[key] = opt[key] ? toLowerCaseFormat(opt[key]) : undefined;
	})


	function isSkipColumn(ColumnName) {
		if (isKeyColumnName(ColumnName)) return true;
		if (opt.passColumns) {
			var passCol = opt.passColumns;
			for (var i = 0; i < passCol.length; i++) {
				if (passCol[i].toLocaleLowerCase() == ColumnName.toLocaleLowerCase()) {
					return true;
				}
			}
		}
	}

	function isKeyColumnName(ColumnName) {
		return (ColumnName.toLocaleLowerCase() === opt.keyColumnName.toLocaleLowerCase());
	}

	function getKeyColumnName(obj) {
		var refname;
		for (var k in obj) {
			if (isKeyColumnName(k)) {
				refname = obj[k];
				break;
			}
		}
		return refname;
	}

	function toLangName(str) {
		var langname;
		if (isSkipColumn(str)) return;
		if (str === "undefined") return;
		langname = str.toLocaleLowerCase();
		if (typeof opt.langMap == 'object') {
			langname = opt.langMap[langname] ? opt.langMap[langname] : langname;
		}
		return langname;
	}

	function setMap(obj, map, v, path) {

		if (map.length == 1) {
			if (obj.hasOwnProperty(map[0])) {
				log('key repeat!', c.green(opt.keyColumnName), ">>", c.magenta(map[0]));
			}
			obj[map[0]] = v;
		} else {
			var a0 = map.shift();
			if (obj[a0] == undefined) {
				obj[a0] = {}
			}
			if (typeof obj[a0] == "object") {
				setMap(obj[a0], map, v, [].concat(path || [], [a0]))
			} else {
				var key = [].concat([a0], map).join('.');
				obj[key] = v;
				log('key path conflict!', c.green(opt.keyColumnName), ">>", c.magenta([].concat(path || [], [a0], map).slice(1).join('.')));
			}
		}
	}

	function csv2json(array, noNested) {
		array.forEach(function (v) {
			var refname = getKeyColumnName(v);
			if (refname) {
				if(keyCol.indexOf(refname === -1)) {
					keyCol.push(refname);
					map = opt.nosplit ? [refname] : refname.split('.');
					for (k in v) {						
						var langname = toLangName(k);
						if (langname) {
							if(languages.indexOf(langname) === -1){
								languages.push(langname);
							}
							if (noNested) {
								if (!outjson[langname]) {
									outjson[langname] = {};
								}
								outjson[langname][refname] = v[k];
							} else {
								setMap(outjson, [langname].concat(map), v[k]);
							}
						}
					}
				}
				
			}
		})
	}

	function generateInterface(keys) {
		var str = "declare interface " + opt.interfaceName + " { [TRANSLATIONKEY] }";
		var allTranslationKey = "";
		for (const k of keys) {			
			allTranslationKey += [k.trim(), 'string;'].join(":");
		}

		str = str.replace("[TRANSLATIONKEY]", allTranslationKey);
		return str;
	}

	function generateDefinitionType(keys) {
		var str = "";
		if(!opt.externalInterface) {
			str = generateInterface(keys) + " ";
		}
		str += "declare module '" + opt.moduleName + "' { const strings: " + opt.interfaceName + ";	export = strings;}";
		return str;
	}
	
	return through.obj(function (file, enc, cb) {
		
		const results = [];
		fs.createReadStream(file.path).pipe(csv({separator:opt.separator}))
		.on('data', (data) => {
			results.push(data);
		})
		.on('end', () => {
			csv2json(results);	
			cb();
		});
	}, function (cb) {		
		for (const lan of languages) {
			var nfile;
			nfile = new File({
				path: lan + '.js',
				contents: Buffer.from("define([], function() { return {" + Object.keys(outjson[lan]).map((k) => {
					if(outjson[lan][k] !== undefined && outjson[lan][k] !== null && outjson[lan][k]!== "") {
						return '"' + k.trim() + '":' + JSON.stringify(outjson[lan][k]); 
					}
					return '"' + k.trim() + '":' + JSON.stringify(outjson[toLangName(opt.fallback)][k]); 
				}).join(',')  + "}});", 'utf-8')
			});
			this.push(nfile);
		}
		nfile = new File({
			path: opt.moduleFile || "myStrings.d.ts",
			contents: Buffer.from(generateDefinitionType(keyCol), 'utf-8')
		});
		this.push(nfile);
		if(opt.externalInterface) {
			nfile = new File({
				path: opt.externalInterface,
				contents: Buffer.from(generateInterface(keyCol), 'utf-8')
			});
			this.push(nfile);
		}
		cb();
	});
};

module.exports = gulpSpfxLocalization;