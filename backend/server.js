const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

const IPTABLES_CMD = "/sbin/iptables";

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      console.log("Menjalankan:", cmd);
      if (error) {
        console.error("Error:", stderr || error.message);
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

app.get("/iptables", async (req, res) => {
  const { table = "filter", chain = "INPUT" } = req.query;
  try {
    const output = await runCommand(`sudo ${IPTABLES_CMD} -t ${table} -L ${chain} -n -v --line-numbers`);
    const lines = output.split("\n").filter(Boolean);
    res.json({ rules: lines });
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil aturan iptables", error: err });
  }
});


app.post("/iptables/add", async (req, res) => {
  const { table, chain, protocol, srcIp, destIp, srcPort, destPort, action } = req.body;
  if (!table || !chain || !action) {
    return res.status(400).json({ message: "Parameter wajib tidak lengkap" });
  }

  let cmd = `sudo ${IPTABLES_CMD} -t ${table} -A ${chain}`;
  if (protocol) cmd += ` -p ${protocol}`;
  if (srcIp) cmd += ` -s ${srcIp}`;
  if (destIp) cmd += ` -d ${destIp}`;
  if ((protocol === "tcp" || protocol === "udp") && srcPort) cmd += ` --sport ${srcPort}`;
  if ((protocol === "tcp" || protocol === "udp") && destPort) cmd += ` --dport ${destPort}`;
  cmd += ` -j ${action.toUpperCase()}`;

  try {
    await runCommand(cmd);
    res.json({ message: `Aturan berhasil ditambahkan: ${cmd}` });
  } catch (err) {
    res.status(500).json({ message: "Gagal menambahkan aturan", error: err });
  }
});

app.post("/iptables/delete", async (req, res) => {
  const { table, chain, index } = req.body;
  if (!table || !chain || !index) {
    return res.status(400).json({ message: "Parameter wajib tidak lengkap" });
  }
  const cmd = `sudo ${IPTABLES_CMD} -t ${table} -D ${chain} ${index}`;
  try {
    await runCommand(cmd);
    res.json({ message: `Aturan nomor ${index} berhasil dihapus dari ${chain} (${table})` });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus aturan", error: err });
  }
});

app.post("/iptables/add-raw", async (req, res) => {
  const { rule, table } = req.body;
  if (!rule || !table) {
    return res.status(400).json({ message: "Rule dan table wajib diisi" });
  }

  const cmd = `sudo ${IPTABLES_CMD} -t ${table} ${rule}`;
  try {
    await runCommand(cmd);
    res.json({ message: `Aturan berhasil ditambahkan: ${cmd}` });
  } catch (err) {
    res.status(500).json({ message: "Gagal menambahkan aturan manual", error: err });
  }
});


app.listen(5000, () => {
  console.log("Server berjalan di http://localhost:5000");
});