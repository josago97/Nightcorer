import { Injectable } from '@angular/core';
import createSoundTouchNode from '@soundtouchjs/audio-worklet';
import "regenerator-runtime/runtime";
import { WavEncoder } from '../models/wav-encoder';

@Injectable({
  providedIn: 'root'
})
export class AudioPlayerService {

  private _audioReady = false;
  private _currentTime = 0;
  private _percentagePlayed = 0;
  private _semitones = 0;
  private _pitch = 1;
  private _speed = 1;
  private _volume = 0.2;

  private audioContext: AudioContext;
  private soundtouch: any;
  private audio: ArrayBuffer;
  private gainNode: GainNode;
  private restartSoundTouch = false;
  
  get audioReady() {
    return this._audioReady;
  }

  get isPlaying() {
    return this.soundtouch.playing;
  }

  get duration() {
    return this.soundtouch.duration / this.speed;
  }

  get currentTime() {
    return this._currentTime;
  }

  get percentagePlayed() {
    return this._percentagePlayed;
  }

  set percentagePlayed(value) {
    this._percentagePlayed = value;
    this.soundtouch.percentagePlayed = this._percentagePlayed;
  }

  get speed() {
    return this._speed;
  }

  set speed(value) {
    this._speed = value;
    this.soundtouch.tempo = this._speed;
  }

  get semitones() {
    return this._semitones;
  }

  set semitones(value) {
    this._semitones = value;
    this.soundtouch.pitchSemitones = this.semitones;
  }

  get volume() {
    return this._volume;
  }

  set volume(value) {
    this._volume = value;
    this.gainNode.gain.value = this.volume;
  }

  constructor() {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.audioContext.destination);
    this.addSoundtouchWorklet(this.audioContext);
  }

  playAudio(audio: ArrayBuffer) {
    this.audio = audio;
    this._percentagePlayed = 0;
    this.loadAudio();
  }

  playPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.restartSoundTouch) {
      this.loadAudio();
    } else {
      this.soundtouch.play();
    }
  }

  pause() {
    this.soundtouch.pause();
  }

  stop() {
    this.soundtouch.pause();
    this.percentagePlayed = this._currentTime = 0;
  }

  async export(): Promise<Blob> {
    const audio = this.audio;
    const semitones = this.semitones;
    const speed = this.speed;

    const offlineContext = new OfflineAudioContext(
      this.soundtouch.numberOfChannels,
      this.soundtouch.sampleRate * this.duration,
      this.soundtouch.sampleRate
    );

    await this.addSoundtouchWorklet(offlineContext);

    const soundtouch = createSoundTouchNode(offlineContext, AudioWorkletNode, audio);

    return new Promise<Blob>((resolve, reject) => {
      soundtouch.on('initialized', async () => {
        try {
          soundtouch.pitchSemitones = semitones;
          soundtouch.tempo = speed;
  
          // Si no se conecta el buffer no se puede reproducir
          soundtouch.connectToBuffer();
          soundtouch.connect(offlineContext.destination);
  
          const renderedBuffer = await offlineContext.startRendering();
          const wavBlob = await WavEncoder.encode(renderedBuffer);
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private addSoundtouchWorklet(audioContext: BaseAudioContext) {
    return audioContext.audioWorklet.addModule('./js/soundtouch-worklet.js')
      .catch(console.error);
  }

  private async loadAudio() {
    if (this.soundtouch) {
      this.soundtouch.off();
    }

    this.restartSoundTouch = false;
    this.soundtouch = createSoundTouchNode(this.audioContext, AudioWorkletNode, this.audio);

    this.soundtouch.on('initialized', () => {
      this.soundtouch.pitchSemitones = this._semitones;
      this.soundtouch.tempo = this._speed;
      this.soundtouch.percentagePlayed = this._percentagePlayed;

      // Si no se conecta el buffer no se puede reproducir
      this.soundtouch.connectToBuffer();
      this.soundtouch.connect(this.gainNode);

      this._audioReady = true;
      this.play();
    });

    this.soundtouch.on('play', (details) => {
      this._currentTime = Math.min(details.timePlayed, this.duration);
      this._percentagePlayed = details.percentagePlayed;
    })

    this.soundtouch.on('end', () => {
      this.soundtouch.connectToBuffer();
      this.soundtouch.connect(this.gainNode);
/*
      this.soundtouch.play();
      this.soundtouch.bufferNode.start(0);
      this.restartSoundTouch = true;*/
      console.log(this.soundtouch)
      console.log(this.soundtouch.bufferNode)
    })
  }
}
