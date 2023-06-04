import { messagesToPrompts } from "~core/utils/utils"

import type { ModelConfig, RequestOptions } from "../model"
import { Model } from "../nmodel"

let progress = 0

async function initRuntime() {
  if (await chrome.offscreen.hasDocument()) {
    console.log("offscreen already exists", progress)
    if (progress === 1) return

    const storedProgress = (await chrome.storage.session.get("modelProgress"))
      ?.progress
    if (storedProgress === 1) {
      return
    }

    await new Promise((resolve) => {
      self.setTimeout(resolve, 10000)
      chrome.storage.session.onChanged.addListener((v) => {
        if (v.modelProgress?.newValue?.progress === 1)
          self.setTimeout(resolve, 1000)
      })
    })
    return
  }

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("tabs/offscreen.html"),
    reasons: ["IFRAME_SCRIPTING"],
    justification: "running the LLM in a sandbox"
  })

  const terminateCallback = async (state: "active" | "locked" | "idle") => {
    if (state === "active") {
      return
    }

    progress = 0
    await chrome.offscreen.closeDocument()
    chrome.idle.onStateChanged.removeListener(terminateCallback)
  }

  chrome.idle.onStateChanged.addListener(terminateCallback)

  if (progress !== 1) {
    await new Promise((resolve) => {
      chrome.storage.session.onChanged.addListener((v) => {
        if (v.modelProgress?.newValue?.progress === 1)
          self.setTimeout(resolve, 1000)
      })
    })
  }
}

export async function init(
  config: Pick<ModelConfig, "debug"> &
    Partial<Pick<ModelConfig, "cacheGet" | "cacheSet">> = {},
  opts: RequestOptions
): Promise<Model> {
  initRuntime().catch((e) => console.error("failed to init runtime", e))

  const generate = async (input, log, config) =>
    await new Promise((resolve) => {
      chrome.action.setBadgeText({ text: "w" })
      chrome.action.setBadgeBackgroundColor(
        { color: [0, 255, 0, 0] } // Green
      )
      return initRuntime().then(() =>
        chrome.runtime.sendMessage(
          { type: "generate", input, config },
          (res) => {
            chrome.action.setBadgeText({ text: "" })

            resolve(res)
          }
        )
      )
    })

  const stream = async (input, log, config) => {
    console.log("steam start")
    await initRuntime()

    chrome.action.setBadgeText({ text: "w" })
    chrome.action.setBadgeBackgroundColor(
      { color: [0, 255, 0, 0] } // Green
    )

    let controller: ReadableStreamDefaultController<string> | null = null
    let lastString = ""
    return new ReadableStream<string>({
      start(controllerParam) {
        chrome.runtime.sendMessage({ type: "stream", input, config })

        controller = controllerParam
        const handler = (res) => {
          if (res.type === "end") {

            chrome.runtime.onMessage.removeListener(handler)
            controller?.close()

            chrome.action.setBadgeText({ text: "" })

            return
          }

          if (res.type !== "streamResp") return

          if (controller) {
            controller.enqueue(res.data.data.substring(lastString.length))
            lastString = res.data.data
          }
        }

        chrome.runtime.onMessage.addListener(handler)
      },
      cancel() {
        controller = null
      }
    })
  }

  return new Model(
    { generate: generate, stream: stream },
    {
      modelProvider: "native",
      isStreamable: true,
      modelCacheUrl:
        "https://huggingface.co/spaces/idosal/web-llm/resolve/main/wizardlm-vicuna-7b-q4f32_0/",
      debug: config.debug,
      cacheGet: config.cacheGet,
      cacheSet: config.cacheSet,
      transformForRequest: (req) => {
        const { prompt, messages, modelProvider, ...optsToSend } = req
        req.messages =
          prompt !== undefined
            ? [{ role: "", content: prompt }]
            : messagesToPrompts(messages ?? [])
        return req
      },
      transformResponse: (res) => {
        const anyRes = res as any
        return anyRes["choices"].map((c: any) => c["text"])
      }
    },
    opts
  )
}

let progressTOHandler: number | undefined = undefined
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "progress") {
    progress = message.data.progress.progress

    chrome.storage.session
      .set({ modelProgress: message.data.progress })
      .catch(console.error)

    self.clearTimeout(progressTOHandler)
    progressTOHandler = undefined
    if (progress !== 1) {
      progressTOHandler = self.setTimeout(() => chrome.runtime.reload(), 59000)
    }
  } else if (message.type === "error") {
    console.error(message)
    chrome.action.setBadgeText({ text: "X" })
    chrome.action.setBadgeBackgroundColor(
      { color: [255, 0, 0, 255] } // red
    )

    chrome.storage.session
      .set({
        error: { message: message.data.message, stack: message.data.stack }
      })
      .catch(console.error)
  }
})
