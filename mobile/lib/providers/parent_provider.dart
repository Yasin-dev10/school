import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ParentProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<dynamic> _children = [];
  bool _isLoading = false;

  List<dynamic> get children => _children;
  bool get isLoading => _isLoading;

  Future<void> fetchMyChildren() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get('/parent/children');
      final data = jsonDecode(response.body);
      if (data['success']) {
        _children = data['data'];
      }
    } catch (e) {
      print('Error fetching children: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> fetchChildAttendance(String studentId) async {
    try {
      final response = await _apiService.get(
        '/parent/child/$studentId/attendance',
      );
      final data = jsonDecode(response.body);
      return data['data'] ?? {};
    } catch (e) {
      print('Error fetching child attendance: $e');
      return {};
    }
  }

  Future<List<dynamic>> fetchChildMarks(String studentId) async {
    try {
      final response = await _apiService.get('/parent/child/$studentId/marks');
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    } catch (e) {
      print('Error fetching child marks: $e');
      return [];
    }
  }

  Future<List<dynamic>> fetchChildTimetable(String studentId) async {
    try {
      final response = await _apiService.get(
        '/parent/child/$studentId/timetable',
      );
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    } catch (e) {
      print('Error fetching child timetable: $e');
      return [];
    }
  }

  void clear() {
    _children = [];
    _isLoading = false;
    notifyListeners();
  }
}