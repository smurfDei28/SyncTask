const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

module.exports = function domainLoader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const localRequire = specifier => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier.startsWith('@/')) return load('src/' + specifier.slice(2) + '.ts');
      if (specifier.startsWith('.')) return load(path.resolve(path.dirname(absolute), specifier + '.ts'));
      return require(specifier);
    };
    new Function('exports', 'require', code)(exports, localRequire);
    return exports;
  }
  return load;
};
