"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type DebugInfo = {
  requestedUrl?: string
  finalUrl?: string
  status?: number
  error?: string
  htmlLength?: number
  htmlPreview?: string
  selectorCounts?: Record<string, number>
  parsedSectionsCount?: number
  totalParsedLinks?: number
  sampleHeaders?: string[]
  sampleLinks?: { text: string; href: string }[]
  note?: string
}

export default function VegaDebugPopup({
  defaultOpen,
  debug,
}: {
  defaultOpen?: boolean
  debug?: DebugInfo | null
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const safePreview = useMemo(() => {
    if (!debug?.htmlPreview) return ""
    return (debug.htmlPreview || "").slice(0, 4000)
  }, [debug?.htmlPreview])

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* replaced DialogTrigger with an explicit button to avoid controlled/trigger mismatch */}
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Open Vega debug popup">
        Debug
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-3xl max-h-[80vh] overflow-auto z-[1000] bg-gray-900 text-gray-100 border border-gray-700"
          aria-label="Vega Debug Panel"
        >
          <DialogHeader>
            <DialogTitle className="text-pretty">Vega Debug Panel</DialogTitle>
          </DialogHeader>

          {!debug ? (
            <div className="text-sm">
              No debug data available. Add &debug=1 to the URL and reload to populate this panel.
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Requested URL</div>
                <div className="text-xs break-all">{debug.requestedUrl || "—"}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium">Final URL</div>
                  <div className="text-xs break-all">{debug.finalUrl || "—"}</div>
                </div>
                <div>
                  <div className="font-medium">Status</div>
                  <div className="text-xs">{typeof debug.status === "number" ? debug.status : "—"}</div>
                </div>
              </div>

              {debug.error ? (
                <div className="text-red-400">
                  <div className="font-medium">Error</div>
                  <div className="text-xs break-all">{debug.error}</div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium">HTML Length</div>
                  <div className="text-xs">{debug.htmlLength ?? "—"}</div>
                </div>
                <div>
                  <div className="font-medium">Parsed Sections</div>
                  <div className="text-xs">{debug.parsedSectionsCount ?? "—"}</div>
                </div>
              </div>

              {typeof debug.totalParsedLinks === "number" ? (
                <div>
                  <div className="font-medium">Total Parsed Links</div>
                  <div className="text-xs">{debug.totalParsedLinks}</div>
                </div>
              ) : null}

              {debug.selectorCounts ? (
                <div>
                  <div className="font-medium mb-1">Selector Counts</div>
                  <pre className="bg-black/40 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(debug.selectorCounts, null, 2)}
                  </pre>
                </div>
              ) : null}

              {Array.isArray(debug.sampleHeaders) && debug.sampleHeaders.length > 0 ? (
                <div>
                  <div className="font-medium mb-1">Sample Headers</div>
                  <pre className="bg-black/40 p-2 rounded text-xs overflow-auto whitespace-pre-wrap">
                    {debug.sampleHeaders.join("\n")}
                  </pre>
                </div>
              ) : null}

              {Array.isArray(debug.sampleLinks) && debug.sampleLinks.length > 0 ? (
                <div>
                  <div className="font-medium mb-1">Sample NextDrive Links</div>
                  <pre className="bg-black/40 p-2 rounded text-xs overflow-auto whitespace-pre-wrap">
                    {debug.sampleLinks.map((l) => `• ${l.text} -> ${l.href}`).join("\n")}
                  </pre>
                </div>
              ) : null}

              {safePreview ? (
                <div>
                  <div className="font-medium mb-1">HTML Preview (first 4000 chars, text)</div>
                  <pre className="bg-black/40 p-2 rounded text-xs overflow-auto whitespace-pre-wrap">{safePreview}</pre>
                </div>
              ) : null}

              {debug.note ? (
                <div>
                  <div className="font-medium mb-1">Notes</div>
                  <p className="text-xs whitespace-pre-wrap">{debug.note}</p>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
