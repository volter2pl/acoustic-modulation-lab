// To add a sample, put its audio file in assets/audio and add one entry here.
export const AUDIO_EXAMPLES = Object.freeze([
  {
    id: "female-speech",
    title: "Female speech",
    titleKey: "examples.femaleSpeech",
    meta: "1:24 · MP3 · 1.6 MB",
    metaKey: "examples.femaleSpeechMeta",
    fileName: "example-female-speech.mp3",
    src: new URL("../assets/audio/example-female-speech.mp3", import.meta.url).href,
  },
  {
    id: "violin-music",
    title: "Violin music",
    titleKey: "examples.violinMusic",
    meta: "0:25 · MP3 · 783 KB",
    metaKey: "examples.violinMusicMeta",
    fileName: "example-violin-music.mp3",
    src: new URL("../assets/audio/example-violin-music.mp3", import.meta.url).href,
  },
  {
    id: "test-signal",
    title: "Test signal",
    titleKey: "examples.testSignal",
    meta: "0:42 · MP3 · 716 KB",
    metaKey: "examples.testSignalMeta",
    fileName: "example-signal.mp3",
    src: new URL("../assets/audio/example-signal.mp3", import.meta.url).href,
  },
]);
