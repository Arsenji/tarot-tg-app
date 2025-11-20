import mongoose from 'mongoose';
import logger from './logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    await mongoose.connect(mongoUri, options);
    
    logger.info('✅ MongoDB connected successfully');
    logger.info(`📊 Connection state: ${mongoose.connection.readyState}`);
    logger.info(`🏷️ Database name: ${mongoose.connection.name}`);
    
    // Обработчики событий подключения
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    
    // Если MongoDB недоступна, но есть флаг ALLOW_NO_MONGODB, продолжаем работу
    if (process.env.ALLOW_NO_MONGODB === 'true') {
      logger.warn('⚠️ Continuing without MongoDB (ALLOW_NO_MONGODB=true)');
      return;
    }
    
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('✅ MongoDB disconnected successfully');
  } catch (error) {
    logger.error('❌ MongoDB disconnection error:', error);
    throw error;
  }
};