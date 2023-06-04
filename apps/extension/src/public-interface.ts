// ModelID is an enum of the available models.
// NOTE: this is an evolving standard, and may change in the future.
export enum ModelID {
  Native = "native"
}

export function isKnownModel(modelId: string): modelId is ModelID {
  return (Object.values(ModelID) as string[]).includes(modelId)
}
