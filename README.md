# im-queue

_Update_: 2019-03-16, we pinned the historical versions
 of prometheus, grafana and mysql to make this work again

**When in the course of asynchronous events, it becomes necessary for one process to unbind the handlers which have connected them to another, and to assume the scale to which the Laws of Crockford and Goedel entitle them, a decent respect to the opinions of subscribers requires that they should declare the causes which impel them to the concurrency.**

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
- putting the work into RabbitMQ [amqplib](https://github.com/squaremo/amqp.node/) (see also rabbit.js for streams overlay/ might be a start for Rx event stream)
- Metrics [Prometheus](https://github.com/prometheus/node_exporter)
- Multiple workers (concurrency)

## Usage

```bash
docker-compose build
docker-compose up -d
docker-compose logs -f

open http://localhost:3000/dashboard/db/new-dashboard # admin/admin
```

- [React front end](http://localhost/)
- [Grafana](http://localhost:3000/dashboard/db/new-dashboard)
- [Prometheus](http://localhost:9090/graph)
  - `log10(rate(queue_trial_pop_total[15s]))`

## Persistent Grafana Config

To restore (while grafana is stopped):

```bash
scp -p grafana.db data/grafana/grafana.db
```

For now we are simply mounting the sqlite database into the image,
but Grafana v5 will allow us to import our conguration declaratively.
An early example of this is in [this article](https://ops.tips/blog/initialize-grafana-with-preconfigured-dashboards/) which has an associated repo

## Prometheus Metrics

We also instrumented redis metrics collection through another container [redis_exporter](https://github.com/oliver006/redis_exporter)

- [app metrics](http://localhost/metrics)
- [redis metrics](http://localhost:9121/metrics) from redis_exporter
- [Prometheus' own metrics](http://localhost:9090/metrics)

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
