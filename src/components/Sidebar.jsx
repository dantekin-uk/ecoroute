import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Wallet, 
  Users, 
  Receipt, 
  Package,
  ChevronDown,
  ChevronRight,
  Clock,
  Banknote
} from 'lucide-react';
import { useTheme } from '../context/useTheme'; // Import useTheme

const Sidebar = ({ isOpen, onClose }) => {
  const sidebarRef = useRef(null);
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({ 'OPERATIONS': true, 'RESOURCES': true });
  const { activePalette } = useTheme(); // Get activePalette from context

  const menuGroups = useMemo(() => [
    {
      title: 'MAIN MENU',
      items: [
        { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'estates', name: 'Estates & Tenants', href: '/estates', icon: Building2 },
        { id: 'collections', name: 'Collections', href: '/collections', icon: Wallet },
        { id: 'collector', name: 'Collector Portal', href: '/collector', icon: Banknote },
        { id: 'team', name: 'Team & Risk', href: '/team', icon: Users },
      ]
    },
    {
      title: 'RESOURCES',
      items: [
        { id: 'expenses', name: 'Expenses', href: '/expenses', icon: Receipt },
        { id: 'inventory', name: 'Inventory', href: '/inventory', icon: Package },
      ]
    }
  ], []);

  const [recentIds, setRecentIds] = useState(() => {
    const saved = localStorage.getItem('recentPages');
    return saved ? JSON.parse(saved) : [];
  });

  const recentPages = useMemo(() => recentIds
    .map(id => menuGroups.flatMap(g => g.items).find(i => i.id === id))
    .filter(Boolean), [recentIds, menuGroups]);

  // Track recently visited pages
  useEffect(() => {
    const currentItem = menuGroups.flatMap(g => g.items).find(i => i.href === location.pathname);
    if (currentItem) {
      const updateRecent = () => {
        setRecentIds(prev => {
          const filtered = prev.filter(id => id !== currentItem.id);
          const updated = [currentItem.id, ...filtered].slice(0, 3);
          localStorage.setItem('recentPages', JSON.stringify(updated));
          return updated;
        });
      };
      
      // Use setTimeout to avoid synchronous state update in effect
      const timer = setTimeout(updateRecent, 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, menuGroups]);

  useEffect(() => {
    const handler = (e) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target) && !e.target.closest('.menu-toggle-btn')) {
        if (window.innerWidth < 768) onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const toggleGroup = (title) => {
    const newExpandedGroups = {};
    menuGroups.forEach(group => {
      newExpandedGroups[group.title] = group.title === title ? !expandedGroups[title] : false;
    });
    setExpandedGroups(newExpandedGroups);
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } md:hidden`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-2xl z-[60] transition-all duration-300 ease-in-out transform overflow-y-auto overflow-x-visible scrollbar-small
          ${isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'}`}
        style={{ scrollbarGutter: 'stable' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .scrollbar-small::-webkit-scrollbar {
            width: 4px;
          }
          .scrollbar-small::-webkit-scrollbar-track {
            background: transparent;
          }
          .scrollbar-small::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.3);
            border-radius: 10px;
          }
          .scrollbar-small::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.5);
          }
        `}} />
        <div className="flex flex-col h-full">
          {/* Branding — fixed at top */}
          <div className={`h-20 sticky top-0 bg-white dark:bg-gray-900 flex-shrink-0 flex items-center pl-1 sm:pl-1 border-b border-gray-100 dark:border-gray-800 ${isOpen ? 'justify-start' : 'justify-center'} z-20`}>
            <img
              src="/pwa-512x512.png"
              alt="EcoRoute"
              className={`${isOpen ? 'w-32 h-32' : 'w-28 h-28'} object-contain flex-shrink-0`}
            />
          </div>

          {/* Scrollable menu area */}
          <div
            className="flex-1 relative"
          >
          {/* Recent Pages Section */}
          <div className={`py-4 mx-3 mb-2 mt-2 rounded-2xl ${activePalette.recentBg} border ${activePalette.recentBorder} transition-all duration-300 ${!isOpen ? 'bg-transparent border-transparent' : ''}`}>
            {isOpen && <div className={`px-4 mb-3 text-[11px] font-bold ${activePalette.recentText} uppercase tracking-[0.2em] flex items-center gap-2`}><Clock size={12}/> Recent</div>}
            <div className="px-2 space-y-1">
              {recentPages.map((page) => (
                <Link 
                  key={`recent-${page.id}`} 
                  to={page.href} 
                  onClick={() => { if (window.innerWidth < 768) onClose(); }}
                  className={`relative flex items-center p-2.5 rounded-xl text-gray-500 dark:text-gray-400 ${activePalette.hoverText} hover:bg-white dark:${activePalette.hoverBg} transition-all group border border-transparent ${activePalette.recentBorder}`}
                >
                  <page.icon size={18} className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                  {isOpen && <span className="ml-3 text-sm font-medium truncate">{page.name}</span>}
                </Link>
              ))}
            </div>
          </div>

          <nav className="py-4 px-3 space-y-6">
            {menuGroups.map((group) => (
              <div key={group.title}>
                {isOpen ? (
                  <button 
                    onClick={() => toggleGroup(group.title)}
                    className={`w-full px-4 mb-3 flex items-center justify-between text-[11px] font-bold ${activePalette.recentText} uppercase tracking-[0.3em] ${activePalette.hoverText} transition-colors`}
                  >
                    {group.title}
                    {expandedGroups[group.title] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3 mb-6" />
                )}

                {(expandedGroups[group.title] || !isOpen) && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.id}
                          to={item.href}
                          onClick={() => { if (window.innerWidth < 768) onClose(); }}
                          className={`relative flex items-center p-3 rounded-xl transition-all duration-300 group ${
                            isActive
                              ? `${activePalette.activeBg} ${activePalette.activeText} shadow-neon-border`
                              : `text-gray-500 dark:text-gray-400 ${activePalette.hoverText} hover:bg-gray-50 dark:hover:bg-gray-800/50`
                          }`}
                        >
                          {isActive && (
                            <div className={`absolute left-0 w-1 h-6 ${activePalette.activeBorder} rounded-r-full ${activePalette.activeShadow}`} />
                          )}
                          <item.icon size={20} className={`flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? `${activePalette.activeText} drop-shadow-[0_0_5px_rgba(132,204,22,0.5)]` : ''}`} />
                          {isOpen && <span className={`ml-3 text-sm font-semibold truncate ${isActive ? activePalette.activeText : ''}`}>{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
