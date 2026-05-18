const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude zware mappen van file watching — fix voor EMFILE
config.watchFolders = [__dirname];

// SDK 54 / RN 0.81: blockList is de correcte API naam
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  /backend\/node_modules\/.*/,
  /backend\/dist\/.*/,
  /\.git\/.*/,
];

// Beperk workers om file handles te verminderen
config.maxWorkers = 2;

module.exports = config;
