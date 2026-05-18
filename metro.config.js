const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude zware mappen van file watching — dit is de primaire fix voor EMFILE
config.watchFolders = [__dirname];

config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  /backend\/node_modules\/.*/,
  /backend\/dist\/.*/,
  /\.git\/.*/,
];

// Beperk het aantal workers om file handles te verminderen
config.maxWorkers = 2;

// Verhoog de transform cache — minder herhaald werk
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: { keep_fnames: true },
  },
};

module.exports = config;
