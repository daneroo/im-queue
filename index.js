'use strict';

// dependencies - core-public-internal
var path = require('path');
var express = require('express');
var morgan = require('morgan');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var log = require('./lib/log');
var metrics = require('./lib/metrics');
var task = require('./lib/task');

log.info('Queue.push(hello)\n');

// move to config
var port = process.env.PORT || 8000;
server.listen(port, function() {
  log.info('Express server listening on port *:' + port);
});

app.use(morgan('dev', { // or tiny'
  skip: function(req, res) {
    return req.url === '/metrics';
  }
}));

// Instrument for prometheus
app.get('/metrics', metrics.prometheus.metricsFunc());

// static app
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket) {
  io.emit('info', {
    msg: 'user connected'
  });
  socket.on('disconnect', function() {
    io.emit('info', {
      msg: 'user disconnected'
    });
  });
});

// Inject socket.io into metrics
metrics.setSockio(io);

// start some tasks
function tryemall() {
  return Promise.resolve(42)
    // .then(task.runner(task.tasks.simple, 'Simple'))
    // .then(task.runner(task.tasks.simpleP, 'Promise'))
    // .then(task.runner(task.tasks.reactive))
    .then(task.runner(task.tasks.mysql))
    .then(task.runner(task.tasks.redis))
    .then(task.runner(task.tasks.rabbit));
}

function repeat() {
  tryemall()
    .then(function() {
      log.info('-Breathe');
      setTimeout(repeat, 5000);
    });
}
repeat();
