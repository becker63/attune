import type { DispatchItem } from "@attune/dispatch-schema"

export const renderDispatchJsonFeed = (
  items: ReadonlyArray<DispatchItem>,
): string =>
  JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: "Attune Dispatch",
      home_page_url: "/dispatch",
      feed_url: "/feeds/dispatch.json",
      items: items.map((item) => ({
        id: item.id,
        url: item.refs[0]?.href ?? `/dispatch/threads/${item.threadId}`,
        title: item.title,
        summary: item.summary,
        content_text: item.body,
        date_published: item.occurredAt,
        tags: item.tags,
      })),
    },
    null,
    2,
  )

export const renderDispatchRssFeed = (
  items: ReadonlyArray<DispatchItem>,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Attune Dispatch</title>
    <link>/dispatch</link>
    <description>A calm event river for autonomous Attune work.</description>
${items.map(renderRssItem).join("\n")}
  </channel>
</rss>
`

export const renderDispatchAtomFeed = (
  items: ReadonlyArray<DispatchItem>,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Attune Dispatch</title>
  <id>attune-dispatch</id>
  <updated>${escapeXml(items[0]?.occurredAt ?? new Date(0).toISOString())}</updated>
${items.map(renderAtomEntry).join("\n")}
</feed>
`

export const selectReviewFeedItems = (
  items: ReadonlyArray<DispatchItem>,
): ReadonlyArray<DispatchItem> => items.filter((item) => item.requiresHuman)

export const selectSafetyFeedItems = (
  items: ReadonlyArray<DispatchItem>,
): ReadonlyArray<DispatchItem> =>
  items.filter((item) => item.severity === "safety")

export const selectFailureFeedItems = (
  items: ReadonlyArray<DispatchItem>,
): ReadonlyArray<DispatchItem> =>
  items.filter((item) => item.severity === "failure")

const renderRssItem = (item: DispatchItem): string => `    <item>
      <guid>${escapeXml(item.id)}</guid>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.refs[0]?.href ?? `/dispatch/threads/${item.threadId}`)}</link>
      <description>${escapeXml(item.summary)}</description>
      <pubDate>${escapeXml(new Date(item.occurredAt).toUTCString())}</pubDate>
    </item>`

const renderAtomEntry = (item: DispatchItem): string => `  <entry>
    <id>${escapeXml(item.id)}</id>
    <title>${escapeXml(item.title)}</title>
    <updated>${escapeXml(item.occurredAt)}</updated>
    <summary>${escapeXml(item.summary)}</summary>
    <link href="${escapeXml(item.refs[0]?.href ?? `/dispatch/threads/${item.threadId}`)}" />
  </entry>`

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
