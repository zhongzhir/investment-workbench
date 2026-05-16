import type { Config } from "tailwindcss";

// 设计风格：干净、专注、以文档为中心，参考 Notion，大量留白。
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 中性色为主，弱化色彩，突出文档内容
        canvas: "#ffffff",
        surface: "#f7f7f5",
        ink: {
          DEFAULT: "#37352f",
          soft: "#787774",
          faint: "#9b9a97",
        },
        line: "#e9e9e7",
        accent: {
          DEFAULT: "#2f6f4f",
          soft: "#eef4f0",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      maxWidth: {
        doc: "760px",
      },
    },
  },
  plugins: [],
};

export default config;
