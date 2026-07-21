const fs = require("fs");
const path = require("path");

function quotePath(filePath) {
  return filePath.includes(" ") ? `"${filePath}"` : filePath;
}

function getCandidates(toolName) {
  const userProfile = process.env.USERPROFILE || "";

  if (toolName === "nmap") {
    return [
      process.env.NMAP_PATH,
      "C:\\Program Files (x86)\\Nmap\\nmap.exe",
      "C:\\Program Files\\Nmap\\nmap.exe",
    ].filter(Boolean);
  }

  if (toolName === "nuclei") {
    return [
      process.env.NUCLEI_PATH,
      path.join(userProfile, "go", "bin", "nuclei.exe"),
    ].filter(Boolean);
  }

  if (toolName === "httpx") {
    return [
      process.env.HTTPX_PATH,
      path.join(userProfile, "go", "bin", "httpx.exe"),
    ].filter(Boolean);
  }

  return [];
}

function resolveToolExecutable(toolName) {
  const candidates = getCandidates(toolName);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return quotePath(candidate);
    }
  }

  return toolName;
}

function resolveNucleiTemplatesDir() {
  const userProfile = process.env.USERPROFILE || "";
  const candidates = [
    process.env.NUCLEI_TEMPLATES_DIR,
    path.join(userProfile, "nuclei-templates"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

module.exports = {
  resolveToolExecutable,
  resolveNucleiTemplatesDir,
  quotePath,
};
