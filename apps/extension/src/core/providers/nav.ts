import { createProvider } from "puro"
import { useContext, useEffect, useState } from "react"

export type NavView = "activity" | "apps"

const useNavProvider = () => {
  const [view, setView] = useState<NavView>("activity")
  const [settingsShown, setSettingsShown] = useState(false)
  const [helpShown, setHelpShown] = useState(false)
  const [errorShown, setErrorShown] = useState(false)
  const [disclaimerShown, setDisclaimerShown] = useState(false)

  return {
    view,
    settingsShown,
    helpShown,
    setView,
    setSettingsShown,
    setHelpShown,
    errorShown,
    setErrorShown,
    disclaimerShown,
    setDisclaimerShown
  }
}

const { BaseContext, Provider } = createProvider(useNavProvider)

export const NavProvider = Provider
export const useNav = () => useContext(BaseContext)
