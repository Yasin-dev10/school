import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import 'class_detail_screen.dart';

class ClassListScreen extends StatefulWidget {
  const ClassListScreen({super.key});

  @override
  State<ClassListScreen> createState() => _ClassListScreenState();
}

class _ClassListScreenState extends State<ClassListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(context, listen: false).fetchMyClasses();
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacherProvider = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Classes',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black, // Adjust for theme if needed
      ),
      body: teacherProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => teacherProvider.fetchMyClasses(),
              child: teacherProvider.classes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.class_outlined,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No classes assigned yet',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: teacherProvider.classes.length,
                      itemBuilder: (context, index) {
                        final classData = teacherProvider.classes[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ClassDetailScreen(
                                    classId:
                                        classData['_id'] ?? classData['id'],
                                    className: classData['name'] ?? 'Unknown',
                                    section: classData['section'] ?? '',
                                  ),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: BoxDecoration(
                                      color: const Color(
                                        0xFF6366F1,
                                      ).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${classData['name']?[0] ?? 'C'}',
                                        style: const TextStyle(
                                          fontSize: 24,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF6366F1),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${classData['name']} ${classData['section']}',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${classData['studentsCount'] ?? 0} Students',
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(
                                    Icons.chevron_right,
                                    color: Colors.grey,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
