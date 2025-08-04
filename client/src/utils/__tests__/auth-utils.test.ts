// client/src/utils/__tests__/auth-utils.test.ts

/**
 * Basic tests for authentication utilities
 * These tests verify the core functionality without external dependencies
 */

import { validateAndCleanStorage, validateAllTokens, emergencyCleanup } from '../validateAndCleanStorage';
import { isTokenExpired, shouldRefreshToken, getTokenExpirationTime } from '../refreshToken';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Authentication Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('validateAndCleanStorage', () => {
    test('should validate clean storage correctly', () => {
      // Setup valid tokens
      localStorageMock.setItem('alunoAuthToken', 'valid.jwt.token');
      localStorageMock.setItem('alunoRefreshToken', 'valid-refresh-token');
      localStorageMock.setItem('alunoData', JSON.stringify({ id: '1', role: 'aluno' }));

      const result = validateAndCleanStorage('aluno');
      
      expect(result.isValid).toBe(true);
      expect(result.tokensRemoved).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should remove corrupted tokens', () => {
      // Setup corrupted tokens
      localStorageMock.setItem('alunoAuthToken', 'null');
      localStorageMock.setItem('alunoRefreshToken', '');
      localStorageMock.setItem('alunoData', 'undefined');

      const result = validateAndCleanStorage('aluno');
      
      expect(result.isValid).toBe(false);
      expect(result.tokensRemoved.length).toBeGreaterThan(0);
      expect(localStorageMock.getItem('alunoAuthToken')).toBeNull();
    });

    test('should preserve tokens of different types', () => {
      // Setup tokens for both types
      localStorageMock.setItem('alunoAuthToken', 'null'); // Corrupted aluno token
      localStorageMock.setItem('authToken', 'valid.personal.token'); // Valid personal token

      validateAndCleanStorage('aluno'); // Clean only aluno tokens
      
      expect(localStorageMock.getItem('alunoAuthToken')).toBeNull();
      expect(localStorageMock.getItem('authToken')).toBe('valid.personal.token');
    });
  });

  describe('validateAllTokens', () => {
    test('should validate all token types', () => {
      // Setup tokens for both types
      localStorageMock.setItem('alunoAuthToken', 'aluno-token');
      localStorageMock.setItem('alunoRefreshToken', 'aluno-refresh');
      localStorageMock.setItem('alunoData', JSON.stringify({ id: '1' }));
      
      localStorageMock.setItem('authToken', 'personal-token');
      localStorageMock.setItem('refreshToken', 'personal-refresh');
      localStorageMock.setItem('userData', JSON.stringify({ id: '2' }));

      const results = validateAllTokens();
      
      expect(results.aluno.isValid).toBe(true);
      expect(results.personalAdmin.isValid).toBe(true);
    });
  });

  describe('emergencyCleanup', () => {
    test('should remove all authentication data', () => {
      // Setup data
      localStorageMock.setItem('alunoAuthToken', 'token');
      localStorageMock.setItem('authToken', 'token');
      localStorageMock.setItem('restaurandoRota', 'true');

      emergencyCleanup();
      
      expect(localStorageMock.getItem('alunoAuthToken')).toBeNull();
      expect(localStorageMock.getItem('authToken')).toBeNull();
      expect(localStorageMock.getItem('restaurandoRota')).toBeNull();
    });
  });

  describe('Token expiration utilities', () => {
    test('should detect expired tokens', () => {
      // Create an expired token (expired 1 hour ago)
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200  // 2 hours ago
      };
      const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;
      
      localStorageMock.setItem('alunoAuthToken', expiredToken);
      
      expect(isTokenExpired('aluno')).toBe(true);
      expect(getTokenExpirationTime('aluno')).toBe(0);
    });

    test('should detect tokens that need refresh', () => {
      // Create a token that expires in 1 minute
      const soonToExpirePayload = {
        exp: Math.floor(Date.now() / 1000) + 60, // 1 minute from now
        iat: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      const soonToExpireToken = `header.${btoa(JSON.stringify(soonToExpirePayload))}.signature`;
      
      localStorageMock.setItem('alunoAuthToken', soonToExpireToken);
      
      expect(isTokenExpired('aluno')).toBe(false);
      expect(shouldRefreshToken('aluno', 2)).toBe(true); // Should refresh if expires within 2 minutes
      expect(getTokenExpirationTime('aluno')).toBeGreaterThan(0);
    });

    test('should handle invalid tokens gracefully', () => {
      localStorageMock.setItem('alunoAuthToken', 'invalid-token');
      
      expect(isTokenExpired('aluno')).toBe(true);
      expect(getTokenExpirationTime('aluno')).toBe(0);
      expect(shouldRefreshToken('aluno')).toBe(false);
    });
  });
});

// Export test utilities for manual testing
export const testUtils = {
  setupValidTokens: () => {
    const validPayload = {
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
      id: 'test-user',
      role: 'aluno'
    };
    const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;
    
    localStorageMock.setItem('alunoAuthToken', validToken);
    localStorageMock.setItem('alunoRefreshToken', 'valid-refresh-token');
    localStorageMock.setItem('alunoData', JSON.stringify({ id: 'test-user', role: 'aluno' }));
    
    return validToken;
  },
  
  clearAllTokens: () => {
    localStorageMock.clear();
  },
  
  logCurrentStorage: () => {
    console.log('Current localStorage state:', {
      alunoAuthToken: localStorageMock.getItem('alunoAuthToken'),
      alunoRefreshToken: localStorageMock.getItem('alunoRefreshToken'),
      alunoData: localStorageMock.getItem('alunoData'),
      authToken: localStorageMock.getItem('authToken'),
      refreshToken: localStorageMock.getItem('refreshToken'),
      userData: localStorageMock.getItem('userData'),
    });
  }
};

console.log('Authentication utilities tests loaded. Use testUtils for manual testing.');