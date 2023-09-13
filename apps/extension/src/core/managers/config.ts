import { v4 as uuidv4 } from "uuid"
import { EventType } from "window.ai"

import { Storage } from "@plasmohq/storage"

import { PortName } from "~core/constants"
import { Extension } from "~core/extension"
import {
  llama7b,
  llama13b,
  stableplatypus213bf16,
  redpajama,
  wizardcoder15bf16,
  wizardvicuna
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
          size: 4,
          vram: 7.9,
          description: 'Uncensored model with balanced system requirements'
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
          size: 1.7,
          vram: 3.9,
          description: 'Smallest model, for low-end devices'
        }
      case ModelID.Llama213B:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/mlc-ai/mlc-chat-Llama-2-13b-chat-hf-q4f32_1/resolve/main/",
          baseUrl: "",
          description: 'Larger model with Bad performance. Prefer Stable-Platypus2-f16',
          label,
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
          size: 8.6,
          vram: 10.3,
        }
      default:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
              "https://huggingface.co/mlc-ai/mlc-chat-RedPajama-INCITE-Chat-3B-v1-q4f32_0/resolve/main/",
          baseUrl: "",
          description: 'Smallest model, for low-end devices',
          label,
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
    // if (!config.baseUrl) {
    //   return false
    // }
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


    // TEMP: Handle unknown models using one custom model
    // const configs = await this.filter({
    //   auth: AuthType.APIKey,
    //   model: null
    // })
    // if (configs.length > 0) {
    //   return configs[0]
    // }
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
      case ModelID.Llama213B:
        return  llama13b
      case ModelID.StablePlatypus213Bf16:
        return stableplatypus213bf16
      case ModelID.WizardCoder15Bf16:
        return wizardcoder15bf16
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
          case ModelID.Llama213B:
            return "Llama-2-13B"
          case ModelID.StablePlatypus213Bf16:
            return "Stable-Platypus2-13B-f16"
          case ModelID.WizardCoder15Bf16:
            return "Wizard-Coder-15B-f16"
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