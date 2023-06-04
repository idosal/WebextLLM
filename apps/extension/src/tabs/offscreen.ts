import { Mutex } from "async-mutex"

const mutex = new Mutex()

const request = indexedDB.open("cacheDB", 1)
let db

request.onerror = function (event) {
  console.log("IndexedDB error:", event.target.errorCode)
}

request.onupgradeneeded = function (event) {
  db = event.target.result
  const objectStore = db.createObjectStore("cache", { keyPath: "key" })
  objectStore.createIndex("dataIndex", "key", { unique: true })
}

const iframe = document.createElement("iframe")
iframe.style.display = "none"
iframe.src = `${chrome.runtime.getURL(
  "sandboxes/webllm.html"
)}?baseUrl=${chrome.runtime.getURL("")}`
iframe.sandbox.add("allow-scripts")
document.body.appendChild(iframe)

request.onsuccess = function (event) {
  db = event.target.result
  window.addEventListener("message", async function (event) {
    if (event?.data?.name === "cacheGet") {
      // Read the data from IndexedDB
      const transaction = db.transaction(["cache"], "readonly")
      const objectStore = transaction.objectStore("cache")
      const request = objectStore.get(event.data.key)

      request.onsuccess = function (e) {
        const result = e.target.result
        if (result) {
          event.source.postMessage({ val: result.val }, "*")
        } else {
          event.source.postMessage({}, "*")
        }
      }

      request.onerror = function (e) {
        console.error("Error reading data from IndexedDB:", e.target.error)
        // Send an appropriate response back to the iframe
        event.source.postMessage({ val: {} }, "*")
      }
    } else if (event?.data?.name === "cachePut") {
      // Store the data in IndexedDB
      const transaction = db.transaction(["cache"], "readwrite")
      const objectStore = transaction.objectStore("cache")
      const dataItem = { key: event.data.key, val: event.data.val }
      const request = objectStore.add(dataItem)

      request.onsuccess = function (e) {
        console.log("Data stored in IndexedDB with key:", e.target.result)
      }

      request.onerror = function (e) {
        console.error("Error storing data in IndexedDB:", e.target.error)
      }
    }
  })
}

listenForErrors()
listenForProgress()

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type !== "generate" && request.type !== "stream") {
    return
  }

  mutex
    .waitForUnlock()
    .then(() =>
      mutex.runExclusive(async () => {
        if (request.type === "generate") {
          getFromIframe(request).then((c) => sendResponse(c))
        }

        if (request.type === "stream") {
          streamFromIframe(request)
        }
      })
    )
    .catch((e) =>
      console.error("Offscreen failed to handle message", e, request)
    )

  return request.type === "generate"
})

function getFromIframe(request) {
  return new Promise(function (resolve) {
    iframe.contentWindow?.postMessage(request, "*")

    function handleMessage(event: MessageEvent<any>) {
      // Ensure the message is from the parent window
      if (event.source === iframe.contentWindow) {
        if (event.data.name !== "generateResp") {
          return
        }

        // Resolve the promise with the received data
        resolve(event.data)
        window.removeEventListener("message", handleMessage)
      }
    }

    // Listen for messages from the parent window
    window.addEventListener("message", handleMessage)
  })
}

function streamFromIframe(request) {
  iframe.contentWindow?.postMessage(request, "*")

  function handleMessage(event: MessageEvent<any>) {
    // Ensure the message is from the parent window
    if (event.source === iframe.contentWindow) {
      if (event.data.name === "endStream") {
        chrome.runtime.sendMessage({ type: "end", data: event.data })
        window.removeEventListener("message", handleMessage)
        return
      } else if (event.data.name === "streamResp") {
        chrome.runtime.sendMessage({ type: "streamResp", data: event.data })
      }
      // callback(event.data)
      // Resolve the promise with the received data

      // window.removeEventListener("message", handleMessage)
    }
  }

  // Listen for messages from the parent window
  window.addEventListener("message", handleMessage)
}

function listenForProgress() {
  function handleMessage(event: MessageEvent<any>) {
    // Ensure the message is from the parent window
    if (event.source === iframe.contentWindow) {
      if (event.data.type !== "progress") {
        return
      }

      chrome.runtime
        .sendMessage({ type: "progress", data: event.data })
        .catch((e) =>
          console.error("failed to send progress from offscreen", e)
        )
    }
  }

  // Listen for messages from the parent window
  window.addEventListener("message", handleMessage)
}

function listenForErrors() {
  function handleMessage(event: MessageEvent<any>) {
    // Ensure the message is from the parent window
    if (event.source === iframe.contentWindow) {
      if (event.data.type !== "error") {
        return
      }

      chrome.runtime
        .sendMessage({ type: "error", data: event.data.error })
        .catch((e) => console.error("failed to send error from offscreen", e))
    }
  }

  // Listen for messages from the parent window
  window.addEventListener("message", handleMessage)
}
