import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";
import { closeRedisConnection } from "../services/redis.service";

async function runWorker(): Promise<void> {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const connection = await NativeConnection.connect({ address });

  try {
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve("./workflows"),
      activities,
      taskQueue: "hotel-task-queue",
    });

    console.log(`Temporal Worker connected to ${address} on hotel-task-queue`);
    await worker.run();
  } finally {
    await Promise.all([connection.close(), closeRedisConnection()]);
  }
}

runWorker().catch((error: unknown) => {
  console.error("Temporal Worker failed to start", error);
  process.exit(1);
});
