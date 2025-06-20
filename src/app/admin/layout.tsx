import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";

const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Redirect to login if not authenticated
    redirect("/login");
  }

  const userRole = session.user.role;

  if (!allowedRoles.includes(userRole)) {
    // If the user's role is not allowed, show an access denied message
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Access Denied</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  // If the role is allowed, render the admin pages
  return <>{children}</>;
} 