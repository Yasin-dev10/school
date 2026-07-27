import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class StudentProvider with ChangeNotifier {
  final _apiService = ApiService();
  final _socketService = SocketService();

  void initializeListeners(String? classId) {
    _socketService.on('notification-received', (data) {
      debugPrint('Live notification received: $data');
      _notifications.insert(0, data);
      notifyListeners();
    });

    _socketService.on('attendance-updated', (data) {
      debugPrint('Live attendance update received: $data');
      // If the update is for the current student's class, refresh data
      if (data['classId'] == classId) {
        fetchDashboardData(classId);
      }
    });
  }

  Map<String, dynamic>? _attendanceStats;
  List<dynamic> _attendanceHistory = [];
  List<dynamic> _timetable = [];
  List<dynamic> _notifications = [];
  List<dynamic> _subjects = [];
  bool _isLoading = false;
  String? _errorMessage;

  Map<String, dynamic>? get attendanceStats => _attendanceStats;
  List<dynamic> get attendanceHistory => _attendanceHistory;
  List<dynamic> get timetable => _timetable;
  List<dynamic> get notifications => _notifications;
  List<dynamic> get subjects => _subjects;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchDashboardData(String? classId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final futures = <Future<dynamic>>[
        _apiService.get('/attendance/my'), // For attendance stats
        _apiService.get('/notifications'), // For notifications
      ];

      // Only fetch timetable if classId is available
      futures.add(_apiService.get('/timetable/student/me'));
      if (classId != null) {
        futures.add(_apiService.get('/classes/$classId'));
      }

      final responses = await Future.wait(futures);

      // Parse Attendance
      final attendanceRes = responses[0];
      if (attendanceRes.statusCode == 200) {
        final data = jsonDecode(attendanceRes.body);
        if (data['success'] == true && data['data'] != null) {
          _attendanceHistory = data['data']['records'] ?? [];
          _attendanceStats = data['data']['stats'];
        }
      }

      // Parse Notifications
      final notifRes = responses[1];
      if (notifRes.statusCode == 200) {
        final data = jsonDecode(notifRes.body);
        // Handle variations in notification response structure
        _notifications = data['data'] ?? data['notifications'] ?? [];
      }

      // Parse Timetable if fetched
      // Parse Timetable
      if (responses.length > 2) {
        final timetableRes = responses[2];
        if (timetableRes.statusCode == 200) {
          final data = jsonDecode(timetableRes.body);
          _timetable = data['data'] ?? data['timetable'] ?? [];
        }
      }

      // Parse Subjects from Class if fetched
      if (responses.length > 3) {
        final classRes = responses[3];
        if (classRes.statusCode == 200) {
          final data = jsonDecode(classRes.body);
          if (data['success'] == true && data['data'] != null) {
            final classData = data['data'];
            final List<dynamic> classSubjects = classData['subjects'] ?? [];
            _subjects = classSubjects
                .map((s) => s['subject'])
                .where((s) => s != null)
                .toList();
            debugPrint('Loaded ${_subjects.length} subjects for class');
          }
        }
      }
    } catch (e) {
      _errorMessage = 'Error fetching dashboard data: $e';
      debugPrint(_errorMessage);
    }

    _isLoading = false;
    notifyListeners();
  }

  // ... existing methods

  List<dynamic> _assignments = [];
  List<dynamic> get assignments => _assignments;

  Future<void> fetchAssignments() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Assuming backend filters for student
      final response = await _apiService.get('/assignments');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _assignments = data['data'] ?? data['assignments'] ?? [];
        debugPrint('Loaded ${_assignments.length} assignments');
      } else {
        _errorMessage = 'Failed to load assignments';
      }
    } catch (e) {
      _errorMessage = 'Error fetching assignments: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> submitAssignment(
    String assignmentId,
    String content,
    String? filePath,
  ) async {
    _isLoading = true;
    notifyListeners();

    try {
      final fields = {
        'content': content,
        'submittedAt': DateTime.now().toIso8601String(),
      };

      final response = await _apiService.postMultipart(
        '/assignments/$assignmentId/submit',
        fields,
        filePath,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('Assignment submitted successfully');
        await fetchAssignments();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Failed to submit assignment';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Error submitting assignment: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  List<dynamic> _exams = [];
  List<dynamic> _results = [];
  Map<String, dynamic>? _progressData;
  List<dynamic> _materials = [];
  List<dynamic> _certificates = [];
  List<dynamic> _fees = [];
  Map<String, dynamic>? _studentGrades;

  List<dynamic> get exams => _exams;
  List<dynamic> get results => _results;
  Map<String, dynamic>? get progressData => _progressData;
  List<dynamic> get materials => _materials;
  List<dynamic> get certificates => _certificates;
  List<dynamic> get fees => _fees;
  Map<String, dynamic>? get studentGrades => _studentGrades;

  Future<void> fetchFees(String? studentId) async {
    if (studentId == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get(
        '/fees/invoices?studentId=$studentId',
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _fees = data['data'] ?? [];
      }
    } catch (e) {
      debugPrint('Error fetching fees: $e');
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchStudentGrades([String? studentId]) async {
    _isLoading = true;
    notifyListeners();
    try {
      final url = studentId != null
          ? '/exams/student-grades/$studentId'
          : '/exams/student-grades';

      final response = await _apiService.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _studentGrades = data['data'];
      }
    } catch (e) {
      debugPrint('Error fetching student grades: $e');
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchExams() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get('/exams');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _exams = data['data'] ?? [];
      }
    } catch (e) {
      debugPrint('Error fetching exams: $e');
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchResults(String studentId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get(
        '/exams/marks?studentId=$studentId',
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _results = data['data'] ?? [];
      }
    } catch (e) {
      debugPrint('Error fetching results: $e');
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchProgressAnalytics(String studentId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get('/analytics/student/$studentId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _progressData = data['data'];
        debugPrint('Progress data loaded for $studentId');
      }
    } catch (e) {
      debugPrint('Error fetching progress analytics: $e');
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> submitComplaint(Map<String, dynamic> complaintData) async {
    try {
      final response = await _apiService.post(
        '/exams/complaints',
        complaintData,
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error submitting complaint: $e');
      return false;
    }
  }

  Future<void> fetchMaterials(String? classId) async {
    if (classId == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get('/materials?classId=$classId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _materials = data['data'] ?? [];
      }
    } catch (e) {
      debugPrint('Error fetching materials: $e');
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchCertificates() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get('/certificates/my');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _certificates = data['data']['certificates'] ?? [];
      }
    } catch (e) {
      debugPrint('Error fetching certificates: $e');
    }
    _isLoading = false;
    notifyListeners();
  }

  void clear() {
    _attendanceStats = null;
    _attendanceHistory = [];
    _timetable = [];
    _notifications = [];
    _subjects = [];
    _assignments = [];
    _exams = [];
    _results = [];
    _progressData = null;
    _materials = [];
    _certificates = [];
    _studentGrades = null;
    _fees = [];
    _errorMessage = null;
    notifyListeners();
  }
}