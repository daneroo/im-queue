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

metrics.setSockio(io);

setInterval(function() {
  var opts = {
    name: 'batch_rate',
    engine: 'Fake',
  };
  // io.emit('gauge', opts);
  metrics.set(opts,Math.floor(Math.random() * 1000));

  var opts2 = {
    name: 'push_total',
    engine: 'Fake'
  };
  metrics.increment(opts2, 1000);
}, 1000);

// start some tasks
function tryemall() {
  return Promise.resolve(42)
    // .then(task.runner(task.tasks.simple, 'Simple'))
    // .then(task.runner(task.tasks.simpleP, 'Promise'))
    .then(task.runner(task.tasks.reactive, 'Reactive'))
    .then(task.runner(task.tasks.mysql, 'MySQL'))
    .then(task.runner(task.tasks.redis, 'Redis'))
    .then(task.runner(task.tasks.rabbit, 'Rabbit'));
}

function repeat() {
  tryemall()
    .then(function() {
      log.info('-Breathe');
      setTimeout(repeat, 5000);
    });
}
repeat();
