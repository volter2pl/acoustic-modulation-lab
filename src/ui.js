import { formatDuration } from "./audio.js";
import { SpectrumPlayer } from "./spectrum.js";

const ELEMENT_IDS = [
  "app-status",
  "mode-single",
  "mode-band",
  "source-title",
  "fm-title",
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
  "occupied-bandwidth",
  "rds-mode",
  "rds-input-wrap",
  "rds-input-label",
  "rds-text",
  "rds-counter",
  "parameter-warning",
  "single-controls",
  "band-controls",
  "encode-button",
  "fm-file-button",
  "fm-file",
  "fm-loaded",
  "fm-name",
  "fm-meta",
  "fm-origin",
  "fm-stale",
  "fm-play",
  "fm-time",
  "fm-download",
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
  constructor(examples, handlers, bandConfig) {
    this.elements = Object.fromEntries(
      ELEMENT_IDS.map((id) => [id, document.getElementById(id)]),
    );
    this.handlers = handlers;
    this.examples = examples;
    this.bandConfig = bandConfig;
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
      }),
      fm: new SpectrumPlayer({
        container: document.getElementById("fm-spectrum"),
        engineContainer: document.getElementById("fm-spectrum-engine"),
        playhead: document.getElementById("fm-spectrum-playhead"),
        playButton: this.elements["fm-play"],
        timeElement: this.elements["fm-time"],
        accentColor: [240, 164, 93],
        frequencyMax: 24000,
        height: 125,
        volume: 0.12,
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
      }),
    };
  }

  getParameters() {
    return {
      carrier: Number(this.elements.carrier.value),
      deviation: Number(this.elements.deviation.value),
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

  getReceiverCarrier() {
    return Number(this.elements["receiver-carrier"].value);
  }

  setReceiverCarrier(carrier) {
    this.elements["receiver-carrier"].value = String(carrier);
    this.renderReceiverTuning();
  }

  renderReceiverTuning() {
    const carrier = this.getReceiverCarrier();
    this.elements["receiver-carrier-value"].textContent = `${(carrier / 1000).toFixed(1)} kHz`;
    for (const button of this.elements["receiver-controls"].querySelectorAll(
      "[data-carrier]",
    )) {
      button.classList.toggle("is-active", Number(button.dataset.carrier) === carrier);
    }
  }

  setExperimentMode(mode) {
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
    this.elements["source-title"].textContent = single ? "Message" : "Stations";
    this.elements["fm-title"].textContent = single ? "FM signal" : "Radio band";
    this.elements["result-title"].textContent = single
      ? "Recovered audio"
      : "Tuned station";
    this.elements["fm-file-button"].textContent = single
      ? "Load your own FM signal"
      : "Load your own radio band";
    this.elements["result-empty-title"].textContent = single
      ? "Your result will appear here"
      : "Tune the receiver";
    this.elements["result-empty-copy"].textContent = single
      ? "Prepare an FM signal first"
      : "Prepare a radio band first";
    this.players.result.setExternalPlayback(
      single
        ? null
        : {
            toggle: () => this.handlers.onToggleLiveReceiver(),
            seek: (progress) => this.handlers.onSeekLiveReceiver(progress),
          },
    );
    this.elements["result-download"].textContent = single
      ? "Download WAV"
      : "Download snapshot WAV";
    this.elements["result-ready-state"].textContent = single ? "Ready" : "Live receiver";
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
      ? "Programme Service"
      : "RadioText";
    input.maxLength = isPs ? 8 : 64;
    input.placeholder = isPs ? "8 characters" : "Up to 64 characters";
    input.value = text.slice(0, input.maxLength);
    this.updateRdsCounter();
  }

  updateRdsCounter() {
    const input = this.elements["rds-text"];
    this.elements["rds-counter"].textContent = `${input.value.length}/${input.maxLength}`;
  }

  renderControls({
    mode,
    warning,
    sourceReady,
    fmReady,
    stale,
    busy,
    operation,
    occupiedBandwidth,
  }) {
    const single = mode === "single";
    const { carrier, deviation } = this.getParameters();
    const formatKhz = (value) => `${(value / 1000).toFixed(1)} kHz`;

    this.elements["carrier-value"].textContent = formatKhz(carrier);
    this.elements["deviation-value"].textContent = `±${formatKhz(deviation)}`;
    this.elements["frequency-range"].textContent = `${((carrier - deviation) / 1000).toFixed(
      1,
    )}–${((carrier + deviation) / 1000).toFixed(1)} kHz`;
    this.elements["occupied-bandwidth"].textContent = `≈${(
      occupiedBandwidth / 1000
    ).toFixed(1)} kHz`;

    this.elements["parameter-warning"].hidden = !warning;
    this.elements["parameter-warning"].textContent = warning || "";
    this.elements["encode-button"].disabled = !sourceReady || Boolean(warning) || busy;
    this.elements["decode-button"].disabled =
      !single || !fmReady || Boolean(warning) || stale || busy;
    this.elements["tune-button"].disabled =
      single || !fmReady || Boolean(warning) || stale || busy;
    this.elements["fm-stale"].hidden = !stale;
    this.elements["encode-button"].textContent =
      busy && operation === "encode"
        ? single
          ? "Encoding…"
          : "Building band…"
        : single
          ? "Encode message"
          : "Build radio band";
    this.elements["decode-button"].textContent =
      busy && operation === "decode" ? "Decoding…" : "Decode signal";
    this.elements["tune-button"].textContent =
      busy && operation === "decode" ? "Updating…" : "Update spectrum & WAV";
    this.elements["rds-mode"].disabled = busy;
    this.elements["rds-text"].disabled = busy;

    for (const button of this.elements["example-list"].querySelectorAll("button")) {
      button.disabled = busy;
    }
    for (const { select, file, level } of this.bandControls) {
      select.disabled = busy;
      file.disabled = busy;
      level.disabled = busy;
    }
    this.elements["mode-single"].disabled = busy;
    this.elements["mode-band"].disabled = busy;
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

  async showFm({ blob, name, meta, origin }) {
    this.elements["fm-loaded"].hidden = false;
    this.elements["fm-name"].textContent = name;
    this.elements["fm-meta"].textContent = meta;
    this.elements["fm-origin"].textContent = origin;
    this.elements["fm-origin"].hidden = false;
    this.elements["fm-stale"].hidden = true;
    await this.players.fm.load(blob);
  }

  clearFm() {
    this.players.fm.stop();
    this.elements["fm-loaded"].hidden = true;
    this.elements["fm-origin"].hidden = true;
  }

  async showResult({
    blob,
    meta,
    rds,
    rdsExpected,
    name = "Recovered message",
    snapshotCarrier = null,
  }) {
    this.elements["result-empty"].hidden = true;
    this.elements["result-loaded"].hidden = false;
    this.elements["result-meta"].textContent = meta;
    this.elements["result-name"].textContent = name;
    this.elements["result-rds"].hidden = !rdsExpected;
    if (rdsExpected) {
      this.elements["result-rds"].classList.toggle("is-missing", !rds);
      this.elements["result-rds-mode"].textContent =
        rds?.mode === "ps" ? "PS" : "RadioText";
      this.elements["result-rds-text"].textContent =
        rds?.text || "No valid RDS groups recovered";
      this.elements["result-rds-meta"].textContent = rds
        ? `Recovered after ${rds.completedAt.toFixed(1)} s · ${rds.validGroups} valid groups`
        : "Check the selected mode, carrier, and deviation";
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
      ? `Spectrum: ${(snapshotCarrier / 1000).toFixed(1)} kHz`
      : `Live + spectrum: ${(snapshotCarrier / 1000).toFixed(1)} kHz`;
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
    this.elements["record-label"].textContent = active ? `Stop · ${elapsed}` : "Record voice";
    this.elements["source-record-again"].innerHTML = active
      ? `■ Stop · ${elapsed}`
      : '<span aria-hidden="true">●</span> Record';
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
      title.textContent = example.title;
      const meta = document.createElement("span");
      meta.textContent = example.meta;
      copy.append(title, meta);

      const action = document.createElement("span");
      action.className = "example-use";
      action.textContent = "Use";
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
      frequency.textContent = `${(carrier / 1000).toFixed(1)} kHz`;
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Source for station ${(carrier / 1000).toFixed(1)} kHz`);
      for (const example of this.examples) {
        const option = document.createElement("option");
        option.value = example.id;
        option.textContent = example.title;
        select.append(option);
      }
      const customOption = document.createElement("option");
      customOption.value = "custom";
      customOption.textContent = "Custom file…";
      select.append(customOption);
      select.value = initialExample.id;
      header.append(frequency, select);

      const fileRow = document.createElement("div");
      fileRow.className = "station-source-meta";
      const name = document.createElement("strong");
      name.textContent = initialExample.title;
      const meta = document.createElement("span");
      meta.textContent = initialExample.meta;
      fileRow.append(name, meta);

      const levelRow = document.createElement("label");
      levelRow.className = "station-level";
      const levelCopy = document.createElement("span");
      levelCopy.textContent = "Signal level";
      const levelOutput = document.createElement("output");
      levelOutput.textContent = "100%";
      const level = document.createElement("input");
      level.type = "range";
      level.min = "25";
      level.max = "100";
      level.step = "5";
      level.value = "100";
      level.setAttribute("aria-label", `Signal level for ${(carrier / 1000).toFixed(1)} kHz`);
      levelRow.append(levelCopy, levelOutput, level);

      const file = document.createElement("input");
      file.type = "file";
      file.accept = "audio/*";
      file.hidden = true;

      const control = {
        select,
        file,
        level,
        levelOutput,
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
        this.handlers.onBandLevelChanged();
      });

      row.append(header, fileRow, levelRow, file);
      fragment.append(row);
    });

    this.elements["band-station-list"].replaceChildren(fragment);
  }

  chooseFile(input) {
    input.value = "";
    input.click();
  }

  bindEvents() {
    const sourceFile = this.elements["source-file"];
    const fmFile = this.elements["fm-file"];
    const dropzone = this.elements["source-dropzone"];

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
    this.elements["fm-file-button"].addEventListener("click", () => this.chooseFile(fmFile));
    fmFile.addEventListener("change", () => {
      const [file] = fmFile.files;
      if (file) this.handlers.onFmFile(file);
    });
    this.elements["fm-download"].addEventListener("click", () => this.handlers.onDownloadFm());
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
