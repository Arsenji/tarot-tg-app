import { Request, Response } from 'express';
import { db } from '../utils/database';
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

      const result = await db.query(
        'INSERT INTO messages (user_id, text) VALUES ($1, $2) RETURNING *',
        [userId, text]
      );

      const message: Message = result.rows[0];

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
      let query = 'SELECT * FROM messages WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.userId) {
        paramCount++;
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.userId);
      }

      if (filters.startDate) {
        paramCount++;
        query += ` AND created_at >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        query += ` AND created_at <= $${paramCount}`;
        params.push(filters.endDate);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);
      const messages: Message[] = result.rows;

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

      const result = await db.query(
        'SELECT * FROM messages WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const message: Message = result.rows[0];

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

      const result = await db.query(
        'UPDATE messages SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const message: Message = result.rows[0];

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
      const messageResult = await db.query(
        'SELECT * FROM messages WHERE id = $1',
        [id]
      );

      if (messageResult.rows.length === 0) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const message: Message = messageResult.rows[0];

      // Обновляем сообщение с ответом
      const updateResult = await db.query(
        'UPDATE messages SET reply = $1, replied_at = CURRENT_TIMESTAMP, status = $2 WHERE id = $3 RETURNING *',
        [text, 'resolved', id]
      );

      const updatedMessage: Message = updateResult.rows[0];

      // Отправляем ответ пользователю в Telegram
      const replyText = `💬 Ответ от поддержки:\n\n${text}`;
      const sent = await telegramService.sendReplyToUser(message.userId, replyText);

      if (!sent) {
        console.warn(`Failed to send reply to user ${message.userId}`);
      }

      res.json({
        success: true,
        data: updatedMessage
      });
    } catch (error) {
      console.error('Error replying to message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM messages WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
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
