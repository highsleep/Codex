import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UnifiedWarrantyPortal } from './components/UnifiedWarrantyPortal';
import { AdminPortal } from './components/AdminPortal';
import { OmniSearchModal } from './components/OmniSearchModal';
import { Product, WarrantyActivation, AppUser } from './types';
import { AUTHORIZED_SYSTEM_USERS } from './utils/rbac';
import { seedInitialFirestoreData } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'warranty' | 'products' | 'admin' | string>('warranty');
  const [adminInitialTab, setAdminInitialTab] = useState<
    'executive' | 'dashboard' | 'production' | 'quality' | 'customer360' | 'claims' | 'replacements' | 'rbac' | 'warranties' | 'products' | 'logs' | 'schema' | 'powerbi' | undefined
  >(undefined);
  const [currentActivation, setCurrentActivation] = useState<WarrantyActivation | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [verifyInitialCode, setVerifyInitialCode] = useState<string>('');
  const [isOmniSearchOpen, setIsOmniSearchOpen] = useState(false);

  // Synchronized active user across the entire application (Default: USR-03 م. حسام سليمان)
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    try {
      const savedId = localStorage.getItem('sleephigh_current_user_id');
      if (savedId) {
        const found = AUTHORIZED_SYSTEM_USERS.find((u) => u.id === savedId);
        if (found) return found;
      }
    } catch (e) {
      // ignore
    }
    // Default to USR-03 (م. حسام سليمان)
    return AUTHORIZED_SYSTEM_USERS.find((u) => u.id === 'USR-03') || AUTHORIZED_SYSTEM_USERS[0];
  });

  const [systemUsers, setSystemUsers] = useState<AppUser[]>(AUTHORIZED_SYSTEM_USERS);

  // Fetch updated users from server on mount
  useEffect(() => {
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSystemUsers(data);
          try {
            const savedId = localStorage.getItem('sleephigh_current_user_id');
            const targetId = savedId || currentUser.id || 'USR-03';
            const matched = data.find((u: AppUser) => u.id === targetId);
            if (matched) {
              setCurrentUser(matched);
            }
          } catch (e) {
            // ignore
          }
        }
      })
      .catch((err) => console.error('Error fetching system users in App:', err));
  }, []);

  const handleSelectUser = (user: AppUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('sleephigh_current_user_id', user.id);
    } catch (e) {
      // ignore
    }
  };

  const handleUsersUpdated = (updatedList: AppUser[], updatedUser?: AppUser) => {
    setSystemUsers(updatedList);
    if (updatedUser && updatedUser.id === currentUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  // Handle URL parameters and initial seeds on load
  useEffect(() => {
    seedInitialFirestoreData();

    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify');
    const serialParam = params.get('serial');

    if (verifyParam) {
      setVerifyInitialCode(verifyParam);
      setActiveTab('warranty');
    } else if (serialParam) {
      setVerifyInitialCode(serialParam);
      setActiveTab('warranty');
    }

    // Keyboard shortcut for Omni-Search (Ctrl+K or Cmd+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOmniSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewCertificate = (activation: WarrantyActivation, product: Product) => {
    setCurrentActivation(activation);
    setCurrentProduct(product);
    setVerifyInitialCode(activation.warranty_id || product.serial_number);
    setActiveTab('warranty');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOmniSearchResult = async (type: 'product' | 'warranty' | 'claim' | 'replacement', item: any) => {
    if (type === 'warranty') {
      setVerifyInitialCode(item.warranty_id);
      setActiveTab('warranty');
    } else if (type === 'product') {
      setVerifyInitialCode(item.serial_number);
      setActiveTab('warranty');
    } else if (type === 'claim' || type === 'replacement') {
      setAdminInitialTab('customer360');
      setActiveTab('admin');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] text-[#111111] font-sans selection:bg-[#D62828] selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'products') {
            setAdminInitialTab('products');
            setActiveTab('admin');
          } else {
            setActiveTab(tab);
          }
        }}
        hasActiveCertificate={!!currentActivation}
        onOpenOmniSearch={() => setIsOmniSearchOpen(true)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        systemUsers={systemUsers}
      />

      {/* Main Body Content */}
      <main className="flex-1">
        {(activeTab === 'warranty' || activeTab === 'customer' || activeTab === 'certificate' || activeTab === 'verify') && (
          <UnifiedWarrantyPortal
            key={verifyInitialCode}
            initialSerial={verifyInitialCode}
            currentUser={currentUser}
            onNavigateToAdmin={() => {
              setAdminInitialTab('dashboard');
              setActiveTab('admin');
            }}
          />
        )}

        {(activeTab === 'admin' || activeTab === 'products') && (
          <AdminPortal
            onViewCertificate={handleViewCertificate}
            initialAdminTab={activeTab === 'products' ? 'products' : adminInitialTab}
            currentUser={currentUser}
            onSelectUser={handleSelectUser}
            systemUsers={systemUsers}
            onUsersUpdated={handleUsersUpdated}
          />
        )}
      </main>

      {/* Global Omni-Search Modal */}
      <OmniSearchModal
        isOpen={isOmniSearchOpen}
        onClose={() => setIsOmniSearchOpen(false)}
        onSelectResult={handleOmniSearchResult}
      />

      {/* Footer (Hidden on print) */}
      <footer className="no-print bg-[#111111] text-white border-t-2 border-[#D62828] py-6 mt-16 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
            <div>
              جميع الحقوق محفوظة © 2026 سليبي (Sleepee Mattresses).
            </div>
            <div className="flex items-center gap-4 text-neutral-400">
              <span className="hover:text-[#D62828] transition cursor-pointer">سياسة الضمان والاستبدال</span>
              <span>•</span>
              <span className="hover:text-[#D62828] transition cursor-pointer">تعليمات الحفاظ على المرتبة</span>
              <span>•</span>
              <span className="text-[#D62828] font-bold">الخط الساخن: 19707</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
