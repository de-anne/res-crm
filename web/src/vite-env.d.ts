/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API for split hosting, e.g. https://res-crm-api.onrender.com */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
