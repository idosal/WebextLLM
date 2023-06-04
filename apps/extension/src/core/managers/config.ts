import { v4 as uuidv4 } from "uuid"
import { EventType } from "window.ai"

import { Storage } from "@plasmohq/storage"

import { PortName } from "~core/constants"
import { Extension } from "~core/extension"
import { native } from "~core/llm"
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
    const caller = await this.getCallerForAuth(auth, modelId)
    const label = this.getLabelForAuth(auth, modelId)
    switch (auth) {
      case AuthType.None:
        return {
          id,
          auth,
          models: modelId ? [modelId] : [],
          modelCacheUrl:
            "https://huggingface.co/spaces/idosal/web-llm/resolve/main/wizardlm-vicuna-7b-q4f32_0/",
          baseUrl: "",
          label
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

  async forModel(modelId: ModelID): Promise<Config> {
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
    return await this.init(AuthType.None)
  }

  // TODO: allow multiple custom models
  async forModelWithDefault(model?: string): Promise<Config> {
    if (!model) {
      return this.getDefault()
    }
    if (isKnownModel(model)) {
      return this.forModel(model)
    }
    // TEMP: Handle unknown models using one custom model
    // const configs = await this.filter({
    //   auth: AuthType.APIKey,
    //   model: null
    // })
    // if (configs.length > 0) {
    //   return configs[0]
    // }
    return await this.init(AuthType.None)
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

  async getCallerForAuth(auth: AuthType, modelId?: ModelID) {
    switch (auth) {
      case AuthType.None:
        return await native
      default:
        return await native
    }
  }

  getLabelForAuth(auth: AuthType, modelId?: ModelID) {
    switch (auth) {
      case AuthType.None:
        return "Wizard-Vicuna-7B-Uncensored"
      default:
        return "Native"
    }
  }

  async getCaller(config: Config) {
    return await this.getCallerForAuth(
      config.auth,
      this.getCurrentModel(config)
    )
  }

  getCurrentModel(config: Config): ModelID | undefined {
    // TODO: support multiple models per config
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
