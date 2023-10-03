import {init} from "./native/wizard"
import {ModelID} from "~public-interface";

const DEFAULT_MAX_TOKENS = 256
const shouldDebugModels = process.env.NODE_ENV !== "production"

export const wizardvicuna = () => init(ModelID.WizardVicuna,
    {
      debug: shouldDebugModels
    },
    {
      max_tokens: 2048
    }
)

export const redpajama = () => init(ModelID.RedPajama,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 2048
    }
)

export const noushermes13b = () => init(ModelID.NousHermes13B,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 4096
    }
)

export const noushermes13bf16 = () => init(ModelID.NousHermes13Bf16,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 4096
    }
)

export const stableplatypus213bf16 = () => init(ModelID.StablePlatypus213Bf16,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 4096
    }
)

export const llama2ayt13bf16 = () => init(ModelID.Llama2AYT13Bf16,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 4096
    }
)

export const wizardcoder15bf16 = () => init(ModelID.WizardCoder15Bf16,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 4096
    }
)

export const tinyllama11b = () => init(ModelID.TinyLlama11Bf16,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 4096
    }
)


