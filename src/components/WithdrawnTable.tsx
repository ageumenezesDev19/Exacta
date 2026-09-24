import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import "../styles/WithdrawnTable.scss";
import { Product } from "../utils/inventory";
import { money } from "../utils/money";

export interface Withdrawn {
  id: string;
  product: Product;
  withdrawnQuantity: number;
  date: string;
}

interface Props {
  products: Withdrawn[];
  handleDelete: (id: string) => void;
  handleFlag: (product: Product) => void;
  flagFunctionEnabled: boolean;
  flaggedCodes: Set<string>;
}

const WithdrawnTable: React.FC<Props> = ({ products, handleDelete, handleFlag, flagFunctionEnabled, flaggedCodes }) => {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<{ [month: string]: Set<string> }>({});

  const currentLang = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';

  const withdrawnByDay = useMemo(() => {
    const groups: { [key: string]: Withdrawn[] } = {};
    if (!Array.isArray(products)) return groups;

    products.forEach((p) => {
      if (!p || !p.date) return;
      try {
        const datePart = p.date.split(" ")[0];
        if (!datePart) return;
        const date = new Date(datePart + 'T00:00:00');
        if (isNaN(date.getTime())) return;
        
        const dateString = datePart;
        if (!groups[dateString]) {
          groups[dateString] = [];
        }
        groups[dateString].push(p);
      } catch (e) {
        console.error("[WithdrawnTable] Error processing date:", p.date, e);
      }
    });
    return groups;
  }, [products]);

  const handleDateChange = useCallback((days: number) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  }, []);

  const toggleMonth = useCallback((month: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  }, []);

  const toggleDay = useCallback((month: string, day: string) => {
    setExpandedDays(prev => {
      const monthDays = new Set(prev[month]);
      if (monthDays.has(day)) {
        monthDays.delete(day);
      } else {
        monthDays.add(day);
      }
      return { ...prev, [month]: monthDays };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleDateChange(-1);
      } else if (e.key === 'ArrowRight') {
        handleDateChange(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDateChange]);

  const selectedDateString = selectedDate.toLocaleDateString('en-CA'); // 'en-CA' neatly outputs locally adjusted 'YYYY-MM-DD'
  const productsForSelectedDay = withdrawnByDay[selectedDateString] || [];
  const totalForSelectedDay = productsForSelectedDay.reduce(
    (acc, p) => acc + Number(p.product.salePrice ?? 0) * Number(p.withdrawnQuantity),
    0
  );

  const formatDate = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) return t('common.invalidDate', 'Invalid Date');
      return new Intl.DateTimeFormat(currentLang, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch (e) {
      return date.toLocaleDateString(currentLang);
    }
  };

  const withdrawnByMonth = useMemo(() => {
    const groups: { [key: string]: { [key: string]: Withdrawn[] } } = {};
    Object.keys(withdrawnByDay).forEach((dateString) => {
      const date = new Date(dateString + 'T00:00:00');
      const month = date.toLocaleString(currentLang, { month: 'long', year: 'numeric' });
      if (!groups[month]) {
        groups[month] = {};
      }
      groups[month][dateString] = withdrawnByDay[dateString];
    });
    return groups;
  }, [withdrawnByDay, currentLang]);

  const sortedMonths = Object.keys(withdrawnByMonth).sort((a, b) => {
    const getMonthDate = (m: string) => {
        const dates = Object.keys(withdrawnByMonth[m]);
        if (dates.length === 0) return 0;
        const d = new Date(dates[0] + 'T00:00:00');
        if (isNaN(d.getTime())) return 0;
        d.setDate(1);
        return d.getTime();
    };
    return getMonthDate(b) - getMonthDate(a);
  });

  return (
    <div className="withdrawn-table-container animated-fadein">
      <div className="date-navigator">
        <button onClick={() => handleDateChange(-1)}>{t('withdrawn.previousDay', '< Dia Anterior')}</button>
        <h2>{formatDate(selectedDate)}</h2>
        <button onClick={() => handleDateChange(1)}>{t('withdrawn.nextDay', 'Próximo Dia >')}</button>
      </div>

      <div className="day-summary">
        <h3>{t('withdrawn.dayTotal', 'Total do Dia')}: R$ {money(totalForSelectedDay)}</h3>
      </div>

      {productsForSelectedDay.length > 0 ? (
        <div className="withdrawn-table">
          <table>
            <thead>
              <tr>
                <th>{t('withdrawn.table.code', 'Código')}</th>
                <th>{t('withdrawn.table.description', 'Descrição')}</th>
                <th>{t('withdrawn.table.quantity', 'Qtd.')}</th>
                <th>{t('withdrawn.table.price', 'Preço')}</th>
                <th>{t('withdrawn.table.date', 'Data')}</th>
                <th>{t('withdrawn.table.action', 'Ação')}</th>
              </tr>
            </thead>
            <tbody>
              {productsForSelectedDay.map((p) => (
                <tr key={p.id}>
                  <td>{p.product?.code || '---'}</td>
                  <td>{p.product?.description || '---'}</td>
                  <td>{p.withdrawnQuantity}</td>
                  <td>R$ {money(Number(p.product?.salePrice ?? 0))}</td>
                  <td>{p.date ? new Date(p.date.split(" ")[0] + 'T00:00:00').toLocaleDateString(currentLang) : '---'}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDelete(p.id)}>{t('withdrawn.revert', 'Reverter')}</button>
                    {flagFunctionEnabled && (
                      <button
                        className={`flag-btn${flaggedCodes.has(p.product?.code) ? ' flagged' : ''}`}
                        onClick={() => handleFlag(p.product)}
                        title={t('withdrawn.flag', 'Sinalizar produto')}
                      >
                        🚩
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data">{t('withdrawn.emptyDay', 'Nenhum produto retirado neste dia.')}</p>
      )}

      <div className="monthly-summary">
        <h2>{t('withdrawn.history', 'Histórico de Retiradas')}</h2>
        {sortedMonths.map(month => {
          const monthlyTotal = Object.values(withdrawnByMonth[month]).flat().reduce((acc, p) => acc + (Number(p.product?.salePrice ?? 0) * Number(p.withdrawnQuantity)), 0);

          return (
            <div key={month} className="month-section">
              <h3 onClick={() => toggleMonth(month)} className="month-header">
                <span>{month.charAt(0).toUpperCase() + month.slice(1)} - {t('withdrawn.total', 'Total')}: R$ {money(monthlyTotal)}</span>
                <span className={`toggle-icon ${expandedMonths.has(month) ? 'expanded' : ''}`}></span>
              </h3>
              {expandedMonths.has(month) && (
                <div className="month-content">
                  {Object.keys(withdrawnByMonth[month]).sort((a,b) => new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()).map(dateString => (
                    <div key={dateString} className="day-details">
                      <h4 onClick={() => toggleDay(month, dateString)} className="day-header">
                        {formatDate(new Date(dateString + 'T00:00:00'))} - {t('withdrawn.total', 'Total')}: R$ {money(withdrawnByMonth[month][dateString].reduce((acc, p) => acc + (Number(p.product?.salePrice ?? 0) * Number(p.withdrawnQuantity)), 0))}
                        <span className={`toggle-icon ${expandedDays[month]?.has(dateString) ? 'expanded' : ''}`}></span>
                      </h4>
                      {expandedDays[month]?.has(dateString) && (
                        <ul>
                          {withdrawnByMonth[month][dateString].map((p) => (
                            <li key={p.id}>
                              {p.product?.description || '---'} ({p.withdrawnQuantity}x) - R$ {money(Number(p.product?.salePrice ?? 0))}
                              <button className="delete-btn-small" onClick={() => handleDelete(p.id)}>
                                <span>
                                  X
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        )}
      </div>
    </div>
  );
};

export default WithdrawnTable;
