import type { Config } from "tailwindcss";

/**
 * Tailwind theme maps DESIGN_SYSTEM.md tokens to utilities.
 * Colors reference CSS variables defined in globals.css so the design tokens
 * remain the single source of truth (DESIGN_SYSTEM §1). Do not hardcode hex
 * values in components — consume these tokens.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-disabled": "var(--color-text-disabled)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          subtle: "var(--color-primary-subtle)",
        },
        focus: "var(--color-focus-ring)",
        success: {
          DEFAULT: "var(--color-success)",
          subtle: "var(--color-success-subtle)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          subtle: "var(--color-warning-subtle)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          subtle: "var(--color-danger-subtle)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          subtle: "var(--color-info-subtle)",
        },
        neutral: {
          DEFAULT: "var(--color-neutral)",
          subtle: "var(--color-neutral-subtle)",
        },
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(26, 29, 33, 0.06), 0 1px 3px 0 rgba(26, 29, 33, 0.08)",
        md: "0 4px 12px -2px rgba(26, 29, 33, 0.12)",
        lg: "0 12px 32px -4px rgba(26, 29, 33, 0.18)",
      },
      fontSize: {
        display: ["28px", { lineHeight: "36px", fontWeight: "600" }],
        h1: ["22px", { lineHeight: "30px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "26px", fontWeight: "600" }],
        h3: ["15px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "22px" }],
        "body-sm": ["13px", { lineHeight: "20px" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      maxWidth: {
        content: "1440px",
      },
      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

export default config;
