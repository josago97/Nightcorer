import { Component } from '@angular/core';
import { AudioPlayerService } from '../../services/audio-player.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-audio-player',
  imports: [FormsModule],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.css'
})
export class AudioPlayerComponent {

  constructor(protected player: AudioPlayerService) {}

  protected displayTime(time: number): string {
    if (time === null || time === undefined || isNaN(time) || time < 0) {
      return '--:--';
    }

    time = Math.ceil(time);
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
