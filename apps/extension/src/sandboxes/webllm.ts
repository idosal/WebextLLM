import type { ModelConfig, RequestOptions } from "~core/llm/model"
import {
  generateCompletion,
  initClient,
  initTokenizer,
  initTvm
} from "~core/llm/native/llmChatPipeline"
import { Model } from "~core/llm/nmodel"

let gTvm = undefined
let gTokenizer = undefined
const baseUrl = window.location.search.split("=")[1]
let client: any = null
let gConfig: ModelConfig

export async function init(
  config: Pick<ModelConfig, "debug"> &
    Partial<Pick<ModelConfig, "cacheGet" | "cacheSet">> = {},
  opts: RequestOptions
): Promise<Model> {
  console.log("initializing webllm")
  try {
    gConfig = {
      modelCacheUrl:
        "https://huggingface.co/spaces/idosal/web-llm/resolve/main/wizardlm-vicuna-7b-q4f32_0/",
      tokenizerUrl: `${baseUrl}/assets/tokenizer.model`,
      tokenizerJson: `${baseUrl}/assets/tokenizer.json`,
      wasmUrl: `${baseUrl}/assets/wizardlm-vicuna-7b-q4f32_0-webgpu.wasm`,
      kvConfig: {
        numLayers: 64,
        shape: [32, 32, 128],
        dtype: "float32"
      },
      maxGenLength: 1024,
      meanGenLength: 128,
      maxWindowLength: 2048
    }

    gTvm = await initTvm(gConfig.wasmUrl, gConfig.modelCacheUrl, (p) => {
      window.parent.postMessage({ type: "progress", progress: p }, "*")
    })
    gTokenizer = await initTokenizer(gConfig)
    console.log("done init")
  } catch (e) {
    console.error("error initializing webllm", e)
    window.parent.postMessage(
      { type: "error", error: { message: e.message, stack: e.stack } },
      "*"
    )
  }
}

init({}, {})

window.addEventListener("message", async function (event) {
  if (event.data.type !== "generate" && event.data.type !== "stream") {
    return
  }

  try {
    if (!gTvm) {
      console.log("no gTvm")
      gTvm = await initTvm(gConfig.wasmUrl, gConfig.modelCacheUrl, (p) => {
        window.parent.postMessage(
          { type: "progress", progress: p },
          "*"
        )
      })
    }

    client = await initClient(gTvm, gTokenizer, gConfig)

    // Send a response back to the parent window
    if (event.data.type === "generate") {
      const completion = await generateCompletion(
        client,
        event.data.input,
        event.data.config
      )
      event.source.postMessage(
        { name: "generateResp", data: completion },
        event.origin
      )
    }

    if (event.data.type === "stream") {
      await generateCompletion(client, event.data.input, event.data.config)
    }

    client.dispose()
    client = undefined
  } catch (e) {
    console.error("error in webllm", e)
    window.parent.postMessage(
      { type: "error", error: { message: e.message, stack: e.stack } },
      "*"
    )
  }
})
