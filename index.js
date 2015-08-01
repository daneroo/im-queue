'use strict';

// dependencies - core-public-internal
var log = require('./lib/log');
var metrics = require('./lib/metrics');
var task = require('./lib/task');

log.info('Queue.push(hello)');

// start the web server (Prometheus /metrics for now)
metrics.prometheus.listen(8000);
// app = express()
// app.get("/metrics",prometheus.metricsFunc())
// app.listen(9090)

// start some tasks
Promise.resolve(42)
  .then(task.runner(task.tasks.simple, 'Simple'))
  .then(task.runner(task.tasks.simpleP, 'Promise'));
