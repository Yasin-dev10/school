import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';

class AssignmentDetailScreen extends StatefulWidget {
  final Map<String, dynamic> assignment;

  const AssignmentDetailScreen({super.key, required this.assignment});

  @override
  State<AssignmentDetailScreen> createState() => _AssignmentDetailScreenState();
}

class _AssignmentDetailScreenState extends State<AssignmentDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(
        context,
        listen: false,
      ).fetchSubmissions(widget.assignment['_id']);
    });
  }

  void _showGradeDialog(Map<String, dynamic> submission) {
    final gradeController = TextEditingController(
      text: submission['grade'] ?? '',
    );
    final feedbackController = TextEditingController(
      text: submission['feedback'] ?? '',
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          'Grade Submission',
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: gradeController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Grade',
                labelStyle: TextStyle(color: Colors.grey),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.grey),
                ),
              ),
            ),
            TextField(
              controller: feedbackController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Feedback',
                labelStyle: TextStyle(color: Colors.grey),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.grey),
                ),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.pop(context),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1),
            ),
            child: const Text('Submit', style: TextStyle(color: Colors.white)),
            onPressed: () async {
              final teacher = Provider.of<TeacherProvider>(
                context,
                listen: false,
              );
              final success = await teacher.gradeSubmission(
                submission['_id'],
                gradeController.text,
                feedbackController.text,
              );
              if (success && mounted) {
                Navigator.pop(context);
                teacher.fetchSubmissions(widget.assignment['_id']); // Refresh
              }
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);
    final assignment = widget.assignment;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          assignment['title'] ?? 'Assignment Details',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Due: ${assignment['dueDate']?.toString().split('T')[0] ?? 'N/A'}',
                      style: const TextStyle(
                        color: Color(0xFF6366F1),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        assignment['class']?['name'] ?? 'Class',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  assignment['description'] ?? 'No description',
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Student Submissions',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Expanded(
            child: teacher.isLoading && teacher.submissions.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : teacher.submissions.isEmpty
                ? Center(
                    child: Text(
                      'No submissions yet',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: teacher.submissions.length,
                    itemBuilder: (context, index) {
                      final submission = teacher.submissions[index];
                      final student = submission['student'] ?? {};
                      final isGraded = submission['status'] == 'graded';

                      return Card(
                        color: const Color(0xFF1E293B),
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          title: Text(
                            '${student['firstName']} ${student['lastName']}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                'Submitted: ${submission['submittedAt'].toString().split('T')[0]}',
                                style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 12,
                                ),
                              ),
                              if (submission['content'] != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  submission['content'],
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.white70),
                                ),
                              ],
                              if (isGraded) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.green.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Grade: ${submission['grade']}',
                                    style: const TextStyle(
                                      color: Colors.green,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          trailing: isGraded
                              ? const Icon(
                                  Icons.check_circle,
                                  color: Colors.green,
                                )
                              : ElevatedButton(
                                  onPressed: () => _showGradeDialog(submission),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF6366F1),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                    ),
                                  ),
                                  child: const Text(
                                    'Grade',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                ),
                          onTap: () => _showGradeDialog(submission),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
