import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/student_provider.dart';
import '../../utils/app_colors.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/empty_state.dart';
import 'student_assignment_detail_screen.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class StudentAssignmentListScreen extends StatefulWidget {
  const StudentAssignmentListScreen({super.key});

  @override
  State<StudentAssignmentListScreen> createState() =>
      _StudentAssignmentListScreenState();
}

class _StudentAssignmentListScreenState
    extends State<StudentAssignmentListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<StudentProvider>(context, listen: false).fetchAssignments();
    });
  }

  @override
  Widget build(BuildContext context) {
    final student = Provider.of<StudentProvider>(context);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text('My Assignments'),
      ),
      body: student.isLoading && student.assignments.isEmpty
          ? const AppLoader(message: 'Loading assignments…')
          : student.assignments.isEmpty
          ? const EmptyState(
              icon: Icons.assignment_outlined,
              title: 'No assignments due',
              subtitle: 'You are all caught up for now.',
            )
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () =>
                  Provider.of<StudentProvider>(context, listen: false)
                      .fetchAssignments(),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                itemCount: student.assignments.length,
                itemBuilder: (context, index) {
                  final assignment = student.assignments[index];
                  return _buildAssignmentCard(assignment);
                },
              ),
            ),
    );
  }

  Widget _buildAssignmentCard(dynamic assignment) {
    final isSubmitted = assignment['submitted'] == true;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  assignment['title'] ?? 'Untitled',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (isSubmitted)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.softFill(context, AppColors.success),
                    borderRadius: BorderRadius.circular(AppRadii.full),
                  ),
                  child: const Text(
                    'Submitted',
                    style: TextStyle(
                      color: AppColors.success,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            assignment['description'] ?? 'No description',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: AppColors.mutedText(context),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(
                Icons.calendar_today_rounded,
                size: 14,
                color: AppColors.mutedText(context),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Due: ${assignment['dueDate']?.toString().split('T')[0] ?? 'N/A'}',
                  style: TextStyle(
                    color: AppColors.mutedText(context),
                    fontSize: 13,
                  ),
                ),
              ),
              OutlinedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => StudentAssignmentDetailScreen(
                        assignment: assignment,
                      ),
                    ),
                  );
                },
                child: const Text('View'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
