import React from 'react';
import { Filter, X } from 'lucide-react';
import { MessageFilters as IMessageFilters } from '../../types';

interface MessageFiltersProps {
  filters: IMessageFilters;
  onFiltersChange: (filters: IMessageFilters) => void;
  onClearFilters: () => void;
}

export const MessageFilters: React.FC<MessageFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleFilterChange = (key: keyof IMessageFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Фильтры</h3>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Очистить</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Статус */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Статус
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Все статусы</option>
            <option value="new">Новые</option>
            <option value="in_progress">В работе</option>
            <option value="resolved">Решено</option>
          </select>
        </div>

        {/* ID пользователя */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID пользователя
          </label>
          <input
            type="text"
            value={filters.userId || ''}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            placeholder="Введите ID пользователя"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Дата от */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата от
          </label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Дата до */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата до
          </label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Статус: {filters.status === 'new' ? 'Новые' : filters.status === 'in_progress' ? 'В работе' : 'Решено'}
            </span>
          )}
          {filters.userId && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Пользователь: {filters.userId}
            </span>
          )}
          {filters.startDate && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              От: {new Date(filters.startDate).toLocaleDateString('ru-RU')}
            </span>
          )}
          {filters.endDate && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              До: {new Date(filters.endDate).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
