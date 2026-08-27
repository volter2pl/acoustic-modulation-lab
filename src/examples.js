// To add a sample, put its audio file in assets/audio and add one entry here.
export const AUDIO_EXAMPLES = Object.freeze([
  {
    id: "example-01",
    title: "Sample MP3 recording",
    meta: "0:42 · MP3 · 700 KB",
    fileName: "example-01.mp3",
    src: new URL("../assets/audio/example-01.mp3", import.meta.url).href,
  },
]);
