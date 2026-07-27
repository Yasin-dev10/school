import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/teacher_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class StaffCertificatesScreen extends StatefulWidget {
  const StaffCertificatesScreen({super.key});

  @override
  State<StaffCertificatesScreen> createState() =>
      _StaffCertificatesScreenState();
}

class _StaffCertificatesScreenState extends State<StaffCertificatesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeacherProvider>().fetchCertificates();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'Certificate Management',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 20,
            color: Colors.white,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: Consumer<TeacherProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.certificates.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: Colors.indigo),
            );
          }

          if (provider.certificates.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.workspace_premium,
                      size: 64,
                      color: Colors.indigo,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No certificates issued yet',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.fetchCertificates(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: provider.certificates.length,
              itemBuilder: (context, index) {
                final cert = provider.certificates[index];
                final student = cert['student'];
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              cert['certificateType'] ?? 'ACHIEVEMENT',
                              style: TextStyle(
                                color: Colors.indigo.shade300,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.2,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                cert['status']?.toUpperCase() ?? 'ACTIVE',
                                style: const TextStyle(
                                  color: Colors.greenAccent,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          cert['title'] ?? 'Digital Certificate',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: Colors.white10,
                              child: Text(
                                student != null ? student['firstName'][0] : 'S',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              student != null
                                  ? '${student['firstName']} ${student['lastName']}'
                                  : 'Unknown Student',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.qr_code_2,
                                color: Colors.white30,
                                size: 16,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  cert['certificateNumber'] ?? '',
                                  style: const TextStyle(
                                    color: Colors.white54,
                                    fontSize: 10,
                                    fontFamily: 'monospace',
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Implement issue certificate screen or dialog
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Issuance and generation of certificate is Coming soon to Mobile! Use Web Dashboard for full management.',
              ),
            ),
          );
        },
        backgroundColor: Colors.indigo,
        child: const Icon(Icons.add),
      ),
    );
  }
}
