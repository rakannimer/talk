const path = require("path");

exports.onCreateWebpackConfig = args => {
  args.actions.setWebpackConfig({
    resolve: {
      modules: [path.resolve(__dirname, "../src"), "node_modules"],
      alias: {
        "coral-ui": path.resolve(__dirname, "../src/core/client/ui"),
        "coral-common": path.resolve(__dirname, "../src/core/common"),
      },
    },
  });
};
