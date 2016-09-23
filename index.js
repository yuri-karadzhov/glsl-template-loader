'use strict';

const fs = require('fs');
const path = require('path');
const babelCore = require('babel-core');
const babelPresetEs2015 = require('babel-preset-es2015');
const Promise = require('bluebird');
const chalk = require('chalk');
const glsl = require('glsl-man');
const leftPad = require('left-pad');


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


function printError(loader, err) {
  let s = '\t' + chalk.red(err.message);
  if(err.details) {
    s += '\n' + chalk.yellow(err.details);
  }

  const emitter = loader.emitError; // or loader.emitWarning
  emitter(s);
}


function printParseError(loader, source, err) {
  let s = chalk.red(err.name) + ': ' + chalk.white(err.message);
  s += '\n';
  // Get the line in question
  const lines = source.split('\n');
  const contextLineCount = 2;
  const errStartLine = err.location.start.line - 1;
  const errEndLine = err.location.end.line - 1;

  const startLine = Math.max(errStartLine - contextLineCount, 0);
  const endLine = Math.min(errEndLine + contextLineCount, lines.length - 1);

  const trayWidth = endLine.toString().length;
  const traySep = '| ';
  // const trayWidthReal = trayWidth + traySep.length;

  for(let i = startLine; i <= endLine; i++) {
    s += '\n' + chalk.dim.white(leftPad(i, trayWidth) + traySep) + lines[i];
    if(i === errStartLine) {
      const startCol = err.location.start.column;
      const endCol = err.location.end.column;
      s += (
        '\n' +
        ' '.repeat(trayWidth) +
        chalk.dim.white(traySep) +
        ' '.repeat(startCol - 1) +
        chalk.red(
          '^' +
          (startLine === endLine ? '-'.repeat(endCol - startCol - 1) : '')
        )
      );
    }
  }

  const emitter = loader.emitError; // or loader.emitWarning
  emitter(s);
}


function transformChunks(source, opts, loader, callback) {
  let ast;
  try {
    ast = glsl.parse(source);
  } catch(err) {
    printParseError(loader, source, err);
    callback(err);
    return;
  }

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
    printError(loader, err);
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
    } catch(babelErr) {
      printError(this, babelErr);
      _callback(babelErr);
    }
  };

  const opts = {
    varPrefix: (this.options.glsl && this.options.glsl.varPrefix) || DEFAULT_VAR_PREFIX
  };

  transformChunks(source, opts, this, callback);
};
