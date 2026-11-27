// https://github.com/react-native-community/cli/blob/main/docs/dependencies.md

module.exports = {
  dependency: {
    platforms: {
      /**
       * @type {import('@react-native-community/cli-types').IOSDependencyParams}
       */
      ios: {},
      /**
       * @type {import('@react-native-community/cli-types').AndroidDependencyParams}
       */
      android: {
        // No Fabric components here. Skipping the descriptor scan also stops
        // the CLI from globbing the whole repo, which loops forever through
        // the example's SwiftPM autolinking symlink back to this root.
        componentDescriptors: [],
      },
    },
  },
}
