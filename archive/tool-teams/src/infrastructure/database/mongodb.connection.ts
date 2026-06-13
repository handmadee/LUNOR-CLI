import mongoose from 'mongoose';
import { config } from '../../config';

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  /**
   * Connect to MongoDB with retry logic
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.info('MongoDB already connected');
      return;
    }

    const mongoUri = config.mongodb.uri;
    const maxRetries = 5;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await mongoose.connect(mongoUri, {
          maxPoolSize: config.mongodb.poolSize,
          minPoolSize: 5,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          family: 4, // Use IPv4, skip trying IPv6
        });

        this.isConnected = true;
        console.info('✅ MongoDB connected successfully', {
          host: mongoose.connection.host,
          database: mongoose.connection.name,
        });

        // Connection event handlers
        this.setupEventHandlers();

        return;
      } catch (error) {
        retryCount++;
        console.error(`MongoDB connection attempt ${retryCount}/${maxRetries} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });

        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
          console.info(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw new Error('MongoDB connection failed after maximum retries');
        }
      }
    }
  }

  /**
   * Setup MongoDB connection event handlers
   */
  private setupEventHandlers(): void {
    mongoose.connection.on('connected', () => {
      console.info('MongoDB connected event triggered');
      this.isConnected = true;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error', { error: err.message });
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.info('MongoDB reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.info('MongoDB disconnected gracefully');
    } catch (error) {
      console.error('Error during MongoDB disconnect', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    isConnected: boolean;
    readyState: string;
    host?: string;
    database?: string;
  } {
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      isConnected: this.isConnected,
      readyState: states[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    };
  }

  /**
   * Health check for monitoring
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Ping database
      const db = mongoose.connection.db;
      if (!db) {
        return false;
      }
      await db.admin().ping();
      return true;
    } catch (error) {
      console.error('MongoDB health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

// Export singleton instance
export const mongodbConnection = MongoDBConnection.getInstance();
