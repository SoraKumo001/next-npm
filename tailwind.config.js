/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  daisyui: {
    logs: false,
  },
  plugins: [daisyui],
};
