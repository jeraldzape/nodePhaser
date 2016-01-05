 "use strict";

var state = {
    init:init,
    preload:preload,
    create:create,
    update:update
};

var game = new Phaser.Game(320,320,Phaser.AUTO,'game',state);
var hero,cursors;
var socket,socketInitialized;
var users = {};
var playerName = '';
//var frames = [0,3,6,9,48,51,54,57];
var frames = [0];
var SPEED = 200; // pixels
var SPEED_PER_SECOND = 1000; // milliseconds

var CHAR_FRAMES = [
    {
        idle:   [0],
        down:   [0,1,2],
        left:   [12,13,14],
        right:  [24,25,26],
        up:     [36,37,38]
    },
    {
        idle:   [3],
        down:   [3,4,5],
        left:   [15,16,17],
        right:  [27,28,29],
        up:     [39,40,41]
    },{
        idle:   [6],
        down:   [6,7,8],
        left:   [18,19,20],
        right:  [30,31,32],
        up:     [42,43,44]
    },
    {
        idle:   [9],
        down:   [9,10,11],
        left:   [21,22,23],
        right:  [33,34,35],
        up:     [45,46,47]
    }
];


function init(){
    game.stage.backgroundColor = '0x86bf79';
    this.stage.disableVisibilityChange = true;
}
function preload(){
    game.load.spritesheet('avatars','assets/images/sprites.png',32,32);
    
    // load json
    game.load.tilemap('floorMap','assets/json/floor2.json',null,Phaser.Tilemap.TILED_JSON);
    game.load.image('floorImage','assets/images/medieval_floor.png');

}
function create(){
    
    // initialize map
    var map = game.add.tilemap('floorMap');
    map.addTilesetImage('medieval_floor','floorImage');
    
    //map.setCollisionBetween(19, 14);
    // add floor
    map.createLayer('staticLayer').resizeWorld();
    

    //game.world.setBounds(0, 0, 2000, 2000);
    
    var p = getRandomPosition();
    hero = generateHero({
        x:  p.x,
        y:  p.y,
        frame:  getRandomCharacterIndex(),
        id: ''
    });
    
    game.input.onDown.add(function(){
        var pos = 
        {
            x:  game.input.activePointer.positionDown.x + game.camera.x,
            y:  game.input.activePointer.positionDown.y + game.camera.y
            
        };
        
        
        if(socketInitialized){
            socket.emit('move',pos);
        }
        walkPlayer(hero,pos);
    },this);
    
    playerName = prompt('Enter your name:','Anonymous');
    hero.playerName = String(playerName || 'Anonymous');
    
    game.camera.follow(hero);

    initializeSocket();
    
}
function update(){
       
}
function walkPlayer(currentPlayer,nextPosition){
    if(currentPlayer.tween1){
        currentPlayer.tween1.stop();   
    }
    if(currentPlayer.tween2){
        currentPlayer.tween2.stop();
    }
    var distance = {
        x:  Math.abs(currentPlayer.x - nextPosition.x),
        y:  Math.abs(currentPlayer.y - nextPosition.y)
    };
    
    var walkTime = {
        x:  (distance.x / SPEED) * SPEED_PER_SECOND,
        y:  (distance.y / SPEED) * SPEED_PER_SECOND
    };
    
    
    
    currentPlayer.tween1 = game.add.tween(currentPlayer).to({x:nextPosition.x},walkTime.x,Phaser.Linear);
    currentPlayer.tween2 = game.add.tween(currentPlayer).to({y:nextPosition.y},walkTime.y,Phaser.Linear);
    
    var lastPosition = 'idle';

    // walk cycle
    if(nextPosition.x <= currentPlayer.x){
        // left
        currentPlayer.animations.play('left');
        lastPosition = 'left';
    }
    else{
        // right
        currentPlayer.animations.play('right');
        lastPosition = 'right';
    }
    if(distance.y > 0){
        currentPlayer.tween1.chain(currentPlayer.tween2);    
    }
    if(distance.x > 0){
        currentPlayer.tween1.start();   
    }
    
    currentPlayer.tween1.onComplete.add(function(){
        if(nextPosition.y >= currentPlayer.y){
            // down
            currentPlayer.animations.play('down');
            lastPosition = 'down';
        }else{
            // up
            currentPlayer.animations.play('up');
            lastPosition = 'up';
        }
        if(distance.y < 1){
            currentPlayer.animations.play('idle');
        }
    },this);
    
    // idle player on stop
    currentPlayer.tween2.onComplete.add(function(){
        currentPlayer.animations.play('idle');
    },this);
    
    
}
function getRandomPosition(){
    return {
        x:  Math.floor(Math.random()*game.width),
        y:  Math.floor(Math.random()*game.height)
    }
}
function getRandomFrame(){
    return Math.floor(Math.random()*frames.length - 1);
}
function getRandomCharacterIndex(){
    return Math.floor(Math.random() * CHAR_FRAMES.length);
}

// generateHero
function generateHero(param){
    
    var _hero = game.add.sprite(param.x,param.y,'avatars');
    _hero.anchor.setTo(0.5,0.5);
    _hero.heroFrame = param.frame;
    _hero.heroID = param.id;
    
    
    // add animations
    var avatar = CHAR_FRAMES[param.frame];
    _hero.animations.add('idle',avatar['idle'],10,true);
    _hero.animations.add('left',avatar.left,15,true);
    _hero.animations.add('right',avatar.right,15,true);
    _hero.animations.add('up',avatar.up,15,true);
    _hero.animations.add('down',avatar.down,15,true);
    _hero.animations.play('idle');
    _hero.inputEnabled = true;
    _hero.events.onInputDown.add(function(){
        console.log('click!');
    });
    
    // add label
    var style = {font:'11px Calibri',fill:'#ffffff'};
    _hero.nameLabel = game.add.text(0,-20,String(param.playerName || 'Anonymous'),style);
    _hero.nameLabel.anchor.setTo(0.5);
    _hero.addChild(_hero.nameLabel);
    
    return _hero;
}

// socket

function initializeSocket(){
    socket = io.connect();
    socket.on('connect',function(){
        socket.emit('register',{
            x:  hero.x,
            y:  hero.y,
            f:  hero.heroFrame,
            n:  hero.playerName
        });
    });
    socket.on('register_success',function(result){
        hero.heroID = result.id;
        hero.nameLabel.setText(result.n);
        for(var i=0;i<result.data.length;i++){
            var p = result.data[i];
            if(p){
                users[p.id] = generateHero({
                    x:  p.x,
                    y:  p.y,
                    frame:  p.f,
                    id: p.id,
                    playerName: String(p.n).substring(0,15)
                });
            }
        }
    });
    // show other players
    socket.on('update_all',function(data){
       if(data.id != hero.heroID){
           console.log(data);
           
           users[data.id] = generateHero({
               x:   data.x,
               y:   data.y,
               frame:   data.f,
               id:  data.id,
               playerName: data.n
           });
       } 
    });
    // disconnect player
    socket.on('leave',function(id){
        if(users[id]){
            
            console.log(users[id].nameLabel.text + ' has left.');
            users[id].destroy();
            delete users[id];
        }
    });
    // move player
    socket.on('movePlayer',function(player){
        if(users[player.id]){
            walkPlayer(users[player.id],{x:player.x,y:player.y});
        }
    });
    
    socketInitialized = true;
    
}