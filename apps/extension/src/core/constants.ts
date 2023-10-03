import type {
  ErrorCode,
  InferredOutput,
  Input,
  ModelProviderOptions,
  RequestID
} from "window.ai"

import type { EventRequest, EventResponse } from "~background/ports/events"
import type { ModelID } from "~public-interface"

import type { Transaction } from "./managers/transaction"
import type { Result } from "./utils/result-monad"

export enum PortName {
  Completion = "completion",
  Permission = "permission",
  Model = "model",
  Events = "events"
}

export enum RequestInterruptType {
  Permission = "permission",
  Authentication = "auth"
}

export function isRequestInterruptType(
  value: string
): value is RequestInterruptType {
  return (Object.values(RequestInterruptType) as string[]).includes(value)
}

export type PopupParams = {
  requestId: RequestID
  requestInterruptType: RequestInterruptType
}

export interface PortRequest {
  [PortName.Completion]: { id: RequestID; request: CompletionRequest }
  [PortName.Permission]: {
    id?: RequestID
    request: { requesterId: RequestID; permitted?: boolean }
  }
  [PortName.Model]: { id: RequestID; request?: ModelRequest }
  [PortName.Events]: { id?: RequestID; request: EventRequest<unknown> }
}

export interface PortResponse {
  [PortName.Completion]:
    | { id: RequestID; response: CompletionResponse }
    | { id?: RequestID; error: ErrorCode.InvalidRequest }
  [PortName.Permission]:
    | { requesterId: RequestID; requester: CompletionRequest }
    | {
        id?: RequestID
        error: ErrorCode.InvalidRequest | ErrorCode.RequestNotFound
      }
  [PortName.Model]:
    | { id: RequestID; response: ModelResponse }
    | { id?: RequestID; error: ErrorCode.InvalidRequest }
  [PortName.Events]:
    | { id?: RequestID; response: EventResponse<unknown> }
    | { id?: RequestID; error: ErrorCode.InvalidRequest }
}

export type PortEvent = PortRequest | PortResponse

export enum ContentMessageType {
  Request = "request",
  Response = "response",
  Cancel = "cancel"
}

export type CompletionRequest = {
  transaction: Transaction
  shouldStream?: boolean
}
export type CompletionResponse<TInput extends Input = Input> = Result<
  InferredOutput<TInput>[],
  ErrorCode | string
>

export type ModelRequest = ModelProviderOptions
export type ModelResponse = Result<{ model?: ModelID }, ErrorCode>

export type { EventRequest, EventResponse }

export const IS_SERVER =
  typeof process !== "undefined" && process?.versions?.node

// TODO keep in sync with Index.tsx tailwind classes
export const POPUP_HEIGHT = 586
export const POPUP_WIDTH = 384
