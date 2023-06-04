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
          About
        </Text>
        <div className='mt-4'>
          <Well>
            <>
              <Text size="xs">WebextLLM brings the generative AI revolution straight to your
                browser!</Text>
              <Text size="xs">Harness the power of local open-source LLMs to fuel a growing AI-based app ecosystem.</Text>
              <br/>
              <Text size="xs">Using WebextLLM, you have complete privacy as data never leaves your device. It also improves security and availability. Best of all, it's completely free to use (for both users and app developers)!</Text>
              <br/>
              <Text size="xs">Running browser-native LLMs demands a capable device. Currently, the minimal requirement
                is 6.5GB of GPU memory.</Text>
              <Text size="xs">In case of errors, please try restarting the extension/browser. Contact us!</Text>
            </>
          </Well>
        </div>
        <div className="mt-3">
          <Well>
            <div className="flex flex-row justify-evenly">
              <Link target='_blank' href='https://github.com/idosal/WebextLLM' title={'Github'}>
                <GitHub className="w-6 h-6"/>
              </Link>
              <Link target='_blank' href='https://twitter.com/idosal1' title={'@idosal1'}>
                <Twitter className="w-6 h-6"/>
              </Link>
            </div>
          </Well>
        </div>
      </div>
  )
}