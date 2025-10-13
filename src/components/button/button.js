// src/components/button/button.js
const DEFAULTS = {
  text: "Click",
  className: "",
  attrs: {}, // additional attributes
  onClick: null,
};

export default class Button {
  constructor(options = {}) {
    this.opts = Object.assign({}, DEFAULTS, options);
    this.el = null;
  }

  render() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = ["atc-button", this.opts.className].filter(Boolean).join(" ");
    btn.textContent = this.opts.text;

    // attach attrs
    Object.keys(this.opts.attrs || {}).forEach((k) => {
      btn.setAttribute(k, this.opts.attrs[k]);
    });

    // attach click
    if (typeof this.opts.onClick === "function") {
      btn.addEventListener("click", (evt) => this.opts.onClick(evt, this));
    }

    this.el = btn;
    return btn;
  }

  mount(target) {
    // target can be selector or element
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
