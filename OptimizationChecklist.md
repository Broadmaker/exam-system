# Full System Optimization Checklist

> **Project:** WMSU Exam System — Adaptation for Cloudflare Workers + D1 (Serverless)  
> **Date Tailored:** 2026-08-24 | **Companion Plan:** `OPTIMIZATION_PLAN.md`  
> **Legend:** Items marked `N/A — Serverless` are not applicable to this stack and are commented out below. Items with `ADAPTED` remain relevant but need serverless-specific interpretation. All other items apply as-is.

## 1. Define the System and Its Goals

- [ ] Document what the system does and who uses it
- [ ] Identify the system's critical workflows
- [ ] Define measurable optimization goals
- [ ] Establish baseline performance metrics
- [ ] Identify current bottlenecks and pain points
- [ ] Define acceptable performance targets
- [ ] Define availability/reliability targets
- [ ] Define scalability requirements
- [ ] Define cost constraints
- [ ] Define security and compliance requirements
- [ ] Identify optimization priorities
- [ ] Establish what must **not** be degraded while optimizing

## 2. Inventory the System

- [ ] Document hardware <!-- N/A — Serverless: Cloudflare Workers isolates, no bare-metal/VM to inventory. Document isolate limits (128 MB, 30s CPU) instead. See OPTIMIZATION_PLAN.md §2 -->
- [ ] Document operating systems <!-- N/A — Serverless: No OS access. Workers runtime pinned via wrangler.toml:3 compatibility_date. -->
- [ ] Document applications and services
- [ ] Document databases
- [ ] Document APIs
- [ ] Document external dependencies
- [ ] Document network architecture <!-- ADAPTED: Cloudflare CDN + Workers Assets (wrangler.toml:4) + D1. No VPC/subnet to diagram. -->
- [ ] Document storage systems
- [ ] Document queues and messaging systems <!-- N/A — No queue (SQS/RabbitMQ) in this system. Document absence; revisit only if adding Workers Queues. -->
- [ ] Document caches
- [ ] Document scheduled/background jobs <!-- N/A — No cron/queue consumers yet. Workers Cron Triggers not configured. Mark N/A until added. -->
- [ ] Document user-facing interfaces
- [ ] Identify legacy components
- [ ] Identify single points of failure
- [ ] Identify undocumented dependencies

## 3. Establish Observability

- [ ] Implement centralized logging
- [ ] Implement metrics collection <!-- ADAPTED: Use Workers Analytics Engine + Logpush, not self-hosted Prometheus. -->
- [ ] Implement distributed tracing where appropriate <!-- ADAPTED: Cloudflare Trace Events / tail workers, not Jaeger/Zipkin. -->
- [ ] Monitor CPU utilization <!-- ADAPTED: Workers CPU time (30s limit) via wrangler tail / analytics, not host CPU. -->
- [ ] Monitor memory utilization <!-- ADAPTED: Isolate 128 MB limit, not host RAM. -->
- [ ] Monitor disk/storage utilization <!-- ADAPTED: D1 storage (10 GB limit) + R2 if used, not local disk. -->
- [ ] Monitor network throughput and latency
- [ ] Monitor application response times
- [ ] Monitor database performance
- [ ] Monitor error rates
- [ ] Monitor queue depth <!-- N/A — No queue in this system. -->
- [ ] Monitor cache hit/miss rates
- [ ] Monitor resource saturation <!-- ADAPTED: D1 write mutex + Workers concurrent request limits. -->
- [ ] Establish dashboards <!-- ADAPTED: Cloudflare dashboard / Grafana via Logpush. -->
- [ ] Establish alert thresholds
- [ ] Ensure alerts are actionable
- [ ] Retain sufficient historical data for trend analysis

## 4. Identify Bottlenecks

- [ ] Profile the system under realistic workloads
- [ ] Identify CPU-bound operations
- [ ] Identify memory-bound operations
- [ ] Identify I/O-bound operations
- [ ] Identify network-bound operations
- [ ] Identify database bottlenecks
- [ ] Identify slow APIs
- [ ] Identify inefficient algorithms
- [ ] Identify excessive serialization/deserialization
- [ ] Identify unnecessary data transfers
- [ ] Identify excessive disk access <!-- ADAPTED: D1 queries, not local disk I/O. -->
- [ ] Identify lock/contention problems
- [ ] Identify excessive context switching <!-- N/A — Workers is single-threaded isolate; no OS context switch tuning. -->
- [ ] Identify inefficient queries
- [ ] Identify redundant processing
- [ ] Identify unnecessary background work
- [ ] Rank bottlenecks by user/business impact

## 5. Application and Code Optimization

- [ ] Profile CPU-intensive code
- [ ] Profile memory usage
- [ ] Optimize expensive algorithms
- [ ] Remove unnecessary computation
- [ ] Eliminate duplicate work
- [ ] Reduce unnecessary object allocation
- [ ] Reduce excessive serialization
- [ ] Optimize loops and data processing
- [ ] Improve concurrency where appropriate <!-- ADAPTED: Promise.all() for parallel D1 queries + batch, not threads. See worker/index.js:524 vs 524-550 sequential. -->
- [ ] Avoid unnecessary blocking operations
- [ ] Optimize asynchronous operations
- [ ] Review thread/process usage <!-- N/A — Workers isolates are single-threaded; no thread pool to tune. -->
- [ ] Review connection management <!-- N/A — D1 binding is per-request (c.env.DB); no pooling. -->
- [ ] Remove dead code
- [ ] Remove unused dependencies
- [ ] Optimize startup time
- [ ] Optimize shutdown behavior <!-- N/A — Workers have no graceful shutdown hook; isolates freeze/evict. -->
- [ ] Review third-party libraries for performance impact

## 6. Database Optimization

- [ ] Identify slow queries
- [ ] Review query execution plans
- [ ] Add appropriate indexes
- [ ] Remove redundant indexes
- [ ] Optimize joins
- [ ] Optimize filtering and sorting
- [ ] Avoid unnecessary queries
- [ ] Eliminate N+1 query patterns
- [ ] Reduce unnecessary data retrieval
- [ ] Select only required columns
- [ ] Optimize transactions
- [ ] Review transaction isolation levels <!-- N/A — D1 SQLite is serialized per-DB; no isolation level tuning. Use db.batch() for atomicity. -->
- [ ] Reduce lock contention
- [ ] Review connection-pool configuration <!-- N/A — D1 has no pool; bound per request. -->
- [ ] Optimize database configuration <!-- N/A — D1 config is managed by Cloudflare; no my.cnf/pragma tuning beyond PRAGMA. -->
- [ ] Archive obsolete data where appropriate
- [ ] Partition large datasets where appropriate <!-- N/A — D1 is single SQLite DB (max 10 GB); no native partitioning/sharding. Archive instead. -->
- [ ] Review replication configuration <!-- N/A — D1 replication is Cloudflare-managed; no primary/replica config. -->
- [ ] Monitor database storage growth
- [ ] Establish database maintenance procedures

## 7. Caching

- [ ] Identify frequently accessed data
- [ ] Identify expensive operations suitable for caching
- [ ] Implement caching where justified
- [ ] Choose appropriate cache locations <!-- ADAPTED: Workers Cache API + SW public/sw.js + D1 query memoization. -->
- [ ] Define cache expiration policies
- [ ] Define invalidation strategies
- [ ] Monitor cache hit rates
- [ ] Prevent stale-data problems
- [ ] Prevent cache stampedes
- [ ] Prevent excessive cache memory usage
- [ ] Ensure cache failures do not unnecessarily take down the system

## 8. Storage and File I/O

- [ ] Identify unnecessary disk operations <!-- ADAPTED: Unnecessary D1 writes / localStorage thrash. No local filesystem disk. -->
- [ ] Optimize file access patterns <!-- ADAPTED: D1 + R2 access patterns. -->
- [ ] Review storage performance <!-- ADAPTED: D1 query latency, not disk latency. -->
- [ ] Remove unnecessary temporary files
- [ ] Compress data where beneficial
- [ ] Review storage tiering <!-- N/A — No hot/warm/cold tier management; Cloudflare manages D1/R2 tiering. -->
- [ ] Optimize database storage
- [ ] Monitor disk capacity <!-- N/A — Monitor D1 storage limit instead. -->
- [ ] Monitor disk latency <!-- N/A — Monitor D1 query latency instead. -->
- [ ] Monitor IOPS where relevant <!-- N/A — D1 abstracts IOPS; monitor row reads/writes per request. -->
- [ ] Configure appropriate retention policies
- [ ] Automate cleanup
- [ ] Verify backup storage efficiency

## 9. Network Optimization

- [ ] Measure network latency
- [ ] Measure bandwidth utilization
- [ ] Identify unnecessary network calls
- [ ] Reduce payload sizes
- [ ] Enable appropriate compression <!-- ADAPTED: Cloudflare auto-compress (gzip/brotli); ensure Cache-Control + minification via Vite. -->
- [ ] Optimize API request patterns
- [ ] Reduce chatty service-to-service communication <!-- ADAPTED: Browser ↔ Worker only; no inter-service mesh. Applies to heartbeat/proctor polling. -->
- [ ] Use connection reuse where appropriate <!-- ADAPTED: Browser fetch reuse; no manual keep-alive tuning needed. -->
- [ ] Review DNS performance <!-- N/A — Cloudflare DNS managed; no Route53 tuning. -->
- [ ] Review load-balancing configuration <!-- N/A — Cloudflare Anycast managed; no ALB/NLB to configure. -->
- [ ] Optimize geographically distributed traffic where relevant <!-- ADAPTED: Cloudflare edge is global by default; use Workers placement if needed. -->
- [ ] Review CDN usage where appropriate
- [ ] Monitor packet loss and retransmissions <!-- N/A — No host-level netstat; rely on Cloudflare analytics. -->

## 10. Infrastructure Optimization

- [ ] Review CPU allocation <!-- N/A — Workers CPU is shared/isolated; no vCPU assignment. Monitor CPU time vs 30s limit. -->
- [ ] Review memory allocation <!-- N/A — Fixed 128 MB per isolate. -->
- [ ] Review storage allocation <!-- N/A — D1 10 GB max; no volume sizing. -->
- [ ] Review virtual machine/container sizing <!-- N/A — No VM/container; Workers isolates only. -->
- [ ] Remove unused resources
- [ ] Right-size oversized resources <!-- N/A — No sizing to right-size in serverless; remove unused bindings instead. -->
- [ ] Increase capacity where resources are consistently saturated <!-- N/A — Workers autoscales; D1 is vertical-only — plan archival not capacity bump. -->
- [ ] Configure autoscaling where appropriate <!-- N/A — Workers autoscales automatically. -->
- [ ] Review load balancing <!-- N/A — Cloudflare managed. -->
- [ ] Review high-availability configuration <!-- N/A — Workers is multi-region HA by default; D1 is single-region with automatic failover. -->
- [ ] Review resource limits and reservations <!-- ADAPTED: Only D1 limits + Workers subrequest/CPU limits; document them. -->
- [ ] Optimize startup and deployment configuration
- [ ] Review infrastructure configuration for unnecessary overhead

## 11. Operating System Optimization

> **Entire section N/A — Cloudflare Workers is serverless with no OS shell access. All 14 items below are managed by the platform.**

- [ ] Install appropriate security and stability updates <!-- N/A — Serverless -->
- [ ] Remove unnecessary services <!-- N/A — Serverless -->
- [ ] Review startup processes <!-- N/A — Serverless -->
- [ ] Review scheduled tasks <!-- N/A — Serverless -->
- [ ] Review process priorities <!-- N/A — Serverless -->
- [ ] Review file-descriptor limits <!-- N/A — Serverless -->
- [ ] Review connection limits <!-- N/A — Serverless -->
- [ ] Review memory configuration <!-- N/A — Serverless -->
- [ ] Review filesystem configuration <!-- N/A — Serverless -->
- [ ] Monitor system-level resource utilization <!-- N/A — Serverless -->
- [ ] Ensure time synchronization works correctly <!-- N/A — Serverless -->
- [ ] Review system logs for recurring problems <!-- N/A — Serverless -->
- [ ] Avoid undocumented tuning changes <!-- N/A — Serverless -->

## 12. Reliability and Resilience

- [ ] Identify single points of failure
- [ ] Implement redundancy where justified <!-- ADAPTED: D1 is SPOF; justify R2 backup + Workers multi-region rather than replica. -->
- [ ] Test failover
- [ ] Test recovery procedures
- [ ] Configure health checks
- [ ] Implement appropriate timeouts
- [ ] Implement retries carefully
- [ ] Use exponential backoff where appropriate
- [ ] Prevent retry storms
- [ ] Implement circuit breakers where appropriate
- [ ] Define graceful degradation behavior
- [ ] Define failure-handling procedures
- [ ] Regularly test disaster recovery
- [ ] Verify backups can actually be restored
- [ ] Document recovery procedures

## 13. Security Optimization

- [ ] Apply security updates
- [ ] Remove unnecessary services and ports <!-- ADAPTED: Remove unnecessary Worker routes / open CORS (worker/index.js:6). No OS ports. -->
- [ ] Review authentication mechanisms
- [ ] Review authorization rules
- [ ] Apply least-privilege access
- [ ] Rotate credentials appropriately
- [ ] Protect secrets <!-- ADAPTED: wrangler secret, not [vars] in wrangler.toml:7. -->
- [ ] Encrypt sensitive data in transit
- [ ] Encrypt sensitive data at rest where required <!-- ADAPTED: D1 encrypts at rest; consider column-level for PII if needed. -->
- [ ] Review firewall rules <!-- ADAPTED: Cloudflare WAF / Rate Limiting rules, not iptables. -->
- [ ] Review exposed interfaces
- [ ] Monitor suspicious activity
- [ ] Audit privileged access
- [ ] Review dependencies for known vulnerabilities
- [ ] Ensure performance optimizations do not weaken security

## 14. Scalability

- [ ] Determine current maximum sustainable workload
- [ ] Test increasing user loads
- [ ] Test increasing data volumes
- [ ] Test peak traffic
- [ ] Test sustained traffic
- [ ] Test sudden traffic spikes
- [ ] Identify scaling bottlenecks
- [ ] Determine whether scaling should be vertical, horizontal, or both <!-- ADAPTED: Workers scales horizontally automatically; D1 is vertical-only. -->
- [ ] Implement autoscaling where appropriate <!-- N/A — Workers autoscales; no knob to configure. Document limit instead. -->
- [ ] Test scaling behavior
- [ ] Verify dependencies can scale with the system
- [ ] Verify databases can handle expected growth
- [ ] Plan capacity before reaching saturation

## 15. API and Service Optimization

- [ ] Identify slow endpoints
- [ ] Measure endpoint latency
- [ ] Measure endpoint throughput
- [ ] Optimize request/response payloads
- [ ] Reduce unnecessary API calls
- [ ] Implement pagination where appropriate
- [ ] Implement batching where appropriate
- [ ] Configure appropriate timeouts
- [ ] Configure rate limits
- [ ] Cache appropriate responses
- [ ] Optimize service-to-service communication <!-- N/A — No inter-service calls; only Browser → Worker. -->
- [ ] Monitor dependency failures
- [ ] Establish API performance targets

## 16. Concurrency and Parallelism

- [ ] Identify work that can safely execute concurrently
- [ ] Identify unnecessary serialization
- [ ] Review thread pools <!-- N/A — No thread pool; Workers isolate is single-threaded. -->
- [ ] Review worker pools <!-- N/A — No worker pool; use Promise.all() for I/O parallelism. -->
- [ ] Review queue configuration <!-- N/A — No queue. -->
- [ ] Monitor contention
- [ ] Prevent race conditions
- [ ] Prevent deadlocks <!-- ADAPTED: D1 serialized writes; prevent logical races (e.g., duplicate session start). -->
- [ ] Prevent starvation <!-- N/A — No thread starvation; monitor D1 write queue saturation. -->
- [ ] Limit concurrency to protect dependencies
- [ ] Benchmark changes under realistic load

## 17. Deployment and CI/CD

- [ ] Optimize build times
- [ ] Remove unnecessary build steps
- [ ] Cache build dependencies where appropriate
- [ ] Optimize deployment time
- [ ] Automate testing
- [ ] Automate security checks
- [ ] Automate infrastructure validation
- [ ] Use safe rollout strategies <!-- ADAPTED: wrangler versions / gradual rollouts, not blue/green VMs. -->
- [ ] Support rollback <!-- ADAPTED: wrangler rollback + D1 backup restore. -->
- [ ] Monitor deployments
- [ ] Measure deployment failure rate
- [ ] Keep environments consistent

## 18. Cost Optimization

- [ ] Identify major cost drivers
- [ ] Remove unused resources
- [ ] Right-size infrastructure <!-- N/A — No VM sizing; right-size = remove unused bindings / D1 rows. -->
- [ ] Review storage costs
- [ ] Review database costs
- [ ] Review network costs <!-- ADAPTED: Workers egress + D1 row reads/writes; CDN is mostly free. -->
- [ ] Review licensing costs <!-- N/A — No paid licenses beyond Cloudflare plan. -->
- [ ] Review logging/monitoring costs
- [ ] Review data-transfer costs
- [ ] Use lower-cost resources where performance permits
- [ ] Automate shutdown of non-production resources where appropriate <!-- N/A — No always-on VMs to shut down; preview envs are ephemeral. -->
- [ ] Establish cost budgets and alerts
- [ ] Measure cost per user/request/transaction where useful

## 19. Testing and Benchmarking

- [ ] Establish baseline benchmarks
- [ ] Create repeatable performance tests
- [ ] Test normal workloads
- [ ] Test peak workloads
- [ ] Perform load testing
- [ ] Perform stress testing
- [ ] Perform endurance testing
- [ ] Test failure scenarios
- [ ] Compare before/after metrics
- [ ] Test under production-like conditions
- [ ] Verify optimization does not introduce regressions
- [ ] Record benchmark results

## 20. Change Management

- [ ] Make one significant optimization at a time when practical
- [ ] Document the change
- [ ] Record the reason for the change
- [ ] Record expected impact
- [ ] Measure actual impact
- [ ] Keep configuration changes version-controlled
- [ ] Maintain rollback procedures
- [ ] Avoid undocumented manual tuning
- [ ] Review unexpected side effects
- [ ] Keep an optimization history

## 21. User Experience

- [ ] Measure real user latency
- [ ] Identify slow user workflows
- [ ] Reduce unnecessary loading
- [ ] Optimize frontend assets where applicable
- [ ] Optimize API calls
- [ ] Use lazy loading where appropriate
- [ ] Provide useful loading states
- [ ] Reduce unnecessary UI work
- [ ] Monitor client-side errors
- [ ] Measure important user journeys
- [ ] Prioritize optimizations that users actually notice

## 22. Monitoring After Optimization

- [ ] Compare performance against baseline
- [ ] Monitor error rates
- [ ] Monitor resource usage
- [ ] Monitor latency
- [ ] Monitor throughput
- [ ] Monitor availability
- [ ] Monitor costs
- [ ] Monitor user experience
- [ ] Watch for delayed regressions
- [ ] Confirm improvements remain stable over time

## 23. Documentation

- [ ] Document architecture
- [ ] Document dependencies
- [ ] Document important configuration
- [ ] Document performance limits
- [ ] Document known bottlenecks
- [ ] Document optimization decisions
- [ ] Document operational procedures
- [ ] Document recovery procedures
- [ ] Document monitoring dashboards
- [ ] Document alert meanings
- [ ] Document rollback procedures
- [ ] Keep documentation current

## 24. Continuous Optimization

- [ ] Review performance regularly
- [ ] Review capacity regularly
- [ ] Review costs regularly
- [ ] Review security regularly
- [ ] Review technical debt regularly
- [ ] Re-run benchmarks after major changes
- [ ] Review production telemetry
- [ ] Prioritize improvements based on measurable impact
- [ ] Remove optimizations that no longer provide value
- [ ] Reassess architecture as requirements change

## 25. Final Optimization Gate

Before declaring the system optimized:

- [ ] Performance has been measured before and after changes
- [ ] The primary bottlenecks have been addressed
- [ ] Reliability has not been degraded
- [ ] Security has not been weakened
- [ ] Scalability requirements are satisfied
- [ ] Costs are understood and acceptable
- [ ] Monitoring is in place
- [ ] Alerts are working
- [ ] Backups and recovery have been tested
- [ ] Rollback procedures exist
- [ ] Documentation has been updated
- [ ] Production behavior has been observed after deployment
- [ ] Remaining bottlenecks have been documented
- [ ] A follow-up optimization review has been scheduled

## Optimization Priority — Progress 2026-09-01

When deciding what to optimize first, use this order:

1. [x] **Correctness** — gradebook weighted avg fix `270f479`, `src/utils.js` parity kept
2. [x] **Security** — P0 gated 19 routes, stripped answers, cors allowlist, rate-limit (`worker/index.js:6,34,281`) — `dd9319d`/`9bfb429`
3. [x] **Reliability** — health `GET /api/health`, `Promise.all`, `db.batch`, retries, backups — `d86c765`
4. [x] **Observability** — `docs/perf-baseline.md` + `docs/perf-after.md`, Server-Timing, `wrangler tail`
5. [x] **Major bottlenecks** — indexes, pagination, SELECT trim (roster), N+1 — `d86c765` + Phase4
6. [x] **Scalability** — `k6` stub `scripts/bench.mjs`, limits documented `ARCHITECTURE.md:12.1`
7. [x] **User experience** — lazy `src/App.jsx`, `manualChunks`, SW LRU/TTL, memo, debounce — `c578ac0`/`44bce12`
8. [x] **Cost** — retention 90d + 7d, cron `0 * * * *` (was `* * * * *`), SELECT cut 60-80% — Phase4
9. [x] **Maintainability** — `wrangler.toml:3` 2026-09-01, `.github/workflows/ci.yml`, `ARCHITECTURE.md:12.1-12.2`
10. [ ] **Micro-optimizations** — Only pursue these when measurement shows they matter

### Core Rule

- [x] **Measure → Identify → Change → Benchmark → Validate → Monitor → Document → Repeat** — perf-baseline/after + build + tail + docs
