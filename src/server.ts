import express from "express";
import { supplierAHotels } from "./data/supplierA";
import { supplierBHotels } from "./data/supplierB";
import { runHotelWorkflow } from "./temporal/client";

const defaultMaxPrice = Number.MAX_SAFE_INTEGER;

export interface HotelQuery {
  city: string;
  minPrice: number;
  maxPrice: number;
}

export function parseHotelQuery(
  query: Record<string, unknown>
): { value: HotelQuery } | { error: string } {
  const city = query.city;

  if (typeof city !== "string" || city.trim() === "") {
    return { error: "Valid city query parameter is required" };
  }

  const parsePrice = (
    value: unknown,
    parameterName: string
  ): number | { error: string } | undefined => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string" || value.trim() === "") {
      return { error: `${parameterName} must be a finite, nonnegative number` };
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: `${parameterName} must be a finite, nonnegative number` };
    }

    return parsed;
  };

  const minPrice = parsePrice(query.minPrice, "minPrice");
  if (typeof minPrice === "object") {
    return minPrice;
  }

  const maxPrice = parsePrice(query.maxPrice, "maxPrice");
  if (typeof maxPrice === "object") {
    return maxPrice;
  }

  const resolvedMinPrice = minPrice ?? 0;
  const resolvedMaxPrice = maxPrice ?? defaultMaxPrice;

  if (resolvedMinPrice > resolvedMaxPrice) {
    return { error: "minPrice must be less than or equal to maxPrice" };
  }

  return {
    value: {
      city: city.trim().toLowerCase(),
      minPrice: resolvedMinPrice,
      maxPrice: resolvedMaxPrice,
    },
  };
}

export const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Hotel Offer Orchestrator API is running",
  });
});

app.get("/supplierA/hotels", (req, res) => {
  const city = req.query.city;

  if (typeof city !== "string" || city.trim() === "") {
    res.status(400).json({
      error: "Valid city query parameter is required",
    });
    return;
  }

  const normalizedCity = city.trim().toLowerCase();
  const hotels = supplierAHotels.filter((hotel) => hotel.city === normalizedCity);

  res.json(hotels);
});

app.get("/supplierB/hotels", (req, res) => {
  const city = req.query.city;

  if (typeof city !== "string" || city.trim() === "") {
    res.status(400).json({
      error: "Valid city query parameter is required",
    });
    return;
  }

  const normalizedCity = city.trim().toLowerCase();
  const hotels = supplierBHotels.filter((hotel) => hotel.city === normalizedCity);

  res.json(hotels);
});

app.get("/api/hotels", async (req, res) => {
  const parsedQuery = parseHotelQuery(req.query as Record<string, unknown>);

  if ("error" in parsedQuery) {
    res.status(400).json({ error: parsedQuery.error });
    return;
  }

  try {
    const hotels = await runHotelWorkflow(
      parsedQuery.value.city,
      parsedQuery.value.minPrice,
      parsedQuery.value.maxPrice
    );
    res.json(hotels);
  } catch (error) {
    console.error("Hotel workflow request failed", error);
    res.status(500).json({
      error: "Failed to fetch hotel offers",
    });
  }
});

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Hotel Offer Orchestrator API listening at http://localhost:${port}`);
  });
}
