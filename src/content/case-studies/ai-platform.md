---
title: Making an AI Integration Portable
description: How I introduced structured LLM output into an enterprise analytics workflow without moving business rules into the model or coupling the application to one provider.
status: published
tags:
  - Applied AI
  - Software Architecture
  - Structured Outputs
  - Observability
featured: true
---

> The organization, product, providers, models, and operational identifiers have been intentionally omitted. The architecture and lessons are real; sensitive implementation details are not.

## Context

I was leading the architecture and implementation of an enterprise analytics product that turns natural-language questions into governed queries. Most questions could follow deterministic paths, but some needed semantic interpretation before the application could build a safe query plan.

The existing model integration worked, but the application knew too much about its transport. Replacing a provider—or even changing the API used to reach the same model—risked touching application configuration and operational code. That was the wrong boundary for a capability we expected to evaluate and evolve.

## The problem

The task was not simply to call another model. I needed to make the integration portable while preserving the parts that made the product trustworthy:

- business semantics and validation remained in the application;
- conversation state stayed isolated and owned by the product;
- generated SQL remained read-only and constrained to an approved reporting surface;
- synchronous and streaming endpoints kept equivalent behavior;
- failures and model usage remained attributable without recording prompts, answers, business values, or personal data;
- rollout and rollback stayed explicit.

The first pilot proved that a neutral interface was possible, but it did not prove real portability. Its preferred transport also failed an operational gate in the target environment, so the candidate was rolled back instead of being promoted on architectural optimism.

## Options considered

### Keep provider clients inside the application

This had the lowest short-term cost, but every new provider would duplicate authentication, timeouts, error mapping, structured-output handling, and telemetry. It would also make provider details part of the product's architecture.

### Build a universal AI gateway

A central gateway looked attractive on paper, but there was no measured need for another network hop or a new operational service. It would have widened the project before the contract was understood.

### Introduce a small, provider-neutral runtime

The selected approach separated a stable capability contract from provider adapters. The product selected a certified profile; the runtime resolved the provider, transport, model, and supported capabilities behind that identifier.

This was the smallest design that addressed the actual problem without pretending every future AI use case had already been discovered.

## Decision

I used one rule to keep the boundary honest:

> The model proposes; the application decides.

The shared runtime owns transport concerns: authentication, hard timeouts, structured-output mechanics, normalized failures, bounded retries, and technical metadata. The analytics product still owns prompts, semantic vocabulary, conversation state, functional validation, query planning, SQL safety, and every business effect.

The application chooses only a versioned profile identifier. It does not branch on provider SDKs or API families. Technical details remain observable, but they do not leak into the application contract.

## Implementation

I delivered the change in evidence-driven slices:

1. Defined a minimal typed contract for structured output and a closed set of capabilities.
2. Added contract tests before implementing provider adapters.
3. Reused the existing prompt, payload, schema, and domain validators so comparisons measured transport and model behavior—not simultaneous product changes.
4. Treated every model response as untrusted input and rejected output that failed structural or functional validation.
5. Preserved a high-precision deterministic path for questions that did not need a model.
6. Added explicit failure categories for timeout, authentication, provider failure, and invalid output instead of hiding them behind fallback values.
7. Recorded bounded technical metadata—profile, versions, attempts, latency, token usage, and outcome—without persisting prompt content or business data.
8. Verified parity between synchronous and streaming paths, conversation isolation, safe failure behavior, and the absence of hidden fallback.

When the first candidate failed an environment permission gate, I rolled it back and kept the evidence. The next iteration compared multiple certified transports and providers using the same use case, prompt, schema, planner, and validators. Changing provider became a configuration decision rather than an application rewrite.

## Outcome

The result was a reusable AI integration boundary that proved portability in a real consumer, not only in an SDK test project.

- The analytics application could move between certified profiles without changing its business or application layers.
- Provider-specific types stayed behind adapters.
- Structured output, hard timeouts, normalized errors, and technical telemetry became shared behavior.
- Deterministic and model-assisted paths continued to coexist, allowing the cheaper and more predictable path to win when it was sufficient.
- Rollout decisions remained separate from technical certification: a compatible profile was not automatically authorized for production data or traffic.

Not every evaluated candidate was promoted. Some were rejected for operational fit, quality, latency, cost, or data-governance constraints. That was part of the result, not a failure of the platform: the architecture made those decisions comparable and reversible.

## What I learned

Provider neutrality is not achieved by renaming vendor types. It is proven when a real application changes provider without changing its semantics, validation, or business workflow.

Structured output narrows uncertainty, but it does not make model output trustworthy. Local validation remains the authority.

Retries are not invisible resilience for probabilistic systems. They consume latency and budget and may produce a different answer, so they need explicit limits and attribution.

Finally, technical certification and production approval are different decisions. Compatibility belongs to the platform; data treatment, credentials, budget, and rollout belong to each deployment.
