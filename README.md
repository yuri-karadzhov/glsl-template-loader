# GLSL Webpack loader that support variables and #include directive.

## Install
```npm install glsl-template-loader --save-dev```

## Config Webpack
``` js
module: {
  loaders: [{
    test: /\.(glsl|vert|frag)$/,
    loader: 'shader'
  }]
},
// Default values (can be omitted)
glsl: {
  rootPath: '/', // Path to look absolute path chunks at
  chunksExt: 'glsl', // Chunks extension
  varPrefix: '$', // Every valid name that starts with this symbol will be treated as a template variable
  es5: true // Produce template compatible with es5 browsers (IE11)
}
```

## Write some shaders
shader.vert
``` glsl
attribute vec2 a_Position;
attribute vec3 a_Color;

varying vec3 v_Color;

// The content of chunks/reduce-red.glsl file will be inlined here
#include chunks/reduce-red.glsl;

void main(void) {
  v_Color = reduceR(a_Color);
  gl_Position = vec4(a_Position, 0.0, 1.0);
}
```
shader.frag
``` glsl
precision highp float;

varying vec3 v_Color;

#include chunks/reduce-red.glsl;

void main() {
  gl_FragColor = vec4(reduceR(v_Color), 0.5);
}
```
chunks/reduce-red.glsl
``` glsl
vec3 reduceR(vec3 color) {
  // We arge going to use a template variable $reduce that would be inlined with it's value
  // Note that we use $reduce.0 to transform int values from template to float
  // Alternatively we can use cast float($reduce) or pass float string to template
  return vec3(color.r / $reduce.0, color.g, color.b);
}
```

## Import your shader templates
``` js
import createVertexShader from 'shader.vert';
import createFragmentShader from 'shader.frag';
```
or
``` js
const createVertexShader = require('shader.vert');
const createFragmentShader = require('shader.frag');
```

## Create shaders
``` js
// That's how we pass our reduce variable to templates
const vertexShader = createVertexShader({reduce: 5});
const fragmentShader = createFragmentShader({reduce: 2});
```

## Work with nodejs 4
Use ```--harmony``` flag to build with nodejs 4.

## License
[MIT](http://www.opensource.org/licenses/mit-license.php)
