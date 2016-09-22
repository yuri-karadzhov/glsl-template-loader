const fs = require('fs');
const path = require('path');
const babelCore = require('babel-core');
const babelPresetEs2015 = require('babel-preset-es2015');
const Promise = require('bluebird');
const chalk = require('chalk');
const glsl = require('glsl-man');


const DEFAULT_VAR_PREFIX = '$';


function readFileAsync(filePath, options) {
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


function resolveAsync(loader, context, request) {
  return new Promise((resolve, reject) => {
    loader.resolve(
      context,
      request,
      (err, res) => {
        if(err) {
          reject(err);
        } else {
          resolve(res);
        }
      }
    );
  });
}


function printError(currentFile, err) {
  console.error('\n');
  console.error(`glsl-template-loader error: ${currentFile}`);
  console.error('\t' + chalk.red(err.message));
  if(err.details) {
    console.error(chalk.yellow(err.details));
  }
  console.error('\n');
}


function transformChunks(source, opts, loader, callback) {
  const ast = glsl.parse(source);
  const includes = glsl.query.all(
    ast,
    glsl.query.selector('preprocessor[directive]')
  ).filter(include => include.directive === '#include');

  Promise.map(includes, node => {
    const requestedInclude = node.value.replace(/;/g, '');
    return resolveAsync(
      loader,
      path.dirname(loader.resource),
      requestedInclude
    ).then(chunkPath => {
      loader.addDependency(chunkPath);
      return readFileAsync(chunkPath, 'utf-8');
    }).then(file => {
      return {
        file: file,
        node: node
      };
    });
  }).then(matches => {
    matches.forEach(match => {
      const subTree = glsl.parse(match.file.content);
      glsl.mod.replace(match.node, subTree);
    });

    const newSource = glsl.string(ast);
    callback(null, `module.exports = opts => ${transformVars(newSource, opts.varPrefix)};`);
  }).catch(err => {
    printError(loader.resource, err);
    callback(err);
  });
}


module.exports = function(source) {
  this.cacheable();
  const _callback = this.async();
  const callback = (err, transformedSource) => {
    if(err) {
      return _callback(err, transformedSource);
    }
    try {
      const code = babelCore.transform(transformedSource, {
        presets: [babelPresetEs2015],
        babelrc: false,
        ast: false,
        compact: true,
        minified: true,
        retainLines: true
      }).code;
      _callback(null, code);
    } catch(e) {
      console.error('glsl-template-loader: babel transform failed:', e);
      _callback(e);
    }
  };

  const opts = {
    varPrefix: (this.options.glsl && this.options.glsl.varPrefix) || DEFAULT_VAR_PREFIX
  };

  transformChunks(source, opts, this, callback);
};
