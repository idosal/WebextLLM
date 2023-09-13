import { createProvider } from "puro"
import { useContext, useState } from "react"

export type NavView = "activity" | "apps"

const useNavProvider = () => {
  const [view, setView] = useState<NavView>("activity")
  const [settingsShown, setSettingsShown] = useState(false)
  const [aboutShown, setAboutShown] = useState(false)
  const [errorShown, setErrorShown] = useState(false)
  const [disclaimerShown, setDisclaimerShown] = useState(false)
  const [helpShown, setHelpShown] = useState(false)

  return {
    view,
    settingsShown,
    aboutShown,
    setView,
    setSettingsShown,
    setAboutShown,
    errorShown,
    setErrorShown,
    disclaimerShown,
    setDisclaimerShown,
    helpShown,
    setHelpShown
  }
}

const { BaseContext, Provider } = createProvider(useNavProvider)

export const NavProvider = Provider
export const useNav = () => useContext(BaseContext)
