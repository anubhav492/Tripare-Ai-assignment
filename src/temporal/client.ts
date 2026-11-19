import { Client, Connection } from "@temporalio/client";
import { hotelWorkflow } from "./workflows";

export async function runHotelWorkflow(
  city: string,
  minPrice: number,
  maxPrice: number
) {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const connection = await Connection.connect({ address });
  const workflowId = `hotel-${city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  try {
    const client = new Client({ connection });

    return await client.workflow.execute(hotelWorkflow, {
      taskQueue: "hotel-task-queue",
      workflowId,
      args: [city, minPrice, maxPrice],
    });
  } finally {
    await connection.close();
  }
}
