import { v4 as uuidv4 } from "uuid"
import { EventType } from "window.ai"
import { Storage } from "@plasmohq/storage"
import { PortName } from "~core/constants"
import { Extension } from "~core/extension"
import {
  noushermes13b,
  stableplatypus213bf16,
  redpajama,
  wizardcoder15bf16,
  wizardvicuna,
  tinyllama11b,
  llama2ayt13bf16,
  noushermes13bf16
} from "~core/llm"
import { ModelID, isKnownModel } from "~public-interface"

import { BaseManager } from "./base"

export enum AuthType {
  None = "none"
}

const authIndexName = "byAuth"

// TODO add `params` with model-specific params
export interface Config {
  id: string
  auth: AuthType
  label: string
  baseUrl: string
  models: ModelID[]
  size: number
  vram: number
  description: string
  icon: string
  image: string
  modelCacheUrl?: string
  session?: { email?: string; expiresAt?: number }
  apiKey?: string
  downloaded?: boolean
}

class ConfigManager extends BaseManager<Config> {
  protected defaultConfig: Storage
  protected modelHandlers: Storage

  constructor() {
    super("configs", "sync")

    // Just store the id of the default config
    this.defaultConfig = new Storage({
      area: "sync"
    })
    this.defaultConfig.setNamespace(`configs-default-`)

    // For each ModelID, store the id of the config that handles it
    this.modelHandlers = new Storage({
      area: "sync"
    })
    this.modelHandlers.setNamespace(`configs-model-handlers-`)
  }

  async init(auth: AuthType, modelId?: ModelID): Promise<Config> {
    const id = uuidv4()
    // const caller = await this.getCallerForAuth(auth, modelId)
    const label = this.getLabelForAuth(auth, modelId)

    switch (modelId) {
      case ModelID.WizardVicuna:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/spaces/idosal/web-llm/resolve/main/wizardlm-vicuna-7b-q4f32_0/",
          baseUrl: "",
          label,
          icon: chrome.runtime.getURL('assets/wizardvicuna_icon.png'),
          image: chrome.runtime.getURL('assets/wizardvicuna.png'),
          size: 4,
          vram: 7.9,
          description: 'Uncensored model with a good balance of quality and system requirements'
        }
      case ModelID.RedPajama:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/mlc-ai/mlc-chat-RedPajama-INCITE-Chat-3B-v1-q4f32_0/resolve/main/",
          baseUrl: "",
          label,
          icon: chrome.runtime.getURL('assets/icon_icon.png'),
          image: chrome.runtime.getURL('assets/icon.png'),
          size: 1.7,
          vram: 3.9,
          description: 'Small model; Low-end devices should prefer TinyLlama (significantly lighter)'
        }
      case ModelID.NousHermes13B:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Nous-Hermes2-13b-q4f32_0/",
          baseUrl: "",
          description: 'Larger and more creative model. Prefer f16 for performance',
          label,
          icon: chrome.runtime.getURL('assets/hermes_icon.png'),
          image: chrome.runtime.getURL('assets/hermes.png'),
          size: 7.6,
          vram: 13.2,
        }
      case ModelID.NousHermes13Bf16:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Nous-Hermes2-13b-q4f16_1/",
          baseUrl: "",
          description: 'Large and creative model; Slightly worse than Stable-Platypus2 and Llama2-AYT',
          label,
          icon: chrome.runtime.getURL('assets/hermes_icon.png'),
          image: chrome.runtime.getURL('assets/hermes.png'),
          size: 6.8,
          vram: 9.9,
        }
      case ModelID.StablePlatypus213Bf16:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Stable-Platypus2-13B-q4f16_1/",
          baseUrl: "",
          description: 'SotA model, for higher-end devices',
          icon: chrome.runtime.getURL('assets/platypus_icon.png'),
          image: chrome.runtime.getURL('assets/platypuscut.png'),
          label,
          size: 6.8,
          vram: 9.9,
        }
      case ModelID.Llama2AYT13Bf16:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Llama2-chat-AYT-13B-q4f16_1/",
          baseUrl: "",
          description: 'SotA model, for higher-end devices',
          icon: chrome.runtime.getURL('assets/llama2_ayt_icon.png'),
          image: chrome.runtime.getURL('assets/llama2_ayt.png'),
          label,
          size: 6.8,
          vram: 9.9,
        }
      case ModelID.WizardCoder15Bf16:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/mlc-ai/mlc-chat-WizardCoder-15B-V1.0-q4f16_1/resolve/main/",
          baseUrl: "",
          description: 'Strong programming model',
          label,
          icon: chrome.runtime.getURL('assets/wizardcoder_icon.png'),
          image: chrome.runtime.getURL('assets/wizardcoder.png'),
          size: 8.6,
          vram: 10.3,
        }
      case ModelID.TinyLlama11Bf16:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/spaces/idosal/web-llm/resolve/main/TinyLlama-1.1B-Chat-v0.1-q4f16_1/",
          baseUrl: "",
          description: 'Smallest model, for low-end devices',
          label,
          icon: chrome.runtime.getURL('assets/tinyllama_icon.png'),
          image: chrome.runtime.getURL('assets/tinyllama.png'),
          size: 0.6,
          vram: 1.7,
        }
      default:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/mlc-ai/mlc-chat-RedPajama-INCITE-Chat-3B-v1-q4f32_0/resolve/main/",
          baseUrl: "",
          description: 'Small model; Low-end devices should prefer TinyLlama (much smaller but slightly worse)',
          label,
          icon: chrome.runtime.getURL('assets/icon_icon.png'),
          image: chrome.runtime.getURL('assets/icon.png'),
          size: 1.7,
          vram: 3.9,
        }
    }
  }

  async save(config: Config): Promise<boolean> {
    const isNew = await super.save(config)

    if (isNew) {
      // Index by auth type
      await this.indexBy(config, config.auth, authIndexName)
    }

    for (const modelId of config.models) {
      await this.modelHandlers.set(modelId, config.id)
    }

    return isNew
  }

  subscribe(callback: () => void): void {
    // console.log('subscribe')
    this.defaultConfig.watch({
      'id': (callback),
    })
  }

  async forModel(modelId: ModelID): Promise<Config> {
    // console.log('forModel', modelId)
    const configId = await this.modelHandlers.get(modelId)
    if (configId) {
      const config = await this.get(configId)
      if (config) {
        const defaults = await this.init(config.auth, modelId)
        return {
          ...defaults,
          ...config
        }
      }
      await this.modelHandlers.remove(modelId)
    }

    return this.init(AuthType.None, modelId)
  }

  isCredentialed(config: Config): boolean {
    switch (config.auth) {
      case AuthType.None:
        return config?.downloaded || false
      default:
        return false
    }
  }

  async setDefault(config: Config) {
    await this.save(config)
    const previous = await this.defaultConfig.get("id")
    await this.defaultConfig.set("id", config.id)
    if (previous !== config.id) {
      Extension.sendToBackground(PortName.Events, {
        request: {
          event: EventType.ModelChanged,
          data: { model: configManager.getCurrentModel(config) }
        }
      })
    }
  }

  async getDefault(): Promise<Config> {
    // console.log('get default')
    const id = (await this.defaultConfig.get("id")) as string | undefined
    if (id) {
      // this.defaultConfig.removeAll()
      const config = await this.get(id)
      if (config) {
        return config
      }
      await this.defaultConfig.remove("id")
    }
    // TODO switch to authtype external
    return await this.init(AuthType.None, ModelID.RedPajama)
  }

  // TODO: allow multiple custom models
  async forModelWithDefault(model?: string): Promise<Config> {
    // console.log('unknown model', model)
    if (!model || !isKnownModel(model)) {
      return this.getDefault()
    }

    return this.forModel(model)
  }

  // Filtering for `null` looks for configs that don't have any models
  async filter({
    auth,
    model
  }: {
    auth: AuthType
    model?: ModelID | null
  }): Promise<Config[]> {
    const ids = await this.getIds(100, 0, authIndexName, auth)
    const maybeConfigs = await Promise.all(ids.map((id) => this.get(id)))
    const configs = maybeConfigs.filter((c) => c !== undefined) as Config[]
    return configs.filter((c) =>
      model === null
        ? c.models.length === 0
        : model
        ? c.models.includes(model)
        : true
    )
  }

  async forAuthAndModel(auth: AuthType, modelId?: ModelID) {
    let forAuth: Config[]
    if (!modelId) {
      forAuth = await this.filter({ auth })
    } else {
      forAuth = await this.filter({ auth, model: modelId })
    }
    return forAuth[0]
  }

  getCallerForAuth(auth: AuthType, modelId?: ModelID) {
    switch (modelId) {
      case ModelID.WizardVicuna:
        return wizardvicuna
      case ModelID.RedPajama:
        return redpajama
      case ModelID.NousHermes13B:
        return  noushermes13b
      case ModelID.NousHermes13Bf16:
        return  noushermes13bf16
      case ModelID.StablePlatypus213Bf16:
        return stableplatypus213bf16
      case ModelID.Llama2AYT13Bf16:
        return llama2ayt13bf16
      case ModelID.WizardCoder15Bf16:
        return wizardcoder15bf16
      case ModelID.TinyLlama11Bf16:
        return tinyllama11b
      default:
        return redpajama
    }
  }

  getLabelForAuth(auth: AuthType, modelId?: ModelID) {
    switch (auth) {
      case AuthType.None:
        switch (modelId) {
          case ModelID.WizardVicuna:
            return "Wizard-Vicuna-Uncensored-7B"
          case ModelID.RedPajama:
            return "RedPajama-3B"
          case ModelID.NousHermes13B:
            return "Nous-Hermes-13B"
            case ModelID.NousHermes13Bf16:
            return "Nous-Hermes-13B-f16"
          case ModelID.StablePlatypus213Bf16:
            return "Stable-Platypus2-13B-f16"
          case ModelID.Llama2AYT13Bf16:
            return "Llama2-AYT-13B-f16"
          case ModelID.WizardCoder15Bf16:
            return "Wizard-Coder-15B-f16"
          case ModelID.TinyLlama11Bf16:
            return "TinyLlama-1.1B-f16"
          default:
            return "RedPajama-3B"
        }
      default:
        return "Native"
    }
  }

  async getCaller(config: Config) {
    return this.getCallerForAuth(
      config.auth,
      this.getCurrentModel(config)
    )()
  }

  getCurrentModel(config?: Config): ModelID | undefined {
    if (!config) return undefined
    if (config.models.length > 1) {
      return undefined
    }
    return config.models[0]
  }

  getExternalConfigURL(config: Config) {
    switch (config.auth) {
      default:
        return undefined
    }
  }
}

export const configManager = new ConfigManager()