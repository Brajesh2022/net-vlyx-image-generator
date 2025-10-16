"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

type DebugData = {
  requestedUrl?: string
  fetched?: boolean
  finalUrl?: string
  status?: number
  proxyUsed?: string | null
  attempts?: Array<{
    viaProxy?: string | null
    fetchUrl: string
    status?: number
    ok?: boolean
    error?: string
    finalUrl?: string
    redirected?: boolean
  }>
  htmlSnippet?: string
  reasonNoServers?: string
  episodesFound?: number
  anchorsFound?: number
  selectorCounts?: Record<string, number>
  sampleHeaders?: string[]
  sampleLinks?: { text: string; href: string }[]
  htmlLength?: number
}

export function VlyxDriveDebugPopup({
  debugFetcher,
}: {
  debugFetcher: () => Promise<DebugData>
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<DebugData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const runDebug = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const d = await debugFetcher()
      setData(d)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 right-4 z-50 bg-transparent">
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>VlyxDrive Debug</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={runDebug} disabled={loading} size="sm">
              {loading ? "Running…" : "Run diagnostics"}
            </Button>
          </div>

          {error && <div className="text-sm text-red-600">Error: {error}</div>}

          {data && (
            <ScrollArea className="h-[520px] rounded border p-3">
              <div className="text-sm space-y-2">
                <div>
                  <strong>Requested URL:</strong> {data.requestedUrl || "-"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong>Fetched:</strong> {String(!!data.fetched)}
                  </div>
                  <div>
                    <strong>Status:</strong> {data.status ?? "-"}
                  </div>
                  <div>
                    <strong>Final URL:</strong> {data.finalUrl || "-"}
                  </div>
                  <div>
                    <strong>Proxy Used:</strong> {data.proxyUsed || "-"}
                  </div>
                  <div>
                    <strong>Episodes Found:</strong> {data.episodesFound ?? 0}
                  </div>
                  <div>
                    <strong>Anchors Found:</strong> {data.anchorsFound ?? 0}
                  </div>
                  <div>
                    <strong>HTML Length:</strong>{" "}
                    {typeof data.htmlLength === "number"
                      ? data.htmlLength
                      : data.htmlSnippet
                        ? data.htmlSnippet.length
                        : "-"}
                  </div>
                  <div>
                    <strong>Attempts:</strong> {Array.isArray(data.attempts) ? data.attempts.length : 0}
                  </div>
                </div>

                {data.reasonNoServers && (
                  <div className="text-amber-600">
                    <strong>Reason (no servers):</strong> {data.reasonNoServers}
                  </div>
                )}

                {data.selectorCounts && (
                  <div>
                    <div className="font-medium">Selector Counts</div>
                    <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                      {JSON.stringify(data.selectorCounts, null, 2)}
                    </pre>
                  </div>
                )}

                {data.sampleHeaders && data.sampleHeaders.length > 0 && (
                  <div>
                    <div className="font-medium">Sample Headers</div>
                    <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                      {data.sampleHeaders.join("\n")}
                    </pre>
                  </div>
                )}

                {data.sampleLinks && data.sampleLinks.length > 0 && (
                  <div>
                    <div className="font-medium">Sample Links</div>
                    <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                      {data.sampleLinks.map((l) => `• ${l.text} -> ${l.href}`).join("\n")}
                    </pre>
                  </div>
                )}

                {data.attempts && data.attempts.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium">Fetch Attempts</div>
                    <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                      {JSON.stringify(data.attempts, null, 2)}
                    </pre>
                  </div>
                )}

                {data.htmlSnippet && (
                  <div className="space-y-1">
                    <div className="font-medium">HTML Snippet (first 4000 chars)</div>
                    <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">{data.htmlSnippet}</pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
