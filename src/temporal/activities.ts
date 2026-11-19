import type { Hotel } from "../data/supplierA";
import {
  getHotelOffersByPrice,
  storeHotelOffers as persistHotelOffers,
  type HotelOffer,
} from "../services/redis.service";

const apiUrl = process.env.API_URL || "http://localhost:3000";

async function fetchHotels(path: string): Promise<Hotel[]> {
  const response = await fetch(`${apiUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Hotel supplier request failed with status ${response.status}`);
  }

  return (await response.json()) as Hotel[];
}

export async function fetchSupplierA(city: string): Promise<Hotel[]> {
  return fetchHotels(`/supplierA/hotels?city=${encodeURIComponent(city)}`);
}

export async function fetchSupplierB(city: string): Promise<Hotel[]> {
  return fetchHotels(`/supplierB/hotels?city=${encodeURIComponent(city)}`);
}

export async function storeHotelOffers(
  city: string,
  offers: HotelOffer[]
): Promise<void> {
  await persistHotelOffers(city, offers);
}

export async function filterHotelOffers(
  city: string,
  minPrice: number,
  maxPrice: number
): Promise<HotelOffer[]> {
  return getHotelOffersByPrice(city, minPrice, maxPrice);
}
