// @ts-expect-error Declare console for this environment
declare const console: {
  warn: (...data: any[]) => void;
  error: (...data: any[]) => void;
  log: (...data: any[]) => void;
  info: (...data: any[]) => void;
  debug: (...data: any[]) => void;
  setContext(context: Partial<{ userId?: string; sessionId?: string }>): void;
};

// Store the original console.warn function
const originalWarn = console.warn;

// Define log levels
enum LogLevel {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

// Define log types
type LogType = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

// Define a custom logger class with generics
class EnhancedLogger<T extends Record<string, unknown>> {
  private static instance: EnhancedLogger<any>;
  private logLevel: LogLevel = LogLevel.INFO;
  private context: T = {} as T;

  private constructor() {}

  static getInstance<U extends Record<string, unknown>>(): EnhancedLogger<U> {
    if (!EnhancedLogger.instance) {
      EnhancedLogger.instance = new EnhancedLogger<U>();
    }
    return EnhancedLogger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setContext(context: Partial<T>): void {
    this.context = { ...this.context, ...context };
  }

  private formatMessage(type: LogType, message: any, ...optionalParams: any[]): string {
    const isoString = new Date().toISOString();
    const timestamp = isoString.slice(11, 19); // "14:30:00"
    const formattedParams = optionalParams.map((param) => this.stringifyParam(param));
    const contextString =
      Object.keys(this.context).length > 0 ? `[${JSON.stringify(this.context)}] ` : '';
    return `§9[CraftedAPI]§r §7[${timestamp}]§r §${this.getColorCode(type)}[${type}]:§r ${contextString}${this.stringifyParam(message)} ${formattedParams.join(' ')}`;
  }

  private stringifyParam(param: any): string {
    if (typeof param === 'object') {
      try {
        return JSON.stringify(param, null, 2);
      } catch (e) {
        return String(param);
      }
    }
    return String(param);
  }

  private getColorCode(type: LogType): string {
    switch (type) {
      case 'ERROR':
        return 'c';
      case 'WARN':
        return 'e';
      case 'INFO':
        return 'a';
      case 'DEBUG':
        return 'd';
    }
  }

  private log(type: LogType, level: LogLevel, message: any, ...optionalParams: any[]): void {
    if (this.logLevel >= level) {
      originalWarn(this.formatMessage(type, message, ...optionalParams));
    }
  }

  error(message: any, ...optionalParams: any[]): void {
    this.log('ERROR', LogLevel.ERROR, message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.log('WARN', LogLevel.WARN, message, ...optionalParams);
  }

  info(message: any, ...optionalParams: any[]): void {
    this.log('INFO', LogLevel.INFO, message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.log('DEBUG', LogLevel.DEBUG, message, ...optionalParams);
  }
}

// Create the logger instance
const logger = EnhancedLogger.getInstance<{ userId?: string; sessionId?: string }>();

// Define the shape of our console object
interface CustomConsole {
  log: (message: any, ...optionalParams: any[]) => void;
  error: (message: any, ...optionalParams: any[]) => void;
  warn: (message: any, ...optionalParams: any[]) => void;
  info: (message: any, ...optionalParams: any[]) => void;
  debug: (message: any, ...optionalParams: any[]) => void;
  setContext: (context: Partial<{ userId?: string; sessionId?: string }>) => void;
}

// Override the global console object
(globalThis as any).console = {
  log: (message: any, ...optionalParams: any[]) => logger.info(message, ...optionalParams),
  error: (message: any, ...optionalParams: any[]) => logger.error(message, ...optionalParams),
  warn: (message: any, ...optionalParams: any[]) => logger.warn(message, ...optionalParams),
  info: (message: any, ...optionalParams: any[]) => logger.info(message, ...optionalParams),
  debug: (message: any, ...optionalParams: any[]) => logger.debug(message, ...optionalParams),
  setContext: (context: Partial<{ userId?: string; sessionId?: string }>) =>
    logger.setContext(context),
} as CustomConsole;

// Expose the setLogLevel function globally
(globalThis as any).setLogLevel = (level: LogLevel) => logger.setLogLevel(level);
