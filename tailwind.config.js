const colors = require("tailwindcss/colors")
const { themeVariants } = require("tailwindcss-theme-variants")
module.exports = {
  mode: "jit",
  purge: {
    content: ['./views/**/*.ejs']
  },
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: "#000",
      white: "#fff",
      bluegray: colors.blueGray,
      coolgray: colors.coolGray,
      gray: colors.gray,
      truegray: colors.trueGray,
      warmgray: colors.warmGray,
      red: colors.red,
      orange: colors.orange,
      amber: colors.amber,
      yellow: colors.yellow,
      lime: colors.lime,
      green: colors.green,
      emerald: colors.emerald,
      teal: colors.teal,
      cyan: colors.cyan,
      sky: colors.sky,
      blue: colors.blue,
      indigo: colors.indigo,
      violet: colors.violet,
      purple: colors.purple,
      fuchsia: colors.fuchsia,
      pink: colors.pink,
      rose: colors.rose,
      darkBlue: {
        primary: '#090c10',
        secondary: '#161b22'
      },
    },
    fontFamily: {
      'sans': ["Inter var", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"],
    },
    screens: {
      '2xl': { 'max': '1535px' },
      'xl': { 'max': '1279px' },
      'my': { 'max': '940px' },
      'lg': { 'max': '1023px' },
      'md': { 'max': '767px' },
      'sm': { 'max': '639px' },
      'xsm': { 'max': '400px' },
      'xxsm': { 'max': '250px' },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    themeVariants({
      themes: {
        wmsu: {
          selector: ".wmsu",
        }
      },
    }),
  ],
}