import {useEffect, useRef, useState} from "react"

import { NoActivity } from "~core/components/NoActivity"
import { useInfiniteScroll } from "~core/components/hooks/useInfiniteScroll"
import { Logo } from "~core/components/pure/Logo"
import { Skeleton } from "~core/components/pure/Skeleton"
import { SlidingPane } from "~core/components/pure/SlidingPane"
import { Text } from "~core/components/pure/Text"
import type { Origin } from "~core/managers/origin"
import { originManager } from "~core/managers/origin"

import { AppsItem } from "./AppsItem"
import { HorizontalMenu } from "~core/components/pure/HorizontalMenu";

type Filter = "my-apps" | "trending"

export function Apps() {
  const { objects, loading, appendNextPage } = originManager.useObjects(20)
  const [filter, setFilter] = useState<Filter>("my-apps")
  const [selectedApp, selectApp] = useState<Origin | undefined>()
  const trendingApps = [{"id":"https://www.omnimodel.chat/","domain":"https://www.omnimodel.chat","path":"/","title":"Chatbot UI","permissions":"ask"},
      {"id":"https://chat-vrm-window.vercel.app/","domain":"https://chat-vrm-window.vercel.app","path":"/","title":"ChatVRM","permissions":"ask"},
      {"id":"https://play-chess-gpt.vercel.app/","domain":"https://play-chess-gpt.vercel.app","path":"/","title":"Chess GPT","permissions":"ask"},
      {"id":"https://generative-agents-notebook-js.vercel.app/","domain":"https://generative-agents-notebook-js.vercel.app","path":"/","title":"Generative Agents Notebook Demo","permissions":"ask"},
      {"id":"https://robot-companion.vercel.app/","domain":"https://robot-companion.vercel.app","path":"/","title":"Robot Companion with window.ai","permissions":"ask"}
  ]
  const filteredApps = filter === 'my-apps' ? objects : trendingApps
  const loaderRef = useRef<HTMLDivElement>(null)

  useInfiniteScroll(loaderRef, appendNextPage, objects.length > 0)

  useEffect(() => {
      if (!loading && objects.length === 0) {
          setFilter('trending')
      } else {
          setFilter('my-apps')
      }
  }, [loading])

  return (
    <div>
      <HorizontalMenu<Filter>
        className="absolute top-0 left-0 right-0"
        items={[
          { label: "My Apps", value: "my-apps" },
          { label: "Trending", value: "trending" },
        ]}
        currentItem={filter}
        onItemSelect={(f) => setFilter(f)}
      />

      <div className="mb-8" />

      {filteredApps.map((origin: Origin) => (
        <AppsRow
          key={origin.id}
          origin={origin}
          onSelect={() => selectApp(origin)}
        />
      ))}

      {filteredApps.length === 0 && !loading && <NoActivity />}

      <div ref={loaderRef}>{loading && <Skeleton />}</div>

      <SlidingPane shown={!!selectedApp} onHide={() => selectApp(undefined)}>
        {selectedApp && <AppsItem origin={selectedApp} />}
      </SlidingPane>
    </div>
  )
}

function AppsRow({
  origin,
  onSelect
}: {
  origin: Origin
  onSelect: () => void
}) {
  return (
    <div
      className={`p-2 h-[4rem] grid grid-cols-7 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700`}
      onClick={onSelect}>
      <Logo
        className="self-start mx-2 my-1 w-5 rounded-full"
        faviconFor={origin.domain}
      />
      <div className="col-span-6">
        <Text truncate>{originManager.originDisplay(origin)}</Text>
        <Text lines={2} size="xs" dimming="less">
          {origin.title} {originManager.url(origin)}
        </Text>
      </div>
    </div>
  )
}
