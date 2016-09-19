const fs = require('fs');
const path = require('path');

const DEFAULT_CHUNKS_PATH = './src/chunks';
const DEFAULT_CHUNKS_EXT = 'glsl';
const DEFAULT_VAR_PREFIX = '$';

function readFile(filePath, options) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, options, (err, content) => {
      if(err) return reject(err);
      return resolve({
        path: filePath,
        content
      });
    });
  });
}

function transformVars(source, varPrefix) {
  const varRe = new RegExp(`\\${varPrefix}([\\w^\\d]\\w*)`, 'g');
  return '`' + source.replace(varRe, '${opts.$1}') + '`';
}

function transformChunks(source, opts, addDependency, callback) {
  const matches = [...new Set(source.match(/#include\s+[\w\-]+/g))];
  Promise.all(matches.map(fileName => {
    const chunkPath = path.resolve(`${opts.chunksPath}/${fileName.substr(9).trim()}.${opts.chunksExt}`);
    addDependency(chunkPath);
    return readFile(chunkPath, 'utf-8');
  }))
    .then(files => {
      files.forEach(file => {
        const re = new RegExp(`#include\\s+${path.basename(file.path, `.${opts.chunksExt}`)}\\s*;`, 'g');
        source = source.replace(re, file.content);
      });
      callback(null, `module.exports = opts => ${transformVars(source, opts.varPrefix)};`);
    })
    .catch(err => {
      console.err('glsl-template-loader: ', err);
      callback(null, `module.exports = opts => ${transformVars(source, opts.varPrefix)};`);
    });
}

module.exports = function(source) {
  this.cacheable();
  const callback = this.async();
  const addDependency = this.addDependency.bind(this);
  const opts = {
    chunksPath: (this.options.glsl && this.options.glsl.chunksPath) || DEFAULT_CHUNKS_PATH,
    chunksExt: (this.options.glsl && this.options.glsl.chunksExt) || DEFAULT_CHUNKS_EXT,
    varPrefix: (this.options.glsl && this.options.glsl.varPrefix) || DEFAULT_VAR_PREFIX
  };
  transformChunks(source, opts, addDependency, callback);
};
