import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities";
import { getBestHotelOffers } from "../services/hotel.service";

const { fetchSupplierA, fetchSupplierB } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
  retry: {
    maximumAttempts: 3,
  },
});

const {
  storeHotelOffers,
  filterHotelOffers,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
  retry: {
    maximumAttempts: 3,
  },
});

export async function hotelWorkflow(
  city: string,
  minPrice: number,
  maxPrice: number
) {
  const [supplierAHotels, supplierBHotels] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  const offers = getBestHotelOffers(supplierAHotels, supplierBHotels);
  await storeHotelOffers(city, offers);

  return filterHotelOffers(city, minPrice, maxPrice);
}
