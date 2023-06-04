import type { ButtonHTMLAttributes, DetailedHTMLProps } from "react"
import React from "react"

import { Spinner } from "./Spinner"

type ButtonProps = {
  // Don't add className here - should be modified in the component props
  appearance?: "primary" | "secondary" | "tertiary"
  centered?: boolean
  loading?: boolean
  wide?: boolean
} & DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>

export function Button({
  appearance = "primary",
  centered = true,
  loading,
  children,
  wide,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={
        "inline-flex items-center px-6 py-2 font-semibold leading-6 rounded-md transition ease-in-out duration-100 " +
        "disabled:opacity-50 " +
        (appearance === "primary"
          ? "text-white bg-amber-500 hover:bg-amber-600 shadow "
          : appearance === "secondary"
          ? "text-amber-500 bg-amber-100 hover:bg-amber-200 shadow "
          : "text-amber-500 bg-gray-100 ") +
        (centered ? "justify-center " : "justify-start ") +
        (loading ? "relative " : "") +
        (wide ? "w-full " : "")
      }
      type="button"
      disabled={loading || rest.disabled}
      {...rest}>
      {children}
      {loading && <Spinner className="absolute right-0" />}
    </button>
  )
}
