import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    roles?: string[];
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      roles: string[];
    } & Session["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: string[];
    sessionVersion?: number;
  }
}
