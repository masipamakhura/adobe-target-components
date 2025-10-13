// src/index.js
import * as ButtonMod from "./components/button/index.js";

/**
 * Library registry
 * Exposes window.ATComponents when bundled for UMD
 */
const ATComp = {
  Button: ButtonMod.Button,
};

// also attach a helper to register a new component at runtime
ATComp.register = function (name, comp) {
  if (!name || !comp) throw new Error("register(name, component)");
  this[name] = comp;
};

export default ATComp.Button;

// also allow named export
export { ATComp };
