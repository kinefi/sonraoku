// Custom Metro transformer that serves specific files as raw string modules.
// Used to inline @mozilla/readability/Readability.js without a postinstall script.

const upstreamTransformer = require(
  require('expo/metro-config').getDefaultConfig(__dirname).transformer.babelTransformerPath
);
const fs = require('fs');

const RAW_STRING_FILES = [
  /@mozilla\/readability\/Readability\.js$/,
];

module.exports.transform = async function transform(params) {
  if (RAW_STRING_FILES.some((pattern) => pattern.test(params.filename))) {
    const raw = fs.readFileSync(params.filename, 'utf-8');
    return upstreamTransformer.transform({
      ...params,
      src: `module.exports = ${JSON.stringify(raw)};`,
    });
  }
  return upstreamTransformer.transform(params);
};
