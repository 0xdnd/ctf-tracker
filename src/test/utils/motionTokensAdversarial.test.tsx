import React, { useContext } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  MotionConfig,
  MotionConfigContext,
  motion,
  useReducedMotionConfig,
} from 'framer-motion';
import {
  TACTICAL_SPRING,
  MODAL_ASYMMETRIC_TRANSITION,
  DRAWER_SLIDE_TRANSITION,
  CASCADE_STAGGER_DELAY,
  TACTILE_TAP_CLASS,
  TACTILE_WHILE_TAP,
  MOTION_TRANSITIONS,
} from '../../utils/motionTokens';
import { App } from '../../App';

describe('Challenger M1_1 Adversarial Stress Harness: Motion Tokens & Invariants', () => {
  describe('1. CASCADE_STAGGER_DELAY Numerical Edge Cases & Boundaries', () => {
    it('handles base zero index with zero delay', () => {
      expect(CASCADE_STAGGER_DELAY(0)).toBe(0);
    });

    it('calculates linear progression for standard indices below saturation', () => {
      expect(CASCADE_STAGGER_DELAY(1)).toBeCloseTo(0.02, 5);
      expect(CASCADE_STAGGER_DELAY(5)).toBeCloseTo(0.10, 5);
      expect(CASCADE_STAGGER_DELAY(10)).toBeCloseTo(0.20, 5);
      expect(CASCADE_STAGGER_DELAY(14)).toBeCloseTo(0.28, 5);
    });

    it('reaches exact saturation threshold at index 15 (300ms cap)', () => {
      expect(CASCADE_STAGGER_DELAY(15)).toBe(0.30);
    });

    it('clamps strictly at 0.30s for arbitrarily large indices', () => {
      expect(CASCADE_STAGGER_DELAY(16)).toBe(0.30);
      expect(CASCADE_STAGGER_DELAY(50)).toBe(0.30);
      expect(CASCADE_STAGGER_DELAY(500)).toBe(0.30);
      expect(CASCADE_STAGGER_DELAY(100_000)).toBe(0.30);
      expect(CASCADE_STAGGER_DELAY(Number.MAX_SAFE_INTEGER)).toBe(0.30);
      expect(CASCADE_STAGGER_DELAY(Infinity)).toBe(0.30);
    });

    it('evaluates float and fractional indices predictably', () => {
      expect(CASCADE_STAGGER_DELAY(0.5)).toBeCloseTo(0.01, 5);
      expect(CASCADE_STAGGER_DELAY(2.5)).toBeCloseTo(0.05, 5);
    });

    it('documents mathematical behavior on negative indices', () => {
      // Math.min(-1 * 0.02, 0.3) yields -0.02
      const negVal = CASCADE_STAGGER_DELAY(-1);
      expect(negVal).toBe(-0.02);
      expect(negVal).toBeLessThan(0);
    });
  });

  describe('2. Emil Kowalski Spring Physics Invariants', () => {
    it('enforces zero bounce and critically damped duration in TACTICAL_SPRING', () => {
      expect(TACTICAL_SPRING.type).toBe('spring');
      expect(TACTICAL_SPRING.bounce).toBe(0);
      expect(TACTICAL_SPRING.duration).toBe(0.28);
      // Ensure no conflicting spring parameters
      expect((TACTICAL_SPRING as any).stiffness).toBeUndefined();
      expect((TACTICAL_SPRING as any).damping).toBeUndefined();
      expect((TACTICAL_SPRING as any).mass).toBeUndefined();
    });

    it('enforces strict asymmetric contract in MODAL_ASYMMETRIC_TRANSITION', () => {
      // Entrance must be deliberate spring (280ms)
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.scale.type).toBe('spring');
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.scale.duration).toBe(0.28);
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.scale.bounce).toBe(0);
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.y.type).toBe('spring');
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.y.duration).toBe(0.28);
      expect(MODAL_ASYMMETRIC_TRANSITION.enter.opacity.duration).toBe(0.20);

      // Exit dismissal must be strictly <= 150ms across all animated channels
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.scale.duration).toBeLessThanOrEqual(0.15);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.scale.duration).toBe(0.14);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.y.duration).toBeLessThanOrEqual(0.15);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.y.duration).toBe(0.14);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.opacity.duration).toBeLessThanOrEqual(0.15);
      expect(MODAL_ASYMMETRIC_TRANSITION.exit.opacity.duration).toBe(0.12);

      // Dismissal is faster than entrance (asymmetric ratio > 1.8x)
      const ratio = MODAL_ASYMMETRIC_TRANSITION.enter.scale.duration / MODAL_ASYMMETRIC_TRANSITION.exit.scale.duration;
      expect(ratio).toBeGreaterThan(1.8);
    });

    it('enforces strict asymmetric contract in DRAWER_SLIDE_TRANSITION', () => {
      // Enter is spring 0.28s
      expect(DRAWER_SLIDE_TRANSITION.enter.type).toBe('spring');
      expect(DRAWER_SLIDE_TRANSITION.enter.bounce).toBe(0);
      expect(DRAWER_SLIDE_TRANSITION.enter.duration).toBe(0.28);

      // Exit is strictly <= 150ms
      expect(DRAWER_SLIDE_TRANSITION.exit.duration).toBeLessThanOrEqual(0.15);
      expect(DRAWER_SLIDE_TRANSITION.exit.duration).toBe(0.15);
    });

    it('validates tactile compression alignment (0.97)', () => {
      expect(TACTILE_TAP_CLASS).toBe('active:scale-[0.97]');
      expect(TACTILE_WHILE_TAP.scale).toBe(0.97);
      expect(TACTILE_WHILE_TAP.transition.duration).toBe(0.1);
    });
  });

  describe('3. MotionConfig Root Hierarchy & Reduced-Motion Context Invariants', () => {
    it('sets reducedMotion="user" in MotionConfigContext when mounted', () => {
      let contextValue: any = null;

      const ContextInspector = () => {
        contextValue = useContext(MotionConfigContext);
        return <div data-testid="context-inspector">Context captured</div>;
      };

      // Default outside MotionConfig is 'never'
      const { unmount: unmount1 } = render(<ContextInspector />);
      expect(contextValue.reducedMotion).toBe('never');
      unmount1();

      // Inside MotionConfig with reducedMotion="user"
      const { unmount: unmount2 } = render(
        <MotionConfig reducedMotion="user">
          <ContextInspector />
        </MotionConfig>
      );

      expect(contextValue.reducedMotion).toBe('user');
      unmount2();
    });

    it('validates useReducedMotionConfig behavior across modes', () => {
      let configResultAlways: boolean | null = null;
      let configResultNever: boolean | null = null;

      const ConsumerAlways = () => {
        configResultAlways = useReducedMotionConfig();
        return null;
      };

      const ConsumerNever = () => {
        configResultNever = useReducedMotionConfig();
        return null;
      };

      render(
        <>
          <MotionConfig reducedMotion="always">
            <ConsumerAlways />
          </MotionConfig>
          <MotionConfig reducedMotion="never">
            <ConsumerNever />
          </MotionConfig>
        </>
      );

      expect(configResultAlways).toBe(true);
      expect(configResultNever).toBe(false);
    });

    it('renders motion.div components under MotionConfig with TACTICAL_SPRING without errors', () => {
      const { container } = render(
        <MotionConfig reducedMotion="user">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={TACTICAL_SPRING}
            data-testid="animated-box"
          >
            Tactical Box
          </motion.div>
        </MotionConfig>
      );

      const box = screen.getByTestId('animated-box');
      expect(box).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });

    it('verifies that App mounts completely with MotionConfig without routing or context crashes', async () => {
      // Render full App in JSDOM
      const { container, unmount } = render(<App />);

      expect(container).toBeInTheDocument();
      // App should render without throwing
      unmount();
    });
  });
});
