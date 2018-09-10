/*
   Copyright 2014 Nebez Briefkani
   floppybird - main.js

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var debugmode = false;

var states = Object.freeze({
    SplashScreen: 0,
    GameScreen: 1,
    ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $("#flyarea").height();

var score = 0;
var highscore = 0;

var pipeheight = 120;
var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;

//sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;

var stepCount;

$(document).ready(function() {
    if (window.location.search == "?debug")
        debugmode = true;
    if (window.location.search == "?easy")
        pipeheight = 200;

    startGame();
    // togglelearn();

});

function startGame() {
    currentstate = states.GameScreen;

    //set the defaults (again)
    velocity = 0;
    position = 180;
    rotation = 0;
    score = 0;
    stepCount = 0;

    //update the player in preparation for the next game
    $("#player").css({
        y: 0,
        x: 0,
        rotate: rotation
    });
    updatePlayer($("#player"));

    soundSwoosh.stop();
    soundSwoosh.play();

    //clear out all the pipes if there are any
    $(".pipe").remove();
    pipes = new Array();
    //make everything animated again
    $(".animated").css('animation-play-state', 'running');
    $(".animated").css('-webkit-animation-play-state', 'running');

    //update the big score
    setBigScore();
    updatePipes();
    //debug mode?
    if (debugmode) {
        //show the bounding boxes
        $(".boundingbox").show();
    }

}

function gameloop(tmp) {

    tmp = tmp || {};
    tmp.r=0;
    // console.log(env.getState());

    stepCount += 1;
    var player = $("#player");

    //update the player speed/position
    velocity += gravity;
    position += velocity;

    //update the player
    updatePlayer(player);

    //create the bounding box
    var box = document.getElementById('player').getBoundingClientRect();
    var origwidth = 34.0;
    var origheight = 24.0;

    var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
    var boxheight = (origheight + box.height) / 2;
    var boxleft = ((box.width - boxwidth) / 2) + box.left;
    var boxtop = ((box.height - boxheight) / 2) + box.top;
    var boxright = boxleft + boxwidth;
    var boxbottom = boxtop + boxheight;

    //if we're in debug mode, draw the bounding box
    if (debugmode) {
        var boundingbox = $("#playerbox");
        boundingbox.css('left', boxleft);
        boundingbox.css('top', boxtop);
        boundingbox.css('height', boxheight);
        boundingbox.css('width', boxwidth);
    }

    //did we hit the ground?
    if (box.bottom >= $("#land").offset().top) {
        tmp.r = punishScore;
        playerDead();
        return;
    }

    //have they tried to escape through the ceiling? :o
    var ceiling = $("#ceiling");
    if (boxtop <= (ceiling.offset().top + ceiling.height())) {
        tmp.r = punishScore;
        playerDead();
        return;
        // position = 0;
    }

    //we can't go any further without a pipe
    // if (pipes[0] == null)
    //     return;
    // console.log(stepCount);
    if(stepCount%84==0){
        updatePipes();
    }
    if (pipes[0] == null)
        return;

    // console.log(pipes);

    for (var i=0;i<pipes.length;i++){
        pipes[i].css({x:pipes[i].position().left-2.23});
    }

    //determine the bounding box of the next pipes inner area
    var nextpipe = pipes[0];
    var nextpipeupper = nextpipe.children(".pipe_upper");

    // console.log(nextpipe);
    // console.log(nextpipe[0]);
    // console.log(nextpipe.position().left);


    var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
    var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
    var piperight = pipeleft + pipewidth;
    var pipebottom = pipetop + pipeheight;

    if (debugmode) {
        var boundingbox = $("#pipebox");
        boundingbox.css('left', pipeleft);
        boundingbox.css('top', pipetop);
        boundingbox.css('height', pipeheight);
        boundingbox.css('width', pipewidth);
    }

    //have we gotten inside the pipe yet?
    if (boxright > pipeleft) {
        //we're within the pipe, have we passed between upper and lower pipes?
        if (boxtop > pipetop && boxbottom < pipebottom) {
            //yeah! we're within bounds
            // tmp.r = rewardScore*1.0/10.0;
        } else {
            //no! we touched the pipe
            tmp.r = punishScore;
            playerDead();
            return;
        }
    }

    //have we passed the imminent danger?
    if (boxleft > piperight) {
        //yes, remove it
        pipes[0].remove();
        pipes.splice(0, 1);

        tmp.r = rewardScore;
        //and score a point
        playerScore();
    }
}

function updatePlayer(player) {
    //rotation
    rotation = Math.min((velocity / 10) * 90, 90);

    //apply rotation and position
    $(player).css({
        rotate: rotation,
        top: position
    });
}





function playerJump() {
    velocity = jump;
    //play jump sound
    soundJump.stop();
    soundJump.play();
}

function setBigScore(erase) {
    var elemscore = $("#bigscore");
    elemscore.empty();

    if (erase)
        return;

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function playerDead() {
    //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
    currentstate = states.ScoreScreen;

    //mobile browsers don't support buzz bindOnce event
    if (isIncompatible.any()) {
        //skip right to showing score
        // showScore();
    } else {
        //play the hit sound (then the dead sound) and then show score
        soundHit.play().bindOnce("ended", function() {
            soundDie.play().bindOnce("ended", function() {
                // showScore();
            });
        });
    }
    startGame();

}


function playerScore() {
    score += 1;
    //play score sound
    soundScore.stop();
    soundScore.play();
    setBigScore();
}

function updatePipes() {
    //Do any pipes need removal?
    // $(".pipe").filter(function() {
    //     return $(this).position().left <= 100;
    // }).remove()

    //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
    var padding = 80;
    var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
    var topheight = Math.floor((Math.random() * constraint) + padding); //add lower padding
    var bottomheight = (flyArea - pipeheight) - topheight;
    var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
    $("#flyarea").append(newpipe);
    newpipe.css({x:200});
    pipes.push(newpipe);
}

var isIncompatible = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Safari: function() {
        return (navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/));
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
    }
};
