import { describe, it, expect } from 'vitest';
import {
  TACTICAL_SPRING,
  MODAL_ASYMMETRIC_TRANSITION,
  DRAWER_SLIDE_TRANSITION,
  CASCADE_STAGGER_DELAY,
  TACTILE_TAP_CLASS,
  TACTILE_WHILE_TAP,
  MOTION_TRANSITIONS,
} from '../../utils/motionTokens';

describe('Tactile Hardware-Grade Motion Tokens', () => {
  describe('TACTICAL_SPRING', () => {
    it('implements zero bounce and 0.28s duration physics for cockpit responsiveness', () => {
      expect(TACTICAL_SPRING.type).toBe('spring');
      expect(TACTICAL_SPRING.bounce).toBe(0);
      expect(TACTICAL_SPRING.duration).toBe(0.28);
    });
  });

  describe('MODAL_ASYMMETRIC_TRANSITION', () => {
    it('implements deliberate spring entrance and snappy <=150ms exit dismissal', () => {
      // Entrance
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.scale.type).toBe('spring');
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.scale.bounce).toBe(0);
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.scale.duration).toBe(0.28);
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.y.type).toBe('spring');
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.y.duration).toBe(0.28);
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.opacity.duration).toBe(0.2);

      // Dismissal (must be <= 150ms)
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.scale.duration).toBeLessThanOrEqual(0.15);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.scale.duration).toBe(0.14);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.y.duration).toBeLessThanOrEqual(0.15);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.opacity.duration).toBeLessThanOrEqual(0.15);
    });
  });

  describe('DRAWER_SLIDE_TRANSITION', () => {
    it('implements deliberate spring slide entrance and snappy <=150ms dismissal', () => {
      // Entrance
      expect(DRAWER_SLIDE_TRANSITION.enter.type).toBe('spring');
      expect(DRAWER_SLIDE_TRANSITION.enter.bounce).toBe(0);
      expect(DRAWER_SLIDE_TRANSITION.enter.duration).toBe(0.28);

      // Exit dismissal
      expect(DRAWER_SLIDE_TRANSITION.exit.duration).toBeLessThanOrEqual(0.15);
      expect(DRAWER_SLIDE_TRANSITION.exit.duration).toBe(0.15);
    });
  });

  describe('CASCADE_STAGGER_DELAY', () => {
    it('calculates 20ms incremental stagger delay capped at 300ms', () => {
      expect(CASCADE_STAGGER_DELAY(0)).toBe(0);
      expect(CASCADE_STAGGER_DELAY(1)).toBe(0.02);
      expect(CASCADE_STAGGER_DELAY(5)).toBe(0.10);
      expect(CASCADE_STAGGER_DELAY(15)).toBe(0.30);
      // Beyond 15 items, stagger caps at 0.30 to avoid blocking interaction
      expect(CASCADE_STAGGER_DELAY(20)).toBe(0.30);
      expect(CASCADE_STAGGER_DELAY(100)).toBe(0.30);
    });
  });

  describe('Tactile Press Feedback', () => {
    it('provides standard active:scale-[0.97] utility class', () => {
      expect(TACTILE_TAP_CLASS).toBe('active:scale-[0.97]');
    });

    it('provides Framer Motion whileTap configuration with scale 0.97', () => {
      expect(TACTILE_WHILE_TAP.scale).toBe(0.97);
    });

    it('exposes MOTION_TRANSITIONS presets map', () => {
      expect(MOTION_TRANSITIONS.tacticalSpring).toEqual(TACTICAL_SPRING);
      expect(MOTION_TRANSITIONS.drawerSlideEnter).toEqual(DRAWER_SLIDE_TRANSITION.enter);
      expect(MOTION_TRANSITIONS.drawerSlideExit).toEqual(DRAWER_SLIDE_TRANSITION.exit);
    });
  });
});
