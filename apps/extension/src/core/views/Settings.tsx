import { XCircleIcon ,StopCircleIcon, CheckBadgeIcon, Battery0Icon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { DotLoader } from "react-spinners";
import { useChromeStorageSession } from "use-chrome-storage";
import { useParams } from "~core/components/hooks/useParams";
import { usePermissionPort } from "~core/components/hooks/usePermissionPort";
import { Dropdown } from "~core/components/pure/Dropdown";
import { Splitter } from "~core/components/pure/Splitter";
import { Text } from "~core/components/pure/Text";
import Tooltip from "~core/components/pure/Tooltip";
import { Well } from "~core/components/pure/Well";
import { AuthType, configManager } from "~core/managers/config";
import { useConfig } from "~core/providers/config";
import { ModelID } from "~public-interface";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNav } from "~core/providers/nav";
import { useThemeDetector } from "~core/components/hooks/useThemeDetector";

type ConfigSetting = { auth: AuthType; model?: ModelID }

const configSettings: ConfigSetting[] = [
  { auth: AuthType.None, model: ModelID.TinyLlama11Bf16 },
  { auth: AuthType.None, model: ModelID.RedPajama },
  { auth: AuthType.None, model: ModelID.WizardVicuna },
  { auth: AuthType.None, model: ModelID.NousHermes13B },
  { auth: AuthType.None, model: ModelID.NousHermes13Bf16 },
  { auth: AuthType.None, model: ModelID.Llama2AYT13Bf16 },
  { auth: AuthType.None, model: ModelID.StablePlatypus213Bf16 },
  { auth: AuthType.None, model: ModelID.WizardCoder15Bf16 },
]

export function Settings() {
  const { config, setConfig } = useConfig()
  const { data } = usePermissionPort()
  const { requestId } = useParams()
  const [apiKey, setApiKey] = useState("")
  const [url, setUrl] = useState("")
  const [progress, setProgress] = useChromeStorageSession(configManager.getCurrentModel(config) || '', {
    progress: {
      progress: 0,
      timeElapsed: 0
    },
  })
  const [isActive] = useChromeStorageSession('active', false)
  const [isAwake] = useChromeStorageSession('awake', false)
  const [compatibility, setCompatibility] = useState(null)
  const { setHelpShown, setSettingsShown} = useNav()
  const isDarkTheme = useThemeDetector()

  // Only show dropdown if there is no permission request
  // or if the permission request is for the default model
  const showDefaultConfigDropdown =
    !data || ("requester" in data && !data.requester.transaction.model)

  useEffect(() => {
    if (compatibility === null) {
      return
    }

    let message = ''
    if (!compatibility) {
      message = 'Your browser does not support WebGPU. Click here for Help!'
    } else if (config?.label.includes('-f16') && compatibility !== 'webgpu-f16') {
      message = 'Your browser/GPU does not support f16 models. Click here for Help!'
    } else if (!requestId) {
        toast.dismiss()
        return
    } else {
        return
    }

    toast.error(message, {
      position: "bottom-center",
      hideProgressBar: true,
      autoClose: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      theme: isDarkTheme ? "dark" : "light",
    })
  }, [config, compatibility])

  useEffect(() => {
    setUrl(config?.baseUrl || "")
  }, [config])

  useEffect(() => {
    if (!requestId) {
      return
    }

    toast.info('Please wait until the model is ready before proceeding', {
      position: "top-center",
      hideProgressBar: true,
      autoClose: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      theme: isDarkTheme ? "dark" : "light",
    })
  }, [requestId])

  useEffect(() => {
    // console.log('progress', progress)
    if (config && progress?.progress?.progress === 1) {
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
      setCompatibility('')
      return
    }

    navigator.gpu
      .requestAdapter({
        powerPreference: "high-performance"
      })
      .then((a) => {
        if (a.features.has('shader-f16')) {
          setCompatibility('webgpu-f16')
          return
        }

        setCompatibility('webgpu')
      })
      .catch((err) => {
        console.error(err)
        setCompatibility('')
      })
  })

  async function saveDefaultConfig(authType: AuthType, modelId?: ModelID) {
    // console.error('saveDefaultConfig', authType, modelId)
    const config =
      (await configManager.forAuthAndModel(authType, modelId)) ||
      (await configManager.init(authType, modelId))
    await configManager.setDefault(config)
    toast.dismiss()
    chrome.action.setBadgeText({ text: "" })
    setConfig(config)
    setProgress({ progress: { progress: 0, timeElapsed: 0 } })
    // chrome.action.setIcon({ path: config.icon }).catch(console.error)
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
      </div>
      <ToastContainer
          position="bottom-center"
          newestOnTop={false}
          onClick={() => {
            setHelpShown(true)
            setSettingsShown(false)
          }}
          rtl={false}
          pauseOnFocusLoss
          pauseOnHover
          theme={isDarkTheme ? "dark" : "light"} />
      {showDefaultConfigDropdown && (
        <Well>
          <div className="flex flex-row justify-between items-center -my-3">
            <div>
              <Text strength="medium">Model</Text>
            </div>
            <div className="flex flex-row w-1/6 justify-end">
              {isActive && <div className="mx-3">
                <Tooltip alignLeft={true} alignTop={true} content={"Stop completion"}>
                  <XCircleIcon
                      onClick={() => chrome.runtime.sendMessage({ type: "interrupt" })}
                      className="h-5 w-5 dark:text-gray-400 dark:hover:text-gray-200 text-gray-600 hover:text-gray-400"
                  />
                </Tooltip>
              </div>}
              {progress?.progress?.progress === 1 && <Tooltip alignLeft={true} alignTop={true} content={"Kill model"}>
                <StopCircleIcon
                    onClick={() => chrome.runtime.sendMessage({ type: "sleep" })}
                    className="h-5 w-5 dark:text-gray-400 dark:hover:text-gray-200 text-gray-600 hover:text-gray-400"
                />
              </Tooltip>}
            </div>
          </div>
          <Splitter />
          <div className="flex flex-col items-center">
            <img
              src={config?.image}
              width={125}
              height={125}
              alt="webext llama"
              className="flex-grow mb-3"
            />
          </div>
          <Dropdown<ConfigSetting>
            styled
            className='w-304'
            showArrows={true}
            choices={configSettings}
            getLabel={(c) => {
              return configManager.getLabelForAuth(c.auth, c.model)
            }}
            onSelect={(c) => {
              saveDefaultConfig(c.auth, c.model)
            }}>
            {config?.label}
          </Dropdown>
          <div className="mt-3 text">
            <Text align="center" size="xs" strength="medium">
              Model size: {config?.size}GB; VRAM: {config?.vram}GB
            </Text>
          </div>
          <div className="mt-3 text-amber-600 dark:text-amber-200">
            <Text align="center" size="xs" strength="medium">
              {config?.description}
            </Text>
          </div>
          <br />
          { compatibility !== null && compatibility && !(config?.label.includes('-f16') && compatibility !== 'webgpu-f16') && (
              <>
                <div className="py-4 flex justify-center align-middle">
                  {progress?.progress?.progress === 1 ? (
                      // green hex
                      <CheckBadgeIcon
                          color="#66fadd"
                          style={{ width: "45px", height: "45px" }}
                      />
                  ) : !isAwake ? <Battery0Icon
                      // color="#66fadd"
                      style={{ width: "45px", height: "45px" }}
                  /> : (
                      <DotLoader
                          size={45}
                          color={isDarkTheme ? "#dedede" : "#999999"}
                          loading={progress?.progress?.progress !== 1}
                      />
                  )}
                </div>
                {progress?.progress ? (
                    <div style={{ marginTop: "10px" }}>
                      {progress?.progress?.progress === 1 ? (
                          <Text align="center" size="xs" strength="medium">
                            The model is ready!
                          </Text>
                      ) : !isAwake ?
                          <Tooltip
                              content={
                                "Wake it up by using an app!"
                              }>
                            <Text align="center" size="xs" strength="medium">
                              The model is asleep 💤
                            </Text>
                          </Tooltip> : (
                          <Tooltip
                              alignTop={true}
                              content={
                                "First download will take a few minutes. Future initializations will be fast"
                              }>
                            <Text align="center" size="xs" strength="medium">
                              Loading model: {(progress?.progress?.progress * 100).toFixed(1)}%
                              (elapsed: {progress?.progress?.timeElapsed}s)
                            </Text>
                          </Tooltip>
                      )}
                    </div>
                ) : ''}
              </>
            )
          }
        </Well>
      )}
    </div>
  )
}