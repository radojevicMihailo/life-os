export function LogoutButton() {
  return <form action="/api/access/logout" method="post"><button className="rounded-md px-2 py-1 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent" type="submit">Odjavi se</button></form>;
}
