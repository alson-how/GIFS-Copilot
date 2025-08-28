// Dummy extractor: in production, call your LLM and enforce JSON schema.
export async function extractFromLLM(userQuery){
  const q = (userQuery||'').toLowerCase();
  const isAI = /(gpu|tpu|npu|ai chip|accelerator|h100|a100)/.test(q);
  return {
    intent: "POLICY_HELP",
    cargo_category: isAI ? "semiconductor" : null,
    specialization: isAI ? ["ai_accelerator"] : [],
    constraints: { mode: null, origin: null, destination: null, regulatory_help: /permit|sta|export notice/.test(q) },
    language: "en"
  };
}
