import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",  // ← THIS LINE IS CRITICAL
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;