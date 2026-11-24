import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OverflowMenu } from '../../components/common/OverflowMenu';

const makeItems = () => [
  { id: 'a', label: 'Export', onSelect: vi.fn() },
  { id: 'b', label: 'Archive', onSelect: vi.fn(), disabled: true },
  { id: 'c', label: 'Delete', onSelect: vi.fn(), danger: true },
];

describe('OverflowMenu', () => {
  it('renders a trigger with menu semantics and nothing for empty items', () => {
    const { container, rerender } = render(<OverflowMenu items={makeItems()} />);
    const trigger = screen.getByRole('button', { name: 'More actions' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    rerender(<OverflowMenu items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens on click, exposes role=menu/menuitem and focuses the first enabled item', async () => {
    const user = userEvent.setup();
    render(<OverflowMenu items={makeItems()} label="Page actions" />);
    await user.click(screen.getByRole('button', { name: 'Page actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
  });

  it('navigates with arrow keys, skipping disabled items, and wraps', async () => {
    const user = userEvent.setup();
    render(<OverflowMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  });

  it('opens from the keyboard with ArrowDown on the trigger', async () => {
    const user = userEvent.setup();
    render(<OverflowMenu items={makeItems()} />);
    screen.getByRole('button', { name: 'More actions' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<OverflowMenu items={makeItems()} />);
    const trigger = screen.getByRole('button', { name: 'More actions' });
    await user.click(trigger);
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onSelect, closes the menu and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const items = makeItems();
    render(<OverflowMenu items={items} />);
    const trigger = screen.getByRole('button', { name: 'More actions' });
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(items[2].onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('activates the focused item with Enter', async () => {
    const user = userEvent.setup();
    const items = makeItems();
    render(<OverflowMenu items={items} />);
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(items[0].onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelect for disabled items', async () => {
    const user = userEvent.setup();
    const items = makeItems();
    render(<OverflowMenu items={items} />);
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    const disabled = await screen.findByRole('menuitem', { name: 'Archive' });
    expect(disabled).toBeDisabled();
    fireEvent.click(disabled);
    expect(items[1].onSelect).not.toHaveBeenCalled();
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">outside</button>
        <OverflowMenu items={makeItems()} />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await screen.findByRole('menu');
    await user.click(screen.getByRole('button', { name: 'outside' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  describe('portal mode', () => {
    it('renders the menu in document.body, focuses the first item and keeps clicks off the parent', async () => {
      const user = userEvent.setup();
      const onParentClick = vi.fn();
      const items = makeItems();
      const { container } = render(
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div onClick={onParentClick} style={{ overflow: 'hidden' }}>
          <OverflowMenu portal items={items} label="Card actions" />
        </div>,
      );
      await user.click(screen.getByRole('button', { name: 'Card actions' }));
      const menu = await screen.findByRole('menu');
      expect(container.contains(menu)).toBe(false);
      expect(menu.parentElement).toBe(document.body);
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
      onParentClick.mockClear();
      await user.click(screen.getByRole('menuitem', { name: 'Export' }));
      expect(items[0].onSelect).toHaveBeenCalledTimes(1);
      expect(onParentClick).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('closes on Escape (focus returns to the trigger), outside press, a scroll that moves the trigger, and resize', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button type="button">outside</button>
          <OverflowMenu portal items={makeItems()} />
        </div>,
      );
      const trigger = screen.getByRole('button', { name: 'More actions' });
      await user.click(trigger);
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      expect(trigger).toHaveFocus();

      await user.click(trigger);
      await screen.findByRole('menu');
      await user.click(screen.getByRole('button', { name: 'outside' }));
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

      await user.click(trigger);
      await screen.findByRole('menu');
      // A scroll that leaves the trigger where it was (for example scrolling it into view) keeps the menu open.
      fireEvent.scroll(window);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      const spy = vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top: 120, left: 0 } as DOMRect);
      fireEvent.scroll(window);
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      spy.mockRestore();

      await user.click(trigger);
      await screen.findByRole('menu');
      fireEvent(window, new Event('resize'));
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('uses ariaLabel as the item name', async () => {
      const user = userEvent.setup();
      render(<OverflowMenu portal items={[{ id: 'a', label: 'Share link', ariaLabel: 'Share direct link to Lame', onSelect: vi.fn() }]} />);
      await user.click(screen.getByRole('button', { name: 'More actions' }));
      expect(await screen.findByRole('menuitem', { name: 'Share direct link to Lame' })).toBeInTheDocument();
    });

    it('clamps portaled menu above the mobile bottom navigation bar on narrow viewports', async () => {
      const user = userEvent.setup();
      const origW = window.innerWidth;
      const origH = window.innerHeight;
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 812, configurable: true });
      const offsetHSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(320);
      const offsetWSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
      try {
        render(<OverflowMenu portal items={makeItems()} label="Card actions" />);
        const trigger = screen.getByRole('button', { name: 'Card actions' });
        vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
          top: 720, bottom: 752, left: 320, right: 360, width: 40, height: 32, x: 320, y: 720, toJSON: () => ({}),
        } as DOMRect);
        await user.click(trigger);
        const menu = await screen.findByRole('menu');
        await waitFor(() => {
          const topPx = Number.parseFloat(menu.style.top || '9999');
          expect(topPx + 320).toBeLessThanOrEqual(812 - 72);
          expect(topPx).toBeGreaterThanOrEqual(8);
        });
      } finally {
        offsetHSpy.mockRestore();
        offsetWSpy.mockRestore();
        Object.defineProperty(window, 'innerWidth', { value: origW, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: origH, configurable: true });
      }
    });
  });
});