import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import '../attendance_screen.dart';
import '../students/student_profile_screen.dart';

class ClassDetailScreen extends StatefulWidget {
  final String classId;
  final String className;
  final String section;

  const ClassDetailScreen({
    super.key,
    required this.classId,
    required this.className,
    required this.section,
  });

  @override
  State<ClassDetailScreen> createState() => _ClassDetailScreenState();
}

class _ClassDetailScreenState extends State<ClassDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _sortBy = 'name';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() {}); // Refresh actions
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<TeacherProvider>(context, listen: false);
      provider.fetchClassStudents(widget.classId);
      provider.fetchClassAnalytics(widget.classId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          '${widget.className} - ${widget.section}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black,
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF6366F1),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF6366F1),
          isScrollable: false,
          tabs: const [
            Tab(text: 'Students'),
            Tab(text: 'Performance'),
            Tab(text: 'Timetable'),
          ],
        ),
        actions: [
          if (_tabController.index == 0)
            PopupMenuButton<String>(
              icon: const Icon(Icons.sort),
              onSelected: (value) {
                setState(() {
                  _sortBy = value;
                });
                final provider = Provider.of<TeacherProvider>(
                  context,
                  listen: false,
                );
                provider.fetchClassStudents(widget.classId, sortBy: _sortBy);
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'name', child: Text('Sort by Name')),
                const PopupMenuItem(
                  value: 'rollNo',
                  child: Text('Sort by Roll No'),
                ),
              ],
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => AttendanceScreen(classId: widget.classId),
            ),
          );
        },
        backgroundColor: const Color(0xFF6366F1),
        icon: const Icon(Icons.check_circle_outline),
        label: const Text('Mark Attendance'),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildStudentsList(),
          _buildPerformanceTab(),
          _buildTimetablePlaceholder(),
        ],
      ),
    );
  }

  Widget _buildPerformanceTab() {
    final teacher = Provider.of<TeacherProvider>(context);

    if (teacher.isLoading && teacher.classAnalytics == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final analytics = teacher.classAnalytics;
    if (analytics == null) {
      return Center(
        child: ElevatedButton(
          onPressed: () => teacher.fetchClassAnalytics(widget.classId),
          child: const Text('Load Analytics'),
        ),
      );
    }

    final marks = analytics['marksBySubject'] as List? ?? [];
    final attendance = analytics['attendanceTrends'] as List? ?? [];

    return RefreshIndicator(
      onRefresh: () => teacher.fetchClassAnalytics(widget.classId),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            const Text(
              'Subject Averages',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ...marks.map(
              (m) => Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          m['subjectName'],
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${(m['avgScore'] as num).toStringAsFixed(1)}%',
                          style: const TextStyle(
                            color: Color(0xFF6366F1),
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value: (m['avgScore'] as num).toDouble() / 100,
                      backgroundColor: Colors.grey[200],
                      color: const Color(0xFF6366F1),
                      minHeight: 8,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Recent Attendance',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Container(
              height: 200,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.grey[100]!),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: attendance.map((at) {
                  final perc = (at['presentCount'] / at['totalCount'])
                      .toDouble();
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        width: 30,
                        height: (120 * perc).toDouble(),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withOpacity(0.8),
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        at['_id'].toString().substring(5),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentsList() {
    final teacherProvider = Provider.of<TeacherProvider>(context);

    if (teacherProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (teacherProvider.students.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No students found in this class',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: teacherProvider.students.length,
      itemBuilder: (context, index) {
        final student = teacherProvider.students[index];
        return Card(
          elevation: 1,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: const Color(0xFF6366F1).withOpacity(0.1),
              child: Text(
                '${student['firstName']?[0] ?? ''}${student['lastName']?[0] ?? ''}',
                style: const TextStyle(
                  color: Color(0xFF6366F1),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            title: Text(
              '${student['firstName']} ${student['lastName']}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text('Roll No: ${student['rollNumber'] ?? 'N/A'}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () {
                    _showDeleteConfirmation(student);
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.info_outline),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StudentProfileScreen(
                          studentId: student['_id'] ?? student['id'],
                          studentName:
                              '${student['firstName']} ${student['lastName']}',
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTimetablePlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No timetable available for this class',
            style: TextStyle(color: Colors.grey[600], fontSize: 16),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(dynamic student) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Student'),
        content: Text(
          'Are you sure you want to delete ${student['firstName']} ${student['lastName']}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final provider = Provider.of<TeacherProvider>(
                context,
                listen: false,
              );
              final success = await provider.deleteStudent(
                student['_id'] ?? student['id'],
              );
              if (success) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Student deleted successfully'),
                    ),
                  );
                }
              } else {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        provider.errorMessage ?? 'Failed to delete student',
                      ),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
