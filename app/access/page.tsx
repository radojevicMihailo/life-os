import { configuredAccessPassword } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = Boolean(configuredAccessPassword());
  return (
    <div className="mx-auto mt-12 max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Prijava u Life OS</h1>
      <p className="mt-2 text-sm text-muted-foreground">Unesi pristupnu lozinku. Prijava važi 30 dana na ovom uređaju.</p>
      {!configured ? <p className="mt-4 text-sm text-destructive">Pristupna lozinka nije podešena na serveru.</p> : null}
      {error ? <p className="mt-4 text-sm text-destructive" role="alert">Lozinka nije ispravna.</p> : null}
      <form action="/api/access/login" method="post" className="mt-6 space-y-4">
        <label className="block text-sm font-medium" htmlFor="access-password">Lozinka</label>
        <input autoComplete="current-password" autoFocus className="w-full rounded-md border bg-background px-3 py-2" id="access-password" name="password" required type="password" />
        <button className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50" disabled={!configured} type="submit">Prijavi se</button>
      </form>
    </div>
  );
}
