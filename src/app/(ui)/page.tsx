import DriverMonitor from "@/components/DriverMonitor";
import { MonitoringProvider } from "@/contexts/MonitoringContext";

export default function Home() {
  return (
    <MonitoringProvider>
      <main className="h-screen p-8 bg-gray-100">
        <DriverMonitor />
      </main>
    </MonitoringProvider>
  );
}
