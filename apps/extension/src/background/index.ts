import { log } from "~core/utils/utils"
import {configManager} from "~core/managers/config"

export {}

log("Background script loaded")

const initializeModel = () => configManager.getDefault().then((config) => {
    // console.log("Default config", config)
    configManager.getCaller(config).then((caller) => {
        // console.log("Caller", caller)
    }).catch((e) => {
        console.error("Caller error", e)
    })
}).catch((e) => {
    console.error("Default config error", e)
})

initializeModel()
configManager.subscribe(initializeModel)
