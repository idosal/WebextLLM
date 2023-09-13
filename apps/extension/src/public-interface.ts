// ModelID is an enum of the available models.
// NOTE: this is an evolving standard, and may change in the future.
export enum ModelID {
  WizardVicuna = "wizard-vicuna-7b",
  RedPajama = "redpajama",
  Llama213B = "llama2-13b",
  StablePlatypus213Bf16 = "stable-platypus2-13b-f16",
  WizardCoder15Bf16 = "wizardcoder-15b-f16",
}

export function isKnownModel(modelId: string): modelId is ModelID {
  return (Object.values(ModelID) as string[]).includes(modelId)
}
