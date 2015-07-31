'use strict';

var Prometheus = require('prometheus-client');
var log = require('./log');

exports = module.exports = setup();

// Setup Prometheus return the exported structure
// wrapped in afunction so we can forward declare...
function setup() {
  var prometheus = new Prometheus();
  log.info('metrics setup');

  var counter = prometheus.newCounter({
    namespace: 'counter_test',
    name: 'elapsed_counters_total',
    help: 'The number of counter intervals that have elapsed.'
  });

  var gauge = prometheus.newGauge({
    namespace: 'counter_test',
    name: 'random_number',
    help: 'A random number we occasionally set.'
  });

  setInterval(function() {
    counter.increment({
      period: '1sec'
    });
  }, 1000);
  setInterval(function() {
    counter.increment({
      period: '2sec'
    });
  }, 2000);
  setInterval(function() {
    gauge.set({
      period: '1sec'
    }, Math.random() * 1000);
  }, 1000);

  return {
    prometheus:prometheus,
    counter: counter,
    gauge: gauge
  };

}
