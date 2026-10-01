import React from "react";
import "../styles/Switch.scss";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** An on/off control in the iOS style. A button with role="switch" so screen readers announce on and off. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    className={`switch ${checked ? "is-on" : ""}`}
    onClick={() => onChange(!checked)}
  >
    <span className="switch-track" aria-hidden="true">
      <span className="switch-thumb" />
    </span>
  </button>
);
