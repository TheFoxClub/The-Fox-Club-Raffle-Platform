import { Header } from "./reusable/Header";
import SocketStatus from "./ui/SocketStatus";
import SocketDebug from "./ui/SocketDebug";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-content">{children}</main>
      <SocketStatus />
      {/* {process.env.NODE_ENV === 'development' && <SocketDebug />} */}
      {import.meta.env.VITE_MODE === "development" && <SocketDebug />}
    </div>
  );
}
