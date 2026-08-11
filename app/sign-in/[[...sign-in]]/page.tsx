import { SignIn } from '@clerk/nextjs'
import { authAppearance } from '@/lib/clerk-appearance'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn appearance={authAppearance} />
    </div>
  )
}
