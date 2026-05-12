/* ============================================================
   MOCK API — predefined drive test routes
   Shape matches the spec for GET /api/routes
   ============================================================ */

window.MOCK_ROUTES = [
  {
    id: "rt-dtx-urban-a",
    name: "Downtown Dallas — Dense Urban 5G",
    description:
      "Tight grid through the central business district. Validates dense-urban 5G NR coverage, mid-band throughput under foliage and high-rise shadowing, and indoor-leak from skybridges.",
    distanceKm: 5.4,
    estimatedMinutes: 28,
    routeType: "urban",
    kpis: ["RSRP", "RSRQ", "SINR", "Throughput DL", "5G NR Coverage", "Handover"],
    polyline: [
      { lat: 32.7795, lng: -96.8089 }, // Klyde Warren Park
      { lat: 32.7811, lng: -96.8025 },
      { lat: 32.7836, lng: -96.7968 }, // Pearl/Arts District
      { lat: 32.7820, lng: -96.7905 },
      { lat: 32.7785, lng: -96.7896 },
      { lat: 32.7740, lng: -96.7913 }, // Deep Ellum edge
      { lat: 32.7702, lng: -96.7965 },
      { lat: 32.7708, lng: -96.8030 },
      { lat: 32.7745, lng: -96.8061 }, // Main Street
      { lat: 32.7782, lng: -96.8093 },
      { lat: 32.7795, lng: -96.8089 }
    ]
  },
  {
    id: "rt-i635-hwy",
    name: "LBJ Freeway (I-635) — Highway Mobility",
    description:
      "High-speed sweep along I-635 from Galleria to Mesquite. Stresses inter-cell handover at 65–80 mph, throughput consistency, and re-attach behaviour through tunneled overpasses.",
    distanceKm: 22.6,
    estimatedMinutes: 35,
    routeType: "highway",
    kpis: ["RSRP", "SINR", "Throughput DL", "Throughput UL", "HO Success", "Latency"],
    polyline: [
      { lat: 32.9258, lng: -96.8210 }, // Galleria
      { lat: 32.9250, lng: -96.8060 },
      { lat: 32.9242, lng: -96.7820 },
      { lat: 32.9235, lng: -96.7565 }, // 75 / Central Expy
      { lat: 32.9230, lng: -96.7290 },
      { lat: 32.9225, lng: -96.7020 }, // Skillman
      { lat: 32.9210, lng: -96.6740 }, // Plano Rd
      { lat: 32.9152, lng: -96.6510 },
      { lat: 32.9034, lng: -96.6310 },
      { lat: 32.8862, lng: -96.6178 },
      { lat: 32.8650, lng: -96.6125 }, // Mesquite
      { lat: 32.8420, lng: -96.6132 }
    ]
  },
  {
    id: "rt-plano-suburb",
    name: "Plano — Suburban Coverage Edge",
    description:
      "Residential grid through east Plano. Targets cell-edge RSRP, voice quality on long retains, and SINR variance near tree-lined streets.",
    distanceKm: 13.8,
    estimatedMinutes: 48,
    routeType: "suburban",
    kpis: ["RSRP", "RSRQ", "VVQ", "Throughput DL", "Cell Edge"],
    polyline: [
      { lat: 33.0198, lng: -96.6989 }, // Plano starting
      { lat: 33.0245, lng: -96.6912 },
      { lat: 33.0289, lng: -96.6831 },
      { lat: 33.0312, lng: -96.6738 },
      { lat: 33.0290, lng: -96.6651 },
      { lat: 33.0235, lng: -96.6595 },
      { lat: 33.0168, lng: -96.6568 },
      { lat: 33.0098, lng: -96.6612 },
      { lat: 33.0072, lng: -96.6705 },
      { lat: 33.0095, lng: -96.6802 },
      { lat: 33.0140, lng: -96.6885 },
      { lat: 33.0198, lng: -96.6989 }
    ]
  }
];

/* ------------------------------------------------------------
   Mocked GET /api/routes — returns same shape the real API will
   ------------------------------------------------------------ */
window.fetchRoutesApi = function ({ delayMs = 600, fail = false } = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) reject(new Error("Network error: /api/routes unreachable"));
      else resolve(window.MOCK_ROUTES);
    }, delayMs);
  });
};
