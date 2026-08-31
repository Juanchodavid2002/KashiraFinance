import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart-canvas',
  template: '<canvas #canvas></canvas>',
  styles: ':host { display: block; position: relative; height: 100%; width: 100%; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCanvas {
  readonly config = input<ChartConfiguration | null>(null);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const config = this.config();

      if (!canvas) {
        return;
      }

      this.chart?.destroy();
      this.chart = config ? new Chart(canvas, config) : null;
    });

    this.destroyRef.onDestroy(() => this.chart?.destroy());
  }
}
