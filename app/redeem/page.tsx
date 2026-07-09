'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Ticket } from 'lucide-react'

export default function RedeemPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'no-access'>('checking')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const claimRes = await fetch('/api/v1/auth/claim-invite', { method: 'POST' })
      if (cancelled) return
      if (claimRes.ok) {
        const claimData = await claimRes.json()
        if (claimData.granted) {
          router.push('/')
          return
        }
      }

      const meRes = await fetch('/api/v1/me/trips')
      if (cancelled) return
      if (meRes.ok) {
        const me = await meRes.json()
        if (me.isAdmin || me.memberships.length > 0) {
          router.push('/')
          return
        }
      }

      setStatus('no-access')
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/10">
          <Ticket className="text-white" size={24} />
        </div>
        {status === 'checking' ? (
          <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
        ) : (
          <div className="space-y-2">
            <AlertCircle className="mx-auto text-white/70" size={28} />
            <h1 className="text-xl font-semibold text-white">Sin acceso todavía</h1>
            <p className="text-slate-400 text-sm">
              Tu cuenta no tiene acceso a la plataforma. Pide a un administrador que te invite.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
