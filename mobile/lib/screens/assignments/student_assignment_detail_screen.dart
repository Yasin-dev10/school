import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/student_provider.dart';

class StudentAssignmentDetailScreen extends StatefulWidget {
  final Map<String, dynamic> assignment;

  const StudentAssignmentDetailScreen({super.key, required this.assignment});

  @override
  State<StudentAssignmentDetailScreen> createState() =>
      _StudentAssignmentDetailScreenState();
}

class _StudentAssignmentDetailScreenState
    extends State<StudentAssignmentDetailScreen> {
  final _contentController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final student = Provider.of<StudentProvider>(context, listen: false);
      final success = await student.submitAssignment(
        widget.assignment['_id'],
        _contentController.text,
        null, // File path placeholder (implement file picker later)
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Assignment submitted successfully!')),
        );
        Navigator.pop(context);
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              student.errorMessage ?? 'Failed to submit assignment',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final assignment = widget.assignment;
    final isSubmitted =
        assignment['submitted'] == true; // Backend should set this

    return Scaffold(
      appBar: AppBar(
        title: Text(
          assignment['title'] ?? 'Assignment',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      body: SingleChildScrollView(
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
                if (isSubmitted)
                  Chip(
                    label: const Text(
                      'Submitted',
                      style: TextStyle(color: Colors.white),
                    ),
                    backgroundColor: Colors.green.withOpacity(0.8),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              assignment['description'] ?? 'No description',
              style: const TextStyle(color: Colors.white70, fontSize: 16),
            ),
            const SizedBox(height: 32),
            const Text(
              'Your Submission',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (isSubmitted)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: const Text(
                  'You have already submitted this assignment.',
                ),
              )
            else
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _contentController,
                      maxLines: 8,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Type your answer here...',
                        hintStyle: TextStyle(color: Colors.grey[600]),
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF6366F1),
                          ),
                        ),
                      ),
                      validator: (v) =>
                          v!.isEmpty ? 'Please enter your answer' : null,
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: Consumer<StudentProvider>(
                        builder: (context, student, _) {
                          return ElevatedButton(
                            onPressed: student.isLoading ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: student.isLoading
                                ? const CircularProgressIndicator(
                                    color: Colors.white,
                                  )
                                : const Text(
                                    'Submit Assignment',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
