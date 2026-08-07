'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPinPlusIcon } from 'lucide-react'
import type { Trip } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TripForm } from '@/components/trip-form'

const FORM_ID = 'new-trip-form'

export default function NewTripPage() {
  const router = useRouter()
  const [formState, setFormState] = useState({ canSubmit: false, submitting: false })

  function handleSuccess(trip: Trip) {
    router.push(`/admin/trips/${trip.id}`)
  }

  return (
    <>
      <SiteHeader title="Nueva gira" subtitle="Crea una gira y genera sus códigos de acceso" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card className="mx-auto w-full max-w-4xl">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <MapPinPlusIcon size={18} />
              </span>
              <div>
                <p className="font-semibold">Detalles de la gira</p>
                <p className="text-sm text-muted-foreground">
                  Estos datos quedarán disponibles para apoderados y monitores.
                </p>
              </div>
            </div>

            <TripForm
              formId={FORM_ID}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              onStateChange={setFormState}
              onSuccess={handleSuccess}
            />

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/trips">Cancelar</Link>
              </Button>
              <Button type="submit" form={FORM_ID} disabled={!formState.canSubmit}>
                {formState.submitting ? 'Creando…' : 'Crear gira'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
