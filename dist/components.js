(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports)
    : typeof define === "function" && define.amd
    ? define(["exports"], factory)
    : ((global = typeof globalThis !== "undefined" ? globalThis : global || self), factory((global.ATComponents = {})));
})(this, function (exports) {
  "use strict";

  const DEFAULTS = {
    text: "Click",
    className: "",
    attrs: {},
    onClick: null,
  };

  class Button {
    constructor(options = {}) {
      this.opts = Object.assign({}, DEFAULTS, options);
      this.el = null;
    }

    render() {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = ["atc-button", this.opts.className].filter(Boolean).join(" ");
      btn.textContent = this.opts.text;
      Object.keys(this.opts.attrs || {}).forEach((k) => {
        btn.setAttribute(k, this.opts.attrs[k]);
      });
      if (typeof this.opts.onClick === "function") {
        btn.addEventListener("click", (evt) => this.opts.onClick(evt, this));
      }
      this.el = btn;
      return btn;
    }

    mount(target) {
      let node = typeof target === "string" ? document.querySelector(target) : target;
      if (!node) throw new Error("Target not found to mount button");
      node.appendChild(this.render());
      return this;
    }

    destroy() {
      if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
      this.el = null;
    }

    static create(options = {}) {
      return new Button(options);
    }
  }

  // Export directly
  exports.Button = Button;

  Object.defineProperty(exports, "__esModule", { value: true });
});
