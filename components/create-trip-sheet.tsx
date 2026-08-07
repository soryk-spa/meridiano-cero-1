"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { TripForm } from "@/components/trip-form"

const FORM_ID = "create-trip-sheet-form"

export function CreateTripSheet({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [formState, setFormState] = useState({ canSubmit: false, submitting: false })

  function handleSuccess() {
    setOpen(false)
    onCreated()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          <span className="hidden lg:inline">Nueva gira</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>Nueva gira</SheetTitle>
          <SheetDescription>
            Crea una gira y genera sus códigos de acceso para apoderados y monitor.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          <TripForm
            formId={FORM_ID}
            className="flex flex-col gap-4"
            onStateChange={setFormState}
            onSuccess={handleSuccess}
          />
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button type="submit" form={FORM_ID} className="w-full" disabled={!formState.canSubmit}>
            {formState.submitting ? "Creando…" : "Crear gira"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
