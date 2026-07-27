import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';

class CreateAssignmentScreen extends StatefulWidget {
  const CreateAssignmentScreen({super.key});

  @override
  State<CreateAssignmentScreen> createState() => _CreateAssignmentScreenState();
}

class _CreateAssignmentScreenState extends State<CreateAssignmentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String? _selectedClassId;
  String? _selectedSubjectId;
  DateTime? _selectedDate;

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
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime(2101),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF6366F1),
              onPrimary: Colors.white,
              surface: Color(0xFF1E293B),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      if (_selectedClassId == null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Please select a class')));
        return;
      }
      if (_selectedDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a due date')),
        );
        return;
      }

      final teacher = Provider.of<TeacherProvider>(context, listen: false);
      final assignmentData = {
        'title': _titleController.text,
        'description': _descController.text,
        'classId': _selectedClassId,
        'dueDate': _selectedDate!.toIso8601String(),
        'subjectId': _selectedSubjectId,
      };

      final success = await teacher.createAssignment(assignmentData);
      if (success && mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Assignment created!')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Create Assignment',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildLabel('Title'),
              TextFormField(
                controller: _titleController,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('e.g., Algebra Homewok'),
                validator: (v) => v!.isEmpty ? 'Title is required' : null,
              ),
              const SizedBox(height: 24),

              _buildLabel('Class'),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedClassId,
                    hint: const Text(
                      'Select Class',
                      style: TextStyle(color: Colors.grey),
                    ),
                    isExpanded: true,
                    dropdownColor: const Color(0xFF1E293B),
                    items: teacher.classes.map((c) {
                      return DropdownMenuItem<String>(
                        value: c['_id'].toString(),
                        child: Text(
                          '${c['name']} ${c['section']}',
                          style: const TextStyle(color: Colors.white),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedClassId = val),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              _buildLabel('Subject'),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedSubjectId,
                    hint: const Text(
                      'Select Subject',
                      style: TextStyle(color: Colors.grey),
                    ),
                    isExpanded: true,
                    dropdownColor: const Color(0xFF1E293B),
                    items: teacher.subjects.map((s) {
                      return DropdownMenuItem<String>(
                        value: s['_id'].toString(),
                        child: Text(
                          s['name'] ?? 'Unknown',
                          style: const TextStyle(color: Colors.white),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) =>
                        setState(() => _selectedSubjectId = val),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              _buildLabel('Description'),
              TextFormField(
                controller: _descController,
                maxLines: 4,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration('Enter instructions...'),
                validator: (v) => v!.isEmpty ? 'Description is required' : null,
              ),
              const SizedBox(height: 24),

              _buildLabel('Due Date'),
              InkWell(
                onTap: () => _selectDate(context),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_month, color: Color(0xFF6366F1)),
                      const SizedBox(width: 12),
                      Text(
                        _selectedDate == null
                            ? 'Select Due Date'
                            : '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 40),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: teacher.isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: teacher.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Create Assignment',
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

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.grey,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey[600]),
      filled: true,
      fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF6366F1)),
      ),
    );
  }
}
