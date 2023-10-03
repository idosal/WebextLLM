import { KeyIcon } from "@heroicons/react/24/solid"
import { useEffect } from "react"
import { Accordion } from "~core/components/pure/Accordion"
import { Button } from "~core/components/pure/Button"
import { Dropdown } from "~core/components/pure/Dropdown"
import { Text } from "~core/components/pure/Text"
import type { PortResponse } from "~core/constants"
import { PortName } from "~core/constants"
import { configManager } from "~core/managers/config"
import { originManager } from "~core/managers/origin"
import type { Transaction } from "~core/managers/transaction"
import { transactionManager } from "~core/managers/transaction"
import { useConfig } from "~core/providers/config"
import { useNav } from "~core/providers/nav"
import { isKnownModel } from "~public-interface"
import {useChromeStorageSession} from "use-chrome-storage";

export function PermissionRequest({
  data,
  onResult
}: {
  data: PortResponse[PortName.Permission]
  onResult: (response: boolean) => void
}) {
  const [transaction, error] =
    "error" in data
      ? [undefined, data.error]
      : [data.requester.transaction, undefined]

  return (
    <div className="flex flex-col h-[95%]">
      <div className="flex-auto flex flex-col overflow-y-auto overflow-x-hidden items-center justify-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900">
          <KeyIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="mt-4 flex flex-col items-center w-full">
          <Text size="lg" strength="medium">
            Permission Request
          </Text>
          {transaction ? (
            <TransactionPermission transaction={transaction} />
          ) : (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Error: {error}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mx-4">
        <Button appearance="secondary" onClick={() => onResult(false)}>
          Deny
        </Button>
        <Button appearance="primary" onClick={() => onResult(true)}>
          Allow
        </Button>
      </div>
    </div>
  )
}

function TransactionPermission({ transaction }: { transaction: Transaction }) {
  const { setSettingsShown } = useNav()
  const { config, setConfig } = useConfig()
  const { object, setObject } = originManager.useObject(transaction.origin.id)
    const [progress] = useChromeStorageSession(configManager.getCurrentModel(config) || '', {
        progress: {
            progress: 0,
            timeElapsed: 0
        },
    })
  const requestedModel = transaction.model

  useEffect(() => {
    async function checkConfig() {
      const config = await configManager.forModelWithDefault(requestedModel)
      setConfig(config)
      if (!configManager.isCredentialed(config)) {
        setSettingsShown(true)
      }
    }
    checkConfig()
  }, [requestedModel])

    useEffect(() => {
        if (progress?.progress?.progress !== 1) {
            return
        }

        setSettingsShown(false)
    }, [progress])

  return (
    <div className="flex flex-col items-center text-center">
      <Text dimming="more" size="lg">
        {originManager.originDisplay(transaction.origin)}
      </Text>
      <p className="mt-2 ml-10 mr-10 text-sm text-gray-600 dark:text-gray-400">
        This app is requesting permission to access {config?.label}
        {requestedModel && !isKnownModel(requestedModel)
          ? ` (${requestedModel})`
          : ""}
      </p>
      <Accordion title="View Request" centered>
        <code className="block text-left text-xs overflow-y-auto max-h-20 px-4">
          {JSON.stringify(transactionManager.formatJSON(transaction), null, 2)}
        </code>
      </Accordion>
        <br/>
        <p>Should we ask for permission?</p>
      <Dropdown
        choices={["ask", "allow"] as const}
        showArrows={true}
        onSelect={async (permission) =>
          setObject({
            ...transaction.origin,
            permissions: permission
          })
        }>
        {object?.permissions === "allow"
          ? "Always allow this site"
          : "Always ask permission for this site"}
      </Dropdown>
    </div>
  )
}
