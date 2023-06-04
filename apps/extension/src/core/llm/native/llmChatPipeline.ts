// @ts-nocheck

import type { PromptInput } from "window.ai/dist"

import type { RequestPrompt } from "~core/llm/model"
import type { RequestOptions } from "~core/llm/nmodel"

import { Tokenizer } from "./tokenizer"
import { detectGPUDevice, instantiate } from "./tvm/tvmjs.bundle.js"
import EmccWASI from "./tvm/tvmjs_runtime.wasi.js"

function getFromParent(key: string) {
  return new Promise(function (resolve) {
    window.parent.postMessage({ name: "cacheGet", key }, "*")

    function handleMessage(event: MessageEvent<any>) {
      // Ensure the message is from the parent window
      if (event.source === window.parent) {
        // Resolve the promise with the received data
        resolve(event.data.val)
        window.removeEventListener("message", handleMessage)
      }
    }

    // Listen for messages from the parent window
    window.addEventListener("message", handleMessage)
  })
}

class LLMChatPipeline {
  tvm: any
  logger: any
  tokenizer: any
  bosTokenId: number
  eosTokenId: number
  maxWindowLength: number
  maxGenLength: number
  meanGenLength: number
  streamInterval: number
  decodingTotalTime: number
  decodingTotalTokens: number
  encodingTotalTime: number
  encodingTotalTokens: number
  conversation: any
  device: any
  vm: any
  encoding: any
  decoding: any
  params: any
  appeared_tokens: Set<any>
  fclearKVCaches: any
  kvCache: any
  logitsOnCPU: any
  kvCacheLength: number
  clearCache: boolean
  repetitionPenalty: number

  constructor(tvm: any, tokenizer: any, cacheMetadata: any, config: any) {
    if (cacheMetadata == undefined) {
      throw Error("Expect cacheMetadata")
    }
    this.tvm = tvm
    this.logger = console.log
    this.tokenizer = tokenizer
    this.bosTokenId = 1
    this.eosTokenId = 2
    this.repetitionPenalty = config.repetitionPenalty
    this.appeared_tokens = new Set()
    this.maxWindowLength = config.maxWindowLength
    this.maxGenLength = config.maxGenLength
    this.meanGenLength = config.meanGenLength
    this.streamInterval = 1

    this.decodingTotalTime = 0
    this.decodingTotalTokens = 0
    this.encodingTotalTime = 0
    this.encodingTotalTokens = 0

    this.device = this.tvm.webgpu() // FIXME webgpu
    this.vm = this.tvm.detachFromCurrentScope(
      this.tvm.createVirtualMachine(this.device)
    )
    this.encoding = this.tvm.detachFromCurrentScope(
      this.vm.getFunction("encoding")
    )
    this.decoding = this.tvm.detachFromCurrentScope(
      this.vm.getFunction("decoding")
    )
    this.params = this.tvm.detachFromCurrentScope(
      this.tvm.getParamsFromCache("param", cacheMetadata.ParamSize)
    )
    const fcreateCache = this.vm.getFunction("create_kv_cache")
    this.fclearKVCaches = this.tvm.detachFromCurrentScope(
      this.tvm.getGlobalFunc("vm.builtin.attention_kv_cache_array_clear")
    )

    // use extern config for now
    this.kvCache = this.tvm.detachFromCurrentScope(fcreateCache())
    // fill with pad token
    this.logitsOnCPU = undefined

    this.kvCacheLength = 0
    this.clearCache = true
  }

  dispose() {
    // note: tvm instance is not owned by this class
    this.params.dispose()
    this.decoding.dispose()
    this.encoding.dispose()
    this.vm.dispose()
    this.kvCache.dispose()
    this.fclearKVCaches.dispose()
    if (this.logitsOnCPU != undefined) {
      this.logitsOnCPU.dispose()
    }
  }

  private clearKVCache() {
    this.fclearKVCaches(this.kvCache)
  }

  private forward(inputs: any, curPos: number) {
    this.tvm.beginScope()
    var retValue
    const seqLenShape = this.tvm.makeShapeTuple([curPos])
    if (inputs.shape[1] > 1) {
      retValue = this.encoding(inputs, seqLenShape, this.kvCache, this.params)
    } else {
      retValue = this.decoding(inputs, seqLenShape, this.kvCache, this.params)
    }

    const logits = this.tvm.detachFromCurrentScope(retValue.get(0))
    // console.log('decoded', this.tokenizer.decode(logits))
    // console.log('logits', logits)
    this.tvm.endScope()
    this.tvm.attachToCurrentScope(logits)
    return logits
  }

  // NOTE: caller must call device.sync()
  private updateLogitsOnCPU(logits: any) {
    // console.log('logits', logits.toArray())
    if (this.logitsOnCPU == undefined) {
      this.logitsOnCPU = this.tvm.detachFromCurrentScope(
        this.tvm.empty(logits.shape, logits.dtype, this.tvm.cpu())
      )
    } else {
      if (logits.shape[0] != this.logitsOnCPU.shape[0]) {
        throw Error("We expect the size of logits to remain unchanged")
      }
    }
    this.logitsOnCPU.copyFrom(logits)
  }

  async sampleTokenFromLogits(logits, temperature = 1, top_p = 0.95) {
    this.tvm.beginScope()
    this.updateLogitsOnCPU(logits)
    this.tvm.endScope()
    await this.device.sync()
    // Creating array of pairs to store data
    const l = this.logitsOnCPU.toArray()
    const data: [number, number][] = new Array(l.length - 1)

    // Populating data array with logits and indices
    for (let i = 0; i < data.length; i++) {
      data[i] = [l[i], i]
    }

    // Sorting data array in descending order based on logits values
    // data.sort((a, b) => b[0] - a[0])
    // console.log('data', data)
    // console.log('decoded token', this.tokenizer.decode([data[0][1]]))
    if (this.repetitionPenalty < 1.0 + 1e-6) {
      return this.tvm.sampleTopPFromLogits(this.logitsOnCPU, temperature, top_p)
    } else {
      this.tvm.beginScope()
      // const appeared_tokens_ndarray = this.tvm.empty([1, this.appeared_tokens.size], "int32", this.tvm.cpu()); // FIXME track appeared_tokens
      // appeared_tokens_ndarray.copyFrom(Array.from(this.appeared_tokens));
      // this.tvm.applyRepetitionPenalty(this.logitsOnCPU, appeared_tokens_ndarray, this.repetitionPenalty);
      this.tvm.endScope()
      return this.tvm.sampleTopPFromLogits(this.logitsOnCPU, temperature, top_p)
    }
  }

  async getInputTokens(input: PromptInput) {
    this.kvCacheLength = 0
    this.clearCache = true

    let tokens = [this.bosTokenId]
    const prompts = input.messages
    prompts.push("ASSISTANT:")

    tokens.push(...(await this.tokenizer.encode(prompts[0])))
    let ctxLength = tokens.length
    let context = []
    let need_shift_window = false
    for (let i = prompts.length - 1; i > 0; --i) {
      const encoded = await this.tokenizer.encode(prompts[i])
      ctxLength += encoded.length
      if (
        this.kvCacheLength + ctxLength + this.meanGenLength >=
        this.maxWindowLength
      ) {
        console.log(
          "shift calculation",
          this.kvCacheLength,
          ctxLength,
          this.meanGenLength,
          this.maxWindowLength
        )
        need_shift_window = true
        break
      }
      context.unshift(encoded)
    }
    if (!need_shift_window) {
      console.log("no need shift window", context)
      for (const ctx of context) {
        tokens.push(...ctx)
      }
      return tokens
    }
    // need shift window and re-encode
    this.logger("need shift window")
    this.kvCacheLength = 0
    this.clearCache = true
    // abandon all tokens we collected
    tokens = [this.bosTokenId]
    const all_prompts = input.messages
    tokens.push(...(await this.tokenizer.encode(all_prompts[0])))
    context = []
    ctxLength = tokens.length
    //only keep 10% of the window context
    const fill_factor = 0.1
    for (let i = all_prompts.length - 1; i > 0; --i) {
      const encoded = this.tokenizer.encode(all_prompts[i])
      ctxLength += encoded.length
      if (
        ctxLength >= fill_factor * this.maxWindowLength &&
        i + 2 < all_prompts.length
      ) {
        break
      }
      context.unshift(encoded)
    }
    for (const ctx of context) {
      tokens.push(...ctx)
    }
    if (tokens.length + this.meanGenLength >= this.maxWindowLength) {
      throw Error("Exceed max window length curr=" + tokens.length)
    }
    return tokens
  }

  resetChat() {
    // this.conversation.reset();
    this.clearKVCache()
    this.decodingTotalTime = 0
    this.encodingTotalTime = 0
    this.decodingTotalTokens = 0
    this.encodingTotalTokens = 0
  }

  async generate(
    input: RequestPrompt,
    callbackUpdateResponse: any,
    config: RequestOptions
  ) {
    this.resetChat()

    const tokens = await this.getInputTokens(input)

    const inputTokenLength = tokens.length

    let outputPrompt = ""
    if (this.clearCache) {
      this.clearKVCache()
      this.clearCache = false
    }
    const maxGenLen = this.maxWindowLength - tokens.length
    if (maxGenLen < this.meanGenLength) {
      throw Error("Too small window size config")
    }

    let step = 0
    for (
      ;
      step < maxGenLen &&
      this.kvCacheLength + inputTokenLength + step < this.maxWindowLength;
      ++step
    ) {
      this.tvm.beginScope()
      var inputData
      let tstart = performance.now()
      if (step == 0) {
        inputData = this.tvm.empty([1, tokens.length], "int32", this.device)
        inputData.copyFrom(tokens)
      } else {
        inputData = this.tvm.empty([1, 1], "int32", this.device)
        inputData.copyFrom(tokens.slice(tokens.length - 1))
      }
      const logits = this.tvm.detachFromCurrentScope(
        this.forward(inputData, this.kvCacheLength + inputTokenLength + step)
      )
      this.tvm.endScope()

      const nextToken = await this.sampleTokenFromLogits(
        logits,
        input.temperature,
        input.top_p || 0.95
      )
      logits.dispose()

      tokens.push(nextToken)
      this.appeared_tokens.add(nextToken)
      const outputTokens = tokens.slice(inputTokenLength)
      outputPrompt = this.tokenizer.decode(outputTokens)

      if (nextToken == this.eosTokenId) break

      const stopPos = outputPrompt.lastIndexOf("</s>")
      if (stopPos != -1) {
        outputPrompt = outputPrompt.substring(0, stopPos)
        break
      }
      let tend = performance.now()
      if (step != 0) {
        this.decodingTotalTokens += 1
        this.decodingTotalTime += (tend - tstart) / 1000
      } else {
        this.encodingTotalTime += (tend - tstart) / 1000
        this.encodingTotalTokens += inputTokenLength
      }

      if (step % this.streamInterval == 0) {
        callbackUpdateResponse(step, outputPrompt)
      }
    }
    this.kvCacheLength += tokens.length - 1
    // this.conversation.messages[this.conversation.messages.length - 1][1] = outputPrompt;
    return outputPrompt
  }
}

export async function initTvm(
  wasmUrl: string,
  modelCacheUrl: string,
  progressCallback: ({ progress: number }) => void
) {
  const wasmSource = await (await fetch(wasmUrl)).arrayBuffer()

  const tvm = await instantiate(
    new Uint8Array(wasmSource),
    new EmccWASI(),
    console.log
  )
  const output = await detectGPUDevice()
  if (output !== undefined) {
    let label = "WebGPU"
    if (output.adapterInfo.description.length != 0) {
      label += " - " + output.adapterInfo.description
    } else {
      label += " - " + output.adapterInfo.vendor
    }
    tvm.initWebGPU(output.device)
  } else {
    throw Error("This browser env do not support WebGPU")
  }

  // const initProgressCallback = (report) => {
  //   if (config.setInitProgress) {
  //     config.setInitProgress(Math.floor(report.progress * 100))
  //   }
  // }
  tvm.registerInitProgressCallback(progressCallback)

  await tvm.fetchNDArrayCache(modelCacheUrl, tvm.webgpu(), {
    get: getFromParent,
    put: (k: string, val: any) =>
      window.parent.postMessage({ name: "cachePut", key: k, val }, "*")
  })
  return tvm
}

export async function initClient(tvm, tokenizer, config: any) {
  return tvm.withNewScope(
    () => new LLMChatPipeline(tvm, tokenizer, tvm.cacheMetadata, config)
  )
}

export async function initTokenizer(config: any) {
  // Initialize the LLMChatPipeline instance with required configs
  // const sp = await (await sentencePieceProcessor)(config.tokenizerUrl)
  const tJson = await (await fetch(config.tokenizerJson)).arrayBuffer()
  return await Tokenizer.fromJSON(tJson)
}

export async function generateCompletion(
  client: any,
  input: RequestPrompt,
  config: RequestOptions
): Promise<string> {
  const generated = await client.generate(
    input,
    async (i, completionPromise, t) => {
      const completion = await completionPromise
      window.parent.postMessage({ name: "streamResp", data: completion }, "*")
    },
    config
  )
  window.parent.postMessage({ name: "endStream" }, "*")

  return generated
}

// export async function generate
