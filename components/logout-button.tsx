export function LogoutButton() {
  return <form action="/api/access/logout" method="post" className="shrink-0"><button className="whitespace-nowrap rounded-md px-1 py-1 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent" type="submit">Odjavi se</button></form>;
}
