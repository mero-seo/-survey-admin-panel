import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "../api/client";
import { isAxiosError } from "axios";

// Define the AuthUser type for type safety
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  organization?: string;
  isActive: boolean;
  accessToken: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        try {
          const { email, password } = credentials;
          const response = await apiClient.post("/auth/login", { email, password });

          if (response.data && response.data.data.user && response.data.data.accessToken) {
            const user = response.data.data.user;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              organization: user.organization,
              isActive: user.isActive,
              accessToken: response.data.data.accessToken,
            };
          }
          return null;
        } catch (error) {
          if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.message || "Invalid credentials");
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.accessToken = authUser.accessToken;
        token.role = authUser.role;
        token.name = authUser.name;
        token.email = authUser.email;
        token.id = authUser.id;
        token.organization = authUser.organization;
        token.isActive = authUser.isActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.accessToken = token.accessToken as string;
        session.user.role = token.role as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.id = token.id as string;
        session.user.organization = token.organization as string | undefined;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 