import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Every tenant-scoped query/mutation should go through this.
 * Throws if not authenticated — callers should catch and return 401.
 */
export async function requireClientId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const clientId = (session?.user as any)?.clientId;

  if (!clientId) {
    throw new Error("UNAUTHORIZED");
  }

  return clientId as string;
}

/**
 * Returns both the tenant scope and the caller's role ("admin" | "member").
 * Use requireAdmin() to guard destructive/management actions.
 */
export async function requireSession(): Promise<{ clientId: string; role: string }> {
  const session = await getServerSession(authOptions);
  const clientId = (session?.user as any)?.clientId;
  const role = (session?.user as any)?.role;

  if (!clientId) {
    throw new Error("UNAUTHORIZED");
  }

  return { clientId, role: role || "member" };
}

export async function requireAdmin(): Promise<string> {
  const { clientId, role } = await requireSession();
  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return clientId;
}
