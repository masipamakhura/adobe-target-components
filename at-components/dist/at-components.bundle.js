(function () {
  'use strict';

  function createButton({ label = "Click Me", onClick } = {}) {
    const button = document.createElement("button");
    button.className = "lib-btn";
    button.textContent = label;
    button.addEventListener("click", onClick || (() => alert(`You clicked ${label}`)));
    return button;
  }

  class Popup {
    constructor(options = {}) {
      const defaults = {
        ticketNumber: "0000",
        mboxAbandonedUser: "false",
        impressionID: "",
        triggerOnScroll: false,
        timeout: 10000,
        imgLeftLayout: false,
        secondaryCTABtn: false,
        useForAbandonedCart: false,
        allowClickOutsideToClose: true,
        activityName: "",
        content: {
          label: "",
          bgImage: "",
          heading: "",
          body: "",
          primaryCtaText: "",
          primaryCtaLink: "",
          secondaryCtaText: "",
          secondaryCtaLink: "",
          disclaimers: [],
        },
      };

      this.config = Object.assign({}, defaults, options);
      this.sessionKey = `currentSession_${this.config.ticketNumber}`;
      this.elements = {};
      this.notShownYet = false;
    }

    /** Initialize popup lifecycle */
    init() {
      this.checkActiveTabs();

      const eligible = (!this.config.useForAbandonedCart && this.notShownYet) || (this.config.mboxAbandonedUser === "true" && this.notShownYet);

      if (eligible) {
        this.track("pageload");
        this.injectPopup();
      } else if (this.shouldOverride()) {
        console.log("DEBUG MODE: Forcing popup render");
        this.injectPopup();
      } else {
        console.log("Popup not eligible to display");
      }
    }

    /** Allow "?override=true" for debugging in Target */
    shouldOverride() {
      return new URLSearchParams(window.location.search).get("override") === "true";
    }

    /** Dynamically inject popup into DOM */
    injectPopup() {
      if (document.querySelector(".popup-container")) return;

      this.injectStyles();
      const container = document.createElement("div");
      container.classList.add("popup-container", "hidden");
      container.id = `popup-${this.config.ticketNumber}`;
      container.innerHTML = this.template();

      document.body.appendChild(container);
      this.elements.container = container;

      this.attachEvents();

      if (this.config.triggerOnScroll) {
        window.addEventListener("scroll", () => this.loadPopup(), { once: true });
      } else {
        setTimeout(() => this.loadPopup(), this.config.timeout);
      }
    }

    /** Popup markup */
    template() {
      const c = this.config.content;
      return `
        <div class="modal">
          <div class="popup-heading">
            <div class="heading-content">
              <h1 class="heading-text">${c.label}</h1>
              <button class="btn-close" aria-label="Close popup">×</button>
            </div>
          </div>
          <div class="popup-content ${this.config.imgLeftLayout ? "imgLeft" : "imgRight"}">
            <div class="popup-content-left" style="background-image:url(${c.bgImage})"></div>
            <div class="popup-content-right">
              <div class="disclaimer-container closed"></div>
              <h2 class="popup-second-heading">${c.heading}</h2>
              <p class="body-text">${c.body}</p>
              <div class="popup-btn-group ${this.config.secondaryCTABtn ? "secBtn" : ""}">
                ${c.primaryCtaLink ? `<a href="${c.primaryCtaLink}" id="primary-cta" class="btnprimary">${c.primaryCtaText}</a>` : ""}
                ${c.secondaryCtaLink ? `<a href="${c.secondaryCtaLink}" id="secondary-cta" class="btn-secondary">${c.secondaryCtaText}</a>` : ""}
              </div>
            </div>
          </div>
        </div>`;
    }

    /** Setup event listeners */
    attachEvents() {
      const popup = this.elements.container;
      if (!popup) return;

      const primary = popup.querySelector("#primary-cta");
      const secondary = popup.querySelector("#secondary-cta");
      const closeBtn = popup.querySelector(".btn-close");
      const disclaimers = popup.querySelector(".disclaimer-container");
      const disclaimerBtns = popup.querySelectorAll(".disclaimers-btn");

      primary?.addEventListener("click", (e) => this.handleCtaClick(e, primary, "cta-click-primary"));
      secondary?.addEventListener("click", (e) => this.handleCtaClick(e, secondary, "cta-click-secondary"));
      closeBtn?.addEventListener("click", () => this.removePopup());

      disclaimerBtns.forEach((btn) => btn.addEventListener("click", (e) => this.toggleDisclaimers(e, disclaimers)));
    }

    /** Handle CTA clicks */
    handleCtaClick(e, cta, metric) {
      e.preventDefault();
      const href = cta.getAttribute("href");
      this.track(metric);
      this.removePopup();
      if (href) window.location.href = href;
    }

    /** Show disclaimers */
    toggleDisclaimers(event, container) {
      event.preventDefault();
      const id = parseInt(event.currentTarget.dataset.id, 10);
      const disclaimer = this.config.content.disclaimers[id];
      if (!disclaimer) return;

      container.innerHTML = `
        <div class="disclaimer-list">
          <button id="close-disclaimer" aria-label="Close disclaimer">×</button>
          <div>${disclaimer}</div>
        </div>`;
      container.classList.replace("closed", "active");

      container.querySelector("#close-disclaimer").addEventListener("click", () => {
        container.innerHTML = "";
        container.classList.replace("active", "closed");
      });
    }

    /** Display popup */
    loadPopup() {
      const modal = this.elements.container;
      if (!modal) return;

      modal.classList.remove("hidden");
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      this.disableScroll();

      if (this.config.allowClickOutsideToClose) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) this.removePopup();
        });
      }

      this.track("impression-xt-popin");
      localStorage.setItem(this.sessionKey, "true");
    }

    /** Remove popup */
    removePopup() {
      const modal = this.elements.container;
      if (modal) modal.remove();
      document.body.classList.remove("modal-open");
      this.enableScroll();
      this.track("popup-close");
    }

    /** Scroll helpers */
    disableScroll() {
      const scrollY = window.scrollY;
      document.body.dataset.scrollY = scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
    }

    enableScroll() {
      const scrollY = parseInt(document.body.dataset.scrollY || "0", 10);
      document.body.style.position = "";
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    }

    /** Analytics tracking */
    track(metric) {
      if (window._satellite && typeof _satellite.track === "function") {
        _satellite.track(metric);
      }
    }

    /** Check if popup already shown across tabs */
    checkActiveTabs() {
      const channel = new BroadcastChannel("session_channel");
      channel.onmessage = (event) => {
        if (event.data.sessionStarted) console.log("Popup shown in another tab");
      };
      window.addEventListener("beforeunload", () => channel.postMessage({ sessionEnded: true }));

      if (!localStorage.getItem(this.sessionKey)) {
        this.notShownYet = true;
        channel.postMessage({ sessionStarted: true });
      }
    }

    injectStyles() {
      if (document.getElementById("popup-styles")) return;
      const style = document.createElement("style");
      style.id = "popup-styles";
      style.textContent = `/*
   * POPIN TEMPLATE v0506202501.
   */

/* Hiding overlapping popups */
#sophus3LightBox,
#MDigitalInvitationWrapper,
#kampyleInviteContainer {
  display: none !important;
  margin-top: -1000% !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

#gtb-ci.popup-container {
  font-size: 14px !important;
  line-height: 1.5 !important;
}

/* General Modal & Popup Styles */
#gtb-ci {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  z-index: 1000000 !important;
  background-color: rgba(0, 0, 0, 0.7);
}

#gtb-ci h1,
#gtb-ci h2,
#gtb-ci h3,
#gtb-ci h4,
#gtb-ci h5,
#gtb-ci p {
  -webkit-font-smoothing: antialiased;
}

#gtb-ci .modal {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 90%;
  max-width: 768px;
  background-color: #fff;
  color: #00095b;
  border-radius: 24px;
  transform: translate(-50%, -50%);
  box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
  font-family: FordAntenna, Arial, Helvetica, sans-serif !important;
}

#gtb-ci.open {
  display: flex;
  opacity: 1;
}

#gtb-ci.hidden {
  display: none;
  opacity: 0;
}

#gtb-ci .popup-heading {
  border-bottom: 2px solid #eee;
}
.margin-medium {
  margin-bottom: 16px;
}

#gtb-ci .heading-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
}

#gtb-ci .btn-close {
  justify-content: center;
  align-items: center;
  display: flex;
  width: 40px;
  height: 40px;
  margin: 0 !important;
  padding: 0 !important;
  color: #1700f4;
  background: transparent;
  border: 3px solid #1700f4;
  border-radius: 50%;
  font-weight: bold;
}

#gtb-ci .btn-close:hover {
  color: #00095b;
  border-color: #00095b;
}

#gtb-ci .closed {
  display: none;
}

#gtb-ci .popup-content {
  display: flex;
  flex-direction: row;
  padding: 24px 24px;
  gap: 16px;
}

/* Image Right Layout. */
#gtb-ci .popup-content.imgRight {
  flex-direction: row-reverse;
}

#gtb-ci .popup-content-left {
  width: 100%;
  max-width: 300px;
  min-height: 284px;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  border-radius: 24px;
}

#gtb-ci .popup-content > div {
  flex: 1;
  padding: 0 24px;
}

#gtb-ci .popup-content-right {
  position: relative;
  display: block;
}
#gtb-ci .modal > div {
  margin: 0 !important;
}

#gtb-ci .popup-btn-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  align-items: start;
}

/* Typography */
#gtb-ci .modal .heading-text,
#gtb-ci .modal .pupup-second-heading {
  font-family: FordAntenna, Arial, Helvetica, sans-serif !important;
  color: #00095b;
  font-weight: 600 !important;
  line-height: 1.2 !important;
  letter-spacing: normal !important;
}

#gtb-ci .modal .heading-text,
#gtb-ci .modal .pupup-second-heading,
#gtb-ci .modal .body-text {
  margin: 0;
}

#gtb-ci .modal .heading-text {
  font-size: 18px;
}
#gtb-ci .modal .pupup-second-heading {
  font-size: 32px;
}

#gtb-ci .modal .body-text {
  font-size: 16px !important;
  font-weight: 400 !important;
  letter-spacing: 0.16px !important;
  line-height: 1.5 !important;
}

/* Buttons */
#gtb-ci .btnprimary,
#gtb-ci .btn-secondary {
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: auto;
  min-width: 180px;
  min-height: 40px;
  padding: 5px 24px;
  border-radius: 8000px;
  box-shadow: none;
  font-family: FordAntenna, Arial, Helvetica, sans-serif !important; /* overiding the button fonts on a page */
  color: #fff;
  text-align: center;
  will-change: transform, box-shadow;
  text-decoration: none;
  font-size: 14px !important;
  font-weight: 400;
}
#gtb-ci .btnprimary:hover,
#gtb-ci .btn-secondary:hover {
  transform: unset !important;
}

#gtb-ci #primary-cta {
  background-color: #1700f4;
  border-color: #1700f4;
  color: #fff;
  letter-spacing: 0.16px;
  line-height: 20px;
}

#gtb-ci #primary-cta:hover {
  background-color: #00095b;
  border-color: #00095b;
}

#gtb-ci #secondary-cta {
  width: fit-content !important;
  min-width: fit-content !important;
  min-height: unset;
  padding: 0;
  background-color: #fff;
  color: #1700f4;
  border: 0;
  border-bottom: 2px solid #1700f4 !important;
  border-radius: 0;
  letter-spacing: 0.16px;
  line-height: 20px;
}

#gtb-ci #secondary-cta:hover {
  color: #00095b;
  background-color: #fff;
  border-bottom: 2px solid #00095b !important;
}

/* Image Right Layout. */
#gtb-ci .popup-content.secBtn #secondary-cta {
  height: 36px;
  padding: 8px 14px;
  background-color: #fff;
  border: 2px solid #1700f4 !important;
  border-radius: 8000px;
  color: #1700f4;
}

/* Image Right Layout. */
#gtb-ci .popup-content.secBtn #secondary-cta:hover {
  background-color: #1700f4;
  color: #ffffff;
  transform: none;
}

/* Disclaimer */
#gtb-ci .disclaimer-container {
  position: absolute;
  top: 28%;
  left: 0;
  width: 100%;
  z-index: 400;
}

#gtb-ci #disclaimer-link {
  text-decoration: none;
  color: #1700f4;
}

#gtb-ci #disclaimer-link .asterisk {
  top: -0.35em !important;
  font-size: 14px !important;
}

#gtb-ci .disclaimer-list {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: flex-end;
  z-index: 200;
  background: #fff;
  box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
  border-radius: 24px;
  padding: 20px;
  font-size: 13px;
  color: #00095b;
  font-family: inherit;
  line-height: 1.5;
  letter-spacing: 0.16px;
  list-style: none;
}

#gtb-ci .disclaimer-list .disclaimer-list-item {
  font-weight: 300;
}

#gtb-ci .disclaimer-list .disclaimer-list-item p {
  font-size: 13px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
}

#gtb-ci #close-disclaimer {
  position: absolute;
  top: 0;
  right: 0;
  border: 0;
  outline: 0;
  background-color: transparent;
}

#gtb-ci .disclaimer-container.closed {
  display: none;
}
.sub-heading-copy {
  margin-bottom: 16px;
}
.body-copy-container {
  margin-bottom: 32px;
}
/* Responsive */

@media only screen and (max-width: 767px) {
  #gtb-ci {
    height: 100%;
    overflow: hidden;
  }

  #gtb-ci .heading-content {
    padding: 18px 24px;
  }

  #gtb-ci .btn-secondary,
  #gtb-ci #primary-cta {
    width: 100%;
    padding: 8px 16px;
  }

  #gtb-ci .btn-secondary {
    padding: 8px 0 0;
  }

  #gtb-ci .popup-btn-group {
    padding-bottom: 48px;
  }

  #gtb-ci .popup-content {
    flex-direction: column;
    padding: 16px 0 0 !important;
  }

  #gtb-ci .popup-content-left {
    display: none;
  }
  #gtb-ci .popup-content-right {
    position: relative;
    margin-top: 16px;
  }

  #gtb-ci .modal {
    top: unset;
    bottom: -16px;
    transform: translateX(-50%) translateY(100%);
    width: 100% !important;
    border-radius: 24px 24px 0 0;
    backface-visibility: hidden;
    animation: slideUp 0.6s ease-out forwards;
  }

  #gtb-ci .modal .pupup-second-heading {
    font-size: 24px;
  }

  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(100%);
    }
    to {
      transform: translateX(-50%) translateY(-16px);
    }
  }
}

@media only screen and (min-width: 1050px) {
  #gtb-ci .popup-content.imgRight .disclaimer-container {
    top: 0;
    transform: translate(90%);
  }

  #gtb-ci .popup-content.imgLeft .disclaimer-container {
    top: 0;
    transform: translate(-90%);
  }
}

/* Overiding the hight screens */
@media screen and (min-width: 1200px) {
  #gtb-ci .disclaimer-list .disclaimer-list-item p {
    font-size: 13px !important;
    font-weight: 400 !important;
    line-height: 1.5 !important;
  }
}
`;
      document.head.appendChild(style);
    }
  }

  // Expose globally for Adobe Target usage
  //module.exports = global.Popup = Popup;

  /* const summerPopup = new Popup({
    ticketNumber: "3252",
    impressionID: "${campaign.recipe.name}",
    timeout: 8000,
    triggerOnScroll: false,
    imgLeftLayout: true,
    allowClickOutsideToClose: true,
    content: {
      label: "Get a FREE Cleaning Kit with a Ford service!",
      bgImage: "/content/dam/.../summer-hero.jpg",
      heading: "Summer starts with a ready Ford.",
      body: `Book your service now and receive a <b>FREE cleaning kit!</b>
             <a data-id="0" class="disclaimers-btn"><sup>*</sup></a>`,
      primaryCtaText: "Book Now",
      primaryCtaLink: "/support/book-a-service?vc=SUMMERCLEAN",
      secondaryCtaText: "No, thanks",
      secondaryCtaLink: "",
      disclaimers: [
        "<p>[*] Offer valid for online bookings made before 15/08/2025.</p>",
      ],
    },
  });

  summerPopup.init();
  */

  (function (global) {
    global.atComp = {
      createButton,
      Popup,
    };
  })(window);

})();
