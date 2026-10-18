import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RouteErrorBoundary } from '../../components/common/RouteErrorBoundary';

let shouldThrow = true;
let errorToThrow: Error = new Error('boom');

const Bomb: React.FC = () => {
  if (shouldThrow) throw errorToThrow;
  return <div>Recovered content</div>;
};

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    errorToThrow = new Error('boom');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows reload path for chunk-load errors', () => {
    errorToThrow = new Error('Failed to fetch dynamically imported module: /assets/x.js');
    render(<RouteErrorBoundary><Bomb /></RouteErrorBoundary>);
    expect(screen.getByText("Couldn't load this view")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reload$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/ })).toBeNull();
  });

  it('Try again re-renders children after the throw is cleared', () => {
    render(<RouteErrorBoundary><Bomb /></RouteErrorBoundary>);
    expect(screen.getByText('Something went wrong in this view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload app/ })).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  it('resets when resetKey changes', () => {
    const { rerender } = render(
      <RouteErrorBoundary resetKey="/a"><Bomb /></RouteErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    rerender(<RouteErrorBoundary resetKey="/b"><Bomb /></RouteErrorBoundary>);
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });
});
