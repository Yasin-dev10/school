import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';

class UploadMaterialScreen extends StatefulWidget {
  const UploadMaterialScreen({super.key});

  @override
  State<UploadMaterialScreen> createState() => _UploadMaterialScreenState();
}

class _UploadMaterialScreenState extends State<UploadMaterialScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _contentController = TextEditingController();
  String _selectedType = 'note';
  String? _selectedClass;
  String? _selectedSubject;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final teacher = Provider.of<TeacherProvider>(context, listen: false);
      teacher.fetchMyClasses();
      teacher.fetchSubjects();
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Upload Material')),
      body: teacher.isLoading && teacher.classes.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        labelText: 'Title',
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descController,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Type',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'note',
                          child: Text('Lecture Note'),
                        ),
                        DropdownMenuItem(
                          value: 'video',
                          child: Text('Video Link'),
                        ),
                        DropdownMenuItem(
                          value: 'link',
                          child: Text('External Link'),
                        ),
                        DropdownMenuItem(value: 'file', child: Text('File')),
                      ],
                      onChanged: (v) => setState(() => _selectedType = v!),
                    ),
                    const SizedBox(height: 16),
                    if (_selectedType != 'file')
                      TextFormField(
                        controller: _contentController,
                        decoration: InputDecoration(
                          labelText: _selectedType == 'note'
                              ? 'Content'
                              : 'URL',
                          border: const OutlineInputBorder(),
                        ),
                        maxLines: _selectedType == 'note' ? 5 : 1,
                        validator: (v) => v!.isEmpty ? 'Required' : null,
                      ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedClass,
                      decoration: const InputDecoration(
                        labelText: 'Class',
                        border: OutlineInputBorder(),
                      ),
                      items: teacher.classes.map((c) {
                        return DropdownMenuItem<String>(
                          value: c['_id'].toString(),
                          child: Text('${c['name']} ${c['section']}'),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedClass = v),
                      validator: (v) => v == null ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedSubject,
                      decoration: const InputDecoration(
                        labelText: 'Subject',
                        border: OutlineInputBorder(),
                      ),
                      items: teacher.subjects.map((s) {
                        return DropdownMenuItem<String>(
                          value: s['_id'].toString(),
                          child: Text(s['name']),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedSubject = v),
                      validator: (v) => v == null ? 'Required' : null,
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: teacher.isLoading ? null : _submit,
                        child: teacher.isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.white,
                              )
                            : const Text(
                                'Upload Material',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await Provider.of<TeacherProvider>(context, listen: false)
        .createMaterial({
          'title': _titleController.text,
          'description': _descController.text,
          'type': _selectedType,
          'content': _contentController.text,
          'classId': _selectedClass,
          'subjectId': _selectedSubject,
        });

    if (success && mounted) {
      Navigator.pop(context);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            Provider.of<TeacherProvider>(context, listen: false).errorMessage ??
                'Upload failed',
          ),
        ),
      );
    }
  }
}
