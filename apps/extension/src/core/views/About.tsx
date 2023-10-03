import { useState } from "react"
import { Text } from "~core/components/pure/Text"
import { Well } from "~core/components/pure/Well"
import { configManager } from "~core/managers/config"
import { useConfig } from "~core/providers/config"
import { GitHub } from "~core/components/Icons/Github"
import { Medium } from "~core/components/Icons/Medium"
import { Twitter } from "~core/components/Icons/Twitter"
import Link from "next/link"

export function About() {
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
              <Text>WebextLLM brings the gen AI revolution straight to your
                browser with zero configuration!</Text>
              <Text>Harness the power of local LLMs to fuel the growing window.ai app ecosystem.</Text>
              <br/>
              <Text>Key features:</Text>
              <li>Own your models: Experience the freedom of owning your own local LLMs, enjoying a limitless, offline, private, and secure environment. Nothing leaves your browser!</li>
              <li>Control: Exercise complete control over access to your LLM, granting or denying permission to any application at any time</li>
              <li>Visibility: Gain insights into the history of prompts and responses to your model across different applications</li>
            </>
          </Well>
        </div>
        <div className="mt-3">
          <Well>
            <div className="flex flex-row justify-evenly">
              <Link target='_blank' href='https://github.com/idosal/WebextLLM' title={'WebextLLM'}>
                <GitHub className="w-6 h-6"/>
              </Link>
              <Link target='_blank' href='https://twitter.com/idosal1' title={'@idosal1'}>
                <Twitter className="w-6 h-6"/>
              </Link>
              <Link target='_blank' href='https://medium.com/@idosalomon' title={'@IdoSalomon'}>
                <Medium className="w-6 h-6"/>
              </Link>
            </div>
          </Well>
        </div>
      </div>
  )
}