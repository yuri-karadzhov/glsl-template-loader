# GLSL Webpack loader

This loader supports template variables and the `#include` directive.

`#include` will include the entire contents of another glsl file, this happens at compile time and uses webpacks resolver to find the file requested.  The loader will then give you a function where you can supply template variables at runtime.


## Install

``` bash
npm install glsl-template-loader --save-dev
```



## Configuring Webpack

``` js
resolve: {
  extensions: ['', '.webpack.js', '.js', '.vert', '.frag', '.glsl']
},
module: {
  loaders: [{
    test: /\.(glsl|vert|frag)$/,
    loader: 'shader'
  }]
},
// Default values (can be ommited)
glsl: {
  varPrefix: '$' // Every valid name that starts with this symbol will be treated as a template variable
}
```



## Write some shaders

`shaders/shader.vert`

``` glsl
attribute vec2 a_Position;
attribute vec3 a_Color;

varying vec3 v_Color;

// The content of shaders/util/reduce-red.glsl file will be inlined here
#include ./util/reduce-red;

void main(void) {
  v_Color = reduceR(a_Color);
  gl_Position = vec4(a_Position, 0.0, 1.0);
}
```

`shaders/shader.frag`

``` glsl
precision highp float;

varying vec3 v_Color;

#include ./util/reduce-red;

void main() {
  gl_FragColor = vec4(reduceR(v_Color), 0.5);
}
```

`shaders/util/reduce-red.glsl`

``` glsl
vec3 reduceR(vec3 color) {
  // We arge going to use a template variable $reduce that would be inlined with it's value
  // Note that we use $reduce.0 to transform int values from template to float
  // Alternatively we can use cast float($reduce) or pass float string to template
  return vec3(color.r / $reduce.0, color.g, color.b);
}
```



## Import your shader templates

es6
``` js
import createVertexShader from 'shader.vert';
import createFragmentShader from 'shader.frag';
```

es5
``` js
var createVertexShader = require('shader.vert');
var createFragmentShader = require('shader.frag');
```



## Create shaders

``` js
// That's how we pass our reduce variable to templates
const vertexShader = createVertexShader({ reduce: 5 });
const fragmentShader = createFragmentShader({ reduce: 2 });
```


## License

[MIT](http://www.opensource.org/licenses/mit-license.php)
