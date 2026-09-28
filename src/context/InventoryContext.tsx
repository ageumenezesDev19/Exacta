import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product, FlaggedProduct, ProfileSettings, roundToThousandth } from "../utils/inventory";
import { Withdrawn } from "../components/WithdrawnTable";
import { useNotification } from "../hooks/useNotification";
import { useInventory } from "../hooks/useInventory";
import { useProfiles } from "../hooks/useProfiles";
import { useViewManager } from "../hooks/useViewManager";
import { useFileHandlers } from "../hooks/useFileHandlers";
import { useSearch, SearchMode } from "../hooks/useSearch";
import { formatDateForDB } from "../utils/date";
import { ImportMode } from "../components/FileUpload";
import { useTranslation } from "react-i18next";
import { recordWithdrawnCombination } from "../utils/combinationLearning";

export interface ProductWithQuantity extends Product {
  usedQuantity: number;
}

interface InventoryContextType {
  // State
  products: Product[];
  withdrawn: Withdrawn[];
  blacklist: string[];
  flaggedProducts: FlaggedProduct[];
  activeProfile: string;
  activeProfileSettings: ProfileSettings;
  loading: boolean;
  notification: string | null;
  view: string;

  // Search State
  searchResult: { status: string; products?: Product[]; combination?: ProductWithQuantity[]; target?: number } | null;
  searching: boolean;
  showCancel: boolean;
  price: string;
  searchMode: SearchMode;
  focusSearchInput: boolean;

  // Setters
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setWithdrawn: React.Dispatch<React.SetStateAction<Withdrawn[]>>;
  setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
  setFlaggedProducts: React.Dispatch<React.SetStateAction<FlaggedProduct[]>>;
  setLoading: (loading: boolean) => void;
  setView: (view: any) => void;
  setSearchResult: (result: any) => void;
  setPrice: (price: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setFocusSearchInput: (focus: boolean) => void;

  // Actions
  handleLoadProducts: (htmlContent: string, mode: ImportMode, ignoreNcm?: boolean) => void;
  handleLoadWithdrawn: (csvContent: string) => void;
  handleLoadBlacklist: (textContent: string) => void;
  handleDownload: (filename: string, content: string) => void;
  handleWithdrawSingleProduct: (product: Product) => void;
  handleWithdrawCombination: (combination: ProductWithQuantity[]) => void;
  handleDeleteProduct: (product: Product) => void;
  handleRestoreProduct: (product: Product) => void;
  handleDeleteWithdrawn: (id: string) => void;
  handleClearData: (type: "products" | "withdrawn" | "all") => void;
  handleSearch: (isRecalculation?: boolean) => void;
  handleRecalculate: () => void;
  handleCancelSearch: () => void;
  handleFlagProduct: (product: Product) => void;
  handleUnflagProduct: (code: string) => void;
  updateActiveProfileSettings: (settings: ProfileSettings) => Promise<void>;
  showNotification: (message: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventoryContext must be used within an InventoryProvider");
  }
  return context;
};

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("combination");
  const [focusSearchInput, setFocusSearchInput] = useState<boolean>(true);

  const { notification, showNotification } = useNotification();
  const { products, setProducts, withdrawn, setWithdrawn, blacklist, setBlacklist, flaggedProducts, setFlaggedProducts } = useInventory();
  const { activeProfile, activeProfileSettings, updateActiveProfileSettings } = useProfiles();
  const { view, setView } = useViewManager("inventory");

  const {
    handleLoadProducts: _handleLoadProducts, handleLoadWithdrawn, handleLoadBlacklist, handleDownload
  } = useFileHandlers({
    setLoading,
    setProducts,
    products,
    setWithdrawn,
    setBlacklist,
    showNotification,
    t,
  });

  const handleLoadProducts = (htmlContent: string, mode: ImportMode, ignoreNcm?: boolean) => {
    _handleLoadProducts(htmlContent, mode, ignoreNcm ?? false, activeProfileSettings.filterByCsosn ?? false);
  };

  const {
    searchResult,
    setSearchResult,
    searching,
    showCancel,
    handleCancelSearch,
    handleRecalculate,
    handleSearch
  } = useSearch({
    products,
    blacklist,
    flaggedProducts,
    price,
    searchMode,
    showNotification,
    activeProfileSettings,
    activeProfile,
  });

  const handleWithdraw = (productToWithdraw: Product, quantity: number = 1) => {
    setProducts(prevProducts => {
      const newProducts = prevProducts
        .map(p =>
          p.code === productToWithdraw.code
            ? { ...p, quantity: roundToThousandth(p.quantity - quantity) }
            : p
        )
        .filter(p => p.quantity > 0);
      return newProducts;
    });

    const formattedDate = formatDateForDB(new Date());

    const withdrawnProduct: Withdrawn = {
      id: `${productToWithdraw.code}-${Date.now()}`,
      product: productToWithdraw,
      withdrawnQuantity: quantity,
      date: formattedDate,
    };

    setWithdrawn(prevWithdrawn => [...prevWithdrawn, withdrawnProduct]);
  };

  const handleWithdrawSingleProduct = (product: Product) => {
    setLoading(true);
    handleWithdraw(product, 1);
    setLoading(false);
    showNotification(t('inventory.notifications.productWithdrawn', { name: product.description, defaultValue: `Product ${product.description} withdrawn from stock.` }));
    setFocusSearchInput(true);
    setPrice("");
    setSearchResult(null);
  };

  const handleWithdrawCombination = (combination: ProductWithQuantity[]) => {
    setLoading(true);

    const requestedMap = new Map<string, number>();
    combination.forEach(p => {
      requestedMap.set(p.code, (requestedMap.get(p.code) || 0) + p.usedQuantity);
    });

    // Calculate actual withdrawals capped by current stock
    const actualWithdrawals = new Map<string, number>();
    products.forEach(p => {
      if (requestedMap.has(p.code)) {
        const actual = Math.min(requestedMap.get(p.code)!, p.quantity);
        if (actual > 0) {
          actualWithdrawals.set(p.code, actual);
        }
      }
    });

    setProducts(prevProducts => {
      return prevProducts
        .map(p => {
          if (actualWithdrawals.has(p.code)) {
            return { ...p, quantity: roundToThousandth(p.quantity - actualWithdrawals.get(p.code)!) };
          }
          return p;
        })
        .filter(p => p.quantity > 0);
    });

    const today = new Date();
    const formattedDate = formatDateForDB(today);
    const newWithdrawnList: Withdrawn[] = combination
      .filter(p => actualWithdrawals.has(p.code))
      .map(p => ({
        id: `${p.code}-${Date.now()}`,
        product: p,
        withdrawnQuantity: actualWithdrawals.get(p.code)!,
        date: formattedDate,
      }));

    const actuallyWithdrawnProducts = combination.filter(p => actualWithdrawals.has(p.code));
    if (actuallyWithdrawnProducts.length > 0) {
      recordWithdrawnCombination(activeProfile, actuallyWithdrawnProducts);
    }

    setWithdrawn(prevWithdrawn => [...prevWithdrawn, ...newWithdrawnList]);

    const totalItems = newWithdrawnList.reduce((acc, w) => acc + w.withdrawnQuantity, 0);

    setLoading(false);
    showNotification(t('inventory.notifications.itemsWithdrawn', { count: totalItems, defaultValue: `${totalItems} items withdrawn from stock.` }));
    setFocusSearchInput(true);
    setPrice("");
    setSearchResult(null);
  };

  const handleFlagProduct = (product: Product) => {
    setFlaggedProducts(prev => {
      if (prev.some(f => f.code === product.code)) return prev;
      return [...prev, { code: product.code, description: product.description, flaggedAt: new Date().toISOString() }];
    });
    showNotification(t('flagged.productFlagged', { name: product.description }));
  };

  const handleUnflagProduct = (code: string) => {
    setFlaggedProducts(prev => prev.filter(f => f.code !== code));
    showNotification(t('flagged.productUnflagged'));
  };

  const handleDeleteProduct = (product: Product) => {
    setProducts(prevProducts => prevProducts.filter(p => p.code !== product.code));
  };

  const handleRestoreProduct = (product: Product) => {
    setProducts(prevProducts => {
      const exists = prevProducts.some(p => p.code === product.code);
      if (exists) return prevProducts;
      const { usedQuantity, Difference, ...cleanProduct } = product as any;
      return [...prevProducts, cleanProduct as Product];
    });
  };

  const handleDeleteWithdrawn = (id: string) => {
    const withdrawnToRestore = withdrawn.find(r => r.id === id);
    if (!withdrawnToRestore) return;

    setProducts(prevProducts => {
      const existingProduct = prevProducts.find(p => p.code === withdrawnToRestore.product.code);
      if (existingProduct) {
        return prevProducts.map(p => 
          p.code === withdrawnToRestore.product.code 
            ? { ...p, quantity: roundToThousandth(p.quantity + withdrawnToRestore.withdrawnQuantity) } 
            : p
        );
      } else {
        return [...prevProducts, { ...withdrawnToRestore.product, quantity: withdrawnToRestore.withdrawnQuantity }];
      }
    });

    setWithdrawn(prevWithdrawn => prevWithdrawn.filter(r => r.id !== id));
    showNotification(t('inventory.notifications.itemReturned', 'Item returned to stock.'));
  };

  const handleClearData = (type: "products" | "withdrawn" | "all") => {
    if (type === "products" || type === "all") {
      setProducts([]);
    }
    if (type === "withdrawn" || type === "all") {
      setWithdrawn([]);
    }
    if (type === "all") {
      setBlacklist([]);
    }
    const message = {
      products: "Stock data cleared.",
      withdrawn: "Withdrawn data cleared.",
      all: "All data cleared."
    };
    showNotification(message[type]);
  };

  const value = {
    products,
    withdrawn,
    blacklist,
    flaggedProducts,
    activeProfile,
    activeProfileSettings,
    loading,
    notification,
    view,
    searchResult,
    searching,
    showCancel,
    price,
    searchMode,
    focusSearchInput,
    setProducts,
    setWithdrawn,
    setBlacklist,
    setFlaggedProducts,
    setLoading,
    setView,
    setSearchResult,
    setPrice,
    setSearchMode,
    setFocusSearchInput,
    handleLoadProducts,
    handleLoadWithdrawn,
    handleLoadBlacklist,
    handleDownload,
    handleWithdrawSingleProduct,
    handleWithdrawCombination,
    handleDeleteProduct,
    handleRestoreProduct,
    handleDeleteWithdrawn,
    handleClearData,
    handleSearch,
    handleRecalculate,
    handleCancelSearch,
    handleFlagProduct,
    handleUnflagProduct,
    updateActiveProfileSettings,
    showNotification
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
