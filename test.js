module('Basic')
test( "Basic", function() {
  var rt = new RayTracing('raytracing', true);
  
  deepEqual(rt.vector_add([1,2,3], [-1,3,5]), [0, 5, 8]);
  deepEqual(rt.vector_subtract([1,2,3], [-1,3,5]), [2, -1, -2]);
  equal(rt.dot([1,2,3], [-1,3,5]), 20);
  deepEqual(rt.vector_scalar(2, [-1,2,3]), [-2, 4, 6]);
  equal(rt.magnitude([0,0,1]), 1)
  equal(rt.magnitude([3,4,0]), 5)
  deepEqual(rt.normalize([0,0,1]), [0,0,1])
  deepEqual(rt.normalize([3,4,0]), [3/5,4/5,0])
  
  //Sphere
  var s = new rt.Sphere([5, 0, 0], 1, 0, 1);
  equal(s.reflectionFactor(), 0);
  equal(s.refractionFactor(), 1);
  
  //Mix colors
  deepEqual(rt.mixColors([30, 30, 30], [10, 10, 10], [200, 200, 200], 0.5, 0), [20, 20, 20]);
  deepEqual(rt.mixColors([30, 30, 30], [10, 10, 10], [200, 200, 200], 0.5, 0.4), [88, 88, 88]);
  deepEqual(rt.mixColors([255, 255, 255], [255, 255, 255], [255, 255, 255], 0.5, 0.4), [255, 255, 255]);
  
  
  //plane intersection
  deepEqual(new rt.Plane([0, 0, 1], [0, 0, 0]).intersectDistance([0, 0, -1], [2, 2, 2]), 2)
  // line witout intersection
  deepEqual(new rt.Plane([0, 0, 1], [0, 0, 0]).intersectDistance([1, 0, 0], [2, 2, 2]), null)
  
  //sphere intersection
  deepEqual(new rt.Sphere([5, 0, 0], 1).intersectDistance([1, 0, 0], [0, 0, 0]), 4)
  deepEqual(new rt.Sphere([5, 0, 0], 1).intersectDistance([0, 0, 1], [0, 0, 0]), null)

  var sphere = new rt.Sphere([0, 0, -5], 2)
  rt.addObject(sphere);
  
  var closest = rt.getClosestObject([0, 0, -2], [0, 0, 0]);
  equal(closest.obj, sphere);
  equal(closest.distance > 2.99 && closest.distance < 3.01, true);
  deepEqual(closest.normal, [0, 0, 1])
  equal(closest.entering, true);
  // Ray inside sphere
  var closest = rt.getClosestObject([0, 0, -2], [0, 0, -5])
  equal(closest.entering, false);
  deepEqual(closest.normal, [0, 0, 1])
  deepEqual(closest.intersection, [0, 0, -7])
  equal(closest.distance, 2)
  
  rt.addObject(new rt.Plane([0, 1, 0], [0, -7, 0]))
  
  var closest = rt.getClosestObject([0, 1, 0], [0, -7, -20]);
  equal(closest, null)
  
  //reflection
  deepEqual(rt.reflection([-1,-1,0], [0, 1, 0]), [-1, 1, 0])
  
  //refraction
  deepEqual(rt.refraction([-1,-1,0], [0, 1, 0], 1, 1), [-1, -1, 0])
  
  // Test traceray
  var sphere2 = new rt.Sphere([0.1, 0, -0.1], 2, 0, 1);
  rt.addObject(sphere2);
  
  var color = rt.traceRay([0, -1, 0], [0.5, 10, -0.5])
  // color should be red
  equal(color[0] > color[1] && color[0] > color[2], true);

  
  //background
  equal(rt.getBackground([-1,0.2,2])[2] > rt.getBackground([-1,0.3,2])[2], true)

   
});
