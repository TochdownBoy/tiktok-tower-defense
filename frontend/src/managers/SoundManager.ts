const ICE_HIT_SOUND_URL = "/sounds/ice-hit.mp3";
const TESLA_HIT_SOUND_URL = "/sounds/tesla-hit.mp3";
const FOREST_SOUND_URL = "/sounds/forest-sound.mp3";

export class SoundManager {
  private context?: AudioContext;
  private iceHitBuffer?: AudioBuffer;
  private teslaHitBuffer?: AudioBuffer;
  private forestBuffer?: AudioBuffer;
  private teslaSource?: AudioBufferSourceNode;
  private forestSource?: AudioBufferSourceNode;

  async load(): Promise<void> {
    try {
      const context = new AudioContext();
      this.context = context;
      const iceHit = await this.fetchBuffer(context, ICE_HIT_SOUND_URL);
      const teslaHit = await this.fetchBuffer(context, TESLA_HIT_SOUND_URL);
      const forest = await this.fetchBuffer(context, FOREST_SOUND_URL);
      this.iceHitBuffer = iceHit;
      this.teslaHitBuffer = teslaHit;
      this.forestBuffer = forest;
    } catch {
      this.context = undefined;
      this.iceHitBuffer = undefined;
      this.teslaHitBuffer = undefined;
      this.forestBuffer = undefined;
    }
  }

  playIceHit(): void {
    if (!this.context || !this.iceHitBuffer) return;
    this.ensureRunning();

    const source = this.context.createBufferSource();
    source.buffer = this.iceHitBuffer;
    source.connect(this.context.destination);
    source.start();
  }

  playTeslaHit(): void {
    if (!this.context || !this.teslaHitBuffer || this.teslaSource) return;
    this.ensureRunning();

    const source = this.context.createBufferSource();
    source.buffer = this.teslaHitBuffer;
    source.loop = true;
    source.connect(this.context.destination);
    source.start();
    this.teslaSource = source;
  }

  stopTeslaHit(): void {
    if (!this.teslaSource) return;
    this.teslaSource.stop();
    this.teslaSource.disconnect();
    this.teslaSource = undefined;
  }

  playForest(): void {
    if (!this.context || !this.forestBuffer || this.forestSource) return;
    this.ensureRunning();

    const source = this.context.createBufferSource();
    source.buffer = this.forestBuffer;
    source.loop = true;
    source.connect(this.context.destination);
    source.start();
    this.forestSource = source;
  }

  stopForest(): void {
    if (!this.forestSource) return;
    this.forestSource.stop();
    this.forestSource.disconnect();
    this.forestSource = undefined;
  }

  destroy(): void {
    this.stopTeslaHit();
    this.stopForest();
    if (this.context) {
      void this.context.close();
    }
    this.context = undefined;
    this.iceHitBuffer = undefined;
    this.teslaHitBuffer = undefined;
    this.forestBuffer = undefined;
  }

  private ensureRunning(): void {
    if (this.context && this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  private async fetchBuffer(
    context: AudioContext,
    url: string,
  ): Promise<AudioBuffer | undefined> {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const arrayBuffer = await response.arrayBuffer();
    return context.decodeAudioData(arrayBuffer);
  }
}
