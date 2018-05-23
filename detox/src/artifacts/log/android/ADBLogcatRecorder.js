const interruptProcess = require('../../../utils/interruptProcess');
const sleep = require('../../../utils/sleep');
const LogRecorder = require('../LogRecorder');

class ADBLogcatRecorder extends LogRecorder {
  constructor(config) {
    super(config);

    this.adb = config.adb;
    this._logsCounter = 0;
  }

  onAppLaunch({ processId, bundleId }) {
    this._processId = processId;
    this._bundleId = bundleId;
  }

  createStartupRecording() {
    return this._createRecording(true);
  }

  createTestRecording() {
    return this._createRecording(false);
  }

  _createRecording(fromBeginning) {
    return {
      fromBeginning,
      deviceId: this.api.device.id,
      processId: this._processId,
      pathToLogOnDevice: this._generatePathOnDevice(),
      processPromise: null,
    };
  }

  async startRecording(recording) {
    const now = await this.adb.shell(recording.deviceId, `date "+\\"%Y-%m-%d %T.000\\""`);

    recording.processPromise = this.adb.logcat(recording.deviceId, {
      file: recording.pathToLogOnDevice,
      pid: recording.processId,
      time: now,
    });

    await this._waitUntilLogFileIsCreated();
  }

  async stopRecording(recording) {
    if (recording.processPromise) {
      await interruptProcess(recording.processPromise);
    }
  }

  async saveRecording(recording, artifactPath) {
    await this._waitWhileLogIsOpenedByLogcat();
    await this.adb.pull(this.deviceId, this.pathToLogOnDevice, artifactPath);
    await this.adb.rm(this.deviceId, this.pathToLogOnDevice);
  }

  async discardRecording() {
    await this._waitWhileLogIsOpenedByLogcat();
    await this.adb.rm(this.deviceId, this.pathToLogOnDevice);
  }

  async _waitUntilLogFileIsCreated(recording) {
    let size;

    do {
      size = await this.adb.getFileSize(recording.deviceId, recording.pathToLogOnDevice);
      await sleep(100);
    } while (size === -1);
  }

  async _waitWhileLogIsOpenedByLogcat(recording) {
    let isFileOpen;

    do {
      isFileOpen = await this.adb.isFileOpen(recording.deviceId, recording.pathToLogOnDevice);
      await sleep(500);
    } while (isFileOpen);
  }

  _generatePathOnDevice() {
    return `/sdcard/${this._logsCounter++}.log`;
  }
}

module.exports = ADBLogcatRecorder;
