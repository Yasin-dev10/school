import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/student_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

import 'package:fl_chart/fl_chart.dart';

class StudentExamsScreen extends StatefulWidget {
  const StudentExamsScreen({super.key});

  @override
  State<StudentExamsScreen> createState() => _StudentExamsScreenState();
}

class _StudentExamsScreenState extends State<StudentExamsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = context.read<AuthProvider>().user;
      final studentId = user?['_id'] ?? user?['id'];
      context.read<StudentProvider>().fetchExams();
      if (studentId != null) {
        context.read<StudentProvider>().fetchResults(studentId.toString());
        context.read<StudentProvider>().fetchProgressAnalytics(
          studentId.toString(),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          leading: Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => ZoomDrawer.of(context)?.toggle(),
            ),
          ),
          title: const Text(
            'Academic Performance',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          backgroundColor: Colors.transparent,
          elevation: 0,
          bottom: const TabBar(
            indicatorColor: Color(0xFF6366F1),
            indicatorWeight: 4,
            labelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            tabs: [
              Tab(text: 'Exams'),
              Tab(text: 'Results'),
              Tab(text: 'Progress'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            UpcomingExamsTab(),
            MyResultsTab(),
            ProgressAnalyticsTab(),
          ],
        ),
      ),
    );
  }
}

class UpcomingExamsTab extends StatelessWidget {
  const UpcomingExamsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<StudentProvider>(context);
    final exams = provider.exams;

    if (provider.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF6366F1)),
      );
    }

    return exams.isEmpty
        ? const Center(
            child: Text(
              'No upcoming exams',
              style: TextStyle(color: Colors.white54),
            ),
          )
        : ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: exams.length,
            itemBuilder: (context, index) {
              final exam = exams[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
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
                    const SizedBox(height: 4),
                    Text(
                      exam['term'],
                      style: TextStyle(
                        color: const Color(0xFF6366F1).withOpacity(0.8),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Divider(height: 32, color: Colors.white10),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_month,
                          size: 16,
                          color: Colors.white54,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${exam['startDate'].toString().split('T')[0]} to ${exam['endDate'].toString().split('T')[0]}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          );
  }
}

class MyResultsTab extends StatelessWidget {
  const MyResultsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<StudentProvider>(context);
    final results = provider.results;

    if (provider.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF6366F1)),
      );
    }

    // Group results by exam
    final Map<String, List<dynamic>> groupedResults = {};
    for (var res in results) {
      final examName = res['exam']?['name'] ?? 'General';
      final isApproved = res['exam']?['isApproved'] ?? false;
      if (!isApproved) continue;

      if (!groupedResults.containsKey(examName)) {
        groupedResults[examName] = [];
      }
      groupedResults[examName]!.add(res);
    }

    return groupedResults.isEmpty
        ? const Center(
            child: Text(
              'No results published yet',
              style: TextStyle(color: Colors.white54),
            ),
          )
        : ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: groupedResults.length,
            itemBuilder: (context, index) {
              final examName = groupedResults.keys.elementAt(index);
              final examResults = groupedResults[examName]!;
              final firstResult = examResults.first;
              final examId = firstResult['exam']['_id'];

              return Container(
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  examName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  firstResult['exam']?['term'] ?? 'Term',
                                  style: TextStyle(
                                    color: const Color(
                                      0xFF6366F1,
                                    ).withOpacity(0.8),
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => _downloadReport(context, examId),
                            icon: const Icon(
                              Icons.picture_as_pdf,
                              color: Colors.redAccent,
                            ),
                            tooltip: 'Download PDF Report',
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1, color: Colors.white10),
                    ...examResults.map(
                      (res) => ListTile(
                        title: Text(
                          res['subject']?['name'] ?? 'Subject',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          res['marksObtained'].toString(),
                          style: const TextStyle(
                            color: Color(0xFF6366F1),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${res['marksObtained']}/${res['maxMarks']}',
                              style: const TextStyle(
                                color: Colors.white54,
                                fontSize: 12,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.info_outline,
                                size: 18,
                                color: Colors.white24,
                              ),
                              onPressed: () =>
                                  _showComplaintDialog(context, res),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              );
            },
          );
  }

  void _downloadReport(BuildContext context, String examId) {
    final studentId = context.read<AuthProvider>().user?['_id'];
    if (studentId == null) return;

    final url =
        '${ApiService.baseUrl}/exams/report/$examId/$studentId?format=pdf';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Report Card URL: $url'),
        action: SnackBarAction(
          label: 'Copy',
          onPressed: () {
            // Copy to clipboard or launch URL
          },
        ),
      ),
    );
  }

  void _showComplaintDialog(BuildContext context, dynamic result) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          'Submit Complaint',
          style: TextStyle(color: Colors.white),
        ),
        content: TextField(
          controller: controller,
          maxLines: 3,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Enter your concern here...',
            hintStyle: TextStyle(color: Colors.white24),
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.isEmpty) return;
              final success = await context
                  .read<StudentProvider>()
                  .submitComplaint({
                    'examId': result['exam']['_id'],
                    'subjectId': result['subject']['_id'],
                    'reason': controller.text,
                  });
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      success ? 'Complaint submitted' : 'Failed to submit',
                    ),
                  ),
                );
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

class ProgressAnalyticsTab extends StatelessWidget {
  const ProgressAnalyticsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<StudentProvider>(context);
    final data = provider.progressData;

    if (provider.isLoading || data == null) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF6366F1)),
      );
    }

    final marks = data['marks'] as List<dynamic>;
    final attendance = data['attendanceSummary'] as List<dynamic>;

    if (marks.isEmpty) {
      return const Center(
        child: Text(
          'No performance data yet',
          style: TextStyle(color: Colors.white54),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Performance Trend',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            height: 250,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: false),
                titlesData: const FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: marks.asMap().entries.map((e) {
                      final val =
                          (e.value['marksObtained'] / e.value['maxMarks']
                              as num) *
                          100;
                      return FlSpot(e.key.toDouble(), val.toDouble());
                    }).toList(),
                    isCurved: true,
                    color: const Color(0xFF6366F1),
                    barWidth: 4,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(
                      show: true,
                      color: const Color(0xFF6366F1).withOpacity(0.2),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'Attendance Summary',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: attendance.map((a) {
              final status = a['_id'].toString();
              final count = a['count'].toString();
              Color color = Colors.grey;
              if (status == 'present') color = Colors.greenAccent;
              if (status == 'absent') color = Colors.redAccent;
              if (status == 'late') color = Colors.amberAccent;

              return Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: color.withOpacity(0.2)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        count,
                        style: TextStyle(
                          color: color,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        status.toUpperCase(),
                        style: TextStyle(
                          color: color.withOpacity(0.7),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 32),
          const Text(
            'Subject Analysis',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          ...marks.reversed.take(5).map((m) {
            final perc = (m['marksObtained'] / m['maxMarks'] as num) * 100;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: (perc >= 50 ? Colors.green : Colors.red)
                          .withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        perc >= 50 ? 'P' : 'F',
                        style: TextStyle(
                          color: perc >= 50 ? Colors.green : Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m['subject']?['name'] ?? 'Subject',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          m['exam']?['name'] ?? 'Exam',
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${m['marksObtained']}/${m['maxMarks']}',
                    style: const TextStyle(
                      color: Color(0xFF6366F1),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}