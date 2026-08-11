/** Shared <SignIn/> styling. Sistema cerrado: sin auto-registro, así que el prompt "¿No tienes cuenta?" queda oculto. */
export const authAppearance = {
  variables: {
    colorBackground: 'var(--color-card)',
    colorPrimary: 'var(--color-primary)',
    borderRadius: '0.5rem',
  },
  elements: {
    card: 'border border-border bg-card text-card-foreground shadow-sm',
    headerTitle: 'text-card-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButton: 'border-border bg-background text-foreground',
    formFieldInput: 'border-input bg-background text-foreground',
    // A plain "hidden" className loses to Clerk's own internal stylesheet (same
    // specificity, later in the cascade), so this has to go through Clerk's
    // style-object form instead, which it applies with the right precedence.
    footerAction: { display: 'none' },
  },
}
