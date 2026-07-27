import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import 'upload_material_screen.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class MaterialListScreen extends StatefulWidget {
  const MaterialListScreen({super.key});

  @override
  State<MaterialListScreen> createState() => _MaterialListScreenState();
}

class _MaterialListScreenState extends State<MaterialListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(context, listen: false).fetchMaterials();
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text('Learning Materials'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const UploadMaterialScreen()),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => teacher.fetchMaterials(),
        child: teacher.isLoading && teacher.materials.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : teacher.materials.isEmpty
            ? const Center(child: Text('No materials uploaded yet'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: teacher.materials.length,
                itemBuilder: (context, index) {
                  final material = teacher.materials[index];
                  return _buildMaterialCard(material);
                },
              ),
      ),
    );
  }

  Widget _buildMaterialCard(dynamic material) {
    IconData icon;
    Color color;

    switch (material['type']) {
      case 'video':
        icon = Icons.play_circle_outline;
        color = Colors.red;
        break;
      case 'link':
        icon = Icons.link;
        color = Colors.blue;
        break;
      case 'file':
        icon = Icons.description;
        color = Colors.orange;
        break;
      default:
        icon = Icons.note;
        color = Colors.green;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color),
        ),
        title: Text(
          material['title'] ?? 'Untitled',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              material['description'] ?? '',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    material['subject']?['name'] ?? 'General',
                    style: const TextStyle(fontSize: 10),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  material['class']?['name'] ?? '',
                  style: const TextStyle(fontSize: 10, color: Colors.blueGrey),
                ),
              ],
            ),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
          onPressed: () => _confirmDelete(material['_id']),
        ),
        onTap: () {
          // Open material detail or link
        },
      ),
    );
  }

  void _confirmDelete(String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Material'),
        content: const Text('Are you sure you want to delete this material?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Provider.of<TeacherProvider>(
                context,
                listen: false,
              ).deleteMaterial(id);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}