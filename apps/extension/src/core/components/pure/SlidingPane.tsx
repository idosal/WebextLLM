import { XMarkIcon } from "@heroicons/react/24/solid"
import React from "react"

export function SlidingPane({
  shown = false,
  animated = true,
  onHide,
  children
}: {
  animated?: boolean
  children: React.ReactNode
  shown: boolean
  onHide?: () => void
}) {
  return (
    <div
      className={
        "bg-gray-200 dark:bg-gray-800" +
        ` p-4 z-10 fixed top-0 left-0 right-0 bottom-0 overflow-y-auto ${
          !shown ? "translate-x-full " : "translate-x-0 "
        }` +
        (animated ? "transition-transform duration-200 ease-in-out " : "")
      }>
      {onHide && (
        <button
          type="button"
          className="fixed right-0 top-0 px-4 py-4 text-lg text-gray-500 bg-gray-200/80 dark:bg-gray-800/80 hover:bg-gray-300 dark:hover:bg-gray-700"
          onClick={onHide}>
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
      {children}
    </div>
  )
}
