import React, { useState } from "react"

export function Tooltip({
  children,
  content,
    align
}: {
  children: React.ReactNode
  content: React.ReactNode
  align?: "left" | "center"
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
        <span className={`absolute z-10 ${align === 'left' ? 'right-2 ' : ''}transform -translate-y-20 transition-opacity duration-300 mt-2 p-3 w-fit bg-gray-900 text-amber-100 text-xs rounded-md shadow-lg`}>
          {content}
        </span>
      )}
    </span>
  )
}

export default Tooltip
