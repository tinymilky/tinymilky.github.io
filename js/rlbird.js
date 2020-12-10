
var flappyBird = function() {
}

flappyBird.prototype = {
  getNumStates: function() {
    return 2;
  },
  getMaxNumActions: function() {
    return 2;
  },
  getState: function() {

      var box = document.getElementById('player').getBoundingClientRect();
      var origwidth = 34.0;
      var origheight = 24.0;

      var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
      var boxheight = (origheight + box.height) / 2;
      var boxleft = ((box.width - boxwidth) / 2) + box.left;
      var boxtop = ((box.height - boxheight) / 2) + box.top;
      var boxright = boxleft + boxwidth;
      var boxbottom = boxtop + boxheight;

      var ceiling = $("#ceiling");
      var ceilpos = ceiling.offset().top + ceiling.height()
      var landpos = $("#land").offset().top;

      var d1, d2, d3, d4, d5, d6, birdstate;


      var nextpipe = pipes[0];
      var nextpipeupper = nextpipe.children(".pipe_upper");
      var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
      var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
      var piperight = pipeleft + pipewidth;
      var pipebottom = pipetop + pipeheight;

      // d1 = Math.max(boxtop - ceilpos, -20);
      // d2 = Math.max(landpos - boxbottom, -20);
      d3 = (piperight- boxright)*1.0/200;
      // d4 = Math.max(boxtop - pipetop, -20);
      d5 = (pipebottom - boxbottom)*1.0/200;
      // d6 = velocity;

      birdstate = [d3, d5];
      // birdstate = [d1, d2, d3, d4, d5, d6];

      return birdstate;
  },
  sampleNextState: function(a) {
      var tmp = {};
      // console.log(a);
      if(a==0){
          playerJump();
          gameloop(tmp);
      } else {
          gameloop(tmp);
      }
      console.log(tmp.r)
      return tmp.r;
  },
}

var punishScore = -100;
var rewardScore = 10;



/********************* Set up RL loop*******************/

// agent parameter spec to play with (this gets eval()'d on Agent reset)
var spec = {}
spec.update = 'qlearn'; // qlearn | sarsa
spec.gamma = 0.99; // discount factor, [0, 1)
spec.epsilon = 0.001; // initial epsilon for epsilon-greedy policy, [0, 1)
spec.alpha = 0.01; // value function learning rate
spec.experience_add_every = 10; // number of time steps before we add another experience to replay memory
spec.experience_size = 1000  ; // size of experience replay memory
spec.learning_steps_per_iteration = 10;
spec.tderror_clamp = 1.0; // for robustness
spec.num_hidden_units = 5; // number of neurons in hidden layer

// var spec = { alpha: 0.1 }
var env = new flappyBird();
var agent = new RL.DQNAgent(env, spec);
var sid;
var actNumber;
var toggleInter;
var dir = -1;

function togglelearn() {
      toggleInter = setInterval(function() {
        var state = env.getState();
        var action = agent.act(state);
        console.log(state, action );
        var r = env.sampleNextState(action);
        agent.learn(r);
    }, 20);
}

//Handle space bar
$(document).keydown(function(e) {
    //space bar!

    if (e.keyCode == 38) {
        var state = env.getState();
        // playerJump();
        var action = agent.act(state);
        var r = env.sampleNextState(action);
        agent.learn(r);
        // gameloop();
    } else if (e.keyCode == 40) {
        var state = env.getState();
        // playerJump();
        var action = agent.act(state);
        var r = env.sampleNextState(action);
        agent.learn(r);
    } else if (e.keyCode == 32) {
        if (dir==-1)
        {
            dir = 1;
            togglelearn();
        }
        else {
            dir = -1;
            clearInterval(toggleInter);
        }
    }
});
