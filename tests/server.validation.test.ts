import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test, { after, before } from "node:test";
import { app, parseHotelQuery } from "../dist/server.js";

let server: Server;
let baseUrl: string;

before(async () => {
  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

test("both suppliers return the required fields, filter cities, and handle empty results", async () => {
  for (const supplier of ["supplierA", "supplierB"]) {
    const delhi = await get(`/${supplier}/hotels?city=%20Delhi%20`);
    assert.equal(delhi.status, 200);
    assert.ok(Array.isArray(delhi.body));
    assert.equal(delhi.body.length, 3);
    for (const hotel of delhi.body) {
      assert.deepEqual(Object.keys(hotel).sort(), ["hotelId", "name", "price", "city", "commissionPct"].sort());
      assert.equal(hotel.city, "delhi");
      assert.equal(typeof hotel.hotelId, "string");
      assert.equal(typeof hotel.name, "string");
      assert.equal(typeof hotel.price, "number");
      assert.equal(typeof hotel.commissionPct, "number");
    }

    const mumbai = await get(`/${supplier}/hotels?city=mumbai`);
    assert.equal(mumbai.status, 200);
    assert.ok(Array.isArray(mumbai.body));
    assert.equal(mumbai.body.length, 1);
    assert.equal(mumbai.body[0].city, "mumbai");
    assert.deepEqual(await get(`/${supplier}/hotels?city=unknown-city`), { status: 200, body: [] });
    assert.equal((await get(`/${supplier}/hotels`)).status, 400);
  }
});

test("rejects a missing city", async () => {
  const response = await get("/api/hotels");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "Valid city query parameter is required",
  });
});

test("rejects invalid and negative prices", () => {
  assert.deepEqual(parseHotelQuery({ city: "delhi", minPrice: "abc" }), {
    error: "minPrice must be a finite, nonnegative number",
  });
  assert.deepEqual(parseHotelQuery({ city: "delhi", maxPrice: "-1" }), {
    error: "maxPrice must be a finite, nonnegative number",
  });
});

test("rejects invalid prices and repeated query parameters over HTTP", async () => {
  for (const query of [
    "city=delhi&minPrice=abc",
    "city=delhi&maxPrice=-1",
    "city=delhi&maxPrice=Infinity",
    "city=delhi&minPrice=",
    "city=delhi&city=mumbai",
    "city=delhi&minPrice=1000&minPrice=2000",
  ]) {
    assert.equal((await get(`/api/hotels?${query}`)).status, 400, query);
  }
});

test("rejects an inverted price range", async () => {
  const response = await get("/api/hotels?city=delhi&minPrice=6000&maxPrice=5000");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: "minPrice must be less than or equal to maxPrice",
  });
});

test("normalizes city and applies default price bounds", () => {
  assert.deepEqual(parseHotelQuery({ city: " Delhi " }), {
    value: {
      city: "delhi",
      minPrice: 0,
      maxPrice: Number.MAX_SAFE_INTEGER,
    },
  });
});
