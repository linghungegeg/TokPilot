

const IPC_ERROR_CODES = Object.freeze({
  validation: 'VALIDATION_ERROR',
  taskLocked: 'TASK_LOCKED',
  notFound: 'NOT_FOUND',
  operationFailed: 'OPERATION_FAILED',
  internal: 'INTERNAL_ERROR'
});

class AppError extends Error {
  

  constructor(code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

function toIpcSuccess(data) {
  return {
    success: true,
    data
  };
}

function toIpcFailure(error) {
  return {
    success: false,
    error: normalizeIpcError(error)
  };
}

function normalizeIpcError(error) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details || null
    };
  }

  if (error && typeof error === 'object') {
    const typedError =  (error);
    if (typeof typedError.code === 'string' && typeof typedError.message === 'string') {
      return {
        code: typedError.code,
        message: typedError.message,
        details: isPlainObject(typedError.details) ? typedError.details : null
      };
    }
  }

  if (error instanceof Error) {
    return {
      code: IPC_ERROR_CODES.operationFailed,
      message: error.message,
      details: null
    };
  }

  return {
    code: IPC_ERROR_CODES.internal,
    message: '发生了未知错误',
    details: null
  };
}

function createValidationError(message, details = null) {
  return new AppError(IPC_ERROR_CODES.validation, message, details);
}

function createTaskLockedError(message, details = null) {
  return new AppError(IPC_ERROR_CODES.taskLocked, message, details);
}

function createOperationFailedError(message, details = null) {
  return new AppError(IPC_ERROR_CODES.operationFailed, message, details);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  IPC_ERROR_CODES,
  AppError,
  toIpcSuccess,
  toIpcFailure,
  normalizeIpcError,
  createValidationError,
  createTaskLockedError,
  createOperationFailedError
};
