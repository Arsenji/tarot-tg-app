import React from 'react';
import { MessageSquare, Clock, User, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { Message } from '../../types';

interface MessageTableProps {
  messages: Message[];
  isLoading: boolean;
  onMessageClick: (message: Message) => void;
  onStatusChange: (messageId: number, status: Message['status']) => void;
}

export const MessageTable: React.FC<MessageTableProps> = ({
  messages,
  isLoading,
  onMessageClick,
  onStatusChange,
}) => {
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'new':
        return <Circle className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: Message['status']) => {
    switch (status) {
      case 'new':
        return 'Новое';
      case 'in_progress':
        return 'В работе';
      case 'resolved':
        return 'Решено';
      default:
        return status;
    }
  };

  const getStatusBadgeColor = (status: Message['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Загрузка сообщений...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-500">Сообщения не найдены</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Пользователь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сообщение
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата создания
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {messages.map((message) => (
              <tr
                key={message.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onMessageClick(message)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{message.id}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{message.user_id}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {truncateText(message.text)}
                  </div>
                  {message.reply && (
                    <div className="text-xs text-gray-500 mt-1">
                      Ответ: {truncateText(message.reply, 50)}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(message.status)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(message.status)}`}>
                      {getStatusText(message.status)}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDate(message.created_at)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <select
                    value={message.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      onStatusChange(message.id, e.target.value as Message['status']);
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="new">Новое</option>
                    <option value="in_progress">В работе</option>
                    <option value="resolved">Решено</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
