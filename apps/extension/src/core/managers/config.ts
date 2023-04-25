import { v4 as uuidv4 } from "uuid"
import { EventType } from "window.ai"

import { Storage } from "@plasmohq/storage"

import { PortName } from "~core/constants"
import { Extension } from "~core/extension"
import { local, modelAPICallers, openrouter } from "~core/llm"
import { ModelID, isKnownModel } from "~public-interface"

import { BaseManager } from "./base"

export enum AuthType {
  // No internet or auth required - e.g. use localhost
  None = "none",
  // Use JWT auth to access a remote model router
  Token = "token",
  // Use an API key
  APIKey = "key"
}

const APIKeyURL: { [K in ModelID]: string } = {
  [ModelID.GPT3]: "https://platform.openai.com/account/api-keys",
  [ModelID.GPT4]: "https://platform.openai.com/account/api-keys",
  [ModelID.Together]: "https://api.together.xyz/",
  [ModelID.Cohere]: "https://dashboard.cohere.ai/api-keys"
}

const defaultAPILabel: { [K in ModelID]: string } = {
  [ModelID.GPT3]: "OpenAI: GPT-3.5",
  [ModelID.GPT4]: "OpenAI: GPT-4",
  [ModelID.Together]: "Together: GPT NeoXT 20B",
  [ModelID.Cohere]: "Cohere: Xlarge"
}

const authIndexName = "byAuth"

// TODO add `params` with model-specific params
export interface Config {
  id: string
  auth: AuthType
  label: string
  baseUrl: string
  models: ModelID[]

  token?: string
  apiKey?: string
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

  init(auth: AuthType, modelId?: ModelID): Config {
    const id = uuidv4()
    const caller = this.getCallerForAuth(auth, modelId)
    const label = this.getLabelForAuth(auth, modelId)
    switch (auth) {
      case AuthType.None:
        return {
          id,
          auth,
          label,
          models: [],
          baseUrl: caller.config.defaultBaseUrl
        }
      case AuthType.Token:
        return {
          id,
          auth,
          label,
          models: [ModelID.GPT3, ModelID.GPT4],
          baseUrl: caller.config.defaultBaseUrl
        }
      case AuthType.APIKey:
        if (!modelId) {
          throw new Error("A model ID is required for API key auth")
        }
        return {
          id,
          auth,
          models: [modelId],
          apiKey:
            modelId === ModelID.Together
              ? // TODO remove or fix this - env var not picked up
                process.env.PLASMO_PUBLIC_TOGETHER_API_KEY
              : undefined,
          baseUrl: caller.config.defaultBaseUrl,
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
        const defaults = this.init(config.auth, modelId)
        return {
          ...defaults,
          ...config
        }
      }
      await this.modelHandlers.remove(modelId)
    }
    // TODO include Token auth possibilities?
    return this.init(AuthType.APIKey, modelId)
  }

  isCredentialed(config: Config): boolean {
    if (!config.baseUrl) {
      return false
    }
    switch (config.auth) {
      case AuthType.None:
        return true
      case AuthType.Token:
        return !!config.token
      case AuthType.APIKey:
        return !!config.apiKey
    }
  }

  async setDefault(config: Config) {
    await this.save(config)
    const previous = (await this.defaultConfig.get("id")) as string | undefined
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
      const config = await this.get(id)
      if (config) {
        return config
      }
      await this.defaultConfig.remove("id")
    }
    return this.init(AuthType.Token)
  }

  // TODO: allow multiple custom models
  async forModelWithDefault(model?: string): Promise<Config> {
    if (!model) {
      return this.getDefault()
    }
    if (isKnownModel(model)) {
      return this.forModel(model)
    }
    // TEMP: Handle unknown models using localhost
    const configs = await this.filter({ auth: AuthType.None })
    if (configs.length > 0) {
      return configs[0]
    }
    return this.init(AuthType.None)
  }

  async filter({ auth }: { auth: AuthType }): Promise<Config[]> {
    const ids = await this.getIds(20, 0, authIndexName, auth)
    const maybeConfigs = await Promise.all(ids.map((id) => this.get(id)))
    return maybeConfigs.filter((c) => c !== undefined) as Config[]
  }

  async forAuthAndModel(auth: AuthType, modelId?: ModelID) {
    const forAuth = await this.filter({ auth })
    if (!modelId) {
      return forAuth[0]
    }
    return forAuth.find((c) => c.models.includes(modelId))
  }

  getCallerForAuth(auth: AuthType, modelId?: ModelID) {
    switch (auth) {
      case AuthType.None:
        return local
      case AuthType.Token:
        return openrouter
      case AuthType.APIKey:
        if (!modelId) {
          throw new Error("A model ID is required for API key auth")
        }
        return modelAPICallers[modelId]
    }
  }

  getLabelForAuth(auth: AuthType, modelId?: ModelID) {
    switch (auth) {
      case AuthType.None:
        return "Local"
      case AuthType.Token:
        return "OpenRouter"
      case AuthType.APIKey:
        if (!modelId) {
          throw new Error("A model ID is required for API key auth")
        }
        return defaultAPILabel[modelId]
    }
  }

  getCaller(config: Config) {
    return this.getCallerForAuth(config.auth, this.getCurrentModel(config))
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
      case AuthType.None:
        return "https://github.com/alexanderatallah/window.ai#-local-model-setup"
      case AuthType.Token:
        return (
          process.env.PLASMO_PUBLIC_OPENROUTER_URI || "https://openrouter.ai"
        )
      case AuthType.APIKey:
        const model = this.getCurrentModel(config)
        if (!model) {
          throw new Error("A model ID is required")
        }
        return APIKeyURL[model]
    }
  }
}

export const configManager = new ConfigManager()
