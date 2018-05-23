const Snapshotter = require('../../base/factory/Snapshotter');
const ADBScreenshot = require('./ADBScreenshot');

class ADBScreenshotter extends Snapshotter {
  constructor(config) {
    super(config);

    this.adb = config.adb;
    this.deviceId = config.deviceId;
    this._screenshotsCounter = 0;
  }

  async createSnapshot() {
    return new ADBScreenshot({
      adb: this.adb,
      deviceId: this.deviceId,
      pathToScreenshotOnDevice: this._generatePathOnDevice(),
    });
  }

  _generatePathOnDevice() {
    return `/sdcard/${this._screenshotsCounter++}.png`;
  }
}

module.exports = ADBScreenshotter;