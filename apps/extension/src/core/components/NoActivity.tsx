import { Text } from "./pure/Text"

export function NoActivity() {
  return (
    <div className="flex flex-col p-8">
      <Text size="lg" align="center" strength="medium">
        Nothing here yet
      </Text>
      <p className="mt-4 text-center text-sm text-amber-600 dark:text-amber-400">
        Visit{" "}
        <a
          className="text-amber-800 font-medium dark:text-white"
          href="https://www.skylightai.io/"
          target="_blank"
          rel="noreferrer">
          Skylight AI
        </a>{" "}
        to explore apps that use window.ai
      </p>
    </div>
  )
}
