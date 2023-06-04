import { ErrorCode } from "window.ai"

import { modelAPICallers } from "~core/llm"

import { AuthType, type Config, configManager } from "./managers/config"
import type { Transaction } from "./managers/transaction"
import { type Result, unknownErr } from "./utils/result-monad"
import { ok } from "./utils/result-monad"
import { log } from "./utils/utils"

export async function complete(
  txn: Transaction
): Promise<Result<string[], string>> {
  const config = await configManager.forModelWithDefault(txn.model)
  const caller = await configManager.getCaller(config)
  const model = txn.model || configManager.getCurrentModel(config)

  try {
    const result = await caller.complete(txn.input, {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model,
      max_tokens: txn.maxTokens,
      temperature: txn.temperature,
      stop_sequences: txn.stopSequences,
      num_generations: txn.numOutputs
    })
    return ok(result)
  } catch (error) {
    return unknownErr(error)
  }
}

export async function shouldStream(
  config: Config,
  userPrefersStream = true
): Promise<boolean> {
  const canStream = (await configManager.getCaller(config)).config.isStreamable
  return canStream && (userPrefersStream || config.auth === AuthType.External)
}

export async function stream(
  txn: Transaction
): Promise<AsyncGenerator<Result<string, string>>> {
  try {
    const config = await configManager.forModelWithDefault(txn.model)
    const caller = await configManager.getCaller(config)
    const model = txn.model || configManager.getCurrentModel(config)

    if (!(await shouldStream(config))) {
      throw ErrorCode.InvalidRequest
    }

    if (txn.numOutputs && txn.numOutputs > 1) {
      throw ErrorCode.InvalidRequest
    }

    const stream = await caller.stream(txn.input, {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model,
      max_tokens: txn.maxTokens,
      temperature: txn.temperature,
      stop_sequences: txn.stopSequences
    })
    return readableStreamToGenerator(stream)
  } catch (error) {
    async function* generator() {
      yield unknownErr(error)
    }
    return generator()
  }
}

async function* readableStreamToGenerator(
  stream: ReadableStream<string>
): AsyncGenerator<Result<string, string>> {
  const reader = stream.getReader()
  const decoder = new TextDecoder("utf-8")
  let lastValue: string | undefined = undefined
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      lastValue =
        typeof value === "string"
          ? value
          : decoder.decode(value, { stream: true }) // only for node.js
      log("Got stream value: ", lastValue)
      yield ok(lastValue)
    }
  } catch (error) {
    console.error("Streaming error: ", error, lastValue)
    throw error
  } finally {
    reader.releaseLock()
  }
}
