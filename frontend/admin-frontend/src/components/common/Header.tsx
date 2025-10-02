import React from 'react';
import { LogOut, User, MessageSquare } from 'lucide-react';

interface HeaderProps {
  user: { username: string } | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Админ-панель
              </span>
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {user.username}
                  </span>
                </div>
                
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Выйти</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
