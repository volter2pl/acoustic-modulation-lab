// To add a sample, put its audio file in assets/audio and add one entry here.
export const AUDIO_EXAMPLES = Object.freeze([
  {
    id: "female-speech",
    title: "Female speech",
    meta: "1:24 · MP3 · 1.6 MB",
    fileName: "example-female-speech.mp3",
    src: new URL("../assets/audio/example-female-speech.mp3", import.meta.url).href,
  },
  {
    id: "violin-music",
    title: "Violin music",
    meta: "0:25 · MP3 · 783 KB",
    fileName: "example-violin-music.mp3",
    src: new URL("../assets/audio/example-violin-music.mp3", import.meta.url).href,
  },
  {
    id: "test-signal",
    title: "Test signal",
    meta: "0:42 · MP3 · 716 KB",
    fileName: "example-signal.mp3",
    src: new URL("../assets/audio/example-signal.mp3", import.meta.url).href,
  },
]);
