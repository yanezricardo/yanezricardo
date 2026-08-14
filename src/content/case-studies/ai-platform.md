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

## The situation

I was working on an enterprise analytics product that turns natural-language questions into governed query plans. Many questions followed deterministic paths. Others needed semantic interpretation before the application could decide what to query.

The first model integration worked, but provider and transport details had spread into application configuration and operational code. Changing how the model was reached meant changing the product as well. That coupling made every evaluation more expensive than it needed to be.

## What had to stay true

Portability could not weaken the controls already built into the product. Business semantics and validation still belonged in the application. Conversation state had to stay isolated. Model-produced plans could only use approved, read-only reporting capabilities. Streaming and synchronous endpoints needed to agree, and telemetry could not record prompts, answers, business values, or personal data.

Those constraints mattered more than supporting another SDK.

## Choosing the boundary

Keeping provider clients inside the application was the quickest option, but it would repeat authentication, timeout handling, error mapping, structured output, and telemetry for each integration.

I also considered a central AI gateway. There was no measured reason to add another service or network hop, and the contract was still too young to generalize across unrelated products.

I chose a smaller boundary: a typed capability contract with provider adapters behind it. The application selects a versioned profile; the runtime resolves the provider, transport, model, and supported capabilities.

One rule kept responsibilities clear:

> The model proposes; the application decides.

The runtime handles authentication, hard timeouts, structured-output mechanics, retries, provider failures, and technical metadata. The product owns the prompt, vocabulary, conversation, functional validation, query planning, safety rules, and every business effect.

## How I implemented it

### Contract before adapters

I started with a minimal typed response and a closed set of capabilities. Contract tests came before provider adapters, which kept SDK behavior from defining the application interface by accident.

### Responses were still untrusted input

Every response passed structural and functional validation before the planner could use it. Invalid output produced a specific failure instead of a fallback value. Questions that already had a precise deterministic path continued to use it.

### Comparable evaluations

Provider candidates used the same use case, prompt, schema, planner, and validators. I recorded the profile, component versions, attempts, latency, token usage, and outcome, but not the prompt or business data. This made differences attributable without turning the telemetry store into a copy of the conversation.

Technical compatibility did not authorize a rollout. Each candidate still had to meet the deployment's requirements for credentials, data treatment, quality, latency, and cost.

## Result

- The analytics product could change certified profiles without changing its application or business layers.
- Provider SDK types stayed inside their adapters.
- Structured output, timeouts, errors, and technical telemetry behaved consistently across integrations.
- Deterministic and model-assisted paths continued to coexist, so a model was used only when it added value.

The boundary was tested inside the product that needed it; an isolated SDK project would not have been enough.

## Lessons

Renaming vendor types does not create provider neutrality. A real application has to change provider without changing its semantics, validation, or workflow.

Structured output makes responses easier to validate; it does not make them trustworthy. The application still has the final say.

Retries also deserve product scrutiny. They consume time and money and can return a different answer. I treat their limits and attribution as part of product behavior.
