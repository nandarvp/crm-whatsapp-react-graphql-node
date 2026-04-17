/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        "primary-white": "#fff",
        "dark-color-shade-1": "#8f95b2",
        brand2: "#3d455b",
      },
    },
    screens: {
      mq450: {
        raw: "screen and (max-width: 450px)",
      },
      mq825: {
        raw: "screen and (min-width: 451px) and (max-width: 825px)",
      },
      lg: {
        raw: "screen and (min-width: 826px) and (max-width: 1200px)",
      },
      mq1425: {
        raw: "screen and (min-width: 1201px) and (max-width: 1425px)",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};
