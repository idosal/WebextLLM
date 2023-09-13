import {
  Cog8ToothIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
    QuestionMarkCircleIcon
} from "@heroicons/react/24/outline"
import { useChromeStorageSession } from "use-chrome-storage"

import type { NavView } from "~core/providers/nav"
import { useNav } from "~core/providers/nav"

type Tab = { name: string; view: NavView }
export function NavBar() {
  const {
    view,
    setView,
    setSettingsShown,
    setAboutShown,
      setHelpShown,
      setErrorShown,
    setDisclaimerShown
  } = useNav()
  const [error] = useChromeStorageSession("error", { message: "", stack: "" })

  const tabs: Tab[] = [
    { name: "Activity", view: "activity" },
    { name: "Apps", view: "apps" }
  ]
  return (
    <div className="flex flex-row p-2">
      <div className="w-full flex flex-row">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            type="button"
            className={
              "px-4 py-2 rounded-full font-semibold" +
              " transition-all duration-200 ease-in-out" +
              (view === tab.view
                ? " text-gray-500 dark:text-gray-100 bg-amber-300 dark:bg-amber-700"
                : " text-gray-400 dark:text-gray-300")
            }
            onClick={() => setView(tab.view)}>
            {tab.name}
          </button>
        ))}
      </div>
      {error.message && (
        <button
          type="button"
          className="flex-none rounded-lg px-2 py-1 text-red-600 hover:bg-gray-300 dark:hover:bg-gray-700"
          onClick={() => setErrorShown(true)}>
          <ExclamationTriangleIcon className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        className="flex-none rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
        onClick={() => setDisclaimerShown(true)}>
        <ShieldExclamationIcon className="h-5 w-5" />
      </button>
    <button
        type="button"
        className="flex-none rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
        onClick={() => setHelpShown(true)}>
        <QuestionMarkCircleIcon className="h-5 w-5" />
    </button>
      <button
        type="button"
        className="flex-none rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
        onClick={() => setAboutShown(true)}>
        <InformationCircleIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="flex-none rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
        onClick={() => setSettingsShown(true)}>
        <Cog8ToothIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
