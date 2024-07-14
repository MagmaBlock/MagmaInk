import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
  title: "熔岩墨迹",
  subtitle: "Magma Ink",
  lang: "zh_CN", // 'en', 'zh_CN', 'zh_TW', 'ja'
  themeColor: {
    hue: 50, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
    fixed: false, // Hide the theme color picker for visitors
  },
  banner: {
    enable: true,
    src: "/background/hyory-liu-n4018exJ9kw-unsplash.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
    position: "top", // Equivalent to object-position, defaults center
  },
  favicon: [
    // Leave this array empty to use the default favicon
    // {
    //   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
    //   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
    //   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
    // }
  ],
};

export const navBarConfig: NavBarConfig = {
  links: [
    LinkPreset.Home,
    LinkPreset.Archive,
    {
      name: "友联",
      url: "/links/",
    },
    LinkPreset.About,
    {
      name: "开往",
      url: "https://www.travellings.cn/go.html",
      external: true,
    },
    // {
    // 	name: "GitHub",
    // 	url: "https://github.com/saicaca/fuwari", // Internal links should not include the base path, as it is automatically added
    // 	external: true, // Show an external link icon and will open in a new tab
    // },
  ],
};

export const profileConfig: ProfileConfig = {
  avatar: "assets/images/avatar.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
  name: "岩浆块Magma",
  bio: "为美好的生活献礼",
  links: [
    {
      name: "Bilibili",
      icon: "fa6-brands:bilibili",
      url: "https://space.bilibili.com/6281315",
    },
    {
      name: "Acfun",
      icon: "fa6-solid:a",
      url: "https://www.acfun.cn/u/14378861",
    },
    {
      name: "GitHub",
      icon: "fa6-brands:github",
      url: "https://github.com/MagmaBlock",
    },

    {
      name: "Mastodon",
      icon: "fa6-brands:mastodon",
      url: "https://hydrate.space/@magma",
    },
  ],
};

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: "CC BY-NC-SA 4.0",
  url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};
