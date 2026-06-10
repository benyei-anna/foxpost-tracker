const fs = require("fs");
const path = require("path");

const historyDir = path.join("data", "history");
const diffDir = path.join("data", "diff");

if (!fs.existsSync(diffDir)) {
  fs.mkdirSync(diffDir, { recursive: true });
}

const activeFiles = fs.readdirSync(historyDir)
  .filter(name => name.startsWith("active-") && name.endsWith(".json"))
  .sort();

if (activeFiles.length < 2) {
  const result = {
    timestamp: new Date().toISOString(),
    status: "not_enough_history",
    message: "Nincs elegendő history az összehasonlításhoz. Legalább 2 active snapshot kell.",
    comparedFiles: activeFiles
  };

  fs.writeFileSync(
    path.join(diffDir, "latest-diff.json"),
    JSON.stringify(result, null, 2),
    "utf8"
  );

  console.log(result.message);
  process.exit(0);
}

const previousFile = activeFiles[activeFiles.length - 2];
const currentFile = activeFiles[activeFiles.length - 1];

const previous = JSON.parse(
  fs.readFileSync(path.join(historyDir, previousFile), "utf8")
);
const current = JSON.parse(
  fs.readFileSync(path.join(historyDir, currentFile), "utf8")
);

function pointKey(point) {
  if (point.operator_id && String(point.operator_id).trim() !== "") {
    return String(point.operator_id);
  }
  if (point.place_id && String(point.place_id).trim() !== "") {
    return String(point.place_id);
  }
  return `${point.name || ""}|${point.zip || ""}|${point.address || ""}`;
}

const previousMap = new Map(previous.items.map(item => [pointKey(item), item]));
const currentMap = new Map(current.items.map(item => [pointKey(item), item]));

const newPoints = [];
const removedPoints = [];
const changedPoints = [];

for (const [key, currentPoint] of currentMap.entries()) {
  if (!previousMap.has(key)) {
    newPoints.push(currentPoint);
    continue;
  }

  const previousPoint = previousMap.get(key);
  const trackedFields = ["load", "open", "variant", "allowed2", "name", "address", "zip", "city"];
  const changes = {};

  for (const field of trackedFields) {
    const oldValue = previousPoint[field] ?? null;
    const newValue = currentPoint[field] ?? null;

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[field] = {
        previous: oldValue,
        current: newValue
      };
    }
  }

  if (Object.keys(changes).length > 0) {
    changedPoints.push({
      key,
      before: previousPoint,
      after: currentPoint,
      changes
    });
  }
}

for (const [key, previousPoint] of previousMap.entries()) {
  if (!currentMap.has(key)) {
    removedPoints.push(previousPoint);
  }
}

const result = {
  timestamp: new Date().toISOString(),
  previousFile,
  currentFile,
  previousTimestamp: previous.timestamp || null,
  currentTimestamp: current.timestamp || null,
  previousActiveCount: previous.activeCount || previous.items?.length || 0,
  currentActiveCount: current.activeCount || current.items?.length || 0,
  summary: {
    newPoints: newPoints.length,
    removedPoints: removedPoints.length,
    changedPoints: changedPoints.length
  },
  newPoints,
  removedPoints,
  changedPoints
};

const diffFileName = `diff-${currentFile.replace(/^active-/, "")}`;

fs.writeFileSync(
  path.join(diffDir, diffFileName),
  JSON.stringify(result, null, 2),
  "utf8"
);

fs.writeFileSync(
  path.join(diffDir, "latest-diff.json"),
  JSON.stringify(result, null, 2),
  "utf8"
);

console.log(`Új pontok: ${newPoints.length}`);
console.log(`Eltűnt pontok: ${removedPoints.length}`);
console.log(`Módosult pontok: ${changedPoints.length}`);
