import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

async function getDevices() {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase
    .from("devices")
    .select("id, status, firmware_version, target_firmware_version, hardware_revision, last_seen_at, last_sync_at, claimed_at, claimed_by_user_id")
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    unclaimed: "bg-gray-100 text-gray-600",
    disabled: "bg-red-100 text-red-700",
    lost: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={"text-xs font-medium px-2 py-0.5 rounded " + (colours[status] ?? "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function DashboardPage() {
  const devices = await getDevices();

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Caeorta Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Internal dashboard — founder access only</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total devices</p>
          <p className="text-3xl font-semibold mt-1">{devices.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
          <p className="text-3xl font-semibold mt-1 text-green-700">
            {devices.filter(d => d.status === "active").length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Unclaimed</p>
          <p className="text-3xl font-semibold mt-1 text-gray-500">
            {devices.filter(d => d.status === "unclaimed").length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Disabled / Lost</p>
          <p className="text-3xl font-semibold mt-1 text-red-600">
            {devices.filter(d => ["disabled","lost"].includes(d.status)).length}
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Device ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Firmware</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Hardware</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last seen</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last sync</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Claimed</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {devices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No devices found
                </td>
              </tr>
            )}
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  <a href={`/devices/${device.id}`} className="hover:underline text-blue-600">
                    {device.id.slice(0, 8)}...
                  </a>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {device.firmware_version ?? "—"}
                  {device.target_firmware_version && device.target_firmware_version !== device.firmware_version && (
                    <span className="ml-1 text-orange-600">→ {device.target_firmware_version}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{device.hardware_revision ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmt(device.last_seen_at)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmt(device.last_sync_at)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmt(device.claimed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
