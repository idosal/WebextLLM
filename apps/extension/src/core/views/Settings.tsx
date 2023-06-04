import { CheckBadgeIcon } from "@heroicons/react/24/outline"
import { useEffect, useState } from "react"
import { DotLoader } from "react-spinners"
import { useChromeStorageSession } from "use-chrome-storage"

import { useParams } from "~core/components/hooks/useParams"
import { usePermissionPort } from "~core/components/hooks/usePermissionPort"
import { Button } from "~core/components/pure/Button"
import { Dropdown } from "~core/components/pure/Dropdown"
import { Splitter } from "~core/components/pure/Splitter"
import { Text } from "~core/components/pure/Text"
import Tooltip from "~core/components/pure/Tooltip"
import { Well } from "~core/components/pure/Well"
import { AuthType, type Config, configManager } from "~core/managers/config"
import { useConfig } from "~core/providers/config"
import { objectEntries } from "~core/utils/utils"
import { ModelID } from "~public-interface"

type ConfigSetting = { auth: AuthType; model?: ModelID }

const configSettings: ConfigSetting[] = [
  { auth: AuthType.None } // Native model
]

export function Settings() {
  const { config, setConfig } = useConfig()
  const { data } = usePermissionPort()
  const { requestId } = useParams()
  const [apiKey, setApiKey] = useState("")
  const [url, setUrl] = useState("")
  const [progress] = useChromeStorageSession("modelProgress", {
    progress: 0,
    timeElapsed: 0
  })
  const [isCompatible, setIsCompatible] = useState(null)

  // Only show dropdown if there is no permission request
  // or if the permission request is for the default model
  const showDefaultConfigDropdown =
    !data || ("requester" in data && !data.requester.transaction.model)

  useEffect(() => {
    setApiKey(config?.apiKey || "")
    setUrl(config?.baseUrl || "")
  }, [config])

  useEffect(() => {
    if (config && progress?.progress === 1) {
      config.downloaded = true
      setConfig(config)
      configManager
        .setDefault(config)
        .catch((err) =>
          console.error("failed to set downloaded on default config", err)
        )
    }
  }, [progress])

  useEffect(() => {
    if (!navigator.gpu) {
      setIsCompatible(false)
      return
    }

    navigator.gpu
      .requestAdapter()
      .then(() => {
        setIsCompatible(true)
      })
      .catch((err) => {
        console.error(err)
        setIsCompatible(false)
      })
  })

  async function saveDefaultConfig(authType: AuthType, modelId?: ModelID) {
    const config =
      (await configManager.forAuthAndModel(authType, modelId)) ||
      (await configManager.init(authType, modelId))
    await configManager.setDefault(config)
    setConfig(config)
  }

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
        Configuration
      </Text>
      <div className="my-3">
        {requestId && (
          <div className="bg-rose-700 text-white rounded-md py-4 px-6">
            {config?.session && config.auth === AuthType.External
              ? "Authentication error. Please sign in again."
              : "Please wait until the model us configured before proceeding."}
          </div>
        )}
      </div>
      {isCompatible !== null && !isCompatible && (
        <div className="bg-rose-700 text-white rounded-md py-4 px-6">
          Your browser does not support WebGPU. Please see the About section.
        </div>
      )}
      {showDefaultConfigDropdown && (
        <Well>
          <div className="-my-3">
            <Text strength="medium">Model</Text>
          </div>
          <Splitter />
          <div className="flex flex-col items-center">
            <img
              src={chrome.runtime.getURL("assets/icon.png")}
              width={100}
              height={100}
              alt="webext llama"
              className="flex-grow mt-3 mx-6 mb-5"
            />
          </div>
          <Dropdown<ConfigSetting>
            styled
            showArrows={false}
            choices={configSettings}
            getLabel={(c) => {
              return configManager.getLabelForAuth(c.auth, c.model)
            }}
            onSelect={(c) => {
              saveDefaultConfig(c.auth, c.model)
            }}>
            {config?.label}
          </Dropdown>
          <br />
          <div className="py-4 flex justify-center align-middle">
            {progress?.progress === 1 ? (
              // green hex
              <CheckBadgeIcon
                color="#66fadd"
                style={{ width: "45px", height: "45px" }}
              />
            ) : (
              <DotLoader
                size={45}
                color="#ececec"
                loading={progress.progress !== 1}
              />
            )}
          </div>
          {/*<br/>*/}
          {progress?.progress ? (
            <div style={{ marginTop: "10px" }}>
              {progress?.progress === 1 ? (
                <Text align="center" size="xs" strength="medium">
                  The model is ready!
                </Text>
              ) : (
                <Tooltip
                  content={
                    "First time will take a few minutes. Future initializations will be quick"
                  }>
                  <Text align="center" size="xs" strength="medium">
                    Loading model: {(progress.progress * 100).toFixed(1)}%
                    (elapsed: {progress.timeElapsed}s)
                  </Text>
                </Tooltip>
              )}
            </div>
          ) : ''}
        </Well>
      )}

      {/*<div className="py-4">*/}
      {/*  <Well>*/}
      {/*    <div className="-my-3 flex flex-row justify-between">*/}
      {/*      <Text strength="medium" dimming="less">*/}
      {/*        Settings:*/}
      {/*      </Text>*/}
      {/*      {!showDefaultConfigDropdown && (*/}
      {/*        <Text align="right" strength="medium" dimming="more">*/}
      {/*          {config?.label}*/}
      {/*        </Text>*/}
      {/*      )}*/}
      {/*    </div>*/}

      {/*    <Splitter />*/}

      {/*    <div>*/}
      {/*      {asksForAPIKey && (*/}
      {/*        <Input*/}
      {/*          placeholder="API Key"*/}
      {/*          value={apiKey || ""}*/}
      {/*          onChange={(val) => setApiKey(val)}*/}
      {/*          onBlur={saveAll}*/}
      {/*        />*/}
      {/*      )}*/}
      {/*      {isExternal && <ExternalSettings config={config} />}*/}
      {/*      <div className="mt-3"></div>*/}
      {/*      {needsAPIKey && (*/}
      {/*        <Text dimming="less" size="xs">*/}
      {/*          {apiKey ? "Monitor your" : "Obtain an"} API key{" "}*/}
      {/*          <a*/}
      {/*            href={configManager.getExternalConfigURL(config)}*/}
      {/*            target="_blank"*/}
      {/*            className="font-bold"*/}
      {/*            rel="noreferrer">*/}
      {/*            here*/}
      {/*          </a>{" "}*/}
      {/*          <Tooltip*/}
      {/*            content={*/}
      {/*              <span>*/}
      {/*                API keys are only stored in your browser. For OpenAI, you*/}
      {/*                must have a paid account, otherwise your key will be*/}
      {/*                rate-limited excessively.*/}
      {/*                <br />*/}
      {/*                <br />*/}
      {/*                An API key is required for the OpenAI and Cohere models,*/}
      {/*                but not for Together or Local (running on your computer).*/}
      {/*              </span>*/}
      {/*            }>*/}
      {/*            <InformationCircleIcon className="w-3 inline -mt-1 opacity-50" />*/}
      {/*          </Tooltip>*/}
      {/*        </Text>*/}
      {/*      )}*/}
      {/*      {isOpenAIAPI && (*/}
      {/*        <Text dimming="less" size="xs">*/}
      {/*          Note: you must be on a{" "}*/}
      {/*          <a*/}
      {/*            href={"https://platform.openai.com/account/billing/overview"}*/}
      {/*            target="_blank"*/}
      {/*            className="font-bold"*/}
      {/*            rel="noreferrer">*/}
      {/*            paid account*/}
      {/*          </a>*/}
      {/*          .*/}
      {/*        </Text>*/}
      {/*      )}*/}
      {/*      {isNativeModel && (*/}
      {/*          <>*/}
      {/*            <Text dimming="less" size="xs">*/}
      {/*              Set up a native model in your browser{" "}*/}
      {/*              <a*/}
      {/*                  href={*/}
      {/*                    "https://github.com/alexanderatallah/Alpaca-Turbo#using-the-api"*/}
      {/*                  }*/}
      {/*                  target="_blank"*/}
      {/*                  className="font-bold"*/}
      {/*                  rel="noreferrer">*/}
      {/*                here*/}
      {/*              </a>*/}
      {/*              .*/}
      {/*            </Text>*/}
      {/*          </>*/}
      {/*      )}*/}
      {/*      {isLocalModel && (*/}
      {/*        <Text dimming="less" size="xs">*/}
      {/*          Set up Alpaca on your computer{" "}*/}
      {/*          <a*/}
      {/*            href={*/}
      {/*              "https://github.com/alexanderatallah/Alpaca-Turbo#using-the-api"*/}
      {/*            }*/}
      {/*            target="_blank"*/}
      {/*            className="font-bold"*/}
      {/*            rel="noreferrer">*/}
      {/*            here*/}
      {/*          </a>*/}
      {/*          .*/}
      {/*        </Text>*/}
      {/*      )}*/}
      {/*      <Accordion title="Advanced" initiallyOpened={isLocalModel}>*/}
      {/*        <Input*/}
      {/*          placeholder="Base URL"*/}
      {/*          type="url"*/}
      {/*          name="base-url"*/}
      {/*          value={url || config?.baseUrl || ""}*/}
      {/*          onChange={(val) => setUrl(val)}*/}
      {/*          onBlur={saveAll}*/}
      {/*        />*/}
      {/*        <label*/}
      {/*          htmlFor={"base-url"}*/}
      {/*          className="block text-xs font-medium opacity-60 mt-2">*/}
      {/*          {isLocalModel*/}
      {/*            ? "Use any base URL, including localhost."*/}
      {/*            : "Optionally use this to set a proxy. Only change if you know what you're doing."}*/}
      {/*        </label>*/}
      {/*      </Accordion>*/}
      {/*    </div>*/}
      {/*  </Well>*/}
      {/*</div>*/}
    </div>
  )
}

