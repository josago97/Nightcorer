import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import createSoundTouchNode from '@soundtouchjs/audio-worklet';
import "regenerator-runtime/runtime";
import { TimePipe } from './pipes/time.pipe';
import { saveAs } from 'file-saver';
import audioEncoder from 'audio-encoder';
import { FileInputComponent } from "./components/file-input/file-input.component";

@Component({
  selector: 'app-root',
  imports: [FormsModule, TimePipe, FileInputComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  
  audioFile: File;
  audioReady = false;
  currentTime = 0;
  percentagePlayed = 0;
  speed = 1;
  semitones = 0;
  volume = 0.2;

  private audioContext: AudioContext;
  private audio: ArrayBuffer;
  private soundtouch: any;
  private gainNode: GainNode;

  get isPlaying() {
    return this.soundtouch.playing;
  }

  get duration() {
    return this.soundtouch.duration / this.speed;
  }

  ngOnInit(): void {
    this.audioContext = new AudioContext();
    this.addSoundtouchWorklet(this.audioContext);
  }

  async importAudioFile(file: File) {
    this.audioFile = file;
    this.audio = await this.audioFile.arrayBuffer();

    this.soundtouch = createSoundTouchNode(this.audioContext, AudioWorkletNode, this.audio);

    this.soundtouch.on('initialized', () => {
      // Si no se conecta el buffer no se puede reproducir
      const _ = this.soundtouch.connectToBuffer();
  
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      this.onSettingsChanged();

      this.soundtouch.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.audioReady = true;
      this.play();
    });

    this.soundtouch.on('play', () => {
      this.currentTime = this.soundtouch.currentTime;
      this.percentagePlayed = this.soundtouch.percentagePlayed;
    })
  }

  onSettingsChanged() {
    this.soundtouch.pitchSemitones = this.semitones;
    this.soundtouch.tempo = this.speed;
    this.gainNode.gain.value = this.volume;
  }

  seekTrack(event) {
    const currentTime = +event.target.value;
    this.soundtouch.percentagePlayed = currentTime;
    console.log('Nuevo current time:', currentTime)
  }

  playPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop() {
    this.pause();
    this.currentTime = 0;
  }

  private play() {
    this.soundtouch.play();
  }

  private pause() {
    this.soundtouch.pause();
  }

  async export() {
    const semitones = this.semitones;
    const speed = this.speed;

    const offlineContext = new OfflineAudioContext(
      this.soundtouch.numberOfChannels,
      this.soundtouch.sampleRate * this.duration,
      this.soundtouch.sampleRate
    );

    await this.addSoundtouchWorklet(offlineContext);

    const soundtouch = createSoundTouchNode(offlineContext, AudioWorkletNode, this.audio);
    soundtouch.on('initialized', async () => {
      soundtouch.pitchSemitones = semitones;
      soundtouch.tempo = speed;

      // Si no se conecta el buffer no se puede reproducir
      soundtouch.connectToBuffer();
      soundtouch.connect(offlineContext.destination);

      const renderedBuffer = await offlineContext.startRendering();
      
      audioEncoder(renderedBuffer, 0, null, blob => {
        const audioFileName = this.audioFile.name.substring(0, this.audioFile.name.lastIndexOf('.')) || this.audioFile.name
        saveAs(blob, `${audioFileName}_edited.wav`);
      });

    });
  }

  private addSoundtouchWorklet(audioContext: BaseAudioContext) {
    return audioContext.audioWorklet.addModule('./js/soundtouch-worklet.js')
      .catch(console.error);
  }
}
