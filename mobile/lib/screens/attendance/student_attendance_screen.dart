import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../providers/student_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class StudentAttendanceScreen extends StatefulWidget {
  const StudentAttendanceScreen({super.key});

  @override
  State<StudentAttendanceScreen> createState() =>
      _StudentAttendanceScreenState();
}

class _StudentAttendanceScreenState extends State<StudentAttendanceScreen> {
  String selectedFilter = 'All Subjects';
  DateTime selectedMonth = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<StudentProvider>(context);
    final stats = provider.attendanceStats;
    final history = provider.attendanceHistory;
    final subjects = provider.subjects;

    final filteredHistory = history.where((record) {
      bool matchesSubject = true;
      if (selectedFilter != 'All Subjects') {
        String recordSubjectName = record['subject'] is Map
            ? (record['subject']['name'] ?? '')
            : (record['subject']?.toString() ?? '');
        matchesSubject = recordSubjectName == selectedFilter;
      }

      bool matchesMonth = true;
      if (record['date'] != null) {
        DateTime recordDate = DateTime.parse(record['date']);
        matchesMonth =
            recordDate.month == selectedMonth.month &&
            recordDate.year == selectedMonth.year;
      }

      return matchesSubject && matchesMonth;
    }).toList();

    final double present =
        double.tryParse(stats?['present']?.toString() ?? '0') ?? 0;
    final double absent =
        double.tryParse(stats?['absent']?.toString() ?? '0') ?? 0;
    final double late = double.tryParse(stats?['late']?.toString() ?? '0') ?? 0;
    final double total = present + absent + late;
    final double attendanceRate = total > 0 ? (present / total * 100) : 0;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark
          ? const Color(0xFF121212)
          : const Color(0xFFFAFBFF),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (context) => IconButton(
            icon: Icon(
              Icons.menu,
              color: isDark ? Colors.white : Colors.black87,
            ),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: Text(
          'Attendance',
          style: GoogleFonts.outfit(
            color: isDark ? Colors.white : Colors.black87,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              Icons.tune,
              color: isDark ? Colors.white : Colors.black87,
            ),
            onPressed: () {},
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 10),
                  Text(
                    '${attendanceRate.toInt()}%',
                    style: GoogleFonts.outfit(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF1A1C1E),
                    ),
                  ),
                  Text(
                    'Overall Attendance Rate',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      _buildStatCard(
                        'Present',
                        present.toInt().toString(),
                        const Color(0xFFE8F5E9),
                        const Color(0xFF2E7D32),
                      ),
                      const SizedBox(width: 12),
                      _buildStatCard(
                        'Absent',
                        absent.toInt().toString(),
                        const Color(0xFFFFEBEE),
                        const Color(0xFFC62828),
                      ),
                      const SizedBox(width: 12),
                      _buildStatCard(
                        'Late',
                        late.toInt().toString(),
                        const Color(0xFFFFF3E0),
                        const Color(0xFFEF6C00),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildDateFilter(),
                        const SizedBox(width: 12),
                        _buildFilterChip('All Subjects'),
                        ...subjects.map(
                          (s) => Padding(
                            padding: const EdgeInsets.only(left: 8.0),
                            child: _buildFilterChip(s['name'] ?? 'Unknown'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'HISTORY',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                          letterSpacing: 1.2,
                        ),
                      ),
                      Text(
                        'Showing ${filteredHistory.length} records',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  filteredHistory.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Column(
                            children: [
                              Icon(
                                Icons.history,
                                size: 48,
                                color: Colors.grey[300],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No attendance records found',
                                style: GoogleFonts.outfit(color: Colors.grey),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filteredHistory.length,
                          itemBuilder: (context, index) {
                            final record = filteredHistory[index];
                            return _buildAttendanceRecord(record, isDark);
                          },
                        ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    Color bgColor,
    Color textColor,
  ) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: textColor.withOpacity(0.8),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: GoogleFonts.outfit(
                fontSize: 24,
                color: textColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateFilter() {
    return GestureDetector(
      onTap: () async {
        final DateTime? picked = await showDatePicker(
          context: context,
          initialDate: selectedMonth,
          firstDate: DateTime(2020),
          lastDate: DateTime.now(),
          initialEntryMode: DatePickerEntryMode.calendarOnly,
          builder: (context, child) {
            return Theme(
              data: Theme.of(context).copyWith(
                colorScheme: const ColorScheme.light(
                  primary: Color(0xFF1D5CFF),
                ),
              ),
              child: child!,
            );
          },
        );
        if (picked != null && picked != selectedMonth) {
          setState(() {
            selectedMonth = picked;
          });
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_month, size: 18, color: Colors.grey[600]),
            const SizedBox(width: 6),
            Text(
              DateFormat('MMM yyyy').format(selectedMonth),
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: Colors.grey[800],
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.keyboard_arrow_down, size: 18, color: Colors.grey[600]),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    bool isSelected = selectedFilter == label;
    return GestureDetector(
      onTap: () => setState(() => selectedFilter = label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1D5CFF) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: isSelected ? null : Border.all(color: Colors.grey[200]!),
        ),
        child: Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 14,
            color: isSelected ? Colors.white : Colors.grey[800],
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildAttendanceRecord(Map<String, dynamic> record, bool isDark) {
    String status = record['status'] ?? 'Unknown';
    Color statusColor;
    Color statusBgColor;

    switch (status.toLowerCase()) {
      case 'present':
        statusColor = const Color(0xFF2E7D32);
        statusBgColor = const Color(0xFFE8F5E9);
        break;
      case 'absent':
        statusColor = const Color(0xFFC62828);
        statusBgColor = const Color(0xFFFFEBEE);
        break;
      case 'late':
        statusColor = const Color(0xFFEF6C00);
        statusBgColor = const Color(0xFFFFF3E0);
        break;
      default:
        statusColor = Colors.grey;
        statusBgColor = Colors.grey[200]!;
    }

    String subjectName = record['subject'] is Map
        ? (record['subject']['name'] ?? 'Unknown Subject')
        : (record['subject']?.toString() ?? 'Unknown Subject');

    DateTime? date;
    if (record['date'] != null) {
      date = DateTime.parse(record['date']);
    }

    IconData subjectIcon = Icons.science;
    Color iconBgColor = const Color(0xFFE3F2FD);
    Color iconColor = const Color(0xFF1976D2);

    if (subjectName.toLowerCase().contains('math')) {
      subjectIcon = Icons.functions;
      iconBgColor = const Color(0xFFE8EAF6);
      iconColor = const Color(0xFF3F51B5);
    } else if (subjectName.toLowerCase().contains('phys')) {
      subjectIcon = Icons.science;
      iconBgColor = const Color(0xFFF3E5F5);
      iconColor = const Color(0xFF9C27B0);
    } else if (subjectName.toLowerCase().contains('chem') ||
        subjectName.toLowerCase().contains('lab')) {
      subjectIcon = Icons.biotech;
      iconBgColor = const Color(0xFFFFF3E0);
      iconColor = const Color(0xFFE65100);
    } else if (subjectName.toLowerCase().contains('sport') ||
        subjectName.toLowerCase().contains('physic educ')) {
      subjectIcon = Icons.sports_basketball;
      iconBgColor = const Color(0xFFFFEBEE);
      iconColor = const Color(0xFFD32F2F);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: iconBgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(subjectIcon, color: iconColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subjectName,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                Text(
                  date != null
                      ? '${DateFormat('EEE, d MMM').format(date)} • ${DateFormat('hh:mm a').format(date)}'
                      : 'Unknown Date',
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: statusBgColor,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              status,
              style: GoogleFonts.outfit(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}