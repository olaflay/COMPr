
# skills/ai-provider-adapter.md

```yaml
---
name: AI Provider Adapter
description: |
  Trigger on anything inside src/services/ai: adapters, prompts, confidence 
  mapping, or provider switching. Teaches the AiService contract, the two 
  dated human sign-offs, response validation, normalization, and the 
  fabrication net that enforces R11.
---

This skill governs the integration of AI/ML features (Phase 2/3: scene‑aware 
splitting, VMAF, upscaling). It ensures that AI services are treated as 
replaceable adapters, that responses are validated, and that the pipeline is 
never referred to as "AI" in UI copy. Its laws live in `AGENTS.md` (Rule 2) 
and PRD §33.

**⚠ PHASE 2/3 ONLY — DO NOT USE IN PHASE 1 MVP.**
This skill is dormant during Phase 1. PRD §6 explicitly excludes AI/ML features from MVP. 
AGENTS.md Q7 forbids reaching into Phase 2/3 to "future-proof" Phase 1 code. 
Do not implement any code from this skill until Phase 2 is explicitly authorized by a human.

## Procedure

1. **Define the `AiService` interface.**
   All adapters must implement a common contract: `generateSuggestions(input)` 
   returns a normalized, validated output. No adapter-specific data shapes 
   leak into the core `/lib`.

2. **Require human sign‑off for new AI features.**
   Before implementing any AI call, confirm that the feature is explicitly 
   in Phase 2 or Phase 3 of the roadmap. Phase 1 MVP must not contain AI. 
   (PRD §6, §34)

3. **Validate the response schema.**
   Every AI response must be checked against a JSON Schema. Reject responses 
   with missing fields or out‑of‑range confidence scores.

4. **Normalise the response to canonical types.**
   Convert provider‑specific fields (e.g., `OpenAI.confidence` vs 
   `Anthropic.sureness`) into the canonical shape used by the pipeline.

5. **Apply the fabrication net (R11).**
   Never allow AI to generate or overstate product capabilities. If the AI 
   suggests a feature that does not exist, reject it. If the AI fabricates 
   statistics, block it. (AGENTS.md Rule 3)

6. **Log token usage and cost.**
   Track input/output tokens and provider cost for billing and monitoring. 
   Store this data in the database, associated with the job.

## Code Skeleton (key patterns)

```typescript
// src/services/ai/contract.ts
export interface AiService {
  generateSuggestions(input: AiInput): Promise<AiOutput>;
}

// src/services/ai/openai-adapter.ts
export class OpenAiAdapter implements AiService {
  async generateSuggestions(input: AiInput): Promise<AiOutput> {
    const response = await this.client.chat.completions.create({ ... });
    const validated = AiOutputSchema.parse(response); // Zod / JSON Schema
    return {
      cuts: validated.segments.map(s => ({ timestamp: s.t, confidence: s.c })),
    };
  }
}
