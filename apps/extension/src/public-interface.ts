// ModelID is an enum of the available models.
export enum ModelID {
  WizardVicuna = "wizard-vicuna-7b",
  RedPajama = "redpajama",
  NousHermes13B = "noushermes-13b",
  NousHermes13Bf16 = "noushermes-13b-f16",
  StablePlatypus213Bf16 = "stable-platypus2-13b-f16",
  WizardCoder15Bf16 = "wizardcoder-15b-f16",
  WizardCoderPython34Bf16 = "wizardcoder-python-34b-f16",
  TinyLlama11Bf16 = "tinyllama-11-f16",
  Llama2AYT13Bf16 = "llama2-ayt-13b-f16",
}

export function isKnownModel(modelId: string): modelId is ModelID {
  return (Object.values(ModelID) as string[]).includes(modelId)
}
