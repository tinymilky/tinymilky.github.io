var life_game_interval = undefined;

var lifeGame = function() {

  if(life_game_interval){
    clearInterval(life_game_interval);
  }

  var canvas = document.getElementById('life_game');
  var ctx    = canvas.getContext('2d');
  var container = document.getElementById("intro");
  var cells = [];
  canvas.height = container.offsetHeight;
  canvas.width = container.offsetWidth;
  ctx.strokeStyle = '#e1e1e1';
  ctx.fillStyle = "rgba(172,31,45,0.85)";

  wh_ratio = canvas.width / canvas.height;

  n_height = 64;
  n_width = parseInt(n_height * wh_ratio);

  n_pixel = parseInt(canvas.height / n_height);

  console.log(n_height, n_width, n_pixel);

  init();

  function init() {
      for (var i=0; i<n_width; i++) {
          cells[i] = [];
          for (var j=0; j<n_height; j++) {
              if(i > parseInt(n_height/2*3) && Math.random() < 0.1) {
                cells[i][j] = 1;
              }
              else {
                cells[i][j] = 0;
              }
          }
      }

      // Prefilled cells
      [
          // Gosper glider gun
          [1, 5],[1, 6],[2, 5],[2, 6],[11, 5],[11, 6],[11, 7],[12, 4],[12, 8],
          [13, 3],[13, 9],[14, 3],[14, 9],[15, 6],[16, 4],[16, 8],[17, 5],
          [17, 6],[17, 7],[18, 6],[21, 3],[21, 4],[21, 5],[22, 3],[22, 4],
          [22, 5],[23, 2],[23, 6],[25, 1],[25, 2],[25, 6],[25, 7],[35, 3],
          [35, 4],[36, 3],[36, 4],

          // Random cells
          // If you wait enough time these will eventually take part
          // in destroying the glider gun, and the simulation will be in a "static" state.
          [60, 47],[61,47],[62,47],
          [60, 48],[61,48],[62,48],
          [60, 49],[61,49],[62,49],
          [60, 51],[61,51],[62,51],
      ]
      .forEach(function(point) {
        if(point[0] < n_width && point[1] < n_height){
          cells[point[0]][point[1]] = 1;
        }
      });

      // update();
      life_game_interval = setInterval(function() {update();}, 70);
      // update();
  }

  /**
   * Check which cells are still alive.
   */
  function update() {

      var result = [];

      /**
       * Return amount of alive neighbours for a cell
       */
      function _countNeighbours(x, y) {
          var amount = 0;

          function _isFilled(x, y) {
              return cells[x] && cells[x][y];
          }

          if (_isFilled(x-1, y-1)) amount++;
          if (_isFilled(x,   y-1)) amount++;
          if (_isFilled(x+1, y-1)) amount++;
          if (_isFilled(x-1, y  )) amount++;
          if (_isFilled(x+1, y  )) amount++;
          if (_isFilled(x-1, y+1)) amount++;
          if (_isFilled(x,   y+1)) amount++;
          if (_isFilled(x+1, y+1)) amount++;

          return amount;
      }

      cells.forEach(function(row, x) {
          result[x] = [];
          row.forEach(function(cell, y) {
              var alive = 0,
                  count = _countNeighbours(x, y);

              if (cell > 0) {
                  alive = count === 2 || count === 3 ? 1 : 0;
              } else {
                  alive = count === 3 ? 1 : 0;
              }

              result[x][y] = alive;
          });
      });

      cells = result;

      draw();
  }

  /**
   * Draw cells on ctx
   */
  function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cells.forEach(function(row, x) {
          row.forEach(function(cell, y) {
              ctx.beginPath();
              ctx.rect(x*n_pixel, y*n_pixel, n_pixel, n_pixel);
              if (cell) {
                  ctx.fill();
              } else {
                  // ctx.stroke();
              }
          });
      });
      // setTimeout(function() {update();}, 70);
  }
};

window.onload = lifeGame;
window.onresize = lifeGame;
