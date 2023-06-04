import { init as initNative } from "./native/wizard"

const DEFAULT_MAX_TOKENS = 256
const shouldDebugModels = process.env.NODE_ENV !== "production"

export const native = initNative(
    {
      debug: shouldDebugModels
    },
    {
      max_tokens: 2048
    }
)

