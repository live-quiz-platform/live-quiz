import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-animated-title',
  templateUrl: './animated-title.html',
  styleUrl: './animated-title.scss',
  host: {
    'aria-hidden': 'true',
    '[style.--title-delay]': 'delay() + "ms"'
  }
})
export class AnimatedTitle {
  readonly lines = input.required<string[]>();
  readonly delay = input(120);

  protected readonly titleLines = computed(() => {
    let index = 0;

    return this.lines().map((line) =>
      line.split(' ').map((word) =>
        Array.from(word, (letter) => ({ letter, index: index++ }))
      )
    );
  });
}
