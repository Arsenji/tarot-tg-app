import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taro-tg-app';
    
    console.log(`🔗 Attempting to connect to MongoDB...`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 URI: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`);
    
    // Проверяем, есть ли placeholder в пароле
    if (mongoURI.includes('<db_password>')) {
      console.error('❌ MongoDB URI contains placeholder password!');
      console.error('💡 Please set the correct MONGODB_URI environment variable on Render.com');
      throw new Error('MongoDB URI contains placeholder password');
    }
    
    // Настройки подключения для production
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000, // Увеличиваем timeout
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000, // Увеличиваем timeout
      bufferCommands: false,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000,
    };
    
    console.log('⏳ Connecting with options:', {
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
      connectTimeoutMS: options.connectTimeoutMS,
      maxPoolSize: options.maxPoolSize
    });
    
    await mongoose.connect(mongoURI, options);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Connection state: ${mongoose.connection.readyState}`);
    console.log(`🏷️ Database name: ${mongoose.connection.db?.databaseName}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected - connection lost');
      console.log(`📊 Connection state: ${mongoose.connection.readyState}`);
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
      console.log(`📊 Connection state: ${mongoose.connection.readyState}`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error: any) {
    console.error('❌ MongoDB connection failed:', error);
    
    // Детальная диагностика ошибки
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 DNS Error detected:');
      console.error('   - MongoDB Atlas cluster may be paused or deleted');
      console.error('   - Check your MongoDB Atlas dashboard');
      console.error('   - Verify cluster name and connection string');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔍 Connection Refused:');
      console.error('   - Network access not configured for Render.com IPs');
      console.error('   - Add 0.0.0.0/0 to Network Access in MongoDB Atlas');
    } else if (error.code === 'EAUTH') {
      console.error('🔍 Authentication Error:');
      console.error('   - Username or password incorrect');
      console.error('   - Database user may not exist or have wrong permissions');
    }
    
    // В production не пытаемся fallback, просто выходим
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Production MongoDB connection failed. Please check your MongoDB Atlas configuration.');
      console.error('💡 Make sure:');
      console.error('   - MONGODB_URI is set correctly');
      console.error('   - MongoDB Atlas cluster is running');
      console.error('   - Network access is configured for Render.com');
      console.error('   - Database user has proper permissions');
      console.error('   - Cluster is not paused');
      
      // Для тестирования на Render.com - временно продолжаем без MongoDB
      if (process.env.ALLOW_NO_MONGODB === 'true') {
        console.warn('⚠️ Continuing without MongoDB (ALLOW_NO_MONGODB=true)');
        console.warn('📝 MongoDB features will be disabled:');
        console.warn('   - User authentication');
        console.warn('   - Reading history');
        console.warn('   - Clarifying questions');
        console.warn('   - Payment tracking');
        console.warn('💡 To enable MongoDB:');
        console.warn('   1. Check MongoDB Atlas dashboard');
        console.warn('   2. Ensure cluster is running (not paused)');
        console.warn('   3. Verify connection string');
        console.warn('   4. Set ALLOW_NO_MONGODB=false');
        return;
      }
    }
    
    process.exit(1);
  }
};

export { connectDB };