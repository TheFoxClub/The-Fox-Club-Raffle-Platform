import {Header} from "./reusable/Header";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-content">{children}</main>
    </div>
  );
}
