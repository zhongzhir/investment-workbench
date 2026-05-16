import {
  getServerSession as nextGetServerSession,
  type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  image_url: string | null;
}

// GitHub OAuth 为可选项：仅当配置了 Client ID/Secret 时才启用。
const githubEnabled =
  !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const rows = await query<DbUser>(
          "SELECT id, email, name, password_hash, image_url FROM users WHERE email = $1",
          [credentials.email.toLowerCase().trim()]
        );
        const user = rows[0];
        if (!user || !user.password_hash) return null;

        const ok = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image_url,
        };
      },
    }),
    ...(githubEnabled
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    // GitHub 登录：users 表是唯一存储，登录时按邮箱 upsert。
    async signIn({ user, account }) {
      if (account?.provider !== "github") return true;
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      await query(
        `INSERT INTO users (email, name, auth_provider, image_url)
         VALUES ($1, $2, 'github', $3)
         ON CONFLICT (email) DO UPDATE SET image_url = EXCLUDED.image_url`,
        [email, user.name ?? email, user.image ?? null]
      );
      return true;
    },
    // 首次登录时把数据库用户 id 写入 JWT。
    async jwt({ token, user }) {
      if (user) {
        const email = (user.email ?? token.email)?.toLowerCase().trim();
        if (email) {
          const rows = await query<{ id: string }>(
            "SELECT id FROM users WHERE email = $1",
            [email]
          );
          if (rows[0]) token.uid = rows[0].id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
};

// 服务端组件/路由中获取会话
export function getSession() {
  return nextGetServerSession(authOptions);
}

// 路由保护：未登录则重定向到登录页（用于服务端组件）
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
