import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import 'student_profile_screen.dart';

class AllStudentsScreen extends StatefulWidget {
  const AllStudentsScreen({super.key});

  @override
  State<AllStudentsScreen> createState() => _AllStudentsScreenState();
}

class _AllStudentsScreenState extends State<AllStudentsScreen> {
  String _sortBy = 'name';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(
        context,
        listen: false,
      ).fetchAllStudents(sortBy: _sortBy);
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacherProvider = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'All Students',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            onSelected: (value) {
              setState(() {
                _sortBy = value;
              });
              teacherProvider.fetchAllStudents(sortBy: _sortBy);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'name', child: Text('Sort by Name')),
              const PopupMenuItem(value: 'class', child: Text('Sort by Class')),
            ],
          ),
        ],
      ),
      body: teacherProvider.isLoading && teacherProvider.students.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () =>
                  teacherProvider.fetchAllStudents(sortBy: _sortBy),
              child: teacherProvider.students.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.people_outline,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No students found',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
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
                              backgroundColor: const Color(
                                0xFF6366F1,
                              ).withOpacity(0.1),
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
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            subtitle: Text(
                              'Class: ${student['profile']?['class'] ?? 'N/A'} - Roll: ${student['profile']?['rollNo'] ?? 'N/A'}',
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    color: Colors.red,
                                  ),
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
                                          studentId:
                                              student['_id'] ?? student['id'],
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
                    ),
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
