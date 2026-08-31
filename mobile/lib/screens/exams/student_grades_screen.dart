import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/student_provider.dart';
import '../../providers/auth_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class StudentGradesScreen extends StatefulWidget {
  const StudentGradesScreen({super.key});

  @override
  State<StudentGradesScreen> createState() => _StudentGradesScreenState();
}

class _StudentGradesScreenState extends State<StudentGradesScreen> {
  int _selectedTermIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = context.read<AuthProvider>().user;
      final studentId = user?['_id'] ?? user?['id'];
      if (studentId != null) {
        context.read<StudentProvider>().fetchStudentGrades(
          studentId.toString(),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<StudentProvider>(context);
    final gradesData = provider.studentGrades;
    final combinedResults = provider.combinedResults;
    final isLoading = provider.isLoading;

    if (isLoading && gradesData == null && provider.combinedResultsLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF3B82F6)),
        ),
      );
    }

    final terms = gradesData?['terms'] as List<dynamic>? ?? [];
    final cumulativeGpa = gradesData?['cumulativeGpa'] ?? '0.0';

    final currentTerm = terms.isNotEmpty && _selectedTermIndex < terms.length
        ? terms[_selectedTermIndex]
        : null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white),
            onPressed: () {
              final drawer = ZoomDrawer.of(context);
              if (drawer != null) {
                drawer.toggle();
              } else {
                Navigator.of(context).maybePop();
              }
            },
          ),
        ),
        title: Column(
          children: [
            const Text(
              'Grades',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (context.watch<AuthProvider>().user != null) ...[
              const SizedBox(height: 4),
              Text(
                '${context.watch<AuthProvider>().user!['firstName']} ${context.watch<AuthProvider>().user!['lastName']} '
                '(${context.watch<AuthProvider>().user!['profile']?['admissionNo'] ?? context.watch<AuthProvider>().user!['profile']?['rollNo'] ?? ''})',
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            onPressed: () {},
          ),
        ],
        backgroundColor: const Color(0xFF405BB2),
        elevation: 0,
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final user = context.read<AuthProvider>().user;
          final studentId = user?['_id'] ?? user?['id'];
          if (studentId != null) {
            await provider.fetchStudentGrades(studentId.toString());
          }
        },
        child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 20),
                    _buildCombinedResults(
                      combinedResults,
                      isLoading: provider.combinedResultsLoading,
                      error: provider.combinedResultsError,
                    ),
                    const SizedBox(height: 28),
                    if (terms.isNotEmpty) ...[
                      _buildTermFilters(terms),
                      const SizedBox(height: 24),
                      _buildStudentProfile(
                        context.watch<AuthProvider>().user,
                        currentTerm,
                      ),
                      const SizedBox(height: 24),
                      _buildGpaCard(
                        (currentTerm?['termGpa'] ?? '0.00').toString(),
                        cumulativeGpa.toString(),
                      ),
                      const SizedBox(height: 32),
                      _buildCoursesHeader(currentTerm?['totalCredits'] ?? 0),
                      const SizedBox(height: 16),
                      ...(currentTerm?['courses'] as List<dynamic>? ?? []).map(
                        (course) => _buildCourseCard(course),
                      ),
                    ] else ...[
                      const Center(child: Text('No grades available yet.')),
                    ],
                    if (terms.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      _buildDownloadButton(),
                    ],
                    const SizedBox(height: 40),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildCombinedResults(
    List<dynamic> combinedResults, {
    required bool isLoading,
    required String? error,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Natiijada Guud',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 14),
        if (isLoading && combinedResults.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(color: Color(0xFF405BB2)),
            ),
          )
        else if (error != null && combinedResults.isEmpty)
          _combinedResultsMessage(error, Icons.error_outline)
        else if (combinedResults.isEmpty)
          _combinedResultsMessage(
            'No combined results have been published yet.',
            Icons.layers_clear_outlined,
          )
        else
          ...combinedResults.map(_buildCombinedResultCard),
      ],
    );
  }

  Widget _combinedResultsMessage(String message, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.blueGrey),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildCombinedResultCard(dynamic combined) {
    final result = combined['result'] is Map
        ? Map<String, dynamic>.from(combined['result'])
        : <String, dynamic>{};
    final subjects = combined['subjects'] as List<dynamic>? ?? [];
    final subjectTotals = result['subjectTotals'] is Map
        ? Map<String, dynamic>.from(result['subjectTotals'])
        : <String, dynamic>{};
    final percentage = double.tryParse('${result['percentage'] ?? 0}') ?? 0;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFC7D2FE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              color: Color(0xFFEEF2FF),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Text(
              combined['title']?.toString() ?? 'Natiijada Guud',
              style: const TextStyle(
                color: Color(0xFF405BB2),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _combinedStat('Rank', '${result['rank'] ?? '—'}'),
                _combinedStat(
                  'Total',
                  '${result['totalObtained'] ?? 0}/${result['totalMax'] ?? 0}',
                ),
                _combinedStat('Percentage', '${percentage.toStringAsFixed(1)}%'),
                _combinedStat('Grade', '${result['grade'] ?? '—'}'),
              ],
            ),
          ),
          if (subjects.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
              child: Column(
                children: subjects.map((subject) {
                  final id = subject['id']?.toString() ?? '';
                  final score = subjectTotals[id] is Map
                      ? Map<String, dynamic>.from(subjectTotals[id])
                      : <String, dynamic>{};
                  return Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            subject['name']?.toString() ?? 'Subject',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        Text(
                          '${score['obtained'] ?? 0}/${score['max'] ?? 0}',
                          style: const TextStyle(
                            color: Color(0xFF405BB2),
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _combinedStat(String label, String value) {
    return Container(
      width: 140,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(
            value,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF405BB2),
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentProfile(dynamic user, dynamic term) {
    final profile = user?['profile'] ?? const {};
    final fullName = '${user?['firstName'] ?? ''} ${user?['lastName'] ?? ''}'
        .trim();
    final studentId =
        profile['studentId'] ??
        user?['studentId'] ??
        profile['admissionNo'] ??
        user?['admissionNo'] ??
        '—';
    final className = profile['class'] ?? user?['profileClass'] ?? '—';
    final section = profile['section'] ?? user?['profileSection'];
    final courses = term?['courses'] as List<dynamic>? ?? [];
    final average = courses.isEmpty
        ? 0.0
        : courses.fold<double>(
                0,
                (sum, course) =>
                    sum +
                    (double.tryParse('${course['percentage'] ?? 0}') ?? 0),
              ) /
              courses.length;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              color: Color(0xFFEEF2FF),
              borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
            ),
            child: const Row(
              children: [
                Icon(Icons.person, color: Color(0xFF405BB2)),
                SizedBox(width: 12),
                Text(
                  'Student Profile',
                  style: TextStyle(
                    color: Color(0xFF405BB2),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          _profileRow('Student ID', studentId.toString()),
          _profileRow('Name', fullName.isEmpty ? '—' : fullName),
          _profileRow(
            'Class',
            '$className${section != null && '$section'.isNotEmpty ? ' · $section' : ''}',
          ),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(22)),
            ),
            child: Row(
              children: [
                _summaryValue('Courses', '${courses.length}'),
                _summaryValue('Average', '${average.toStringAsFixed(1)}%'),
                _summaryValue('Term GPA', '${term?['termGpa'] ?? '0.00'}'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _profileRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
    child: Row(
      children: [
        Expanded(
          child: Text(label, style: const TextStyle(color: Colors.black54)),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );

  Widget _summaryValue(String label, String value) => Expanded(
    child: Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.black54),
        ),
        const SizedBox(height: 5),
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            color: Color(0xFF405BB2),
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    ),
  );

  Widget _buildTermFilters(List<dynamic> terms) {
    return SizedBox(
      height: 45,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: terms.length,
        itemBuilder: (context, index) {
          final term = terms[index];
          final isSelected = _selectedTermIndex == index;
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: InkWell(
              onTap: () => setState(() => _selectedTermIndex = index),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF2563EB) : Colors.white,
                  borderRadius: BorderRadius.circular(25),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(
                              0xFF2563EB,
                            ).withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                  border: isSelected
                      ? null
                      : Border.all(color: Colors.black.withValues(alpha: 0.05)),
                ),
                child: Row(
                  children: [
                    if (isSelected) ...[
                      const Icon(Icons.check, color: Colors.white, size: 16),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      '${term['name']} ${term['term']}',
                      style: TextStyle(
                        color: isSelected ? Colors.white : Colors.black87,
                        fontWeight: isSelected
                            ? FontWeight.bold
                            : FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildGpaCard(String termGpa, String cumulativeGpa) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text(
            'TERM GPA',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
              letterSpacing: 1.2,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            termGpa,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 72,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.show_chart, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Cumulative: $cumulativeGpa',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCoursesHeader(int totalCredits) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Courses',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        Text(
          '$totalCredits Credits',
          style: const TextStyle(
            fontSize: 14,
            color: Colors.grey,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  IconData _getSubjectIcon(String name) {
    name = name.toLowerCase();
    if (name.contains('cs') || name.contains('computer')) return Icons.code;
    if (name.contains('eng') ||
        name.contains('writing') ||
        name.contains('lit')) {
      return Icons.edit_note;
    }
    if (name.contains('hist') || name.contains('world')) return Icons.public;
    if (name.contains('chem') ||
        name.contains('science') ||
        name.contains('bio')) {
      return Icons.science;
    }
    if (name.contains('math')) return Icons.functions;
    return Icons.book;
  }

  Color _getSubjectColor(String name) {
    name = name.toLowerCase();
    if (name.contains('cs') || name.contains('computer')) {
      return const Color(0xFF3B82F6);
    }
    if (name.contains('eng') || name.contains('writing')) {
      return const Color(0xFF8B5CF6);
    }
    if (name.contains('hist') || name.contains('world')) {
      return const Color(0xFFF59E0B);
    }
    if (name.contains('chem') || name.contains('science')) {
      return const Color(0xFF10B981);
    }
    return const Color(0xFF6366F1);
  }

  Widget _buildCourseCard(dynamic course) {
    final name = course['subjectName'] ?? '';
    final icon = _getSubjectIcon(name);
    final color = _getSubjectColor(name);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course['subjectCode'] ?? 'Code',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      name,
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    course['grade']?.toString() ?? '-',
                    style: TextStyle(
                      color: color,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    '${course['percentage']}%',
                    style: const TextStyle(
                      color: Colors.grey,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${course['credits']} Credits',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.blueGrey,
                  ),
                ),
              ),
              TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Row(
                  children: [
                    Text(
                      'Details',
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    Icon(Icons.chevron_right, color: color, size: 18),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDownloadButton() {
    return Container(
      width: double.infinity,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black12, width: 2),
      ),
      child: OutlinedButton(
        onPressed: () {},
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.black12, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.file_download_outlined, color: Colors.blueGrey),
            SizedBox(width: 8),
            Text(
              'Download Official Transcript',
              style: TextStyle(
                color: Colors.blueGrey,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
