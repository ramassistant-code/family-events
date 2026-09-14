import type { NextAuthConfig } from "next-auth";

export const authConfig = {
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
