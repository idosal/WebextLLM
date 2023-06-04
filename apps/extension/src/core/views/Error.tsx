import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { useChromeStorageSession } from "use-chrome-storage"
import { Text } from "~core/components/pure/Text"
import Tooltip from "~core/components/pure/Tooltip"
import { Well } from "~core/components/pure/Well"


export function Error() {
  const [error] = useChromeStorageSession("error", { message: "", stack: "" })

  return (
    <div className="flex flex-col text-gray-500 dark:text-gray-100">
      <div className="flex flex-row justify-between items-center">
        <Text size="lg" strength="bold">
          Errors
        </Text>
        <Tooltip content={"Reload extension"}>
          <ArrowPathIcon
            onClick={() => chrome.runtime.reload()}
            className="h-5 w-5 mr-9"
          />
        </Tooltip>
      </div>
      <div className="mt-4">
        <Well>
          <div className="break-words">
            <Text size="xs" strength="medium">
              {error.message} {error.stack ? "(" + error.stack + ")" : ""}
            </Text>
          </div>
        </Well>
      </div>
    </div>
  )
}
