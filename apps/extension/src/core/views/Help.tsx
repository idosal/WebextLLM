import { useState } from "react"
import { Text } from "~core/components/pure/Text"
import { Well } from "~core/components/pure/Well"
import { configManager } from "~core/managers/config"
import { useConfig } from "~core/providers/config"
import { GitHub } from "~core/components/Icons/Github"
import { Twitter } from "~core/components/Icons/Twitter"
import Link from "next/link"

export function Help() {
  const {config, setConfig} = useConfig()
  const [apiKey, setApiKey] = useState("")
  const [url, setUrl] = useState("")

  async function saveAll() {
    if (!config) {
      return
    }
    return configManager.save({
      ...config,
      apiKey: apiKey,
      baseUrl: url
    })
  }

  return (
      <div className="flex flex-col text-gray-500 dark:text-gray-100">
        <Text size="lg" strength="bold">
          Help
        </Text>
        <div className='mt-4'>
          <Well>
            <>
              <Text strength='bold' size="xs">Missing WebGPU?</Text>
              <Text size="xs">Update your browser and check webgpureport.org</Text>
              <br/>
              <Text strength='bold' size="xs">Failed to load a f16 model?</Text>
              <Text size="xs">Currently, using fp16 in Chrome requires a command-line argument. Please update and launch your browser with `enable-dawn-features=allow_unsafe_apis`. For example, in MacOS:</Text>
              <Text size="xs">/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --enable-dawn-features=allow_unsafe_apis</Text>
              <br/>
              <Text strength='bold' size="xs">Download appears stuck? Extension resets?</Text>
              <Text size="xs">First download will take minutes with a decent internet connection. Give it time, WebextLLM will self-heal by restarting. Future initializations will be much faster.</Text>
              <br/>
              <Text strength='bold' size="xs">Model crashes? Inference is slow?</Text>
              <Text size="xs">Models are loaded into VRAM. As such, they demand a capable device (with emphasis on the GPU). Currently, the smallest model requires ~4GB VRAM. Prefer to use the f16 variants.</Text>
              <br/>
              <Text strength='bold' size="xs">In case of unrecoverable errors, please restart the extension and report the issue on Github.</Text>
            </>
          </Well>
        </div>
      </div>
  )
}