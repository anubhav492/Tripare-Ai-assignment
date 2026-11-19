import { createClient } from "redis";

export interface HotelOffer {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
}

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const resultTtlSeconds = 300;

let redisClient: ReturnType<typeof createClient> | undefined;
let connectPromise: Promise<void> | undefined;

function cityKey(city: string): string {
  return encodeURIComponent(city.trim().toLowerCase());
}

function offerKey(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

function redisKeys(city: string): { pricesKey: string; detailsKey: string } {
  const key = cityKey(city);
  return {
    pricesKey: `hotel-offers:${key}:prices`,
    detailsKey: `hotel-offers:${key}:details`,
  };
}

async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      // Let Temporal retry failed activities instead of queueing commands indefinitely.
      socket: { connectTimeout: 5000, reconnectStrategy: false },
      disableOfflineQueue: true,
    });
    redisClient.on("error", (error) => {
      console.error("Redis client error", error);
    });
  }

  const client = redisClient;

  if (!client.isReady) {
    if (!connectPromise) {
      connectPromise = client
        .connect()
        .then(() => undefined)
        .finally(() => {
          connectPromise = undefined;
        });
    }

    try {
      await connectPromise;
    } catch (error) {
      if (redisClient === client) {
        redisClient = undefined;
      }

      throw new Error(
        `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return client;
}

export async function storeHotelOffers(
  city: string,
  offers: HotelOffer[]
): Promise<void> {
  const client = await getRedisClient();
  const { pricesKey, detailsKey } = redisKeys(city);
  const details: Record<string, string> = {};

  const priceEntries = offers.map((offer) => {
    const member = offerKey(offer.name);
    details[member] = JSON.stringify(offer);
    return { score: offer.price, value: member };
  });

  const transaction = client.multi().del(pricesKey).del(detailsKey);

  if (priceEntries.length > 0) {
    transaction
      .hSet(detailsKey, details)
      .zAdd(pricesKey, priceEntries)
      .expire(pricesKey, resultTtlSeconds)
      .expire(detailsKey, resultTtlSeconds);
  }

  await transaction.exec();
}

export async function getHotelOffersByPrice(
  city: string,
  minPrice: number,
  maxPrice: number
): Promise<HotelOffer[]> {
  const client = await getRedisClient();
  const { pricesKey, detailsKey } = redisKeys(city);
  const members = await client.zRangeByScore(pricesKey, minPrice, maxPrice);

  if (members.length === 0) {
    return [];
  }

  const serializedOffers = await Promise.all(
    members.map((member) => client.hGet(detailsKey, member))
  );

  return serializedOffers
    .filter((serialized): serialized is string => serialized !== null)
    .map((serialized) => JSON.parse(serialized) as HotelOffer);
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }

  redisClient = undefined;
  connectPromise = undefined;
}
