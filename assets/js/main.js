(function () {
  const cfg = window.SITE_CONFIG || {};

  // ✅ MXN only
  const FIXED_CURRENCY = "MXN";

  // ✅ Auto-detect basePath:
  // - On github.io repos: "/<repo>"
  // - On custom domains: ""
  const isGithub = location.hostname.endsWith("github.io");
  const repo = isGithub ? (location.pathname.split("/")[1] || "") : "";
  const basePath = isGithub && repo ? ("/" + repo) : "";

  function withBase(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;

    // Only rewrite absolute site paths like "/kit/" or "/assets/img/x.png"
    if (path.startsWith("/")) {
      if (basePath && !path.startsWith(basePath + "/")) return basePath + path;
      return path;
    }

    // If it's already relative ("kit/", "../assets/...") leave it
    return path;
  }

  function formatPrice(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 2 });
    // If you want NO decimals, use:
    // return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
  }

  function updatePricesAndLinks() {
    const currency = FIXED_CURRENCY;
    document.documentElement.setAttribute("data-currency", currency);

    // Prices
    const prices = cfg.PRICES || {};
    document.querySelectorAll("[data-price-key]").forEach((el) => {
      const key = el.getAttribute("data-price-key");
      const raw = prices?.[key]?.[currency];

      // ✅ accept numbers OR strings like "795.62"
      if (raw !== undefined && raw !== null && raw !== "") {
        el.textContent = formatPrice(raw);
      }
    });

    // Stripe links
    const links = cfg.STRIPE_LINKS || {};
    document.querySelectorAll("[data-checkout-key]").forEach((a) => {
      const key = a.getAttribute("data-checkout-key");
      const url = links?.[key]?.[currency] || "";

      if (url && typeof url === "string" && url.trim().length > 0) {
        a.setAttribute("href", url.trim());
        a.removeAttribute("aria-disabled");
        a.classList.remove("disabled");
      } else {
        a.setAttribute("href", "#");
        a.setAttribute("aria-disabled", "true");
        a.classList.add("disabled");
        a.setAttribute("title", "Add your MXN Stripe link in assets/js/config.js");
      }
    });

    // Internal hrefs (only if you still use data-base-href)
    document.querySelectorAll("[data-base-href]").forEach((a) => {
      const raw = a.getAttribute("data-base-href");
      if (raw) a.setAttribute("href", withBase(raw));
    });

    // Images (only if you still use data-base-src)
    document.querySelectorAll("[data-base-src]").forEach((img) => {
      const raw = img.getAttribute("data-base-src");
      if (raw) img.setAttribute("src", withBase(raw));
    });
  }

  // Mobile menu
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      const isOpen = mobileMenu.style.display === "block";
      mobileMenu.style.display = isOpen ? "none" : "block";
      menuBtn.setAttribute("aria-expanded", String(!isOpen));
    });
    mobileMenu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        mobileMenu.style.display = "none";
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Guide form (unchanged)
  async function postGuideLead(payload) {
    const url = cfg.GUIDE_LEAD_WEBHOOK_URL;
    if (!url || !/^https?:\/\//i.test(url)) return { ok: false, reason: "no_webhook" };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  }

  const guideForm = document.getElementById("guideLeadForm");
  if (guideForm) {
    guideForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const status = document.getElementById("guideStatus");
      const btn = guideForm.querySelector("button[type='submit']");
      if (btn) btn.disabled = true;

      const data = Object.fromEntries(new FormData(guideForm).entries());
      const payload = Object.assign({}, data, {
        page: window.location.href,
        ts: new Date().toISOString(),
        currency: FIXED_CURRENCY,
      });

      try {
        const out = await postGuideLead(payload);
        if (status) {
          status.style.display = "block";
          if (out.ok) {
            status.textContent = "✅ Listo. Revisa tu correo.";
            status.style.borderColor = "rgba(25,230,192,.30)";
          } else {
            status.textContent = "⚠️ Hubo un error. Intenta de nuevo o escribe a " + (cfg.SUPPORT_EMAIL || "soporte") + ".";
            status.style.borderColor = "rgba(255,80,80,.35)";
          }
        }
      } catch (err) {
        if (status) {
          status.style.display = "block";
          status.textContent = "⚠️ Error de red. Intenta de nuevo o escribe a " + (cfg.SUPPORT_EMAIL || "soporte") + ".";
          status.style.borderColor = "rgba(255,80,80,.35)";
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  updatePricesAndLinks();

  const yr = document.getElementById("yr");
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
