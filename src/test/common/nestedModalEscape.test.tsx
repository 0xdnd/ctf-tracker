import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Modal } from '../../components/common/Modal';
import { OverflowMenu } from '../../components/common/OverflowMenu';
import { CyberSelect } from '../../components/common/CyberSelect';
import { AddLootModal } from '../../components/loot/AddLootModal';
import { GraphView } from '../../components/tracker/GraphView';
import { useTacticalHotkeys } from '../../hooks/useTacticalHotkeys';
import { useCtfStore } from '../../store/useCtfStore';
import { STARTER_MACHINES } from '../../data/starterMachines';

const dispatchEscape = (target: Element | Window = document.activeElement || window) => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
};

describe('Nested Escape & Modal Hotkey Isolation', () => {
  afterEach(() => {
    cleanup();
    useCtfStore.setState({
      soundEnabled: false,
      focusMode: false,
      viewMode: 'kanban',
      reconAutomationModalOpen: false,
    });
  });

  it('closes CyberSelect inside AddLootModal on first Escape, then closes AddLootModal on second Escape', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <AddLootModal
          isOpen
          onClose={onClose}
          machines={STARTER_MACHINES}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const pickerTrigger = screen.getByRole('button', { name: /Target machine/i });
    fireEvent.click(pickerTrigger);
    expect(pickerTrigger.getAttribute('aria-expanded')).toBe('true');

    // First Escape closes only the dropdown
    dispatchEscape(pickerTrigger);
    expect(pickerTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(onClose).not.toHaveBeenCalled();

    // Second Escape closes AddLootModal
    dispatchEscape(pickerTrigger);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes portaled OverflowMenu inside Modal on first Escape, then closes Modal on second Escape', () => {
    const onClose = vi.fn();
    const Wrapper: React.FC = () => {
      const [open] = useState(true);
      return (
        <MotionConfig reducedMotion="always">
          <Modal open={open} onClose={onClose} ariaLabel="Parent dialog" instant>
            <div>
              <OverflowMenu
                portal
                label="Nested actions"
                items={[{ id: 'a', label: 'Action A', onSelect: () => {} }]}
              />
            </div>
          </Modal>
        </MotionConfig>
      );
    };

    render(<Wrapper />);
    const trigger = screen.getByRole('button', { name: 'Nested actions' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Nested actions' })).toBeTruthy();

    // First Escape closes only the portaled menu
    dispatchEscape(screen.getByRole('menuitem', { name: 'Action A' }));
    expect(onClose).not.toHaveBeenCalled();

    // Second Escape closes the parent Modal
    dispatchEscape(trigger);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('suppresses background single-key hotkeys (f, 2, p) while a Modal focus trap is open', () => {
    const Harness: React.FC = () => {
      useTacticalHotkeys();
      return (
        <Modal open onClose={() => {}} ariaLabel="Settings dialog" instant>
          <button type="button">Focusable modal button</button>
        </Modal>
      );
    };

    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    );

    const btn = screen.getByRole('button', { name: 'Focusable modal button' });
    btn.focus();

    for (const key of ['f', '2', 'p']) {
      act(() => {
        btn.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      });
    }

    expect(useCtfStore.getState().focusMode).toBe(false);
    expect(useCtfStore.getState().viewMode).toBe('kanban');
    expect(useCtfStore.getState().reconAutomationModalOpen).toBe(false);
  });

  it('unwinds 3-level Escape stack (CyberSelect -> Modal -> fullscreen GraphView) even when focus moved outside CyberSelect', () => {
    const Harness: React.FC = () => {
      useTacticalHotkeys();
      const [modalOpen, setModalOpen] = useState(false);
      const [val, setVal] = useState('a');
      return (
        <div>
          <GraphView filteredMachines={STARTER_MACHINES.slice(0, 2)} />
          <button type="button" onClick={() => setModalOpen(true)}>
            Open overlay modal
          </button>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} ariaLabel="Overlay modal" instant>
            <div>
              <CyberSelect
                ariaLabel="Nested select"
                value={val}
                onChange={setVal}
                options={[
                  { value: 'a', label: 'Option A' },
                  { value: 'b', label: 'Option B' },
                ]}
              />
              <button type="button">Sibling modal button</button>
            </div>
          </Modal>
        </div>
      );
    };

    const { container } = render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    );

    // 1. Enter GraphView fullscreen first (registers GraphView's window Escape listener first)
    const fsBtn = screen.getByTestId('graph-fullscreen-toggle');
    fireEvent.click(fsBtn);
    const graphRoot = container.querySelector('#graph-canvas')?.closest('div.fixed');
    expect(graphRoot).not.toBeNull();

    // 2. Open Modal on top of fullscreen GraphView
    fireEvent.click(screen.getByRole('button', { name: 'Open overlay modal' }));
    expect(screen.getByRole('dialog', { name: 'Overlay modal' })).toBeInTheDocument();

    // 3. Open CyberSelect inside Modal, then shift focus to a sibling button inside the Modal
    const selectTrigger = screen.getByRole('button', { name: /Nested select/i });
    fireEvent.click(selectTrigger);
    expect(selectTrigger.getAttribute('aria-expanded')).toBe('true');

    const siblingBtn = screen.getByRole('button', { name: 'Sibling modal button' });
    siblingBtn.focus();

    // Escape #1: closes only CyberSelect; Modal stays open and GraphView stays fullscreen
    dispatchEscape(siblingBtn);
    expect(selectTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('dialog', { name: 'Overlay modal' })).toBeInTheDocument();
    expect(container.querySelector('#graph-canvas')?.closest('div.fixed')).not.toBeNull();

    // Escape #2: closes Modal; GraphView stays fullscreen
    dispatchEscape(siblingBtn);
    expect(screen.queryByRole('dialog', { name: 'Overlay modal' })).toBeNull();
    expect(container.querySelector('#graph-canvas')?.closest('div.fixed')).not.toBeNull();

    // Escape #3: exits GraphView fullscreen
    dispatchEscape(window);
    expect(container.querySelector('#graph-canvas')?.closest('div.fixed')).toBeNull();
  });
});
