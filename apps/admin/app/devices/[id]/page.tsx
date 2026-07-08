import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function SevBadge({ sev }: { sev: string }) {
  const c: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-green-100 text-green-700",
  };
  return <span className={"text-xs font-medium px-2 py-0.5 rounded " + (c[sev] ?? "bg-gray-100 text-gray-600")}>{sev}</span>;
}

async function getData(id: string) {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [deviceRes, vehicleRes] = await Promise.all([
    supabase.from("devices").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("id, make, model, year, nickname, owner_user_id").eq("device_id", id).single(),
  ]);

  if (deviceRes.error || !deviceRes.data) return null;

  const vehicle = vehicleRes.data;
  let drives: any[] = [];
  let dtcs: any[] = [];

  if (vehicle) {
    const [drivesRes, dtcsRes] = await Promise.all([
      supabase.from("drives")
        .select("id, started_at, ended_at, duration_seconds, peak_metrics, has_anomaly")
        .eq("vehicle_id", vehicle.id)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase.from("dtcs")
        .select("id, code, description, severity_raw, is_active, first_seen_at, last_seen_at, cleared_at")
        .eq("vehicle_id", vehicle.id)
        .order("last_seen_at", { ascending: false })
        .limit(50),
    ]);
    drives = drivesRes.data ?? [];
    dtcs = dtcsRes.data ?? [];
  }

  return { device: deviceRes.data, vehicle, drives, dtcs };
}

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();

  const { device, vehicle, drives, dtcs } = data;

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">Back to devices</a>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Device detail</h1>
        <p className="text-sm text-gray-500 font-mono mt-1">{device.id}</p>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Device</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="font-medium">{device.status}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Firmware</dt><dd className="font-mono">{device.firmware_version ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Hardware</dt><dd className="font-mono">{device.hardware_revision ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Last seen</dt><dd>{fmt(device.last_seen_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Last sync</dt><dd>{fmt(device.last_sync_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Claimed</dt><dd>{fmt(device.claimed_at)}</dd></div>
          </dl>
        </div>
        <div className="border rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Vehicle</p>
          {vehicle ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{vehicle.nickname}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Make / Model</dt><dd>{vehicle.make} {vehicle.model}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Year</dt><dd>{vehicle.year}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Vehicle ID</dt><dd className="font-mono text-xs">{vehicle.id.slice(0,8)}...</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-gray-400">No vehicle registered</p>
          )}
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Drives <span className="text-sm font-normal text-gray-400">({drives.length} most recent)</span></h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Started</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Peak RPM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Peak boost</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Anomaly</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drives.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No drives yet</td></tr>
              )}
              {drives.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(d.started_at)}</td>
                  <td className="px-4 py-3 text-xs">{fmtDuration(d.duration_seconds)}</td>
                  <td className="px-4 py-3 text-xs font-mono">{d.peak_metrics?.rpm ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono">{d.peak_metrics?.boost_pressure ?? "—"}</td>
                  <td className="px-4 py-3">
                    {d.has_anomaly ? <span className="text-xs text-red-600 font-medium">Yes</span> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">DTC timeline <span className="text-sm font-normal text-gray-400">({dtcs.length} codes)</span></h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">First seen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last seen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cleared</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dtcs.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No DTCs recorded</td></tr>
              )}
              {dtcs.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{d.code}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{d.description ?? "—"}</td>
                  <td className="px-4 py-3">{d.severity_raw ? <SevBadge sev={d.severity_raw} /> : <span className="text-xs text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">
                    {d.is_active
                      ? <span className="text-xs font-medium text-red-600">Active</span>
                      : <span className="text-xs text-gray-400">Cleared</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(d.first_seen_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(d.last_seen_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(d.cleared_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
