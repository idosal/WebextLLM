import objectHash from "object-hash"
import { type ChatMessage, ErrorCode } from "window.ai"

import { definedValues, parseDataChunks } from "~core/utils/utils"

// import {initClient} from "~core/llm/native/llmChatPipeline";

// These options are specific to the model shape and archetype
export interface ModelConfig {
  modelCacheUrl: string
  modelProvider: string
  isStreamable: boolean
  getPath: (request: RequestData) => string
  transformForRequest: (
    request: RequestData,
    meta: RequestMetadata
  ) => Record<string, unknown>
  transformResponse: (res: unknown) => string[]

  wasmUrl: string
  // maxGenLength: number;
  // maxWindowLength: number;
  // meanGenLength: number;
  kvConfig: { numLayers: number; shape: number[]; dtype: string }
  tokenizer: string
  setInitProgress: (percent: number) => void
  temperature: number

  // Optionals
  overrideModelParam?: (request: RequestData) => string | null
  customHeaders?: Record<string, string>
  authPrefix?: string
  debug?: boolean
  retries?: number
  endOfStreamSentinel?: string | null
  cacheGet?: CacheGetter
  cacheSet?: CacheSetter
}

export interface RequestOptions {
  baseUrl?: string
  apiKey?: string | null
  model?: string | null
  frequency_penalty?: number
  presence_penalty?: number
  top_p?: number
  stop_sequences?: string[]
  num_generations?: number
  temperature?: number
  timeout?: number
  user_identifier?: string | null
  max_tokens?: number | null
  stream?: boolean
}

type RequestPromptBasic = { prompt: string; suffix?: string }
type RequestPromptChat = { messages: ChatMessage[] }

export interface RequestPrompt
  extends Partial<RequestPromptBasic>,
    Partial<RequestPromptChat> {}

export type RequestData = Omit<
  Required<RequestOptions>,
  "user_identifier" | "timeout" | "apiKey" | "adapter" // These do not affect output of the model
> &
  Pick<Required<ModelConfig>, "modelProvider"> & // To distinguish btw providers with same-name models
  RequestPrompt

export type RequestMetadata = Pick<RequestOptions, "user_identifier">

// TODO cache statistics and log probs etc
export type CacheGetter = (id: string) => Promise<string[] | null | undefined>

export type CacheSetter = (data: {
  id: string
  prompt: RequestData
  completion: string[]
}) => Promise<unknown>

interface LlmClient {
  generate: (
    input: RequestPrompt,
    callback: (u: string) => void,
    config: RequestOptions
  ) => Promise<unknown>
  stream: (
    input: RequestPrompt,
    callback: (u: string) => void,
    config: RequestOptions
  ) => Promise<ReadableStream<string>>
}

export class Model {
  public api: LlmClient
  public config: Required<ModelConfig>
  public defaultOptions: Required<RequestOptions>

  constructor(
    client: LlmClient,
    config: ModelConfig,
    opts: RequestOptions = {}
  ) {
    // Defaults
    this.config = this.addDefaults(config)
    this.api = client
    this.defaultOptions = {
      model: null,
      // apiKey: null,
      timeout: 25000,
      user_identifier: null,
      frequency_penalty: 0,
      presence_penalty: 0,
      temperature: 0, // OpenAI defaults to 1
      top_p: 1, // OpenAI default, rec. not change unless temperature = 1
      stop_sequences: [], // OpenAI default
      num_generations: 1,
      max_tokens: 16, // OpenAI default, low for safety
      stream: false,
      ...definedValues(opts)
    }
  }

  addDefaults(config: ModelConfig): Required<ModelConfig> {
    const opts: Required<ModelConfig> = {
      retries: 5,
      debug: true,
      customHeaders: {},
      endOfStreamSentinel: null,
      ...definedValues(config),
      // Functions throw a ts error when placed above the spread
      overrideModelParam:
        config.overrideModelParam || ((request: RequestData) => request.model),
      cacheGet: config.cacheGet || (() => Promise.resolve(undefined)),
      cacheSet: config.cacheSet || (() => Promise.resolve(undefined))
    }
    return opts
  }

  log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[MODEL ${this.config.modelProvider}]: `, ...args)
    }
  }

  error(...args: unknown[]): void {
    if (this.config.debug) {
      console.error(`[MODEL ${this.config.modelProvider}]: `, ...args)
    }
  }

  getRequestIdentifierData(
    requestPrompt: RequestPrompt,
    opts: Required<RequestOptions>
  ): RequestData {
    const ret = {
      ...requestPrompt,
      model: opts.model,
      modelProvider: this.config.modelProvider,
      temperature: opts.temperature,
      top_p: opts.top_p,
      frequency_penalty: opts.frequency_penalty,
      presence_penalty: opts.presence_penalty,
      stop_sequences: opts.stop_sequences,
      num_generations: opts.num_generations,
      max_tokens: opts.max_tokens,
      stream: opts.stream,
      baseUrl: opts.baseUrl
    }
    return {
      ...ret,
      model: this.config.overrideModelParam(ret)
    }
  }

  async complete(
    requestPrompt: RequestPrompt,
    requestOpts: RequestOptions = {}
  ): Promise<string[]> {
    const {
      transformForRequest,
      // getPath,
      cacheGet,
      cacheSet,
      transformResponse
    } = this.config
    const opts: Required<RequestOptions> = {
      ...this.defaultOptions,
      ...definedValues(requestOpts)
    }
    const request = this.getRequestIdentifierData(requestPrompt, opts)
    const id = objectHash(request)
    const promptSnippet = JSON.stringify(requestPrompt).slice(0, 100)
    const cached = await cacheGet(id)
    if (cached) {
      this.log(`\nCACHE HIT for id ${id}: ${promptSnippet}...`)
      return cached
    }
    this.log(`COMPLETING id ${id}: ${promptSnippet}...`, {
      modelId: request.model
    })
    let result = ""
    try {
      const payload = transformForRequest(request, opts)

      result = await this.api.generate(payload, console.log, requestOpts)
      result = result.data
    } catch (err: unknown) {
      const errMessage = `${err.response?.status}: ${err}`
      this.error(errMessage + "\n" + err.response?.data)
      throw new Error(ErrorCode.ModelRejectedRequest + ": " + errMessage)
    }

    await cacheSet({
      id,
      prompt: request,
      completion: [result]
    })
    this.log("SAVED TO CACHE: " + id)
    return [result]
  }

  async stream(
    requestPrompt: RequestPrompt,
    requestOpts: RequestOptions = {}
  ): Promise<ReadableStream<string>> {
    const opts: Required<RequestOptions> = {
      ...this.defaultOptions,
      ...definedValues(requestOpts),
      stream: true
    }
    const { transformResponse, transformForRequest } = this.config
    const request = this.getRequestIdentifierData(requestPrompt, opts)
    const id = objectHash(request)
    const promptSnippet = JSON.stringify(requestPrompt).slice(0, 100)
    // const payload = transformForRequest(request, opts)
    this.log(`STREAMING id ${id}: ${promptSnippet}...`, {
      modelId: request.model
    })

    try {
      const payload = transformForRequest(request, opts)
      const response = await this.api.stream(payload, console.log, {})

      return response
    } catch (err: unknown) {
      const errMessage = `${err.response?.status}: ${err}`
      this.error(errMessage + "\n" + err.response?.data)
      throw new Error(ErrorCode.ModelRejectedRequest + ": " + errMessage)
    }
  }

  protected _getRequestHeaders(opts: Required<RequestOptions>) {
    const { authPrefix } = this.config
    return {
      Authorization: `${authPrefix}${opts.apiKey || ""}`
    }
  }

  private _executeTransform(
    chunkStr: string,
    transformResponse: (responseData: Record<string, any>) => string[],
    {
      onEnd,
      onError,
      onResult
    }: {
      onEnd: () => void
      onError: (err: Error) => void
      onResult: (result: string) => void
    }
  ) {
    let fullResult = ""
    // this.log("Batched chunk: ", chunkStr)
    for (const chunkDataRes of parseDataChunks(chunkStr)) {
      if (chunkDataRes === this.config.endOfStreamSentinel) {
        this.log(
          "End: ",
          chunkDataRes,
          "Full chunk: ",
          chunkStr,
          "Running result: ",
          fullResult
        )
        if (fullResult) {
          // The last data is empty and just has the finish_reason,
          // but there might have been data earlier in the chunk
          onResult(fullResult)
        }
        onEnd()
        return
      } else {
        const chunkData = JSON.parse(chunkDataRes)
        const result = transformResponse(chunkData)
        if (typeof result[0] !== "string") {
          const e = new Error(`Returned empty data: ${chunkDataRes}`)
          this.error(e)
          onError(e)
          return
        } else {
          this.log("Result: ", result)
          fullResult += result
        }
      }
    }
    onResult(fullResult)
  }
}
