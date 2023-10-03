import type { ModelConfig, RequestOptions } from "~core/llm/model"
import { Model } from "~core/llm/nmodel"
import { ModelID } from "~public-interface"
import * as tvmjs from "~core/llm/native/tvm/index"
import { Tokenizer } from "~core/llm/native/tokenizer"
import type { RequestPrompt } from "~core/llm/model"
import { LLMChatPipeline } from "~core/llm/native/llmChatPipeline"
import type { ChatMessage } from "window.ai/dist";
import { fetchRetry } from "~sandboxes/utils";
import { Mutex } from "async-mutex"

const mutex = new Mutex()

let gTvm = undefined
let gTokenizer = undefined
// const baseUrl = window.location.search.split("=")[1]
const urlParams = new URLSearchParams(window.location.search)
const baseUrl = urlParams.get('baseUrl') || ''
const model = urlParams.get('model') || 'redpajama'
let interruptSignal = false
let client: any = null
let gConfig: ModelConfig

export async function init(): Promise<void> {
  try {
    await mutex.waitForUnlock()
    await mutex.runExclusive(async () => {
      gConfig = getConfig(<ModelID> model)

      if (!gTvm) {
        gTvm = await initTvm(gConfig.wasmUrl, gConfig.modelCacheUrl, (p) => {
          window.parent.postMessage({ type: "progress", progress: p }, "*")
        })
      }

      if (!gTokenizer) {
        gTokenizer = await initTokenizer(gConfig)
      }

      // console.log("done init")
    })
    // console.error("initializing webllm", model)
  } catch (e) {
    // console.error("error initializing webllm", e)
    window.parent.postMessage(
      { type: "error", error: { message: e.message, stack: e.stack } },
      "*"
    )
  }
}

function getConfig(model: ModelID): ModelConfig {
  // console.error("getting config in webllm", model)
  switch (model) {
  case ModelID.WizardVicuna:
    return {
      modelCacheUrl:
          "https://huggingface.co/spaces/idosal/web-llm/resolve/main/wizardlm-vicuna-7b-q4f32_1/",
      tokenizerUrl: `${baseUrl}/assets/tokenizer.model`,
      tokenizerJson: `${baseUrl}/assets/tokenizer.json`,
      wasmUrl: `${baseUrl}/assets/Llama-2-7b-chat-hf-q4f32_1-webgpu.wasm`,
      kvConfig: {
        numLayers: 64,
        shape: [32, 32, 128],
        dtype: "float32"
      },
      maxGenLength: 1024,
      mean_gen_len: 128,
      maxWindowLength: 2048,
      conv_template: 'vicuna_v1.1',
    }
  case ModelID.RedPajama:
    return {
      modelCacheUrl:
          "https://huggingface.co/mlc-ai/mlc-chat-RedPajama-INCITE-Chat-3B-v1-q4f32_0/resolve/main/",
      tokenizerUrl: `${baseUrl}/assets/tokenizer.mode`,
      tokenizerJson: `${baseUrl}/assets/tokenizer_redpajama.json`,
      wasmUrl: `${baseUrl}/assets/RedPajama-INCITE-Chat-3B-v1-q4f32_0-webgpu-v1.wasm`,
      kvConfig: {
        numLayers: 64,
        shape: [32, 32, 128],
        dtype: "float32"
      },
      maxGenLength: 1024,
      mean_gen_len: 128,
      maxWindowLength: 2048,
      conv_template: 'redpajama_chat'

    }
  case ModelID.NousHermes13B:
    return {
      modelCacheUrl:
          "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Nous-Hermes2-13b-q4f32_0/",
      tokenizerUrl: `${baseUrl}/assets/tokenizer_hermes.model`,
      // tokenizerJson: `${baseUrl}/assets/tokenizer.json`,
      wasmUrl: `${baseUrl}/assets/Nous-Hermes-Llama2-13b-q4f32_0-webgpu.wasm`,
      kvConfig: {
        numLayers: 64,
        shape: [32, 32, 128],
        dtype: "float32"
      },
      maxGenLength: 1024,
      meanGenLength: 128,
      maxWindowLength: 4096,
      conv_template: 'llama'
    }
    case ModelID.NousHermes13Bf16:
      return {
        modelCacheUrl:
            "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Nous-Hermes-13b-q4f16_1/",
        tokenizerUrl: `${baseUrl}/assets/tokenizer_hermes.model`,
        // tokenizerJson: `${baseUrl}/assets/tokenizer.json`,
        wasmUrl: `${baseUrl}/assets/Nous-Hermes-13b-q4f16_1-webgpu.wasm`,
        kvConfig: {
          numLayers: 64,
          shape: [32, 32, 128],
          dtype: "float32"
        },
        maxGenLength: 1024,
        meanGenLength: 128,
        maxWindowLength: 4096,
        conv_template: 'llama'
      }
    case ModelID.Llama2AYT13Bf16:
      return {
        modelCacheUrl:
            "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Llama2-chat-AYT-13B-q4f16_1/",
        tokenizerUrl: `${baseUrl}/assets/tokenizer.model`,
        tokenizerJson: `${baseUrl}/assets/tokenizer_ayt.json`,
        wasmUrl: `${baseUrl}/assets/Llama2-chat-AYT-13B-q4f16_1-webgpu.wasm`,
        kvConfig: {
          numLayers: 64,
          shape: [32, 32, 128],
          dtype: "float32"
        },
        maxGenLength: 1024,
        mean_gen_len: 128,
        maxWindowLength: 4096,
        conv_template: 'llama'
      }
  case ModelID.StablePlatypus213Bf16:
    return {
      modelCacheUrl:
          "https://huggingface.co/spaces/idosal/web-llm/resolve/main/Stable-Platypus2-13B-q4f16_1/",
      tokenizerUrl: `${baseUrl}/assets/tokenizer.model`,
      tokenizerJson: `${baseUrl}/assets/tokenizer.json`,
      wasmUrl: `${baseUrl}/assets/Llama-2-13b-chat-hf-q4f16_1-webgpu.wasm`,
      kvConfig: {
        numLayers: 64,
        shape: [32, 32, 128],
        dtype: "float32"
      },
      maxGenLength: 1024,
      mean_gen_len: 128,
      maxWindowLength: 4096,
      conv_template: 'llama'
    }
    case ModelID.WizardCoder15Bf16:
      return {
        modelCacheUrl:
            "https://huggingface.co/mlc-ai/mlc-chat-WizardCoder-15B-V1.0-q4f16_1/resolve/main/",
        tokenizerUrl: `${baseUrl}/assets/tokenizer.mode`,
        tokenizerJson: `${baseUrl}/assets/tokenizer_wizardcoder.json`,
        wasmUrl: `${baseUrl}/assets/WizardCoder-15B-V1.0-q4f16_1-webgpu.wasm`,
        kvConfig: {
          numLayers: 64,
          shape: [32, 32, 128],
          dtype: "float32"
        },
        maxGenLength: 1024,
        mean_gen_len: 128,
        maxWindowLength: 4096,
        conv_template: 'wizard_coder_or_math'
      }
    case ModelID.TinyLlama11Bf16:
      return {
        modelCacheUrl:
            "https://huggingface.co/spaces/idosal/web-llm/resolve/main/TinyLlama-1.1B-Chat-v0.1-q4f16_1/",
        tokenizerUrl: `${baseUrl}/assets/tokenizer.mode`,
        tokenizerJson: `${baseUrl}/assets/tokenizer_tiny.json`,
        wasmUrl: `${baseUrl}/assets/TinyLlama-1.1B-Chat-v0.1-q4f16_1-webgpu.wasm`,
        kvConfig: {
          numLayers: 64,
          shape: [32, 32, 128],
          dtype: "float32"
        },
        maxGenLength: 1024,
        mean_gen_len: 128,
        maxWindowLength: 4096,
        conv_template: 'tinyllama'
      }
  default:
    return {
      modelCacheUrl:
          "https://huggingface.co/mlc-ai/mlc-chat-RedPajama-INCITE-Chat-3B-v1-q4f32_0/resolve/main/",
      tokenizerUrl: `${baseUrl}/assets/tokenizer.model`,
      tokenizerJson: `${baseUrl}/assets/tokenizer.json`,
      wasmUrl: `${baseUrl}/assets/RedPajama-INCITE-Chat-3B-v1-q4f32_0-webgpu-v1.wasm`,
      kvConfig: {
        numLayers: 64,
        shape: [32, 32, 128],
        dtype: "float32"
      },
      maxGenLength: 1024,
      mean_gen_len: 128,
      maxWindowLength: 2048,
      conv_template: 'redpajama_chat'
    }
  }
}


init()

function getFromParent(key: string) {
  return new Promise(function (resolve) {
    // console.error("getting from parent", key)
    window.parent.postMessage({ name: "cacheGet", key }, "*")

    const timeoutHandler = self.setTimeout(() => {
      resolve(undefined)
    }, 10000)
    function handleMessage(event: MessageEvent<any>) {
      // Ensure the message is from the parent window
      if (event.source === window.parent) {
        // console.error("got cache response from parent", key)

        // Resolve the promise with the received data
        resolve(event.data.val)

        self.clearTimeout(timeoutHandler)
        self.removeEventListener("message", handleMessage)
      }
    }

    // Listen for messages from the parent window
    self.addEventListener("message", handleMessage)

  })
}

async function initClient(tvm, tokenizer, config: any) {
  const pipeline = new LLMChatPipeline(tvm, tokenizer, config)
  await pipeline?.asyncLoadWebGPUPipelines()
  return pipeline
}

async function initTokenizer(config: any) {
  if (config.tokenizerJson) {
    const tJson = await (await fetchRetry(config.tokenizerJson)).arrayBuffer()
    return await Tokenizer.fromJSON(tJson)
  }

  const tSp = await (await fetchRetry(config.tokenizerUrl)).arrayBuffer()
  return await Tokenizer.fromSentencePiece(tSp)
}

async function initTvm(
    wasmUrl: string,
    modelCacheUrl: string,
    progressCallback: ({ progress }) => void
) {
  // fetch with retry

  const wasmSource = await (await fetchRetry(wasmUrl)).arrayBuffer()

  const tvm = await tvmjs.instantiate(
      new Uint8Array(wasmSource),
      tvmjs.createPolyfillWASI(),
      () => {}
  )

  tvm.registerInitProgressCallback(progressCallback)

  const output = await tvmjs.detectGPUDevice()
  if (!output) {
    throw Error("This browser env do not support WebGPU")
  }

  if (wasmUrl.includes('f16')) {
    if (!output.device.features.has("shader-f16")) {
      throw Error(
          "This model requires WebGPU extension shader-f16, " +
          "which is not enabled in this browser. " +
          "You can try to launch Chrome Canary in command line with flag \"--enable-dawn-features=allow_unsafe_apis\"."
      )
    }
  }

  tvm.initWebGPU(output.device)

  // const initProgressCallback = (report) => {
  //   if (config.setInitProgress) {
  //     config.setInitProgress(Math.floor(report.progress * 100))
  //   }
  // }

  await tvm.fetchNDArrayCache(modelCacheUrl, tvm.webgpu(), {
    get: getFromParent,
    put: (k: string, val: any) => {
      // console.error('put', k, val)
    window.parent.postMessage({ name: "cachePut", key: k, val }, "*")
      // console.error('finished put', k, val)
    }
  })
  return tvm
}

window.addEventListener("message", async function (event) {
  if (event.data.type !== "interrupt") {
    return
  }

  interruptSignal = true
})

window.addEventListener("message", async function (event) {
  if (event.data.type !== "generate" && event.data.type !== "stream") {
    return
  }

  try {
    await init()
    if (!client) {
      // console.log('initializing client')
      client = await initClient(gTvm, gTokenizer, gConfig)
    }

    const generationConfig = { ...event.data.config, conv_template: gConfig.conv_template }
    // console.log("generationConfig", generationConfig)
    // Send a response back to the parent window
    if (event.data.type === "generate") {
      const completion = await generateCompletion(
        client,
        event.data.input,
          generationConfig
      )
      event?.source?.postMessage(
        { name: "generateResp", data: completion },
        event?.origin
      )
    }

    if (event.data.type === "stream") {
      await generateCompletion(client, event.data.input, generationConfig)
    }

    // client.dispose()
    // client = undefined
  } catch (e) {
    console.error("error in webllm", e)
    window.parent.postMessage(
      { type: "error", error: { message: e.message, stack: e.stack } },
      "*"
    )
  }

  async function generateCompletion(
      client: LLMChatPipeline,
      input: RequestPrompt,
      config: RequestOptions
  ): Promise<string> {
    // console.log('input', input)
    interruptSignal = false
    const newConversation = client.getNewConversation()
    const messages = input?.messages
    const prompt = messages?.pop()
    // console.log('messages', messages)
    if (!prompt) {
      console.error("no prompt", input)
      throw Error("no prompt")
    }

    const progressCallback = (i: number, completion: string) => {
      window.parent.postMessage({ name: "streamResp", data: completion }, "*")
    }

    messages?.forEach((m: ChatMessage) =>{
      // console.log('message', m)
      switch(m.role) {
        case 'system':
            newConversation.setSystem(m.content)
            // newConversation?.appendPrompt(m.content)
            break
        case 'user':
          newConversation?.appendPrompt(m.content)
          break
        case 'assistant':
            newConversation?.appendReply(m.content)
            break
        default:
          console.error('unknown role', m.role)
          newConversation?.appendPrompt(m.content)
      }
    })

    // console.log('conversation', newConversation)
    client.setConversation(newConversation)

    // console.log('prompt', prompt.content)
    await client.prefillStep(prompt.content)

    let counter = 1
    while (!client.stopped()) {
      if (interruptSignal) {
        client.triggerStop()
        interruptSignal = false
        continue
      }

      counter += 1
      await client.decodeStep()
      // console.log('final message', client.getMessage())
      progressCallback(counter, client.getMessage())
      console.log(client.runtimeStatsText())
    }


    window.parent.postMessage({ name: "endStream" }, "*")

    return client.getMessage()
  }
})

