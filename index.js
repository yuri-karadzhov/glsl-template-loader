const fs = require('fs');
const path = require('path');
const glsl = require('glsl-man');
const babel = require('babel-core');

const DEFAULT_ROOT_PATH = '/';
const DEFAULT_CHUNKS_EXT = 'glsl';
const DEFAULT_VAR_PREFIX = '$';

function resolveDependency(loader, context, chunkPath) {
  return new Promise((resolve, reject) => {
    loader.resolve(context, chunkPath, (err, res) => {
      if(err) reject(err);
      else resolve(res);
    });
  });
}

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

function checkGLSL(source, callback) {
  try {
    const ast = glsl.parse(source);
    return ast;
  } catch(err) {
    callback(err);
  }
}

function transformVars(source, varPrefix) {
  const varRe = new RegExp(`\\${varPrefix}([\\w^\\d]\\w*)`, 'g');
  return '`' + source.replace(varRe, '${opts.$1}') + '`';
}

function transformBabel(source, callback) {
  try {
    const code = babel.transform(source, {
      plugins: ['transform-es2015-template-literals'],
      babelrc: false,
      ast: false,
      compact: true,
      minified: true,
      retainLines: true
    }).code;
    callback(null, code);
  } catch(err) {
    callback(err);
  }
}

function transformChunks(source, {rootPath, chunksExt, varPrefix, es5}, loader) {
  loader.cacheable();
  const callback = loader.async();
  const ast = checkGLSL(source, callback);
  if(!ast) return;
  Promise.all(
    glsl.query.all(ast, glsl.query.selector('preprocessor[directive="#include"]')).map(node => {
      let includePath = node.value.trim().slice(0, -1);
      const ext = path.extname(includePath);
      if(!ext) includePath = `${includePath}.${chunksExt}`;
      const isAbsolute = path.isAbsolute(includePath);
      const context = isAbsolute ? path.resolve(rootPath) : path.dirname(loader.resource);
      if(isAbsolute) includePath = `.${includePath}`;
      return resolveDependency(loader, context, includePath)
        .then(chunkPath => {
          loader.addDependency(chunkPath);
          return readFile(chunkPath, 'utf-8');
        })
        .then(file => {
          const astChunk = glsl.parse(file.content);
          glsl.mod.replace(node, astChunk);
        });
    })
  ).then(() => {
    const fullSrc = glsl.string(ast);
    const transformedSrc = `module.exports = opts => ${transformVars(fullSrc, varPrefix)};`;
    if(es5) {
      transformBabel(transformedSrc, callback);
    } else {
      callback(null, transformedSrc);
    }
  }).catch(err => callback(err));
}

module.exports = function(source) {
  const rootPath = (this.options.glsl && this.options.glsl.rootPath) || DEFAULT_ROOT_PATH;
  const chunksExt = (this.options.glsl && this.options.glsl.chunksExt) || DEFAULT_CHUNKS_EXT;
  const varPrefix = (this.options.glsl && this.options.glsl.varPrefix) || DEFAULT_VAR_PREFIX;
  const es5 = (this.options.glsl && this.options.glsl.es5 !== undefined) ? this.options.glsl.es5 : true;
  transformChunks(source, {rootPath, chunksExt, varPrefix, es5}, this);
};
