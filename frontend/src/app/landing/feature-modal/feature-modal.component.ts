import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { LandingFeature } from '../landing-feature.model';

@Component({
  selector: 'app-feature-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-modal.component.html',
  styleUrls: ['./feature-modal.component.css']
})
export class FeatureModalComponent {
  @Input() feature: LandingFeature | null = null;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
  }
}
