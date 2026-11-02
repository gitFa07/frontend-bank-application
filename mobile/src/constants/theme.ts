// Material 3 tokens from the Google Pay UI kit, shared with the web app (src/index.css).

const light = {
  bg: '#ffffff',
  surface: '#f0f4f9',
  surface2: '#e9eef6',
  tonal: '#d3e3fd',
  onTonal: '#041e49',
  primary: '#0b57d0',
  onPrimary: '#ffffff',
  ink: '#1f1f1f',
  muted: '#444746',
  subtle: '#747775',
  line: '#e1e3e1',
  success: '#146c2e',
  successTonal: '#c4eed0',
  danger: '#b3261e',
  dangerTonal: '#f9dedc',
  warn: '#7c5800',
  warnTonal: '#ffefc9',
  bannerFrom: '#c2e7ff',
  bannerTo: '#eef6ff',
  nav: '#f0f4f9',
  scrim: 'rgba(0,0,0,0.4)',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#131314',
  surface: '#1e1f20',
  surface2: '#282a2c',
  tonal: '#004a77',
  onTonal: '#c2e7ff',
  primary: '#a8c7fa',
  onPrimary: '#062e6f',
  ink: '#e3e3e3',
  muted: '#c4c7c5',
  subtle: '#8e918f',
  line: '#444746',
  success: '#6dd58c',
  successTonal: '#0f5223',
  danger: '#f2b8b5',
  dangerTonal: '#8c1d18',
  warn: '#ffdf99',
  warnTonal: '#594400',
  bannerFrom: '#0a3a5c',
  bannerTo: '#131314',
  nav: '#1e1f20',
  scrim: 'rgba(0,0,0,0.6)',
};

export const palettes = { light, dark };

// Avatar fills from the kit's contact list.
export const AVATAR_COLORS = ['#b5164e', '#0f5132', '#0b57d0', '#5b3cc4', '#b3541e', '#00696b'];

// Google blue, red, yellow, green, used for accents and the success burst.
export const BRAND_ACCENTS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];
