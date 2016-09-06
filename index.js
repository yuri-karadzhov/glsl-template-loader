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

function transformChunks(source, {chunksPath, chunksExt, varPrefix}, addDependency, callback) {
  Promise.all([...new Set(source.match(/#include\s[\w\-]+/g))].map(fileName => {
    const chunkPath = path.resolve(`${chunksPath}/${fileName.substr(9).trim()}.${chunksExt}`);
    addDependency(chunkPath);
    return readFile(chunkPath, 'utf-8');
  }))
    .then(files => {
      files.forEach(file => {
        const re = new RegExp(`#include\\s${path.basename(file.path, `.${chunksExt}`)}\\s;`, 'g');
        source = source.replace(re, file.content);
      });
      callback(null, `module.exports = opts => ${transformVars(source, varPrefix)};`);
    })
    .catch(err => {
      console.err(err);
      callback(null, `module.exports = opts => ${transformVars(source, varPrefix)};`);
    });
}

module.exports = function(source) {
  this.cacheable();
  const callback = this.async();
  const addDependency = this.addDependency.bind(this);
  const chunksPath = (this.options.glsl && this.options.glsl.chunksPath) || DEFAULT_CHUNKS_PATH;
  const chunksExt = (this.options.glsl && this.options.glsl.chunksExt) || DEFAULT_CHUNKS_EXT;
  const varPrefix = (this.options.glsl && this.options.glsl.varPrefix) || DEFAULT_VAR_PREFIX;
  transformChunks(source, {chunksPath, chunksExt, varPrefix}, addDependency, callback);
};
