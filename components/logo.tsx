const LOGO_SRC = {
  naranja: "/branding/LOGOS/logo-meridiano-naranja.svg",
  gris: "/branding/LOGOS/logo-meridiano-gris.svg",
  blanco: "/branding/LOGOS/logo-meridiano-blanco.svg",
} as const

export function Logo({
  variant,
  className,
}: {
  variant: keyof typeof LOGO_SRC
  className?: string
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_SRC[variant]} alt="Meridiano Cero" className={className} />
}
