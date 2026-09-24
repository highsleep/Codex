import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UnifiedWarrantyPortal } from './components/UnifiedWarrantyPortal';
import { AdminPortal } from './components/AdminPortal';
import { OmniSearchModal } from './components/OmniSearchModal';
import { Product, WarrantyActivation, AppUser } from './types';
import { AUTHORIZED_SYSTEM_USERS } from './utils/rbac';
import { seedInitialFirestoreData } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'warranty' | 'products' | 'admin' | string>('admin');
  const [currentActivation, setCurrentActivation] = useState<WarrantyActivation | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [verifyInitialCode, setVerifyInitialCode] = useState<string>('');
  const [isOmniSearchOpen, setIsOmniSearchOpen] = useState(false);

  // Global Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sleepee_theme') === 'dark';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sleepee_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sleepee_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sleepee_theme', next ? 'dark' : 'light');
        if (currentUser?.id) {
          localStorage.setItem(`sleepee_theme_${currentUser.id}`, next ? 'dark' : 'light');
        }
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

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
      const userTheme = localStorage.getItem(`sleepee_theme_${user.id}`) || localStorage.getItem('sleepee_theme');
      if (userTheme === 'dark') {
        setDarkMode(true);
      } else if (userTheme === 'light') {
        setDarkMode(false);
      }
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

  const handleOmniSearchResult = async (type: 'product' | 'warranty' | 'claim' | 'replacement', item: any) => {
    if (type === 'warranty') {
      setVerifyInitialCode(item.warranty_id);
      setActiveTab('warranty');
    } else if (type === 'product') {
      setVerifyInitialCode(item.serial_number);
      setActiveTab('warranty');
    } else if (type === 'claim' || type === 'replacement') {
      setActiveTab('admin');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F5F5F5] text-[#111111]'} font-sans selection:bg-[#E53935] selection:text-white transition-colors duration-200`}>
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveCertificate={!!currentActivation}
        onOpenOmniSearch={() => setIsOmniSearchOpen(true)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        systemUsers={systemUsers}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Body Content - Standardized width max-w-[1400px] */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {(activeTab === 'warranty' || activeTab === 'customer' || activeTab === 'certificate' || activeTab === 'verify') && (
          <UnifiedWarrantyPortal
            key={verifyInitialCode}
            initialSerial={verifyInitialCode}
            currentUser={currentUser}
            onNavigateToAdmin={() => setActiveTab('admin')}
          />
        )}

        {(activeTab === 'admin' || activeTab === 'products') && (
          <AdminPortal
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

      {/* Unified Corporate Footer */}
      <footer className="no-print bg-[#08152F] dark:bg-slate-950 text-slate-300 border-t-2 border-[#E53935] py-4 mt-8 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-center sm:text-right">
              <span className="font-bold text-white text-sm">جميع الحقوق محفوظة © 2026 هاي سليب</span>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="text-slate-400 font-medium">Sleepee Warranty & Manufacturing Platform</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="hidden md:inline text-slate-300">الشركة العربية لصناعة مراتب السوست والإسفنج</span>
              <span className="hidden md:inline text-slate-600">•</span>
              <a href="tel:19707" className="text-[#E53935] font-bold font-mono hover:underline">الخط الساخن: 19707</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
