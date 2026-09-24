import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { X } from 'lucide-react';
import { addToBlacklist as addTerm, removeFromBlacklist as removeTerm } from "../utils/blacklist_utils";
import { FlaggedProduct } from "../utils/inventory";
import "../styles/BlacklistManager.scss";

const handleExportPDF = (flaggedProducts: FlaggedProduct[], t: TFunction) => {
  const rows = flaggedProducts.map(fp => `
    <tr>
      <td>${fp.code}</td>
      <td>${fp.description}</td>
      <td>${new Date(fp.flaggedAt).toLocaleDateString()}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t('flagged.sectionTitle', 'Produtos Inutilizados')}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f0f0f0; font-weight: bold; border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    td { border: 1px solid #ccc; padding: 8px 12px; }
    tr:nth-child(even) td { background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>${t('flagged.sectionTitle', 'Produtos Inutilizados')}</h1>
  <p class="subtitle">${new Date().toLocaleDateString()}</p>
  <table>
    <thead>
      <tr>
        <th>${t('inventory.table.code', 'Código')}</th>
        <th>${t('inventory.table.description', 'Descrição')}</th>
        <th>${t('flagged.flaggedAt', 'Sinalizado em')}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  iframe.src = url;
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  };
  document.body.appendChild(iframe);
};

interface Props {
  blacklist: string[];
  setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
  showNotification: (message: string) => void;
  flaggedProducts: FlaggedProduct[];
  onUnflag: (code: string) => void;
  flagFunctionEnabled: boolean;
}

const BlacklistManager: React.FC<Props> = ({ blacklist, setBlacklist, showNotification, flaggedProducts, onUnflag, flagFunctionEnabled }) => {
  const { t } = useTranslation();
  const [termo, setTermo] = useState<string>("");

  const handleAdd = () => {
    if (!termo.trim()) return;
    setBlacklist(prev => addTerm(prev, termo));
    showNotification(t('blacklist.added', { term: termo, defaultValue: `Termo '${termo}' adicionado à lista negra.` }));
    setTermo("");
  };

  const handleRemove = (termToRemove: string) => {
    setBlacklist(prev => removeTerm(prev, termToRemove));
    showNotification(t('blacklist.removed', { term: termToRemove, defaultValue: `Termo '${termToRemove}' removido da lista negra.` }));
  };

  return (
    <div className="blacklist-manager animated-fadein">
      <h2>
        {t('blacklist.title', 'Blacklist')}
        {blacklist.length > 0 && <span className="count-badge">({blacklist.length})</span>}
      </h2>
      <div className="add-term">
        <input
          type="text"
          placeholder={t('blacklist.addTerm', 'Adicionar termo')}
          aria-label={t('blacklist.addTerm', 'Adicionar termo')}
          value={termo}
          onChange={e => setTermo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd}>{t('blacklist.add', 'Adicionar')}</button>
      </div>
      {blacklist.length === 0 ? (
        <p className="empty-hint">{t('blacklist.empty', 'Nenhum termo ainda. Produtos com um destes termos no nome ficam fora das buscas.')}</p>
      ) : (
        <ul className="term-list">
          {blacklist.map((term, i) => (
            <li key={i}>
              <span className="term" title={term}>{term}</span>
              <button
                className="remove-term"
                onClick={() => handleRemove(term)}
                aria-label={`${t('blacklist.remove', 'Remover')} ${term}`}
                title={t('blacklist.remove', 'Remover')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {flagFunctionEnabled && (
        <div className="flagged-section">
          <div className="flagged-section-header">
            <h2>{t('flagged.sectionTitle', 'Produtos Inutilizados')}</h2>
            {flaggedProducts.length > 0 && (
              <button className="export-pdf-btn" onClick={() => handleExportPDF(flaggedProducts, t)}>
                {t('flagged.exportPdf', 'Exportar PDF')}
              </button>
            )}
          </div>
          {flaggedProducts.length === 0 ? (
            <p className="empty-flagged">{t('flagged.empty', 'Nenhum produto sinalizado.')}</p>
          ) : (
            <ul>
              {flaggedProducts.map(fp => (
                <li key={fp.code}>
                  <span className="flagged-info">
                    <span className="flagged-code">{fp.code}</span>
                    <span className="flagged-description">{fp.description}</span>
                  </span>
                  <button className="remove-btn" onClick={() => onUnflag(fp.code)}>{t('flagged.unflag', 'Remover')}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BlacklistManager;

