import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/teacher_provider.dart';
import '../utils/app_colors.dart';
import '../widgets/app_card.dart';
import '../widgets/app_loader.dart';
import '../widgets/empty_state.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class AttendanceScreen extends StatefulWidget {
  final String? classId;
  const AttendanceScreen({super.key, this.classId});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  String? _selectedClassId;
  final Map<String, String> _attendanceStatus = {};

  @override
  void initState() {
    super.initState();
    if (widget.classId != null) {
      _selectedClassId = widget.classId;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final teacher = Provider.of<TeacherProvider>(context, listen: false);
      teacher.fetchMyClasses();
      if (_selectedClassId != null) {
        teacher.fetchClassStudents(_selectedClassId!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'Mark Attendance',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        backgroundColor: const Color(0xFF405BB2),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedClassId,
                  hint: Text(
                    'Select a class',
                    style: TextStyle(color: AppColors.mutedText(context)),
                  ),
                  isExpanded: true,
                  dropdownColor: isDark
                      ? AppColors.darkSurface
                      : AppColors.white,
                  items: teacher.classes.map((c) {
                    return DropdownMenuItem<String>(
                      value: c['_id'].toString(),
                      child: Text('${c['name']} ${c['section']}'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedClassId = val;
                      _attendanceStatus.clear();
                    });
                    if (val != null) {
                      teacher.fetchClassStudents(val);
                      _fetchExistingAttendance(val);
                    }
                  },
                ),
              ),
            ),
          ),
          Expanded(
            child: _selectedClassId == null
                ? const EmptyState(
                    icon: Icons.class_outlined,
                    title: 'Select a class',
                    subtitle: 'Choose a class above to mark attendance.',
                  )
                : teacher.isLoading
                ? const AppLoader(message: 'Loading students…')
                : teacher.students.isEmpty
                ? const EmptyState(
                    icon: Icons.people_outline_rounded,
                    title: 'No students found',
                    subtitle: 'This class has no enrolled students yet.',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    itemCount: teacher.students.length,
                    itemBuilder: (context, index) {
                      final student = teacher.students[index];
                      final studentId = student['_id'].toString();
                      return _buildStudentItem(student, studentId);
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar:
          _selectedClassId != null && teacher.students.isNotEmpty
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: FilledButton(
                    onPressed: teacher.isLoading ? null : _submitAttendance,
                    child: const Text(
                      'Submit Attendance',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildStudentItem(Map<String, dynamic> student, String studentId) {
    final status = _attendanceStatus[studentId] ?? 'present';

    return AppCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      elevated: false,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${student['firstName']} ${student['lastName']}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text(
                  'Roll: ${student['profile']?['rollNo'] ?? 'N/A'}',
                  style: TextStyle(
                    color: AppColors.mutedText(context),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          _StatusChip(
            label: 'P',
            selected: status == 'present',
            color: AppColors.success,
            onTap: () =>
                setState(() => _attendanceStatus[studentId] = 'present'),
          ),
          const SizedBox(width: 6),
          _StatusChip(
            label: 'A',
            selected: status == 'absent',
            color: AppColors.error,
            onTap: () =>
                setState(() => _attendanceStatus[studentId] = 'absent'),
          ),
          const SizedBox(width: 6),
          _StatusChip(
            label: 'L',
            selected: status == 'late',
            color: AppColors.warning,
            onTap: () => setState(() => _attendanceStatus[studentId] = 'late'),
          ),
        ],
      ),
    );
  }

  Future<void> _fetchExistingAttendance(String classId) async {
    final teacher = Provider.of<TeacherProvider>(context, listen: false);
    final today = DateTime.now().toIso8601String().split('T')[0];
    final existing = await teacher.fetchClassAttendance(classId, today);
    if (mounted && existing.isNotEmpty) {
      setState(() {
        for (final record in existing) {
          final sid = record['student'] is Map
              ? record['student']['_id'].toString()
              : record['student'].toString();
          _attendanceStatus[sid] = record['status'] ?? 'present';
        }
      });
    }
  }

  Future<void> _submitAttendance() async {
    final teacher = Provider.of<TeacherProvider>(context, listen: false);
    final records = teacher.students.map((s) {
      final id = s['_id'].toString();
      return {'studentId': id, 'status': _attendanceStatus[id] ?? 'present'};
    }).toList();

    final success = await teacher.markAttendanceBatch(
      _selectedClassId!,
      records,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'Attendance submitted successfully' : 'Failed to submit',
        ),
        backgroundColor: success ? AppColors.success : AppColors.error,
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _StatusChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadii.sm),
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? color : AppColors.softFill(context, color),
          borderRadius: BorderRadius.circular(AppRadii.sm),
          border: Border.all(
            color: selected ? color : color.withValues(alpha: 0.25),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : color,
            fontWeight: FontWeight.w800,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
