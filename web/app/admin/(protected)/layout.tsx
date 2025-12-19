import type { ReactNode } from "react";

import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";

import { requireAdminUser } from "@/lib/auth/admin";
import { Button } from "@/components/ui/button";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const ADMIN_NAV_LINKS = [
  { href: "/admin/orders", label: "訂單管理" },
  { href: "/admin/enrollments", label: "學員堂數管理" },
];

export const metadata: Metadata = {
  title: "Admin Console",
  description: "LetsPlay 後台",
};

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { appUser } = await requireAdminUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-l font-semibold tracking-tight text-foreground">
              Let’s Play 管理後台
            </p>
          </div>
          <nav aria-label="Admin navigation" className="w-full sm:w-auto">
            <NavigationMenu>
              <NavigationMenuList className="flex flex-wrap justify-end gap-4">
                {ADMIN_NAV_LINKS.map((link) => (
                  <NavigationMenuItem key={link.href}>
                    <NavigationMenuLink
                      asChild
                      className={navigationMenuTriggerStyle()}
                    >
                      <Link
                        href={link.href}
                        className="inline-flex text-foreground transition hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  {/* <div className="text-right text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {appUser.display_name}
                    </p>
                    <p className="text-xs">{appUser.email ?? "未提供 email"}</p>
                  </div> */}
                  <form action="/admin/logout" method="post">
                    <Button variant="outline" size="sm">
                      登出
                    </Button>
                  </form>
                </div>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
