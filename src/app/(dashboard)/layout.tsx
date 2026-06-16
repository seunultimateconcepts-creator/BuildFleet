import { ReactNode } from "react";
import Sidebar from "../../components/dashboard/sidebar";
import Header from "../../components/dashboard/header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0A0C14] transition-colors duration-200">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main content — offset by sidebar width */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Sticky header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto bg-[#F7F8FC] dark:bg-[#0A0C14] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}