import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { LandingFeature } from '../landing-feature.model';

@Component({
  selector: 'app-feature-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-card.component.html',
  styleUrls: ['./feature-card.component.css']
})
export class FeatureCardComponent {
  @Input({ required: true }) feature!: LandingFeature;
  @Output() selectFeature = new EventEmitter<LandingFeature>();

  onSelect(): void {
    this.selectFeature.emit(this.feature);
  }
}
