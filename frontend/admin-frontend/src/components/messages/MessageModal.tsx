import React, { useState } from 'react';
import { X, Send, User, Clock, MessageSquare, CheckCircle } from 'lucide-react';
import { Message } from '../../types';

interface MessageModalProps {
  message: Message;
  isOpen: boolean;
  onClose: () => void;
  onReply: (messageId: number, replyText: string) => Promise<void>;
  onStatusChange: (messageId: number, status: Message['status']) => Promise<void>;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  message,
  isOpen,
  onClose,
  onReply,
  onStatusChange,
}) => {
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!isOpen) return null;

  const handleReply = async () => {
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      await onReply(message.id, replyText);
      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (newStatus: Message['status']) => {
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(message.id, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStatusColor = (status: Message['status']) => {
    switch (status) {
      case 'new':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Сообщение #{message.id}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 space-y-6">
            {/* Message info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Пользователь</p>
                  <p className="text-sm text-gray-900">{message.user_id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Дата создания</p>
                  <p className="text-sm text-gray-900">{formatDate(message.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Статус</p>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(message.status)}`}>
                  {getStatusText(message.status)}
                </span>
                
                <select
                  value={message.status}
                  onChange={(e) => handleStatusChange(e.target.value as Message['status'])}
                  disabled={isUpdatingStatus}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="new">Новое</option>
                  <option value="in_progress">В работе</option>
                  <option value="resolved">Решено</option>
                </select>
              </div>
            </div>

            {/* Message text */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Сообщение</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>

            {/* Existing reply */}
            {message.reply && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Ваш ответ</p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.reply}</p>
                  {message.replied_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Отправлено: {formatDate(message.replied_at)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reply form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ответ пользователю
              </label>
              <div className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Введите ваш ответ..."
                  disabled={isReplying}
                />
                
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Ответ будет отправлен пользователю в Telegram
                  </p>
                  
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || isReplying}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReplying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Отправить ответ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Закрыть
            </button>
            
            {message.status !== 'resolved' && (
              <button
                onClick={() => handleStatusChange('resolved')}
                disabled={isUpdatingStatus}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Пометить как решено
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
