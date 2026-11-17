import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginCharacters } from './login-characters';

describe('LoginCharacters', () => {
  let fixture: ComponentFixture<LoginCharacters>;
  let element: HTMLElement;
  let motion: MediaQueryList;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    motion = new EventTarget() as MediaQueryList;
    Object.defineProperty(motion, 'matches', { value: false, configurable: true });
    vi.stubGlobal('matchMedia', vi.fn(() => motion));

    await TestBed.configureTestingModule({
      imports: [LoginCharacters]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginCharacters);
    element = fixture.nativeElement;
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      x: 100, y: 100, left: 100, top: 100, right: 540, bottom: 390,
      width: 440, height: 290, toJSON: () => ({})
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function move(x: number, y: number): void {
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));
  }

  function renderFrame(): void {
    vi.advanceTimersToNextFrame();
    fixture.detectChanges();
  }

  it('should follow the latest cursor position within the eye bounds', () => {
    move(0, 0);
    move(2000, 2000);
    renderFrame();

    expect(element.style.getPropertyValue('--look-x')).toBe('4px');
    expect(element.style.getPropertyValue('--look-y')).toBe('3px');

    move(-2000, -2000);
    renderFrame();
    expect(element.style.getPropertyValue('--look-x')).toBe('-4px');
    expect(element.style.getPropertyValue('--look-y')).toBe('-3px');
  });

  it('should look away and ignore movement while the password is active', () => {
    move(2000, 2000);
    fixture.componentRef.setInput('passwordActive', true);
    renderFrame();

    expect(element.classList.contains('password-active')).toBe(true);
    expect(element.style.getPropertyValue('--look-x')).toBe('0px');

    move(0, 0);
    renderFrame();
    expect(element.style.getPropertyValue('--look-x')).toBe('0px');

    fixture.componentRef.setInput('passwordActive', false);
    fixture.detectChanges();
    move(2000, 2000);
    renderFrame();
    expect(element.classList.contains('password-active')).toBe(false);
    expect(element.style.getPropertyValue('--look-x')).toBe('4px');
  });

  it('should stop tracking when reduced motion is enabled and resume when it is disabled', () => {
    move(2000, 2000);
    renderFrame();

    Object.defineProperty(motion, 'matches', { value: true, configurable: true });
    motion.dispatchEvent(new Event('change'));
    move(0, 0);
    renderFrame();

    expect(element.style.getPropertyValue('--look-x')).toBe('0px');
    expect(element.style.getPropertyValue('--look-y')).toBe('0px');

    Object.defineProperty(motion, 'matches', { value: false, configurable: true });
    motion.dispatchEvent(new Event('change'));
    move(2000, 2000);
    renderFrame();
    expect(element.style.getPropertyValue('--look-x')).toBe('4px');
  });

  it('should reset the eyes and cancel pending movement when the pointer leaves the window', () => {
    move(2000, 2000);
    renderFrame();
    move(0, 0);
    document.dispatchEvent(new MouseEvent('pointerout', { relatedTarget: null }));
    const bounds = vi.mocked(element.getBoundingClientRect);
    bounds.mockClear();
    renderFrame();

    expect(bounds).not.toHaveBeenCalled();
    expect(element.style.getPropertyValue('--look-x')).toBe('0px');
    expect(element.style.getPropertyValue('--look-y')).toBe('0px');
  });

  it('should cancel pending movement and remove listeners when destroyed', () => {
    const removeListener = vi.spyOn(motion, 'removeEventListener');
    move(2000, 2000);
    fixture.destroy();

    vi.advanceTimersToNextFrame();
    expect(element.getBoundingClientRect).not.toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));

    move(0, 0);
    vi.advanceTimersToNextFrame();
    expect(element.getBoundingClientRect).not.toHaveBeenCalled();
  });
});
