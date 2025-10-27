import { Request, Response } from 'express';
import { SupportMessage } from '../models/SupportMessage';
import { telegramService } from '../services/telegram';
import { Message, CreateMessageRequest, UpdateMessageStatusRequest, ReplyMessageRequest, MessageFilters } from '../types';

export class MessageController {
  async createMessage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, text }: CreateMessageRequest = req.body;

      if (!userId || !text) {
        res.status(400).json({ error: 'userId and text are required' });
        return;
      }

      const message = new SupportMessage({
        userId,
        telegramId: parseInt(userId),
        userName: req.body.userName || 'Unknown',
        userUsername: req.body.userUsername || '',
        message: text,
        status: 'new'
      });

      await message.save();

      // Отправляем уведомление админу в Telegram
      const adminMessage = `🔔 Новое сообщение от пользователя ${userId}:\n\n${text}`;
      await telegramService.sendMessageToAdmin(adminMessage);

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const filters: MessageFilters = req.query;
      const query: any = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.userId) query.userId = filters.userId;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const messages = await SupportMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMessageById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const message = await SupportMessage.findById(id);
      
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error getting message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status }: UpdateMessageStatusRequest = req.body;

      if (!status || !['new', 'in_progress', 'resolved'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const message = await SupportMessage.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error updating message status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async replyToMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { text }: ReplyMessageRequest = req.body;

      if (!text) {
        res.status(400).json({ error: 'Reply text is required' });
        return;
      }

      // Получаем сообщение
      const message = await SupportMessage.findById(id);

      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      // Обновляем сообщение с ответом
      message.reply = text;
      message.repliedAt = new Date();
      message.status = 'resolved';
      await message.save();

      // Отправляем ответ пользователю в Telegram
      const replyText = `💬 Ответ от поддержки:\n\n${text}`;
      const sent = await telegramService.sendReplyToUser(message.telegramId.toString(), replyText);

      if (!sent) {
        console.warn(`Failed to send reply to user ${message.telegramId}`);
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error replying to message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deletedMessage = await SupportMessage.findByIdAndDelete(id);
      
      if (!deletedMessage) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
