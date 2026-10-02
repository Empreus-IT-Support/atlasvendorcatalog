import { searchProducts } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; vendor?: string }> }) {
  const { q, vendor } = await searchParams;
  const products = await searchProducts({ q, vendor, limit: 100 });

  return (
    <>
      <h1>Products</h1>
      <form>
        <input name="q" defaultValue={q} placeholder="Search name or SKU" />
        <input name="vendor" defaultValue={vendor} placeholder="Vendor slug (hp, dell)" />
        <button>Search</button>
      </form>
      <p className="muted">{products.length} shown</p>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Product</th>
            <th>SKU / MPN</th>
            <th className="hide-sm">Key specs</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const img = p.images?.[0]?.url ?? p.image_urls[0];
            return (
              <tr key={p.source_url}>
                <td>{img && /* eslint-disable-next-line @next/next/no-img-element */ <img className="thumb" src={img} alt="" loading="lazy" />}</td>
                <td>
                  <a href={p.source_url} target="_blank" rel="noreferrer">{p.name}</a>
                  <div className="muted">{p.vendor}</div>
                </td>
                <td>
                  {p.sku ?? "-"}
                  {p.mpn && p.mpn !== p.sku ? <div className="muted">{p.mpn}</div> : null}
                </td>
                <td className="hide-sm">
                  {Object.entries(p.specs).slice(0, 5).map(([k, v]) => (
                    <span className="chip" key={k}>{k}: {v.slice(0, 40)}</span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
