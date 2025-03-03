import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { FileInputComponent } from "./components/file-input/file-input.component";
import { AudioPlayerService } from './services/audio-player.service';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';

@Component({
  selector: 'app-root',
  imports: [FormsModule, FileInputComponent, AudioPlayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  
  audioFile: File;

  constructor(protected player: AudioPlayerService) {}

  async importAudioFile(file: File) {
    this.audioFile = file;
    const buffer = await this.audioFile.arrayBuffer();

    this.player.playAudio(buffer);
  }

  async exportToWav() {
    const file = await this.player.export();

    const audioFileName = this.audioFile.name.substring(0, this.audioFile.name.lastIndexOf('.')) || this.audioFile.name
    saveAs(file, `${audioFileName}_edited.wav`);
  }
}
