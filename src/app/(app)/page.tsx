import { redirect } from "next/navigation";

// 根路径重定向到 /dashboard，统一首页入口。
export default function RootRedirect() {
  redirect("/dashboard");
}
