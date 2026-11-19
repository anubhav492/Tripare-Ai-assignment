import assert from "node:assert/strict";
import { createClient } from "redis";
import test from "node:test";
import {
  closeRedisConnection,
  getHotelOffersByPrice,
  storeHotelOffers,
  type HotelOffer,
} from "../dist/services/redis.service.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

async function redisIsAvailable(): Promise<boolean> {
  const client = createClient({
    url: redisUrl,
    socket: { connectTimeout: 2000, reconnectStrategy: false },
  });
  // connect() rejects below; an unavailable optional Redis must not emit an unhandled error.
  client.on("error", () => {});

  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    client.destroy();
  }
}

const offer = (name: string, price: number, supplier = "Supplier A"): HotelOffer => ({
  name,
  price,
  supplier,
  commissionPct: 10,
});

test("stores, replaces, isolates, and filters hotel offers in Redis", async (context) => {
  if (!(await redisIsAvailable())) {
    context.skip("Redis is not available at REDIS_URL");
    return;
  }

  const city = `redis-test-${Date.now()}`;
  const otherCity = `${city}-other`;

  try {
    await storeHotelOffers(city, [
      offer("Cheap", 1000),
      offer("Mid", 2000),
      offer("Expensive", 3000),
    ]);
    await storeHotelOffers(otherCity, [offer("Other city", 1500)]);

    assert.deepEqual(await getHotelOffersByPrice(city, 1500, 2500), [offer("Mid", 2000)]);
    assert.deepEqual(await getHotelOffersByPrice(city, 2000, 2000), [offer("Mid", 2000)]);
    assert.deepEqual(await getHotelOffersByPrice(city, 4000, 5000), []);
    assert.deepEqual(await getHotelOffersByPrice(otherCity, 0, 5000), [offer("Other city", 1500)]);

    await storeHotelOffers(city, [offer("Replacement", 1750, "Supplier B")]);
    assert.deepEqual(await getHotelOffersByPrice(city, 0, Number.MAX_SAFE_INTEGER), [
      offer("Replacement", 1750, "Supplier B"),
    ]);

    await storeHotelOffers(city, []);
    assert.deepEqual(await getHotelOffersByPrice(city, 0, Number.MAX_SAFE_INTEGER), []);
    assert.deepEqual(await getHotelOffersByPrice(otherCity, 0, 5000), [offer("Other city", 1500)]);
  } finally {
    await closeRedisConnection();
  }
});
