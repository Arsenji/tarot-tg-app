export interface Message {
  id: number;
  userId: string;
  text: string;
  status: 'new' | 'in_progress' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
  reply?: string;
  repliedAt?: Date;
}

export interface CreateMessageRequest {
  userId: string;
  text: string;
}

export interface UpdateMessageStatusRequest {
  status: 'new' | 'in_progress' | 'resolved';
}

export interface ReplyMessageRequest {
  text: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    username: string;
  };
}

export interface MessageFilters {
  status?: 'new' | 'in_progress' | 'resolved';
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}
