import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAdmin } from "@/lib/auth/admin";
import { GoogleSignInButton } from "./google-sign-in-button";

type AdminLoginPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const resolveErrorMessage = (
  params?: Record<string, string | string[] | undefined>
) => {
  const error = params?.error;
  if (!error) {
    return null;
  }

  const normalized = Array.isArray(error) ? error[0] : error;
  if (normalized === "not-authorized") {
    return "此帳號尚未被授權為管理員";
  }

  return "登入失敗，請稍後再試";
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const identity = await getAuthenticatedAdmin();
  if (
    identity &&
    identity.appUser.role === "ADMIN" &&
    identity.appUser.status === "ACTIVE"
  ) {
    redirect("/admin/orders");
  }

  const resolvedParams = await searchParams;
  const errorMessage = resolveErrorMessage(resolvedParams);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/70 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold">
            LetsPlay 管理後台
          </CardTitle>
          <CardDescription>
            請使用授權的 Google 帳號登入以管理訂單與學員。
          </CardDescription>
        </CardHeader>
        <CardContent className="my-4 space-y-4">
          {errorMessage && (
            <p className="text-sm text-center text-destructive">
              {errorMessage}
            </p>
          )}
          <GoogleSignInButton />
          <p className="text-xs text-muted-foreground text-center">
            新增管理員請聯絡開發人員：info@dropout.tw
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
