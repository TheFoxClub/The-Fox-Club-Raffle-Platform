import Footer from "./reusable/Footer";
import { Header } from "./reusable/Header";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="page-wrapper flex flex-col min-h-screen">
      <Header />
      <main className="page-content flex-1">{children}</main>
      <Footer />
    </div>
  );
}
