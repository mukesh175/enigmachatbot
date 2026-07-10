import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { clients, teamMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Check the account owner (clients table) first — always role "admin"
        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.email, credentials.email))
          .limit(1);

        if (client && client.isActive) {
          const isValid = await bcrypt.compare(credentials.password, client.passwordHash);
          if (isValid) {
            return {
              id: client.id,
              email: client.email,
              name: client.name,
              plan: client.plan,
              clientId: client.id, // tenant scope
              role: "admin",
            } as any;
          }
        }

        // Fall back to invited team members
        const [member] = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.email, credentials.email))
          .limit(1);

        if (member) {
          const isValid = await bcrypt.compare(credentials.password, member.passwordHash);
          if (isValid) {
            return {
              id: member.id,
              email: member.email,
              name: member.name,
              clientId: member.clientId, // tenant scope = the org they were invited to
              role: member.role,
            } as any;
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.clientId = (user as any).clientId;
        token.role = (user as any).role;
        token.plan = (user as any).plan;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).clientId = token.clientId;
        (session.user as any).role = token.role;
        (session.user as any).plan = token.plan;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
