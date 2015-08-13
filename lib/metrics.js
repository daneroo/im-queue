'use strict';

// TODO: make a function endpoint to do subsampling, add a guage for measured total rate
//  subsampling because metrics become too important relative to queing for rabbit
// function push|pop(engine) => incr_by subsample

var Prometheus = require('prometheus-client');
// var log = require('./log');

exports = module.exports = setup();

// Setup Prometheus return the exported structure
// wrapped in afunction so we can forward declare...
function setup() {
  var prometheus = new Prometheus();

  var namespace = 'queue_trial';
  var push_counter = prometheus.newCounter({
    namespace: namespace,
    name: 'push_total',
    help: 'The number of jobs pushed to the queue.'
  });
  var pop_counter = prometheus.newCounter({
    namespace: namespace,
    name: 'pop_total',
    help: 'The number of jobs pulled from the queue.'
  });

  var queue_depth = prometheus.newGauge({
    namespace: namespace,
    name: 'queue_depth',
    help: 'The queue depth (length) at a given time.'
  });

  // var engines = ['MySQL', 'Redis', 'RabbitMQ'];
  // engines.forEach(function(engine) {
  //   setInterval(function() {
  //     push_counter.increment({
  //       engine: engine
  //     });
  //     pop_counter.increment({
  //       engine: engine
  //     });
  //   }, 1000);
  //   setInterval(function() {
  //     queue_depth.set({
  //       engine: engine
  //     }, Math.random() * 1000);
  //   }, 1000);
  // });

  return {
    prometheus: prometheus,
    push_counter: push_counter,
    pop_counter: pop_counter,
    queue_depth: queue_depth
  };

}
