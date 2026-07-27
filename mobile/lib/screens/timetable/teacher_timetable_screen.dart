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
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text('Faculty Timetable'),
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_available, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              isToday ? 'No classes today' : 'No classes',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
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
