import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "注册 · Aivestor" };

export default function RegisterPage() {
  return <RegisterForm />;
}
