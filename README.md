# im-queue

This is a test repo to test different approaches to a distributed work queue.

To be as simple as possible, the task will be to simply effect a sum, where incoming events will be simple integers.

Simplest task is to sum 1e6 integers, check for timing, and correctness.
Next we can have a steady state flow (msg/s, concurrency or producers/consumers) and monitor timings and rates (latency throughput, queue depth)

Later we can address issues of resilience...

- Simple sum (async code)
- Using promises
- putting the work into memory
- putting the work into MySQL/Postgres (postgress has notify/listen)
- putting the work into redis 
	- [kue](https://github.com/Automattic/kue)
	- [rsmq](https://github.com/smrchy/rsmq)
	- [bull](https://github.com/OptimalBits/bull)
- putting the work into RabbitMQ
- Metrics [Prometheus](https://github.com/prometheus/node_exporter)
- Multiple workers (concurrency)

## References

- [Article by Percona on using Mysql as a queue](https://blog.engineyard.com/2011/5-subtle-ways-youre-using-mysql-as-a-queue-and-why-itll-bite-you/	)