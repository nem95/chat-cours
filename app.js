require('colors');

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const requestIp = require('request-ip');
const redis = require("redis");
const client = redis.createClient();

function consoleLog(event, method, msg = undefined) {
  console.log(event.red + '.' + method.yellow + (msg !== undefined ? (' => ' + msg) : ''));
}

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

io.on('connection', function(socket){
  consoleLog('socket', 'connection', 'another user connected');

  socket.broadcast.emit('hi');

  socket.on('chat.join', (data) => {
    const user_ip = requestIp.getClientIp(socket.request);
    const json = JSON.parse(data);

    //1. save username
    socket.username = json.username;
    socket.userIp = user_ip;

    consoleLog('chat', 'join', `${socket.username} has IP ${user_ip}`);

    let user_infos = {
      'ip': user_ip,
      'username': json.username
    };

    console.log(JSON.stringify(user_infos));

    client.lpush('users', JSON.stringify({'username': json.username, 'ip': socket.userIp}), (err, res) => {
      consoleLog('redis', 'LPUSH', `Add ${socket.username} to user list`);
    });

    //2. broadcast
    socket.broadcast.emit('chat.join', JSON.stringify({'username': socket.username}));
    client.lrange('users', 0, -1, function (err, res) {
      if (err) throw(err);
      console.log(res);

      for (let data of res) {

      }

      socket.emit('chat.join', JSON.stringify({'username': socket.username}));
    });
  });

  socket.on('chat.message', function(msg){
    consoleLog('chat', 'message', ('[' + socket.username + ']').bold + 'message : ' + message);
    socket.broadcast.emit('chat.message', msg);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, () => console.log('Listening on '  + 'http://localhost:3000\n'.green));
