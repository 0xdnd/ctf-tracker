import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ScrollProvider,
  useScrollActions,
  useScrollState,
  useWorkspaceScroll,
} from './ScrollContext';

describe('ScrollContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const TestConsumer: React.FC<{
    onMount?: (actions: ReturnType<typeof useScrollActions>, state: ReturnType<typeof useScrollState>) => void;
  }> = ({ onMount }) => {
    const actions = useScrollActions();
    const state = useScrollState();

    useEffect(() => {
      onMount?.(actions, state);
    }, [actions, state, onMount]);

    return (
      <div>
        <div data-testid="scroll-top">{state.scrollTop}</div>
        <div data-testid="scroll-progress">{state.scrollProgress}</div>
        <div data-testid="is-scrolled">{state.isScrolled ? 'yes' : 'no'}</div>
        <button data-testid="scroll-to-top-btn" onClick={actions.scrollToTop}>
          Scroll Top
        </button>
      </div>
    );
  };

  it('provides default initial state and actions', () => {
    render(
      <ScrollProvider>
        <TestConsumer />
      </ScrollProvider>
    );

    expect(screen.getByTestId('scroll-top').textContent).toBe('0');
    expect(screen.getByTestId('scroll-progress').textContent).toBe('0');
    expect(screen.getByTestId('is-scrolled').textContent).toBe('no');
  });

  it('combines actions and state seamlessly in useWorkspaceScroll', () => {
    let combinedHookValue: ReturnType<typeof useWorkspaceScroll> | null = null;

    const CombinedConsumer: React.FC = () => {
      combinedHookValue = useWorkspaceScroll();
      return <div>Combined Consumer</div>;
    };

    render(
      <ScrollProvider>
        <CombinedConsumer />
      </ScrollProvider>
    );

    expect(combinedHookValue).not.toBeNull();
    expect(combinedHookValue!.scrollTop).toBe(0);
    expect(combinedHookValue!.scrollProgress).toBe(0);
    expect(combinedHookValue!.isScrolled).toBe(false);
    expect(typeof combinedHookValue!.scrollToTop).toBe('function');
    expect(typeof combinedHookValue!.setScrollElement).toBe('function');
    expect(typeof combinedHookValue!.scrollProgressMotion?.get).toBe('function');
  });

  it('attaches scroll element and responds to scroll events', async () => {
    let capturedActions: ReturnType<typeof useScrollActions> | null = null;
    let capturedState: ReturnType<typeof useScrollState> | null = null;

    render(
      <ScrollProvider>
        <TestConsumer
          onMount={(actions, state) => {
            capturedActions = actions;
            capturedState = state;
          }}
        />
      </ScrollProvider>
    );

    const mockElement = document.createElement('div');
    Object.defineProperty(mockElement, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(mockElement, 'scrollHeight', { value: 1500, configurable: true });
    Object.defineProperty(mockElement, 'scrollTop', { value: 250, writable: true, configurable: true });
    mockElement.scrollTo = vi.fn();

    act(() => {
      capturedActions?.setScrollElement(mockElement);
    });

    // Fire scroll event on mockElement
    act(() => {
      mockElement.scrollTop = 300;
      mockElement.dispatchEvent(new Event('scroll'));
      vi.runAllTimers();
    });

    // Test scrollToTop trigger
    act(() => {
      capturedActions?.scrollToTop();
    });

    expect(mockElement.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
