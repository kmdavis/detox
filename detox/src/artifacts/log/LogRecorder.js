const Recorder = require('../core/Recorder');

/***
 * @abstract
 */
class LogRecorder extends Recorder {
  async saveTestRecording(recording, testSummary) {
    const filename = await this.preparePathForArtifact('test.log', testSummary);
    await this.saveRecording(recording, filename);
  }

  async saveStartupRecording(recording) {
    const filename = await this.preparePathForArtifact('startup.log');
    await this.saveRecording(recording, filename);
  }

  /***
   * @abstract
   */
  saveRecording(recording, filename) {}
}

module.exports = LogRecorder;