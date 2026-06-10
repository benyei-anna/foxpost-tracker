const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data.json", "utf8"));

const active = raw.filter(point => {
  return point.load !== "overloaded" && point.allowed2 !== null;
});

const result = {
  timestamp: new Date().toISOString(),
  activeCount: active.length,
  items: active
};

fs.writeFileSync("active.json", JSON.stringify(result, null, 2), "utf8");

console.log("Aktív pontok:", active.length);
