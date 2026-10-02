import { listVendors } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Vendors() {
  const all = await listVendors(undefined, true);
  return (
    <>
      <h1>Vendors</h1>
      <p className="muted">Seeded from the ARN directory (security vendors excluded). Only vendors with a verified config are scraped.</p>
      <table>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {all.map((v) => (
            <tr key={v.slug}>
              <td>{v.name}</td>
              <td>{v.category}</td>
              <td>{v.enabled ? "Active" : "Pending config"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
