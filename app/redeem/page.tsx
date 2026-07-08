'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/logo'

const DEMO_CODES = [
  { code: 'BAR-2026', role: 'Apoderado' },
  { code: 'MON-2026', role: 'Monitor' },
]

export default function RedeemPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const claimRes = await fetch('/api/v1/auth/claim-invite', { method: 'POST' })
      if (cancelled) return
      if (claimRes.ok) {
        const claimData = await claimRes.json()
        if (claimData.granted) {
          router.push('/admin')
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

      setCheckingAccess(false)
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/v1/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error?.message ?? 'Código no válido. Verifica e intenta nuevamente.')
      setLoading(false)
      return
    }

    if (data.role === 'ADMIN') router.push('/admin')
    else if (data.role === 'MONITOR') router.push(`/monitor/${data.tripId}`)
    else router.push(`/parent/${data.tripId}`)
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/ELEMENTOS DECORATIVOS/forma-1-azul.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-16 -z-10 w-[420px] max-w-none opacity-15 select-none"
      />
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <Logo variant="blanco" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white">Vincula tu gira</h1>
          <p className="text-slate-400 text-sm mt-1">
            Ingresa el código de acceso que te entregó el coordinador.
          </p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Código de gira</CardTitle>
            <CardDescription>Esto vincula tu cuenta con la gira correspondiente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ej. BAR-2026"
                  className="font-mono tracking-widest uppercase"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={!code.trim() || loading}>
                {loading ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Continuar <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/5 backdrop-blur">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Códigos de demo
            </p>
            <div className="space-y-2">
              {DEMO_CODES.map(({ code: c, role }) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCode(c)}
                  className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                >
                  <span className="font-mono text-xs bg-white/10 text-white px-2 py-1 rounded font-semibold">
                    {c}
                  </span>
                  <span className="text-slate-400 text-sm">{role}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
