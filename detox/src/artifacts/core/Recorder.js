const fs = require('fs-extra');
const path = require('path');

class Recorder {
  constructor({
    artifactsManagerApi,
  }) {
    this.api = artifactsManagerApi;

    this.recordings = [];
    this.activeRecordings = [];
    this.startupRecording = null;
    this.currentRecording = null;

    this._hasFailingTests = false;
  }

  /***
   * @public
   */
  async onStart() {
    if (this.shouldRecordStartup()) {
      await this._beginRecordingStartup();
    }
  }

  /***
   * @public
   */
  async onBeforeTest(testSummary) {
    if (this.isRecordingStartup()) {
      await this.stopRecording(this.startupRecording);
      this.currentRecording = null;
      this._checkIfCanStartSavingStartupRecording();
    }

    if (this.shouldRecordTest(testSummary)) {
      await this._beginRecordingTest(testSummary);
    }
  }

  /***
   * @public
   */
  async onAfterTest(testSummary) {
    this._checkIfTestFailed(testSummary);

    if (this.currentRecording != null) {
      await this.stopRecording(this.currentRecording);
    }

    if (this.startupRecording != null) {
      this._checkIfCanStartSavingStartupRecording();
    }

    if (this.currentRecording != null) {
      this._finalizeTestRecording(testSummary);
    }
  }

  /***
   * @public
   */
  async onExit() {
    if (this.startupRecording != null) {
      this._finalizeStartupRecording();
    }
  }

  /***
   * @public
   */
  async onAppLaunch({ bundleId, pid }) {}

  /***
   * @public
   */
  onEmergencyExit() {
    for (const recording of this.activeRecordings) {
      this.killRecording(recording);
    }
  }

  isRecordingStartup() {
    return this.startupRecording != null && this.currentRecording === this.startupRecording;
  }

  /***
   * @protected
   */
  restartCurrentRecording() {
    if (this.isRecordingStartup()) {
    }
    if (this.currentRecording != null) {
      this.stopRecording(this.currentRecording);
    }

  }

  /***
   * @protected
   */
  hasFailingTests() {
    return this._hasFailingTests;
  }

  /***
   * @protected
   */
  isEnabled() {
    return false;
  }

  /***
   * @protected
   */
  shouldRecordStartup() {
    return false;
  }

  /***
   * @protected
   */
  shouldRecordTest(testSummary) {
    return this.isEnabled();
  }

  /***
   * @protected
   */
  shouldKeepOnlyFailedTestArtifacts() {
    return false;
  }

  /***
   * @protected
   */
  shouldKeepStartupRecording() {
    if (this.shouldKeepOnlyFailedTestArtifacts() && !this.hasFailingTests) {
      return false;
    }

    return true;
  }

  /***
   * @protected
   */
  shouldKeepTestRecording(testSummary) {
    const testStatus = testSummary.status;

    if (this.shouldKeepOnlyFailedTestArtifacts() && testStatus !== 'failed') {
      return false;
    }

    return true;
  }

  /***
   * @protected
   * @abstract
   */
  async preparePathForArtifact(artifactFilename, testSummary) {
    const filepath = testSummary
      ? this.api.path.buildPathForTestArtifact(testSummary, artifactFilename)
      : this.api.path.buildPathForRunArtifact(artifactFilename);

    const dirpath = path.dirname(filepath);
    await fs.ensureDir(dirpath);
  }

  /***
   * @protected
   */
  createStartupRecording() {}

  /***
   * @protected
   */
  createTestRecording(testSummary) {}

  /***
   * @protected
   */
  async startRecording(recording) {}

  /***
   * @protected
   */
  async stopRecording(recording) {}

  /***
   * @protected
   */
  async saveStartupRecording(recording) {}

  /***
   * @protected
   */
  async saveTestRecording(recording, testSummary) {}

  /***
   * @protected
   */
  async discardRecording(recording) {}

  /***
   * @protected
   * @abstract
   */
  killRecording(recording) {}

  async _beginRecordingStartup() {
    this.currentRecording = this.startupRecording = this.createStartupRecording();
    await this._registerAndStartCurrentRecording();
  }

  async _beginRecordingTest(testSummary) {
    this.currentRecording = this.createTestRecording(testSummary);
    await this._registerAndStartCurrentRecording();
  }

  async _registerAndStartCurrentRecording() {
    const recording = this.currentRecording;

    this.recordings.push(recording);
    this.activeRecordings.push(recording);

    await this.startRecording(recording);
  }

  _checkIfCanStartSavingStartupRecording() {
    if (this.shouldKeepStartupRecording()) {
      this._startSavingStartupRecording();
    }
  }

  _finalizeStartupRecording() {
    if (this.shouldKeepStartupRecording()) {
      this._startSavingStartupRecording();
    } else {
      this._startDiscardingStartupRecording();
    }
  }

  _checkIfTestFailed(testSummary) {
    const testStatus = testSummary.status;

    if (testStatus === 'failed') {
      this._hasFailingTests = true;
    }
  }

  _finalizeTestRecording(testSummary) {
    if (this.shouldKeepTestRecording(testSummary)) {
      this._startSavingTestRecording(testSummary)
    } else {
      this._startDiscardingTestRecording();
    }
  }

  _startSavingStartupRecording() {
    const startupRecording = this.startupRecording;
    this.startupRecording = null;

    this.api.requestIdleCallback(async () => {
      await this.saveStartupRecording(startupRecording);
      _.pull(this.activeRecordings, testRecording);
    });
  }

  _startDiscardingStartupRecording() {
    const startupRecording = this.startupRecording;
    this.startupRecording = null;

    this.api.requestIdleCallback(async () => {
      await this.discardRecording(startupRecording);
      _.pull(this.activeRecordings, startupRecording);
    });
  }

  _startSavingTestRecording(testSummary) {
    const testRecording = this.currentRecording;
    this.currentRecording = null;

    this.api.requestIdleCallback(async () => {
      await this.saveTestRecording(testRecording, testSummary);
      _.pull(this.activeRecordings, testRecording);
    });
  }

  _startDiscardingTestRecording() {
    const testRecording = this.currentRecording;
    this.currentRecording = null;

    this.api.requestIdleCallback(async () => {
      await this.discardRecording(testRecording);
      _.pull(this.activeRecordings, testRecording);
    });
  }
}

module.exports = Recorder;