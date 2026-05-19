#!/bin/bash
set -e

OLD="/Users/jamo/check-your-fit"
NEW="/Users/jamo/CheckYourFit"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Check Your Fit — migratie naar nieuw project ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Sanity checks ──────────────────────────────────────────────────────────────
if [ ! -d "$OLD" ]; then
  echo "❌  Oud project niet gevonden op: $OLD"
  exit 1
fi
if [ ! -d "$NEW" ]; then
  echo "❌  Nieuw project niet gevonden op: $NEW"
  exit 1
fi

echo "Oud project : $OLD"
echo "Nieuw project: $NEW"
echo ""

# ── 1. Schermen + code kopiëren ────────────────────────────────────────────────
echo "▶ Schermen kopiëren (app/)..."
rm -rf "$NEW/app"
cp -r "$OLD/app" "$NEW/app"

echo "▶ Broncode kopiëren (src/)..."
rm -rf "$NEW/src"
cp -r "$OLD/src" "$NEW/src"

echo "▶ Assets kopiëren..."
cp "$OLD/assets/notification-icon.png" "$NEW/assets/" 2>/dev/null || true
cp "$OLD/assets/splash.png"            "$NEW/assets/" 2>/dev/null || true

# ── 2. Config files ────────────────────────────────────────────────────────────
echo "▶ babel.config.js kopiëren (reanimated plugin)..."
cat > "$NEW/babel.config.js" << 'EOF'
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
EOF

echo "▶ metro.config.js schrijven (EMFILE fix)..."
cat > "$NEW/metro.config.js" << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  /\.git\/.*/,
];

config.maxWorkers = 2;

module.exports = config;
EOF

echo "▶ .npmrc schrijven..."
cat > "$NEW/.npmrc" << 'EOF'
legacy-peer-deps=true
engine-strict=false
EOF

echo "▶ .watchmanconfig schrijven..."
cat > "$NEW/.watchmanconfig" << 'EOF'
{ "ignore_dirs": ["node_modules", ".git", "android", "ios", ".expo"] }
EOF

# ── 3. index.ts — expo-router entry point ──────────────────────────────────────
echo "▶ index.ts schrijven (expo-router entry)..."
cat > "$NEW/index.ts" << 'EOF'
import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

renderRootComponent(App);
EOF

# ── 4. tsconfig.json — path alias @/* → src/* ──────────────────────────────────
echo "▶ tsconfig.json bijwerken (path aliases)..."
node - << 'JS'
const fs   = require('fs');
const file = process.env.NEW + '/tsconfig.json';
const cfg  = JSON.parse(fs.readFileSync(file, 'utf8'));
cfg.compilerOptions = cfg.compilerOptions || {};
cfg.compilerOptions.strict = true;
cfg.compilerOptions.paths  = { '@/*': ['./src/*'] };
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
console.log('  tsconfig.json bijgewerkt');
JS

# ── 5. package.json — afhankelijkheden samenvoegen ─────────────────────────────
echo "▶ package.json bijwerken (dependencies)..."
node - << 'JS'
const fs   = require('fs');
const file = process.env.NEW + '/package.json';
const pkg  = JSON.parse(fs.readFileSync(file, 'utf8'));

// Vereiste deps die Check Your Fit nodig heeft
const deps = {
  'expo-router':                    '~6.0.23',
  'react-dom':                      '19.1.0',
  'expo-splash-screen':             '~31.0.13',
  'expo-constants':                 '~18.0.13',
  'expo-linking':                   '~8.0.12',
  '@expo/metro-runtime':            '~6.1.2',
  'react-native-safe-area-context': '~5.6.0',
  'react-native-screens':           '~4.16.0',
  'react-native-reanimated':        '~4.1.1',
  'react-native-worklets':          '0.5.1',
  'react-native-gesture-handler':   '~2.28.0',
  'zustand':                        '^4.5.2',
  '@tanstack/react-query':          '^5.28.0',
  'expo-camera':                    '~17.0.10',
  'expo-image-picker':              '~17.0.11',
  'expo-location':                  '~19.0.8',
  'expo-notifications':             '~0.32.17',
  'expo-localization':              '~17.0.8',
  'i18n-js':                        '^4.4.3',
  '@expo/vector-icons':             '^15.0.3',
  'expo-secure-store':              '~15.0.8',
  'date-fns':                       '^3.6.0',
  'expo-haptics':                   '~15.0.8',
  'axios':                          '^1.6.8',
  'expo-font':                      '~14.0.11',
  '@expo-google-fonts/fraunces':    '^0.2.3',
};

const devDeps = {
  '@babel/core':       '^7.24.0',
  'babel-preset-expo': '~54.0.10',
};

pkg.main = 'index.ts';
pkg.dependencies    = { ...pkg.dependencies,    ...deps };
pkg.devDependencies = { ...pkg.devDependencies, ...devDeps };

fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
console.log('  package.json bijgewerkt');
JS

# ── 6. app.json — scheme, slug en plugins toevoegen ───────────────────────────
echo "▶ app.json bijwerken (expo-router plugins)..."
node - << 'JS'
const fs   = require('fs');
const file = process.env.NEW + '/app.json';
const cfg  = JSON.parse(fs.readFileSync(file, 'utf8'));

cfg.expo.name   = 'Check Your Fit';
cfg.expo.slug   = 'check-your-fit';
cfg.expo.scheme = 'checkyourfit';
cfg.expo.newArchEnabled = true;

// Splash
cfg.expo.splash = {
  image: './assets/splash.png',
  resizeMode: 'contain',
  backgroundColor: '#F8F7F5',
};

// iOS / Android tweaks
cfg.expo.ios = cfg.expo.ios || {};
cfg.expo.ios.supportsTablet = false;

cfg.expo.android = cfg.expo.android || {};
cfg.expo.android.edgeToEdgeEnabled = true;
cfg.expo.android.predictiveBackGestureEnabled = false;

// Web
cfg.expo.web = { bundler: 'metro', output: 'static', favicon: './assets/favicon.png' };

// Plugins
cfg.expo.plugins = [
  'expo-router',
  'expo-font',
  ['expo-camera',       { cameraPermission: 'Allow Check Your Fit to access your camera to scan clothing items.' }],
  ['expo-image-picker', { photosPermission:  'Allow Check Your Fit to access your photos to add clothing items.' }],
  ['expo-location',     { locationWhenInUsePermission: 'Allow Check Your Fit to access your location for weather-based outfit suggestions.' }],
  ['expo-notifications',{ icon: './assets/notification-icon.png', color: '#2C2C2C' }],
];

fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
console.log('  app.json bijgewerkt');
JS

# ── 7. Installeren ─────────────────────────────────────────────────────────────
echo ""
echo "▶ npm install uitvoeren..."
cd "$NEW"
npm install

# ── 8. Klaar ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅  Migratie geslaagd!                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Start de app:"
echo "  cd $NEW"
echo "  npx expo start --clear"
echo ""
