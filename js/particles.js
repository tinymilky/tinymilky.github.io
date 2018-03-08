var FUNC = function(){
var canvas = document.querySelector("canvas"),
 container = document.getElementById("intro");
canvas.height = container.offsetHeight;
canvas.width = container.offsetWidth;
// canvas.style.marginTop=window.getComputedStyle(container,null).paddingTop;
// if(window.getComputedStyle(container,null).paddingTop!="0px")
//     canvas.height=canvas.height- parseInt(window.getComputedStyle(container,null).paddingTop);
var
    context = canvas.getContext("2d"),
    width = canvas.width,
    height = canvas.height,
    radius = 2.5;

var maxWH = Math.min(width, height)*1.5;

    minDistance = Math.round(maxWH/25),
    maxDistance = Math.round(maxWH/20),
    minDistance2 = minDistance * minDistance,
    maxDistance2 = maxDistance * maxDistance;
var tau = 2 * Math.PI,
    n = Math.round(maxWH/10),
    particles = new Array(n);

    console.log(height, width);

for (var i = 0; i < n; ++i) {
  particles[i] = {
    x: width * Math.random(),
    y0: height * Math.random(),
    v: 0.1 * (Math.random() - 0.5)
  };
}

d3.timer(function(elapsed) {
  context.clearRect(0, 0, width, height);

  for (var i = 0; i < n; ++i) {
    for (var j = i + 1; j < n; ++j) {
      var pi = particles[i],
          pj = particles[j],
          dx = pi.x - pj.x,
          dy = pi.y - pj.y,
          d2 = dx * dx + dy * dy;
      if (d2 < maxDistance2) {
        context.globalAlpha = d2 > minDistance2 ? (maxDistance2 - d2) / (maxDistance2 - minDistance2) : 1;
        context.beginPath();
        context.moveTo(pi.x, pi.y);
        context.lineTo(pj.x, pj.y);
        context.strokeStyle="rgba(172,31,45,0.6)";
        context.stroke();
      }
    }
  }

  context.globalAlpha = 1;

  for (var i = 0; i < n; ++i) {
    var p = particles[i];
    p.y = p.y0 + elapsed * p.v;
    if (p.y > height + maxDistance) p.x = width * Math.random(), p.y0 -= height + 2 * maxDistance;
    else if (p.y < -maxDistance) p.x = width * Math.random(), p.y0 += height + 2 * maxDistance;
    context.beginPath();
    context.arc(p.x, p.y, radius, 0, tau);
    context.fillStyle="rgba(255,255,255,0.6)";
    context.fill();
  }
});
};
 window.onload=FUNC;
 window.onresize=FUNC;
