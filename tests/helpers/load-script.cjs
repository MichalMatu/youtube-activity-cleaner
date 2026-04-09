const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..", "..");

function createContext(overrides = {}) {
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Date,
    globalThis: null,
    ...overrides,
  };

  context.globalThis = context;
  return vm.createContext(context);
}

function loadScript(relativePath, context) {
  const absolutePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInContext(source, context, { filename: absolutePath });
  return context;
}

module.exports = {
  createContext,
  loadScript,
};
