import { formatDuration } from "./audio.js";
import { WaveformPlayer } from "./waveform.js";

const ELEMENT_IDS = [
  "app-status",
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
  "parameter-warning",
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
  "result-loaded",
  "result-meta",
  "result-play",
  "result-time",
  "result-download",
];

export class AppUI {
  constructor(examples, handlers) {
    this.elements = Object.fromEntries(
      ELEMENT_IDS.map((id) => [id, document.getElementById(id)]),
    );
    this.handlers = handlers;
    this.players = this.createPlayers();
    this.renderExamples(examples);
    this.bindEvents();
  }

  createPlayers() {
    return {
      source: new WaveformPlayer({
        container: document.getElementById("source-waveform"),
        playButton: this.elements["source-play"],
        timeElement: this.elements["source-time"],
        waveColor: "#6459ae",
        progressColor: "#a99dff",
      }),
      fm: new WaveformPlayer({
        container: document.getElementById("fm-waveform"),
        playButton: this.elements["fm-play"],
        timeElement: this.elements["fm-time"],
        waveColor: "#8e633e",
        progressColor: "#f0a45d",
        volume: 0.12,
      }),
      result: new WaveformPlayer({
        container: document.getElementById("result-waveform"),
        playButton: this.elements["result-play"],
        timeElement: this.elements["result-time"],
        waveColor: "#367a63",
        progressColor: "#61d5a7",
      }),
    };
  }

  getParameters() {
    return {
      carrier: Number(this.elements.carrier.value),
      deviation: Number(this.elements.deviation.value),
    };
  }

  renderControls({ warning, sourceReady, fmReady, stale, busy, operation }) {
    const { carrier, deviation } = this.getParameters();
    const formatKhz = (value) => `${(value / 1000).toFixed(1)} kHz`;

    this.elements["carrier-value"].textContent = formatKhz(carrier);
    this.elements["deviation-value"].textContent = `±${formatKhz(deviation)}`;
    this.elements["frequency-range"].textContent = `${((carrier - deviation) / 1000).toFixed(
      1,
    )}–${((carrier + deviation) / 1000).toFixed(1)} kHz`;

    this.elements["parameter-warning"].hidden = !warning;
    this.elements["parameter-warning"].textContent = warning || "";
    this.elements["encode-button"].disabled = !sourceReady || Boolean(warning) || busy;
    this.elements["decode-button"].disabled = !fmReady || Boolean(warning) || stale || busy;
    this.elements["fm-stale"].hidden = !stale;
    this.elements["encode-button"].textContent =
      busy && operation === "encode" ? "Encoding…" : "Encode message";
    this.elements["decode-button"].textContent =
      busy && operation === "decode" ? "Decoding…" : "Decode signal";

    for (const button of this.elements["example-list"].querySelectorAll("button")) {
      button.disabled = busy;
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

  async showResult({ blob, meta }) {
    this.elements["result-empty"].hidden = true;
    this.elements["result-loaded"].hidden = false;
    this.elements["result-meta"].textContent = meta;
    await this.players.result.load(blob);
  }

  clearResult() {
    this.players.result.stop();
    this.elements["result-empty"].hidden = false;
    this.elements["result-loaded"].hidden = true;
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

  chooseFile(input) {
    input.value = "";
    input.click();
  }

  bindEvents() {
    const sourceFile = this.elements["source-file"];
    const fmFile = this.elements["fm-file"];
    const dropzone = this.elements["source-dropzone"];

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
    this.elements["encode-button"].addEventListener("click", () => this.handlers.onEncode());
    this.elements["decode-button"].addEventListener("click", () => this.handlers.onDecode());
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
