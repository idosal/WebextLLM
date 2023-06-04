# WebextLLM - browser-native LLMs at your fingertips

<!-- ![image](https://github.com/idosal/WebextLLM/assets/18148989/53ba62c8-9e6a-441e-8e29-a1bf18d3c646)
 -->
<p align="center"><img height="30%" width="30%" src="https://github.com/idosal/WebextLLM/assets/18148989/53ba62c8-9e6a-441e-8e29-a1bf18d3c646"</img></p>

<div align="center">

[![Medium Badge](https://badgen.net/badge/icon/medium?icon=medium&label)](https://medium.com/@idosalomon)
[![Twitter Follow](https://img.shields.io/twitter/follow/idosal1?style=social)](https://twitter.com/idosal1)
[![CWS Badge](https://img.shields.io/chrome-web-store/rating/chbepdchbogmcmhilpfmijbkfpplgnoh.svg)](https://chrome.google.com/webstore/chbepdchbogmcmhilpfmijbkfpplgnoh)
</div>

--------------------------


*Unleash the power of AI in your browser!*


WebextLLM is the first extension in the Chrome Web Store to embed local open-source LLMs in the browser.
Harness browser-native LLMs to fuel a growing AI-based application ecosystem (based on and mostly-compliant with the [window.ai](https://github.com/alexanderatallah/window.ai) API), as a user, developer, or model provider.

https://github.com/idosal/WebextLLM/assets/18148989/1f1df430-0fad-4233-b53c-3047bec26d5e


### Why should I use WebextLLM?
There are several main advantages to the extension over other solutions. It's:
- **Free** - The model runs on your hardware, eliminating the need for costly service providers
- **Private** - Your data remains securely on your device, safeguarding your privacy
- **Unlimited** - Take full control of the model without any quotas, censorship, or limitations
- **Highly available** - Overcome limitations of internet connectivity and cloud-based LLM availability

### Why should I develop applications using WebextLLM (window.ai)?
- **Ease of use** - The `window.ai API` is designed to be simple, working seamlessly with any JavaScript application. No complex SDKs or framework-specific wrappers required.
- **Free** - Say goodbye to cloud LLM costs and enjoy the benefits of a cost-free solution
- **Unlimited** - Break free from API quotas and limits, enabling you to unlock the full potential of your applications
- **Existing user base** - Tap into a rapidly growing ecosystem of users and developers utilizing `window.ai`
- **Liability** - Empower your users to decide which model they want to use, giving them full control and ownership

<!-- ### Contents
- [On the horizon](#on-the-horizon)
- [Features](#features)
- [Getting started](#getting-started)
  - [As a user](#as-a-user)
  - [As an application developer](#as-an-application-developer)
    - [Functions](#functions)
    - [CompletionOptions](#completionoptions)
    - [Error codes](#error-codes)
- [Setup](#setup)
  - [Browser support](#browser-support)
- [Available apps](#available-apps)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer) -->

## Features

* Own your models: Experience the freedom of owning and controlling the LLMs, enjoying a limitless, private, and secure environment.
* Control: Exercise complete control over access to your LLM, granting or denying permission to any application at any time.
* Visibility: Gain insights into the history of prompts and responses to your model across different applications.

## On the horizon
- [ ] Make it easy to add new models
- [ ] Lower minimum requirements to make it accessible to all
- [ ] Make it easier to format responses
- [ ] Add support for more browsers

## Getting started
### As a user

1. Install the extension from the Chrome Web Store (recommended) or build it yourself (see [how](#🧠-local-model-setup)).
2. In the `Configuration` tab, verify that the model is ready for use ([wizard-vicuna-7b-uncensored](https://huggingface.co/ehartford/Wizard-Vicuna-7B-Uncensored)). The model weighs ~4GB that need to be downloaded once (on first use). The model is then cached so future initializations will be much quicker (and offline).
3. Navigate to an application that utilizes `window.ai` (see [apps](#👀-find-apps)).
4. Approve the application's request to use the model (you may choose to grant unlimited access to the application).
5. ??? 
6. Profit

### As an application developer

This section is taken almost as-is from the [window.ai repository](https://github.com/alexanderatallah/window.ai).

To leverage user-managed models in your app, simply call `await window.ai.generateText` with your prompt and options.

Example:

```ts
const [ response ] : Output[] = await window.ai.generateText(
    { messages: [{role: "user", content: "Who are you?"}] }: Input
  )

console.log(response.message.content) // "I am an AI language model"
```

All public types, including error messages, are documented in [this file](/apps/extension/src/public-interface.ts). `Input`, for example, allows you to use both simple strings and [ChatML](https://github.com/openai/openai-python/blob/main/chatml.md).

Example of streaming results to the console:

```ts
await window.ai.generateText(
  {
    messages: [{ role: "user", content: "Who are you?" }]
  },
  {
    temperature: 0.7,
    onStreamResult: (res) => console.log(res.message.content)
  }
)
```

Note that `generateText` will return an array, `Output[]`, that only has multiple elements if `numOutputs > 1`.

This **does not guarantee that the length of the return result will equal `numOutputs`**. If the model doesn't support multiple choices, then only one choice will be present in the array.

#### Functions

The Window API is simple. Just a few functions:

**Generate Text**: generate text from a specified model or the user-preferred model.

```ts
window.ai.generateText(
    input: Input,
    options: CompletionOptions = {}
  ): Promise<Output | Output[]>
```

`Input` is either a `{ prompt : string }` or `{ messages: ChatMessage[]}`. Examples: see [getting started](#🧑‍💻-getting-started) above.

**Current model**: get the user's currently preferred model ID.

```ts
window.ai.getCurrentModel(): Promise<ModelID>
```

**Listen to events**: to listen to events emitted by the extension, such as whenever the preferred model changes, here's what you do:

```ts
window.ai.addEventListener((event: EventType, data: unknown) => {
  // You can check `event` to see if it's the EventType you care about, e.g. "model_changed"
  console.log("EVENT received", event, data)
})
```

All public types, including error messages, are documented in [this file](/apps/extension/src/public-interface.ts). Highlights below:

#### CompletionOptions

This options dictionary allows you to specify options for the completion request.

```ts
export interface CompletionOptions {
  // If specified, partial updates will be streamed to this handler as they become available,
  // and only the first partial update will be returned by the Promise.
  onStreamResult?: (result: Output | null, error: string | null) => unknown

  // What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
  // make the output more random, while lower values like 0.2 will make it more focused and deterministic.
  // Different models have different defaults.
  temperature?: number

  /* In the future, we'll support the full spec and more. For example:
  
  // How many completion choices to generate. Defaults to 1.
  numOutputs?: number

  // The maximum number of tokens to generate in the chat completion. Defaults to infinity, but the
  // total length of input tokens and generated tokens is limited by the model's context length.
  maxTokens?: number */
}
```

#### Error codes

Errors emitted by the extension API:

```ts
export enum ErrorCode {

  // User denied permission to the app
  PermissionDenied = "PERMISSION_DENIED",

  // Happens when a permission request popup times out
  RequestNotFound = "REQUEST_NOT_FOUND",

  // When a request is badly formed
  InvalidRequest = "INVALID_REQUEST",

  // When an AI model refuses to fulfill a request. The returned error is
  // prefixed by this value and includes the status code that the model API returned
  ModelRejectedRequest = "MODEL_REJECTED_REQUEST"
}
```

## Setup

There are two setup options:
1. Install the extension from the [Chrome Web Store](https://chrome.google.com/webstore/chbepdchbogmcmhilpfmijbkfpplgnoh) (recommended)
2. Build the extension yourself (see [how](#contributing))

### Browser support
✅ [Chrome](https://chrome.google.com/webstore/detail/window-ai/cbhbgmdpcoelfdoihppookkijpmgahag) and other Chromium based browsers (e.g., Brave, Edge, etc.)

## Available apps

Explore apps that use the `window.ai` API:
- [Skylight](https://www.skylightai.io/)

- [Window.ai Discord #app-showcase channel](https://discord.gg/6kMeRxc2T)

## Contributing

The extension is built with [Plasmo](https://docs.plasmo.com/).

Build with:
```bash
pnpm build
```

[Load the unpacked extension to the browser](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked):

Chrome - `build/chrome-mv3-prod`.


## Disclaimer
This project is a proof-of-concept utilizing experimental technologies. It is by no means a production-ready implementation, and it should not be used for anything other than research. It's provided "as-is" without any warranty, expressed or implied. By using this software, you agree to assume all risks associated with its use, including but not limited to data loss, system failure, or any other issues that may arise.
The models supplied as part of this project were not created by, are not owned by, are not affiliated with, and are not endorsed by the author of this project. The author of this project does not claim any ownership of the models, and is not responsible for any issues that may arise from their use. Please be advised that open-source models, particularly uncensored, aren't regulated, and may produce offensive or harmful content.
Similarly, the applications that utilize `window.ai` are not affiliated with the author of this project. The author of this project does not claim any ownership of the applications, and is not responsible for any issues that may arise from their use. Use at your own risk.


## Acknowledgements
This project utilizes and builds on the incredible work by [web-llm](https://github.com/mlc-ai/web-llm) and [window.ai](https://github.com/alexanderatallah/window.ai)!
