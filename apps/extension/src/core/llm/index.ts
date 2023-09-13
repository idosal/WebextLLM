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

export const llama13b = () => init(ModelID.Llama213B,
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

export const wizardcoder15bf16 = () => init(ModelID.WizardCoder15Bf16,
    {
        debug: shouldDebugModels
    },
    {
        max_tokens: 4096
    }
)

