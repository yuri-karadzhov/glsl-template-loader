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
  varPrefix: '$'
}
```

## Write some shaders
shader.vert
```
attribute vec2 a_Position;
attribute vec3 a_Color;

varying vec3 v_Color;

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
  // Note that we use $count.0 to pass float value
  return vec3(color.r / $count.0, color.g, color.b);
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
const vertexShader = createVertexShader({reduce: 5});
const fragmentShader = createFragmentShader({reduce: 2});
```

## License
[MIT](http://www.opensource.org/licenses/mit-license.php)
