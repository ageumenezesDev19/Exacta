import React from "react";
import type { LucideIcon } from "lucide-react";
import "../styles/EmptyState.scss";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Optional action, when the caller has the handler for the next step. */
  action?: React.ReactNode;
}

/**
 * An empty screen is an invitation, not a notice. Each one names what the
 * screen will hold once it fills, and points at the single next step — the old
 * version was one italic sentence floating in a large empty box.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  body,
  action,
}) => (
  <div className="empty-state-block">
    <span className="empty-state-icon" aria-hidden="true">
      <Icon size={22} strokeWidth={1.75} />
    </span>
    <h3 className="empty-state-title">{title}</h3>
    <p className="empty-state-body">{body}</p>
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);