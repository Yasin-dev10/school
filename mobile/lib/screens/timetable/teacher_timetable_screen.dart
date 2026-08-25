import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class TeacherTimetableScreen extends StatefulWidget {
  const TeacherTimetableScreen({super.key});

  @override
  State<TeacherTimetableScreen> createState() => _TeacherTimetableScreenState();
}

class _TeacherTimetableScreenState extends State<TeacherTimetableScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<TeacherProvider>(context);
    final fullTimetable = provider.fullTimetable;

    // Weekly: Group by day
    final Map<String, List<dynamic>> weeklySchedule = {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': [],
      'Sunday': [],
    };

    for (var slot in fullTimetable) {
      final day = slot['day']?.toString();
      if (day != null && weeklySchedule.containsKey(day)) {
        weeklySchedule[day]!.add(slot);
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
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
        title: const Text(
          'Faculty Timetable',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        backgroundColor: const Color(0xFF405BB2),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Today'),
            Tab(text: 'Weekly'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDayView(provider.schedule, isToday: true),
          _buildWeeklyView(weeklySchedule),
        ],
      ),
    );
  }

  Widget _buildWeeklyView(Map<String, List<dynamic>> weeklySchedule) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: weeklySchedule.length,
      itemBuilder: (context, index) {
        final day = weeklySchedule.keys.elementAt(index);
        final daySchedule = weeklySchedule[day]!;

        if (daySchedule.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                day,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            ...daySchedule.map(
              (slot) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Text(
                    slot['startTime'] ?? '',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  title: Text(
                    slot['subject'] is Map
                        ? (slot['subject']['name'] ?? 'Subject')
                        : 'Subject',
                  ),
                  subtitle: Text(
                    'Class: ${slot['class'] is Map ? '${slot['class']['name']} ${slot['class']['section']}' : 'Class'} • ${slot['room'] ?? 'TBD'}',
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        );
      },
    );
  }

  Widget _buildDayView(List<dynamic> schedule, {bool isToday = false}) {
    if (schedule.isEmpty) {
      return Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 44),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: .06),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: const BoxDecoration(
                  color: Color(0xFFF0F7EB),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.event_available,
                  size: 42,
                  color: Color(0xFF4C9A24),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                isToday ? 'No Classes Today' : 'No Classes Available',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your teaching schedule is clear.',
                style: TextStyle(color: Colors.black54),
              ),
            ],
          ),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: schedule.length,
      itemBuilder: (context, index) {
        final slot = schedule[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Column(
                  children: [
                    Text(
                      slot['startTime'] ?? '00:00',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text('|'),
                    const SizedBox(height: 4),
                    Text(
                      slot['endTime'] ?? '00:00',
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
                const SizedBox(width: 24),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        slot['subject'] is Map
                            ? (slot['subject']['name'] ?? 'Subject')
                            : 'Subject',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF6366F1),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.room, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(
                            'Room: ${slot['room'] ?? 'TBD'}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.school,
                            size: 14,
                            color: Colors.grey,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Class: ${slot['class'] is Map ? '${slot['class']['name']} ${slot['class']['section']}' : 'Class'}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
