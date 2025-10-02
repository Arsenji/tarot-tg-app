import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/common/Header';
import { MessageFilters } from '../components/messages/MessageFilters';
import { MessageTable } from '../components/messages/MessageTable';
import { MessageModal } from '../components/messages/MessageModal';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Message, MessageFilters as IMessageFilters } from '../types';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<IMessageFilters>({});
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [lastMessageId, setLastMessageId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadMessages();
  }, [filters]);

  // Автообновление сообщений каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [filters]);

  // Инициализация аудио для уведомлений
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBS13yO/eizEIHWq+8+OWT');
  }, []);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getMessages(filters);
      if (response.success && response.data) {
        const newMessages = response.data;
        
        // Проверяем новые сообщения
        if (lastMessageId && newMessages.length > 0) {
          const latestMessage = newMessages[0];
          if (latestMessage.id > lastMessageId) {
            // Есть новые сообщения
            const newCount = newMessages.filter(msg => msg.id > lastMessageId).length;
            setNewMessageCount(prev => prev + newCount);
            
            // Воспроизводим звук уведомления
            if (audioRef.current) {
              audioRef.current.play().catch(console.error);
            }
            
            // Показываем уведомление в браузере
            if (Notification.permission === 'granted') {
              new Notification('Новое сообщение', {
                body: `Получено ${newCount} новое сообщение`,
                icon: '/favicon.ico'
              });
            }
          }
        }
        
        setMessages(newMessages);
        if (newMessages.length > 0) {
          setLastMessageId(newMessages[0].id);
        }
      } else {
        console.error('Failed to load messages:', response.error);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (messageId: number, status: Message['status']) => {
    try {
      const response = await apiService.updateMessageStatus(messageId, { status });
      if (response.success) {
        // Обновляем сообщение в списке
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, status } : msg
          )
        );
        
        // Обновляем выбранное сообщение, если оно открыто
        if (selectedMessage && selectedMessage.id === messageId) {
          setSelectedMessage(prev => prev ? { ...prev, status } : null);
        }
      } else {
        console.error('Failed to update message status:', response.error);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  const handleReply = async (messageId: number, replyText: string) => {
    try {
      const response = await apiService.replyToMessage(messageId, { text: replyText });
      if (response.success && response.data) {
        // Обновляем сообщение в списке
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? response.data! : msg
          )
        );
        
        // Обновляем выбранное сообщение
        setSelectedMessage(response.data);
      } else {
        console.error('Failed to send reply:', response.error);
        throw new Error(response.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMessage(null);
  };

  // Запрос разрешения на уведомления при загрузке
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Сброс счетчика новых сообщений при клике на сообщение
  const handleMessageClickWithNotification = (message: Message) => {
    setNewMessageCount(0);
    handleMessageClick(message);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={logout} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Управление сообщениями</h1>
              <p className="mt-2 text-gray-600">
                Просматривайте и отвечайте на сообщения от пользователей
              </p>
            </div>
            {newMessageCount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                {newMessageCount} новое сообщение
              </div>
            )}
          </div>
        </div>

        <MessageFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />

        <MessageTable
          messages={messages}
          isLoading={isLoading}
          onMessageClick={handleMessageClickWithNotification}
          onStatusChange={handleStatusChange}
        />

        {selectedMessage && (
          <MessageModal
            message={selectedMessage}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onReply={handleReply}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
};
