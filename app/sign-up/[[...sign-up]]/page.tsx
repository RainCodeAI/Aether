import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0C]">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.08) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
            <span className="text-black font-bold text-sm">A</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-100">
            Aether
          </span>
        </div>
        <SignUp />
      </div>
    </main>
  )
}
