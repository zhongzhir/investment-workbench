import { withAuth } from "next-auth/middleware";

// 保护需登录访问的路由；未登录用户重定向到 /login。
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/projects/:path*",
    "/knowledge/:path*",
    "/archive/:path*",
    "/settings/:path*",
  ],
};
