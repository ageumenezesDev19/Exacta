import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { PackageOpen } from "lucide-react";
import { Product } from "../utils/inventory";
import { EmptyState } from "./EmptyState";
import { sampleProducts } from "../data/sampleInventory";
import { useInventoryContext } from "../context/InventoryContext";
import "../styles/ProductTable.scss";

interface Props {
  products: Product[];
}

const ITEMS_PER_PAGE = 20;

const ProductTable: React.FC<Props> = ({ products }) => {
  const { t } = useTranslation();
  const { setProducts } = useInventoryContext();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (products.length === 0) {
    return (
      <div className="product-table is-empty animated-fadein">
        <EmptyState
          icon={PackageOpen}
          title={t('inventory.emptyTitle', 'Nenhum produto ainda')}
          body={t('inventory.emptyState', 'Nenhum produto ainda. Importe sua lista para começar a buscar por valor.')}
          action={
            // Importing a file is a real barrier for anyone trying the app for
            // the first time — this gets them to a working search in one click,
            // on invented stock rather than their own.
            <button
              type="button"
              className="empty-state-button"
              onClick={() => setProducts(sampleProducts)}
            >
              {t('inventory.loadSample', 'Carregar estoque de exemplo')}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="product-table animated-fadein">
      <h2>{t('inventory.stockTitle', 'Produtos em Estoque')} <span className="count-badge">({products.length})</span></h2>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{t('inventory.table.code', 'Código')}</th>
              <th>{t('inventory.table.description', 'Descrição')}</th>
              <th>{t('inventory.table.quantity', 'Qtd.')}</th>
              <th>{t('inventory.table.unit', 'Unid.')}</th>
              <th>{t('inventory.table.price', 'Preço')}</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((p, i) => (
              <tr key={`${p.code}-${i}`}>
                <td className="code-cell">{p.code}</td>
                <td className="desc-cell">{p.description}</td>
                <td>{p.quantity}</td>
                <td>{p.unitOut}</td>
                <td className="price-cell">R$ {Number(p.salePrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="page-btn"
          >
            {t('pagination.previous', 'Anterior')}
          </button>
          
          <span className="page-info">
            {t('pagination.pageInfo', { current: currentPage, total: totalPages, defaultValue: `Página ${currentPage} de ${totalPages}` })}
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            {t('pagination.next', 'Próxima')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductTable;