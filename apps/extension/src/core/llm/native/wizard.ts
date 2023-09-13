import { Mutex } from "async-mutex";
import { ModelID } from "~public-interface";
import type { ModelConfig, RequestOptions } from "../model";
import { Model } from "../nmodel";
import Reason = chrome.offscreen.Reason
import {configManager} from "~core/managers/config";

const mutex = new Mutex()
const streamMutex = new Mutex()

let progress = 0
let initializedModel: Model
let creating: Promise<void> | null// A global promise to avoid concurrency issues

async function initRuntime() {
  try {
    await mutex.waitForUnlock()
    await mutex.runExclusive(async () => {
      const currentModel = configManager.getCurrentModel(await configManager.getDefault()) ?? ModelID.RedPajama

      // console.log("init runtime", currentModel)

      await setupOffscreenDocument(currentModel)

      const terminateCallback = async (state: "active" | "locked" | "idle") => {
        if (state !== "locked") {
          return
        }

        progress = 0
        await chrome.offscreen.closeDocument() // TODO send message to offscreen to unload the client
        await chrome.storage.session.set({[currentModel]: { progress: { progress: 0 }}})
        chrome.idle.onStateChanged.removeListener(terminateCallback)
      }

      chrome.idle.onStateChanged.addListener(terminateCallback)

      // if (progress !== 1) {
      //   await new Promise((resolve) => {
      //     chrome.storage.session.onChanged.addListener((v) => {
      //       if (v[currentModel]?.newValue?.progress === 1)
      //         self.setTimeout(resolve, 1000)
      //     })
      //   })
      // }
    })
  } catch (e) {
    console.error("Wizard failed to init runtime", e)
  }
}

export async function init(
    model: ModelID,
    config: Pick<ModelConfig, "debug"> &
        Partial<Pick<ModelConfig, "cacheGet" | "cacheSet">> = {},
    opts: RequestOptions
): Promise<Model> {
  const currentModel : ModelID | undefined = (await chrome.storage.session.get('currentModel'))?.currentModel

  if (initializedModel && model === currentModel) {
    return initializedModel
  }

  initializedModel = await initInternal(model, config, opts)

  return initializedModel
}

async function initInternal(
    model: ModelID,
  config: Pick<ModelConfig, "debug"> &
    Partial<Pick<ModelConfig, "cacheGet" | "cacheSet">> = {},
  opts: RequestOptions
): Promise<Model> {
  // console.log('initializing webllm', model)
  await chrome.storage.session.set({ currentModel: model })

  // if (await chrome.offscreen.hasDocument()) {
  //   await chrome.offscreen.closeDocument()
  // }

  // TODO this method should return a different model when I switch in the dropdown so future streams will go there
  await initRuntime().catch((e) => console.error("Failed to init runtime", e))

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
    // console.log("stream start")
    try {
      await streamMutex.waitForUnlock()
      return await streamMutex.runExclusive(async () => {
        chrome.action.setBadgeText({ text: "w" })
        chrome.action.setBadgeBackgroundColor(
            { color: [0, 255, 0, 0] } // Green
        )

        await initRuntime()

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
              }

              if (res.type !== "streamResp") return

              if (controller) {
                const substr = res.data.data.substring(lastString.length)
                // console.log('stream resp', substr, res.data.data, lastString)
                if (substr.startsWith('<')) {
                  // console.log('skipping EOS', substr)
                  return
                }

                controller.enqueue(substr)
                lastString = res.data.data
              }
            }

            chrome.runtime.onMessage.addListener(handler)
          },
          cancel() {
            // TODO send message to offscreen to stop generation
            controller = null
          }
        })
      })
    } catch(e) {
      console.error("Failed to handle stream in serviceworker", e)
    }
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
        // console.error("transforming request", JSON.stringify(req))
        // req.messages =
        //   prompt !== undefined
        //     ? [{ role: "", content: prompt }]
        //     : messagesToPrompts(messages ?? [])
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

if (!self.location.href.endsWith('popup.html')) {
  chrome.runtime.onMessage.addListener( (message, _, sendResponse) => {
    if (message.type === "progress") {
      progress = message.data.progress.progress
      configManager.getDefault().then((defaultConfig) => {
        const currentModel = configManager.getCurrentModel(defaultConfig) ?? ModelID.RedPajama
        chrome.storage.session
            .set({ [currentModel]: { progress: message.data.progress} })
            .catch(console.error)
        self.clearTimeout(progressTOHandler)
        progressTOHandler = undefined
        if (progress !== 1) {
          progressTOHandler = self.setTimeout(() => chrome.runtime.reload(), 120000)
        }
      })
    } else if (message.type === "error") {
      console.error(message)
      if (typeof message.data === 'string' && message.data?.startsWith('Cannot convert to array buffer') || message.data?.startsWith('Cannot fetch ')) {
        window.setTimeout(() => chrome.runtime.reload(), 20000)
      }

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
}

async function setupOffscreenDocument(model: ModelID) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL('tabs/offscreen.html') + `?model=${model}`
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  })

  if (existingContexts.length > 0) {
    // console.log("offscreen already exists")
    if (progress === 1) return
    let storedProgress = (await chrome.storage.session.get(model))[model]
        ?.progress?.progress

    // console.log("stored progress", model, progress, storedProgress, (await chrome.storage.session.get(model)))
    if (storedProgress === 1) {
      return
    }

    await new Promise((resolve) => {
      const callback = (v: {[p: string]: chrome.storage.StorageChange}) => {
        // console.log('on change', v, v[model]?.newValue?.progress?.progress)
        if (toHandler) {
          self.clearTimeout(toHandler)
          toHandler = 0
        }
        storedProgress = v[model]?.newValue?.progress?.progress ?? storedProgress
        if (storedProgress === 1)
          self.setTimeout(resolve, 1000)
      }

      chrome.storage.session.onChanged.addListener(callback)
      let toHandler = self.setTimeout(() => {
        chrome.storage.session.onChanged.removeListener(callback)
        resolve(undefined) }, 8000)
    })

    if (storedProgress) {
      return
    }
  }

  if (await chrome.offscreen.hasDocument()) {
    // console.log('closing unrelated offscreen document')
    await chrome.offscreen.closeDocument()
  }

  // create offscreen document
  if (creating) {
    // console.log('awaiting existing offscreen creation')

    await creating
  } else {
    // console.log('creating offscreen document')
    creating = chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: [Reason.IFRAME_SCRIPTING],
      justification: "running the LLM"
    })
    await creating
    creating = null
  }
}