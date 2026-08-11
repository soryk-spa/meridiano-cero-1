import Link from "next/link"
import { Activity, ArrowRightIcon, Radio, Ticket } from "lucide-react"

import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  activeTripCount: number
  codeCount: number
  monitorCount: number
}

export function SectionCards({ activeTripCount, codeCount, monitorCount }: SectionCardsProps) {
  const cards = [
    {
      Icon: Activity,
      label: "Grupos activos",
      value: activeTripCount,
      detail: "Operación del mes",
      footer: "Grupos con seguimiento activo",
      href: "/admin/trips",
    },
    {
      Icon: Ticket,
      label: "Códigos emitidos",
      value: codeCount,
      detail: "Accesos disponibles",
      footer: "Códigos de apoderado y coordinador",
      href: "/admin/codes",
    },
    {
      Icon: Radio,
      label: "Coordinadores",
      value: monitorCount,
      detail: "Equipo en terreno",
      footer: "Usuarios habilitados para reportar",
      href: "/admin/team?tab=monitors",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
      {cards.map(({ Icon, label, value, detail, footer, href }) => (
        <Link key={label} href={href} className="group">
          <Card className="min-h-[204px] overflow-hidden bg-gradient-to-b from-card to-muted/30 transition-colors group-hover:border-brand-orange/50">
            <CardHeader className="space-y-0 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <Icon size={17} />
                  </div>
                  <CardDescription>{label}</CardDescription>
                </div>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-orange" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-semibold tracking-tight tabular-nums">
                {value}
              </CardTitle>
              <div className="mt-8 space-y-2">
                <p className="text-sm font-medium">{detail}</p>
                <p className="text-sm text-muted-foreground">{footer}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
