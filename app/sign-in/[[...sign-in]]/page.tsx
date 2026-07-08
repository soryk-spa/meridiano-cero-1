import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/ELEMENTOS DECORATIVOS/MANCHA-MORADA.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 -z-10 w-[600px] max-w-none opacity-10 blur-3xl select-none"
      />
      <SignIn
        appearance={{
          options: {
            logoImageUrl: '/branding/LOGOS/logo-meridiano-naranja.svg',
            logoPlacement: 'inside',
          },
          variables: {
            colorBackground: "var(--color-card)",
            colorPrimary: "var(--color-primary)",
            borderRadius: "0.5rem",
          },
          elements: {
            card: "border border-border bg-card text-card-foreground shadow-sm",
            headerTitle: "text-card-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "border-border bg-background text-foreground",
            formFieldInput: "border-input bg-background text-foreground",
            footerActionText: "text-muted-foreground",
            footerActionLink: "text-foreground",
          },
        }}
      />
    </div>
  )
}
