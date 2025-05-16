import { useState, useEffect, useRef } from "react";
import protocolMap from '../protocol-map.json';

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const tables = ["filter", "nat", "mangle", "raw", "security"];
const chainsByTable = {
  filter: ["INPUT", "OUTPUT", "FORWARD"],
  nat: ["PREROUTING", "POSTROUTING", "OUTPUT"],
  mangle: ["PREROUTING", "POSTROUTING", "INPUT", "OUTPUT", "FORWARD"],
  raw: ["PREROUTING", "OUTPUT"],
  security: ["INPUT", "OUTPUT", "FORWARD"],
};
const actions = ["ACCEPT", "DROP", "REJECT"];

export default function App() {
  const [manualRule, setManualRule] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showModal, setShowModal] = useState(true);
  const [table, setTable] = useState("filter");
  const [chain, setChain] = useState("INPUT");
  const [protocol, setProtocol] = useState("");
  const [srcIp, setSrcIp] = useState("");
  const [destIp, setDestIp] = useState("");
  const [srcPort, setSrcPort] = useState("");
  const [destPort, setDestPort] = useState("");
  const [action, setAction] = useState("DROP");
  const [ruleList, setRuleList] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [deleteIndex, setDeleteIndex] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const validChains = chainsByTable[table];
    if (!validChains.includes(chain)) {
      setChain(validChains[0]);
    }
  }, [table, chain]);

  useEffect(() => {
    const savedBaseUrl = localStorage.getItem("baseUrl");
    const savedTimestamp = localStorage.getItem("baseUrlTimestamp");

    if (savedBaseUrl && savedTimestamp) {
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;

      if (now - parseInt(savedTimestamp, 10) < thirtyMinutes) {
        setBaseUrl(savedBaseUrl);
        setShowModal(false);
      } else {
        localStorage.removeItem("baseUrl");
        localStorage.removeItem("baseUrlTimestamp");
      }
    }
  }, []);

  useEffect(() => {
    if (baseUrl) {
      setDeleteIndex("");
      fetchRules();
    }
  }, [baseUrl, table, chain]);

  const handleSetBaseUrl = () => {
    if (!baseUrl.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      alert("Masukkan IP yang valid");
      return;
    }
    const fullBaseUrl = `${baseUrl}:5000`;
    setBaseUrl(fullBaseUrl);
    setShowModal(false);

    localStorage.setItem("baseUrl", fullBaseUrl);
    localStorage.setItem("baseUrlTimestamp", Date.now().toString());
  };

  const handleLogout = () => {
    setBaseUrl("");
    setShowModal(true);

    localStorage.removeItem("baseUrl");
    localStorage.removeItem("baseUrlTimestamp");
  };

  async function fetchRules(retryCount = 3) {
    if (!baseUrl || !chainsByTable[table]?.includes(chain)) {
      setMessage("Tabel atau chain tidak valid");
      setMessageType("error");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setMessage("Loading aturan...");
    setMessageType("info");

    try {
      const res = await fetch(`http://${baseUrl}/iptables?table=${table}&chain=${chain}`, {
        signal: abortController.signal,
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const data = await res.json();
      setRuleList(data.rules || []);
      setMessage("");
    } catch (error) {
      if (error.name === "AbortError") return;

      if (retryCount > 0) {
        console.warn("Retrying fetchRules...", { retryCount });
        fetchRules(retryCount - 1);
      } else {
        setMessage("Gagal mengambil aturan");
        setMessageType("error");
        setRuleList([]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function addRawRule() {
    if (!manualRule.trim()) return;
    setIsLoading(true);
    setMessage("Menambahkan aturan manual...");
    setMessageType("info");

    try {
      const res = await fetch(`http://${baseUrl}/iptables/add-raw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule: manualRule.trim(), table }),
      });

      if (!res.ok) throw new Error("Gagal menambahkan aturan manual");

      const data = await res.json();
      setMessage(data.message || "Aturan manual berhasil ditambahkan");
      setMessageType("success");
      setManualRule("");
      fetchRules();
    } catch (error) {
      setMessage(error.message || "Gagal menambahkan aturan manual");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  const isValidPort = (port) => {
    if (!port) return true;
    const p = Number(port);
    return Number.isInteger(p) && p > 0 && p <= 65535;
  };

  const isValidIp = (ip) => {
    if (!ip) return true;
    const parts = ip.split('/');
    const ipAddress = parts[0];
    const prefix = parts[1];
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) return false;
    const isValidOctets = ipAddress.split('.').every(num => {
      const n = Number(num);
      return n >= 0 && n <= 255;
    });
    if (!isValidOctets) return false;
    if (prefix !== undefined) {
      const prefixNum = Number(prefix);
      if (!Number.isInteger(prefixNum) || prefixNum < 0 || prefixNum > 32) {
        return false;
      }
    }
    return true;
  };

  async function addRule() {
    if (!chain || !action) {
      setMessage("Chain dan aksi harus dipilih");
      setMessageType("error");
      return;
    }
    if (!isValidIp(srcIp)) {
      setMessage("Source IP tidak valid");
      setMessageType("error");
      return;
    }
    if (!isValidIp(destIp)) {
      setMessage("Destination IP tidak valid");
      setMessageType("error");
      return;
    }
    if (!isValidPort(srcPort)) {
      setMessage("Source Port tidak valid");
      setMessageType("error");
      return;
    }
    if (!isValidPort(destPort)) {
      setMessage("Destination Port tidak valid");
      setMessageType("error");
      return;
    }
    setIsLoading(true);
    setMessage("Menambahkan aturan...");
    setMessageType("info");

    const payload = {
      table,
      chain,
      protocol: protocol || null,
      srcIp: srcIp || null,
      destIp: destIp || null,
      srcPort: srcPort || null,
      destPort: destPort || null,
      action,
    };
    try {
      const res = await fetch(`http://${baseUrl}/iptables/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal menambahkan aturan");
      const data = await res.json();
      setMessage(data.message || "Aturan berhasil ditambahkan");
      setMessageType("success");
      setProtocol("");
      setSrcIp("");
      setDestIp("");
      setSrcPort("");
      setDestPort("");
      fetchRules();
    } catch (error) {
      setMessage(error.message || "Gagal menambahkan aturan");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteRule() {
    const idx = Number(deleteIndex);
    if (
      !Number.isInteger(idx) ||
      idx < 1 ||
      idx > ruleList.length
    ) {
      setMessage("Masukkan nomor aturan yang valid untuk dihapus");
      setMessageType("error");
      return;
    }
    setIsLoading(true);
    setMessage("Menghapus aturan...");
    setMessageType("info");
    try {
      const res = await fetch(`http://${baseUrl}/iptables/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, chain, index: idx }),
      });
      if (!res.ok) throw new Error("Gagal menghapus aturan");
      const data = await res.json();
      setMessage(data.message || "Aturan berhasil dihapus");
      setMessageType("success");
      setDeleteIndex("");
      fetchRules();
    } catch (error) {
      setMessage(error.message || "Gagal menghapus aturan");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  const getBadgeColor = (action) => {
    if (action === "ACCEPT") return "bg-green-100 text-green-800";
    if (action === "DROP") return "bg-red-100 text-red-800";
    if (action === "REJECT") return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const extractAction = (rule) => {
    if (rule.includes("ACCEPT")) return "ACCEPT";
    if (rule.includes("DROP")) return "DROP";
    if (rule.includes("REJECT")) return "REJECT";
    return "OTHER";
  };

  function extractRuleNumber(rule) {
    const match = rule.trim().match(/^(\d+)/);
    if (match) return match[1];
    return null;
  }

  function extractPktsAndBytes(rule) {
    const match = rule.trim().match(/^\s*\d+\s+(\d+)\s+(\d+)\s+/);
    if (match) {
      return {
        pkts: match[1],
        bytes: match[2]
      };
    }
    return { pkts: "-", bytes: "-" };
  }

  function stripHeaderInfo(rule) {
    const parts = rule.trim().split(/\s+/);
    if (parts.length >= 10) {
      const prot = parts[4];
      const opt = parts[5];
      const inputIf = parts[6];
      const outputIf = parts[7];
      const source = parts[8];
      const destination = parts[9];
      return `${prot} ${opt} ${inputIf} ${outputIf} ${source} → ${destination}`;
    }
    return rule;
  }

  function extractPktsAndBytes(rule) {
    const parts = rule.trim().split(/\s+/);
    return {
      pkts: parts[1] || "-",
      bytes: parts[2] || "-",
      prot: parts[4] || "-"
    };
  }

  function getProtocolName(prot) {
    const entry = protocolMap[prot.toString()];
    return entry ? entry.name : prot;
  }

  function decodeTcpFlags(flagsHexStr, returnArray = false) {
    const match = flagsHexStr.match(/tcp flags:0x[0-9A-Fa-f]+\/0x([0-9A-Fa-f]+)/);
    if (!match) return returnArray ? [] : "-";

    const hex = match[1];
    const value = parseInt(hex, 16);

    const flagsMap = {
      FIN: 0x01,
      SYN: 0x02,
      RST: 0x04,
      PSH: 0x08,
      ACK: 0x10,
      URG: 0x20,
      ECE: 0x40,
      CWR: 0x80
    };

    const activeFlags = Object.entries(flagsMap)
      .filter(([_, bit]) => (value & bit) !== 0)
      .map(([name]) => name);

    return returnArray ? activeFlags : activeFlags.join(", ") || "-";
  }

  function extractTcpFlagsRaw(rule) {
    const match = rule.match(/tcp flags:0x[0-9A-Fa-f]+\/0x[0-9A-Fa-f]+/);
    return match ? match[0] : "-";
  }

  function FlagBadge({ flag }) {
    const colors = {
      SYN: "bg-blue-100 text-blue-800",
      FIN: "bg-red-100 text-red-800",
      RST: "bg-yellow-100 text-yellow-800",
      PSH: "bg-green-100 text-green-800",
      ACK: "bg-purple-100 text-purple-800",
      URG: "bg-pink-100 text-pink-800",
      ECE: "bg-orange-100 text-orange-800",
      CWR: "bg-gray-100 text-gray-800"
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 mr-1 mb-1 rounded-full text-xs font-medium ${colors[flag] || "bg-slate-100 text-slate-800"}`}
      >
        {flag}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-2 sm:px-4 lg:px-6">
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Masukkan IP Server</h2>
            <input
              type="text"
              placeholder="Contoh: 192.168.1.1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value.trim())}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSetBaseUrl}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      {!showModal && (
        <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-visible">
          <header className="bg-blue-600 px-4 py-4 flex items-center justify-between rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-full shadow">
                <ShieldIcon />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">IPTables Control Panel</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              <LogoutIcon />
              <span className="ml-2">Logout</span>
            </button>
          </header>

          <main className="p-4 sm:p-6 overflow-visible">
            {message && (
              <div
                className={`mb-4 p-3 rounded-md flex items-center ${messageType === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : messageType === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
              >
                <AlertIcon />
                <span className="ml-2">{message}</span>
              </div>
            )}

            <section className="bg-slate-50 p-4 rounded-lg mb-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-3 text-slate-700 flex items-center">
                <span className="bg-blue-100 p-1 rounded mr-2 text-blue-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                Konfigurasi
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium text-slate-700">Tabel</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    disabled={isLoading}
                  >
                    {tables.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-slate-700">Chain</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    disabled={isLoading}
                  >
                    {(chainsByTable[table] || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-slate-700">Aksi</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    disabled={isLoading}
                  >
                    {actions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="font-medium text-slate-700 mb-2">Parameter Tambahan (opsional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block mb-1 text-sm text-slate-600">Protocol</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="tcp, udp, icmp"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value.trim())}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm text-slate-600">Source IP</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="192.168.1.1"
                    value={srcIp}
                    onChange={(e) => setSrcIp(e.target.value.trim())}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm text-slate-600">Source Port</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="80"
                    value={srcPort}
                    onChange={(e) => setSrcPort(e.target.value.trim())}
                    min="1"
                    max="65535"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm text-slate-600">Destination IP</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="192.168.1.2"
                    value={destIp}
                    onChange={(e) => setDestIp(e.target.value.trim())}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm text-slate-600">Destination Port</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="443"
                    value={destPort}
                    onChange={(e) => setDestPort(e.target.value.trim())}
                    min="1"
                    max="65535"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6 flex-wrap">
                <button
                  onClick={addRule}
                  disabled={isLoading}
                  className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <PlusIcon />
                  <span className="ml-2">Tambah Aturan</span>
                </button>
                <button
                  onClick={fetchRules}
                  disabled={isLoading}
                  className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <RefreshIcon />
                  <span className="ml-2">Refresh Daftar</span>
                </button>
              </div>
            </section>

            <section className="mb-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-slate-700 flex items-center whitespace-nowrap">
                  <span className="bg-indigo-100 p-1 rounded mr-2 text-indigo-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  Daftar Aturan: <span className="font-bold text-indigo-600 ml-1">Tabel {table}</span> |{" "}
                  <span className="font-bold text-indigo-600">Chain {chain}</span>
                </h2>

                <div className="text-sm text-slate-500 flex items-center whitespace-nowrap">
                  <span className="font-medium">
                    {
                      ruleList.filter(
                        (rule) =>
                          !(rule.includes("Chain") || rule.trim() === "" || rule.includes("target"))
                      ).length
                    }
                  </span>
                  <span className="ml-1">aturan ditemukan</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-auto max-h-96 shadow-sm">
                {isLoading ? (
                  <div className="py-6 flex justify-center items-center text-slate-500">
                    <svg
                      className="animate-spin h-6 w-6 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </div>
                ) : ruleList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mx-auto mb-4 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="font-medium">Tidak ada aturan untuk ditampilkan</p>
                    <p className="mt-1 text-sm">Tambahkan aturan baru menggunakan form di atas</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse table-auto">
                      <thead>
                        <tr className="bg-slate-50 sticky top-0 z-10">
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 w-12">
                            No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            Deskripsi Aturan
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 w-36 text-center">
                            TCP FLAGS
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 w-16 text-center">
                            Pkts
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 w-20 text-center">
                            Bytes
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 w-24">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {ruleList.map((rule, idx) => {
                          if (rule.includes("Chain")) {
                            return (
                              <tr key={`chain-${idx}`} className="bg-slate-100 font-semibold text-center">
                                <td colSpan={6} className="px-4 py-3 text-sm text-slate-900">
                                  {rule}
                                </td>
                              </tr>
                            );
                          }
                          if (rule.trim() === "" || rule.includes("target")) {
                            return null;
                          }

                          const ruleNumber = extractRuleNumber(rule);
                          const { pkts, bytes, prot } = extractPktsAndBytes(rule);
                          const ruleProtocolName = getProtocolName(prot);
                          const flagsRaw = extractTcpFlagsRaw(rule);
                          const flagsArray = decodeTcpFlags(flagsRaw, true);

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-slate-900">
                                {ruleNumber || idx + 1}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 font-mono break-words max-w-xs sm:max-w-full">
                                {ruleProtocolName} {stripHeaderInfo(rule)}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-slate-700">
                                {flagsArray.length > 0 ? (
                                  <div className="flex flex-wrap justify-center">
                                    {flagsArray.map((flag, i) => (
                                      <FlagBadge key={i} flag={flag} />
                                    ))}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-slate-700">{pkts}</td>
                              <td className="px-4 py-3 text-sm text-center text-slate-700">{bytes}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(
                                    extractAction(rule)
                                  )}`}
                                >
                                  {extractAction(rule)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Contoh: -A INPUT -s 192.168.1.100 -j DROP"
                                value={manualRule}
                                onChange={(e) => setManualRule(e.target.value)}
                                disabled={isLoading}
                              />
                              <button
                                onClick={addRawRule}
                                disabled={isLoading || !manualRule.trim()}
                                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-slate-50 p-4 rounded-lg shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-3 text-slate-700 flex items-center">
                <span className="bg-red-100 p-1 rounded mr-2 text-red-600">
                  <TrashIcon />
                </span>
                Hapus Aturan
              </h2>

              <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
                <div className="flex-grow max-w-xs w-full">
                  <label className="block mb-1 font-medium text-slate-700">Nomor Aturan</label>
                  <input
                    type="number"
                    value={deleteIndex}
                    onChange={(e) => setDeleteIndex(e.target.value)}
                    placeholder="Masukkan nomor aturan"
                    min="1"
                    max={ruleList.length}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={deleteRule}
                  disabled={isLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
                >
                  <TrashIcon />
                  <span className="ml-2">Hapus Aturan</span>
                </button>
              </div>
            </section>
          </main>

          <footer className="bg-slate-50 px-6 py-3 text-center text-sm text-slate-500 border-t rounded-b-lg">
            &copy; {new Date().getFullYear()} Bima Cakra Bara Karebet. All rights reserved.
          </footer>
        </div>
      )}
    </div>
  );
}