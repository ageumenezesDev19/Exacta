import React from "react";
import { useTranslation } from "react-i18next";
import { Check, AlertTriangle } from "lucide-react";
import "../styles/MatchPanel.scss";
import { money } from "../utils/money";

interface MatchPanelProps {
  /** The amount the operator is trying to hit. */
  target: number;
  /** Sum of the items that will actually be withdrawn. */
  sum: number;
  itemCount: number;
}

/** Anything under half a cent is the same number for a cash register. */
const CENT = 0.005;

/**
 * The signature of the interface: the promise of the product is that two
 * numbers are equal, so the panel states them side by side with the equals
 * sign between. A miss is an answer too — it shows how far off it lands
 * instead of leaving the operator to do the subtraction.
 */
export const MatchPanel: React.FC<MatchPanelProps> = ({ target, sum, itemCount }) => {
  const { t } = useTranslation();
  const difference = sum - target;
  const isExact = Math.abs(difference) < CENT;

  return (
    <div className={`match-panel ${isExact ? "is-exact" : "is-off"}`}>
      <div className="match-numbers">
        <div className="match-figure">
          <span className="match-label">{t("match.target", "Alvo")}</span>
          <span className="match-value">R$ {money(target)}</span>
        </div>

        <span className="match-operator" aria-hidden="true">
          {isExact ? "=" : "≠"}
        </span>

        <div className="match-figure">
          <span className="match-label">{t("match.sum", "Soma")}</span>
          <span className="match-value">R$ {money(sum)}</span>
        </div>

        <p className="match-verdict" role="status">
          {isExact ? (
            <>
              <Check size={15} aria-hidden="true" />
              {t("match.exact", "fecha exato")}
            </>
          ) : (
            <>
              <AlertTriangle size={15} aria-hidden="true" />
              {difference > 0
                ? t("match.over", "passa R$ {{amount}}", { amount: money(Math.abs(difference)) })
                : t("match.under", "falta R$ {{amount}}", { amount: money(Math.abs(difference)) })}
            </>
          )}
        </p>
      </div>

      <p className="match-count">
        {t("match.itemCount", "{{count}} itens", { count: itemCount })}
      </p>
    </div>
  );
};