import type { DefaultSession } from "next-auth";

// 扩展 Session.user，加入数据库用户 id。
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
  }
}
