import { useEffect } from "react"

import { NavBar } from "~core/components/NavBar"
import { SlidingPane } from "~core/components/pure/SlidingPane"
import { configManager } from "~core/managers/config"
import { ConfigProvider } from "~core/providers/config"
import { NavProvider, useNav } from "~core/providers/nav"
import { Activity } from "~core/views/Activity"
import { Apps } from "~core/views/Apps"
import { Settings } from "~core/views/Settings"

import "../style.css"

import { useParams } from "~core/components/hooks/useParams"
import { Disclaimer } from "~core/views/Disclaimer"
import { Error } from "~core/views/Error"
import { About } from "~core/views/About"
import { RequestInterrupt } from "~core/views/RequestInterrupt"
import { Help } from "~core/views/Help"

function Index() {
  return (
    <main
      className={
        "bg-gray-200 dark:bg-gray-800" +
        " text-gray-900 dark:text-gray-200" +
        " md:mx-auto p-0 w-[24rem] h-[556px]" + // 545
        " text-sm font-sans"
      }>
      <NavProvider>
        <ConfigProvider>
          <NavFrame />
        </ConfigProvider>
      </NavProvider>
    </main>
  )
}

function NavFrame() {
  const { requestId } = useParams()
  const {
    view,
    setSettingsShown,
    settingsShown,
      helpShown,
      setHelpShown,
    aboutShown,
    setAboutShown,
    setErrorShown,
    errorShown,
    disclaimerShown,
    setDisclaimerShown
  } = useNav()

  useEffect(() => {
    async function checkConfig() {
      // This logic allows us to default the settings page on for first-time users
      const config = await configManager.getDefault()
      if (!configManager.isCredentialed(config)) {
        setSettingsShown(true)
      }
    }
    if (!requestId) {
      checkConfig()
    }
  }, [requestId])

  return (
    <div className="h-full">
      {requestId ? (
        <RequestInterrupt />
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-none">
            <NavBar />
          </div>
          <div className="flex-auto relative overflow-y-auto overflow-x-hidden">
            {view === "activity" && <Activity />}
            {view === "apps" && <Apps />}
          </div>
        </div>
      )}
      <SlidingPane
        shown={errorShown}
        animated={errorShown}
        onHide={() => setErrorShown(false)}>
        <Error />
      </SlidingPane>
      <SlidingPane
        shown={disclaimerShown}
        animated={disclaimerShown}
        onHide={() => setDisclaimerShown(false)}>
        <Disclaimer />
      </SlidingPane>
    <SlidingPane
        shown={helpShown}
        animated={helpShown}
        onHide={() => setHelpShown(false)}>
        <Help />
    </SlidingPane>
      <SlidingPane
        shown={aboutShown}
        animated={aboutShown}
        onHide={() => setAboutShown(false)}>
        <About />
      </SlidingPane>
      <SlidingPane
        shown={settingsShown}
        animated={settingsShown}
        onHide={() => setSettingsShown(false)}>
        <Settings />
      </SlidingPane>
    </div>
  )
}

export default Index
