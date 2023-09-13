import { Text } from "~core/components/pure/Text"
import Tooltip from "~core/components/pure/Tooltip"
import { Well } from "~core/components/pure/Well"

export function Disclaimer() {
  return (
    <div className="flex flex-col text-gray-500 dark:text-gray-100">
      <div className="flex flex-row justify-between items-center">
        <Text size="lg" strength="bold">
          Disclaimer
        </Text>
      </div>
      <div className="mt-4">
        <Well>
          <div className="break-words">
            <Text size="xs">
              WebextLLM a proof-of-concept using experimental technologies. It is not recommended for production use and is currently targeted for research purposes. The software is provided "as-is" without any warranty, expressed or implied. By using this software, you agree to assume all risks, including potential data loss, system failure, or other issues that may occur.
              The models provided in this project are not affiliated with, or endorsed by the project's author. The author does not claim ownership of the models and is not responsible for any issues arising from their use. Please note that open-source models, especially uncensored ones, are not regulated and may generate offensive or harmful content.
              Similarly, the project's author is not affiliated with the applications utilizing the window.ai API. The author does not claim ownership of the applications and is not liable for any issues arising from their use.
                Use at your own disclosure.
            </Text>
          </div>
        </Well>
      </div>
    </div>
  )
}
