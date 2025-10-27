'use client';

import React from 'react';
import { motion } from 'motion/react';

interface BottomNavigationProps {
  activeTab: 'home' | 'history';
  onTabChange: (tab: 'home' | 'history') => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Главная', icon: '🏠' },
    { id: 'history', label: 'История раскладов', icon: '📚' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-slate-800/90 backdrop-blur-md border-t border-slate-700/50 px-4 py-2">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`flex flex-col items-center py-2 px-4 rounded-2xl transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600/20 border border-purple-500/30'
                  : 'hover:bg-slate-700/50'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="text-2xl mb-1">{tab.icon}</span>
              <span 
                className={`text-xs font-medium ${
                  activeTab === tab.id 
                    ? 'text-purple-400' 
                    : 'text-white/70'
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
