import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useInventoryContext } from "../context/InventoryContext";
import { Switch } from "../components/Switch";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { FractionRule, compileFractioning, normalizeRuleValue, ruleId } from "../utils/fractioning";
import "../styles/FractioningView.scss";

interface RuleSectionProps {
  kind: FractionRule["kind"];
  title: string;
  hint: string;
  placeholder: string;
  empty: string;
  rules: FractionRule[];
  matchCounts: Map<string, number>;
  onAdd: (kind: FractionRule["kind"], value: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}

const RuleSection: React.FC<RuleSectionProps> = ({
  kind, title, hint, placeholder, empty, rules, matchCounts, onAdd, onToggle, onRemove,
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  const add = () => {
    if (!normalizeRuleValue(value)) return;
    onAdd(kind, value);
    setValue("");
  };

  return (
    <section className="rule-section">
      <h3>
        {title}
        {rules.length > 0 && <span className="count-badge">({rules.length})</span>}
      </h3>
      <p className="rule-hint">{hint}</p>

      <div className="add-rule">
        <input
          type="text"
          placeholder={placeholder}
          aria-label={title}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
        />
        <button onClick={add}>{t("fractioning.add", "Adicionar")}</button>
      </div>

      {rules.length === 0 ? (
        <p className="empty-hint">{empty}</p>
      ) : (
        <ul className="rule-list">
          {rules.map(rule => {
            const count = matchCounts.get(rule.id) ?? 0;
            return (
              <li key={rule.id} className={rule.enabled ? "" : "is-off"}>
                <span className="rule-text">
                  <span className="rule-value" title={rule.value}>{rule.value}</span>
                  <span className="rule-count">
                    {/* Portuguese plural rules put 0 with 1, which read "0 produto". */}
                    {count === 0
                      ? t("fractioning.matchesNone", "nenhum produto")
                      : t("fractioning.matches", { count, defaultValue: `${count} produtos` })}
                  </span>
                </span>
                <Switch
                  checked={rule.enabled}
                  onChange={enabled => onToggle(rule.id, enabled)}
                  label={t("fractioning.toggle", { value: rule.value, defaultValue: `Fracionar ${rule.value}` })}
                />
                <button
                  className="remove-rule"
                  onClick={() => onRemove(rule.id)}
                  aria-label={`${t("fractioning.remove", "Remover")} ${rule.value}`}
                  title={t("fractioning.remove", "Remover")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export const FractioningView: React.FC = () => {
  const { t } = useTranslation();
  const { products, fractionRules, fractionRulesAreDefault, setFractionRules, showNotification } = useInventoryContext();
  const [confirmRestore, setConfirmRestore] = useState(false);

  // Counted as if each rule were on, so a switched-off rule still says what it would catch.
  const matchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const rule of fractionRules) {
      const matches = compileFractioning([{ ...rule, enabled: true }]);
      counts.set(rule.id, products.reduce((acc, p) => acc + (matches(p) ? 1 : 0), 0));
    }
    return counts;
  }, [fractionRules, products]);

  const handleAdd = (kind: FractionRule["kind"], raw: string) => {
    const id = ruleId(kind, raw);
    const value = kind === "unit" ? normalizeRuleValue(raw) : raw.trim().replace(/\s+/g, " ");
    if (fractionRules.some(r => r.id === id)) {
      showNotification(t("fractioning.duplicate", { value, defaultValue: `"${value}" já está na lista.` }));
      return;
    }
    setFractionRules([...fractionRules, { id, kind, value, enabled: true }]);
  };

  const handleToggle = (id: string, enabled: boolean) =>
    setFractionRules(fractionRules.map(r => (r.id === id ? { ...r, enabled } : r)));

  const handleRemove = (id: string) => setFractionRules(fractionRules.filter(r => r.id !== id));

  const handleRestore = () => {
    setFractionRules(null);
    setConfirmRestore(false);
    showNotification(t("fractioning.restored", "Lista padrão restaurada."));
  };

  return (
    <div className="fractioning animated-fadein">
      <h2>{t("fractioning.title", "Fracionamento")}</h2>
      <p className="fractioning-intro">
        {t("fractioning.intro", "Produtos que podem sair em frações, como 0,048 KG. Os demais saem só em unidades inteiras.")}
      </p>

      <div className="rule-sections">
        <RuleSection
          kind="unit"
          title={t("fractioning.byUnit", "Por unidade")}
          hint={t("fractioning.byUnitHint", "A unidade precisa ser igual: KG não inclui KGS.")}
          placeholder={t("fractioning.unitPlaceholder", "Ex.: KG")}
          empty={t("fractioning.unitEmpty", "Nenhuma unidade. Só os nomes decidem o que fraciona.")}
          rules={fractionRules.filter(r => r.kind === "unit")}
          matchCounts={matchCounts}
          onAdd={handleAdd}
          onToggle={handleToggle}
          onRemove={handleRemove}
        />
        <RuleSection
          kind="name"
          title={t("fractioning.byName", "Por nome")}
          hint={t("fractioning.byNameHint", "Palavra inteira no nome do produto: Tela inclui TELA MOSQUITEIRO, mas não CASTELA.")}
          placeholder={t("fractioning.namePlaceholder", "Ex.: Tela")}
          empty={t("fractioning.nameEmpty", "Nenhum nome ainda. Use para produtos cuja unidade não diz que fracionam.")}
          rules={fractionRules.filter(r => r.kind === "name")}
          matchCounts={matchCounts}
          onAdd={handleAdd}
          onToggle={handleToggle}
          onRemove={handleRemove}
        />
      </div>

      {!fractionRulesAreDefault && (
        <div className="fractioning-footer">
          <button className="restore-btn" onClick={() => setConfirmRestore(true)}>
            {t("fractioning.restore", "Restaurar padrão")}
          </button>
        </div>
      )}

      {confirmRestore && (
        <ConfirmationModal
          message={t("fractioning.restoreConfirm", "Voltar à lista padrão? As regras deste perfil serão substituídas.")}
          onConfirm={handleRestore}
          onClose={() => setConfirmRestore(false)}
          confirmText={t("fractioning.restore", "Restaurar padrão")}
        />
      )}
    </div>
  );
};
