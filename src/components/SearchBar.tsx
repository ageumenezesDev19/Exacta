import React, { useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Product } from "../utils/inventory";
import AnimatedButton from "./AnimatedButton";
import { MatchPanel } from "./MatchPanel";
import { CustomDropdown } from "./CustomDropdown";
import "../styles/SearchBar.scss";
import { ProductWithQuantity } from "../context/InventoryContext";
import { SearchMode } from "../hooks/useSearch";
import { useInventoryContext } from "../context/InventoryContext";
import { buildProductCopyText } from "../utils/productCopy";

const SearchBar: React.FC = () => {
  const { t } = useTranslation();
  const {
    products,
    handleWithdrawSingleProduct: onWithdraw,
    handleWithdrawCombination: onWithdrawCombination,
    searchResult: result,
    setSearchResult: setResult,
    price,
    setPrice,
    searchMode,
    setSearchMode,
    handleSearch,
    handleRecalculate,
    searching,
    handleCancelSearch: onCancelSearch,
    showCancel,
    focusSearchInput: focusInput,
    setFocusSearchInput: setFocusInput,
    handleDeleteProduct,
    handleRestoreProduct,
    showNotification
  } = useInventoryContext();

  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [combPage, setCombPage] = React.useState<number>(1);
  const COMB_ITEMS_PER_PAGE = 4;

  const [deletedCombinationItems, setDeletedCombinationItems] = React.useState<Set<string>>(new Set());
  const [undoToasts, setUndoToasts] = React.useState<Array<{ id: string; product: any; timerId: ReturnType<typeof setTimeout> }>>([]);

  React.useEffect(() => {
    setCombPage(1);
    setDeletedCombinationItems(new Set());
  }, [result]);


  useEffect(() => {
    if (focusInput && inputRef.current) {
      inputRef.current.focus();
      setFocusInput?.(false);
    }
  }, [focusInput, setFocusInput]);

  const handleCopy = async (product: any, index: number) => {
    const textToCopy = buildProductCopyText(product);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleWithdrawClick = (product: Product) => {
    onWithdraw(product);
    setResult(null);
  };

  const handleWithdrawCombinationClick = (combination: ProductWithQuantity[]) => {
    const validCombination = combination.filter(p => !deletedCombinationItems.has(p.code));
    if (validCombination.length > 0) {
      onWithdrawCombination(validCombination);
    }
    setResult(null);
  };

  const triggerUndoToast = (product: any) => {
    const toastId = Date.now().toString() + Math.random().toString();
    
    const timerId = setTimeout(() => {
      setUndoToasts(prev => prev.filter(t => t.id !== toastId));
      showNotification(t('inventory.notifications.productPermanentlyDeleted', { name: product.description, defaultValue: `Produto ${product.description} removido em definitivo.` }));
    }, 2000);

    setUndoToasts(prev => [...prev, { id: toastId, product, timerId }]);
  };

  const handleDeleteComboItem = (product: any) => {
    handleDeleteProduct(product);
    setDeletedCombinationItems(prev => new Set(prev).add(product.code));
    triggerUndoToast(product);
  };

  const handleUndoComboItem = (toastId: string, product: any, timerId: ReturnType<typeof setTimeout>) => {
    clearTimeout(timerId);
    handleRestoreProduct(product);
    setDeletedCombinationItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(product.code);
      return newSet;
    });
    setUndoToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (result && result.status === 'ok') {
        if ((searchMode === 'product_price' || searchMode === 'product_name') && result.products && result.products.length > 0) {
          handleWithdrawClick(result.products[0]);
        } else if (searchMode === 'combination' && result.combination) {
          handleWithdrawCombinationClick(result.combination);
        }
      } else {
        handleSearch(false);
      }
    }
  };

  const getPlaceholder = () => {
    switch (searchMode) {
      case 'combination':
      case 'product_price':
        return t('search.placeholderPrice', 'Pesquisar por preço (R$)');
      case 'product_name':
        return t('search.placeholder', 'Pesquisar por nome do produto');
      default:
        return "";
    }
  }

  return (
    <div className="search-bar animated-fadein">
      <div className="search-controls">
        <input
          ref={inputRef}
          type={searchMode === 'product_name' ? "text" : "text"} // Using text for both for flexibility with comma
          pattern={searchMode !== 'product_name' ? "[0-9,.]*" : undefined}
          placeholder={getPlaceholder()}
          value={price}
          onChange={e => setPrice(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!!searching}
        />
        {/* The native select opened an operating-system menu that had nothing
            to do with the app. This is the same dropdown the profile picker
            uses, so both menus look and behave alike. */}
        <CustomDropdown
          label={t('search.modeLabel', 'Tipo de busca')}
          selectedValue={searchMode}
          onSelect={(value) => {
            setSearchMode(value as SearchMode);
            setResult(null);
          }}
          options={[
            { value: 'combination', label: t('search.byCombination', 'Buscar Combinação') },
            { value: 'product_price', label: t('search.byPrice', 'Buscar Unidade por Preço') },
            { value: 'product_name', label: t('search.byName', 'Buscar Produto por Nome') },
          ]}
        />
        <button onClick={() => handleSearch(false)} disabled={products.length === 0 || !price || !!searching}>
          {t('blacklist.add', 'Buscar')}
        </button>
      </div>

      {searching && (
        <div className="search-loading">
          <span className="loader-inline" /> {t('search.searching', 'Buscando produtos...')}
          {showCancel && (
            <button className="cancel-btn loading-cancel" onClick={onCancelSearch} type="button">
              {t('app.cancelSearch', 'Cancelar')}
            </button>
          )}
        </div>
      )}

      {products.length === 0 && <p>{t('inventory.importPrompt', 'Por favor, importe o arquivo `produtos.html` ou `produtos.xls` para começar.')}</p>}

      {!searching && result && result.status === "ok" && (searchMode === 'product_price' || searchMode === 'product_name') && result.products && result.products.length > 0 && (
        <div className="search-result-card animated-slideUp">
          <div className="result-header">
            <h4>{result.products.length > 1 ? t('search.resultsFound', { count: result.products.length, defaultValue: `${result.products.length} Produtos Encontrados` }) : t('search.resultFound', "Produto Encontrado")}</h4>
          </div>
          
          <ul className="result-list">
            {result.products.map((p: any, i: number) => (
              <li key={p.code || i} className="result-item">
                <div className="item-info">
                  <span className="item-name">
                    {p.description}
                  </span>
                  <div className="item-details">
                    <span className="item-price">
                      {t('inventory.table.price', 'Preço')}: <b>R$ {Number(p.salePrice).toFixed(2)}</b>
                    </span>
                    <span className="item-stock">
                      {t('app.inventory', 'Estoque')}: {p.quantity} {p.unit}
                    </span>
                  </div>
                </div>
                
                <div className="item-actions">
                  <button 
                    className="primary-btn small-btn" 
                    onClick={() => handleWithdrawClick(p)}
                    title={t('search.withdrawOne', "Retirar 1 unidade do estoque")}
                    style={{ marginRight: '8px' }}
                  >
                    {t('search.btnWithdrawOne', 'Retirar 1')}
                  </button>
                   <button
                    className={`icon-action-btn copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                    onClick={() => handleCopy(p, i)}
                    title={t('search.copyName', "Copiar nome do produto")}
                  >
                    {copiedIndex === i ? (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="result-actions">
            <AnimatedButton onClick={handleRecalculate} title={t('search.searchAgain', "Buscar novamente")} className="secondary-btn">
              {t('search.recalculate', 'Recalcular')}
            </AnimatedButton>
          </div>
        </div>
      )}
      {!searching && result && result.status === "ok" && searchMode === "combination" && result.combination && (
        <div className="search-result-card">
          {/* Only the items still in the combination count: the total used to
              include ones the operator had already removed, so it disagreed
              with what would actually be withdrawn. */}
          <MatchPanel
            target={Number(price) || 0}
            sum={result.combination
              .filter((p: any) => !deletedCombinationItems.has(p.code))
              .reduce((acc: number, p: any) => acc + (p.salePrice ?? 0) * p.usedQuantity, 0)}
            itemCount={
              result.combination.filter((p: any) => !deletedCombinationItems.has(p.code)).length
            }
          />

          <ul className="result-list">
            {result.combination
              .slice((combPage - 1) * COMB_ITEMS_PER_PAGE, combPage * COMB_ITEMS_PER_PAGE)
              .map((p: any, i: number) => (
              <li key={p.code} className={`result-item ${deletedCombinationItems.has(p.code) ? 'is-deleted' : ''}`}>
                <div className="delete-slider" onClick={() => !deletedCombinationItems.has(p.code) && handleDeleteComboItem(p)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </div>
                <div className="item-info">
                  <span className="item-name">
                    {p.description}
                  </span>
                  <div className="item-details">
                    <span className="item-quantity">
                      {t('search.withdrawQuantity', 'Retirar')}: {(p.unitOut === 'KG' || p.unitOut === 'SC') ? p.usedQuantity.toFixed(3) : p.usedQuantity} {p.unitOut} 
                      <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '8px' }}>
                        ({t('app.inventory', 'Estoque')}: {p.quantity})
                      </span>
                    </span>
                    <span className="item-price">
                      R$ {Number(p.salePrice).toFixed(2)}
                    </span>
                    <span className="item-total">
                      {t('search.subtotal', 'Subtotal')}: <b>R$ {(Number(p.salePrice) * p.usedQuantity).toFixed(2)}</b>
                    </span>
                  </div>
                </div>
                
                <div className="item-actions">
                   <button
                    className={`icon-action-btn copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                    onClick={() => handleCopy(p, i)}
                    title={t('search.copyName', "Copiar nome do produto")}
                  >
                    {copiedIndex === i ? (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          {result.combination.length > COMB_ITEMS_PER_PAGE && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '1rem', marginBottom: '1rem' }}>
              <button 
                className="secondary-btn small-btn" 
                disabled={combPage === 1} 
                onClick={() => setCombPage(prev => prev - 1)}
                style={{ padding: '4px 12px', fontSize: '0.9em' }}
              >
                {t('pagination.previous', 'Anterior')}
              </button>
              <span style={{ alignSelf: 'center', fontWeight: 'bold', fontSize: '0.95em' }}>
                {t('pagination.pageInfo', { current: combPage, total: Math.ceil(result.combination.length / COMB_ITEMS_PER_PAGE), defaultValue: `Página ${combPage} de ${Math.ceil(result.combination.length / COMB_ITEMS_PER_PAGE)}` })}
              </span>
              <button 
                className="secondary-btn small-btn" 
                disabled={combPage === Math.ceil(result.combination.length / COMB_ITEMS_PER_PAGE)} 
                onClick={() => setCombPage(prev => prev + 1)}
                style={{ padding: '4px 12px', fontSize: '0.9em' }}
              >
                {t('pagination.next', 'Próxima')}
              </button>
            </div>
          )}

          <div className="result-actions">
            <button 
              className="primary-btn" 
              onClick={() => handleWithdrawCombinationClick(result.combination!)}
              disabled={deletedCombinationItems.size > 0}
              title={deletedCombinationItems.size > 0 ? t('search.recalculate', 'Recalcular') : ''}
            >
              {t('search.btnWithdrawCombination', 'Retirar Combinação')}
            </button>
            <AnimatedButton onClick={handleRecalculate} title={t('search.searchAnother', "Buscar outra combinação")} className="secondary-btn">
              {t('search.recalculate', 'Recalcular')}
            </AnimatedButton>
          </div>
        </div>
      )}
      {!searching && result && result.status !== "ok" && (
        <div className="search-result">
          <p>{t('search.notFound', 'Nenhum produto ou combinação encontrada.')}</p>
        </div>
      )}

      {undoToasts.length > 0 && (
        <div className="undo-toast-container">
          {undoToasts.map(toast => (
            <div key={toast.id} className="undo-toast">
              <div className="toast-content">
                <strong>{t('inventory.notifications.productDeleted', 'Produto removido temporariamente.')}</strong>
                <span>{toast.product.description}</span>
              </div>
              <button className="undo-btn" onClick={() => handleUndoComboItem(toast.id, toast.product, toast.timerId)}>
                {t('common.undo', 'Desfazer')}
              </button>
              <div className="progress-bar"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;