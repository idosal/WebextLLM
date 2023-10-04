# WebextLLM - browser-native LLMs at your fingertips

<p align="center"><img height="90%" width="90%" src="https://github.com/idosal/WebextLLM/assets/18148989/e78d6b2c-1625-4658-ae18-966441cf7b6e"</img></p>

<div align="center">

[![Medium Badge](https://badgen.net/badge/icon/medium?icon=medium&label)](https://medium.com/@idosalomon)
[![Twitter Follow](https://img.shields.io/twitter/follow/idosal1?style=social)](https://twitter.com/idosal1)
[![CWS Badge](https://img.shields.io/chrome-web-store/rating/chbepdchbogmcmhilpfmijbkfpplgnoh.svg)](https://chrome.google.com/webstore/chbepdchbogmcmhilpfmijbkfpplgnoh)
</div>

--------------------------

[WebextLLM](https://chrome.google.com/webstore/detail/chbepdchbogmcmhilpfmijbkfpplgnoh) is a [browser extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) created to democratize AI. 

The extension simplifies integrating AI into web applications by taking ownership of LLM management and local deployment so that developers don't need to embed them in their apps. Instead, the extension makes local LLMs accessible to them by injecting a simple and lightweight Javascript API (based on and mostly compliant with the [window.ai](https://github.com/alexanderatallah/window.ai)) into all web pages. This brings the traditional cloud-backed development paradigm to the edge!

Users enjoy an exciting combination of freedom, privacy, and security. Harness browser-native LLMs to fuel a growing AI-based application ecosystem as a user, developer, or model provider.


https://github.com/idosal/WebextLLM/assets/18148989/2ac3586c-eeee-4404-8864-b13e879def19


### Key Features
* **AI-enablement** - WextLLM provides browser-native LLM capabilities to AI-powered web apps through a simple API, enabling edge computing and easy adoption.
* **Ownership** - Users have full control over LLM selection, from uncensored to fine-tuned models, offering an unrestricted experience free from quotas or cloud dependencies.
* **Privacy and security** - User data stays on the device, ensuring privacy, and LLM instructions remain tamper-proof at the network level.
* **Cost savings** - Running LLMs locally eliminates cloud service costs, saving users significant money, particularly in applications with high per-prompt expenses.
* **Control** - Users can grant or deny permission to any application, maintaining complete control over access to their LLMs at all times.

### Why should I use WebextLLM?
- **Free** - The model runs on your hardware, eliminating the need for costly service providers
- **Private** - Your data remains securely on your device, safeguarding your privacy
- **Unlimited** - Take full control of the model without any quotas, censorship, or limitations
- **Highly available** - Overcome limitations of internet connectivity and cloud-based LLM availability

### Why should I develop applications using WebextLLM (window.ai)?
- **Ease of use** - The `window.ai API` is designed to be simple, working seamlessly with any JavaScript application. No complex SDKs or framework-specific wrappers are required.
- **Unlimited** - Break free from API quotas and limits, enabling you to unlock the full potential of your applications
- **Access to a growing ecosystem** - Tap into an expanding community of users and developers leveraging AI in the browser.
- **Empower users** - Empower your users to decide which model they want to use, giving them full control and ownership


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


## Getting started
### As a user

1. Install the extension from the Chrome Web Store (recommended) or build it yourself (see [how](#🧠-local-model-setup)).
2. In the `Configuration` tab, verify that the selected model is ready for use. The model weighs ~1.9GB which need to be downloaded once (on first use). The model is then cached so future initializations will be much quicker (and offline).
3. Navigate to an application that utilizes `window.ai` (see the Apps tab in the extension's popup).
4. Approve the application's request to use the model (you may choose to grant unlimited access to the application).
5. Enjoy private, secure, and free AI in your apps!

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


## Available apps

After installing the extension, visit the Apps tab in its popup to find supported apps that use `window.ai`.


## On the horizon
- [ ] Support additional models
- [ ] Improve UX


## Setup

There are two setup options:
1. Install the extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/webextllm/chbepdchbogmcmhilpfmijbkfpplgnoh) (recommended)
2. Build the extension yourself (see [how](#contributing))


### Browser support
✅ [Chrome](https://chrome.google.com/webstore/detail/window-ai/cbhbgmdpcoelfdoihppookkijpmgahag) and other Chromium based browsers (e.g., Brave, Edge, etc.)


## Contributing

The extension is built with [Plasmo](https://docs.plasmo.com/).

Build with:
```bash
pnpm build
```

[Load the unpacked extension to the browser](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked):

Chrome - `build/chrome-mv3-prod`.


## Disclaimer
WebextLLM is a proof-of-concept using experimental technologies. It is not recommended for production use and is currently targeted for research purposes. The software is provided "as-is" without any warranty, expressed or implied. By using this software, you agree to assume all risks, including potential data loss, system failure, or other issues that may occur. The models provided in this project are not affiliated with, or endorsed by the project's author. The author does not claim ownership of the models and is not responsible for any issues arising from their use. Please note that open-source models, especially uncensored ones, are not regulated and may generate offensive or harmful content. Similarly, the project's author is not affiliated with the applications utilizing the window.ai API. The author does not claim ownership of the applications and is not liable for any issues arising from their use. Use at your own disclosure.

## Acknowledgements
This project utilizes and builds on the incredible work by [web-llm](https://github.com/mlc-ai/web-llm) and [window.ai](https://github.com/alexanderatallah/window.ai)!
