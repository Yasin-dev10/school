import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import '../../utils/app_colors.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/empty_state.dart';
import 'create_assignment_screen.dart';
import 'assignment_detail_screen.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class AssignmentListScreen extends StatefulWidget {
  const AssignmentListScreen({super.key});

  @override
  State<AssignmentListScreen> createState() => _AssignmentListScreenState();
}

class _AssignmentListScreenState extends State<AssignmentListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(context, listen: false).fetchAssignments();
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text('Assignments'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const CreateAssignmentScreen(),
            ),
          );
        },
        icon: const Icon(Icons.add_rounded),
        label: const Text('New'),
      ),
      body: teacher.isLoading && teacher.assignments.isEmpty
          ? const AppLoader(message: 'Loading assignments…')
          : teacher.assignments.isEmpty
          ? EmptyState(
              icon: Icons.assignment_outlined,
              title: 'No assignments yet',
              subtitle: 'Create homework for your classes to get started.',
              actionLabel: 'Create assignment',
              onAction: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const CreateAssignmentScreen(),
                  ),
                );
              },
            )
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () =>
                  Provider.of<TeacherProvider>(context, listen: false)
                      .fetchAssignments(),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 88),
                itemCount: teacher.assignments.length,
                itemBuilder: (context, index) {
                  final assignment = teacher.assignments[index];
                  return AppCard(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              AssignmentDetailScreen(assignment: assignment),
                        ),
                      );
                    },
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
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.softFill(
                                  context,
                                  AppColors.primary,
                                ),
                                borderRadius:
                                    BorderRadius.circular(AppRadii.full),
                              ),
                              child: Text(
                                assignment['class']?['name'] ??
                                    assignment['className'] ??
                                    'Class',
                                style: TextStyle(
                                  color:
                                      Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
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
                        if (assignment['dueDate'] != null) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Icon(
                                Icons.event_rounded,
                                size: 14,
                                color: AppColors.mutedText(context),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Due ${assignment['dueDate'].toString().split('T')[0]}',
                                style: TextStyle(
                                  color: AppColors.mutedText(context),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }
}
