# im-queue

This is a test repo to test different approaches to a distributed work queue.

To be as simple as possible, the task will be to simply effect a sum, where incoming events will be simple integers.

Simplest task is to sum 1e6 integers, check for timing, and correctness.
Next we can have a steady state flow (msg/s, concurrency or producers/consumers) and monitor timings and rates (latency throughput, queue depth)

Later we can address issues of resilience...

- Simple sum (async code)
- Using promises
- Using Reactive sequence (rx.js)
- putting the work into memory
- Front-end for control, (metrics later)
- putting the work into MySQL/Postgres (postgress has notify/listen)
- putting the work into redis 
	- [kue](https://github.com/Automattic/kue)
	- [rsmq](https://github.com/smrchy/rsmq)
	- [bull](https://github.com/OptimalBits/bull)
- putting the work into RabbitMQ
- Metrics [Prometheus](https://github.com/prometheus/node_exporter)
- Multiple workers (concurrency)

## Prometheus Metrics

We also instrumented redis metrics collection through another container [redis_exporter](https://github.com/oliver006/redis_exporter)

Here is [an example](http://docker:9090/graph#%5B%7B%22range_input%22%3A%225m%22%2C%22end_input%22%3A%22%22%2C%22step_input%22%3A%22%22%2C%22stacked%22%3A%22%22%2C%22expr%22%3A%22rate(redis_total_commands_processed%5B1m%5D%29%22%2C%22tab%22%3A0%7D%5D)

- [app metrics](http://docker/metrics)
- [redis metrics](http://docker:9121/metrics) from redis_exporter
- [Prometheus' own metrics](http://docker:9090/metrics)


## References

- [Article by Percona on using Mysql as a queue](https://blog.engineyard.com/2011/5-subtle-ways-youre-using-mysql-as-a-queue-and-why-itll-bite-you/)
- [Polling loop over MySQL](http://www.gianlucaguarini.com/blog/push-notification-server-streaming-on-a-mysql-database/)
- [Article on Postgres notify/listen in node](http://voxpelli.com/2015/01/pubsub-with-postgres-and-node-js/)
- [Prometheus instrumentation for node.js](https://github.com/StreamMachine/prometheus_client_nodejs)
- [Proetheus push gateway](https://github.com/prometheus/pushgateway)

## Project Layout

- `/`: node application which serves the job control api, (and static web app)
- `docker/` docker related orchestration and support files
- `www`: static web app
