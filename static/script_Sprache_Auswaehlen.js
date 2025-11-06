// ../static/script_Sprache_Auswaehlen.js
(() => {
  const DEFAULT_LANG = "de";
  const SUPPORTED = ["de", "en"];

  // Sprachdateien liegen in /static/Sprachdateien/
  const I18N_PATH = "/static/Sprachdateien";

  const state = {
    lang: null,
    dict: null
  };

  const getSavedLang = () => localStorage.getItem("lang");
  const saveLang = (lang) => localStorage.setItem("lang", lang);

  const resolve = (obj, path) =>
    path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);

  const setHtmlLangDir = (lang) => {
    document.documentElement.setAttribute("lang", lang);
    const rtlLangs = ["ar", "he", "fa", "ur"];
    document.documentElement.setAttribute("dir", rtlLangs.includes(lang) ? "rtl" : "ltr");
  };

  const fetchDict = async (lang) => {
    const safeLang = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
    const url = `${I18N_PATH}/messages.${safeLang}.json`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`i18n: Could not load ${url} (${res.status})`);
    return res.json();
  };

  const applyText = (el, value) => {
    if (el.dataset.i18nHtml === "true" || /<[^>]*>/.test(value)) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  };

  const applyTranslations = (dict) => {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      const val = resolve(dict, key);
      if (val == null) return;

      if (Array.isArray(val)) {
        applyText(el, val.map((item) => `<li>${item}</li>`).join(""));
      } else {
        applyText(el, String(val));
      }
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const mappings = el.dataset.i18nAttr.split(",").map((s) => s.trim());
      mappings.forEach((map) => {
        const [attr, key] = map.split(":").map((s) => s.trim());
        const val = resolve(dict, key);
        if (val != null) el.setAttribute(attr, String(val));
      });
    });

    const langSel = document.getElementById("lang-switcher");
    if (langSel) {
      [...langSel.options].forEach((opt) => {
        const key = opt.dataset.i18n;
        if (!key) return;
        const val = resolve(dict, key);
        if (val != null) opt.textContent = String(val);
      });
      langSel.value = state.lang;
    }
  };

  const registerGlobalAPI = () => {
    window.I18N = {
      get lang() { return state.lang; },
      get dict() { return state.dict; },
      t(key, fallback) {
        const val = resolve(state.dict, key);
        return val != null ? (Array.isArray(val) ? val : String(val)) : (fallback ?? key);
      }
    };
  };

  const dispatchLangChanged = () => {
    window.dispatchEvent(new CustomEvent("i18n:changed", {
      detail: { lang: state.lang }
    }));
  };

  const loadAndApply = async (lang) => {
    state.lang = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
    setHtmlLangDir(state.lang);

    try {
      state.dict = await fetchDict(state.lang);
      applyTranslations(state.dict);
      registerGlobalAPI();
      dispatchLangChanged();
    } catch (e) {
      console.error(e);
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const langSel = document.getElementById("lang-switcher");
    const initial =
      getSavedLang() ||
      (navigator.language || navigator.userLanguage || "de").slice(0, 2);

    const startLang = SUPPORTED.includes(initial) ? initial : DEFAULT_LANG;

    if (langSel) langSel.value = startLang;

    await loadAndApply(startLang);
    saveLang(startLang);

    if (langSel) {
      langSel.addEventListener("change", async (e) => {
        const newLang = e.target.value;
        saveLang(newLang);
        await loadAndApply(newLang);
      });
    }
  });
})();
