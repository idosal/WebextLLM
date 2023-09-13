import { Text } from "./pure/Text"
import { useNav } from "~core/providers/nav"

export function NoActivity() {
    const { setView} = useNav()

  return (
    <div className="flex flex-col p-8">
      <Text size="lg" align="center" strength="medium">
        Nothing here yet
      </Text>
      <p className="mt-4 text-center text-sm text-amber-600 dark:text-amber-400">
        Explore apps in {" "}
        <button
          className="text-amber-800 font-medium dark:text-white"
          onClick={() => setView('apps')}
        >
          Trending
        </button>
      </p>
    </div>
  )
}
