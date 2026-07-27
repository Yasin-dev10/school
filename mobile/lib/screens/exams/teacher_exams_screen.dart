import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import 'mark_entry_screen.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class TeacherExamsScreen extends StatefulWidget {
  const TeacherExamsScreen({super.key});

  @override
  State<TeacherExamsScreen> createState() => _TeacherExamsScreenState();
}

class _TeacherExamsScreenState extends State<TeacherExamsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeacherProvider>().fetchExams();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<TeacherProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'Exams & Grading',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF6366F1)),
            )
          : RefreshIndicator(
              onRefresh: () => provider.fetchExams(),
              child: ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: provider.exams.length,
                itemBuilder: (context, index) {
                  final exam = provider.exams[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      exam['name'],
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      exam['term'],
                                      style: TextStyle(
                                        color: const Color(
                                          0xFF6366F1,
                                        ).withOpacity(0.8),
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: (exam['isApproved'] ?? false)
                                      ? Colors.green.withOpacity(0.1)
                                      : Colors.orange.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  (exam['isApproved'] ?? false)
                                      ? 'APPROVED'
                                      : 'PENDING',
                                  style: TextStyle(
                                    color: (exam['isApproved'] ?? false)
                                        ? Colors.green
                                        : Colors.orange,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Icon(
                                Icons.calendar_today,
                                size: 14,
                                color: Colors.white.withOpacity(0.5),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${exam['startDate'].toString().split('T')[0]} - ${exam['endDate'].toString().split('T')[0]}',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.5),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      MarkEntryScreen(exam: exam),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              foregroundColor: Colors.white,
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Text(
                              'Enter Marks',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateExamDialog(context),
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  void _showCreateExamDialog(BuildContext context) {
    final nameController = TextEditingController();
    final termController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          'Create New Exam',
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Exam Name',
                labelStyle: TextStyle(color: Colors.white54),
              ),
            ),
            TextField(
              controller: termController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Term (e.g. Midterm)',
                labelStyle: TextStyle(color: Colors.white54),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isEmpty) return;
              final success = await context.read<TeacherProvider>().createExam({
                'name': nameController.text,
                'term': termController.text,
                'startDate': DateTime.now().toIso8601String(),
                'endDate': DateTime.now()
                    .add(const Duration(days: 7))
                    .toIso8601String(),
              });
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      success ? 'Exam created' : 'Failed to create',
                    ),
                  ),
                );
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}
