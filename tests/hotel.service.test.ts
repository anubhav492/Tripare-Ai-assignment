import assert from "node:assert/strict";
import test from "node:test";
import type { Hotel } from "../src/data/supplierA";
import { getBestHotelOffers } from "../dist/services/hotel.service.js";

const hotel = (name: string, price: number): Hotel => ({
  hotelId: name,
  name,
  price,
  city: "delhi",
  commissionPct: 10,
});

test("keeps unique hotels from both suppliers", () => {
  const result = getBestHotelOffers(
    [hotel("Alpha", 1000)],
    [hotel("Beta", 1200)]
  );

  assert.deepEqual(result, [
    { name: "Alpha", price: 1000, supplier: "Supplier A", commissionPct: 10 },
    { name: "Beta", price: 1200, supplier: "Supplier B", commissionPct: 10 },
  ]);
});

test("selects the lower-priced duplicate hotel", () => {
  const result = getBestHotelOffers(
    [hotel("Alpha", 1200)],
    [hotel("Alpha", 1000)]
  );

  assert.deepEqual(result, [
    { name: "Alpha", price: 1000, supplier: "Supplier B", commissionPct: 10 },
  ]);
});

test("keeps the first supplier when duplicate prices are equal", () => {
  const result = getBestHotelOffers(
    [hotel("Alpha", 1000)],
    [hotel("Alpha", 1000)]
  );

  assert.equal(result[0]?.supplier, "Supplier A");
});

test("deduplicates hotel names case-insensitively", () => {
  const result = getBestHotelOffers(
    [hotel("  Alpha  ", 1200)],
    [hotel("alpha", 1000)]
  );

  assert.equal(result.length, 1);
  assert.equal(result[0]?.price, 1000);
});

test("returns an empty list for empty supplier responses", () => {
  assert.deepEqual(getBestHotelOffers([], []), []);
});

test("preserves hotels when either supplier is empty", () => {
  assert.equal(getBestHotelOffers([hotel("Alpha", 1000)], [])[0]?.supplier, "Supplier A");
  assert.equal(getBestHotelOffers([], [hotel("Beta", 1200)])[0]?.supplier, "Supplier B");
});

test("handles repeated names within a supplier and preserves the winning commission", () => {
  assert.deepEqual(getBestHotelOffers(
    [hotel("Alpha", 1500), hotel(" alpha ", 1200)],
    [{ ...hotel("ALPHA", 1000), commissionPct: 20 }]
  ), [{ name: "ALPHA", price: 1000, supplier: "Supplier B", commissionPct: 20 }]);
});
