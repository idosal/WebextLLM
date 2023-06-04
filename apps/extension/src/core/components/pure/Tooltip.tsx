import React, { useState } from "react"

export function Tooltip({
  children,
  content
}: {
  children: React.ReactNode
  content: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)

  const showTooltip = () => {
    setVisible(true)
  }

  const hideTooltip = () => {
    setVisible(false)
  }

  return (
    <span
      className="relative dark:text-amber-200 text-amber-900 cursor-pointer"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}>
      {children}
      {visible && (
        <span className="absolute z-10 left-1/2 transform -translate-x-1/2 top-full mt-2 p-3 w-52 bg-gray-900 text-amber-100 text-xs rounded-md shadow-lg">
          {content}
        </span>
      )}
    </span>
  )
}

export default Tooltip
