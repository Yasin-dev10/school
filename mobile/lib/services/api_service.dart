import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../config/app_config.dart';
import 'offline_service.dart';

class ApiService {
  /// Same backend as the web app — see [AppConfig].
  static String get baseUrl => AppConfig.apiBaseUrl;

  final _storage = const FlutterSecureStorage();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'token');
    if (token == null) {
      debugPrint('⚠️ ApiService: No token found in storage');
    } else {
      debugPrint('🔑 ApiService: Attaching token (length: ${token.length})');
    }
    return {
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<bool> _isOnline() async {
    try {
      final results = await Connectivity().checkConnectivity();
      return !results.contains(ConnectivityResult.none);
    } catch (e) {
      debugPrint('Connectivity check error: $e');
      return true; // Assume online if check fails to avoid blocking
    }
  }

  Future<bool> _refreshAccessToken() async {
    final refreshToken = await _storage.read(key: 'refresh_token');
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      ).timeout(const Duration(seconds: 30));
      if (response.statusCode != 200) return false;
      final data = jsonDecode(response.body);
      await saveToken(data['accessToken']);
      await saveRefreshToken(data['refreshToken']);
      return true;
    } catch (_) {
      return false;
    }
  }

  bool _canQueueWrite(String endpoint) {
    const sensitivePrefixes = [
      '/auth',
      '/fees/pay',
      '/stripe',
      '/salaries',
      '/inventory',
      '/certificates',
    ];
    return !sensitivePrefixes.any(endpoint.startsWith);
  }

  Future<http.Response> get(String endpoint) async {
    try {
      if (await _isOnline()) {
        final headers = await _getHeaders();
        final url = '$baseUrl$endpoint';
        debugPrint('GET Request: $url');

        var response = await http
            .get(Uri.parse(url), headers: headers)
            .timeout(const Duration(seconds: 30));
        if (response.statusCode == 401 && await _refreshAccessToken()) {
          response = await http.get(Uri.parse(url), headers: await _getHeaders()).timeout(const Duration(seconds: 30));
        }

        debugPrint('GET Response [$endpoint]: ${response.statusCode}');
        if (response.statusCode == 200) {
          // Cache successful responses
          await OfflineService.cacheData(endpoint, jsonDecode(response.body));
        } else if (response.statusCode >= 400) {
          debugPrint('Error Response Body: ${response.body}');
        }

        return response;
      } else {
        debugPrint('Offline: Fetching cached data for $endpoint');
        final cachedData = await OfflineService.getCachedData(endpoint);
        if (cachedData != null) {
          return http.Response(jsonEncode(cachedData), 200);
        }
        throw const SocketException(
          'No internet connection and no cached data',
        );
      }
    } catch (e) {
      debugPrint('GET Error [$endpoint]: $e');
      // If network error (not just offline check), try cache as fallback
      if (e is SocketException || e is http.ClientException) {
        final cachedData = await OfflineService.getCachedData(endpoint);
        if (cachedData != null) {
          return http.Response(jsonEncode(cachedData), 200);
        }
      }
      rethrow;
    }
  }

  Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    try {
      if (await _isOnline()) {
        final headers = await _getHeaders();
        final url = '$baseUrl$endpoint';
        debugPrint('POST Request: $url');
        debugPrint('POST Body: ${_safeBodyForLog(endpoint, body)}');

        var response = await http
            .post(Uri.parse(url), headers: headers, body: jsonEncode(body))
            .timeout(const Duration(seconds: 30));
        if (response.statusCode == 401 && endpoint != '/auth/refresh' && await _refreshAccessToken()) {
          response = await http.post(Uri.parse(url), headers: await _getHeaders(), body: jsonEncode(body)).timeout(const Duration(seconds: 30));
        }

        debugPrint('POST Response [$endpoint]: ${response.statusCode}');
        if (response.statusCode >= 400) {
          debugPrint('Error Response Body: ${response.body}');
        }

        return response;
      } else {
        if (!_canQueueWrite(endpoint)) {
          return http.Response(
            jsonEncode({
              'success': false,
              'message': 'This action requires an active internet connection.',
            }),
            503,
          );
        }
        debugPrint('Offline: Queuing request for $endpoint');
        await OfflineService.queueRequest(
          endpoint: endpoint,
          method: 'POST',
          body: body,
          headers: await _getHeaders(),
        );
        return http.Response(
          jsonEncode({
            'success': true,
            'message': 'Saved offline. Will sync when online.',
            'offline': true,
          }),
          200,
        );
      }
    } catch (e) {
      debugPrint('POST Error [$endpoint]: $e');
      // Queue on network error too
      if (e is SocketException || e is http.ClientException) {
        if (!_canQueueWrite(endpoint)) rethrow;
        await OfflineService.queueRequest(
          endpoint: endpoint,
          method: 'POST',
          body: body,
          headers: await _getHeaders(),
        );
        return http.Response(
          jsonEncode({
            'success': true,
            'message': 'Saved offline due to network error.',
            'offline': true,
          }),
          200,
        );
      }
      rethrow;
    }
  }

  String _safeBodyForLog(String endpoint, Map<String, dynamic> body) {
    if (endpoint.startsWith('/auth')) return '[redacted]';
    final safeBody = Map<String, dynamic>.from(body);
    for (final key in ['password', 'token', 'refreshToken']) {
      if (safeBody.containsKey(key)) safeBody[key] = '[redacted]';
    }
    return jsonEncode(safeBody);
  }

  Future<http.Response> postMultipart(
    String endpoint,
    Map<String, String> fields,
    String? filePath, {
    String fileKey = 'file',
  }) async {
    try {
      if (await _isOnline()) {
        final url = '$baseUrl$endpoint';
        debugPrint('POST Multipart Request: $url');

        final request = http.MultipartRequest('POST', Uri.parse(url));

        // Get headers (especially Auth)
        final headers = await _getHeaders();
        request.headers.addAll(headers);
        // Multiparts usually don't want application/json content-type header
        request.headers.remove('Content-Type');

        // Add fields
        request.fields.addAll(fields);

        // Add file
        if (filePath != null && filePath.isNotEmpty) {
          final file = await http.MultipartFile.fromPath(fileKey, filePath);
          request.files.add(file);
        }

        final streamedResponse = await request.send();
        final response = await http.Response.fromStream(streamedResponse);

        debugPrint(
          'POST Multipart Response [$endpoint]: ${response.statusCode}',
        );
        if (response.statusCode >= 400) {
          debugPrint('Error Response Body: ${response.body}');
        }

        return response;
      } else {
        // Queueing multipart is complex because of file content stringification.
        // For simplicity, let's just queue with the physical path if available.
        debugPrint('Offline: Queuing multipart request for $endpoint');
        await OfflineService.queueRequest(
          endpoint: endpoint,
          method: 'POST',
          body: {...fields, 'filePath': filePath}, // Heuristic body
          headers: await _getHeaders(),
        );
        return http.Response(
          jsonEncode({
            'success': true,
            'message': 'Saved offline. Will sync when online.',
            'offline': true,
          }),
          200,
        );
      }
    } catch (e) {
      debugPrint('POST Multipart Error [$endpoint]: $e');
      rethrow;
    }
  }

  Future<http.Response> put(String endpoint, Map<String, dynamic> body) async {
    try {
      if (await _isOnline()) {
        final headers = await _getHeaders();
        final url = '$baseUrl$endpoint';
        debugPrint('PUT Request: $url');

        var response = await http
            .put(Uri.parse(url), headers: headers, body: jsonEncode(body))
            .timeout(const Duration(seconds: 30));
        if (response.statusCode == 401 && await _refreshAccessToken()) {
          response = await http.put(Uri.parse(url), headers: await _getHeaders(), body: jsonEncode(body)).timeout(const Duration(seconds: 30));
        }

        debugPrint('PUT Response [$endpoint]: ${response.statusCode}');
        return response;
      } else {
        debugPrint('Offline: Queuing PUT request for $endpoint');
        await OfflineService.queueRequest(
          endpoint: endpoint,
          method: 'PUT',
          body: body,
          headers: await _getHeaders(),
        );
        return http.Response(
          jsonEncode({
            'success': true,
            'message': 'Saved offline. Will sync when online.',
            'offline': true,
          }),
          200,
        );
      }
    } catch (e) {
      debugPrint('PUT Error [$endpoint]: $e');
      if (e is SocketException || e is http.ClientException) {
        await OfflineService.queueRequest(
          endpoint: endpoint,
          method: 'PUT',
          body: body,
          headers: await _getHeaders(),
        );
        return http.Response(
          jsonEncode({
            'success': true,
            'message': 'Saved offline due to network error.',
            'offline': true,
          }),
          200,
        );
      }
      rethrow;
    }
  }

  Future<http.Response> delete(String endpoint) async {
    try {
      if (await _isOnline()) {
        final headers = await _getHeaders();
        final url = '$baseUrl$endpoint';
        debugPrint('DELETE Request: $url');

        var response = await http
            .delete(Uri.parse(url), headers: headers)
            .timeout(const Duration(seconds: 30));
        if (response.statusCode == 401 && await _refreshAccessToken()) {
          response = await http.delete(Uri.parse(url), headers: await _getHeaders()).timeout(const Duration(seconds: 30));
        }

        debugPrint('DELETE Response [$endpoint]: ${response.statusCode}');
        return response;
      } else {
        return http.Response(
          jsonEncode({
            'success': false,
            'message': 'Deletion requires an active internet connection.',
          }),
          503,
        );
      }
    } catch (e) {
      debugPrint('DELETE Error [$endpoint]: $e');
      rethrow;
    }
  }

  // Sync queued requests
  Future<void> syncPendingRequests() async {
    if (!await _isOnline()) return;

    final pending = OfflineService.getPendingRequests();
    debugPrint('Syncing ${pending.length} pending requests...');

    for (final request in pending) {
      try {
        final url = '$baseUrl${request['endpoint']}';
        final headers = Map<String, String>.from(request['headers']);
        final body = jsonEncode(request['body']);

        http.Response? response;
        if (request['method'] == 'POST') {
          response = await http.post(
            Uri.parse(url),
            headers: headers,
            body: body,
          );
        } else if (request['method'] == 'PUT') {
          response = await http.put(
            Uri.parse(url),
            headers: headers,
            body: body,
          );
        } else if (request['method'] == 'DELETE') {
          response = await http.delete(Uri.parse(url), headers: headers);
        }

        if (response != null &&
            (response.statusCode == 200 || response.statusCode == 201)) {
          debugPrint('Synced request: ${request['endpoint']}');
          await OfflineService.removeRequest(request['id']);
        } else {
          debugPrint(
            'Failed to sync request: ${request['endpoint']} - Status: ${response?.statusCode}',
          );
          // Keep in queue? Or move to "failed" queue? For now, keep.
        }
      } catch (e) {
        debugPrint('Error syncing request: $e');
      }
    }
  }

  // Helper method to save token
  Future<void> saveToken(String token) async {
    await _storage.write(key: 'token', value: token);
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: 'refresh_token', value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: 'refresh_token');
  }

  // Helper method to get token
  Future<String?> getToken() async {
    return await _storage.read(key: 'token');
  }

  // Helper method to clear token
  Future<void> clearToken() async {
    await _storage.delete(key: 'token');
    await _storage.delete(key: 'refresh_token');
  }
}
