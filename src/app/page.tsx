export default function Home() {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold sm:text-3xl">madori-studio</h1>
      <p className="text-sm text-gray-600">
        Scaffold from <code className="rounded bg-gray-100 px-1.5 py-0.5">shohei_try/.tooling</code>.
        Edit <code className="rounded bg-gray-100 px-1.5 py-0.5">src/app/page.tsx</code> to get started.
      </p>
      <p className="text-xs text-gray-400">Next.js 14 + TypeScript + Tailwind</p>
    </main>
  );
}
