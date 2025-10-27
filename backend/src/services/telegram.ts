import axios from 'axios';

export class TelegramService {
  private botToken: string;
  private adminTelegramId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.adminTelegramId = process.env.ADMIN_TELEGRAM_ID || '';
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    try {
      if (!this.botToken) {
        console.warn('Telegram bot token not configured');
        return false;
      }
      
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        }
      );

      return (response.data as any).ok;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  async sendMessageToAdmin(text: string): Promise<boolean> {
    if (!this.adminTelegramId) {
      console.warn('Admin Telegram ID not configured');
      return false;
    }

    return this.sendMessage(this.adminTelegramId, text);
  }

  async sendReplyToUser(userId: string, text: string): Promise<boolean> {
    // Предполагаем, что userId это chat_id пользователя в Telegram
    return this.sendMessage(userId, text);
  }

  async getBotInfo(): Promise<any> {
    try {
      if (!this.botToken) {
        console.warn('Telegram bot token not configured');
        return null;
      }
      
      const response = await axios.get(
        `https://api.telegram.org/bot${this.botToken}/getMe`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }

  async setWebhook(url: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/setWebhook`,
        { url }
      );
      return (response.data as any).ok;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return false;
    }
  }

  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/deleteWebhook`
      );
      return (response.data as any).ok;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }
}

export const telegramService = new TelegramService();
