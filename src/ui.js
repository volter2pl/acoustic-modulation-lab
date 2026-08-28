import { formatDuration } from "./audio.js";
import { SpectrumPlayer } from "./spectrum.js";

const ELEMENT_IDS = [
  "app-status",
  "modulation-fm",
  "modulation-am",
  "mode-single",
  "mode-band",
  "source-title",
  "signal-title",
  "result-title",
  "single-source",
  "band-source",
  "band-station-list",
  "source-chooser",
  "source-chooser-cancel",
  "example-list",
  "source-dropzone",
  "source-file-button",
  "source-file",
  "record-button",
  "record-label",
  "source-loaded",
  "source-name",
  "source-meta",
  "source-replace",
  "source-record-again",
  "source-play",
  "source-time",
  "carrier",
  "carrier-value",
  "deviation",
  "deviation-value",
  "frequency-range",
  "fm-parameters",
  "am-parameters",
  "modulation-depth",
  "modulation-depth-value",
  "modulation-depth-state",
  "occupied-bandwidth",
  "rds-controls",
  "rds-mode",
  "rds-input-wrap",
  "rds-input-label",
  "rds-text",
  "rds-counter",
  "parameter-warning",
  "single-controls",
  "band-controls",
  "band-parameter-label",
  "band-parameter-value",
  "band-feature-label",
  "band-feature-value",
  "band-station-plan",
  "encode-button",
  "signal-file-button",
  "signal-file",
  "signal-loaded",
  "signal-name",
  "signal-meta",
  "signal-origin",
  "signal-stale",
  "signal-play",
  "signal-time",
  "signal-download",
  "decode-button",
  "result-empty",
  "result-empty-title",
  "result-empty-copy",
  "result-loaded",
  "result-name",
  "result-meta",
  "result-spectrum-state",
  "result-ready-state",
  "result-rds",
  "result-rds-mode",
  "result-rds-text",
  "result-rds-meta",
  "result-play",
  "result-time",
  "result-download",
  "receiver-controls",
  "receiver-carrier",
  "receiver-carrier-value",
  "tune-button",
];

export class AppUI {
  constructor(examples, handlers, bandConfig, i18n) {
    this.elements = Object.fromEntries(
      ELEMENT_IDS.map((id) => [id, document.getElementById(id)]),
    );
    this.handlers = handlers;
    this.examples = examples;
    this.bandConfig = bandConfig;
    this.i18n = i18n;
    this.t = i18n.t;
    this.bandControls = [];
    this.players = this.createPlayers();
    this.renderExamples(examples);
    this.renderBandStations();
    this.bindEvents();
  }

  createPlayers() {
    return {
      source: new SpectrumPlayer({
        container: document.getElementById("source-spectrum"),
        engineContainer: document.getElementById("source-spectrum-engine"),
        playhead: document.getElementById("source-spectrum-playhead"),
        playButton: this.elements["source-play"],
        timeElement: this.elements["source-time"],
        accentColor: [169, 157, 255],
        frequencyMax: 8000,
        height: 190,
        translate: this.t,
      }),
      signal: new SpectrumPlayer({
        container: document.getElementById("signal-spectrum"),
        engineContainer: document.getElementById("signal-spectrum-engine"),
        playhead: document.getElementById("signal-spectrum-playhead"),
        playButton: this.elements["signal-play"],
        timeElement: this.elements["signal-time"],
        accentColor: [240, 164, 93],
        frequencyMax: 24000,
        height: 125,
        volume: 0.12,
        translate: this.t,
      }),
      result: new SpectrumPlayer({
        container: document.getElementById("result-spectrum"),
        engineContainer: document.getElementById("result-spectrum-engine"),
        playhead: document.getElementById("result-spectrum-playhead"),
        playButton: this.elements["result-play"],
        timeElement: this.elements["result-time"],
        accentColor: [97, 213, 167],
        frequencyMax: 8000,
        height: 300,
        translate: this.t,
      }),
    };
  }

  formatKhz(value) {
    return `${this.i18n.number(value / 1000)} kHz`;
  }

  getExampleTitle(example) {
    return example.titleKey ? this.t(example.titleKey) : example.title;
  }

  getExampleMeta(example) {
    return example.metaKey ? this.t(example.metaKey) : example.meta;
  }

  getParameters() {
    return {
      carrier: Number(this.elements.carrier.value),
      deviation: Number(this.elements.deviation.value),
      modulationDepth: Number(this.elements["modulation-depth"].value),
    };
  }

  getRdsConfig() {
    const mode = this.elements["rds-mode"].value;
    return {
      mode,
      text: mode === "none" ? "" : this.elements["rds-text"].value,
    };
  }

  getBandLevels() {
    return this.bandControls.map(({ level }) => Number(level.value) / 100);
  }

  getBandCarriers() {
    return this.bandControls.map(({ carrier }) => Number(carrier.value));
  }

  getBandPhases() {
    return this.bandControls.map(({ phase }) => Number(phase.value));
  }

  getReceiverCarrier() {
    return Number(this.elements["receiver-carrier"].value);
  }

  setReceiverCarrier(carrier) {
    this.elements["receiver-carrier"].value = String(carrier);
    this.renderReceiverTuning();
  }

  renderReceiverTuning() {
    const carrier = this.getReceiverCarrier();
    this.elements["receiver-carrier-value"].textContent = this.formatKhz(carrier);
    for (const button of this.elements["receiver-controls"].querySelectorAll(
      "[data-carrier]",
    )) {
      button.textContent = this.formatKhz(Number(button.dataset.carrier));
      button.classList.toggle("is-active", Number(button.dataset.carrier) === carrier);
    }
  }

  renderBandPlan() {
    this.elements["band-station-plan"].textContent = this.getBandCarriers()
      .map((carrier) => this.formatKhz(carrier))
      .join(" · ");
  }

  renderBandStationParameters(index) {
    const control = this.bandControls[index];
    if (!control) return;
    const carrier = Number(control.carrier.value);
    const carrierValue = this.i18n.number(carrier / 1000);
    control.frequency.textContent = `${carrierValue} kHz`;
    control.carrierOutput.textContent = `${carrierValue} kHz`;
    control.phaseOutput.textContent = `${control.phase.value}°`;
    control.select.setAttribute(
      "aria-label",
      this.t("aria.sourceForStation", { frequency: carrierValue }),
    );
    control.level.setAttribute(
      "aria-label",
      this.t("aria.signalLevelForStation", { frequency: carrierValue }),
    );
    const preset = this.elements["receiver-controls"].querySelector(
      `[data-station-index="${index}"]`,
    );
    if (preset) preset.dataset.carrier = String(carrier);
    this.renderBandPlan();
    this.renderReceiverTuning();
  }

  setModulation(modulation) {
    const fm = modulation === "fm";
    this.elements["modulation-fm"].classList.toggle("is-active", fm);
    this.elements["modulation-fm"].setAttribute("aria-pressed", String(fm));
    this.elements["modulation-am"].classList.toggle("is-active", !fm);
    this.elements["modulation-am"].setAttribute("aria-pressed", String(!fm));
    this.elements["fm-parameters"].hidden = !fm;
    this.elements["am-parameters"].hidden = fm;
    this.elements["rds-controls"].hidden = !fm;
    this.elements["band-parameter-label"].textContent = fm
      ? this.t("ui.deviation")
      : this.t("ui.modulationDepth");
    this.elements["band-parameter-value"].textContent = fm
      ? `±${this.formatKhz(750)}`
      : "80%";
    this.elements["band-feature-label"].textContent = fm
      ? "RDS"
      : this.t("ui.detection");
    this.elements["band-feature-value"].textContent = fm
      ? this.t("ui.off")
      : this.t("ui.envelope");
  }

  setExperimentMode(mode, modulation) {
    const single = mode === "single";
    this.elements["mode-single"].classList.toggle("is-active", single);
    this.elements["mode-single"].setAttribute("aria-pressed", String(single));
    this.elements["mode-band"].classList.toggle("is-active", !single);
    this.elements["mode-band"].setAttribute("aria-pressed", String(!single));
    this.elements["single-source"].hidden = !single;
    this.elements["band-source"].hidden = single;
    this.elements["single-controls"].hidden = !single;
    this.elements["band-controls"].hidden = single;
    this.elements["decode-button"].hidden = !single;
    this.elements["receiver-controls"].hidden = single;
    this.elements["source-title"].textContent = this.t(
      single ? "ui.message" : "ui.stations",
    );
    const label = modulation.toUpperCase();
    this.elements["signal-title"].textContent = single
      ? this.t("ui.signal", { modulation: label })
      : this.t("ui.bandSignal", { modulation: label });
    this.elements["result-title"].textContent = single
      ? this.t("ui.recoveredAudio")
      : this.t("ui.tunedStation");
    this.elements["signal-file-button"].textContent = single
      ? this.t("ui.loadSignal", { modulation: label })
      : this.t("ui.loadBand", { modulation: label });
    this.elements["result-empty-title"].textContent = single
      ? this.t("ui.resultHere")
      : this.t("ui.tuneReceiver");
    this.elements["result-empty-copy"].textContent = single
      ? this.t("ui.prepareSignal", { modulation: label })
      : this.t("ui.prepareBand");
    this.players.result.setExternalPlayback(
      single
        ? null
        : {
            toggle: () => this.handlers.onToggleLiveReceiver(),
            seek: (progress) => this.handlers.onSeekLiveReceiver(progress),
          },
    );
    this.elements["result-download"].textContent = single
      ? this.t("ui.downloadWav")
      : this.t("ui.downloadSnapshot");
    this.elements["result-ready-state"].textContent = this.t(
      single ? "ui.ready" : "ui.liveReceiver",
    );
    this.renderReceiverTuning();
  }

  setBandStation(index, { name, meta, sourceId = "custom" }) {
    const control = this.bandControls[index];
    if (!control) return;
    control.name.textContent = name;
    control.meta.textContent = meta;
    control.select.value = sourceId;
    control.sourceId = sourceId;
  }

  setCarrierLimits({ min, max }, preferredValue) {
    const carrier = this.elements.carrier;
    carrier.min = String(min);
    carrier.max = String(max);
    const requested = preferredValue ?? Number(carrier.value);
    carrier.value = String(Math.max(min, Math.min(max, requested)));
  }

  configureRds(mode, text) {
    const enabled = mode !== "none";
    const isPs = mode === "ps";
    const input = this.elements["rds-text"];

    this.elements["rds-input-wrap"].hidden = !enabled;
    this.elements["rds-input-label"].textContent = isPs
      ? this.t("ui.programmeService")
      : "RadioText";
    input.maxLength = isPs ? 8 : 64;
    input.placeholder = this.t(isPs ? "ui.psPlaceholder" : "ui.radioTextPlaceholder");
    input.value = text.slice(0, input.maxLength);
    this.updateRdsCounter();
  }

  updateRdsCounter() {
    const input = this.elements["rds-text"];
    this.elements["rds-counter"].textContent = `${input.value.length}/${input.maxLength}`;
  }

  renderControls({
    modulation,
    mode,
    parameters,
    warning,
    sourceReady,
    signalReady,
    stale,
    busy,
    operation,
    occupiedBandwidth,
  }) {
    const single = mode === "single";
    const { carrier, deviation, modulationDepth } = parameters;
    const formatKhz = (value) => this.formatKhz(value);

    this.elements["carrier-value"].textContent = formatKhz(carrier);
    this.elements["deviation-value"].textContent = `±${formatKhz(deviation)}`;
    this.elements["frequency-range"].textContent = `${this.i18n.number(
      (carrier - deviation) / 1000,
    )}–${this.i18n.number((carrier + deviation) / 1000)} kHz`;
    this.elements["modulation-depth-value"].textContent = `${modulationDepth}%`;
    const depthState = this.elements["modulation-depth-state"];
    depthState.textContent =
      modulationDepth === 0
        ? this.t("ui.carrierOnly")
        : modulationDepth <= 100
          ? this.t("ui.valid")
          : this.t("ui.overmodulated");
    depthState.classList.toggle("is-warning", modulationDepth > 100);
    this.elements["occupied-bandwidth"].textContent = `≈${this.i18n.number(
      occupiedBandwidth / 1000,
    )} kHz`;

    this.elements["parameter-warning"].hidden = !warning;
    this.elements["parameter-warning"].textContent = warning ? this.t(warning) : "";
    this.elements["encode-button"].disabled = !sourceReady || Boolean(warning) || busy;
    this.elements["decode-button"].disabled =
      !single || !signalReady || Boolean(warning) || stale || busy;
    this.elements["tune-button"].disabled =
      single || !signalReady || Boolean(warning) || stale || busy;
    this.elements["signal-stale"].hidden = !stale;
    this.elements["encode-button"].textContent =
      busy && operation === "encode"
        ? single
          ? this.t("ui.encoding")
          : this.t("ui.buildingBand")
        : single
          ? this.t("ui.encodeMessage")
          : this.t("ui.buildBand");
    this.elements["decode-button"].textContent =
      busy && operation === "decode" ? this.t("ui.decoding") : this.t("ui.decodeSignal");
    this.elements["tune-button"].textContent =
      busy && operation === "decode" ? this.t("ui.updating") : this.t("ui.updateSpectrum");
    this.elements["rds-mode"].disabled = busy;
    this.elements["rds-text"].disabled = busy;
    this.elements.carrier.disabled = busy;
    this.elements.deviation.disabled = busy;
    this.elements["modulation-depth"].disabled = busy;

    for (const button of this.elements["example-list"].querySelectorAll("button")) {
      button.disabled = busy;
    }
    for (const { select, file, level, carrier, phase } of this.bandControls) {
      select.disabled = busy;
      file.disabled = busy;
      level.disabled = busy;
      carrier.disabled = busy;
      phase.disabled = busy;
    }
    this.elements["mode-single"].disabled = busy;
    this.elements["mode-band"].disabled = busy;
    this.elements["modulation-fm"].disabled = busy;
    this.elements["modulation-am"].disabled = busy;
    this.elements["receiver-carrier"].disabled = busy;
    for (const button of this.elements["receiver-controls"].querySelectorAll("button")) {
      if (button !== this.elements["tune-button"]) button.disabled = busy;
    }
  }

  setStatus(message = "", kind = "error") {
    this.elements["app-status"].hidden = !message;
    this.elements["app-status"].textContent = message;
    this.elements["app-status"].dataset.kind = kind;
  }

  setDocumentBusy(busy) {
    document.body.classList.toggle("is-busy", busy);
  }

  async showSource({ blob, name, meta }) {
    this.elements["source-name"].textContent = name;
    this.elements["source-meta"].textContent = meta;
    this.elements["source-chooser"].hidden = true;
    this.elements["source-loaded"].hidden = false;
    await this.players.source.load(blob);
  }

  showSourceChooser(hasCurrentSource) {
    this.players.source.stop();
    this.elements["source-loaded"].hidden = true;
    this.elements["source-chooser"].hidden = false;
    this.elements["source-chooser-cancel"].hidden = !hasCurrentSource;
  }

  hideSourceChooser() {
    this.elements["source-chooser"].hidden = true;
    this.elements["source-loaded"].hidden = false;
  }

  async showSignal({ blob, name, meta, origin }) {
    this.elements["signal-loaded"].hidden = false;
    this.elements["signal-name"].textContent = name;
    this.elements["signal-meta"].textContent = meta;
    this.elements["signal-origin"].textContent = origin;
    this.elements["signal-origin"].hidden = false;
    this.elements["signal-stale"].hidden = true;
    await this.players.signal.load(blob);
  }

  clearSignal() {
    this.players.signal.stop();
    this.elements["signal-loaded"].hidden = true;
    this.elements["signal-origin"].hidden = true;
  }

  async showResult({
    blob,
    meta,
    data,
    dataExpected,
    name = null,
    snapshotCarrier = null,
  }) {
    this.elements["result-empty"].hidden = true;
    this.elements["result-loaded"].hidden = false;
    this.elements["result-meta"].textContent = meta;
    this.elements["result-name"].textContent = name ?? this.t("ui.recoveredMessage");
    this.elements["result-rds"].hidden = !dataExpected;
    if (dataExpected) {
      this.elements["result-rds"].classList.toggle("is-missing", !data);
      this.elements["result-rds-mode"].textContent =
        data?.mode === "ps" ? "PS" : "RadioText";
      this.elements["result-rds-text"].textContent =
        data?.text || this.t("ui.rdsMissing");
      this.elements["result-rds-meta"].textContent = data
        ? this.t("ui.rdsRecovered", {
            seconds: this.i18n.number(data.completedAt),
            groups: data.validGroups,
          })
        : this.t("ui.rdsCheck");
    }
    await this.players.result.load(blob);
    this.renderResultSnapshot(snapshotCarrier, snapshotCarrier);
  }

  updateResultName(name) {
    this.elements["result-name"].textContent = name;
  }

  renderResultSnapshot(snapshotCarrier, currentCarrier) {
    const label = this.elements["result-spectrum-state"];
    label.hidden = snapshotCarrier === null;
    if (snapshotCarrier === null) return;
    const stale = snapshotCarrier !== currentCarrier;
    label.classList.toggle("is-stale", stale);
    label.textContent = stale
      ? this.t("ui.spectrumAt", {
          frequency: this.i18n.number(snapshotCarrier / 1000),
        })
      : this.t("ui.liveSpectrumAt", {
          frequency: this.i18n.number(snapshotCarrier / 1000),
        });
  }

  renderLiveReceiver(state) {
    this.players.result.renderExternalPlayback(state);
  }

  clearResult() {
    this.players.result.stop();
    this.elements["result-empty"].hidden = false;
    this.elements["result-loaded"].hidden = true;
    this.elements["result-rds"].hidden = true;
    this.elements["result-spectrum-state"].hidden = true;
  }

  setRecording(active, elapsedSeconds = 0) {
    const elapsed = formatDuration(elapsedSeconds);
    this.elements["record-button"].classList.toggle("is-recording", active);
    this.elements["record-label"].textContent = active
      ? this.t("ui.stopRecording", { elapsed })
      : this.t("ui.recordVoice");
    this.elements["source-record-again"].innerHTML = active
      ? `■ ${this.t("ui.stopRecording", { elapsed })}`
      : `<span aria-hidden="true">●</span> ${this.t("ui.record")}`;
    this.elements["source-replace"].disabled = active;
  }

  renderExamples(examples) {
    const fragment = document.createDocumentFragment();

    for (const example of examples) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "example-option";
      button.dataset.exampleId = example.id;

      const icon = document.createElement("span");
      icon.className = "example-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "♪";

      const copy = document.createElement("span");
      copy.className = "example-copy";
      const title = document.createElement("strong");
      title.textContent = this.getExampleTitle(example);
      const meta = document.createElement("span");
      meta.textContent = this.getExampleMeta(example);
      copy.append(title, meta);

      const action = document.createElement("span");
      action.className = "example-use";
      action.textContent = this.t("ui.use");
      button.append(icon, copy, action);
      button.addEventListener("click", () => this.handlers.onExample(example));
      fragment.append(button);
    }

    this.elements["example-list"].replaceChildren(fragment);
  }

  renderBandStations() {
    const fragment = document.createDocumentFragment();

    this.bandConfig.carriers.forEach((carrier, stationIndex) => {
      const initialExample = this.examples[stationIndex % this.examples.length];
      const row = document.createElement("article");
      row.className = "band-station";

      const header = document.createElement("div");
      header.className = "band-station-header";
      const frequency = document.createElement("strong");
      frequency.className = "station-frequency";
      const carrierValue = this.i18n.number(carrier / 1000);
      frequency.textContent = `${carrierValue} kHz`;
      const select = document.createElement("select");
      select.setAttribute(
        "aria-label",
        this.t("aria.sourceForStation", { frequency: carrierValue }),
      );
      for (const example of this.examples) {
        const option = document.createElement("option");
        option.value = example.id;
        option.textContent = this.getExampleTitle(example);
        select.append(option);
      }
      const customOption = document.createElement("option");
      customOption.value = "custom";
      customOption.textContent = this.t("ui.customFile");
      select.append(customOption);
      select.value = initialExample.id;
      header.append(frequency, select);

      const fileRow = document.createElement("div");
      fileRow.className = "station-source-meta";
      const name = document.createElement("strong");
      name.textContent = this.getExampleTitle(initialExample);
      const meta = document.createElement("span");
      meta.textContent = this.getExampleMeta(initialExample);
      fileRow.append(name, meta);

      const levelRow = document.createElement("label");
      levelRow.className = "station-parameter";
      const levelCopy = document.createElement("span");
      levelCopy.textContent = this.t("ui.signalLevel");
      const levelOutput = document.createElement("output");
      levelOutput.textContent = "100%";
      const level = document.createElement("input");
      level.type = "range";
      level.min = "25";
      level.max = "100";
      level.step = "5";
      level.value = "100";
      level.setAttribute(
        "aria-label",
        this.t("aria.signalLevelForStation", { frequency: carrierValue }),
      );
      levelRow.append(levelCopy, levelOutput, level);

      const carrierRow = document.createElement("label");
      carrierRow.className = "station-parameter";
      const carrierCopy = document.createElement("span");
      carrierCopy.textContent = this.t("ui.carrierFrequency");
      const carrierOutput = document.createElement("output");
      carrierOutput.textContent = `${carrierValue} kHz`;
      const carrierInput = document.createElement("input");
      carrierInput.type = "range";
      carrierInput.min = "4000";
      carrierInput.max = "20000";
      carrierInput.step = "100";
      carrierInput.value = String(carrier);
      carrierRow.append(carrierCopy, carrierOutput, carrierInput);

      const phaseRow = document.createElement("label");
      phaseRow.className = "station-parameter";
      const phaseCopy = document.createElement("span");
      phaseCopy.textContent = this.t("ui.phaseAtReceiver");
      const phaseOutput = document.createElement("output");
      phaseOutput.textContent = "0°";
      const phase = document.createElement("input");
      phase.type = "range";
      phase.min = "0";
      phase.max = "345";
      phase.step = "15";
      phase.value = "0";
      phaseRow.append(phaseCopy, phaseOutput, phase);

      const file = document.createElement("input");
      file.type = "file";
      file.accept = "audio/*";
      file.hidden = true;

      const control = {
        select,
        file,
        level,
        levelOutput,
        carrier: carrierInput,
        carrierOutput,
        phase,
        phaseOutput,
        frequency,
        name,
        meta,
        sourceId: initialExample.id,
      };
      this.bandControls.push(control);

      select.addEventListener("change", () => {
        if (select.value === "custom") {
          file.value = "";
          file.click();
          return;
        }
        const example = this.examples.find(({ id }) => id === select.value);
        if (example) this.handlers.onBandExample(stationIndex, example);
      });
      file.addEventListener("change", () => {
        const [selectedFile] = file.files;
        if (selectedFile) {
          this.handlers.onBandFile(stationIndex, selectedFile);
        } else {
          select.value = control.sourceId;
        }
      });
      level.addEventListener("input", () => {
        levelOutput.textContent = `${level.value}%`;
        this.handlers.onBandParametersChanged();
      });
      carrierInput.addEventListener("input", () => {
        this.renderBandStationParameters(stationIndex);
        this.handlers.onBandParametersChanged();
      });
      phase.addEventListener("input", () => {
        this.renderBandStationParameters(stationIndex);
        this.handlers.onBandParametersChanged();
      });

      row.append(header, fileRow, levelRow, carrierRow, phaseRow, file);
      fragment.append(row);
    });

    this.elements["band-station-list"].replaceChildren(fragment);
    this.bandControls.forEach((_, index) => this.renderBandStationParameters(index));
  }

  chooseFile(input) {
    input.value = "";
    input.click();
  }

  bindEvents() {
    const sourceFile = this.elements["source-file"];
    const signalFile = this.elements["signal-file"];
    const dropzone = this.elements["source-dropzone"];

    this.elements["modulation-fm"].addEventListener("click", () =>
      this.handlers.onModulationChanged("fm"),
    );
    this.elements["modulation-am"].addEventListener("click", () =>
      this.handlers.onModulationChanged("am"),
    );
    this.elements["mode-single"].addEventListener("click", () =>
      this.handlers.onModeChanged("single"),
    );
    this.elements["mode-band"].addEventListener("click", () =>
      this.handlers.onModeChanged("band"),
    );

    this.elements["source-file-button"].addEventListener("click", (event) => {
      event.stopPropagation();
      this.chooseFile(sourceFile);
    });
    this.elements["source-replace"].addEventListener("click", () =>
      this.handlers.onShowSourceChooser(),
    );
    this.elements["source-chooser-cancel"].addEventListener("click", () =>
      this.handlers.onCancelSourceChooser(),
    );
    this.elements["source-record-again"].addEventListener("click", () =>
      this.handlers.onToggleRecording(),
    );
    sourceFile.addEventListener("change", () => {
      const [file] = sourceFile.files;
      if (file) this.handlers.onSourceFile(file);
    });

    dropzone.addEventListener("click", () => this.chooseFile(sourceFile));
    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.chooseFile(sourceFile);
      }
    });
    this.elements["record-button"].addEventListener("click", (event) => {
      event.stopPropagation();
      this.handlers.onToggleRecording();
    });

    for (const eventName of ["dragenter", "dragover"]) {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
      });
    }
    for (const eventName of ["dragleave", "drop"]) {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
      });
    }
    dropzone.addEventListener("drop", (event) => {
      const file = [...event.dataTransfer.files].find((candidate) =>
        candidate.type.startsWith("audio/"),
      );
      file ? this.handlers.onSourceFile(file) : this.handlers.onInvalidDrop();
    });

    this.elements.carrier.addEventListener("input", () => this.handlers.onParametersChanged());
    this.elements.deviation.addEventListener("input", () => this.handlers.onParametersChanged());
    this.elements["modulation-depth"].addEventListener("input", () =>
      this.handlers.onParametersChanged(),
    );
    this.elements["receiver-carrier"].addEventListener("input", () => {
      this.renderReceiverTuning();
      this.handlers.onReceiverTuningChanged();
    });
    for (const button of this.elements["receiver-controls"].querySelectorAll(
      "[data-carrier]",
    )) {
      button.addEventListener("click", () => {
        this.setReceiverCarrier(Number(button.dataset.carrier));
        this.handlers.onReceiverTuningChanged();
      });
    }
    this.elements["rds-mode"].addEventListener("change", () =>
      this.handlers.onRdsModeChanged(this.elements["rds-mode"].value),
    );
    this.elements["rds-text"].addEventListener("input", () => {
      this.updateRdsCounter();
      this.handlers.onRdsTextChanged(this.elements["rds-text"].value);
    });
    this.elements["encode-button"].addEventListener("click", () => this.handlers.onEncode());
    this.elements["decode-button"].addEventListener("click", () => this.handlers.onDecode());
    this.elements["tune-button"].addEventListener("click", () => this.handlers.onDecode());
    this.elements["signal-file-button"].addEventListener("click", () =>
      this.chooseFile(signalFile),
    );
    signalFile.addEventListener("change", () => {
      const [file] = signalFile.files;
      if (file) this.handlers.onSignalFile(file);
    });
    this.elements["signal-download"].addEventListener("click", () =>
      this.handlers.onDownloadSignal(),
    );
    this.elements["result-download"].addEventListener("click", () =>
      this.handlers.onDownloadResult(),
    );
  }
}

export function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
