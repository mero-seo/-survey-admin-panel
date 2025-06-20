import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "../api/client";

// Define the AuthUser type for type safety
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  accessToken: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const response = await apiClient.post('/api/v1/auth/login', credentials);
          if (response.data && response.data.user && response.data.accessToken) {
            return {
              ...response.data.user,
              accessToken: response.data.accessToken,
            } as AuthUser;
          }
          return null;
        } catch {
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).accessToken = (user as AuthUser).accessToken;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).role = (user as AuthUser).role;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).accessToken = (token as any).accessToken;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).role = (token as any).role;
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
  }
}; 