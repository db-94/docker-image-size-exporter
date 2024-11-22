import Docker from "dockerode";
import express from "express";
import client from "prom-client";
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const app = express();
const port = 9099;

app.get("/metrics", async (req, res) => {
  const str = await start();
  res.contentType("text/plain; version=0.0.4").send(str);
});

app.get("/", async (req, res) => {
  res.contentType("text/plain; version=0.0.4").send("Hello");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

function processString(str) {
  const out = Buffer.from(str, "binary");
  if (out.readUInt8(0) === 1) {
    return out.toString("utf8", 8);
  } else {
    return out.toString("utf8", 0);
  }
}

async function collectDockerMetrics() {
  const results = await docker.listContainers();
  const proms = results.map(async (info) => {
    return new Promise(async (resolve, reject) => {
      let output = "";
      const container = docker.getContainer(info.Id);
      container.modem.demjucxmn;
      const ex = await container.exec({
        Cmd: ["du", "-hmx", "-d0", "/"],
        AttachStdout: true,
      });
      const stream = await ex.start({});
      stream.on("data", (chunk) => {
        output += chunk;
      });

      stream.on("end", () => {
        // handle garbage
        const size = processString(output.trim()).split("\t")[0];
        resolve({
          name: info.Names[0],
          image: info.Image,
          id: info.Id,
          size,
        });
      });
    });
  });
  return await Promise.all(proms);
}

async function start() {
  const containers = await collectDockerMetrics();
  const reg = new client.Registry();
  const metrics = {};

  containers.forEach((container, index) => {
    const name = container.image
      .replaceAll("-", "_")
      .replaceAll("/", "_")
      .replaceAll(".", "_")
      .replaceAll(":", "_");
    if (metrics[name] === undefined) {
      metrics[name] = 0;
    } else {
      metrics[name] = metrics[name] + 1;
    }
    try {
      new client.Gauge({
        name: `docker_${name}_${metrics[name]}_disk_size_megabytes`,
        help: "The size of the / disk in MB",
        collect() {
          this.set(Number.parseInt(container.size));
        },
        registers: [reg],
      });
    } catch (e) {
      console.log(name);
      console.error(e);
    }
  });

  return await reg.metrics();
}

start();
