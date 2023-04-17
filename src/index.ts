import cluster from "cluster";
import * as os from "os";
import "./sqlite";
if (cluster.isPrimary) {
  // Take advantage of multiple CPUs
  const cpus = os.cpus().length;

  if (process.argv.includes("--no-cluster")) {
    cluster.fork(process.env);
  } else {
    for (let i = 0; i < Math.max(cpus, 4); i++) {
      cluster.fork(process.env);
    }
  }

  cluster.on("exit", (worker, code) => {
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      cluster.fork();
    }
  });
} else {
  require("./server");
}
