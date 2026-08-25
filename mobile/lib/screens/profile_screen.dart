import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/student_provider.dart';
import '../providers/teacher_provider.dart';
import '../providers/parent_provider.dart';
import 'login_screen.dart';
import 'settings/theme_settings_screen.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user?['role'] == 'student') {
        Provider.of<StudentProvider>(
          context,
          listen: false,
        ).fetchStudentGrades();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final studentProvider = Provider.of<StudentProvider>(context);
    final user = auth.user;
    final isStudent = user?['role'] == 'student';

    return Scaffold(
      backgroundColor: Theme.of(
        context,
      ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
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
        title: Text(
          isStudent ? 'Profile' : 'Profile & Settings',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        elevation: 0,
        backgroundColor: const Color(0xFF405BB2),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(Icons.settings, color: Colors.white),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ThemeSettingsScreen(),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Column(
          children: [
            _buildProfileHeader(context, user),
            const SizedBox(height: 24),
            if (isStudent) ...[
              _buildAcademicInfo(context, user, studentProvider),
              const SizedBox(height: 16),
              _buildPersonalDetails(context, user),
              const SizedBox(height: 16),
              _buildContactInfo(context, user),
            ] else ...[
              _buildAccountSettings(context, user),
            ],
            const SizedBox(height: 32),
            _buildLogoutButton(context, auth),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  String _roleBadge(dynamic user) {
    switch (user?['role']?.toString()) {
      case 'teacher':
        return 'Faculty Member';
      case 'parent':
        return 'Parent Account';
      case 'admin':
        return 'Administrator';
      case 'student':
      default:
        return 'Active Student';
    }
  }

  Widget _buildProfileHeader(BuildContext context, dynamic user) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 30),
      decoration: BoxDecoration(
        color: const Color(0xFF405BB2),
        borderRadius: BorderRadius.circular(26),
      ),
      child: Column(
        children: [
          Center(
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.12),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 60,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                child: Text(
                  '${user?['firstName']?[0] ?? ''}${user?['lastName']?[0] ?? ''}',
                  style: TextStyle(
                    fontSize: 40,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '${user?['firstName'] ?? 'User'} ${user?['lastName'] ?? ''}',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'ID: ${user?['profile']?['admissionNo'] ?? user?['profile']?['rollNo'] ?? user?['email'] ?? 'N/A'}',
            style: TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white24),
            ),
            child: Text(
              _roleBadge(user),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAcademicInfo(
    BuildContext context,
    dynamic user,
    StudentProvider provider,
  ) {
    return _buildInfoCard(
      context,
      title: 'Academic Information',
      icon: Icons.school,
      rows: [
        _buildInfoRow('Program', user?['profile']?['class'] ?? 'N/A'),
        _buildInfoRow(
          'Current Semester',
          'Term ${user?['profile']?['section'] ?? 'A'}',
        ),
        _buildInfoRow(
          'GPA',
          provider.studentGrades?['cumulativeGpa']?.toString() ?? '0.00',
          isHighlighted: true,
        ),
        _buildInfoRow(
          'Enrollment Year',
          (user?['createdAt'] != null)
              ? DateTime.parse(user['createdAt']).year.toString()
              : '2024',
        ),
      ],
    );
  }

  Widget _buildPersonalDetails(BuildContext context, dynamic user) {
    String dobStr = 'N/A';
    if (user?['profile']?['dob'] != null) {
      final dob = DateTime.parse(user['profile']['dob']);
      dobStr = '${dob.day}/${dob.month}/${dob.year}';
    }

    return _buildInfoCard(
      context,
      title: 'Personal Details',
      icon: Icons.person,
      rows: [
        _buildInfoRow('Date of Birth', dobStr),
        _buildInfoRow(
          'Gender',
          (user?['profile']?['gender'] ?? 'N/A').toString().toUpperCase(),
        ),
        _buildInfoRow('Address', user?['profile']?['address'] ?? 'N/A'),
      ],
    );
  }

  Widget _buildContactInfo(BuildContext context, dynamic user) {
    return _buildInfoCard(
      context,
      title: 'Contact Info',
      icon: Icons.contact_phone,
      rows: [
        _buildInfoRow('Email', user?['email'] ?? 'N/A', isLink: true),
        _buildInfoRow(
          'Phone',
          user?['profile']?['phone'] ?? 'N/A',
          isPhone: true,
        ),
        _buildInfoRow(
          'Emergency Contact',
          user?['profile']?['guardianPhone']?.toString() ??
              user?['profile']?['phone']?.toString() ??
              user?['phone']?.toString() ??
              'Not provided',
        ),
      ],
    );
  }

  Widget _buildInfoCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required List<Widget> rows,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Icon(
                  icon,
                  color: Theme.of(context).colorScheme.primary,
                  size: 22,
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...rows,
        ],
      ),
    );
  }

  Widget _buildInfoRow(
    String label,
    String value, {
    bool isHighlighted = false,
    bool isLink = false,
    bool isPhone = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: isHighlighted
                  ? Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        value,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            value,
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isLink || isPhone
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                        ),
                        if (isLink) ...[
                          const SizedBox(width: 4),
                          Icon(
                            Icons.chevron_right,
                            size: 16,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ],
                        if (isPhone) ...[
                          const SizedBox(width: 4),
                          Icon(
                            Icons.phone,
                            size: 14,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ],
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountSettings(BuildContext context, dynamic user) {
    return Column(
      children: [
        _buildSectionHeader('Account Settings'),
        _buildListTile(
          icon: Icons.person_outline,
          title: 'Personal Information',
          onTap: () {},
        ),
        _buildListTile(
          icon: Icons.lock_outline,
          title: 'Change Password',
          onTap: () {},
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4, top: 24),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.6),
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
      ),
    );
  }

  Widget _buildListTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
        title: Text(title),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, AuthProvider auth) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: () async {
          final isStudent = auth.user?['role'] == 'student';
          final isTeacher = auth.user?['role'] == 'teacher';
          final isParent = auth.user?['role'] == 'parent';

          await auth.logout();

          if (!context.mounted) return;

          if (isStudent) {
            Provider.of<StudentProvider>(context, listen: false).clear();
          } else if (isTeacher) {
            Provider.of<TeacherProvider>(context, listen: false).clear();
          } else if (isParent) {
            Provider.of<ParentProvider>(context, listen: false).clear();
          }

          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const LoginScreen()),
            (route) => false,
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Theme.of(context).colorScheme.errorContainer,
          foregroundColor: Theme.of(context).colorScheme.error,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: const Text(
          'Logout',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
    );
  }
}
