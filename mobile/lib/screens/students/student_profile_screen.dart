import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';

class StudentProfileScreen extends StatefulWidget {
  final String studentId;
  final String studentName;

  const StudentProfileScreen({
    super.key,
    required this.studentId,
    required this.studentName,
  });

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch individual student analytics or details if needed
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.red),
            onPressed: () => _showDeleteConfirmation(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            CircleAvatar(
              radius: 50,
              backgroundColor: Theme.of(
                context,
              ).colorScheme.primaryContainer.withValues(alpha: 0.2),
              child: Text(
                widget.studentName[0],
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              widget.studentName,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            _buildInfoCard(Icons.email_outlined, 'Email', 'student@school.com'),
            _buildInfoCard(
              Icons.phone_outlined,
              'Parent Contact',
              '+1 234 567 890',
            ),
            _buildInfoCard(
              Icons.cake_outlined,
              'Date of Birth',
              'Jan 15, 2010',
            ),
            _buildInfoCard(
              Icons.home_outlined,
              'Address',
              '123 School Lane, City',
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 24),
            Row(
              children: [
                Icon(
                  Icons.assessment_outlined,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Academic Summary',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildStat('Attendance', '94%'),
                const SizedBox(width: 16),
                _buildStat('GPA', '3.8'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Icon(
            icon,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            size: 20,
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
              Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Student'),
        content: Text(
          'Are you sure you want to delete ${widget.studentName}? This action cannot be undone.',
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
              final success = await provider.deleteStudent(widget.studentId);
              if (success) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Student deleted successfully'),
                    ),
                  );
                  Navigator.pop(context); // Go back after deletion
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
