# GLSL Webpack loader that support variables and #include directive.

## Install
```npm install glsl-template-loader --save-dev```

## Config Webpack
```
module: {
  loaders: [{
    test: /\.(glsl|vert|frag)$/,
    loader: 'shader'
  }]
},
// Default values (can be ommited)
glsl: {
  chunksPath: path(__dirname, '/src/chunks'),
  chunksExt: 'glsl',
  varPrefix: '$' // Every valid name that starts with this symbol will be treated as a template variable
}
```

## Write some shaders
shader.vert
```
attribute vec2 a_Position;
attribute vec3 a_Color;

varying vec3 v_Color;

// The content of chunks/reduce-red.glsl file will be inlined here
#include reduce-red;

void main(void) {
  v_Color = reduceR(a_Color);
  gl_Position = vec4(a_Position, 0.0, 1.0);
}
```
shader.frag
```
precision highp float;

varying vec3 v_Color;

#include reduce-red;

void main() {
  gl_FragColor = vec4(reduceR(v_Color), 0.5);
}
```
chunks/reduce-red.glsl
```
vec3 reduceR(vec3 color) {
  // We arge going to use a template variable $reduce
  // Note that we use $reduce.0 to pass float value
  // And we expect to pass integer values to template
  // Alternatively we can use cast float($reduce)
  return vec3(color.r / $reduce.0, color.g, color.b);
}
```

## Import your shader templates
```
import createVertexShader from 'shader.vert';
import createFragmentShader from 'shader.frag';
```
or
```
const createVertexShader = require('shader.vert');
const createFragmentShader = require('shader.frag');
```

## Create shaders
```
// That how we pass our reduce variable to templates
const vertexShader = createVertexShader({reduce: 5});
const fragmentShader = createFragmentShader({reduce: 2});
```

## License
[MIT](http://www.opensource.org/licenses/mit-license.php)
