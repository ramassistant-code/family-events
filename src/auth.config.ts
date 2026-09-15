import type { NextAuthConfig } from "next-auth";

/** AUTH_SECRET must be passed explicitly so Edge middleware can sign/verify JWTs. */
export function resolveAuthSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is required in production. Set AUTH_SECRET in the environment.",
    );
  }
  return undefined;
}

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? resolveAuthSecret(),
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/api/auth") || pathname === "/login") {
        return true;
      }
      return !!auth;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isSystemAdmin = Boolean(
          (user as { isSystemAdmin?: boolean }).isSystemAdmin,
        );
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.isSystemAdmin = Boolean(token.isSystemAdmin);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
