
class ADBLogcatRecording extends RecordingArtifact {
  constructor({
    adb,
    deviceId,
    pathToLogOnDevice,
    processId,
  }) {
    super();

    this.adb = adb;
    this.deviceId = deviceId;
    this.pathToLogOnDevice = pathToLogOnDevice;
    this.processId = processId;
    this.processPromise = null;
  }


}

module.exports = ADBLogcatRecording;