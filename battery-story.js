(() => {
  const story = document.querySelector('[data-battery-story]');
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.header');
  if (!story || !hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cells = [...story.querySelectorAll('[data-cell]')];
  const steps = [...story.querySelectorAll('[data-battery-step]')];
  const label = story.querySelector('[data-battery-stage]');
  const names = ['Ячейки', 'Соединения', 'Плата BMS', 'Корпус', 'LifeBatt включён'];
  const clamp = n => Math.max(0, Math.min(1, n));
  const phase = (p, start, end) => clamp((p - start) / (end - start));
  const ease = t => t * t * (3 - 2 * t);
  let frame = 0, start = 0, range = 1, lastStage = -1;
  function measure() {
    start = Math.max(0, hero.offsetTop + hero.offsetHeight - (header?.offsetHeight || 0));
    range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight - start);
    schedule();
  }
  function draw() {
    frame = 0;
    story.classList.toggle('is-visible', window.scrollY >= start);
    const p = reduced.matches ? 1 : clamp((window.scrollY - start) / range);
    const set = (name, value) => story.style.setProperty(name, value.toFixed(4));
    cells.forEach((cell, i) => {
      const t = ease(phase(p, .015 + i * .012, .15 + i * .012));
      cell.style.setProperty('--assembled', t.toFixed(4));
    });
    set('--connected', phase(p, .25, .40));
    set('--board', ease(phase(p, .43, .56)));
    set('--case', ease(phase(p, .61, .77)));
    set('--powered', phase(p, .81, .93));
    set('--branded', ease(phase(p, .90, .98)));
    const stage = p < .25 ? 0 : p < .43 ? 1 : p < .61 ? 2 : p < .81 ? 3 : 4;
    if (stage !== lastStage) {
      label.textContent = names[stage];
      story.dataset.stage = String(stage);
      steps.forEach((step, i) => step.classList.toggle('is-complete', i <= stage));
      lastStage = stage;
    }
    story.dataset.progress = p.toFixed(4);
    story.dataset.motion = reduced.matches ? 'reduced' : 'scroll';
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', measure, {passive: true});
  window.addEventListener('pageshow', measure);
  window.addEventListener('load', measure);
  reduced.addEventListener('change', measure);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(document.body);
  measure();
})();
