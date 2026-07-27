import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class AuthProvider with ChangeNotifier {
  final _apiService = ApiService();
  final _storage = const FlutterSecureStorage();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isInitialized = false;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;
  bool get isInitialized => _isInitialized;

  // Check for existing session on app start
  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.read(key: 'token');
      if (token != null && token.isNotEmpty) {
        // Verify token by fetching user profile
        final response = await _apiService.get('/auth/me');

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          // Handle both direct user object and nested data structure
          _user = data['user'] ?? data['data'] ?? data;

          // Initialize Socket
          if (_user?['tenantId'] != null) {
            SocketService().initSocket(_user!['tenantId']);
            // fire-and-forget; socket auth uses stored token
          }

          debugPrint(
            'User authenticated: ${_user?['firstName']} ${_user?['lastName']}',
          );
        } else {
          // Token is invalid, clear it
          await _storage.delete(key: 'token');
          _user = null;
        }
      }
    } catch (e) {
      debugPrint('Auth check error: $e');
      // Clear invalid token
      await _storage.delete(key: 'token');
      _user = null;
    }

    _isLoading = false;
    _isInitialized = true;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/auth/login', {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);

        // Handle different response structures
        final token = data['token'] ?? data['data']?['token'];
        final userData = data['user'] ?? data['data']?['user'] ?? data['data'];

        if (token != null) {
          await _apiService.saveToken(token);
          _user = userData;

          // Initialize Socket
          if (_user?['tenantId'] != null) {
            SocketService().initSocket(_user!['tenantId']);
            // fire-and-forget; socket auth uses stored token
          }

          _isLoading = false;
          _isInitialized = true;
          notifyListeners();

          debugPrint(
            'Login successful: ${_user?['firstName']} ${_user?['lastName']}',
          );
          debugPrint('User role: ${_user?['role']}');

          return true;
        } else {
          _errorMessage = 'Invalid response from server';
        }
      } else {
        final errorData = jsonDecode(response.body);
        _errorMessage = errorData['message'] ?? 'Login failed';
        debugPrint('Login failed: $_errorMessage');
      }
    } catch (e) {
      _errorMessage = 'Network error: Unable to connect to server';
      debugPrint('Login error: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Call logout endpoint
      await _apiService.post('/auth/logout', {});
    } catch (e) {
      debugPrint('Logout API error: $e');
      // Continue even if API call fails
    }

    try {
      // Disconnect socket
      SocketService().disconnect();

      // Clear token from storage
      await _apiService.clearToken();

      // Reset auth state
      _user = null;
      _errorMessage = null;
      _isLoading = false;
      notifyListeners();

      debugPrint('User logged out successfully');
      return true;
    } catch (e) {
      debugPrint('Error during logout: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}