import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'api_service.dart';

class ConnectivityService with ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  final ApiService _apiService = ApiService();
  bool _isOnline = true;
  bool _wasOffline = false;

  bool get isOnline => _isOnline;

  ConnectivityService() {
    _initConnectivity();
    _connectivity.onConnectivityChanged.listen(_updateConnectionStatus);
  }

  Future<void> _initConnectivity() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _updateConnectionStatus(result);
    } catch (e) {
      debugPrint('Connectivity check error: $e');
    }
  }

  void _updateConnectionStatus(List<ConnectivityResult> results) {
    // connectivity_plus now returns a List<ConnectivityResult>
    final result = results.isEmpty ? ConnectivityResult.none : results.first;
    final isNowOnline = result != ConnectivityResult.none;
    if (_isOnline != isNowOnline) {
      if (!isNowOnline) {
        _wasOffline = true;
      }
      _isOnline = isNowOnline;
      notifyListeners();
      debugPrint(
        'Connection status changed: ${_isOnline ? "Online" : "Offline"}',
      );

      // When coming back online after being offline, flush queued writes
      // so mobile stays in sync with the same backend the web app uses.
      if (isNowOnline && _wasOffline) {
        _wasOffline = false;
        _apiService.syncPendingRequests();
      }
    }
  }
}
