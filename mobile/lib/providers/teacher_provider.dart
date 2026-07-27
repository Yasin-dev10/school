import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class TeacherProvider with ChangeNotifier {
  final _apiService = ApiService();
  final _socketService = SocketService();

  void initializeListeners() {
    _socketService.on('notification-received', (data) {
      debugPrint('Live notification received by teacher: $data');
      _notifications.insert(0, data);
      notifyListeners();
    });

    _socketService.on('student:created', (_) {
      debugPrint('Student created event received');
      fetchDashboardData();
      fetchAllStudents();
    });

    _socketService.on('student:deleted', (_) {
      debugPrint('Student deleted event received');
      fetchDashboardData();
      fetchAllStudents();
    });

    _socketService.on('exam:created', (_) {
      debugPrint('Exam created event received');
      fetchDashboardData(); // Refreshes stats like upcoming exams
      fetchExams();
    });
  }

  Map<String, dynamic>? _stats;
  List<dynamic> _schedule = [];
  List<dynamic> _fullTimetable = [];
  List<dynamic> _notifications = [];
  List<dynamic> _classes = [];
  List<dynamic> _students = [];
  List<dynamic> _payslips = [];
  List<dynamic> _certificates = [];
  bool _isLoading = false;
  String? _errorMessage;

  Map<String, dynamic>? get stats => _stats;
  List<dynamic> get schedule => _schedule;
  List<dynamic> get fullTimetable => _fullTimetable;
  List<dynamic> get notifications => _notifications;
  List<dynamic> get classes => _classes;
  List<dynamic> get students => _students;
  List<dynamic> get payslips => _payslips;
  List<dynamic> get certificates => _certificates;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchDashboardData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Fetch all data in parallel
      final responses = await Future.wait([
        _apiService.get('/students'), // For student count
        _apiService.get('/timetable/teacher/me'), // For teacher's timetable
        _apiService.get('/notifications'), // For notifications
        _apiService.get('/classes'), // For class count
      ]);

      // Parse students data
      if (responses[0].statusCode == 200) {
        final studentsData = jsonDecode(responses[0].body);
        final studentsList =
            studentsData['data'] ?? studentsData['students'] ?? [];
        final totalStudents = studentsList is List
            ? studentsList.length
            : (studentsData['count'] ?? 0);

        // Parse timetable data
        List<dynamic> timetableSlots = [];
        if (responses[1].statusCode == 200) {
          final timetableData = jsonDecode(responses[1].body);
          timetableSlots =
              timetableData['data'] ?? timetableData['slots'] ?? [];
        }

        // Parse notifications data
        if (responses[2].statusCode == 200) {
          final notificationsData = jsonDecode(responses[2].body);
          _notifications =
              notificationsData['data'] ??
              notificationsData['notifications'] ??
              [];
        }

        // Parse classes data
        int activeClassesCount = 0;
        if (responses[3].statusCode == 200) {
          final classesData = jsonDecode(responses[3].body);
          _classes = classesData['data'] ?? classesData['classes'] ?? [];
          activeClassesCount = _classes.length;
        }

        _fullTimetable = timetableSlots;

        // Filter today's schedule
        final now = DateTime.now();

        _schedule = timetableSlots.where((slot) {
          if (slot['day'] != null) {
            // Check if the day matches today's weekday
            final dayName = _getDayName(now.weekday);
            return slot['day'].toString().toLowerCase() ==
                dayName.toLowerCase();
          }
          return true; // Include if no day specified
        }).toList();

        // Calculate weekly hours (assuming each slot is 1 hour, adjust as needed)
        final weeklyHours = timetableSlots.length;

        _stats = {
          'totalStudents': totalStudents,
          'weeklyHours': weeklyHours,
          'activeClasses': activeClassesCount,
          'totalSlots': _schedule.length,
        };

        debugPrint('Dashboard data loaded successfully');
        debugPrint('Stats: $_stats');
        debugPrint('Today\'s schedule: ${_schedule.length} slots');
        debugPrint('Notifications: ${_notifications.length}');
      } else {
        _errorMessage = 'Failed to load dashboard data';
        debugPrint('Error: ${responses[0].statusCode}');
      }
    } catch (e) {
      _errorMessage = 'Error fetching dashboard data: $e';
      debugPrint(_errorMessage!);
    }

    _isLoading = false;
    notifyListeners();
  }

  String _getDayName(int weekday) {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days[weekday - 1];
  }

  Future<void> fetchMyClasses() async {
    _errorMessage = null;
    try {
      final response = await _apiService.get('/classes');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _classes = data['data'] ?? data['classes'] ?? [];
        debugPrint('Loaded ${_classes.length} classes');
        notifyListeners();
      } else {
        _errorMessage = 'Failed to load classes';
        debugPrint('Error loading classes: ${response.statusCode}');
      }
    } catch (e) {
      _errorMessage = 'Error fetching classes: $e';
      debugPrint(_errorMessage!);
    }
  }

  List<dynamic> _subjects = [];
  List<dynamic> get subjects => _subjects;

  Future<void> fetchSubjects() async {
    _errorMessage = null;
    try {
      // Teachers usually need to select from all subjects or subjects they teach.
      // For now, we fetch all subjects available in the tenant.
      final response = await _apiService.get('/subjects');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _subjects = data['data'] ?? data['subjects'] ?? [];
        debugPrint('Loaded ${_subjects.length} subjects');
        notifyListeners();
      } else {
        _errorMessage = 'Failed to load subjects';
        debugPrint('Error loading subjects: ${response.statusCode}');
      }
    } catch (e) {
      _errorMessage = 'Error fetching subjects: $e';
      debugPrint(_errorMessage!);
    }
  }

  Future<List<dynamic>> fetchClassAttendance(
    String classId,
    String date,
  ) async {
    try {
      final response = await _apiService.get(
        '/attendance/class/$classId?date=$date',
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching attendance: $e');
      return [];
    }
  }

  Future<void> fetchClassStudents(String classId, {String? sortBy}) async {
    _isLoading = true;
    _students = [];
    _errorMessage = null;
    notifyListeners();

    try {
      // Try to get students by class
      String url = '/students?class=$classId';
      if (sortBy != null) {
        url += '&sortBy=$sortBy';
      }
      final response = await _apiService.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final allStudents = data['data'] ?? data['students'] ?? [];

        // With the updated backend, the API already filters by classId
        if (allStudents is List) {
          _students = allStudents;
        }

        debugPrint('Loaded ${_students.length} students for class $classId');
      } else {
        _errorMessage = 'Failed to load students';
        debugPrint('Error loading students: ${response.statusCode}');
      }
    } catch (e) {
      _errorMessage = 'Error fetching students: $e';
      debugPrint(_errorMessage!);
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> markAttendanceBatch(
    String classId,
    List<Map<String, dynamic>> attendanceData,
  ) async {
    try {
      final response = await _apiService.post('/attendance/mark', {
        'classId': classId,
        'records': attendanceData,
        'date': DateTime.now().toUtc().toIso8601String().split('T')[0],
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('Attendance marked successfully');
        return true;
      } else {
        final error = jsonDecode(response.body);
        _errorMessage = error['message'] ?? 'Failed to mark attendance';
        debugPrint('Attendance error: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Error marking attendance: $e';
      debugPrint(_errorMessage!);
      return false;
    }
  }

  Future<bool> addStudent(Map<String, dynamic> studentData) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.post('/students', studentData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('Student added successfully');
        // Refresh dashboard to update counts
        fetchDashboardData();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final error = jsonDecode(response.body);
        _errorMessage = error['message'] ?? 'Failed to add student';
        debugPrint('Add student error: $_errorMessage');
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Error adding student: $e';
      debugPrint(_errorMessage!);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteStudent(String studentId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.delete('/students/$studentId');
      if (response.statusCode == 200) {
        debugPrint('Student deleted successfully');
        _students.removeWhere((s) => (s['_id'] ?? s['id']) == studentId);
        fetchDashboardData();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final error = jsonDecode(response.body);
        _errorMessage = error['message'] ?? 'Failed to delete student';
        debugPrint('Delete student error: $_errorMessage');
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Error deleting student: $e';
      debugPrint(_errorMessage!);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ... existing methods

  List<dynamic> _assignments = [];
  List<dynamic> get assignments => _assignments;

  Future<void> fetchAssignments() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.get(
        '/assignments',
      ); // Adjust endpoint as needed
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

  Future<bool> createAssignment(Map<String, dynamic> assignmentData) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.post('/assignments', assignmentData);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        if (body['offline'] == true) {
          debugPrint('Assignment creation queued offline');
        } else {
          debugPrint('Assignment created successfully');
        }
        await fetchAssignments(); // Refresh list (will fetch from cache if offline)
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Failed to create assignment';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Error creating assignment: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  List<dynamic> _submissions = [];
  List<dynamic> get submissions => _submissions;

  Future<void> fetchSubmissions(String assignmentId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.get(
        '/assignments/$assignmentId/submissions',
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _submissions = data['data'] ?? [];
        debugPrint('Loaded ${_submissions.length} submissions');
      } else {
        _errorMessage = 'Failed to load submissions';
      }
    } catch (e) {
      _errorMessage = 'Error fetching submissions: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> gradeSubmission(
    String submissionId,
    String grade,
    String feedback,
  ) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.post(
        '/assignments/submissions/$submissionId/grade',
        {'grade': grade, 'feedback': feedback},
      );

      if (response.statusCode == 200) {
        debugPrint('Graded successfully');
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Failed to grade submission';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Error grading submission: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Examination & Grading
  List<dynamic> _exams = [];
  List<dynamic> get exams => _exams;

  Future<void> fetchExams() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.get('/exams');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _exams = data['data'] ?? [];
        debugPrint('Loaded ${_exams.length} exams');
      } else {
        _errorMessage = 'Failed to load exams';
      }
    } catch (e) {
      _errorMessage = 'Error fetching exams: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createExam(Map<String, dynamic> examData) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.post('/exams', examData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchExams();
        return true;
      }
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<dynamic>> fetchExamMarks(
    String examId,
    String subjectId,
    String classId,
  ) async {
    try {
      final response = await _apiService.get(
        '/exams/marks?examId=$examId&subjectId=$subjectId&classId=$classId',
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching marks: $e');
      return [];
    }
  }

  Future<bool> saveMarks(
    String examId,
    String subjectId,
    String classId,
    List<Map<String, dynamic>> marks, {
    int maxMarks = 100,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.post('/exams/marks/bulk', {
        'examId': examId,
        'subjectId': subjectId,
        'classId': classId,
        'marks': marks,
        'maxMarks': maxMarks,
      });
      return response.statusCode == 200;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Learning Materials (LMS)
  List<dynamic> _materials = [];
  List<dynamic> get materials => _materials;

  Future<void> fetchMaterials() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.get('/materials');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _materials = data['data'] ?? [];
        debugPrint('Loaded ${_materials.length} materials');
      } else {
        _errorMessage = 'Failed to load materials';
      }
    } catch (e) {
      _errorMessage = 'Error fetching materials: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createMaterial(Map<String, dynamic> materialData) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.post('/materials', materialData);
      if (response.statusCode == 201 || response.statusCode == 200) {
        await fetchMaterials();
        return true;
      }
      _errorMessage = 'Failed to upload material';
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteMaterial(String id) async {
    try {
      final response = await _apiService.delete('/materials/$id');
      if (response.statusCode == 200) {
        _materials.removeWhere((m) => m['_id'] == id);
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    }
  }

  // Analytics
  Map<String, dynamic>? _classAnalytics;
  Map<String, dynamic>? get classAnalytics => _classAnalytics;

  Future<void> fetchClassAnalytics(String classId) async {
    _isLoading = true;
    _classAnalytics = null;
    notifyListeners();

    try {
      final response = await _apiService.get('/analytics/class/$classId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _classAnalytics = data['data'];
        debugPrint('Loaded analytics for class $classId');
      } else {
        _errorMessage = 'Failed to load analytics';
      }
    } catch (e) {
      _errorMessage = 'Error fetching analytics: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchMyPayslips() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.get('/salaries/me');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _payslips = data['data'] ?? [];
        debugPrint('Loaded ${_payslips.length} payslips');
      } else {
        _errorMessage = 'Failed to load payslips';
      }
    } catch (e) {
      _errorMessage = 'Error fetching payslips: $e';
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchAllStudents({String? sortBy}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      String url = '/students';
      if (sortBy != null) {
        url += '?sortBy=$sortBy';
      }
      final response = await _apiService.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _students = data['data'] ?? data['students'] ?? [];
        debugPrint('Loaded ${_students.length} total students');
      } else {
        _errorMessage = 'Failed to load all students';
      }
    } catch (e) {
      _errorMessage = 'Error fetching students: $e';
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchCertificates() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.get('/certificates');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _certificates =
            data['data']['certificates'] ?? data['data']['results'] ?? [];
        debugPrint('Loaded ${_certificates.length} certificates');
      } else {
        _errorMessage = 'Failed to load certificates';
      }
    } catch (e) {
      _errorMessage = 'Error fetching certificates: $e';
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> issueCertificate(Map<String, dynamic> certData) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.post('/certificates', certData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchCertificates();
        return true;
      }
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clear() {
    _stats = null;
    _schedule = [];
    _fullTimetable = [];
    _notifications = [];
    _classes = [];
    _students = [];
    _payslips = [];
    _certificates = [];
    _subjects = [];
    _assignments = [];
    _submissions = [];
    _exams = [];
    _materials = [];
    _classAnalytics = null;
    _errorMessage = null;
    notifyListeners();
  }
}
