import { ChevronUpDownIcon } from "@heroicons/react/24/solid"
import { useState } from "react"

export function Dropdown<T>({
  styled = false,
  children,
  choices,
  getLabel,
  onSelect,
  showArrows
}: {
  styled?: boolean
  children: React.ReactNode
  choices: Readonly<T[]>
  getLabel?: (choice: T) => string
  onSelect: (choice: T) => void
  showArrows: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const getLabelOrDefault =
    getLabel ||
    ((choice) => (typeof choice === "string" ? choice : JSON.stringify(choice)))

  return (
    <div>
      <button
        disabled={choices.length < 2}
        type="button"
        className={
          "inline-flex justify-center w-full rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 " +
          (styled
            ? "border shadow-sm text-amber-700 dark:text-white hover:bg-amber-200 hover:dark:bg-amber-700 border-amber-300 dark:border-amber-400 focus:ring-amber-500"
            : "")
        }
        id="options-menu"
        aria-haspopup="true"
        aria-expanded="true"
        onClick={() => setIsOpen(!isOpen)}>
        {children}
        {showArrows && <ChevronUpDownIcon className="ml-2 h-5 w-5" />}
      </button>

      {isOpen && (
        <div
          className="absolute z-10 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu">
          <div className="py-1" role="none">
            {choices.map((choice) => (
              <button
                key={getLabelOrDefault(choice)}
                className="block text-left w-full px-4 py-2 pr-8 text-amber-700 hover:amber hover:text-indigo-900 focus:outline-none focus:bg-indigo-100 focus:text-indigo-900"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false)
                  onSelect(choice)
                }}>
                {getLabelOrDefault(choice)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
