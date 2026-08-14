---
title: Taking a Data Refresh Out of the API
description: How I turned a manually run data loader into an asynchronous, auditable pipeline with transactional dispatch, ephemeral workers, and explicit recovery.
status: published
tags:
  - Cloud Architecture
  - DevOps
  - Distributed Systems
  - Infrastructure as Code
featured: true
---

> The organization, product, cloud provider, datasets, and operational identifiers have been intentionally omitted. The architecture and production outcome are real; sensitive details are not.

## Context

An enterprise analytics product depended on a console application to refresh its reporting data. The loader already handled the data correctly, but running it was a manual operation: an engineer selected arguments, supplied local configuration, started the process, and inspected separate audit records afterward.

That was acceptable while the product was being shaped. It was not a safe operating model for a production capability that an authorized user needed to trigger and observe without engineering assistance.

I led the design and delivery of a control plane around the existing loader. The goal was not to rewrite the data pipeline. It was to make one approved operation safe, observable, and repeatable from the product itself.

## The problem

A button in the UI sounds simple. Behind it were several failure modes:

- the HTTP request could be accepted and the process could fail before work was dispatched;
- duplicate messages could start competing workers;
- a worker could disappear without recording a terminal result;
- configuration changes could alter work that was already queued;
- the API could inherit cloud permissions and resource consumption that did not belong in its runtime;
- retries could repeat work without proving which execution still owned it;
- an operational failure could leak infrastructure or source-system details to the browser.

The loader's upserts were idempotent, but idempotency alone did not prevent two processes from doing the same expensive work at once. The system needed coordination, not just safe writes.

## Options considered

### Run the loader inside the API

Hosting it as a background service would have been quick, but it tied a long-running, resource-heavy workload to the API lifecycle. Deployments, autoscaling, and crashes would become data-refresh concerns, while the API would need source credentials and execution responsibilities it did not otherwise require.

### Let the API start a container directly

This kept the workload separate, but gave the API permission to launch infrastructure and left a gap between accepting a request and successfully starting the task. Reconstructing that intent after a crash would require another persistence mechanism anyway.

### Separate the control plane from execution

The selected design persisted the request and its dispatch intent together, then used a queue-to-task integration to start an ephemeral worker. The API controlled the operation; it did not perform it.

This introduced more moving parts, but each had a narrow responsibility and a failure mode we could observe and test.

## Decision

The flow became:

```text
Authorized UI
  → API
  → database transaction: request + outbox
  → queue
  → ephemeral container task
  → atomic lease
  → approved data contracts
  → reporting model + audit
```

The browser sends no dataset, connection string, table name, command-line argument, or infrastructure parameter. It can only request the one operation the server has approved.

The API responds as soon as the request and outbox record are committed. A dispatcher publishes only an opaque request identifier. The worker resolves the versioned manifest and trusted configuration from the server side, claims the request atomically, and renews a lease while it works.

At most one request can be active in an environment. A queue may deliver a message more than once, but only one worker can own the lease. Every state transition verifies the request, owner, and current status before writing.

## Implementation

I split the work into independently reviewable slices:

1. Added the request lifecycle, database constraints, lease, heartbeat, deadlines, and per-contract audit using real database integration tests.
2. Restricted the production worker to a request identifier and a versioned manifest. Free-form operational arguments remained outside the governed path.
3. Persisted the request and outbox message in one transaction so an accepted HTTP response could not lose its dispatch intent.
4. Added bounded dispatch retries and separate monitors for publication failure, task-start timeout, lease loss, and maximum runtime.
5. Made lease loss cooperative: a worker that no longer owns the request stops at the next safe boundary instead of overwriting a newer owner.
6. Defined the queue, dead-letter queue, task, logs, secrets metadata, least-privilege roles, and alarms as infrastructure as code.
7. Published immutable container images and required a known rollback image before enabling dispatch.
8. Added an administrative UI for current state, freshness, contract results, and history without exposing task identifiers, leases, or infrastructure details.

The delivery flag started disabled. Code, infrastructure, credentials, deployment, activation, and the first production execution were separate checkpoints. Each could be reviewed or rolled back without pretending the next one had already been authorized.

## Outcome

A controlled rollout completed the approved data contracts successfully and produced the expected operational evidence. The UI showed the request from acceptance through its terminal result and retained an auditable history.

The API remained a responsive control plane, while the data workload ran in an isolated, short-lived container with narrowly scoped permissions. A duplicate delivery could no longer create two owners, and a process that lost its lease could not continue writing as if it were still authoritative.

Failure modes such as duplicate delivery, dead-letter handling, forced interruption, and lease expiry were treated as separate controlled checkpoints rather than inferred from one successful run. That boundary remained explicit in the operational evidence.

## What I learned

Idempotency and mutual exclusion solve different problems. Safe repeated writes do not make concurrent execution free or operationally acceptable.

An outbox is valuable here because it preserves intent, not because it promises exactly-once delivery. The request identity and atomic claim make at-least-once delivery manageable.

Long-running work needs an explicit owner, lease, deadline, and terminal state. A process being absent is not a useful status.

Finally, production readiness is a sequence of evidence and permissions. Keeping code delivery, infrastructure changes, activation, smoke testing, and failure injection as separate gates made the rollout slower—but much safer and easier to reverse.
