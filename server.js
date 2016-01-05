//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

var sockets = [];
var nameInitialized = false;
var users = {};


io.on('connection', function (socket) {
   
   sockets.push(socket); 
   
   if(!users[socket.id]){
       users[socket.id] = socket;
   }

   
   socket.on('disconnect',function(){

       /*socket.get('name',function(err,name){
           broadcast('leave',name);
       });*/
       broadcast('leave',socket.id);
       if(users[socket.id]){
           delete users[socket.id];
       }
       sockets.splice(sockets.indexOf(socket),1);
   });

   socket.on('send',function(data){
       if(!nameInitialized){
           nameInitialized = true;
           socket.set('name',data.name);
       }
       broadcast('update',data);
       
   });
   // game functions
   socket.on('register',function(data){
       // send id + other users to sender
       data.id = socket.id;
       
       users[socket.id].data = data;
       
       var usersData =[];
       for(var obj in users){
           if(users[obj].id != socket.id){
                usersData.push(users[obj].data);   
           }
       }
       var toSend = {id:socket.id,data:usersData,n:String(data.n).substring(0,15)};

       users[socket.id].emit('register_success',toSend);
       
       
       broadcast('update_all',data);
   });
   
   // player moves
   socket.on('move',function(pos){
       //check if user exists
       if(typeof users[socket.id] == 'undefined'){
           // user doesn't exists
       }else{
           // users does exists
           if(!users[socket.id].data){
               users[socket.id].data = {};
           }
           users[socket.id].data.x = pos.x;
           users[socket.id].data.y = pos.y;   
           for(var obj in users){
              if(users[obj].id != socket.id){
                  users[obj].emit('movePlayer',{x:pos.x,y:pos.y,id:socket.id});
              }
          }
       }
   });
   
});
function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
