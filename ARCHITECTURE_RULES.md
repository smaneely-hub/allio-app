# ARCHITECTURE_RULES.md

## Purpose

This file defines **where logic belongs** in Allio.

The goal is to prevent intelligence from drifting into the wrong layer.

## Layer rules

### 1. Frontend
The frontend should handle:
- rendering
- interaction
- local UI state
- loading / error states
- lightweight validation
- hiding malformed or empty sections

The frontend should **not** be the main source of:
- meal reasoning
- meal selection logic
- household inference
- recommendation logic
- fallback fake intelligence unless explicitly temporary

### 2. Backend / persistence layer
The backend should handle:
- saving household data
- saving member data
- saving schedules and plans
- shopping list persistence
- orchestration between frontend and model
- schema validation and normalization

### 3. LLM / prompt layer
The model should handle:
- meal generation
- contextual reasoning
- why-this-works explanations
- variations
- similar options
- context-sensitive suggestions
- household-aware planning logic

If something is intended to feel intelligent, it should usually live here.

## Default rule

**Frontend = context collector + renderer**

**LLM = intelligence layer**

**Backend = persistence + orchestration**

## Feature classification checklist

Before implementing a feature, classify it as one of:
- UI logic
- backend logic
- prompt / LLM logic
- validation only

If the answer is unclear, stop and resolve that first.

## Temporary workaround rule

If a temporary patch is added, it must be documented as:
- temporary
- why it exists
- what layer should own this long term

## Architecture anti-patterns to avoid

- frontend-generated fake intelligence
- duplicate flows for one conceptual task
- confirmation screens for obvious next steps
- business logic hiding inside styling/components
- letting deploy success stand in for true verification
