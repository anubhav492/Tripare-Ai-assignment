export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export const supplierAHotels: Hotel[] = [
  {
    hotelId: "a1",
    name: "Holtin",
    price: 6000,
    city: "delhi",
    commissionPct: 10,
  },
  {
    hotelId: "a2",
    name: "Radison",
    price: 5900,
    city: "delhi",
    commissionPct: 13,
  },
  {
    hotelId: "a3",
    name: "Taj Palace",
    price: 9000,
    city: "delhi",
    commissionPct: 15,
  },
  {
    hotelId: "a4",
    name: "Sea View",
    price: 4500,
    city: "mumbai",
    commissionPct: 12,
  },
];
