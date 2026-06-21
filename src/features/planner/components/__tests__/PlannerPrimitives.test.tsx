import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);
import {
  PlannerEmptyState,
  PlannerErrorState,
  PlannerLoadingState,
  PlannerPageHeader,
  PlannerSyncStatus,
  PlannerTabs,
  PlannerTaskCard,
  PlannerEventCard,
  PlannerSectionCard,
} from '../PlannerPrimitives';

describe('PlannerPrimitives', () => {
  describe('PlannerPageHeader', () => {
    it('renders title and description', () => {
      render(<PlannerPageHeader title="Test Title" description="Test description" />);
      expect(screen.getByText('Test Title')).toBeDefined();
      expect(screen.getByText('Test description')).toBeDefined();
    });

    it('renders eyebrow text when provided', () => {
      render(<PlannerPageHeader title="Title" eyebrow="Eyebrow" />);
      expect(screen.getByText('Eyebrow')).toBeDefined();
    });

    it('renders actions when provided', () => {
      render(<PlannerPageHeader title="Title" actions={<button>Action</button>} />);
      expect(screen.getByText('Action')).toBeDefined();
    });
  });

  describe('PlannerTabs', () => {
    it('renders all tab items', () => {
      const items = [
        { id: 'tab1', label: 'Tab One' },
        { id: 'tab2', label: 'Tab Two' },
      ];
      render(<PlannerTabs items={items} activeId="tab1" onChange={() => {}} />);
      expect(screen.getByText('Tab One')).toBeDefined();
      expect(screen.getByText('Tab Two')).toBeDefined();
    });

    it('marks the active tab with aria-selected', () => {
      const items = [
        { id: 'tab1', label: 'Tab One' },
        { id: 'tab2', label: 'Tab Two' },
      ];
      const { container } = render(<PlannerTabs items={items} activeId="tab1" onChange={() => {}} />);
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    });

    it('passes tab id to onChange handler on click', () => {
      const items = [{ id: 'my-tab', label: 'My Tab' }];
      let captured = '';
      render(<PlannerTabs items={items} activeId="" onChange={(id) => { captured = id; }} />);
      screen.getByText('My Tab').click();
      expect(captured).toBe('my-tab');
    });

    it('sets role="tablist" on container', () => {
      const { container } = render(<PlannerTabs items={[]} activeId="" onChange={() => {}} />);
      expect(container.querySelector('[role="tablist"]')).toBeDefined();
    });
  });

  describe('PlannerTaskCard', () => {
    it('renders title', () => {
      render(<PlannerTaskCard title="My Task" />);
      expect(screen.getByText('My Task')).toBeDefined();
    });

    it('renders priority and status chips', () => {
      render(<PlannerTaskCard title="Task" priority="high" status="in_progress" />);
      expect(screen.getByText('high')).toBeDefined();
      expect(screen.getByText('in_progress')).toBeDefined();
    });

    it('renders meta text', () => {
      render(<PlannerTaskCard title="Task" meta="30 min" />);
      expect(screen.getByText('30 min')).toBeDefined();
    });

    it('applies completed class when completed prop is true', () => {
      const { container } = render(<PlannerTaskCard title="Task" completed />);
      expect(container.querySelector('.completed')).toBeDefined();
    });

    it('renders actions when provided', () => {
      render(<PlannerTaskCard title="Task" actions={<button>Delete</button>} />);
      expect(screen.getByText('Delete')).toBeDefined();
    });
  });

  describe('PlannerEventCard', () => {
    it('renders title', () => {
      render(<PlannerEventCard title="Team Standup" />);
      expect(screen.getByText('Team Standup')).toBeDefined();
    });

    it('renders time and source', () => {
      render(<PlannerEventCard title="Standup" time="10:00" source="Google" />);
      expect(screen.getByText('10:00 · Google')).toBeDefined();
    });

    it('renders only time when source is missing', () => {
      render(<PlannerEventCard title="Standup" time="10:00" />);
      expect(screen.getByText('10:00')).toBeDefined();
    });
  });

  describe('PlannerSectionCard', () => {
    it('renders title when provided', () => {
      render(<PlannerSectionCard title="Section Title"><p>content</p></PlannerSectionCard>);
      expect(screen.getByText('Section Title')).toBeDefined();
    });

    it('renders children', () => {
      render(<PlannerSectionCard><p>child content</p></PlannerSectionCard>);
      expect(screen.getByText('child content')).toBeDefined();
    });

    it('renders action button when provided', () => {
      const { container } = render(<PlannerSectionCard title="Card" action={<button>ActionBtn</button>}><p>content</p></PlannerSectionCard>);
      expect(container.querySelector('button')?.textContent).toBe('ActionBtn');
    });

    it('does not render header when title and action are both missing', () => {
      const { container } = render(<PlannerSectionCard><p>content</p></PlannerSectionCard>);
      expect(container.querySelector('.planner-section-card-head')).toBeNull();
    });
  });

  describe('PlannerEmptyState', () => {
    it('renders title and message', () => {
      render(<PlannerEmptyState title="No items" message="Nothing here yet." />);
      expect(screen.getByText('No items')).toBeDefined();
      expect(screen.getByText('Nothing here yet.')).toBeDefined();
    });

    it('renders action when provided', () => {
      render(<PlannerEmptyState title="Empty" action={<button>Create</button>} />);
      expect(screen.getByText('Create')).toBeDefined();
    });
  });

  describe('PlannerErrorState', () => {
    it('renders default title and provided message', () => {
      render(<PlannerErrorState message="Something broke." />);
      expect(screen.getByText('Planner data could not load')).toBeDefined();
      expect(screen.getByText('Something broke.')).toBeDefined();
    });

    it('renders custom title when provided', () => {
      render(<PlannerErrorState title="Custom Error" message="Error detail" />);
      expect(screen.getByText('Custom Error')).toBeDefined();
    });

    it('renders action when provided', () => {
      render(<PlannerErrorState message="Error" action={<button>Retry</button>} />);
      expect(screen.getByText('Retry')).toBeDefined();
    });
  });

  describe('PlannerLoadingState', () => {
    it('renders default message', () => {
      render(<PlannerLoadingState />);
      expect(screen.getByText('Loading planner data...')).toBeDefined();
    });

    it('renders custom message', () => {
      render(<PlannerLoadingState message="Custom loading..." />);
      expect(screen.getByText('Custom loading...')).toBeDefined();
    });
  });

  describe('PlannerSyncStatus', () => {
    it('renders label when provided', () => {
      render(<PlannerSyncStatus label="Connected" />);
      expect(screen.getByText('Connected')).toBeDefined();
    });

    it('renders formatted status when label is not provided', () => {
      render(<PlannerSyncStatus status="local_only" />);
      expect(screen.getByText('local only')).toBeDefined();
    });

    it('applies sync status modifier class', () => {
      const { container } = render(<PlannerSyncStatus status="synced" />);
      const span = container.querySelector('.planner-sync-status--synced');
      expect(span).toBeDefined();
    });
  });
});
