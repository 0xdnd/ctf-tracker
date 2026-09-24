import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { FilterDrawer } from './FilterDrawer';
import { useCtfStore } from '../../store/useCtfStore';

describe('FilterDrawer component', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCtfStore.setState({
      filterDrawerOpen: true,
      soundEnabled: false,
      filters: {
        search: '',
        selectedDifficulty: 'ALL',
        selectedOs: 'ALL',
        selectedStatus: 'ALL',
        selectedTrack: 'ALL',
        selectedTracks: [],
        selectedCert: 'ALL',
        excludeActiveDirectory: false,
        selectedVulnCategory: 'ALL',
        selectedLanguage: 'ALL',
        selectedAreaOfInterest: 'ALL',
        selectedTechnique: 'ALL',
        selectedTags: [],
      },
    });
  });

  it('renders nothing when filterDrawerOpen is false', () => {
    useCtfStore.setState({ filterDrawerOpen: false });
    render(<FilterDrawer />);
    expect(screen.queryByRole('dialog', { name: /Advanced filters drawer/i })).not.toBeInTheDocument();
  });

  it('renders the drawer when filterDrawerOpen is true', () => {
    render(<FilterDrawer />);
    const dialog = screen.getByRole('dialog', { name: /Advanced filters drawer/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });

  it('closes the drawer when clicking the close button', () => {
    render(<FilterDrawer />);
    const closeBtn = screen.getByRole('button', { name: /Close filter drawer/i });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(useCtfStore.getState().filterDrawerOpen).toBe(false);
  });

  it('displays the accordion sections and toggles open/close', () => {
    render(<FilterDrawer />);
    
    // Status section should be open by default
    expect(screen.getByText('Status & Certification Scopes')).toBeInTheDocument();
    expect(screen.getByText('Curated Practice Tracks')).toBeInTheDocument();
    expect(screen.getByText('Vulnerability Domains')).toBeInTheDocument();
    expect(screen.getByText('Specialized & Tactical Filters')).toBeInTheDocument();
    expect(screen.getByText('Tags & Keywords')).toBeInTheDocument();

    // Click on Curated Practice Tracks accordion button to expand it
    const tracksSectionBtn = screen.getByRole('button', { name: /Curated Practice Tracks/i });
    fireEvent.click(tracksSectionBtn);

    // Now track search or track items should be visible
    expect(screen.getByPlaceholderText(/Search curated tracks/i)).toBeInTheDocument();
  });

  it('resets all filters when clicking Reset All', () => {
    // Set some active filters
    useCtfStore.setState({
      filters: {
        ...useCtfStore.getState().filters,
        selectedStatus: 'COMPLETED',
        selectedCert: 'OSCP',
        selectedTags: ['sqli'],
      },
    });

    render(<FilterDrawer />);

    // Reset button should now be enabled
    const resetBtn = screen.getByRole('button', { name: /Reset All/i });
    expect(resetBtn).not.toBeDisabled();

    fireEvent.click(resetBtn);

    const updatedFilters = useCtfStore.getState().filters;
    expect(updatedFilters.selectedStatus).toBe('ALL');
    expect(updatedFilters.selectedCert).toBe('ALL');
    expect(updatedFilters.selectedTags).toEqual([]);
  });

  it('allows searching tags and toggling a tag', () => {
    render(<FilterDrawer />);

    // Open Tags & Keywords section
    const tagsSectionBtn = screen.getByRole('button', { name: /Tags & Keywords/i });
    fireEvent.click(tagsSectionBtn);

    const tagSearch = screen.getByPlaceholderText(/Search tags/i);
    expect(tagSearch).toBeInTheDocument();

    // Type a search query into tag search input
    fireEvent.change(tagSearch, { target: { value: 'sqli' } });
    expect((tagSearch as HTMLInputElement).value).toBe('sqli');
  });

  it('closes drawer and shows matching targets count when clicking Apply button', () => {
    render(<FilterDrawer />);

    const applyBtn = screen.getByRole('button', { name: /Show \d+ Targets/i });
    expect(applyBtn).toBeInTheDocument();

    fireEvent.click(applyBtn);
    expect(useCtfStore.getState().filterDrawerOpen).toBe(false);
  });
});
