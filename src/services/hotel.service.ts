
import type { Hotel } from "../data/supplierA";

export function getBestHotelOffers(
  supplierA: Hotel[],
  supplierB: Hotel[]
) {
  const bestHotels = new Map<string, Hotel & { supplier: string }>();

  const allHotels = [
    ...supplierA.map(h => ({ ...h, supplier: "Supplier A" })),
    ...supplierB.map(h => ({ ...h, supplier: "Supplier B" }))
  ];

  for (const hotel of allHotels) {
    const name = hotel.name.trim().toLowerCase();
    const existing = bestHotels.get(name);

    if (!existing || hotel.price < existing.price) {
      bestHotels.set(name, hotel);
    }
  }

  return Array.from(bestHotels.values()).map(
    ({ name, price, supplier, commissionPct }) => ({
      name,
      price,
      supplier,
      commissionPct
    })
  );
}
