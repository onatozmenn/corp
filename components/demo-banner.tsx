"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ExternalLink } from "lucide-react"

export default function DemoBanner() {
  return (
    <Alert className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong className="text-amber-900">Demo Modu:</strong>
          <span className="text-amber-800 ml-2">
            Supabase yapılandırması gerekli. Environment variables'ları ekleyin.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-4 border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent"
          onClick={() => window.open("https://supabase.com/docs/guides/getting-started", "_blank")}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Supabase Docs
        </Button>
      </AlertDescription>
    </Alert>
  )
}
