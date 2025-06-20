import "next-auth";
import { AuthUser } from "../auth/options";

declare module "next-auth" {
  interface Session {
    user: AuthUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends AuthUser {
    accessToken: string;
    role: string;
    name: string;
    email: string;
    id: string;
    organization: string | undefined;
    isActive: boolean;
  }
} 