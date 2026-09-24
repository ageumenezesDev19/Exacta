import React from 'react';
import { useTranslation } from 'react-i18next';
import { useInventoryContext } from '../context/InventoryContext';
import { getRankedCombinationLearning, RankingFilter, CombinationLearningEntry } from '../utils/combinationLearning';

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export const RankingView: React.FC = () => {
  const { t } = useTranslation();
  const { activeProfile } = useInventoryContext();
  const [filter, setFilter] = React.useState<RankingFilter>('positive');
  const [entries, setEntries] = React.useState<CombinationLearningEntry[]>(() => getRankedCombinationLearning(activeProfile, filter));

  React.useEffect(() => {
    const refresh = () => setEntries(getRankedCombinationLearning(activeProfile, filter));
    refresh();
    window.addEventListener('combinationLearningChanged', refresh);
    window.addEventListener('profileChanged', refresh);
    return () => {
      window.removeEventListener('combinationLearningChanged', refresh);
      window.removeEventListener('profileChanged', refresh);
    };
  }, [activeProfile, filter]);

  return (
    <div className="product-table animated-fadein">
      <h2>{t('ranking.title', 'Ranking de Combinações')} <span className="count-badge">({entries.length})</span></h2>

      <div className="segmented ranking-filters" role="group" aria-label={t('ranking.filters.label', 'Filtrar ranking')}>
        <button onClick={() => setFilter('positive')} aria-pressed={filter === 'positive'}>
          {t('ranking.filters.positive', 'Mais funcionais')}
        </button>
        <button onClick={() => setFilter('negative')} aria-pressed={filter === 'negative'}>
          {t('ranking.filters.negative', 'Menos funcionais')}
        </button>
        <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>
          {t('ranking.filters.all', 'Todos')}
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">{t('ranking.empty', 'O ranking aparecerá após usar Retirar combinação ou Recalcular.')}</p>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>{t('inventory.table.code', 'Código')}</th>
                <th>{t('inventory.table.description', 'Descrição')}</th>
                <th>{t('ranking.score', 'Score')}</th>
                <th>{t('ranking.withdrawnCount', 'Retirado')}</th>
                <th>{t('ranking.ignoredCount', 'Ignorado')}</th>
                <th>{t('ranking.lastWithdrawnAt', 'Última retirada')}</th>
                <th>{t('ranking.lastIgnoredAt', 'Último ignore')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.code}>
                  <td className="code-cell">{entry.code}</td>
                  <td className="desc-cell">{entry.description}</td>
                  <td className="price-cell">{entry.score}</td>
                  <td>{entry.withdrawnCount}</td>
                  <td>{entry.ignoredCount}</td>
                  <td>{formatDate(entry.lastWithdrawnAt)}</td>
                  <td>{formatDate(entry.lastIgnoredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
