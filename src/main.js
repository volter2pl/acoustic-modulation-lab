import { AcousticModulationApp } from "./app.js";
import { applyDocumentTranslations, createI18n, getLanguage } from "./i18n.js";

const i18n = createI18n(getLanguage(window.location.search));
applyDocumentTranslations(document, i18n, window.location);
new AcousticModulationApp(i18n).start();
