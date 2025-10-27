import DashboardCharts from "../components/dashboard/DashboardCharts";
export default function Home() {
  return (
    <div className="container-fluid py-3">
      <h1 className="h4 mb-4">Dashboard</h1>
      <DashboardCharts />
    </div>
  );
}
