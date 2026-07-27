import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/student_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class StudentMaterialsScreen extends StatefulWidget {
  const StudentMaterialsScreen({super.key});

  @override
  State<StudentMaterialsScreen> createState() => _StudentMaterialsScreenState();
}

class _StudentMaterialsScreenState extends State<StudentMaterialsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final user = auth.user;
      String? classId;
      if (user != null && user['class'] != null) {
        if (user['class'] is String) {
          classId = user['class'];
        } else if (user['class'] is Map) {
          classId = user['class']['_id'] ?? user['class']['id'];
        }
      }

      Provider.of<StudentProvider>(
        context,
        listen: false,
      ).fetchMaterials(classId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<StudentProvider>(context);
    final materials = provider.materials;

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text('Learning Materials'),
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : materials.isEmpty
          ? const Center(child: Text('No materials available'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: materials.length,
              itemBuilder: (context, index) {
                final item = materials[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.folder, color: Colors.orange),
                    ),
                    title: Text(
                      item['title'] ?? 'Material',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(item['description'] ?? 'No description'),
                    trailing: IconButton(
                      icon: const Icon(Icons.download_rounded),
                      onPressed: () {
                        // Implement download logic
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Download started...')),
                        );
                      },
                    ),
                  ),
                );
              },
            ),
    );
  }
}
