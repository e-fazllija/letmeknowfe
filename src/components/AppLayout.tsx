import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <aside
          className="col-12 col-md-3 col-lg-2 bg-dark text-white p-3 position-sticky"
          style={{ top: 0, height: "100vh", overflowY: "auto" }}
        >
          <Sidebar />
        </aside>

        <main className="col-12 col-md-9 col-lg-10 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
