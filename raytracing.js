;(function() {
'use strict';

window['RayTracing'] = window['RayTracing'] || function(canvasId, DEBUG) {
  
  var DEBUG = DEBUG != undefined ? DEBUG : false;
  if(!DEBUG) {
    console.log = function () {};
  }
  
  var canvas = null;
  var context = null;
  
  var iterations = 32;
  var eye = [0, 6, 8];
  var light = [5, 5, -1];
  var topLeftView = [-10, 5, 0],
      viewWidth = 20,
      viewHeight = 10;
  
  
  // Size contants
  var width = null,
      height = null;
  
  // Used to print a pixel
  var pixelContainer = null;
  var pixelData = null;
  
  var imageCache = {}
  
  var objects = [];
  
  var Plane = function (_normal, _p_0) {

    var _obj = {};
    _obj._normal = _normal;
    _obj.p_0 = _p_0;
    _obj.type = "Plane";
    
    _obj.intersectDistance = function (l, l_0) {
        console.log('intersectdist', l, l_0);
        var dotProduct = dot(l, this._normal);
        if (dotProduct == 0) {
          return null;
        }

        var d = dot(vector_subtract(this.p_0, l_0), this._normal) / dotProduct;
        console.log('dist', d);

        if (d < 0.1) {
          return null;
        }

        return d;
      }
    _obj.normal = function (p) {
      return this._normal;
    }  
    _obj.color = function (p) {
      var color = [255.0, 80.0, 120.0];
      if ( ( Math.floor(p[X]/4) + Math.floor(p[Z]/4)) % 2 == 0) {
        color = [80.0, 255.0, 120.0];
      }
      console.log('color', color)
      return color;
    }
    
    _obj.reflectionFactor = function () {
      return 0;
    }

    _obj.refractionFactor = function () {
      return 0;
    }

    return _obj;
  }
  
  var Sphere = function (center, radius, reflectionFactor, refractionFactor) {
    
    var _obj = {};
    _obj.center = center;
    _obj.radius = radius;
    _obj.type = "Sphere";
    _obj._reflectionFactor = reflectionFactor != undefined ? reflectionFactor : 0.5;
    _obj._refractionFactor = refractionFactor != undefined ? refractionFactor : 0.5;
    
    _obj.intersectDistance = function (l, l_0) {
      var eo = vector_subtract(l_0, this.center);
      l = normalize(l);
      var disc = this.radius*this.radius + dot(l, eo) * dot(l, eo) - dot(eo, eo);
      if (disc < 0) {
        return null;
      } else {
        if (-dot(l, eo) - Math.sqrt(disc) > 0.01) {
          console.log('this')
          return -dot(l, eo) - Math.sqrt(disc);
        } else if (-dot(l, eo) + Math.sqrt(disc) > 0.01){
          console.log('that')
          return -dot(l, eo) + Math.sqrt(disc);
        }
        return null;
      }
    }
    
    _obj.normal = function (p) {
      var n = vector_subtract(p, this.center);
      
      return normalize(n);
    }
    _obj.color = function (p) {
      return [255, 255, 255];
    }
    
    _obj.reflectionFactor = function () {
      return this._reflectionFactor;
    }

    _obj.refractionFactor = function () {
      return this._refractionFactor;
    }
    
    return _obj;
  }
  
  var backgroundColor = [0, 0, 0, 1];
  
  var X=0,
      Y=1,
      Z=2;
  
  // return object
  var widget = {};
  
  // UTIL functions
  var dot = function (v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  }
  
  var vector_subtract = function (v1, v2) {
    return [v1[X] - v2[X], v1[Y] - v2[Y], v1[Z] - v2[Z]];
  }
  var vector_add = function (v1, v2) {
    return [v1[X] + v2[X], v1[Y] + v2[Y], v1[Z] + v2[Z]];
  }
  var vector_scalar = function (k, v) {
    return [v[X] * k, v[Y] * k, v[Z] * k];
  }
  var reflection = function (v, normal) {
    return vector_add(v, vector_scalar(2 * -1 * dot(v, normal), normal))
  }
  var letterToCoordinates = function (l) {
    if (l == 'w') {
      return [
      [1,1],
      [2,2],
      [3,3],
      [4,4],
      [5,5],
      [6,4],
      [7,3],
      [8,2],
      [9,3],
      [10,4],
      [11,5],
      [12,4],
      [13,3],
      [14,2],
      [15,1]
      ];
    }
    if (l == 'e') {
      return [
      [1,1],
      [1,2],
      [1,3],
      [1,4],
      [1,5],
      [2,1],
      [2,3],
      [2,5],
      [3,1],
      [3,3],
      [3,5],
      [4,1],
      [4,5],
      ];
    }
  }
  var refraction = function (v, normal, n1, n2) {
    console.log('refraction', v, normal, n1, n2);
    var n = n1/n2;
    var c1 = -1 * dot(v, normal);
    var c2 = 1 - n*n * (1 - c1*c1)
    if (c2 < 0) {
      return reflection(v, normal);
    }
    var v2 = vector_add(vector_scalar(n, v), vector_scalar(n * c1 - Math.sqrt(c2), normal));
    return v2;
  }
  var mixColors = function (ownColor, reflectionColor, refractionColor, reflectionFactor, refractionFactor) {
    console.log('mixcolor', ownColor, reflectionColor, refractionColor, reflectionFactor, refractionFactor);
    return vector_add(
              vector_scalar(1-reflectionFactor - refractionFactor, ownColor),
              vector_add(
                vector_scalar(reflectionFactor, reflectionColor),
                vector_scalar(refractionFactor, refractionColor)
              )
            );
  }
  var mergeColors = function (colors) {
    var color = [0, 0, 0];
    for (var i=0; i<colors.length; i++) {
      color = vector_add(color, vector_scalar(1/colors.length, colors[i]))
    }
    return color;
  }
  var abs = function (x) {
    if (x < 0) {
      return -x;
    }
    return x;
  }
  
  var setLight = function (l) {
    light = l;
  }
  
  var addObject = function (obj) {
    objects.push(obj);
  }
  
  var init = function () {
    canvas = document.getElementById(canvasId);
    context = canvas.getContext('2d');
    
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    addObject(new Plane([0, 1, 0], [0, 0, 0]))
    
    var w_letter = letterToCoordinates('w');
    for (var i=0; i< w_letter.length;i++) {
      addObject(new Sphere([w_letter[i][0]*0.8-8, 13-w_letter[i][1]*2, 0 - w_letter[i][0] * 0.2], 1.5, 1, 0))
    }
    var e_letter = letterToCoordinates('e');
    for (var i=0; i< e_letter.length;i++) {
      addObject(new Sphere([e_letter[i][0]*1.5+6, 13-e_letter[i][1]*2, -3 - w_letter[i][0] * 0.2], 1.5, 1, 0))
    }
    
    //addObject(new Sphere([0, 6, -5], 5, 0.9, 0))
    draw();
  }
  var doStuff = function () {
    for (var pixX = 0; pixX < width; pixX++) {
      for (var pixY = 0; pixY < height; pixY++) {
        paintPixel(pixX, pixY, pixX, pixY, 120, 1)
      }
    }    
  }
  
  var draw = function () {
    if (light in imageCache) {
      context.putImageData(imageCache[light],0,0);
    } else {
      drawLine(0, width);
      imageCache[light] = context.getImageData(0,0,width,height);      
    }

  }
  var drawLine = function (pixX , maxX) {
    if (pixX >= maxX) {
      return;
    }
    for (var pixY = 0; pixY < height; pixY++) {
      var colors = [];
      for (var i=0; i<iterations; i++) {
        var delta = [0.1*(Math.random()-0.5), 0.1*(Math.random()-0.5), 0];
        var x = topLeftView[X] + pixX * viewWidth/width - delta[X] + (-.5 + Math.random())*0.04;
        var y = topLeftView[Y] - pixY * viewHeight/height - delta[Y] + (-.5 + Math.random())*0.04;
        console.log('pixels', pixX, pixY)
        colors.push(traceRay([x, y, topLeftView[Z] - eye[Z]], vector_add(eye, delta)));
      }
      var color = mergeColors(colors);
      paintPixel(pixX, pixY, color[0] << 0, color[1] << 0, color[2] << 0, 1);          
    }
    setTimeout(function() {
      drawLine(pixX+1, maxX, 5);
    })
  }
  
  var magnitude = function (v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }
  
  var normalize = function (v) {
    var mag = magnitude(v);
    return [v[X]/mag, v[Y]/mag, v[Z]/mag];
  }
  
  var getBackground = function (p) {
    var blue_color = 1-Math.max(0, Math.min(1, 2*p[1]))
    return vector_scalar(blue_color, [120, 120, 255])
  }
  
  var getClosestObject = function (l, l_0) {
    var min_dist = null;
    var min_obj = null;
    l = normalize(l);
    for (var i=0; i<objects.length; i++) {
      var d = objects[i].intersectDistance(l, l_0);
      if (d > 0 && (min_dist == null || d < min_dist)) {
        min_dist = d;
        min_obj = objects[i];
      }
    }
    if (min_dist == null) {
      return null;
    }
    var intersection = vector_add(l_0, vector_scalar(min_dist, l));
    var entering = true;
    var normal = min_obj.normal(intersection);
    if (dot(l, normal) > 0) {
      entering = false;
      normal = vector_scalar(-1, normal);
    }

    return {
      distance: min_dist,
      obj: min_obj,
      normal: normal,
      intersection: intersection,
      color: min_obj.color(intersection),
      entering: entering
    }
  }
  
  
  var traceRay = function (l, l_0, iteration) {
    console.log('traceray', l, l_0, iteration)
    l = normalize(l)
    iteration = iteration ? iteration + 1:1;
    if (iteration > 5) {
      return getBackground(l);
    }
    
    var closest = getClosestObject(l, l_0);
    if (closest == null) {
      return getBackground(l);
    }
    console.log(closest);
    var lightVector = normalize(vector_subtract(vector_add(light, [Math.random(), Math.random(), Math.random()]), closest.intersection));
    // Shadow
    var shade = Math.max(0, dot(closest.normal, lightVector));
    if (getClosestObject(lightVector, closest.intersection) != null) {
      shade = 0;
    }
    var distanceFactor = 1//(100-closest.distance)/100;
    var pointColor = vector_scalar(distanceFactor*(0.4 + shade*0.6), closest.color);

    var reflectionColor = backgroundColor;
    var refractionColor = backgroundColor;
    
    // Check reflection
    if (closest.obj.reflectionFactor() > 0) {
      var ref = reflection(l, closest.normal);
      console.log('reflection!')
      reflectionColor = traceRay(ref, closest.intersection, iteration);
      reflectionColor = vector_add(vector_scalar(0.7,reflectionColor), vector_scalar(Math.pow(shade, 99), closest.color))
    }
    
    if (closest.obj.refractionFactor() > 0) {

      var ref = refraction(l, closest.normal, 1.5, 1);
      if (closest.entering)
        ref = refraction(l, closest.normal, 1, 1.5);
      console.log('refraction', iteration, ref, l, closest.normal, closest.intersection);

      refractionColor = traceRay(ref, closest.intersection, iteration);
      console.log('color', iteration, refractionColor)
    }
    
    return mixColors(pointColor, reflectionColor, refractionColor, closest.obj.reflectionFactor(), closest.obj.refractionFactor())
  }
  
  var paintPixel = function (x, y, r, g, b, alpha) {
    context.fillStyle = 'rgba(' + r  + ',' + g  + ',' + b  + ',' + 1 + ')';
    context.fillRect(x, y, 1, 1);
  }
  
  // initalize
  //init();
  widget.addObject = addObject;
  widget.normalize = normalize;
  widget.magnitude = magnitude;
  widget.dot = dot;
  widget.vector_scalar = vector_scalar;
  widget.vector_add = vector_add;
  widget.vector_subtract = vector_subtract;
  widget.Plane = Plane;
  widget.Sphere = Sphere;
  widget.init = init;
  widget.getClosestObject = getClosestObject;
  widget.reflection = reflection;
  widget.refraction = refraction;
  widget.setLight = setLight;
  widget.draw = draw;
  widget.traceRay = traceRay;
  widget.mixColors = mixColors;
  widget.getBackground = getBackground;
  return widget;
  
}; //end window.RayTracing

})();