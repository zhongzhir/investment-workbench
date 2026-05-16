import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// 应用主外壳：侧栏 + 顶栏。包裹所有需登录后访问的页面。
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
      </div>
      <ServiceWorkerRegister />
    </div>
  );
}
